# CarbonAI PC 黑屏整改进度：P0-1 项目状态恢复

> 2026-10-15（Asia/Shanghai）。本阶段只核对状态与文件位置；未修改业务代码、构建或部署。

## 故障现状

- 用户提供的 Windows Chrome 截图显示首页只有深黑绿色背景；用户报告手机端正常、Console 无明显错误且 Vue 根节点已挂载。
- 上述用户电脑上的具体 CSS、DOM 可见性和网络请求尚未在本阶段复核；原因未确认。上一轮排查见 [`pc-access-incident.md`](./pc-access-incident.md)。

## Git 与发布状态

- 分支：`main`；最新提交：`9bb6c21 feat: complete immersive homepage storytelling`。
- 最近提交依次为 `9bb6c21`、`1a91308`、`156decc`、`620c555`、`6f58c6c`。
- `git status --short` 仅显示未跟踪的 `docs/deployment/`（包含上一轮事故记录和本文件）；没有已跟踪文件的未提交修改。本轮保留这些文档。
- `docs/home-immersive/progress.md` 仍写“生产部署：未执行”，这是部署前的历史记录；2026-10-14 已将 `9bb6c21` 推送并发布至 ECS，当前 P0 排查不得以该旧字段判断生产状态。
- 仓库根目录、父项目目录、`frontend/` 与 `docs/` 范围内未发现 `AGENTS.md`。

## S1–S6 实际完成情况

| 阶段 | 当前源码/记录状态 |
| --- | --- |
| S1 | 六场景结构已写入 `LandingPage.vue`，地球、第二屏、数据链路、GIS、产品展示、结尾 CTA 均被组合。 |
| S2 | `LandingCapabilities.vue` 的绿色流动线与响应式样式已写入。 |
| S3 | `LandingProvenance.vue` 的五节点可交互静态链路与等值线背景已写入；S3-B 连线绘制/光点时序未完成，S3-C 独立浏览器验收未完成。 |
| S4 | `LandingSpatial.vue` 的 GIS 真实预览与布局已写入；S4-B/C 专项背景、局部动效和验收未完成。 |
| S5 | `LandingProduct.vue` 的真实数据大厅预览、CSS 透视入场和三项标注已写入；S5-C 独立浏览器验收未完成。 |
| S6 | `LandingClosing.vue` 的结尾轨道 CTA 已写入并通过此前构建；S6-B/C/D 尚未执行。 |

以上“已写入”表示当前源码存在，不表示本次 PC 黑屏问题已修复或各阶段生产浏览器验收通过。

## 关键文件位置

- 路由与入口：`frontend/src/router/index.ts`、`frontend/src/views/HomeView.vue`、`frontend/src/main.ts`。
- 首页组合与可见性：`frontend/src/components/landing/LandingPage.vue`、`frontend/src/composables/useLandingStory.ts`。
- 六场景：`LandingHero.vue`、`LandingCapabilities.vue`、`LandingProvenance.vue`、`LandingSpatial.vue`、`LandingProduct.vue`、`LandingClosing.vue`，均在 `frontend/src/components/landing/`。
- 地球/WebGL：同目录的 `PointCloudGlobe.vue`、`globeThree.ts`；氛围层为 `AuroraBackdrop.vue`。当前运行依赖是 `three`，未发现 TresJS。
- 主题 CSS：`frontend/src/styles/theme.css`、`frontend/src/styles/tailwind.css`；`frontend/src/main.ts` 引入两者及 Element Plus 暗色变量。
- 当前 `frontend/package.json` 和锁文件未列出 GSAP、TresJS、Lenis；首页阶段记录也表明未安装这些运行库。当前可见性和揭示主要由 `useLandingStory.ts`、CSS 与 `IntersectionObserver` 处理。

## 构建与浏览器测试环境

