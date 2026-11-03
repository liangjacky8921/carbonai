# S2 — Carbon Mapper 最小后端接入（本地，默认关闭）

日期：2026-10-19。仅新增独立只读观测适配层；未修改 Vue、现有碳核算、数据库、ECS 或部署配置。此前 S1.5 为 **CONDITIONAL GO**，本次用户授权仅覆盖隔离本地开发，不表示公开网站许可门已通过。

## 检查与技术依据

- 阅读 `S0_MINIMAL_CHANGE_PLAN.md`、`S1_GO_NO_GO_DECISION.md`、`S1_5_SUPPLEMENTARY_VALIDATION.md`、`S1_DATA_LICENSE_REVIEW.md`；复核 `backend/app/main.py` 路由、`backend/app/schemas.py` 响应结构及现有 `frontend/src/api/client.ts` 的 `/api` 约定。未接入前端。
- [当前官方 OpenAPI](https://api.carbonmapper.org/api/v1/openapi.json)：列表 `GET /api/v1/catalog/plumes/annotated` 标注 `TokenUserOptionalScopedAuth`，详情 `GET /api/v1/catalog/plume/{plume_id}` 标注 `OptionalAuth`，均为 HTTP Bearer；列表接收重复的 `bbox`、`plume_gas`、`datetime`、`limit`、`status`。
- 2026-10-19 限量实测：无凭据列表 HTTP 200、`bbox_count=64`（本次 `limit=1`）、详情 HTTP 200；带 CH4 和 2026-09-01/2026-09-30 日期过滤的小请求 HTTP 200、`bbox_count=3`、`items=1`；故意无效 Bearer 返回 HTTP 401。本机未配置真实 `CARBON_MAPPER_API_KEY`，**有效 Token 尚未联调**。无凭据可读不等于正式接入方式或公开展示获准。
- [官方 Terms（2026-01-13）](https://carbonmapper.org/terms) §3.1–3.5：数据使用受非商业、目的、署名、同条件再分发及终止后删除约束。负责人尚未确认 CarbonAI 的实际运营性质，因此功能开关必须保持关闭。代码不保存任何观测缓存，也不将数据写入数据库。

## 实施

| 文件 | 变更 |
| --- | --- |
| `backend/app/carbon_mapper.py` | 固定官方 HTTPS 上游；服务端环境变量读取 Bearer；8 秒超时、单进程 10 次/分钟上限、无缓存；标准化已发布 plume Point、气体、UTC 观测/发布时间、隐藏排放率、质量、产品与来源；不填补 null 或推算年排放。 |
| `backend/app/routers/carbon_mapper.py` | 新增列表及详情 GET；列表 `bbox=minLon,minLat,maxLon,maxLat`、`gas=CH4|CO2`、`from/to=YYYY-MM-DD`、`limit=1..100`；参数检查、统一 `{code,message,data}`。详情只返回 `published`。 |
| `backend/app/main.py` | 注册新路由，先于 SPA 静态路由。 |
| `backend/tests/test_carbon_mapper.py` | 开关、空结果、真实值/null/隐藏值、401、不通、异常响应、详情状态、bbox 与限流定向测试。 |

两条本地路由：`GET /api/observations/carbon-mapper` 和 `GET /api/observations/carbon-mapper/{plume_id}`。仅当服务端 `CARBON_MAPPER_ENABLED=true` **且** `CARBON_MAPPER_API_KEY` 非空时请求上游。前端不接收 Token；错误响应不包含请求头、上游正文或密钥。此处刻意要求配置凭据，即使官方目前允许匿名读取，以免运营站点在未核实正式接入条件前误用匿名通道。许可/运营审查通过前，不得开启公开环境的开关。

列表只使用区域内 `items`，不混入 `nearby_items`。`emission_auto` 与不确定性按官方产品指南标为 kg/h；`hide_emission=true` 时均返回 null；`plume_quality` 原值若缺失继续为 null，**不把质量过滤命中解释成已核准质量**。坐标为官方 WGS84/EPSG:4326，经前端叠加高德底图前仍需校核偏移。来源文本为 Carbon Mapper，记录还带 Terms URL；不使用其 logo。

## 测试与结果

- `backend/.venv/Scripts/python.exe -m unittest discover -s tests -p 'test_*.py' -v`：10/10 通过（S2 新增 7 项、现有碳价 3 项）。
- 新增文件语法编译通过；`git diff --check` 通过。
- 官方限量 GET：列表 200、详情 200、无效 Bearer 401；仅验证认证机制，不读取或记录有效 Token。
- 真实有效 Token 的端到端请求：**未验证**，本机没有 `CARBON_MAPPER_API_KEY`。FastAPI `TestClient` 测试未运行，虚拟环境无 `httpx`；单元测试及路由注册导入通过。未安装新依赖。

## 风险和下一阶段门槛

1. 负责人需确认网站收费、商业客户、广告、研究目的、未来付费功能及署名/同条件再分发实现；不符合默认非商业许可时需另行许可。未确认前不开启生产开关。
2. 有效 Token 的正式取得方式、权限及配额未实测；本地配置后再做最少量有效 Token 联调。不得把 Token 放入 `.env.example`、前端、仓库或日志。
3. 当前限流为**单进程**上限，部署多 worker 前需评估全局配额；官方未公布可核实的具体请求数。无缓存意味着每个查询都会消耗上游请求；生产前应核对许可、容量与终止处置。未确认缓存权利前继续不缓存。
4. 质量字段在 S1.5 的 64 条中均为 null；排放率虽可保留为观测字段，不得据此开展“已核准”排行、企业归因、区域合计或年度换算。

**阶段结论：S2 本地适配层可供审核；不自动进入 S3，不提交或部署。**
