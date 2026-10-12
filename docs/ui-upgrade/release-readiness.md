# CarbonAI V6.0 发布准备清单

> 状态：代码与本地生产模式可验证，尚未部署。
> 更新：2026-10-12（Asia/Shanghai）

## 已完成

- 前端生产构建、14 个主要路由、移动端、键盘、图表、GIS、PDF/Word 导出已通过。
- FastAPI 健康检查、注册、登录、令牌、CSV 核算、后端 PDF 和 SSE 已通过隔离环境验收。
- 后端首次启动自动创建认证表；单机托管支持 Vue 深层路由刷新。
- 生产环境禁止使用默认或少于 32 字符的 `AUTH_SECRET_KEY`。
- 健康检查只返回 SMTP 状态和主机，不暴露登录邮箱或错误详情。
- 前后端 `.env.example` 已覆盖当前 V6.0 配置，未写入真实密钥。

## 上线前必须完成

1. 在托管平台生成独立 `AUTH_SECRET_KEY`，不得复用测试值。
2. 配置持久化 `DATABASE_URL`。Render 默认文件系统会随重启或重新部署丢失，本地 SQLite 只能放在付费持久磁盘上；免费方案应连接外部持久数据库。[Render Persistent Disks](https://render.com/docs/disks) · [Render Free](https://render.com/docs/free)
3. 核对 `ALLOW_ORIGINS` 只包含实际前端域名。
4. 如启用邮件注册，配置 SMTP 并用真实邮箱完成一次验证码闭环；未配置时验证码只输出到服务日志。
5. 如启用 AI 顾问，配置服务端 `AI_API_KEY` 并设置调用额度与日志脱敏；未配置时保留本地知识库回退。
6. 如启用实时监测，在前端构建环境配置 HTTPS 的 `VITE_MONITORING_SSE_URL`，避免 HTTPS 页面连接 HTTP 流被浏览器拦截。

## Render Blueprint

`render.yaml` 已设置：

- `APP_ENV=production`
- 生产域名 CORS 白名单
- 自动生成 256 位 `AUTH_SECRET_KEY`
- 在首次创建 Blueprint 时要求人工填写 `DATABASE_URL`

Render 官方 Blueprint 支持 `generateValue: true` 生成随机密钥，也支持 `sync: false` 在首次创建时提示填写秘密值。[Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec)

## 发布后检查

1. `/api/health` 返回 HTTP 200、`version=6.0.0`。
2. `/docs`、`/redoc`、`/openapi.json` 及不存在的 `/api/*` 在生产环境返回 404。
3. `/`、`/dashboard`、`/gis` 返回前端 HTML，缺失的 `/assets/*` 保持 404。
4. 使用新账号完成验证码、注册、登录、刷新、退出和重新登录。
5. 上传脱敏 CSV，确认核算记录、页面状态和导出报告一致。
6. 检查浏览器控制台、后端错误日志、数据库写入与服务重启后的数据保留情况。

## 暂不执行

- 自动部署、域名切换、数据库迁移和生产密钥写入。
- 正式 SMTP 发信和付费 LLM 调用。
- 软著材料生成或登记提交。
