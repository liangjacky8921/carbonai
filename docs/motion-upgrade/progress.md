# CarbonAI V6.2 Motion Upgrade 进度

更新：2026-10-13（Asia/Shanghai）。

## 当前阶段

**M0–M6 已完成，ECS 生产发布与验收通过。** 业务平台版本仍为 V6.0。

## M6 动态视觉升格与 ECS 发布

- 首页 Aurora 增加低亮度空间网格和桌面指针光场；移动端关闭指针响应，减少动画时静止。
- 使用现有 Vue/CSS 实现，没有新增运行依赖，也没有引入新的 WebGL 场景。
- `npm run build` 通过，2,971 个模块，15.38 秒；M5 全量回归复跑 15/15 通过。
- ECS 前端已发布到 `/opt/carbonai/frontend/dist`，旧版保存在 `/opt/carbonai/releases/frontend-dist-20261013-132106`。
- 后端 `carbonai-api` 保持 active，没有重启；Nginx 配置未修改且语法检查通过。
- 生产域名只读验收 5/5 通过：首页新动效、暂停控制、Dashboard/API、GIS 底图、减少动画；0 控制台错误、0 失败响应。
- 详见 [m6-ecs-release.md](./m6-ecs-release.md) 与 `docs/motion-upgrade/evidence/m6-production-*`。

## M5 性能与质量验收

- `npm run build` 通过，包含 `vue-tsc --noEmit`；本轮实测 46.26 秒。M5 没有修改产品运行时代码或新增依赖。
- Playwright 正式预览回归 15/15 通过：1440、1280、375 三档首页，6 段滚动叙事，动效暂停/离屏/页面隐藏，Dashboard、GIS、路由往返、减少动画和 WebGL 不可用。
- 首页首次本地样本：LCP 444 ms、CLS 0、传输 486,395 B；loopback、无网络/CPU 节流，不能视为生产 Core Web Vitals。
- Dashboard 样本：LCP 396 ms、CLS 0；图表初始化记录 2 个 long task，最长 217 ms，列为后续性能优化点。
- 2 秒首页 RAF 诊断：289 次回调、平均 6.94 ms、最大 10.7 ms、无大于 34 ms 的间隔。该数据不是 GPU FPS。
- INP、真实 CPU 百分比、GPU 内存、生产网络表现和长期内存趋势未测，没有声明达标。
- 意外 HTTP 失败为 0。本地后端未启动产生 8 次 `/api/health` 404；GIS 路由离开时取消 22 个外部底图瓦片请求，均已与应用回归结果分开记录。
- 完整结论见 [m5-quality-report.md](./m5-quality-report.md)；结构化结果、可重复脚本和截图见 `docs/motion-upgrade/evidence/`。
- 人工复核首页桌面/手机、Dashboard、GIS 和减少动画截图，未见遮挡、横向溢出、图表缺失或控件不可操作。

## M4 可选空间视觉评估

- 完成 TresJS、Three.js、现有 CSS/SVG 与当前图形运行时的对照评估；结论为 V6.2 不引入新的 WebGL 场景。
- npm 核验 `@tresjs/core` 5.9.3 和 `three` 0.186.1 均为 MIT；TresJS 还会带入 VueUse、Radashi、DevTools API、pointer events，并要求调整 Vite Vue 编译配置。
- 浏览器实际核对：首页为 0 canvas、3 SVG、2 层 CSS 极光；Dashboard 已有 6 个 ECharts canvas 和 1 个 ECharts GL 3D 图表。
- 新增抽象地球只会重复现有空间隐喻，不增加核算、GIS 或数据溯源信息，同时扩大首屏、GPU 和生命周期管理范围。
- 保留现有 Aurora Carbon 首页、SVG 空间关系示意和 Executive Carbon 工作台。没有安装依赖、修改锁文件、改动运行时代码或创建未经证实的监测可视化。
- 决策证据、比较矩阵和未来复评门槛见 [m4-spatial-decision.md](./m4-spatial-decision.md)；候选资源版本与许可证已同步到 [resources.md](./resources.md)。

### M4 检查

- `npm ls @tresjs/core three @vueuse/core --depth=0` 为空。
- `package.json`、`package-lock.json`、`vite.config.ts` 无 M4 diff；新增运行依赖为 0。
- M4 只更新决策与许可证记录，运行时代码与 M3 最终构建完全相同，因此没有重复执行构建或声明新的性能结果。

