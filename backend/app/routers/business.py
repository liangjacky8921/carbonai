"""业务占位路由：示例数据 / 碳排放上传 / 报告生成 / AI 对话
前端在后端在线时自动调用这些接口；离线时回退本地 Mock。
接口逐步实装，保持契约 {code, message, data} 不变。
"""
import csv
import io
import json
import os
from typing import Optional
from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel

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


# ---------------- 碳排放上传（占位：接收 + 简单统计） ----------------

@router.post("/emissions/upload")
async def emissions_upload(file: UploadFile = File(...)):
    """接收 Excel/CSV 碳排放数据。当前占位实现：返回文件元信息。
    实装建议：openpyxl/pandas 解析 → 因子匹配 → SQLAlchemy 入库 → 返回核算结果。"""
    content = await file.read()
    return ok({
        "filename": file.filename,
        "size": len(content),
        "message": "文件已接收（占位接口）。解析核算逻辑请接入 pandas + 因子库后启用。",
    })


# ---------------- 报告生成（占位） ----------------

class ReportBody(BaseModel):
    standard: str
    year: int
    format: str = "pdf"


@router.post("/reports/generate")
def reports_generate(body: ReportBody):
    """报告生成占位：当前由前端（docx/jsPDF）本地生成。后端实装可用 weasyprint/reportlab 生成服务端 PDF。"""
    return ok({
        "standard": body.standard,
        "year": body.year,
        "format": body.format,
        "message": "占位接口。当前 V5.2 报告由前端本地生成（docx/jsPDF），无需后端参与。",
    })


# ---------------- AI 对话（占位） ----------------

class ChatBody(BaseModel):
    message: str
    history: list = []


@router.post("/ai/chat")
def ai_chat(body: ChatBody):
    """AI 顾问占位：接入 DeepSeek / 其他 LLM 时替换为真实调用（参考 legacy/api/chat.js 的 Vercel 实现）。"""
    return err("AI 服务尚未配置（请设置 AI_API_KEY 环境变量后启用）", 503)
