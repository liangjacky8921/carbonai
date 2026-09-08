# CarbonAI V5.2 — Render 免费版过渡部署指南

> 场景：暂无云服务器预算时，先把平台部署上线（免费），获得公网可访问的 Web 地址。
> Render 免费版限制：Web Service 15 分钟无请求会休眠（冷启动约 30-60 秒），750 小时/月免费额度内不收费。

## 方案对比

| 方案 | 免费额度 | 适用 |
|---|---|---|
| Render Web Service（FastAPI 托管 dist） | 750h/月 | ✅ 推荐：前后端一体，最简单 |
| Render Static Site（纯前端）+ Render API | 静态站免费 | 前后端分开部署 |
| Vercel（前端）+ Render（API） | 均免费 | 备选 |

## 1. 一体化部署（推荐）：FastAPI 同时托管前端与 API

### 1.1 准备 `render.yaml`

在仓库根目录创建（已含在本仓库 `render.yaml`）：

```yaml
services:
  - type: web
    name: carbonai
    runtime: python
    plan: free
    buildCommand: |
      pip install -r backend/requirements.txt
      # 在构建机上构建前端（Render 免费构建 512MB 内存，Vite 可承受）
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
      cd frontend && npm install --registry=https://registry.npmmirror.com && npm run build:fast && cd ..
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend
```

### 1.2 部署步骤

1. 代码推送到 GitHub `carbonai` 仓库（main 分支）。
2. 打开 https://dashboard.render.com → New → Blueprint → 选择仓库（识别 `render.yaml`）。
3. 等待构建完成（首次约 5-8 分钟）→ 获得 `https://carbonai-xxxx.onrender.com`。
4. 验证：`https://<你的应用>.onrender.com/api/health` 返回 `{"status":"ok",...}`。

### 1.3 关键点

- `app/main.py` 末尾已自动检测 `frontend/dist` 并挂载为静态站点（单服务模式）。
- Vite 构建时 `VITE_API_BASE=/api`（同域），无需跨域配置。
- 免费实例休眠后首次访问较慢，可配置 UptimeRobot 每 10 分钟 ping `/api/health` 保活（注意：官方不鼓励，轻量使用没问题）。

## 2. 纯前端方案（无后端，完全静态）

前端内置 Mock 回退，无后端也能完整运行（登录注册走本地 Mock）：

```bash
cd frontend
npm install && npm run build:fast
# dist/ 拖到 Render Static Site / Netlify / GitHub Pages 均可
```

## 3. 从 Render 迁移回云服务器

1. 购买学生机后按 `docs/部署指南-云服务器.md` 部署。
2. 域名 DNS 从 Render 的 CNAME 改为服务器 A 记录。
3. 删除 Render 服务即可，代码与数据无绑定。

## 4. 常见问题

| 现象 | 处理 |
|---|---|
| 构建内存不足 | 本地 `npm run build:fast` 后把 `dist/` 一并提交，构建命令去掉 node 部分 |
| 冷启动慢 | 免费版固有；用 UptimeRobot 保活或升级付费 |
| /api 404 | 确认 startCommand 带 `--app-dir backend` |
| 环境变量 | Render Dashboard → Environment：`DATABASE_URL`（接库后）|
