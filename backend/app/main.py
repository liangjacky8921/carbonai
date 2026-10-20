"""CarbonAI V6.0 — FastAPI 后端入口（整改版）

运行: uvicorn app.main:app --host 0.0.0.0 --port 8000

整改点：
1. CORS 由通配符 "*" 改为显式白名单（生产环境从 ALLOW_ORIGINS 读取）。
2. 生产环境关闭 /docs、/redoc、/openapi.json，避免暴露内部接口。
3. 保留前端 dist 单机托管能力。
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import auth, business, carbon_mapper
from app.db import Base, engine

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


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Ensure the small built-in auth schema exists before serving requests."""
    if IS_PROD and (
        auth.SECRET_KEY == "CHANGE_ME_IN_PRODUCTION" or len(auth.SECRET_KEY) < 32
    ):
        raise RuntimeError(
            "Production requires AUTH_SECRET_KEY with at least 32 characters."
        )
    Base.metadata.create_all(engine)
    yield
    engine.dispose()

app = FastAPI(
    title="CarbonAI 时空智能碳管理平台 API",
    version="6.0.0",
    description="碳排放核算 / GIS / 轨迹 / 报告 / 认证 接口。统一响应 {code, message, data}。",
    # 生产环境关闭交互式文档
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url=None if IS_PROD else "/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,          # 显式白名单，不再使用 ["*"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def no_store_observations(request, call_next):
    response = await call_next(request)
    prefix = "/api/observations/carbon-mapper"
    if request.url.path == prefix or request.url.path.startswith(prefix + "/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
        response.headers["Vary"] = "Authorization"
    return response

app.include_router(auth.router)
app.include_router(business.router)
app.include_router(carbon_mapper.router)


@app.get("/api/health")
def health():
    from app.routers.auth import check_smtp_connectivity, _smtp_daily_count
    smtp = check_smtp_connectivity()
    return {
        "status": "ok",
        "service": "carbonai-api",
        "version": "6.0.0",
        "smtp": {
            "status": smtp.get("status", "unknown"),
            "host": smtp.get("host"),
        },
        "smtp_daily_sent": _smtp_daily_count(),
    }


# 生产环境：直接托管前端 dist（单机部署模式，无需 Nginx 时可用）
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIST = os.path.join(REPO_ROOT, "frontend", "dist")


class SPAStaticFiles(StaticFiles):
    """Serve index.html for client-side routes while preserving static 404s."""

    async def get_response(self, path: str, scope):
        normalized = path.strip("/")
        request_path = str(scope.get("path", "")).strip("/")
        if (
            normalized in {"api", "docs", "redoc"}
            or request_path in {"api", "docs", "redoc"}
            or normalized.startswith("api/")
            or request_path.startswith("api/")
        ):
            raise StarletteHTTPException(status_code=404)
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404 or "." in os.path.basename(path):
                raise
            return await super().get_response("index.html", scope)


if os.path.isdir(DIST):
    app.mount("/", SPAStaticFiles(directory=DIST, html=True), name="frontend")
else:
    @app.get("/")
    def root():
        payload = {"service": "CarbonAI API v6.0", "health": "/api/health"}
        if not IS_PROD:
            payload["docs"] = "/docs"
        return payload