- 前端目录：`frontend/`；完整构建命令为 `npm run build`，实际执行 `vue-tsc --noEmit && vite build`；快速构建为 `npm run build:fast`。
- `frontend/node_modules` 存在，Windows Chrome 可执行文件位于 `C:\Program Files\Google\Chrome\Application\chrome.exe`。
- 本轮检查中 `playwright-cli` 未解析到命令；仓库根目录及 `frontend/node_modules` 未发现 `playwright`/`playwright-core` 包。已有浏览器脚本在 `docs/home-immersive/evidence/s0-capture.cjs`、`s0-performance.cjs`，需有可解析的 Playwright 包才能直接运行。
- 本阶段未运行构建或浏览器测试；下一阶段应先在受影响 PC 的实际页面检查六个 Section 的 DOM、计算样式和可见性状态，再确定最小修复。

## P0-2 自动化复现（2026-10-15）

### 方法与证据

- 将官方 `playwright@1.64.1` 临时装入系统临时目录，未修改项目依赖；使用本机 Chrome 155、现有首页测试方式检查生产 `https://www.carbontool.cn/`。
- 只生成三张首屏截图：[1440×900](./evidence/p0-2-pc-1440.png)、[1280×800](./evidence/p0-2-pc-1280.png)、[390×844 手机模拟](./evidence/p0-2-mobile-sim-390.png)。结构化数据在 [`p0-2-results.json`](./evidence/p0-2-results.json)，可复跑脚本在 [`p0-2-capture.cjs`](./evidence/p0-2-capture.cjs)。
- 生产环境已复现，无需启动本地构建对比。本次未修改业务代码或部署，也未进行性能测试；手机模拟不代表真实手机验收。

### 三视口比较

| 项目 | PC 1440×900 | PC 1280×800 | 手机模拟 390×844 |
| --- | --- | --- | --- |
| 截图 | 全屏深色，内容不可见 | 全屏深色，内容不可见 | Header、Hero、CTA 可见 |
| Vue `#app` | 已挂载，文本长度 1888 | 已挂载，文本长度 1888 | 已挂载，文本长度 1788 |
| 首页根 `.landing-page.story-enhanced` | `opacity: 0`，`transform: translateY(12px)` | `opacity: 0`，`transform: translateY(12px)` | `opacity: .82`，`transform: translateY(14px) scale(.985)` |
| Header / Hero 实际尺寸 | 1440×96 / 1440×720 | 1280×96 / 1280×720 | 384×79 / 384×768 |
| 六个 Section | 均在 DOM 中且高度大于 0 | 均在 DOM 中且高度大于 0 | 均在 DOM 中且高度大于 0 |
| Hero 标题自身 | `opacity: 1`，正常尺寸 | `opacity: 1`，正常尺寸 | `opacity: 1`，正常尺寸 |
| 地球 Canvas | 1 | 1 | 0，使用静态后备 |
| Console / pageerror / 失败 JS、CSS | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |

命中测试在 PC 上指向 Hero/标题元素，未发现有独立的可点击全屏遮挡层。若干 Aurora 装饰层覆盖较大区域，但其 `pointer-events: none`，且不是这次黑屏的直接原因。页面根节点透明会让所有正常尺寸的子元素一起消失。

### 已确认的根因

- `frontend/src/components/landing/LandingProduct.vue` 中以 `:global(.story-enhanced)` 开头的局部样式，预期只控制尚未入场的产品预览和标注；Vite 产出的 `HomeView-CBvkCfSr.css` 却包含独立的 `.story-enhanced{opacity:0;transform:translate3d(0,12px,0)}`，直接作用于首页根节点。
- 同一产物还有 `.story-enhanced{opacity:.7;...}`、`.story-enhanced{opacity:.82;transform:translate3d(0,14px,0) scale(.985)}`；后者位于 `max-width:600px` 媒体规则，解释手机模拟没有全黑。
- `LandingClosing.vue` 中同类 `:global(.story-enhanced)` 写法也被编译成宽泛的 `.story-enhanced{opacity:0;...}`。这是 Vue scoped CSS 选择器边界错误，属于**已确认的前端 CSS 故障**，不需要借助 WebGL、API 或服务器故障解释。

### P0-3 最小修复入口（本阶段不执行）