## M3 专业 SaaS 工作台微交互

- 审计确认全局卡片、按钮、表单、弹窗、Toast、空状态和侧栏已经具备基础反馈，本阶段没有叠加全站持续动效。
- 数据大屏行情滚动新增可键盘操作的暂停/继续按钮；桌面指针悬停时临时暂停，`prefers-reduced-motion` 下自动静止，解决持续超过 5 秒的内容缺少控制问题。
- KPI 数字通过 `MotionNumber.vue` 在真实当前值之间插值，最终值始终来自现有数据 Store；减少动画时直接显示最终值。4 个 KPI 共享 Dashboard 的单一媒体查询监听。
- 6 个 Dashboard 图表在异步数据准备期间使用现有 `ChartCard` 骨架状态；内容挂载后再初始化 ECharts，避免加载阶段出现空白卡片或对未挂载容器初始化。
- ECharts 实例继续复用，系统动效偏好变化时只更新 `animation` 选项，没有销毁或重建图表实例。
- 行情接口失败时保留已有静态快照路径；没有改变 API 地址、数据含义或核算逻辑。
- 侧栏受限模块的 Emoji 锁标记替换为现有 Element Plus 图标；折叠按钮补充 `aria-controls`。错误 Toast 使用 `alert`，其余状态维持 `status`。

### M3 修改文件

- `frontend/src/composables/useReducedMotion.ts`
- `frontend/src/components/MotionNumber.vue`
- `frontend/src/views/DashboardView.vue`
- `frontend/src/layouts/MainLayout.vue`
- `frontend/src/components/ToastHost.vue`

### M3 构建与检查

- 最终 `npm run build` 通过，包含 `vue-tsc --noEmit`；2,971 模块，20.94 秒。
- Dashboard 异步块：JS 12.92 kB / gzip 5.57 kB，CSS 3.46 kB / gzip 1.09 kB；相对 M2 增加约 1.74 kB / gzip 0.73 kB 和 1.13 kB / gzip 0.25 kB。
- 主入口 JS 96.46 kB / gzip 38.53 kB，与 M2 基本一致；新增运行依赖为 0。
- 本地正式构建预览确认 1280px 数据大屏、KPI 最终值、6 个图表、侧栏和行情控制正常显示；暂停后按钮状态变为“继续行情滚动”且 `aria-pressed=true`。
- 本地业务后端未启动，页面沿用已有“离线降级（示例数据）”状态。构建期间旧页面曾因产物文件名更新记录动态模块 404；最终构建后已重新加载并正常显示。
- M5 再执行减少动画模拟、地图与图表刷新、路由压力、控制台净空和性能采样；本阶段不把源码分支覆盖当作完整浏览器回归结论。

## M2 高级滚动叙事

- 公开首页扩展为 6 个连续章节：首页首屏、平台能力、空间视角、核算路径、应用角色和进入平台。
- 新增 `useLandingStory.ts`，使用原生 `IntersectionObserver` 管理当前章节和一次性进入动效；离开首页时移除 observer、媒体查询监听与页面滚动类。
- 选择原生滚动，没有引入 Lenis。当前页面为正常文档流，只需锚点定位和章节显现；新增平滑滚动循环、触控适配与依赖体积没有足够收益。
- 桌面宽屏提供可点击的章节进度轨道；1,181–1,540px 收为编号刻度，避免压住内容；1,180px 以下隐藏，保留页面内链接和正常滚动。
- `prefers-reduced-motion` 下取消平滑滚动与章节位移，直接显示最终内容。无 `IntersectionObserver` 时也直接展示内容。
- 核算路径文案已对照现有 `AccountingView`、`FactorLibView` 和 `ReportView`：仅描述上传活动数据、因子匹配、核算明细/低置信提示及报告衔接，并明确实际边界、因子版本与输出以业务配置为准。
- 应用角色只使用现有看板、核算和 GIS 能力，不新增客户、业绩、实时监测或数据授权声明。

### M2 修改文件

