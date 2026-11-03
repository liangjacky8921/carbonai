"""业务路由：示例数据 / 碳排放上传核算 / 报告生成 / AI 对话。

前端在后端在线时调用这些接口，离线时回退本地实现。统一响应
契约 {code, message, data} 由 app.schemas 提供。
"""
import csv
import asyncio
import hashlib
import threading
import html as html_lib
import io
import json
import os
import re
import time
from datetime import datetime
from typing import List, Optional, Literal
from urllib.parse import urljoin

from fastapi import APIRouter, UploadFile, File, Form, Request, Header, HTTPException
from fastapi.responses import Response, JSONResponse
from starlette.concurrency import run_in_threadpool
from starlette.requests import ClientDisconnect
from pydantic import BaseModel, Field, ConfigDict, ValidationError

from app.factors import FACTOR_LIB, match_factor
from app.accounting_units import calculate_unit_checked
from app.schemas import ok, err
from app.routers import auth

router = APIRouter(prefix="/api", tags=["business"])

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "sample-data")


def _read_sample(filename: str):
    path = os.path.join(SAMPLE_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8-sig") as f:
        if filename.endswith(".json") or filename.endswith(".geojson"):
            return json.load(f)
        return list(csv.DictReader(f))


# ---------------- 示例数据接口 ----------------

@router.get("/sample/list")
def sample_list():
    files = [
        {"key": "emissions", "file": "enterprise-emissions.json", "desc": "虚拟企业年度碳排放（月/部门/排放源）"},
        {"key": "trajectory", "file": "fleet-gps-trajectory.csv", "desc": "车队 GPS 轨迹（3辆车）"},
        {"key": "points", "file": "emission-points.csv", "desc": "大湾区排放点位（40家虚拟企业）"},
        {"key": "boundary", "file": "forest-boundary.geojson", "desc": "林地演示边界"},
        {"key": "bom", "file": "product-bom.json", "desc": "产品 BOM + LCA 阶段排放"},
        {"key": "soil", "file": "soil_spectral.json", "desc": "土壤光谱数据（46样本×256波段）"},
        {"key": "sewage", "file": "sewage.json", "desc": "污水厂运行月报（2022-2026）"},
    ]
    return ok(files)


@router.get("/sample/{key}")
def sample_data(key: str):
    mapping = {
        "emissions": "enterprise-emissions.json", "trajectory": "fleet-gps-trajectory.csv",
        "points": "emission-points.csv", "boundary": "forest-boundary.geojson",
        "bom": "product-bom.json", "soil": "soil_spectral.json", "sewage": "sewage.json",
    }
    if key not in mapping:
        return err(f"未知示例数据集: {key}", 404)
    data = _read_sample(mapping[key])
    if data is None:
        return err("示例数据文件不存在", 404)
    return ok({"sampleLabel": "示例数据", "data": data})


# ---------------- 因子库 ----------------

@router.get("/factors")
def list_factors():
    """返回排放因子库（含溯源信息与 DQR 评级），供因子库页展示与导出。"""
    return ok(FACTOR_LIB)


# ---------------- 碳排放上传核算 ----------------

def _read_tabular(content: bytes, filename: str) -> List[List[str]]:
    """把 CSV / Excel 上传内容读成统一的行列表，首行不裁剪。"""
    rows: List[List[str]] = []
    name = (filename or "").lower()
    if name.endswith(".csv"):
        text = content.decode("utf-8-sig", errors="replace")
        for line in csv.reader(io.StringIO(text)):
            rows.append([str(c) for c in line])
    elif name.endswith((".xlsx", ".xls")):
        import openpyxl

        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.worksheets[0]
        for row in ws.iter_rows(values_only=True):
            rows.append(["" if c is None else str(c) for c in row])
        wb.close()
    else:
        raise ValueError("仅支持 .csv / .xlsx / .xls 文件")
    return rows


def _find_columns(rows: List[List[str]]) -> dict:
    """在前若干行中定位排放核算所需的表头列，返回列下标（找不到为 -1）。"""
    idx = {"source": -1, "activity": -1, "unit": -1, "year": -1, "month": -1, "department": -1}
    for i in range(min(len(rows), 20)):
        for j, cell in enumerate(rows[i]):
            c = cell.strip().lower()
            if not c:
                continue
            if idx["source"] < 0 and ("排放源" in c or "source" in c):
                idx["source"] = j
            if idx["activity"] < 0 and ("活动数据" in c or "activity" in c or "用量" in c):
                idx["activity"] = j
            if idx["unit"] < 0 and ("单位" in c or "unit" in c):
                idx["unit"] = j
            if idx["year"] < 0 and ("年份" in c or "year" in c):
                idx["year"] = j
            if idx["month"] < 0 and ("月份" in c or "month" in c):
                idx["month"] = j
            if idx["department"] < 0 and ("部门" in c or "组织" in c or "depart" in c):
                idx["department"] = j
    return idx


@router.post("/emissions/upload")
async def emissions_upload(file: UploadFile = File(...)):
    """解析排放数据文件，匹配因子并完成 Scope 1/2/3 核算，返回明细记录。"""
    try:
        rows = _read_tabular(await file.read(), file.filename or "")
    except ValueError as e:
        return err(str(e))
    except Exception as e:
        return err(f"文件解析失败：{e}")

    if not rows:
        return err("文件内容为空")

    idx = _find_columns(rows)
    if idx["source"] < 0 or idx["activity"] < 0:
        return err("未识别到「排放源 / 活动数据」列，请检查文件表头")

    # 表头所在行
    header_row = 0
    for i in range(min(len(rows), 20)):
        if idx["source"] in range(len(rows[i])) and rows[i][idx["source"]]:
            header_row = i
            break

    records: List[dict] = []
    current_year = datetime.now().year
    for i in range(header_row + 1, len(rows)):
        r = rows[i]
        if idx["source"] >= len(r) or idx["activity"] >= len(r):
            continue
        source_name = r[idx["source"]].strip()
        if not source_name:
            continue
        try:
            activity = float(r[idx["activity"]])
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail=f"第{i + 1}行：活动数据必须为有限正数") from None

        factor = match_factor(source_name)
        year = current_year
        if idx["year"] >= 0 and idx["year"] < len(r):
            try:
                year = int(float(r[idx["year"]])) or current_year
            except (ValueError, TypeError):
                year = current_year

        month = None
        if idx["month"] >= 0 and idx["month"] < len(r):
            try:
                month = int(float(r[idx["month"]]))
            except (ValueError, TypeError):
                month = None

        department = None
        if idx["department"] >= 0 and idx["department"] < len(r):
            department = r[idx["department"]].strip() or None

        unit = r[idx["unit"]] if 0 <= idx["unit"] < len(r) else ""
        try:
            checked = calculate_unit_checked(activity, unit, factor)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=f"第{i + 1}行：{exc}；本次文件未保存") from None

        records.append({
            "year": year,
            "month": month,
            "department": department,
            "source": source_name,
            "activity": activity,
            "unit": unit,
            "factor": factor["factor"],
            "scope": factor["scope"],
            **checked,
            "factorSource": factor["source"],
        })

    if not records:
        return err("未解析到有效数据行（活动数据需为大于 0 的数值）")

    return ok(records, f"核算完成，共 {len(records)} 条记录")


