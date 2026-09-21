"""业务路由：示例数据 / 碳排放上传核算 / 报告生成 / AI 对话。

前端在后端在线时调用这些接口，离线时回退本地实现。统一响应
契约 {code, message, data} 由 app.schemas 提供。
"""
import csv
import io
import json
import os
import re
import time
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel

from app.factors import FACTOR_LIB, match_factor
from app.schemas import ok, err

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
            rows.append([str(c).strip() for c in line])
    elif name.endswith((".xlsx", ".xls")):
        import openpyxl

        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.worksheets[0]
        for row in ws.iter_rows(values_only=True):
            rows.append(["" if c is None else str(c).strip() for c in row])
        wb.close()
    else:
        raise ValueError("仅支持 .csv / .xlsx / .xls 文件")
    return rows


def _find_columns(rows: List[List[str]]) -> dict:
    """在前若干行中定位排放核算所需的表头列，返回列下标（找不到为 -1）。"""
    idx = {"source": -1, "activity": -1, "unit": -1, "year": -1, "month": -1, "department": -1}
    for i in range(min(len(rows), 20)):
        for j, cell in enumerate(rows[i]):
            c = cell.lower()
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
        try:
            activity = float(r[idx["activity"]])
        except (ValueError, TypeError):
            continue
        if not source_name or activity <= 0:
            continue

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

        unit = factor["unit"]
        if idx["unit"] >= 0 and idx["unit"] < len(r) and r[idx["unit"]]:
            unit = r[idx["unit"]]

        records.append({
            "year": year,
            "month": month,
            "department": department,
            "source": source_name,
            "activity": activity,
            "unit": unit,
            "factor": factor["factor"],
            "scope": factor["scope"],
            "emission": round(activity * factor["factor"], 2),
            "factorSource": factor["source"],
            "confidence": "low" if factor["source"] == "默认排放因子" else "high",
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
        totals = {"Scope 1": 0.0, "Scope 2": 0.0, "Scope 3": 0.0}
        for r in body.records:
            scope = r.get("scope")
            if scope in totals:
                totals[scope] += float(r.get("emission") or 0)

        story.append(Paragraph("一、Scope 排放汇总", head_style))
        summary = [[Paragraph("#", cell_style), Paragraph("范围", cell_style), Paragraph("排放量 (tCO₂e)", cell_style)]]
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
        detail = [[Paragraph("#", cell_style), Paragraph("排放源", cell_style), Paragraph("范围", cell_style), Paragraph("活动数据", cell_style), Paragraph("因子", cell_style), Paragraph("排放量 (tCO₂e)", cell_style)]]
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
    story.append(Paragraph("说明：本报告由 CarbonAI V5.2 自动生成，排放因子取值见平台因子库（含溯源与 DQR 评级）。", sub_style))

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

class ChatBody(BaseModel):
    message: str
    history: list = []


AI_API_BASE = os.getenv("AI_API_BASE", "https://api.deepseek.com/v1/chat/completions")
AI_API_KEY = os.getenv("AI_API_KEY", "").strip()
AI_MODEL = os.getenv("AI_MODEL", "deepseek-chat")
AI_TIMEOUT = int(os.getenv("AI_TIMEOUT", "60"))

SYSTEM_PROMPT = (
    "你是 CarbonAI 时空智能碳管理平台的碳管理顾问。"
    "专业领域：碳核算（Scope 1/2/3）、CBAM、产品碳足迹（ISO 14067 / GB/T 24067）、"
    "碳市场（CEA/CCER）、ESG 披露、污水厂减污降碳、减排路径。"
    "回答保持专业、简洁、中文；涉及数据时注明口径与年份；不确定的内容明确提示。"
)


def _call_llm(message: str, history: list) -> str:
    """调用 OpenAI 兼容接口（DeepSeek 等），使用标准库 urllib，不引入新依赖。"""
    import urllib.request

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in (history or [])[-8:]:
        if isinstance(h, dict) and h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": str(h["content"])})
    messages.append({"role": "user", "content": message})

    payload = json.dumps({
        "model": AI_MODEL,
        "messages": messages,
        "temperature": 0.5,
        "max_tokens": 1500,
    }).encode()

    req = urllib.request.Request(
        AI_API_BASE,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {AI_API_KEY}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=AI_TIMEOUT) as resp:
        data = json.loads(resp.read().decode())
    return data["choices"][0]["message"]["content"]


@router.post("/ai/chat")
def ai_chat(body: ChatBody):
    """AI 顾问：服务端代理调用 LLM（密钥不暴露给浏览器），未配置密钥时返回 503 由前端回退本地知识库。"""
    if not body.message or not body.message.strip():
        return err("消息不能为空")
    if not AI_API_KEY:
        return err("AI 服务尚未配置（请设置 AI_API_KEY 环境变量后启用）", 503)
    try:
        answer = _call_llm(body.message.strip(), body.history)
        return ok(answer)
    except Exception as e:
        return err(f"AI 服务调用失败：{e}", 502)


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
    """复旦碳价指数当期值（复旦大学可持续发展研究中心「当期指数」页，首条即最新 CEA 指数）。"""
    try:
        html = _http_text("https://rcsd.fudan.edu.cn/fdtjzs/zsdt/dqzs.htm")
        title = re.search(r"(\d{4})年(\d{1,2})月全国碳排放配额（CEA）", html)
        m = re.search(r"买入价格预期为([\d.]+)元/吨，卖出价格预期为([\d.]+)元/吨，中间价为([\d.]+)元/吨", html)
        if not m:
            return None
        month = f"{title.group(2)}月" if title else "当期"
        return {"month": month, "buy": float(m.group(1)),
                "sell": float(m.group(2)), "mid": float(m.group(3))}
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
        if age > 7:  # 文章停更/滞后时放弃实源，保留快照值
            return None
        art = _http_text("https://www.cneeex.com" + newest[0])
        close = re.search(r"收盘价([\d.]+)元/吨", art)
        if not close:
            return None
        chg = re.search(r"较前一日(上涨|下跌)([\d.]+)%", art)
        open_ = re.search(r"开盘价([\d.]+)元/吨", art)
        return {
            "date": date_str,
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
    cea = _fetch_cea_official()
    if cea:
        for q in snap["quotes"]:
            if q["key"] == "cea":
                q["price"] = f"{cea['close']:.2f}"
                q["note"] = f"{cea['date']} 收盘 {cea['chg']}".strip()
                q["source"] = "上海环交所·实源"
        snap["marketShare"][0]["value"] = cea["close"]
        live.append("CEA官方日度")
    fd = _fetch_fudan_index()
    if fd:
        for q in snap["quotes"]:
            if q["key"] == "fdi":
                q["name"] = f"复旦碳价指数({fd['month']})"
                q["price"] = f"{fd['mid']:.2f}"
                q["note"] = f"买入{fd['buy']:.2f} 卖出{fd['sell']:.2f}"
                q["source"] = "复旦研究中心·实源"
        live.append("复旦碳价指数")
    snap["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    snap["disclaimer"] = ("CEA/复旦碳价指数为官方公开页实源数据（按交易日/按月更新），"
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
