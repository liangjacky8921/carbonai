# CarbonAI V5.2 — FastAPI 后端

## 快速启动（开发）

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API 文档（Swagger）: http://127.0.0.1:8000/docs
- 健康检查: http://127.0.0.1:8000/api/health

## 接口总览（统一响应 `{code, message, data}`）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/auth/register | 注册（username/email/password/code） |
| POST | /api/auth/login | 登录 → {token, user} |
| POST | /api/auth/logout | 登出 |
| POST | /api/auth/send-code | 邮箱验证码（占位，控制台输出） |
| GET  | /api/auth/user-info | 用户信息（Bearer token） |
| GET  | /api/sample/list | 示例数据集清单 |
| GET  | /api/sample/{key} | 示例数据（emissions/trajectory/points/boundary/bom/soil/sewage） |
| POST | /api/emissions/upload | 碳排放数据上传（占位） |
| POST | /api/reports/generate | 报告生成（占位，当前前端本地生成） |
| POST | /api/ai/chat | AI 顾问（占位，待接入 LLM API Key） |

## 数据库接入（后续）

见 `app/db.py`：设置 `DATABASE_URL` 环境变量（默认 sqlite），运行 `python -m app.db` 建表，
然后将 `routers/auth.py` 的内存 `_USERS` 替换为 SQLAlchemy 查询即可。

## 生产部署

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

配合 Nginx 反向代理（见 docs/部署指南-云服务器.md），或单机模式直接托管 frontend/dist。