- `frontend/src/composables/useLandingStory.ts`
- `frontend/src/components/landing/LandingStoryProgress.vue`
- `frontend/src/components/landing/LandingProvenance.vue`
- `frontend/src/components/landing/LandingRoles.vue`
- `frontend/src/components/landing/LandingClosing.vue`
- `frontend/src/components/landing/LandingPage.vue`
- `frontend/src/components/landing/LandingHero.vue`
- `frontend/src/components/landing/LandingCapabilities.vue`
- `frontend/src/components/landing/LandingSpatial.vue`

### M2 构建与检查

- 最终 `npm run build` 通过，包含 `vue-tsc --noEmit`；2,968 模块，30.44 秒。
- 首页异步路由块：JS 12.71 kB / gzip 5.62 kB，CSS 17.36 kB / gzip 4.15 kB；相对 M1 分别增加 5.58 kB / gzip 2.11 kB 和 7.00 kB / gzip 1.38 kB。
- 主入口 JS 为 96.42 kB / gzip 38.51 kB，与 M1 基本一致；新增运行依赖为 0。
- 在本地正式构建预览中实际检查 1440×900 和 375×812：6 个章节均可访问，锚点定位有效，进入动效完成后内容可见，桌面章节刻度不遮挡内容，手机端保持单列且无章节浮层。
- `git diff --check` 通过。此阶段未运行 M5 的完整 Playwright、性能采样、地图与图表回归，也未生成新的性能结论。

## M1 正式首页接入

- `/` 已改为独立公开首页；原数据大屏继续使用 `/dashboard`，其余业务路由地址保持不变。
- 新增 `HomeView.vue` 以及 `components/landing/` 下的 LandingPage、LandingHero、LandingCapabilities、LandingSpatial、AuroraBackdrop、SpatialContour。
- 路由视图只负责组合；极光组件负责可见性、页面隐藏、减少动画监听和清理；暂停状态仅由 Hero 持有。
- 首页链接改为 Vue Router 命名路由，支持浏览器历史、刷新和直接访问。
- 首页初始加载不探测业务 API；第一次进入业务路由后执行一次后端健康探测。每次完整刷新会重新执行一次。
- 用户在浏览器批注中指出概念免责声明“不够严谨”。正式页已删除该段文字、`V6.2 视觉概念 · 本地预览` 和硬编码本地端口链接；页脚保留品牌、真实备案组件和返回顶部。
- 已删除 `motion-preview.html`、`vite.motion.config.ts`、`src/motion-preview/` 与生成的 `dist-motion/`。M0 截图及测试 JSON 作为真实阶段证据保留。
- 空间 SVG 继续明确标注“空间关系示意图”，无监测数据含义；首页文案只描述现有模块，不新增业绩、客户或实时能力声明。

### M1 构建与浏览器回归

- 最终 `npm run build` 通过，包含 vue-tsc；2,958 模块，25.02 秒。
- 首页异步路由块：JS 7.13 kB / gzip 3.51 kB，CSS 10.36 kB / gzip 2.77 kB。
- 主入口 JS 从 M0 基线 96.11 kB / gzip 38.38 kB 变为 96.43 kB / gzip 38.52 kB；首页仍共享全局 Element Plus 和基础 CSS，完整首屏传输成本留到 M5 测量。
- Playwright 在 1440、1280、375px 下通过：无横向溢出，标题与 H1 正确，概念免责声明不存在。
- 暂停/播放、减少动画、键盘跳转链接、首页无 API 请求、进入 Dashboard、直接访问 GIS、返回首页均通过。
- 首页控制台错误 0。业务预览未启动 FastAPI，访问 Dashboard 和直接刷新 GIS 时各记录一次 `/api/health` 404，符合本地测试条件。
- 证据：[桌面截图](./evidence/m1-home-1440.png)、[手机截图](./evidence/m1-home-375.png)、[结果 JSON](./evidence/m1-home-check.json)、[复测脚本](./evidence/m1-home-check.cjs)。

先读取本文件再开始下一阶段。审计与三种方案评分见 [audit.md](./audit.md)，资源和许可证见 [resources.md](./resources.md)。

## M0 修改文件（历史记录）