只修正 `LandingProduct.vue`、`LandingClosing.vue` 中误作用于根节点的选择器，使规则明确匹配目标章节或子元素；构建后检查产物不再出现带 `opacity`/`transform` 的裸 `.story-enhanced` 规则，并在上述三视口复测截图与根节点计算样式。生产发布与 GitHub 推送需另按用户指令执行。

## P0-3 首页可见性与动画逻辑诊断（2026-10-15）

本阶段只复核 P0-2 浏览器结果、相关 Vue/CSS 和当前生产构建产物，未运行新截图、构建或部署。

| 检查项 | 位置与实际证据 | 判断 |
| --- | --- | --- |
| `opacity: 0` | `LandingProduct.vue:91` 的 `:global(.story-enhanced) ... .feature-callouts li` 在生产 CSS 中成为裸 `.story-enhanced{opacity:0;transform:translate3d(0,12px,0)}`；P0-2 两个 PC 视口根节点计算 `opacity:0` | **直接根因**。根节点及全部子内容被透明化，JavaScript 无需报错 |
| 其他异常 transform | `LandingProduct.vue:71,100` 的同类规则在生产 CSS 中将裸 `.story-enhanced` 设为透视缩放或移动端 `.985` 缩放；P0-2 PC 根节点位移 12px，390px 根节点为 `.82` 透明度和 `.985` 缩放 | 同一选择器边界错误；移动端媒体规则覆盖 PC 的透明度，解释手机模拟可见 |
| `LandingClosing.vue` | `:global(.story-enhanced)` 开头的轨道规则在产物中也成为裸 `.story-enhanced{opacity:0;...}` | 同类高风险样式，最小修复应一并限定到结尾章节的轨道元素 |
| `visibility:hidden` / `display:none` | `LandingStoryProgress.vue` 仅隐藏导航提示、≤1180px 隐藏侧轨；`LandingPage.vue` 切换桌面/移动导航；`AuroraBackdrop.vue` ≤600px 隐藏指针光斑 | 作用于局部元素，P0-2 Header/Hero/六 Section 均存在且有正常尺寸，不是黑屏原因 |
| z-index / 全屏遮罩 | Hero 装饰层与 Aurora 占较大面积，但 Aurora `pointer-events:none`；P0-2 命中测试能命中 Hero 标题或内容，未见独立全屏遮罩 | 不是本次根因 |
| GSAP `set/from/fromTo`、ScrollTrigger | `frontend/package.json` 和锁文件无 GSAP；本次相关首页组件与 composable 未使用这些 API | 不存在相应初始隐藏、触发或刷新问题 |
| Lenis 滚动同步 | 依赖与首页代码均无 Lenis；`useLandingStory.ts` 使用原生滚动与 `IntersectionObserver` | 不存在 Lenis/ScrollTrigger 同步问题 |
| 卸载清理 | `useLandingStory.ts` 在 `onBeforeUnmount` 断开两个 observer 并移除监听；`AuroraBackdrop.vue` 取消指针帧并移除监听；`PointCloudGlobe.vue` 断开 observer、取消计时/帧并释放 Three.js 场景 | 未发现残留 GSAP Timeline；这些清理逻辑不是当前首屏黑屏的触发条件 |

另有 `LandingPage.vue` 的 `[data-story-reveal]` 子项初始 `opacity:0`，由进入视口后加 `is-story-visible` 恢复；P0-2 首屏 Hero 标题自身 `opacity:1`，所以该正常入场机制不能解释 PC 全屏消失。

**最小修改建议（未执行）：** 将 `LandingProduct.vue` 与 `LandingClosing.vue` 中以 `:global(.story-enhanced)` 开头的规则改为明确限定父级 `.story-enhanced` 与目标章节/子元素的选择器；构建后检查无裸 `.story-enhanced` 的 `opacity`、`transform`、轨道样式，再复测 PC 1440/1280 和 390px。P0-3 到此停止。

## P0-4 3D 地球渲染诊断（2026-10-15）

