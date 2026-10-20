# S0 风险登记

日期：2026-10-19。P0 阻止外部数据接入；P1 在实施前明确方案；P2 随后核验。以下区分**代码事实**与**尚未验证的线上影响**。

| ID / 优先级 | 证据、判断与影响 | S0 后处理 |
| --- | --- | --- |
| R01 / P0 | [Carbon Mapper 数据页](https://carbonmapper.org/data)称 API 集成需注册；[使用条款](https://carbonmapper.org/terms)默认非商业使用并规定署名/再分发边界。CarbonAI 对外网站及可能 SaaS 用途不能凭“公开”推定可用。 | 负责人确认运营/展示/再分发场景，取得对应许可及账户权限；未确认前只做架构设计。 |
| R02 / P0 | [Carbon Mapper 产品指南](https://carbonmapper.org/articles/product-guide)区分离散 plume/source 观测、观测与发布时间、速率及不确定性；`frontend/src/views/GisView.vue:57` 尚无实接入。若并入企业碳核算或称“实时监测”将误导。 | 单独图层和专用详情；原单位、时间、质量、来源完整保留，不参与核算总量。 |
| R03 / P1 | `backend/app/routers/business.py:372-406` 仍保留固定 `priceSeries`（1–6 月与后续预测）和静态报价；`:497-543` 的实时抓取失败时行情摘要可能回退快照。`frontend/src/utils/carbonPriceChart.ts:1-98` 已按每条记录的状态/时间过滤，前后端定向测试各 3/3 通过；当前图表 `undefined` 问题**未由本次检查复现**。 | 保留已修复图表逻辑；下一轮单独核验摘要静态回退是否足够醒目标注，不把 API 响应时刻当市场成交时刻。 |
| R04 / 已通过代码核验 | `frontend/src/views/GisView.vue:524-545` 的 GBA `L.circleMarker` 半径红 24、黄 16、绿 9 px，直径 48/32/18 px；阈值保持原有 4000/2500；图例 `:44-53` 说明大小仅表示分级。 | 现有代码符合红大黄中绿小；S0 未做本轮浏览器视觉复验，勿据此声称全部地图交互已测试。 |
| R05 / P1 | `frontend/src/api/client.ts:11-64` 健康探测失败会切到 `frontend/src/mock/server.ts` 的本地演示认证；`frontend/src/views/auth/LoginView.vue:26` 有提示。前端探测时机和不同页面提示不一，可能让离线/演示数据被误认线上服务。 | 接入观测时禁止回退到模拟点位；API 错误显式为空状态。另核对登录演示模式的 UX 与安全边界。 |
| R06 / P1 | `frontend/src/stores/data.ts:29-82` 初始 `source` 为 `sample`，又从本地存储恢复用户上传数据；刷新后来源状态可能不一致（代码推断，未运行复现）。`frontend/src/views/FactorLibView.vue:79-83` 另有静态因子回退。 | 实施前做来源状态针对性测试；严禁无提示地把静态/示例数据当实时观测。 |
| R07 / P1 | `frontend/src/data/carbonMarket.ts:39-62` GBA 城市排放数值为内置示例；`frontend/public/sample-data/` 含示例排放/点位。`backend/app/factors.py` 存静态因子，未取得逐条权属和版本证明。 | 建数据/因子来源台账，记录许可、版本、采集日期和脱敏；软著材料仅陈述可证明的权属。 |
| R08 / P1 | `frontend/src/views/GisView.vue:58` 已提醒外部经纬度与高德底图可能有叠加偏差；地图瓦片使用高德服务（`:240-245`）。 | 核对官方观测坐标系、经纬度顺序和显示偏移，记录转换方法与不确定性；不能直接假定 WGS84 点与底图精确对齐。 |
| R09 / P2 | `backend/app/db.py:29-47` 仅有认证 ORM，缺少企业/碳源/行政区/因子持久化模型；`frontend/public/sample-data/README.md` 的版本/部署描述与当前 `deploy/nginx-carbontool.conf` 不一致。 | 文档与实际版本、数据边界对齐；本阶段不为观测新增生产表。 |
| R10 / P1 | 当前 `main` 工作区已有未跟踪 `docs/carbon-mapper/`；没有现成基线 tag。 | 保留文件，不清理、不自动切分支；负责人审核文档后再标记基线。 |

## 审计边界与下一阶段

未检查生产环境变量、Carbon Mapper 项目账户/API 实际授权、中国目标范围覆盖、完整浏览器回归或第三方依赖逐项许可证。不能据此得出可商用、实时覆盖或软著可申报结论。只读静态检查和定向碳价测试通过；**S1 数据集成不得启动**，待 R01/R02/R08 的证据具备并经负责人验收。实际修改仅四份 S0 文档，未改业务代码。
