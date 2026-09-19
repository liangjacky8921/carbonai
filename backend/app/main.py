"""CarbonAI V5.2 — FastAPI 后端入口（整改版）

运行: uvicorn app.main:app --host 0.0.0.0 --port 8000

整改点：
1. CORS 由通配符 "*" 改为显式白名单（生产环境从 ALLOW_ORIGINS 读取）。
2. 生产环境关闭 /docs、/redoc、/openapi.json，避免暴露内部接口。
3. 保留前端 dist 单机托管能力。
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import auth, business

ENV = os.getenv("APP_ENV", "development")
IS_PROD = ENV == "production"

# ---------------------------------------------------------------------------
# CORS：生产环境必须显式列出前端来源，禁止使用通配符 "*"
# 部署时在环境变量中配置，例如：
#   ALLOW_ORIGINS=https://carbontool.cn,https://www.carbontool.cn
# ---------------------------------------------------------------------------
_DEV_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
_PROD_ORIGINS = "https://carbontool.cn,https://www.carbontool.cn"
_raw_origins = os.getenv("ALLOW_ORIGINS", "" if IS_PROD else _DEV_ORIGINS)
ALLOW_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
if IS_PROD and not ALLOW_ORIGINS:
    ALLOW_ORIGINS = [o.strip() for o in _PROD_ORIGINS.split(",") if o.strip()]

app = FastAPI(
    title="CarbonAI 时空智能碳管理平台 API",
    version="5.2.0",
    description="碳排放核算 / GIS / 轨迹 / 报告 / 认证 接口。统一响应 {code, message, data}。",
    # 生产环境关闭交互式文档
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url=None if IS_PROD else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,          # 显式白名单，不再使用 ["*"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(business.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "carbonai-api", "version": "5.2.0"}


@app.get("/")
def root():
    payload = {"service": "CarbonAI API v5.2", "health": "/api/health"}
    if not IS_PROD:
        payload["docs"] = "/docs"
    return payload


# 生产环境：直接托管前端 dist（单机部署模式，无需 Nginx 时可用）
DIST = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist"
)
if os.path.isdir(DIST):
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")
