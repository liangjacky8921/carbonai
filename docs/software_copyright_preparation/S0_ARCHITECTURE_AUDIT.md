# S0 架构审计与版本基线

日期：2026-10-19。范围：本地 `carbonai` 仓库的定向只读检查；未连接生产服务器或读取生产密钥。状态：S0 完成，接入实施待许可与数据条件核实。

## 代码与部署结构

| 部分 | 已核实事实与代码证据 | 对遥感观测接入的含义 |
| --- | --- | --- |
| 前端 | `frontend/package.json` 声明 Vue 3.5、TypeScript、Vite 5、Vue Router 4、Pinia、Element Plus、ECharts、Leaflet 1.9、`leaflet.heat`；`frontend/src/main.ts:1-29` 装载应用、状态与路由；`frontend/src/router/index.ts:1-59` 按路由懒加载页面。 | 复用 Vue 页面、Pinia 和现有 GIS 引擎；无需 React 或另一套地图框架。 |
| 地图容器 | `frontend/src/views/GisView.vue:237-245` 初始化 Leaflet 和高德底图；`:495-545` 绘制排放热力图与 GBA 城市圆标；`:57` 的“外部卫星观测”只是未接入占位。 | 首选在该地图中增加**独立、默认关闭**的遥感观测图层与详情；不混入内置排放点。 |
| 前端数据 | `frontend/src/api/client.ts:11-64` 使用 Axios 和 `/api` 默认地址、后端健康探测；`frontend/src/stores/data.ts:29-82` 维护示例/用户上传数据；`frontend/public/sample-data/` 保存本地示例文件。 | 新建观测专用 service/类型；不可把外部观测写成现有 `sample` 或用户台账。 |
| 后端 | `backend/app/main.py:39-70` 建立 FastAPI，挂载认证和业务路由；`backend/app/routers/business.py:24` 使用 `/api` 前缀；`backend/app/schemas.py` 使用 `{code,message,data}` 响应；`backend/app/factors.py` 管理核算因子。 | 在现有 `/api` 约定下增加只读适配层。当前业务逻辑主要在 router，未见独立通用 Service 层。 |
| 数据库 | `backend/app/db.py:16-47` 以 SQLAlchemy 建立连接，模型仅 `User`、`EmailCode`；本地默认 SQLite，生产连接由 `DATABASE_URL` 环境变量指定。 | 未发现持久化的碳源、企业、行政区划、排放因子或遥感观测 ORM 表。S1 无需先改数据库；不得把前端示例对象误称为生产数据库实体。 |
| 部署接口 | `frontend/vite.config.ts` 的开发代理转发 `/api`；`deploy/nginx-carbontool.conf` 将 `/api/` 转发至 FastAPI、前端静态文件由 Nginx 提供；`deploy/deploy-backend.sh` 是部署模板。 | 现有同源 `/api` 可供前端使用；实际 ECS 运行配置、数据库类型和网络出站权限本阶段未验证。 |

现有外部连接：`frontend/src/views/GisView.vue:240-245` 的高德瓦片、`backend/app/routers/business.py:411-496` 的 CEA/复旦公开网页行情尝试、同文件的可选 AI 上游地址，以及 `frontend/src/views/GisView.vue:278` 的可选监测 SSE。未发现 Carbon Mapper 的请求、凭据或定时同步任务。配置涉及 `VITE_API_BASE`、`VITE_MONITORING_SSE_URL`、`DATABASE_URL`、`ALLOW_ORIGINS`、`AUTH_SECRET_KEY` 和可选 AI/SMTP 变量；仅核对变量名，未打开实际环境值。

## Git 基线

- 分支：`main`，跟踪 `origin/main`；HEAD：`1be1335`（首页主标题标点修改）。最近提交还包括 `898e4af`、`ccb2282`、`b752ae8`、`6c1b59c`。本地尚无 tag。
- 工作区**非干净**：`?? docs/carbon-mapper/` 是已存在的未跟踪可行性报告。未清理、暂存、覆盖、提交、切换分支或打 tag。
- 建议待工作区及文档归属经负责人核对后，把审核通过的基线提交标记为 `pre-carbon-mapper-s0-20261019`，从该确切提交创建 `feat/carbon-mapper-observations`。先保存现有未跟踪文件并确认其去向，再执行 `git status`、确认 HEAD、创建 tag/分支；本轮不执行。

## 本阶段记录

- 检查：入口、路由、地图、API、ORM、数据源、部署模板、Git；未检查线上运行配置和授权账户。
- 实际修改：仅本目录四份 S0 审计文档；业务代码、数据库、生产环境无修改。
- 技术决策：以现有 Leaflet + `/api` 为唯一接入点，许可核实前不接入。
- 非破坏性检查：`vue-tsc --noEmit` 通过；`node --test tests/carbonPriceChart.test.mjs` 3/3 通过；`python -m unittest discover -s tests -p test_carbon_price.py -v` 3/3 通过；`git diff --check` 通过。未运行完整浏览器或生产 API 检查。
- 下一阶段：**暂不进入 S1 实施**，先满足 `S0_MINIMAL_CHANGE_PLAN.md` 的许可、实际 API 权限和数据覆盖验收门。