仅查看 `PointCloudGlobe.vue`、`globeThree.ts` 和 P0-2 证据，并在本地现有 `dist` 的 Vite 预览中做一次隔离对照。测试结束后已停止预览进程；未编辑或禁用源码中的地球组件，未改生产环境。

| 检查项 | 证据与判断 |
| --- | --- |
| 初始化 | 当前实现直接按需导入 `three`，未使用 TresJS；WebGL 支持检查通过后才创建 `WebGLRenderer`，DPR 上限桌面 1.5、窄屏 1.25。 |
| WebGL 上下文 | 本地 Chrome 155 的正常模式中地球为 `is-ready`、Canvas 1、上下文 `isContextLost() === false`，无 pageerror/console error。P0-2 生产两个 PC 视口也各有 Canvas 1。 |
| 正文遮挡 | `globe-visual` 为局部 Hero 图形且 `pointer-events:none`；Hero 内容层 z-index 2、视觉层 z-index 0。P0-2 命中测试可触及标题/正文；地球不是全屏覆盖层。 |
| GPU/全页影响 | 未取得硬件 GPU 占用数据，不能判断长期负载；但本地正常及无 WebGL 模式的首页根节点均为 `opacity:0`，所以地球渲染不构成此次整页黑屏的必要条件。 |
| `requestAnimationFrame` | 组件通过单个 `frame` 句柄避免并发调度，`tick` 每次只继续排一帧；暂停、离屏、页面隐藏或减少动画时会停止。一次本地 headless Chrome 观察到正常模式 2 秒内约 291 次全页 rAF 回调，无 WebGL 模式为 0；该计数包含页面所有 rAF，不等同于 GPU 帧率或异常循环。 |
| 清理 | `onBeforeUnmount` 清除延时初始化、两个 observer、媒体/页面/指针监听，`disposeScene` 取消帧并释放几何、材质和 WebGLRenderer，主动释放上下文。源码未见遗留定时器或重复初始化路径。 |
| 静态后备 | 本地仅通过测试页的 `getContext` 覆盖模拟 WebGL 不可用：地球为 `is-static`、Canvas 0、SVG 后备计算透明度 `.78`、无页面错误；源码未变。生产手机模拟在 P0-2 中也为 Canvas 0、后备图存在。 |

**结论：** 当前地球能正常初始化并可安全降级；禁用 WebGL 后正文仍然不可见，已确认的根因仍是 P0-2/P0-3 的裸 `.story-enhanced` CSS 规则。P0 修复应优先修正这些选择器，不删除或重写地球。地球的长期 GPU/帧率可另作性能验收，不作为本次黑屏的推断依据。P0-4 到此停止。

## P0-5 前端部署与缓存诊断（2026-10-15）

本阶段只读取生产响应、现有构建产物和 ECS 上的部署配置；未清缓存、改 Nginx、重启服务或重新部署。

