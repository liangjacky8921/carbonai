# CarbonAI V6.2 M4 空间视觉决策

日期：2026-10-13（Asia/Shanghai）  
结论：**V6.2 不引入 TresJS、Three.js 或新的 WebGL 场景，继续使用现有 CSS 极光与 SVG 空间关系图。**

## 核验范围

- 当前公开首页使用 2 层 CSS 极光和 1 个抽象等高线 SVG；浏览器实际 DOM 中为 0 个 `canvas`、3 个 `svg`。
- 等高线标题明确写明“抽象空间关系示意图，不代表实际监测数据”，不会被理解为实时监测结果。
- 数据大屏已经包含 6 个 ECharts `canvas`，其中“粤港澳大湾区 11 城碳排放对比（3D）”使用现有 ECharts GL。
- GIS 页面继续使用现有 Leaflet 业务地图；M4 没有修改地图图层、分析模型、数据或交互。

## 候选方案比较

| 方案 | 视觉收益 | 首屏与运行成本 | 业务含义 | 维护范围 | 决策 |
|---|---|---|---|---|---|
| TresJS 抽象地球 | 可增加旋转空间感，但与现有等高线图表达重复 | 新增 Three.js、TresJS 运行时、WebGL 上下文和动画循环 | 只能作为装饰示意 | 需处理懒加载、上下文丢失、页面隐藏、减少动画、销毁和 Vite 编译配置 | 不采用 |
| 直接使用 Three.js | 可精确控制场景 | 仍需完整 Three.js 依赖和自行维护渲染生命周期 | 同样没有新增业务信息 | 维护成本高于当前 SVG | 不采用 |
| 当前 CSS + SVG | 已形成 Aurora Carbon 与 Spatial Intelligence 的组合 | 首页 0 WebGL，无新增依赖 | 明确标注为示意，可直接通向真实 GIS 模块 | 浏览器原生能力，现有清理与降级已覆盖 | 保留 |

## 依赖与许可证证据

- 2026-10-13 通过 npm 元数据核验：`@tresjs/core` 最新为 5.9.3，MIT，包解包大小 134,779 字节；直接依赖 Radashi、VueUse、Vue DevTools API 和 pointer events，并要求 Three.js 作为 peer dependency。
- 同日 npm 元数据中的 `three` 最新为 0.186.1，MIT，包解包大小 20,443,256 字节。解包大小不是浏览器传输体积；未安装候选包，因此没有编造 tree-shaking 后的构建增量。
- [TresJS 官方安装文档](https://docs.tresjs.org/getting-started/installation)要求现有 Vue 项目同时安装 `@tresjs/core` 与 `three`，并把 `templateCompilerOptions` 合并进 Vite Vue 插件配置。
- [TresJS 官方许可证](https://github.com/Tresjs/tres/blob/main/LICENSE)为 MIT。许可允许使用，但许可兼容不等于需要引入。
- 当前 `npm ls @tresjs/core three @vueuse/core --depth=0` 为空；`package.json`、`package-lock.json` 和 `vite.config.ts` 均未因 M4 修改。

## 取消理由

1. 新场景不会增加核算、空间分析或数据溯源信息，只会重复现有首页空间隐喻。
2. 用户要求首页只有一个标志性视觉；现有极光已经承担该角色，叠加旋转地球会削弱排版主次。
3. 进入 SPA 后，已加载的 Three.js 模块仍会留在模块缓存中；随后访问含 ECharts GL 的 Dashboard 会增加同一会话的图形运行时代码与资源压力。
4. M4 决策时，M5 尚未完成移动设备节流、GPU、页面隐藏和路由往返压力验收，因此不在验收前扩大 WebGL 范围。
5. 当前 CSS/SVG 具备静态回退、减少动画适配和清楚的示意标记，已经满足 M4 的空间视觉目标。

## 后续复评门槛

只有出现需要交互式三维表达的真实产品需求时才重新评估，例如已授权的全球/区域空间数据需要旋转、拾取或时间轴展示。届时须同时满足：

- 独立异步路由块，不进入业务页首屏公共包。
- 桌面端按能力和可见性懒加载；移动端、WebGL 不可用及减少动画模式使用静态 SVG。
- 页面隐藏、离屏和路由卸载时停止渲染，并释放 renderer、场景、材质、纹理、监听器和 WebGL context。
- 不与 GIS 路由的地图渲染同时持续运行。
- 在引入前后记录实际 gzip、LCP、长任务、内存和掉帧证据，并通过 M5 回归。
- 画面继续标注为视觉示意，不表达未经授权的实时监测数据。

## M4 验收结果

M4 作为决策门完成：没有安装候选依赖，没有修改运行时代码，没有改变生产或本地功能。现有首页保留 CSS 极光、SVG 等高线和明确示意说明；M5 可直接在最终候选代码上进行性能与质量验收。