# ---------------- 报告生成 ----------------

class ReportBody(BaseModel):
    standard: str
    year: int
    format: str = "pdf"
    records: Optional[List[dict]] = None


def _build_report_pdf(body: ReportBody) -> bytes:
    """用 reportlab 生成碳管理汇总报告 PDF（内置简体中文字体，无需外部字体文件）。"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm)

    title_style = ParagraphStyle("title", fontName="STSong-Light", fontSize=18, leading=24, spaceAfter=6, textColor=colors.HexColor("#0f5132"))
    sub_style = ParagraphStyle("sub", fontName="STSong-Light", fontSize=10, leading=14, textColor=colors.HexColor("#444444"))
    head_style = ParagraphStyle("head", fontName="STSong-Light", fontSize=13, leading=18, spaceBefore=10, spaceAfter=4, textColor=colors.HexColor("#1c6e4d"))
    cell_style = ParagraphStyle("cell", fontName="STSong-Light", fontSize=9, leading=13)

    story = [
        Paragraph("CarbonAI 时空智能碳管理平台 · 碳排放核算报告", title_style),
        Paragraph(f"报告标准：{body.standard}　|　核算年度：{body.year}　|　生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}", sub_style),
        Spacer(1, 6 * mm),
    ]

    if body.records:
        checked = [r for r in body.records if r.get("accountingVersion") == "activity-unit-v1" and r.get("emissionUnit") == "tCO₂"]
        report_unit = "tCO₂" if len(checked) == len(body.records) else "吨（口径待核实）" if checked else "tCO₂e"
        if checked:
            story.append(Paragraph("单位仅按因子声明校验；CO₂不等于已核验的完整温室气体CO₂e，混合历史记录需人工核对。", sub_style))
        totals = {"Scope 1": 0.0, "Scope 2": 0.0, "Scope 3": 0.0}
        for r in body.records:
            scope = r.get("scope")
            if scope in totals:
                totals[scope] += float(r.get("emission") or 0)

        story.append(Paragraph("一、Scope 排放汇总", head_style))
        summary = [[Paragraph("#", cell_style), Paragraph("范围", cell_style), Paragraph(f"排放量 ({report_unit})", cell_style)]]
        for i, (scope, val) in enumerate(totals.items(), start=1):
            summary.append([Paragraph(str(i), cell_style), Paragraph(scope, cell_style), Paragraph(f"{val:.2f}", cell_style)])
        summary.append([Paragraph("", cell_style), Paragraph("合计", cell_style), Paragraph(f"{sum(totals.values()):.2f}", cell_style)])
        t = Table(summary, colWidths=[14 * mm, 60 * mm, 60 * mm])
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "STSong-Light"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c9d6cf")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6f2ec")),
            ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ]))
        story.append(t)

        story.append(Paragraph("二、排放源明细（前 100 条）", head_style))
        detail = [[Paragraph("#", cell_style), Paragraph("排放源", cell_style), Paragraph("范围", cell_style), Paragraph("活动数据", cell_style), Paragraph("因子", cell_style), Paragraph(f"排放量 ({report_unit})", cell_style)]]
        for i, r in enumerate(body.records[:100], start=1):
            detail.append([
                Paragraph(str(i), cell_style),
                Paragraph(str(r.get("source", "")), cell_style),
                Paragraph(str(r.get("scope", "")), cell_style),
                Paragraph(str(r.get("activity", "")), cell_style),
                Paragraph(str(r.get("factor", "")), cell_style),
                Paragraph(f"{float(r.get('emission') or 0):.2f}", cell_style),
            ])
        t2 = Table(detail, colWidths=[10 * mm, 52 * mm, 30 * mm, 30 * mm, 20 * mm, 34 * mm])
        t2.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "STSong-Light"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c9d6cf")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6f2ec")),
            ("ALIGN", (3, 0), (3, -1), "RIGHT"),
            ("ALIGN", (4, 0), (4, -1), "RIGHT"),
            ("ALIGN", (5, 0), (5, -1), "RIGHT"),
        ]))
        story.append(t2)
    else:
        story.append(Paragraph("本报告未附带核算明细。可调用 /api/emissions/upload 获得核算记录后生成完整报告。", head_style))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("说明：本报告由 CarbonAI V6.0 自动生成，排放因子取值见平台因子库（含溯源与 DQR 评级）。", sub_style))

    doc.build(story)
    return buf.getvalue()


@router.post("/reports/generate")
def reports_generate(body: ReportBody):
    """生成碳排放核算汇总报告；format=pdf 时返回 PDF 文件流。"""
    if (body.format or "pdf").lower() != "pdf":
        return err("后端当前仅支持 pdf 格式，docx/worx 请使用前端导出")
    try:
        pdf = _build_report_pdf(body)
    except Exception as e:
        return err(f"报告生成失败：{e}", 500)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="carbonai-report-{body.year}.pdf"'})


# ---------------- AI 对话（真实 LLM 代理，2026-09-19 实装） ----------------

def _ai_int(name: str, default: int, ceiling: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
        return min(value, ceiling) if value > 0 else 0
    except ValueError:
        return 0  # 错配关闭调用，不将0/非法值解释为无限制。


AI_API_BASE = os.getenv("AI_API_BASE", "https://api.deepseek.com/v1/chat/completions")
AI_API_KEY = os.getenv("AI_API_KEY", "").strip()
AI_MODEL = os.getenv("AI_MODEL", "deepseek-chat")
AI_TIMEOUT = _ai_int("AI_TIMEOUT", 20, 20)
AI_MAX_BODY_BYTES = _ai_int("AI_MAX_BODY_BYTES", 32768, 65536)
AI_MAX_QUESTION_CHARS = _ai_int("AI_MAX_QUESTION_CHARS", 2000, 4000)
AI_MAX_HISTORY_MESSAGES = _ai_int("AI_MAX_HISTORY_MESSAGES", 8, 16)
AI_MAX_HISTORY_ITEM_CHARS = _ai_int("AI_MAX_HISTORY_ITEM_CHARS", 2000, 4000)
AI_MAX_HISTORY_CHARS = _ai_int("AI_MAX_HISTORY_CHARS", 8000, 16000)
AI_MAX_RESPONSE_BYTES = _ai_int("AI_MAX_RESPONSE_BYTES", 65536, 262144)
AI_MAX_OUTPUT_TOKENS = _ai_int("AI_MAX_OUTPUT_TOKENS", 1500, 1500)
AI_USER_RPM = _ai_int("AI_USER_REQUESTS_PER_MINUTE", 3, 30)
AI_GLOBAL_RPM = _ai_int("AI_GLOBAL_REQUESTS_PER_MINUTE", 10, 120)
AI_MAX_CONCURRENT = _ai_int("AI_MAX_CONCURRENT", 2, 8)
AI_USER_DAILY_CALLS = _ai_int("AI_USER_DAILY_CALLS", 20, 500)
AI_GLOBAL_DAILY_CALLS = _ai_int("AI_GLOBAL_DAILY_CALLS", 100, 5000)
AI_DUPLICATE_SECONDS = _ai_int("AI_DUPLICATE_WINDOW_SECONDS", 10, 60)


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=AI_MAX_HISTORY_ITEM_CHARS or 1)


class ChatBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    message: str = Field(min_length=1, max_length=AI_MAX_QUESTION_CHARS or 1)
    history: List[ChatMessage] = Field(default_factory=list, max_length=AI_MAX_HISTORY_MESSAGES or 1)


_AI_LOCK = threading.Lock()
_AI_STATE = {"day": "", "daily": {}, "total": 0, "times": [], "users": {}, "active": set(), "duplicates": {}}


def _ai_ready() -> bool:
    # 不支持共享额度；未知/多worker/多实例部署一律不启用付费调用。
    singleton = (os.getenv("AI_DEPLOYMENT_MODE", "disabled") == "single-process"
                 and os.getenv("AI_SINGLE_PROCESS_CONFIRMED", "false").lower() == "true"
                 and all(os.getenv(name, "1") == "1" for name in ("WEB_CONCURRENCY", "UVICORN_WORKERS", "AI_INSTANCE_COUNT")))
    limits = [AI_TIMEOUT, AI_MAX_BODY_BYTES, AI_MAX_QUESTION_CHARS, AI_MAX_HISTORY_MESSAGES,
              AI_MAX_HISTORY_ITEM_CHARS, AI_MAX_HISTORY_CHARS, AI_MAX_RESPONSE_BYTES,
              AI_MAX_OUTPUT_TOKENS, AI_USER_RPM, AI_GLOBAL_RPM, AI_MAX_CONCURRENT,
              AI_USER_DAILY_CALLS, AI_GLOBAL_DAILY_CALLS, AI_DUPLICATE_SECONDS]
    return singleton and all(value > 0 for value in limits)


def _ai_enter(uid: int, fingerprint: str):
    now = time.monotonic()
    day = time.strftime("%Y-%m-%d", time.gmtime())
    with _AI_LOCK:
        state = _AI_STATE
        if state["day"] != day:
            state.update(day=day, daily={}, total=0)
        state["times"] = [t for t in state["times"] if now - t < 60]
        state["users"] = {u: [t for t in ts if now - t < 60] for u, ts in state["users"].items() if ts and now - ts[-1] < 60}
        state["duplicates"] = {u: entry for u, entry in state["duplicates"].items() if now - entry[1] < AI_DUPLICATE_SECONDS}
        if (uid in state["active"] or len(state["active"]) >= AI_MAX_CONCURRENT
                or len(state["times"]) >= AI_GLOBAL_RPM or len(state["users"].get(uid, [])) >= AI_USER_RPM
                or state["total"] >= AI_GLOBAL_DAILY_CALLS or state["daily"].get(uid, 0) >= AI_USER_DAILY_CALLS
                or state["duplicates"].get(uid, (None, 0))[0] == fingerprint):
            raise HTTPException(status_code=429, detail="AI调用次数、频率或并发已达限制，请稍后再试")
        # 上游尝试即计数，不因失败退款；无自动重试，不称精确费用预算。
        state["active"].add(uid)
        state["times"].append(now)
        state["users"].setdefault(uid, []).append(now)
        state["daily"][uid] = state["daily"].get(uid, 0) + 1
        state["total"] += 1
        state["duplicates"][uid] = (fingerprint, now)


def _ai_reply(code: int, message: str, data=None):
    headers = {"Cache-Control": "no-store"}
    if code == 401:
        headers["WWW-Authenticate"] = "Bearer"
    return JSONResponse(status_code=code, content={"code": code, "message": message, "data": data}, headers=headers)


async def _read_ai_body(request: Request):
    length = request.headers.get("content-length")
    if length is not None and (not length.isdecimal() or int(length) > AI_MAX_BODY_BYTES):
        raise HTTPException(status_code=413, detail="AI请求体超出限制")
    if request.headers.get("content-encoding", "identity").lower() != "identity":
        raise HTTPException(status_code=415, detail="AI接口不接受压缩请求体")
    if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
        raise HTTPException(status_code=415, detail="AI接口需要JSON请求")
    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > AI_MAX_BODY_BYTES:
            raise HTTPException(status_code=413, detail="AI请求体超出限制")
        body.extend(chunk)
    return ChatBody.model_validate_json(body)


SYSTEM_PROMPT = (
    "你是 CarbonAI 时空智能碳管理平台的碳管理顾问。"
    "专业领域：碳核算（Scope 1/2/3）、CBAM、产品碳足迹（ISO 14067 / GB/T 24067）、"
    "碳市场（CEA/CCER）、ESG 披露、污水厂减污降碳、减排路径。"
    "回答保持专业、简洁、中文；涉及数据时注明口径与年份；不确定的内容明确提示。"
)


def _call_llm(message: str, history: list) -> str:
    """单次有界上游请求；失败不重试，异常由聊天路由统一脱敏。"""
    import urllib.request
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history + [{"role": "user", "content": message}]
    payload = json.dumps({"model": AI_MODEL, "messages": messages, "temperature": 0.5,
                          "max_tokens": AI_MAX_OUTPUT_TOKENS}).encode()
    req = urllib.request.Request(AI_API_BASE, data=payload,
                                 headers={"Content-Type": "application/json", "Authorization": f"Bearer {AI_API_KEY}"}, method="POST")
    deadline = time.monotonic() + AI_TIMEOUT
    with urllib.request.urlopen(req, timeout=AI_TIMEOUT) as resp:
        chunks = bytearray()
        while True:
            if time.monotonic() >= deadline:
                raise TimeoutError()
            part = resp.read1(min(4096, AI_MAX_RESPONSE_BYTES + 1 - len(chunks)))
            if not part:
                break
            chunks.extend(part)
            if len(chunks) > AI_MAX_RESPONSE_BYTES:
                raise ValueError("response limit")
        data = json.loads(chunks.decode("utf-8"))
    answer = data["choices"][0]["message"]["content"]
    if not isinstance(answer, str) or not answer.strip():
        raise ValueError("invalid answer")
    return answer.strip()


def _ai_call_reserved(uid: int, message: str, history: list):
    try:
        return _call_llm(message, history)
    finally:
        with _AI_LOCK:
            _AI_STATE["active"].discard(uid)


@router.post("/ai/chat")
async def ai_chat(request: Request, authorization: str = Header(default="")):
    """仅本接口鉴权及流式限长；其他业务路由保持既有权限。"""
    from urllib.error import URLError
    entered = False
    submitted = False
    uid = None
    try:
        uid = await run_in_threadpool(auth.require_current_user_id, authorization)
        if not _ai_ready():
            return _ai_reply(503, "AI服务未启用或单进程部署及限额尚未确认，可使用本地规则参考回答")
        if not AI_API_KEY:
            return _ai_reply(503, "AI上游服务尚未配置，可使用本地规则参考回答")
        body = await asyncio.wait_for(_read_ai_body(request), timeout=5)
        message = body.message.strip()
        history = [h.model_dump() for h in body.history]
        if not message or any(not h["content"].strip() for h in history) or sum(len(h["content"]) for h in history) > AI_MAX_HISTORY_CHARS:
            return _ai_reply(422, "提问或历史内容为空或超出允许范围")
        # 兼容旧客户端已经将当前问题放在history末尾的情况。
        if history and history[-1]["role"] == "user" and history[-1]["content"].strip() == message:
            history.pop()
        fingerprint = hashlib.sha256(json.dumps([message, history], ensure_ascii=False).encode()).hexdigest()
        _ai_enter(uid, fingerprint)
        entered = True
        # 等待线程真正结束后才释放并发名额，避免客户端断开导致重复计费请求穿透。
        submitted = True
        call = asyncio.create_task(run_in_threadpool(_ai_call_reserved, uid, message, history))
        # 客户端取消后仍取走后台异常，避免事件循环输出原始上游异常日志。
        call.add_done_callback(lambda done: None if done.cancelled() else done.exception())
        answer = await asyncio.shield(call)
        return _ai_reply(200, "success", answer)
    except HTTPException as exc:
        return _ai_reply(exc.status_code, str(exc.detail))
    except (ValidationError, ValueError, ClientDisconnect):
        return _ai_reply(502 if entered else 422, "AI上游响应无效" if entered else "AI请求格式或内容不符合限制")
    except TimeoutError:
        return _ai_reply(504 if entered else 408, "AI上游超时，未自动重试" if entered else "AI请求体读取超时")
    except URLError as exc:
        return _ai_reply(504 if isinstance(exc.reason, TimeoutError) else 502, "AI上游暂不可用，未自动重试")
    except Exception:
        return _ai_reply(502 if entered else 503, "AI服务暂不可用，可使用本地规则参考回答")
    finally:
        if entered and not submitted:
            with _AI_LOCK:
                _AI_STATE["active"].discard(uid)


# ---------------- 碳市场行情快照（2026-09-21 新增） ----------------

_MARKET_SNAPSHOT = {
    "quotes": [
        {"key": "cea", "name": "CEA 全国碳配额", "price": "81.03", "unit": "¥/t", "source": "上海环交所", "note": "¥78-88区间"},
        {"key": "ccer", "name": "CCER 核证减排量", "price": "82.63", "unit": "¥/t", "source": "北京绿交所", "note": "历史峰值 ¥130"},
        {"key": "eua", "name": "EUA 欧盟碳配额", "price": "75.05", "unit": "€/t", "source": "ICE Endex", "note": "Q1均价"},
        {"key": "fdi", "name": "复旦碳价指数(6月)", "price": "80.44", "unit": "¥/t", "source": "复旦大学", "note": "买入77.44 卖出83.42"},
        {"key": "gdea", "name": "GDEA 广东碳配额", "price": "37.70", "unit": "¥/t", "source": "广州碳交所", "note": "年内累计 -5.7%"},
        {"key": "szea", "name": "SZEA 深圳碳配额", "price": "47.11", "unit": "¥/t", "source": "深圳绿交所", "note": "年内 +23.8%"},
    ],
    "priceSeries": {
        "months": ["1月", "2月", "3月", "4月", "5月", "6月", "7月(预)", "8月(预)", "9月(预)", "10月(预)", "11月(预)", "12月(预)"],
        "cea": [81.5, 80.2, 82.1, 81.8, 83.0, 81.23, None, None, None, None, None, None],
        "ccer": [88.0, 86.5, 88.67, 85.2, 83.5, 82.53, None, None, None, None, None, None],
        "fudan": [None, None, None, None, None, 80.44, 80.0, 80.5, 81.0, 80.5, 80.2, 80.0],
        "euaCny": [690, 705, 680, 672, 665, 658, None, None, None, None, None, None],
    },
    "marketShare": [
        {"name": "全国碳市场CEA(上海)", "value": 81.23, "color": "#059669"},
        {"name": "北京碳配额BJEA", "value": 92.0, "color": "#0ea5e9"},
        {"name": "广东碳市场GDEA(广州)", "value": 37.62, "color": "#10b981"},
        {"name": "深圳碳配额SZEA", "value": 47.05, "color": "#3b82f6"},
        {"name": "湖北碳配额HBEA", "value": 48.2, "color": "#f59e0b"},
        {"name": "天津碳配额TJEA", "value": 40.5, "color": "#8b5cf6"},
        {"name": "重庆碳配额CQEA", "value": 38.0, "color": "#ef4444"},
        {"name": "福建碳配额FJEA", "value": 32.6, "color": "#94a3b8"},
    ],
}


# ---------------- 行情实源接入（2026-09-21）：官方公开页抓取 + 失败降级内置快照 ----------------

_MARKET_TTL = 1800      # 实源成功后的缓存时长（官方行情按日/按月更新，30 分钟足够）
_MARKET_NEG_TTL = 300   # 实源全部失败时的负缓存，避免每次请求都等待超时
_MARKET_CACHE: dict = {"ts": 0.0, "data": None, "live": False}

_MARKET_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")


def _http_text(url: str, timeout: int = 6) -> str:
    """抓取公开页面文本（带浏览器 UA），失败抛异常由调用方捕获降级。"""
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": _MARKET_UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", "ignore")


def _fetch_fudan_index() -> Optional[dict]:
    """只读取复旦 2026 年最新一期文章中明确标注的 CEA 价格预期。"""
    try:
        listing_url = "https://rcsd.fudan.edu.cn/fdtjzs/zscx/a2026nfdtjzs.htm"
        listing = _http_text(listing_url)
        entries = re.findall(r'<a\s+href="([^"]+)"\s+class="mid">(.*?)</a>', listing, re.S)
        latest = None
        for href, entry in entries:
            issue = re.search(r'<h3>2026年(\d{1,2})月复旦碳价指数</h3>', entry)
            published = re.search(r'<time>(\d{4}-\d{2}-\d{2})</time>', entry)
            if (issue and published and published.group(1) <= datetime.now().strftime("%Y-%m-%d")
                    and (latest is None or published.group(1) > latest[0])):
                latest = (published.group(1), int(issue.group(1)), href)
        if latest is None:
            return None
        published_at, issue_month, href = latest
        source_url = urljoin(listing_url, href)
        if not source_url.startswith("https://rcsd.fudan.edu.cn/info/"):
            return None
        article = _http_text(source_url)
        if 'id="vsb_content"' not in article:
            return None
        body = article.split('id="vsb_content"', 1)[1]
        plain = html_lib.unescape(re.sub(r'<[^>]+>', '', body))
        pattern = (r'(2026)年(\d{1,2})月全国碳排放配额（CEA）的买入价格预期为'
                   r'([\d.]+)元/吨，卖出价格预期为([\d.]+)元/吨，中间价为([\d.]+)元/吨')
        forecasts = []
        for match in re.finditer(pattern, plain):
            month = int(match.group(2))
            buy, sell, mid = map(float, match.group(3, 4, 5))
            if 1 <= month <= 12 and 0 < buy <= mid <= sell:
                forecasts.append({"product": "CEA", "kind": "expected_mid", "status": "expected",
                                  "targetMonth": f"2026-{month:02d}", "value": mid, "unit": "¥/t",
                                  "publishedAt": published_at, "sourceUrl": source_url})
        if not forecasts:
            return None
        current = next((item for item in forecasts if item["targetMonth"] == f"2026-{issue_month:02d}"), None)
        if current is None:
            return None
        return {"month": f'{int(current["targetMonth"][-2:])}月',
                "mid": current["value"], "forecasts": forecasts}
    except Exception:
        return None


def _fetch_cea_official() -> Optional[dict]:
    """全国碳市场 CEA 最新日度行情（上海环交所「每日概况」文章页，7 天时效校验）。

    文章页样例：开盘价81.00元/吨，最高价81.60元/吨，最低价81.00元/吨，
    收盘价81.45元/吨，收盘价较前一日上涨0.04%。
    """
    try:
        listing = _http_text("https://www.cneeex.com/qgtpfqjy/mrgk/2026n/index.shtml")
        items = re.findall(r'href="(/c/(\d{4})-(\d{2})-(\d{2})/\d+\.shtml)"[^>]*>【CEA】', listing)
        if not items:
            return None
        newest = max(items, key=lambda t: (t[1], t[2], t[3]))
        date_str = f"{newest[1]}-{newest[2]}-{newest[3]}"
        age = (datetime.now() - datetime.strptime(date_str, "%Y-%m-%d")).days
        if age < 0 or age > 7:  # 只采纳近期已经发布的交易日
            return None
        art = _http_text("https://www.cneeex.com" + newest[0])
        close = re.search(r"收盘价([\d.]+)元/吨", art)
        if not close:
            return None
        chg = re.search(r"较前一日(上涨|下跌)([\d.]+)%", art)
        open_ = re.search(r"开盘价([\d.]+)元/吨", art)
        return {
            "date": date_str,
            "sourceUrl": "https://www.cneeex.com" + newest[0],
            "close": float(close.group(1)),
            "open": float(open_.group(1)) if open_ else None,
            "chg": (f"较前日{'+' if chg.group(1) == '上涨' else '-'}{chg.group(2)}%") if chg else "",
        }
    except Exception:
        return None


def _live_market_snapshot() -> dict:
    """内置快照 + 实源覆盖（CEA 官方日度、复旦指数当期），全部失败自动降级快照。"""
    now_ts = time.time()
    cached = _MARKET_CACHE["data"]
    if cached and now_ts - _MARKET_CACHE["ts"] < (_MARKET_TTL if _MARKET_CACHE["live"] else _MARKET_NEG_TTL):
        return cached
    snap = json.loads(json.dumps(_MARKET_SNAPSHOT))
    live = []
    price_records = []
    cea = _fetch_cea_official()
    if cea:
        for q in snap["quotes"]:
            if q["key"] == "cea":
                q["price"] = f"{cea['close']:.2f}"
                q["note"] = f"{cea['date']} 收盘 {cea['chg']}".strip()
                q["source"] = "上海环交所·实源"
        snap["marketShare"][0]["value"] = cea["close"]
        price_records.append({"product": "CEA", "kind": "spot_close", "status": "observed",
                              "targetMonth": cea["date"][:7], "observedAt": cea["date"],
                              "publishedAt": cea["date"], "sourceUrl": cea["sourceUrl"],
                              "value": cea["close"], "unit": "¥/t"})
        live.append("CEA官方日度")
    fd = _fetch_fudan_index()
    if fd:
        for q in snap["quotes"]:
            if q["key"] == "fdi":
                q["name"] = f"复旦 CEA 价格预期({fd['month']})"
                q["price"] = f"{fd['mid']:.2f}"
                q["note"] = "官方价格预期中间价；非成交价"
                q["source"] = "复旦研究中心·实源"
        price_records.extend(fd["forecasts"])
        live.append("复旦 CEA 价格预期")
    snap["priceRecords"] = price_records
    snap["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    snap["disclaimer"] = ("CEA 日收盘价/复旦 CEA 价格预期取自官方公开页（按交易日/发布期更新），"
                          "其余为参考快照；实时交易请以交易所官网为准")
    snap["liveSources"] = live
    _MARKET_CACHE["data"] = snap
    _MARKET_CACHE["ts"] = now_ts
    _MARKET_CACHE["live"] = bool(live)
    return snap


@router.get("/market/quotes")
def market_quotes():
    """碳市场行情：实源优先（上海环交所日度行情 + 复旦碳价指数），失败降级内置参考快照。"""
    return ok(_live_market_snapshot())
