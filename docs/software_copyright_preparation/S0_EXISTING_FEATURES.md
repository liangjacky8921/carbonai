# S0 现有功能清单

仅记录代码直接证明存在的能力。“存在页面/代码”不等于线上数据、权限或完整流程已验收。日期：2026-10-19。

| 功能 | 代码证据 | 确认范围与限制 |
| --- | --- | --- |
| 首页与导航 | `frontend/src/router/index.ts:4-41` 定义首页和工作台路由；`frontend/src/views/HomeView.vue`、`frontend/src/layouts/MainLayout.vue` 提供展示与导航。 | 已确认入口和跳转代码，未在 S0 做浏览器逐屏验收。 |
| 登录与身份 | `frontend/src/views/auth/LoginView.vue:26`、`frontend/src/stores/auth.ts`、`backend/app/routers/auth.py` 支持登录/注册/令牌；`frontend/src/router/index.ts:39,44-58` 仅给 AI 页面设置 `requireAuth`。 | 前端 API 离线时可进入本地演示身份模式（`frontend/src/api/client.ts`、`frontend/src/mock/server.ts`）；不能把它描述为服务端认证。其他工作台页面当前未由同一前端守卫拦截。 |
| 数据大厅 | `frontend/src/views/DashboardView.vue:1-141,171-176,484-510` 展示指标、图表、时间/部门筛选与市场参考；`frontend/src/components/ChartCard.vue:6-11,51-53` 展示来源和更新时间。 | 排放指标使用前端示例或用户数据；不存在已证实的全站实时企业监测。市场曲线经逐条状态过滤。 |
| GIS | `frontend/src/views/GisView.vue:237-245,495-545` 有 Leaflet、高德底图、排放点热力图、GBA 城市圆标和林地估算模式。 | 内置城市/排放点与示例数据必须保留标签。`:57`“外部卫星观测”仍为预留，尚无 Carbon Mapper 图层。 |
| 碳核算 | `frontend/src/views/AccountingView.vue` 有活动数据录入/上传和结果界面；`frontend/src/stores/data.ts:222-290` 保存导入数据；`backend/app/routers/business.py` 设排放上传计算接口；`backend/app/factors.py` 提供因子。 | 存在实现，但本次未独立复算或验证因子授权、适用边界。 |
| 排放因子 | `frontend/src/views/FactorLibView.vue:79-83` 调用后端并有本地静态因子回退；`frontend/src/data/carbonMarket.ts` 和 `backend/app/factors.py` 分别含静态数据。 | 版本/来源及离线回退需逐条核对，不能把静态表自动视为官方现行因子。 |
| 报告与导出 | `frontend/src/views/ReportView.vue:1-177` 提供草稿与客户端导出；`backend/app/routers/business.py:207-302` 有 PDF 生成接口。 | 代码存在导出路径；报告文案表明是草稿/参考，不等同审定或法定报送。 |
| 来源、更新时间与异常 | `frontend/src/stores/data.ts:29-82` 标记 `sample/user`；`frontend/src/components/ChartCard.vue` 显示来源和时间；`frontend/src/api/client.ts:11-64` 做健康探测/错误包装；`frontend/src/views/DashboardView.vue:225-227` 说明行情参考状态。 | 部分回退可能仅在局部显示；见风险登记。API 响应时间不应冒充行情发布时间。 |

其他路由如网格、污水、土壤、碳资产、产品足迹等可由 `frontend/src/router/index.ts:20-39` 证明页面入口存在，**本次没有逐项核验其功能与数据**，故不列为已验收功能。前述碳价单元测试（前后端各 3 项）通过；其他页面未执行 S0 自动化功能测试。

本文件仅可作为软著准备时的内部核查起点。需由申请人对实际开发、权属、第三方许可和提交版本独立确认；不得把页面截图、外部数据或 AI 辅助代码直接推定为自有原创。

## 本阶段记录

- 实际修改：仅四份 S0 审计文档；无业务代码修改。
- 技术决策：按“代码存在 / 已测试 / 未验证”分层，不从网站文案扩展功能。
- 检查结果：`vue-tsc --noEmit` 通过；碳价前后端定向测试各 3/3 通过；完整端到端、权限及生产数据未测。
- 风险与下一阶段：见 `S0_RISK_REGISTER.md`；S1 仍需通过许可、数据和负责人验收门。
