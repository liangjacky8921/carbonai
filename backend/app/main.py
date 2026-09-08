"""CarbonAI V5.2 — FastAPI 后端入口
运行: uvicorn app.main:app --host 0.0.0.0 --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.routers import auth, business

app = FastAPI(
    title="CarbonAI 时空智能碳管理平台 API",
    version="5.2.0",
    description="碳排放核算 / GIS / 轨迹 / 报告 / 认证 占位与示例数据接口。统一响应 {code, message, data}。",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议改为前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(business.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "carbonai-api", "version": "5.2.0"}


@app.get("/")
def root():
    return {"service": "CarbonAI API v5.2", "docs": "/docs", "health": "/api/health"}


# 生产环境：直接托管前端 dist（单机部署模式，无需 Nginx）
DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.isdir(DIST):
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")
