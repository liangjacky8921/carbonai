# S0 最小侵入变更方案（待执行）

日期：2026-10-19。此文是方案，**没有实施外部数据接入**。现有复用点：`frontend/src/views/GisView.vue:237-245,495-545` 的 Leaflet 地图和 `:57` 卫星观测占位；`frontend/src/api/client.ts:11-64` 的 `/api` 请求约定；`backend/app/main.py:69-70` 和 `backend/app/routers/business.py:24` 的 FastAPI 路由。无需新 GIS 引擎或另建一套工作台。

## 先过实施门

1. 由负责人写明 CarbonAI 的实际运营方式、预期用户、是否收费、是否对用户再分发观测记录/衍生信息；依据 [Carbon Mapper 使用条款](https://carbonmapper.org/terms)取得对应许可或书面确认，并留存署名/展示要求。
2. 用有权项目账户核对 [官方 API 文档](https://api.carbonmapper.org/api/v1/docs) 的可访问端点、认证范围、限流、允许缓存/再分发、所需地域和时间窗的真实覆盖；验证实际响应字段与质量状态。不存储或暴露账户密钥于前端、Git、截图。
3. 明确观测与排放清单的业务隔离；核查观测坐标系与高德底图适配。无授权、无覆盖或字段不足时保留“未接入/无可用观测”，不得生成替代点位。

## 条件满足后的最小设计

| 层 | 拟新增或复用 | 数据/异常约定 |
| --- | --- | --- |
| FastAPI 适配层 | 在 `backend/app/routers/` 新增只读观测路由，并在 `backend/app/main.py` 注册；必要时新增小型 provider/service 模块，复用 `backend/app/schemas.py` 的响应壳。**拟议** `GET /api/observations/carbon-mapper?bbox=...&gas=CH4&from=...&to=...&limit=...`，具体参数以授权 API 确认为准。 | 服务端保管令牌，限制范围/条数/超时、传递上游错误；不得把网页抓取当稳定数据接口。 |
| 请求/响应模型 | 后端 Pydantic 验证 bbox、时间、气体、分页；响应记录含上游 ID、气体、点/源类型、经纬度和坐标系、观测 UTC、发布时间、值与原单位、不确定性/质量、传感器/产品、来源链接、检索时间。 | 保留 `observedAt`、`publishedAt`、`fetchedAt` 三种时间；未知值为 `null`，不补零、不推断秒级实时。建议返回 `{code,message,data:{items,source,query,fetchedAt,cacheStatus}}`。 |
| 前端 service | 在 `frontend/src/api/` 增加观测类型和请求函数，复用已有 Axios `/api`；GIS 组件只持有本次查询状态。 | `loading/success-empty/error/stale-cache` 分开显示。失败时不得调用 `frontend/src/mock/server.ts` 或 `frontend/src/stores/data.ts` 的示例数据。 |
| GIS 图层 | 在 `frontend/src/views/GisView.vue` 复用当前地图与图层组，新增默认关闭的“外部遥感观测”点图层、时间窗/气体筛选、点击详情和来源说明；保留原林地、热力图、GBA 模式。 | 点位坐标先按官方 CRS/经纬顺序校验；视觉尺寸不表示排放扩散半径。详情显示离散观测、质量及位置不确定性，不映射为企业违规或核算结果。 |
| 缓存降级 | 仅在许可证允许时服务端短期缓存，按区域、气体、时间和分页键隔离；可标记缓存获得时间和是否过期。 | 上游异常：合法且未过期缓存可明确标“缓存”；否则显式错误/空状态。无结果不等于无排放。禁止回退模拟观测。 |

## 不需修改的现有功能

不改 `backend/app/db.py` 数据表、认证、因子、碳排放公式、报表计算、用户上传数据、主页 3D 地球、数据大厅、现有 GBA 阈值及 Leaflet 地图库；不触碰 ECS、Nginx、生产数据库。若后续实测表明缓存须持久化或权限需变化，应另立阶段评估，不能在 S1 顺手加入。

## 预期验收与软著边界

- 单元/契约检查：合法和非法 bbox、时间窗、气体、限流、上游空结果、超时、字段缺失、分页、质量过滤、缓存命中/过期；确认无密钥回传。
- 局部浏览器检查：GIS 原三模式不回归；新图层点位/时间/详情/来源/空状态/移动端/底图偏移；确保不显示虚构记录。再执行前端构建和后端定向测试。
- 建证据清单：实际 API 响应样本（脱敏）、许可文本/确认、第三方依赖许可证、数据出处、字段映射、UI 截图、测试结果、AI 辅助开发记录。外部观测与开源组件不能归为自有原创源码；不通过改名或删除注释“降低 AI 率”。
- 当前只读验证：`vue-tsc --noEmit` 通过；碳价定向前后端测试各 3/3 通过；`git diff --check` 通过。没有 Carbon Mapper 集成可供测试。
- 决策：**S0 报告可以提交审核；S1 不自动开始**。先解决许可、账户/API 覆盖、坐标与数据用途问题，并确认工作区基线。建议 tag `pre-carbon-mapper-s0-20261019`、开发分支 `feat/carbon-mapper-observations`，当前存在未跟踪文档，本轮不创建。