- `.gitignore`：排除概念构建输出及 Playwright 临时记录。
- `frontend/motion-preview.html`：独立、本地、noindex 展示入口。
- `frontend/vite.motion.config.ts`：独立 Vue 构建配置，绑定 127.0.0.1；不加载业务代理或手动分包。
- `frontend/src/motion-preview/main.ts`：只挂载概念组件。
- `frontend/src/motion-preview/MotionPreview.vue`：首屏、能力条目、GIS 展示组合与暂停操作。
- `frontend/src/motion-preview/AuroraBackdrop.vue`：自研 CSS 极光、静态纹理、隐藏/离屏/减少动画监听及释放。
- `frontend/src/motion-preview/SpatialContour.vue`：静态 SVG 地形示意。
- `docs/motion-upgrade/`：审计、来源、进度、真实截图和可重复运行的初测脚本/JSON。

package.json、锁文件、正式入口、主题、业务路由、API、后端和生产配置未修改。新增依赖为 0；没有复制第三方视觉组件。

## M0 概念验证记录

M0 的独立概念入口已在 M1 完成后删除。当前本地正式构建预览：[首页](http://127.0.0.1:4173/)、[V6.0 工作台](http://127.0.0.1:4173/dashboard)。重启命令，在 frontend 目录执行：

```powershell
npm run build
npx --no-install vite preview --host 127.0.0.1 --port 4173 --strictPort
```

本地业务工作台未启动 FastAPI；其健康探测 404 已记入测试结果，不计入首页错误。

## 构建与初测

- 基线 `npm run build` 通过，包含 vue-tsc：2,939 模块，27.93 秒；原正式主 JS/CSS 与 V6.0 资产标识一致。
- 新增源码后 `vue-tsc --noEmit` 通过；独立概念生产构建 19 模块，0.99 秒。
- Vite 报告概念 JS 69.82 kB（gzip 28.52 kB），CSS 9.03 kB（gzip 2.68 kB），HTML 0.61 kB（gzip 0.40 kB）。它是独立页面总资源，不能与正式应用主 JS 单文件直接比较；正式入口没有引用概念模块，新增正式运行依赖为 0。
- 文件字节复核：JS 70,635 字节 / gzip 28,523 字节，CSS 9,030 / gzip 2,676，HTML 618 / gzip 397；Vite 显示长度与包含中文字符的实际字节数有差异，以字节复核为准。
- 使用已缓存 Playwright CLI 0.1.22 和 Playwright 包，未重新安装或下载工具。Chromium 154.0.8037.98；本机 loopback、无网络/CPU 节流、每视口一个样本。首视口为新上下文，后续视口可能使用缓存。
- 最新样本 LCP：1440px 344ms、1280px 36ms、375px 68ms；CLS 均为 0。初次检查曾出现 83ms 长任务，最新首屏仍有 75ms 长任务，记录保留在 JSON；M5 需重复采样和移动设备节流。
- 3 秒 RAF 采样 432 帧，平均间隔约 6.95ms，最大 17.4ms，没有大于 34ms 的样本。这是回调节奏，不等于 GPU 呈现 FPS。
- Chromium TaskDuration 增量 0.178 秒；JS heap 约 6.17MB。不是系统 CPU 百分比或总内存；GPU 内存、真实后台标签行为和 INP 未测。
- 通过：1440/1280/375 无横向溢出、暂停/播放、减少动画静态背景及禁用平滑滚动、离屏暂停、合成 visibilitychange 分支、跳转链接键盘焦点、锚点导航、禁用 WebGL、进入本地工作台。
- 概念页控制台错误 0、后端 API 请求 0；git diff --check 通过。
- 真正卸载后的 GPU/监听残留未进行仪器测量：源码已含监听解绑和 observer.disconnect，无 WebGL 或 RAF 动画循环；M5 再做完整生命周期压力检查。

这些是本地初测，不是生产 Core Web Vitals 达标结论。没有执行完整地图和图表业务回归。

## 证据

- [桌面 1440px](./evidence/concept-1440.png)、[桌面 1280px](./evidence/concept-1280.png)、[手机 375px](./evidence/concept-375.png)、[减少动画](./evidence/concept-reduced-motion.png)。桌面与手机截图已实际打开查看。
- [初测 JSON](./evidence/initial-check.json)、[可重复脚本](./evidence/initial-check.cjs)。脚本通过环境变量 CARBON_PLAYWRIGHT_PATH 指向已有 Playwright 包，不触发安装。

## 下一步

M0–M6 已完成并发布 ECS。后续如继续升级，先读取本文件与 M6 发布记录，并保留本次 ECS 回滚目录。
