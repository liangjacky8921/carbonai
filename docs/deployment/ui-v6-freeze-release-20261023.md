# CarbonAI V6.0 UI-1/UI-2 发布记录

日期：2026-10-23。范围仅为首页文案、局部 CSS 与共享顶栏分割线。依据 `docs/ui-polish/freeze-acceptance.md`，从 `origin/main` 的 `d384f53` 建立隔离发布工作树，移入已经验收的五个 Vue 文件及三份 UI 审计文档；原 `feature/carbon-mapper-s4-readiness` 工作树及其未提交文件未动。

## 发布内容

- GitHub `main`：提交 `a7f316a`（`polish CarbonAI V6 homepage copy and UI details`），推送成功。该提交没有 Carbon Mapper 后端或图层代码。
- 前端构建：`npm run build` 通过，执行了 `vue-tsc --noEmit && vite build`；`git diff --check` 通过。
- 本地构建预览：首页六个章节和 3D Canvas 可见，首页、数据大厅、GIS、登录、碳核算路由渲染；未见控制台阻断错误。本地 API 未启动，因此预览环境的 `/api/health` 请求失败不代表生产故障。真实手机和生产浏览器仍待人工验证。
- 生产目标：阿里云 ECS `/opt/carbonai/frontend/dist`。只替换前端静态构建文件；保留旧哈希资源供已打开的标签页继续加载。未切换生产 Git 工作树，未修改或重启 FastAPI、数据库、Nginx 配置。

## 发布后核对

| 项目 | 结果 |
| --- | --- |
| 生产 `index.html` SHA-256 | `8863bf3720850b6bcb8eb02926435786ec1f7a6be8e4781eb58ada9bfa74391a`，与本地构建一致 |
| `/`、`/dashboard`、`/gis`、`/auth/login`、`/accounting` | HTTP 200，HTML |
| `/api/health` | HTTP 200，JSON；`carbonai-api` 与 nginx 均为 active |
| 首页入口及懒加载 JS/CSS | 已抽查返回 HTTP 200，MIME 正确；`HomeView` JS/CSS 和 `MainLayout` CSS 与本地构建哈希一致 |
| 真实生产浏览器渲染 | **未验证**。Codex 浏览器连接生产地址时返回 `ERR_CONNECTION_CLOSED`，但命令行请求与服务器文件核对正常；需在 PC 和手机浏览器人工复查 |

发布包：`/opt/carbonai/releases/ui-a7f316a.tar.gz`。旧前端备份：`/opt/carbonai/releases/ui-a7f316a-20261023/backup`。保留旧版本备份和资源；未清理。

## 回滚

若出现确定的前端回归，先保留当前 `/opt/carbonai/frontend/dist` 供排查，再将备份目录恢复到该路径，并确认 `index.html` 与引用资源、首页、API 和关键路由。仅回滚静态前端；不调整生产 Git 工作树、后端服务和数据库。

## 剩余限制

UI-1/UI-2 的生产可访问性已有 HTTP 与文件证据，实际 PC/手机浏览器展示、交互和 reduced-motion 运行态尚未得到自动化验证。本次发布未启用 Carbon Mapper 功能。
