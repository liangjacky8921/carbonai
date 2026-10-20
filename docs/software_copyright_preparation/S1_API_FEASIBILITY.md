# S1 Carbon Mapper 官方 API 可行性

核验时间：2026-10-19 11:50–11:55（北京时间）；只读调研和少量公开 GET。以当天 [数据入口](https://carbonmapper.org/data)、[数据门户](https://data.carbonmapper.org/)、[API 文档](https://api.carbonmapper.org/api/v1/docs)、[OpenAPI schema](https://api.carbonmapper.org/api/v1/openapi.json)、[产品指南 v1.1.7，2026-10-07](https://carbonmapper.org/articles/product-guide) 和 [Terms，2026-01-13](https://carbonmapper.org/terms) 为准。未注册账户、未使用令牌、未修改 CarbonAI 业务代码。

## 接口与访问

| 核查项 | 当前证据与结论 |
| --- | --- |
| 正式 API 地址 | 文档位于 `https://api.carbonmapper.org/api/v1/docs`，HTML 指向 `/api/v1/openapi.json`。本次无令牌成功请求 `GET https://api.carbonmapper.org/api/v1/catalog/plumes/annotated`。STAC 搜索另见 `/api/v1/stac/search`；它不是本轮选用的羽流列表。 |
| 免登录与令牌 | OpenAPI 对 `plumes/annotated`、`sources.geojson`、`scenes/annotated` 使用 `TokenUserOptionalScopedAuth`；本次仅**实测** `plumes/annotated` 无令牌 HTTP 200。`/catalog/scenes`、`/catalog/plumes/related` 等标 `ScopedAuth`，部分下载及设施端点标 `TokenUserScopedAuth`；没有逐一访问。无令牌成功不等于获得公开网站集成、再分发或商业许可。[数据页](https://carbonmapper.org/data)仍要求 API 集成通过数据门户注册。 |
| 查询参数 | `plumes/annotated` 支持重复 `bbox` 参数组成四元组 `[minLon,minLat,maxLon,maxLat]`、`plume_gas=CH4|CO2`、`datetime`（RFC3339 单点或区间）、`published_at_datetime`、`qualities`、`status`、`sort`、`limit`、`offset` 等。实测 `bbox=113.0&bbox=22.2&bbox=114.5&bbox=23.6&limit=2&offset=0&status=published` 成功。响应含 `bbox_count,total_count,limit,offset,items,nearby_items`。 |
| 限流 | OpenAPI 说明存在 rate limiting 以避免过量占用；本轮响应没有观察到 `X-RateLimit` 或 `Retry-After` 头。未找到可核实的公开数字阈值，**不能编造 QPS**；应按官方/账户配额处理 429。端点描述另外说明下载 `limit` 上限 100000，这不是调用频率上限。 |
| 数据类型 | [产品指南](https://carbonmapper.org/articles/product-guide)区分 scene（一次影像覆盖/观测场景）、plume（一次具体羽流检测，L4A 可给瞬时排放率）、source（跨多次 plume 聚合的地理来源点，L4B 可给持续性和来源排放率）。不能将三者混作同一“实时监测点”。 |
| 气体和版本 | 官方公开数据含 CH₄、CO₂。本轮无令牌取得 CH₄ 和 CO₂ 的 `published` 记录。样例 `collection` 是 `l2c-ch4-v0` / `l2c-co2-v0`，另有 `emission_version` `v3d`/`v3e`；两字段含义不同，不可把 `collection` 冒称 L4 完整产品。 |
| 时间、质量、坐标 | 返回 `scene_timestamp`（观测）和 `published_at`（发布），另有 `modified`（记录变更）。`plume_quality` 可为空；`emission_auto`、`emission_uncertainty_auto` 可为空，且有 `hide_emission`。`geometry_json.coordinates` 为 `[经度,纬度]`。本次 schema 未见明确 EPSG/CRS 声明；按 GeoJSON 使用前仍需向官方核对坐标参考和高德底图叠加偏差。 |

官方产品指南定义 `emission_auto` 为单次 plume 排放率（kg/h），`emission_uncertainty_auto` 为 ±kg/h；`published` 状态**不能推断**排放率已公开或质量已标为 good。[指南的字段表](https://carbonmapper.org/articles/product-guide)及本次真实样例同时证明了这一点。

## 技术结论与限制

API 对最小 GIS 点位展示**技术可行**：粤港澳指定 BBOX 得到公开 CH₄ 点位，区域/日期过滤、分页有实测证据。是否可将具体记录量化展示，必须逐条检查 `hide_emission`、数值、质量、产品级别与不确定性；无有效数值应显示“排放率未公开/不可用”。S1.5 已以一次 `limit=100` 小范围请求取回该 BBOX 的全部 64 条 `items`，详见 `S1_5_SUPPLEMENTARY_VALIDATION.md`；仍未测试 source、scene、STAC 端点的运行行为，也不据此推断长期覆盖率。

S1.5 核对 OpenAPI：`has_plume_emissions` **不是**本次 `plumes/annotated` 端点的参数，只在部分 scene 端点出现，不能擅自附加到 plume 请求。`qualities=good` 可用于本端点，但筛选返回的记录仍把 `plume_quality` 序列化为 null；不应把过滤结果直接显示为质量已确认。

仅修改本目录 S1 文档及最小样例；未运行构建（无业务代码变更），未部署。详细请求与样例见 `S1_REAL_DATA_VALIDATION.md` 和 `S1_MINIMAL_API_SAMPLE.json`；许可与阶段门见另两份报告。S2 不自动开始。
