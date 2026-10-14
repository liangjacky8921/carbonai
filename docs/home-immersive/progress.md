# CarbonAI Immersive Homepage V2 进度

> 更新日期：2026-10-14

## 当前阶段

- 阶段：S6-A Final CTA 视觉收官
- 状态：已完成
- 下一阶段：S6-B 六屏视觉衔接（本轮不启动）
- 生产部署：未执行

## S6-A 本轮完成（第六屏）

- 仅修改 `LandingClosing.vue`：将原有同心圆装饰升级为完整椭圆轨道、低亮度网格与两枚低速光点，不新增 Canvas、WebGL 或依赖。
- 标题更新为“从每一份数据开始，看见更清晰的碳管理未来。”；副标题只描述现有排放核算、GIS 与报告工作流。
- 主入口继续使用现有 `dashboard` 命名路由；次入口指向已存在的 `#capabilities` 锚点；保留账户功能登录提示。
- 轨道进入视口时一次性描绘，光点只在章节可见后运行；移动端轨道完整居中置底，避免偏移裁切与文案遮挡。
- `prefers-reduced-motion` 下停止光点移动、关闭轨道过渡并保留静态图形；按钮悬停位移同步关闭。
- 2026-10-14 本轮仅执行一次 `npm run build`：`vue-tsc --noEmit` 与 Vite 均通过，2987 个模块，Vite 构建 27.38 秒。
- 首页产物：JS 30.54 kB（gzip 12.40 kB），CSS 42.94 kB（gzip 8.99 kB）。
- `git diff --check` 通过；CTA 路由、锚点、轨道动画和 reduced-motion 规则完成静态核对。
- 浏览器环境此前无法解析 Playwright CLI/模块，本轮未循环重试；CTA 实机截图与 390px 布局留待 S6-D 集中验收。
- 未提交、推送或生产部署。

## S5 恢复状态

- S5-A 与 S5-B 已完成。
- 工作区已有 S5-C 三项功能标注与移动端样式，并已包含在本轮成功构建中；其独立进度收尾与浏览器验收因上轮中断尚未完成。本轮仅记录，未继续修改第五屏。

## S5-B 本轮完成（第五屏）

- 仅修改 `LandingProduct.vue`，复用首页现有 `IntersectionObserver` 生成的 `is-story-visible` 状态；未修改共享滚动逻辑。
- 数据大厅预览进入视口时由 94% 缩放、5° X 轴倾斜、轻微下移和较低透明度平滑恢复为正面清晰状态；动画一次触发后保持最终状态。
- 仅使用 CSS `transform` 与 `opacity`，未安装 GSAP、VueUse 或新增运行时监听器，因此没有额外 Timeline、ScrollTrigger 或事件清理负担。
- 600px 以下降级为 98.5% 缩放和 14px 位移，不使用透视倾斜；`prefers-reduced-motion` 下直接显示静态正面并关闭过渡。
- 2026-10-14 本轮仅执行一次 `npm run build`：`vue-tsc --noEmit` 与 Vite 均通过，2987 个模块，Vite 构建 35.63 秒。
- 首页产物：JS 29.25 kB（gzip 11.99 kB），CSS 39.14 kB（gzip 8.34 kB）；JS 体积未增加。
- `git diff --check` 通过，局部选择器、移动端降级与 reduced-motion 规则静态检查通过。
- 浏览器环境此前无法解析 Playwright CLI/模块，本轮未循环重试；实际滚动时序与截图仍待环境可用后验证。
- 未修改真实数据大厅、S1–S4、ECS、API 或数据；未提交、推送或生产部署。

## S5-A 本轮完成（第五屏）

- 仅修改 `LandingProduct.vue`：建立 CARBON INTELLIGENCE 标题区、大尺寸数据大厅预览、浏览器式深色外框、来源图注与数据大厅 CTA。
- 复用当前版本本地生成的 `dashboard-preview.webp`（67.47 kB），明确标注 2026-10-14 本地截图及演示数据；未使用外部参考图替代产品界面。
- 展示说明依据当前 `DashboardView.vue`：排放统计、碳市场趋势、区域对比与异常指标；入口继续使用现有 `dashboard` 命名路由。
- 图片保持 WebP、固定宽高、懒加载与异步解码；移动端移除居中地址栏并将说明和 CTA 纵向排列。
- 未新增 GSAP、VueUse 或其他依赖；未修改数据大厅内部功能、API、后端或数据。
- 2026-10-14 本轮仅执行一次 `npm run build`：`vue-tsc --noEmit` 与 Vite 均通过，2987 个模块，Vite 构建 16.87 秒。
- 首页产物：JS 29.25 kB（gzip 11.99 kB），CSS 38.49 kB（gzip 8.21 kB）。
- 浏览器环境此前已确认无法解析 Playwright CLI/模块，本轮未循环重试；桌面第五屏截图、390px 布局及 reduced-motion 实机检查留待环境可用后验证。
- S5-B 透视揭示与 S5-C 功能标注尚未开始；未提交、推送或生产部署。