| 检查项 | 证据与判断 |
| --- | --- |
| HTML 与资源引用 | 桌面和手机 User-Agent 获取的 `https://www.carbontool.cn/` HTML SHA-256 均为 `358ceb4d…e8e5e`，与本地 `frontend/dist/index.html`、ECS `/opt/carbonai/frontend/dist/index.html` 相同；都引用 `index-CJ-1VuJW.js`、`element-DfMMHSJP.js`、`index-CAQTBdEu.css`。`carbontool.cn` 与 `www.carbontool.cn` 均返回 200 HTML。 |
| 哈希与静态文件 | 上述三项及首页按需加载的 `HomeView-BaA-Vms_.js`、`HomeView-CBvkCfSr.css` 均返回 200，JS 为 `application/javascript`、CSS 为 `text/css`。五项公开响应的 SHA-256 均与本地 `frontend/dist/assets/` 对应文件一致；首页 JS 和 CSS 的 ECS 文件哈希也一致。未发现新旧资源混用。 |
| 首页缓存 | `/` 与 `/index.html` 均返回 `Cache-Control: no-cache, no-store, must-revalidate`；带哈希静态资源返回 7 天缓存。当前公开响应与本地产物一致，不能用缓存解释本次自动化复现的 PC 黑屏。 |
| Service Worker | 前端源码、入口、公共目录和依赖配置中未找到注册或 PWA/Workbox 配置；部署目录无常见 SW 文件，`/sw.js` 和 `/service-worker.js` 返回 404。无法远程读取受影响用户既有 Chrome 配置，因此不能排除其个人浏览器曾由旧版本注册过 SW，但本次干净浏览器环境也能复现黑屏。 |
| SPA fallback | 已授权 SSH 只读查看 Nginx：`root /opt/carbonai/frontend/dist`，扩展名为 JS/CSS 的资源由静态资源规则处理；请求不存在的 `nonexistent-p0-5.js` 返回 404，而非 200 SPA HTML。`location /` 的 `try_files $uri $uri/ /index.html` 用于应用路由。 |
| 部署版本 | 当前本地分支 `main` 为 `9bb6c21`；生产 HTML 与五个关键资源的字节级哈希均匹配该工作树保留的 `frontend/dist`。但 ECS `/opt/carbonai` 源码仓库 HEAD 为较旧的 `08af901` 且含后端本地改动，故**不能用服务器 Git HEAD 代表已发布前端版本**；服务器静态目录也无可核验的 commit 元数据。 |
| PC/手机差异 | 两种 User-Agent 得到相同 HTML 和资源路径；P0-2 干净浏览器三视口无失败 JS/CSS，桌面根节点 `opacity:0`、390px 媒体规则覆盖为 `.82`。差异来自响应式 CSS，不需要假设两端使用不同缓存或资源版本。真实手机的个人缓存状态仍待设备侧验证。 |

**故障归类：动画/CSS（已确认）。** 最可能且足以解释现象的根因是 `LandingProduct.vue` 与 `LandingClosing.vue` 的 `:global(.story-enhanced)` scoped 样式编译成裸 `.story-enhanced` 规则，使桌面首页根节点透明；手机断点覆盖该透明度。P0-4 已排除 WebGL 是黑屏的必要条件；本阶段未发现资源缓存、静态文件缺失、MIME 或 Nginx fallback 故障。服务器源码 HEAD 与静态部署分离是版本追踪缺口，但目前没有证据表明它造成此次黑屏。下一步只需按 P0-3 建议限定 CSS 选择器，构建并复测，另行决定是否发布。

## P1 最小修复与本地验证（2026-10-15）

- 仅修改 `frontend/src/components/landing/LandingProduct.vue` 和 `LandingClosing.vue`：将以 `:global(.story-enhanced)` 开头的局部样式改为完整的全局复合选择器，明确限定到第五屏预览/标注及第六屏轨道元素；保留原来的样式值和入场设计。未修改首页根组件、地球、业务逻辑、后端或依赖。
- 完整构建 `frontend/npm run build` 一次通过（含 `vue-tsc --noEmit`）。检查新 `HomeView-CZHpapzu.css`：已不存在含 `opacity` 或 `transform` 的裸 `.story-enhanced { … }` 规则；相关规则均以 `.story-enhanced .product…` 或 `.story-enhanced .closing…` 开头。
- 本地 Vite 预览 + Chrome 目标验证：1440×900 桌面及 390×844 手机模拟均为根节点 `opacity:1`、`visibility:visible`、`transform:none`，Hero 标题 `opacity:1`，六个章节存在，未捕获页面错误或 Console error。手机模拟不等于真实手机验证。测试后已停止本地预览。
- 当前生产环境仍运行旧版，PC 黑屏在生产上尚未修复。本轮未提交、推送或部署。
- **回滚方法：** 发布前若需撤回本地修复，仅将上述两个 Vue 文件恢复到 Git `9bb6c21` 版本并重新构建；不要回退或清除 `docs/deployment/` 事故记录。若未来发布后需回滚，先保全服务器当前前端静态目录，再恢复已记录的上一版前端静态包，且不碰 ECS 后端；具体发布/回滚应另行授权执行。

