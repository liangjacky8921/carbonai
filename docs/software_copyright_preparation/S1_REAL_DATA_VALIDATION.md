# S1 少量真实数据验证

2026-10-19 11:50–11:55（Asia/Shanghai）从当前 [OpenAPI schema](https://api.carbonmapper.org/api/v1/openapi.json)确认 GET 参数后，用标准 HTTPS 客户端、**无认证头**对同一官方端点 `/api/v1/catalog/plumes/annotated` 进行 3 个区域各两次小查询：首轮 `limit=2` 看数量和字段，次轮 `limit=1` 提取最小样例。总计 6 次数据 GET；未分页下载、未调用下载端点。获取时间均由客户端 UTC 时钟记录，并非观测时间或发布时刻。

## 区域依据与请求

| 区域 | 依据和请求参数（均另带 `limit=2&offset=0&status=published`） | 首轮真实响应 |
| --- | --- | --- |
| A 粤港澳大湾区 | 用户指定 `bbox=113.0&bbox=22.2&bbox=114.5&bbox=23.6`，无日期/气体限制 | HTTP 200，JSON；`bbox_count=64`、`total_count=45368`、本页 `items=2`、`nearby_items=0`。这是 API 返回的匹配计数字段，不代表覆盖率或每条有排放率。 |
| B 中国 CH₄ 官方示范点附近 | [Carbon Mapper 官方文章](https://carbonmapper.org/articles/tanager-1-two-years-of-turning-satellite-data-into-methane-action)链接煤矿羽流 `tan20260509t043245c29s4001-P`，门户给出约 `[112.52835,35.60861]`。以该公开点为依据取小框 `bbox=112.4&bbox=35.5&bbox=112.7&bbox=35.8`，`plume_gas=CH4`，`datetime=2026-05-01T00:00:00Z/2026-05-20T23:59:59Z`。框边界为本次查询设置，不是官方边界。 | HTTP 200；`bbox_count=28`、`total_count=426`、本页 `items=2`。 |
| C 卡塔尔 CO₂ 官方示范点附近 | 同一[官方文章](https://carbonmapper.org/articles/tanager-1-two-years-of-turning-satellite-data-into-methane-action)链接发电相关羽流 `tan20260627t083432c46s4001-C`，门户约 `[51.54686,25.89284]`。小框 `bbox=51.4&bbox=25.75&bbox=51.7&bbox=26.05`，`plume_gas=CO2`，`datetime=2026-06-20T00:00:00Z/2026-07-03T23:59:59Z`。 | HTTP 200；`bbox_count=3`、`total_count=104`、本页 `items=2`。 |

`bbox` 在实际 URL 中以四个同名参数传入，日期区间按 URL 编码；完整**无凭据** URL 记录于 `S1_MINIMAL_API_SAMPLE.json`。第二轮只把 `limit` 改为 1，各区仍返回 HTTP 200 与 1 个 `items`。请求均无 API Key、Token、Cookie 或用户数据。

## 最小真实样例与字段解释

| 样例（返回第一条） | 坐标 `[lon,lat]` | 观测 UTC / 发布 UTC | 排放率与质量 | 产品字段 |
| --- | --- | --- | --- | --- |
| A `tan20260911t042513c39s4001-A`，CH₄ | `[113.93374649,22.41945587]` | `2026-09-11T04:25:13.390Z` / `2026-10-11T05:19:15.722Z` | `emission_auto=null`，`emission_uncertainty_auto=null`，`plume_quality=null`，`hide_emission=true`。**只能说明有已发布检测记录，不可展示排放率。** | `collection=l2c-ch4-v0`，`emission_version=v3e`，`instrument=tan`。 |
| B `tan20260509t043245c29s4001-A`，CH₄ | `[112.64444570,35.60663607]` | `2026-05-09T04:32:45.290Z` / `2026-06-08T05:19:14.655Z` | `emission_auto=2719.540862562948 kg/h`，`emission_uncertainty_auto=996.6026515947519 ±kg/h`，`plume_quality=null`，`hide_emission=false`。 | `collection=l2c-ch4-v0`，`emission_version=v3d`，`instrument=tan`。 |
| C `tan20260627t083432c46s4001-A`，CO₂ | `[51.54810329,25.92410735]` | `2026-06-27T08:34:32.460Z` / `2026-07-27T09:19:15.047Z` | `emission_auto=281842.0147593241 kg/h`，`emission_uncertainty_auto=191181.05806840572 ±kg/h`，`plume_quality=null`，`hide_emission=false`。 | `collection=l2c-co2-v0`，`emission_version=v3e`，`instrument=tan`。 |

单位根据[官方产品指南字段定义](https://carbonmapper.org/articles/product-guide)，**不是** API 值字段自带单位。三条样本 `status=published`，但 `plume_quality` 均为 null，不能擅自当作“good”；A 的 `hide_emission=true` 是重要显示限制。坐标为 API 原值，尚未与 CarbonAI 高德底图叠加校验。

## 覆盖与适用性判断

- 珠三角指定框**查到真实已发布记录**，因此不是“该框完全没有公开记录”。S1.5 已核对 `bbox_count=64` 与本页全部 `items=64` 一致；其中 CH₄ 33 条、CO₂ 31 条，45 条非空且未隐藏的数值、19 条排放率 null。详见 `S1_5_SUPPLEMENTARY_VALIDATION.md`。这仍不证明连续观测、长期稳定覆盖或所有数值已获可见质量确认；缺数更不能解释为零排放。
- 同一 API 通过 `bbox` 与 `datetime` 可搜索区域和观测时间；还有独立的 `published_at_datetime`。官方[条款](https://carbonmapper.org/terms)说明点时观测有天气/技术空档与发布延迟，[产品指南](https://carbonmapper.org/articles/product-guide)说明 L4 产品一般观测约 30 天后公开。不能称秒级实时或全球连续覆盖。
- 羽流/来源点不能直接可靠归因某企业。[官方指南](https://carbonmapper.org/articles/product-guide)明确位置与地面设施可能不完全对齐，细粒度归因取决于 GIS 辅助资料；本轮未核验企业信息、地籍或现场记录。GIS 可展示独立“遥感观测”点，但详情必须明确观测、发布、质量和不确定性。

字段对应和最小原值存于 `S1_MINIMAL_API_SAMPLE.json`。本阶段未修改代码、未部署，未做性能/完整分页测试；S2 仍受许可门约束。