## S4 恢复状态

- S4-A 已完成；S4-B 与 S4-C 尚未开始。本轮未修改第四屏。

## S4-A 本轮完成（第四屏）

- 仅修改 `LandingSpatial.vue`：采用左侧约 40% 文字与能力说明、右侧约 60% 真实 GIS 工作台预览的布局。
- 标题更新为“让环境与碳数据拥有空间坐标。”，入口继续使用现有 `gis` 命名路由。
- 能力说明依据当前 `GisView.vue`：林地边界与碳汇、排放点位热力图、GBA 区域城市视图。
- 复用 `gis-preview.webp`，明确标注本地截图和示例数据；增加现有三种分析模式标签及非数据型坐标装饰。
- 900px 以下切换为上下布局，600px 以下收拢预览工具栏与图注；未修改 GIS 地图逻辑、坐标系、API 或数据。
- 未新增依赖；未引入第二套 GIS 引擎、Canvas 或 WebGL。
- 2026-10-14 本轮仅执行一次 `npm run build`：`vue-tsc --noEmit` 与 Vite 均通过，2987 个模块，Vite 构建 17.67 秒。
- 首页产物：JS 28.66 kB（gzip 11.83 kB），CSS 36.76 kB（gzip 7.90 kB）。
- 浏览器环境此前已确认无法解析 Playwright CLI/模块，本轮未循环重试；桌面局部截图和 390px 实机布局留待环境可用后验证。
- 未提交、推送或部署生产环境。

## S3 恢复状态

- S3-A 已完成。
- S3-B 路径绘制、光点移动与节点顺序激活尚未开始。
- 工作区存在上一轮已写入并已通过构建的 S3-C 第三屏等值线背景改动，但局部浏览器验收与进度收尾未完成；本轮仅记录，未补做或改动 S3。

## S3-A 本轮完成（第三屏）

- 仅修改 `LandingProvenance.vue`：将第三屏整理为左侧标题说明、右侧五节点数据链路与同步业务说明区。
- 五个节点为数据采集、数据校验、排放核算、GIS 时空分析、预警与报告；文案沿用现有功能边界。
- 节点支持鼠标点击、键盘 Tab 聚焦及原生 Enter/Space 激活，说明区使用 `aria-live` 同步当前步骤。
- 桌面采用横向细线链路，390px 等窄屏切换为竖向链路；已提供清晰焦点样式及 reduced-motion 静态规则。
- 项目未安装 GSAP 运行库或官方 GSAP Skills；S3-A 使用 Vue、CSS 与内联 SVG 图标即可完成，因此未新增依赖。
- 2026-10-14 本轮仅执行一次 `npm run build`：`vue-tsc --noEmit` 与 Vite 均通过，2987 个模块，Vite 构建 16.00 秒。
- 首页产物：JS 26.50 kB（gzip 10.95 kB），CSS 34.40 kB（gzip 7.47 kB）。
- 浏览器环境仍无法解析 Playwright CLI/模块，按要求未重复尝试；桌面截图、390px 布局和交互实机验证留待环境可用后完成。
- S3-B 的路径绘制、光点移动与顺序激活尚未开始；未提交、推送或生产部署。

## S2 本轮完成（第二屏）

- 仅修改 `LandingCapabilities.vue`：在现有低亮度绿色 SVG Flowing Lines 上补充深黑基底、微弱空间网格、局部柔光、两侧消散与标题碳绿色强调，使第二屏衔接首屏地球视觉。
- 复用 Vue 与 CSS；未新增依赖、Canvas 或 WebGL。
- 移动端减少一半线条并降低透明度；`prefers-reduced-motion` 下停止线流与漂移动画。
- 标题与正文复用现有 IntersectionObserver 分层渐入，未增加动画初始化逻辑。
- 未修改 3D 地球、其他章节、后端或路由。
- 2026-10-14 本轮仅执行一次 `npm run build`：`vue-tsc --noEmit` 与 Vite 均通过，2986 个模块，Vite 构建 15.41 秒。
- 首页产物：JS 25.68 kB（gzip 10.36 kB），CSS 31.53 kB（gzip 6.82 kB）。
- 桌面与 390px 截图验证未完成：当前环境无法解析已安装 Playwright CLI 或 Node 模块；按要求未下载依赖、未继续重试。移动端布局、横向裁剪与 reduced-motion 已在组件 CSS 中实现，仍待可用浏览器环境复核。
- 未进行全站截图、性能审计、提交、推送或生产部署。