## P2 双端回归（2026-10-15）

使用 P1 已构建的本地 `frontend/dist`，通过 Vite preview 与 Chrome/Playwright 检查。每个视口只保存一张首屏截图：[PC 1440×900](./evidence/p2-pc-1440.png)、[PC 1280×800](./evidence/p2-pc-1280.png)、[手机模拟 390×844](./evidence/p2-mobile-sim-390.png)；详细机器结果见 [`p2-results.json`](./evidence/p2-results.json)。已停止本地预览。手机模拟不代表真实手机。

| 项目 | PC 1440 / 1280 | 手机模拟 390 | 结论 |
| --- | --- | --- | --- |
| 首页 Header、标题、主 CTA | 均可见，根节点 `opacity:1`、`visibility:visible`，截图无黑屏 | 同样可见 | 通过 |
| 地球 | 两个 PC 视口均为 `is-ready`、Canvas 1 | 按设计使用静态后备，Canvas 0 | 通过 |
| WebGL 不可用 | 额外在 1440 视口阻止 WebGL 上下文创建：静态图 `opacity:.78`、Canvas 0、首页根节点仍为 `opacity:1` | — | 通过；未额外截图 |
| S1–S6 | 六章节均存在，逐节滚动时均进入视口且样式可见；无横向溢出 | 同样通过 | 通过 |
| 锚点、路由、刷新 | “了解平台能力”到 `#capabilities` 且目标入视口；主 CTA 到 `/dashboard`；返回首页刷新后根节点仍 `opacity:1` | 同样通过 | 通过 |
| 动画 | 地球可渲染、章节随滚动进入；首页未安装或使用 GSAP、Lenis | 静态地球按设计降级 | GSAP/Lenis 不适用；未测帧率 |
| Console / 请求 | 无 `pageerror` 或阻断首页的错误；三个视口均有一条 `/api/health` 404 | 同左 | 本地 preview 不代理 API；见下文 |
| 后端连接 | 生产 `https://www.carbontool.cn/api/health` 独立返回 HTTP 200、`status:ok`；本地 preview 的 `/api/health` 返回 404，前端按现有逻辑回退模拟模式 | 同左 | 生产 API 存活；修复版与 ECS 的端到端连接未测 |

**本轮失败/限制：** 本地 preview 没有 `/api` 代理，因此路由到工作台虽成功，不能把本地数据请求与 ECS 联通视为通过。这条 404 是预览环境差异，不是造成首页黑屏的阻断错误；最小验证建议是在具备 API 代理的预发或经批准发布后检查工作台真实 API 请求。真实手机、受影响 PC 的个人浏览器缓存、生产新版本均未测试。本轮没有修改业务代码，也未推送或部署；P2 到此停止。

## P4 经批准的生产发布（2026-10-15）

用户明确批准后，仅将 P1 前端构建切换到 ECS `/opt/carbonai/frontend/dist`；发布前核实原版入口哈希未变化，完整备份至 `/opt/carbonai/releases/frontend-dist-20261015-203128-pre-pc-fix`。新入口哈希为 `da229c78307cd201773a5eb220f0752f15de38374b66cb2681ccc7d45d5eb06e`，公网一致；旧哈希静态资源在新目录中保留。未改 FastAPI、数据库、Nginx 配置或后端服务，也未推送 GitHub。

生产 Chrome/Playwright 的 PC 1440×900、1280×800、手机模拟 390×844 均显示首页，六屏滚动、锚点、工作台路由和刷新通过，无阻断性 Console/pageerror；两 PC 视口的地球资源加载后为 Canvas 1，禁用 WebGL 则静态后备可见，登录页可打开。生产浏览器进入工作台后 `/api/health` 返回 200；公网两域名首页和新 JS/CSS 均为 200、MIME 正确。详见 [`pc-black-screen-p4-release.md`](./pc-black-screen-p4-release.md) 和 [`p4-production-results.json`](./evidence/p4-production-results.json)。真实手机及用户原 Windows PC 个人浏览器仍待人工复核。
