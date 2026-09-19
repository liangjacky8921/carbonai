"""业务路由：示例数据 / 碳排放上传核算 / 报告生成 / AI 对话。

前端在后端在线时调用这些接口，离线时回退本地实现。统一响应
契约 {code, message, data} 由 app.schemas 提供。
"""
import csv
import io
import json
import os
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
