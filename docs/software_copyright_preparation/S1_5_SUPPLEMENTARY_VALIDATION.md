# S1.5 Carbon Mapper 补充验证与最小接入决策

日期：2026-10-19（北京时间）；范围：官方条款复核、粤港澳 BBOX 一次完整限量查询及两个质量过滤小查询、仓库运营证据定向查看。仅更新文档，未修改 Vue/FastAPI、数据库或部署。

## 1. 官方许可再次核实

[Terms of Use（2026-01-13）](https://carbonmapper.org/terms) §3.1 在遵守条款的前提下允许访问、使用、复制、发布、展示、制作衍生品并向第三方分发数据；因此**缺少单独书面授权不等于所有非商业公开展示均被禁止**。§3.2 要求非商业并服务于温室气体减排、认知或政策目的；§3.3 要求清晰署名；§3.4 使再分发数据/衍生品的接收方遵循相同或实质相同的非商业及署名条件；§3.5 规定许可终止后的停止使用和删除副本，既有衍生品有条件例外。[数据页](https://carbonmapper.org/data)明确公开非商业用途，并指引 API 集成者到数据门户注册；[API 文档](https://api.carbonmapper.org/api/v1/docs)和本次无令牌 GET 可证明 `plumes/annotated` 技术上可查询，但不能替代对正式接入流程的核查。

`README.md:1-4` 称网站“已上线运营”，但未提供是否收费、商业客户或广告的可靠事实；代码中未发现能证明“完全免费”或“高校非商业演示”的依据。负责人须逐项确认：①网站是否完全免费；②是否存在付费功能、商业客户或广告收入；③是否确为高校研究和非商业演示；④是否计划将观测数据纳入收费服务；⑤网站是否能清晰署名、展示使用条件并将 Share-Alike 条件传递给再分发接收方。若用途落入收费/商业范畴或条款解释不明，向权利方核实或协商其他许可。

## 2. OpenAPI 参数与访问量

先复核[当前 OpenAPI schema](https://api.carbonmapper.org/api/v1/openapi.json)：`GET /api/v1/catalog/plumes/annotated` 支持重复 `bbox` 四元组、`limit/offset`、`status`、`qualities`、气体和日期；**不支持** `has_plume_emissions`。该参数存在于部分 scene 端点（其认证要求不同），不能擅自加到 plume 列表。官方 API 说明有 rate limiting，但未找到可核实的数值 QPS，本次响应也无 RateLimit/Retry-After 头。

主查询（无令牌，单次）：

`GET https://api.carbonmapper.org/api/v1/catalog/plumes/annotated?bbox=113.0&bbox=22.2&bbox=114.5&bbox=23.6&limit=100&offset=0&status=published`

2026-10-19T04:09:34Z 收到 HTTP 200，`application/json`；`bbox_count=64`、`total_count=45368`、`limit=100`、`offset=0`、`items=64`、`nearby_items=5`。**64 是该过滤条件的区域匹配数，并已完整落在本页 `items` 中；不是分页大小。** `total_count` 不可当本区域数量；`nearby_items` 是额外邻近记录，不纳入以下 64 条统计。未进行第二页或全站下载。

## 3. 对 64 条 `items` 的完整统计

| 项目 | 实测结果 | 显示含义 |
| --- | --- | --- |
| 气体 | CH₄ 33；CO₂ 31 | 两种气体均可在此 BBOX 查询到已发布记录。 |
| 排放率 | `emission_auto` 非空、有限数值且 `hide_emission=false`：**45**（CH₄ 25、CO₂ 20）；`emission_auto=null`：**19**（CH₄ 8、CO₂ 11），这 19 条均 `hide_emission=true`。对应 `emission_uncertainty_auto` 数值也为 45 条。 | 45 仅是**可取得数值**，尚非“质量已确认的定量分析数据”；19 条不得填 0、不得显示虚构排放率。 |
| 质量/状态 | `status=published` 64；响应 `plume_quality=null` **64**。另以 `qualities=good` 过滤得 `bbox_count=19`，完整请求返回 19 条，其中 15 条有非隐藏数值，但这 19 条响应的 `plume_quality` 仍全为 null。 | 过滤器与序列化字段表现不一致。不能把 `good` 过滤命中直接标为已核实的质量等级；**严格按当前可见质量字段判断，获明确质量等级的定量记录为 0**。需官方字段说明或其他可核对的质量产品。 |
| 产品/仪器 | `collection=l2c-ch4-v0` 33、`l2c-co2-v0` 31；`instrument=tan` 59、`emi` 5；`emission_version`：v3e 34、v3d 4、v3c 3、v3b 2、v3 21。 | `collection` 为返回产品集合，`emission_version` 为排放处理版本；不能因有数字就把所有记录统称完整 L4 质量产品。 |
| ID / 几何 | `plume_id` 64 条均存在、64 个唯一；无重复 ID。`source_id`、`source_name` 均未出现在这 64 条对象；64 个 Point 坐标均为有效经纬度且落在给定 BBOX，64 个坐标各不相同。 | 可作羽流观测点。没有来源实体 ID，不能自动对应企业，也不能据点位重合推断责任。坐标仍须验证与 CarbonAI 高德底图叠加。 |
| 观测/发布 | `scene_timestamp` 64 条有值，最早 `2023-08-23T04:48:29Z`、最晚 `2026-09-11T04:25:13.390Z`；`published_at` 64 条有值，最早 `2025-04-19T04:19:37.446Z`、最晚 `2026-10-11T05:19:18.155Z`。 | 保留观测时间与发布时间，不以本次 API 获取时间代替二者；不能称连续、秒级实时。 |

补充质量请求分别是相同 BBOX 加 `qualities=good&limit=1`（2026-10-19T04:10:37Z，HTTP 200，`bbox_count=19`）以及 `qualities=good&limit=25`（2026-10-19T04:11:39Z，HTTP 200，`items=19`），没有对过滤集再翻页。主查询和补充共 **3 次数据 GET**，没有认证绕过、抓取网页或压力测试。排放率/不确定性单位依据[官方产品指南](https://carbonmapper.org/articles/product-guide)为 `kg/hr` 和 `±kg/hr`；JSON 数字本身未附带单位。未为缺失数值补 0，也未保存全量原始响应。

## 4. 两种展示能力与最小版本

**A 观测展示：有条件可行。** 对 `status=published` 且有气体、合法 Point、观测时间、发布时间和可追溯 ID 的记录，可以在**用途和再分发条件确认后**以“离散遥感羽流观测”显示位置与时间，并显示“排放率未公开”“质量字段未提供”等空值说明。保留 CH₄/CO₂、时间筛选、详情及 `Source: Carbon Mapper` 链接；不把点位称为企业或实时监测。`nearby_items` 不混入当前框统计。

**B 定量排放分析：当前不足以通过。** 虽有 45 条非隐藏数值，64 条的响应质量字段均为 null，且 `qualities=good` 过滤与返回字段不一致。取得权威质量字段映射及筛选语义前，不发布“已核准排放率”“区域总量”“风险排行”等定量指标。任何未来合格的单次羽流 `kg/hr` 也**不可直接乘时数得年度总量**。[官方产品指南](https://carbonmapper.org/articles/product-guide)区分一次 plume 瞬时速率和跨观测聚合 source 估计，羽流点位也可能与实际设施不完全对齐。

最小版本仅复用 `frontend/src/views/GisView.vue` 的 Leaflet 地图与现有 `/api` 边界：独立默认关闭观测层、CH₄/CO₂ 和观测日期筛选、记录详情、来源与缺失提示。初期不做全国连续实时监测、自动企业归因、年度排放推算、新数据库、GeoLibre 或全站重构。开发前要确认官方推荐的注册账户/API Key 使用方式及 API 配额。当前阶段**没有实施**此方案。

## 5. 缓存与终止处置

当前 Terms 未给出明确通用缓存技术保留期限，不能据此推定可永久留存；§3.1 的条件许可不等于无限期存储许可，§3.5 的终止后删除义务必须落实。研究原型的**工程建议**：最多 24 小时内存缓存、按 BBOX/气体/日期隔离、显示获取时间，不写生产数据库或持久备份；发生许可终止时立即停止请求、撤下图层并清空内存及任何实际保有副本。该 24 小时是审慎设计值，**不是官方规定或已核准的公开网站缓存权利**；生产采用前需核对账户规则、再分发条款及负责人确认。

## 6. 阶段决策

**CONDITIONAL GO。** 观测点技术与数据基础成立；默认条款允许满足条件的非商业展示/再分发，不因没有单独书面授权而自动 NO-GO。但 CarbonAI 的收费/广告/商业客户事实、网站署名及 Share-Alike 传递、API 注册流程尚未确认，质量过滤结果也不能直接作为可见质量等级。

- 现在**不建议进入 S2 的真实 API 集成或公开发布**。可继续隔离本地的空状态、类型、地图交互设计，不载入/分发新数据。
- 项目负责人确认五项运营事实并明确非商业用途、文本署名、接收方使用条件和正式 API 接入方式后，可评估**限定为观测展示的 S2 本地实现**；排除定量分析、企业归因、下载、长期缓存及生产部署。
- 若实际收费或商业使用涉及本数据，应先与权利方协商许可；若用途和条款不能满足，转 NO-GO。

### 本阶段交付与验证

修改文件：本报告，以及更新 `S1_API_FEASIBILITY.md`、`S1_REAL_DATA_VALIDATION.md`、`S1_DATA_LICENSE_REVIEW.md`、`S1_GO_NO_GO_DECISION.md`。未修改 `S1_MINIMAL_API_SAMPLE.json` 的原始 S1 小样例。检查命令：定向 OpenAPI 参数解析、3 次官方数据 GET 和文档/工作区状态检查；无业务代码改动，未运行前端构建或业务测试。遗留风险：运营事实、账户规则、缓存/再分发实践、质量字段不一致、底图坐标核验。**停止于 S1.5，不自动进入 S2。**
