# CarbonAI V6.0 冻结前 UI-0 只读核验

核验日期：2026-10-21。范围：建议稿 `docs/ui-upgrade/codex-ui-copy-polish-20261020.md` 与当前本地代码；未检查线上页面，也未运行构建或浏览器测试。本报告只作分类，不代表批准修改或软著申报。

## 仓库状态与现有文件

- 分支：`feature/carbon-mapper-s4-readiness`；HEAD：`c31425802a1e1b8fa2d78b21f07e6696d41c08fa`。无已跟踪文件修改。有 5 个未跟踪文件：`docs/software_copyright_preparation/S1_MINIMAL_API_SAMPLE.json`、`S4_CODE_DIFFERENCE_REVIEW.md`、`S4_ISOLATED_PREVIEW_PLAN.md`、`S4_PRODUCTION_PROTECTION_AUDIT.md`，以及本次参考的建议稿；均未触碰。仓库根目录无 `AGENTS.md`。
- 建议稿涉及的 `frontend/src/components/landing/LandingHero.vue`、`LandingPage.vue`、`LandingCapabilities.vue`、`LandingProvenance.vue`、`LandingSpatial.vue`、`LandingProduct.vue`、`LandingClosing.vue`、`LandingStoryProgress.vue`、`frontend/src/layouts/MainLayout.vue`、`frontend/src/views/DashboardView.vue`、`GisView.vue`、`auth/LoginView.vue`、`frontend/src/components/gis/RemoteObservationPanel.vue` 与 `frontend/src/styles/theme.css` 均存在。
- 已完成，勿重复：`LandingHero.vue:17` 三行主标题已去句号（提交 `1be1335`）；`GisView.vue:15,121` 已标示用户/示例及 GBA 数据待核实；`DashboardView.vue:16,41,92` 已说明非实时和区域示例；`LandingSpatial.vue:32,37` 已使用本地 GIS 截图并标注示例数据。

## 安全修改

- 建议稿 T-04～T-07 的章节短标签与 `LandingPage.vue:15-22` 导航中文标签一致，仅改变展示文字；T-08～T-11 将截图的“演示数据”统一为“示例数据”、将“真实产品界面预览”表述为当前 GIS 工作台界面，且保留截图日期、示例性质。截图不应被称为实时画面。
- T-12～T-16 的局部标点调整及 T-24～T-26 的入口动词调整，前提是保留“离散观测、非实时、仅授权账户”等限定。此处“安全”指文案事实风险较低，仍未实际修改。

## 有条件修改

- T-01“每一步核算都有可查的数据来源”：`AccountingView.vue:5,72-77` 有逐条因子来源和低置信提示，但没有覆盖所有数据的完整来源/审计证据；只能限定为“当前记录的因子来源可查”。T-02“可逐项核对的界面”需限定为当前核算明细及其示例/上传数据。`ReportView.vue:3` 说明模板版本和数据更新时间未提供。
- T-17、T-20、T-22、T-23 涉及时间/位置、同一底图、同一份数据、模块跳转：`frontend/src/router/index.ts:24-35` 显示 GIS、轨迹、核算、报告为独立路由；`frontend/src/stores/data.ts:54-64,75-98` 显示各类数据源可分别为示例或用户数据。实施前逐句收窄到已存在的页面操作。
- CSS：建议稿 Step 1 改 `frontend/src/styles/theme.css:61` 的全局 `--radius-md` 会影响工作台与 GIS；Step 2 调整章节 `padding` 会改变视口触发位置。当前首页 `frontend/src/composables/useLandingStory.ts:71-106` 用 IntersectionObserver，`LandingPage.vue:102-110` 使用初始隐藏及揭示；不能按建议稿笼统称为 GSAP。Step 3 字号、Step 4 固定浮层毛玻璃、Step 5 过渡与按压反馈需逐视口检查文字换行、导航遮挡、减少动画偏好与揭示时序。`LandingPage.vue:223-240` 有移动目录及 reduced-motion 样式，`MainLayout.vue:262-265` 已有顶栏模糊；无需重复加。仅顶栏分割线 0.5→1px 相对局部，但也应核对布局。

## 暂缓

- T-03、T-21 的“建立可追溯的核算依据”“改动可回溯到具体记录”：目前只见浏览器本地数据源切换、核算明细和报告草稿，未核实跨模块审计日志/版本链；不可将其表述为已实现审计追溯。T-19 的“排放点位、轨迹与图层可在同一视图内逐项对照”与独立 `/gis`、`/trajectory` 路由不符。
- T-18 把“环境观测与碳数据标注到同一张地图”写成常态能力：`GisView.vue:49-59` 有遥感图层代码，但 `backend/app/carbon_mapper.py:32` 默认关闭；`docs/software_copyright_preparation/S4_RELEASE_READINESS.md:3,44` 对受控预览仍判 NO-GO。不得暗示遥感观测已向公众可用、连续实时或已完成许可验证。
- 建议稿的全局硬编码圆角替换、全站标点搜索替换及统一动画时长，范围过大且可能改变共享主题、移动排版和揭示可见性；冻结前不宜批量执行。