## S1 已完成

- 首页已整理为 6 个场景：3D Earth、Carbon Manifesto、Data Intelligence、Spatial Intelligence、CarbonAI Product、Final CTA。
- 保留原有点云地球实现；未修改 `PointCloudGlobe.vue` 与 `globeThree.ts`，未增加第二个 WebGL 场景。
- 新增产品界面场景，并使用当前本地工作台与 GIS 页面截图；截图明确标注演示/示例数据。
- Applications 与 Roles 合并到产品场景，同时保留旧锚点，桌面与移动目录同步为 6 项。
- 本轮未新增依赖，未安装或引入新的动画框架。

## S1 修改范围

- 已修改 7 个现有首页组件：`LandingPage.vue`、`LandingCapabilities.vue`、`LandingProvenance.vue`、`LandingSpatial.vue`、`LandingApplications.vue`、`LandingRoles.vue`、`LandingClosing.vue`。
- 新增 `LandingProduct.vue`。
- 新增两张首页只读预览资源：`dashboard-preview.webp`、`gis-preview.webp`。
- Git 当前实际涉及 8 个首页组件，并非 3 个；保留此前已形成的完整 S1 差异，没有重新设计或扩大范围。

## S1 静态检查与构建

- 2026-10-14 执行一次 `npm run build`，通过。
- `vue-tsc --noEmit` 通过，未发现 Vue/TypeScript 语法或类型错误。
- Vite 生产构建通过：2986 个模块，耗时 26.40 秒。
- 首页产物：JS 24.43 kB（gzip 9.95 kB），CSS 29.16 kB（gzip 6.34 kB）。
- `git diff --check` 通过；仅有 Git 提示工作区行尾未来可能由 LF 转换为 CRLF，不影响构建。

## S1 遗留事项

- 场景专属流动线、地形网格与数据流背景属于 S2，本轮只记录，未继续扩展。
- 分词入场与跨场景时间线属于 S3，本轮未实现。
- 本地截图页面在本地预览时使用演示/示例数据，不作为生产实时数据证明。
- 尚未提交、推送或部署生产环境。

## S0 已完成

- 核对当前分支、依赖、首页组合结构、7 个 Section、点云地球、Aurora、滚动叙事逻辑和主题 Token。
- 确认仓库内不存在 `AGENTS.md` 与 `SITE_CONTEXT.md`。
- 用本地当前构建完成 1440×900 与 390×844 的逐 Section 截图，共 14 张。
- 浏览器结果：两种视口均无横向溢出、控制台错误 0、失败请求 0；桌面 Canvas 1，手机 Canvas 0。
- 记录本地冷浏览器性能基线和当前首页相关构建块体积。
- 核验 GSAP、nxui、Spark UI 的用途、栈兼容性和许可证，S0 未安装任何依赖。
- 形成 7 个现有章节到 6 个叙事场景的映射与 S1–S4 实施计划。

## 本轮新增文件

- `docs/home-immersive/audit.md`
- `docs/home-immersive/progress.md`
- `docs/home-immersive/evidence/s0-capture.cjs`
- `docs/home-immersive/evidence/s0-performance.cjs`
- `docs/home-immersive/evidence/s0-page-inventory.json`
- `docs/home-immersive/evidence/s0-performance.json`
- `docs/home-immersive/evidence/s0-desktop-1440-*.png`
- `docs/home-immersive/evidence/s0-mobile-390-*.png`
- `docs/home-immersive/evidence/s0-*-contact-sheet.jpg`

## 关键决策

- 保留 `PointCloudGlobe.vue` 与 `globeThree.ts` 的现有实现，不让滚动动画控制 WebGL。
- Hero 以下以 CSS/SVG 建立空间背景，不增加第二个 Canvas。
- S1 不安装 GSAP、nxui、Spark UI、Lenis 或 TresJS。
- Applications 与 Roles 在 Scene 05 中合并展示，但保留全部真实模块入口和文案语义。
- 产品与 GIS 视觉只使用当前平台生成的真实截图或隔离只读预览。

## 风险

- Scene 数量从 7 调整为 6 时，需要同步处理旧锚点、顶部导航、移动目录和右侧进度轨道。
- 当前页面统一 reveal 逻辑会与场景专属动画重叠，S1/S3 需逐步拆分并确保无 JavaScript 时内容仍可见。
- 本地发现 222ms 和 58ms 两次长任务；新增动画必须用相同环境复测，避免扩大主线程阻塞。
- 当前 `@vueuse/core` 只是间接依赖；如后续决定使用，必须改为直接依赖并记录原因。

## 下一阶段入口

开始 S1 前先读取本文件与 `audit.md`。只调整首页内容结构、场景顺序和必要样式骨架，不重写地球，不安装动画库，不部署。
