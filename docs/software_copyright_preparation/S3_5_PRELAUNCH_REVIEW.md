# S3.5 — Carbon Mapper 上线前检查

审查日期：2026-10-20（北京时间）。结论：**CONDITIONAL GO，仅限继续本地隔离验证；不得公开启用或部署。**项目负责人说明当前为免费个人／高校学术展示，未来可能商业化。本报告据此评估当前用途；未把未来商业使用视为已获许可。

## 本阶段检查与依据

| 项目 | 证据和结论 |
| --- | --- |
| 官方 API | [当前 OpenAPI](https://api.carbonmapper.org/api/v1/openapi.json) 版本 `1.0.0`：`GET /api/v1/catalog/plumes/annotated` 为 `TokenUserOptionalScopedAuth`，支持 `bbox`、`plume_gas`、`datetime`、`limit/offset`、`status` 等；详情 `GET /api/v1/catalog/plume/{plume_id}` 为 `OptionalAuth`；两者的安全方案均定义为 HTTP Bearer。`/api/v1/docs` 是官方交互文档。官方[数据页](https://carbonmapper.org/data)要求开发者从数据门户注册开始。S1 的匿名 GET 200 和无效 Bearer 401 只说明当时技术可访问，不能确认本项目账户、Token 权限或调用配额。 |
| 当前许可 | [官方 Terms](https://carbonmapper.org/terms) 页面在本次核查时仍标为 **2026-01-13**。§3.1 允许在条款约束下展示和再分发；§3.2 限定非商业及温室气体减排、认知或政策目的；§3.3 要求清晰署名；§3.4 要求下游接收方遵守相同或实质相同的非商业、署名条件；§3.5 规定终止后停止使用并删除持有副本。数据页明确非商业研究等用途，商业使用应联系权利方。免费高校展示与此方向相符，但网站实际运营主体、收益和数据接收方条件仍需负责人书面确认。 |
| 数据语义 | [Terms §5.1](https://carbonmapper.org/terms) 指明测量为离散时间观测，可能存在时间覆盖空档，不能视为平均或连续排放。`RemoteObservationPanel.vue` 写明“离散羽流观测”和非连续实时监测；质量为 null 显示“未知（不可视为合格）”；排放率为 null 显示“暂无数据”。`GisView.vue` 不自动归因企业或换算年度排放。 |
| API Token | `backend/app/carbon_mapper.py:30-35,48-51` 只从服务端环境变量 `CARBON_MAPPER_API_KEY` 取值并写入上游 Bearer；路由返回结构不含 Token，异常处理不回传上游正文/请求头。`frontend/src`、`frontend/dist` 和前端环境示例中未发现该变量名；Git 未跟踪实际 `.env` 文件，`backend/.env`、`frontend/.env` 被忽略。当前工作区未发现真实 Token；无法仅凭代码证明历史 Git、服务器日志或外部监控从未保存过它。有效 Token 尚未联调。 |
| 再分发与署名 | 后端列表/详情作为本项目公开 API 返回 Carbon Mapper 数据，属于需要按条款管理的再分发。响应含来源、Terms URL 和英文非商业提示；前端详情有“来源：Carbon Mapper”链接及 Terms 链接。但列表接口的下游使用条件、网站级数据使用说明和学术引用尚未形成可验收的发布方案；仅放一条 Terms 链接不能证明 §3.4 已落实。未使用官方 Logo。 |
| 缓存 | 适配层无持久或内存数据缓存，响应标记 `cacheStatus=disabled`；S3 前端未持久化观测记录。但观测 GET 路由没有显式 `Cache-Control: no-store`，不能保证浏览器、代理或 CDN 不缓存。官方 Terms 未规定通用缓存期限，也不能据此推断永久保留权。上线前需确定 HTTP 缓存策略及许可终止时清除所有实际副本的操作。 |
| 访问限流 | 后端每进程 10 次／分钟、8 秒超时；上游 401/403、429、网络异常有错误映射。官方未公布可核实的固定 QPS。当前限制在多 worker／多实例之间不共享，也没有按用户／IP 的额度和滥用控制；公开启用前必须核对正式账户配额和服务容量。 |
| 商业化隔离 | 现有 `CARBON_MAPPER_ENABLED` 默认关闭，缺 Token 也拒绝访问，这是上线安全门；但它是全局开关，没有许可证版本、收费场景或用户群隔离。未来出现收费、广告、商业客户或付费数据服务前，须先关闭该图层及接口，重新取得适用许可或完成法律核查后再设计隔离。不得在商业产品中沿用本次非商业判断。 |
| 异常与原功能 | 图层默认关闭；请求失败、禁用、无数据各有提示，失败不回退示例观测；筛选、缩放、关闭和卸载会取消请求并清除标记。原有林地、碳源、GBA 图层代码仍在。S3 本地 1440×900 与 390×844 的局部交互已验证；没有做生产、真实手机或有效 Token 的全链路回归。 |

## 本次验证与改动

- 仅新增本报告；未修改业务代码、配置或环境变量。审阅文件：`backend/app/carbon_mapper.py`、`backend/app/routers/carbon_mapper.py`、`backend/app/main.py`、`backend/tests/test_carbon_mapper.py`、`frontend/src/api/carbonMapper.ts`、`frontend/src/components/gis/RemoteObservationPanel.vue`、`frontend/src/views/GisView.vue`，以及 S1.5/S2/S3 报告。
- 官方 OpenAPI 定向读取成功，确认两条端点的安全方案和参数；未进行新的观测数据抓取或有效 Token 请求。
- `backend/.venv/Scripts/python.exe -m unittest discover -s tests -p 'test_*.py' -q`：10/10 通过，覆盖默认关闭、空值、空结果、认证失败不回显密钥、上游错误及限流。`npm run build`：TypeScript/Vite 构建通过。`git diff --check`：通过。
- 代码搜索结果：前端源码与构建产物无 `CARBON_MAPPER_API_KEY`／`CARBON_MAPPER_ENABLED` 字符串；观测路由未设置明确的禁止缓存响应头。此检查不替代生产服务器、历史提交与日志审计。

## 公开启用前必须关闭的缺口

1. 项目负责人记录当前运营主体、免费／无收费数据服务、广告及商业客户情况，确认展示确为非商业并符合官方 Purpose；若不符合，先取得单独许可。
2. 通过官方数据门户取得并用有效 Token **在本地或预发**验证账户权限、返回字段和额度；核对官方是否有账户补充条款。不得将 Token 提交 Git 或前端。
3. 提供网站级 Carbon Mapper 署名、学术引用和下游非商业／署名条件说明，并审查公开 API 是否需要限制、增加使用条件或取消再分发。
4. 明确浏览器／代理／CDN 缓存策略、许可终止删除流程和正式配额；多 worker 或多实例上线前配置共享限流与滥用保护。
5. 使用有效 Token 完成桌面、移动、地图及原功能回归；确认质量字段的官方语义后才能考虑任何定量分析。真实手机和生产回归目前未验证。

**阶段决策：CONDITIONAL GO。** 可继续本地封闭验证和完善发布条件；不满足以上门槛前，`CARBON_MAPPER_ENABLED` 保持关闭，不公开启用、不部署。本阶段完成后停止。
