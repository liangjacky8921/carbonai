# CarbonAI Immersive Homepage V2 — S0 现状与逐屏审计

> 审计日期：2026-10-14  
> 基线提交：`1a91308`  
> 测试地址：`http://127.0.0.1:4173/`  
> 状态：S0 已完成；未修改首页代码、未安装依赖、未部署

## 1. 结论

现有首页的绿色点云地球已经是明确、稳定且技术边界完整的品牌核心，应原样保留其造型、渲染、暂停、降级和清理逻辑。问题主要出现在 Hero 之后：02、04、05、06 四屏都使用近似的深色平面、细线分隔、左侧标题和右侧纵向列表，章节之间缺少持续的空间线索，滚动节奏也主要依赖同一种 `opacity + translateY(18px)` 入场。

升级应集中在三个方面：

1. 用 CSS/SVG 让地球轨道、等值线、节点和地理网格延续到下方场景。
2. 将当前 7 个章节组织为 6 个叙事场景，同时保留现有业务入口与真实描述。
3. 让每个场景的动效服务于内容关系：宣言负责排版揭示，流程负责连线推进，GIS 负责图层切换，产品负责真实界面呈现。

不建议新增第二个 Canvas 或 WebGL 场景，也不建议在 S1 引入新的动画框架。

## 2. 仓库与运行基线

- 仓库内未找到 `AGENTS.md` 或 `SITE_CONTEXT.md`。
- 首页由 `LandingPage.vue` 组合 7 个独立 Section。
- 当前直接依赖包含 Vue 3.5.42、Vue Router 4.6.4、Three.js 0.186.1；未直接安装 GSAP、Lenis、TresJS、Vue Bits、nxui、Spark UI 或 motion-v。
- `@vueuse/core` 只作为间接依赖存在，首页源码没有使用它；不能把间接依赖视为项目已采用的稳定 API。
- 当前工作区开始审计时无未提交修改。

### 现有地球保护结论

`PointCloudGlobe.vue` 已具备以下机制，不应在 S1–S3 中重写：

- 动态加载 Three.js 与地理点数据。
- 桌面 DPR 上限 1.5；小屏 DPR 上限 1.25。
- 600px 以下及 `prefers-reduced-motion` 使用静态 SVG。
- 离开视口、页面隐藏、手动暂停时停止动画循环。
- 卸载时断开 Observer、事件监听并释放 geometry、material、renderer 和 WebGL context。
- WebGL 不可用或 context lost 时保留静态后备。

新增滚动效果不得操作地球的 camera、renderer、rotation 或 `requestAnimationFrame`。

## 3. 当前页面结构与六场景映射

| 当前章节 | 当前内容 | V2 场景映射 | 内容处理 |
| --- | --- | --- | --- |
| `overview` | Hero、点云地球、CTA | Scene 01 · 3D Earth | 保留，仅设计向下过渡 |
| `capabilities` | 核算、GIS、报告三项能力 | Scene 02 · Carbon Manifesto | 承接“让碳数据拥有空间维度”，三项能力缩为证据型索引 |
| `provenance` | 活动数据、因子、复核、报告 | Scene 03 · Data Intelligence | 调整到 Spatial 之前，改为可读的 SVG 数据路径 |
| `spatial` | GIS 文案、抽象等值线 | Scene 04 · Spatial Intelligence | 保留现有等值线，并加入真实 GIS 界面预览 |
| `applications` + `roles` | 环境模块与角色说明 | Scene 05 · CarbonAI Product | 合并为真实产品展示场景，全部模块入口继续保留 |
| `enter` | 最终 CTA | Scene 06 · Final CTA | 保留 CTA，强化与首屏轨道的视觉呼应 |

该映射减少视觉章节数量，但不删除任何业务路由或已有模块入口。旧锚点若调整，必须保留兼容跳转或同步更新顶部导航、移动目录和右侧章节轨道。

## 4. 逐屏审计

### Scene 01 / 当前 `overview`

- **标题与正文**：三行大标题与两行说明层级清楚，CTA 语义明确，登录提示已补全。
- **背景**：Aurora、网格、点云地球、轨道线和微粒构成全页最完整的空间语言。
- **视觉主体**：唯一 WebGL 地球，桌面 1 个 Canvas；390px 使用静态 SVG。
- **交互与动画**：地球自转、轻微指针视差、Aurora；统一暂停按钮有效。
- **留白**：桌面左右平衡良好；移动端地球退到文字后下方，不阻碍 CTA。
- **主要问题**：Hero 结束后直接用一条边线进入纯平面章节，地球的轨道和光线没有形成叙事接力。
- **性能风险**：Three.js 块 gzip 约 129.85 KB，地理点数据约 50.33 KB；不能再叠加一个持续渲染背景。
- **优先级**：P0，保护现有实现；P1，只增加轻量向下过渡。

截图：[桌面](evidence/s0-desktop-1440-overview.png) · [手机](evidence/s0-mobile-390-overview.png)

### Scene 02 / 当前 `capabilities`

- **标题与正文**：信息准确，但标题、介绍和三行能力更接近产品目录，没有形成宣言式停顿。
- **背景**：透明，完全继承统一深色底；无独立空间图形。
- **视觉主体**：三条横向链接列表。
- **交互与动画**：行 hover 横移；整屏仍使用通用子元素上浮。
- **留白**：桌面左右留白充足；手机端一屏约 865px，阅读顺畅。
- **视觉重复**：与 Applications、Provenance 和 Roles 都是“标题＋分隔线列表”。
- **升级方向**：作为 Carbon Manifesto，用不对称大字“让碳数据拥有空间维度。”建立第一次滚动停顿；三项现有能力保留为低调的事实索引。背景只使用一组低亮度 Flowing Lines 或地形等值线。
- **优先级**：P1，首个需要改造的 Hero 以下场景。

截图：[桌面](evidence/s0-desktop-1440-capabilities.png) · [手机](evidence/s0-mobile-390-capabilities.png)

### Scene 03 / 当前 `provenance`

- **标题与正文**：四步核算路径真实、克制，适合成为 Data Intelligence 主体。
- **背景**：透明，无流程视觉。
- **视觉主体**：右侧四条文字步骤。
- **交互与动画**：没有步骤状态；仅整屏通用进入动画。
- **留白**：桌面结构稳定；手机高度约 995px，是当前最长章节。
- **视觉重复**：再次使用细线纵向列表，步骤之间的因果关系只能靠编号理解。
- **升级方向**：使用语义化 `ol` 加 SVG 连线。建议真实流程表述为“整理/导入数据 → 校验范围与单位 → 匹配因子并核算 → 空间查看与报告衔接”；避免宣传自动采集或全平台实时预警。节点进入视口后一次性推进，减少动画时直接显示完成状态。
- **优先级**：P1，与 Scene 02 同批建立叙事骨架。

截图：[桌面](evidence/s0-desktop-1440-provenance.png) · [手机](evidence/s0-mobile-390-provenance.png)

### Scene 04 / 当前 `spatial`

- **标题与正文**：GIS 功能描述明确，已提示查看现有地图与数据来源。
- **背景**：当前唯一拥有独立线性渐变的中段章节。
- **视觉主体**：SVG 等值线、网格、中心节点；图形标题明确说明为示意图。
- **交互与动画**：只有文字链接和通用进入动画，空间图形静态。
- **留白**：桌面右侧图形尺度合适；手机为上下布局，信息没有遮挡。
- **主要问题**：已有空间语言与 Hero 相容，但图形和文字之间没有状态对应，也没有展示平台真实 GIS 页面。
- **升级方向**：保留 `SpatialContour`，将它变为背景或过渡层；前景加入由当前 `/gis` 生成并记录日期的真实界面截图或隔离只读预览。滚动只切换 2–3 组真实能力说明，不生成数据热力图。
- **优先级**：P1，作为品牌专业性的核心证据场景。

截图：[桌面](evidence/s0-desktop-1440-spatial.png) · [手机](evidence/s0-mobile-390-spatial.png)

### Scene 05 / 当前 `applications`

- **标题与正文**：网格、土壤、污水三个现有路由均有真实限定语。
- **背景**：透明，无产品界面或环境语义视觉。
- **视觉主体**：三条错位列表。
- **交互与动画**：hover 横移；通用进入动画。
- **留白**：错位宽度在桌面有节奏，900px 以下统一为全宽；手机无溢出。
- **视觉重复**：与 Capabilities 采用几乎相同的横向链接模式。
- **升级方向**：作为 Product 场景的功能索引，与真实数据大厅截图并置；入口仍链接现有模块。截图必须来自当前页面，不能使用参考图或模拟监测结果。
- **优先级**：P1。

截图：[桌面](evidence/s0-desktop-1440-applications.png) · [手机](evidence/s0-mobile-390-applications.png)

### Scene 05 / 当前 `roles`

- **标题与正文**：管理、核算、空间三类职责描述与产品实际模块一致。
- **背景**：透明，无角色或界面视觉。
- **视觉主体**：三条文字行。
- **交互与动画**：没有交互；通用进入动画。
- **留白**：桌面横向阅读稳定；移动端约 903px，连续文字较长。
- **视觉重复**：这是连续第四个依赖细线列表的章节，视觉辨识度最低。
- **升级方向**：并入 Product 场景，作为截图旁的三种阅读视角，不再独占一整屏；保留全部文案语义。
- **优先级**：P2，在合并产品场景时处理。

截图：[桌面](evidence/s0-desktop-1440-roles.png) · [手机](evidence/s0-mobile-390-roles.png)

### Scene 06 / 当前 `enter`

- **标题与正文**：CTA 清楚，分别进入工作台和 GIS。
- **背景**：深绿渐变和同心圆，已经尝试呼应空间主题。
- **视觉主体**：大标题、两个入口、右侧圆环。
- **交互与动画**：按钮 hover；整屏通用进入动画。
- **留白**：桌面稳定；手机圆环裁切受控且无横向溢出。
- **主要问题**：同心圆偏静态，和首屏地球轨道仍像两个独立装饰。
- **升级方向**：把圆环改为轻量 Orbital Accent，使用一次性线条显现；补充与 Hero 一致的账户提示，不加入持续粒子。
- **优先级**：P2。

截图：[桌面](evidence/s0-desktop-1440-enter.png) · [手机](evidence/s0-mobile-390-enter.png)

## 5. 跨屏问题

### P0

1. **保护地球渲染边界**：新背景仅用 CSS/SVG；不改 `PointCloudGlobe.vue` 和 `globeThree.ts`，不将滚动进度写入 WebGL。
2. **取消“一种 reveal 覆盖所有章节”**：当前 `useLandingStory` 给每个章节直接子元素统一添加上浮动画。V2 应保留无 JS 可见内容，并让各场景自行声明一次性动画语义。
3. **内容真实性**：流程只描述已存在的导入、校验、核算、GIS 查看和报告衔接；所有截图来自当前产品；所有抽象轨迹继续标注为概念示意。

### P1

1. **场景背景层次不足**：7 屏中只有 Spatial 与 Final CTA 有独立背景，四个主要中段章节几乎同底同构图。
2. **叙事顺序需要调整**：核算路径应移到 GIS 场景之前，形成“为什么 → 数据如何流动 → 空间如何理解 → 产品如何落地”。
3. **缺少真实产品证据**：当前首页没有工作台或 GIS 的真实界面截图，Hero 的成熟度无法延续到产品介绍。
4. **移动端篇幅偏长**：当前页面总高约 5,981px；合并 Applications 与 Roles 可减少重复标题和边线，而不是压缩正文可读性。

### P2

1. 小标题普遍为 10px，作为注释可保留，但在复杂背景上应提高对比度并避免继续缩小。
2. 章节编号目前既用于真实顺序，也用于装饰；改成 6 场景后需统一顶部导航、移动目录和右侧轨道。
3. Hero 以下多处 hover 使用相同横移反馈；后续应按“链接、节点、预览”分别设计反馈。

## 6. 浏览器与性能证据

### 截图覆盖

- 桌面 1440×900：7 个 Section 全部单独截图。
- 手机 390×844：7 个 Section 全部单独截图。
- 两种视口均为 7 个章节、无横向溢出、控制台错误 0、失败请求 0。
- 桌面总页高约 5,257px，Canvas 1；手机总页高约 5,981px，Canvas 0。

总览：[桌面联系表](evidence/s0-desktop-1440-contact-sheet.jpg) · [手机联系表](evidence/s0-mobile-390-contact-sheet.jpg) · [结构数据](evidence/s0-page-inventory.json)

### 本地性能基线

环境：本地 Vite Preview、系统 Chrome、1440×900、单个冷浏览器上下文。该数据只用于相同机器上的改造前后比较，不代表公网或真实用户指标。

| 指标 | S0 结果 |
| --- | ---: |
| DOMContentLoaded | 335.3ms |
| Load | 354.1ms |
| 本次资源传输 | 692,430 bytes / 11 个请求 |
| 实验室 LCP | 812ms |
| 实验室 CLS | 0 |
| Long Tasks | 222ms、58ms |
| INP | 未测；缺少有效交互样本 |

构建产物中，与首页直接相关的主要块：

- `HomeView` JS：约 9.35 KB gzip。
- `HomeView` CSS：约 5.72 KB gzip。
- Three.js 地球块：约 129.85 KB gzip。
- 地理点数据：约 50.33 KB gzip。
- Element Plus 共享块：约 373.00 KB gzip。

证据：[性能记录](evidence/s0-performance.json)。新增动效后需重点观察 222ms 长任务是否变长，以及首页 JS/CSS 和请求数增量。

## 7. 候选资源与许可证判断

| 资源 | 当前状态 | 兼容与许可证判断 | S0 决策 |
| --- | --- | --- | --- |
| Three.js | 已直接安装 0.186.1 | 当前地球已稳定使用 | 保留，不改造 |
| VueUse | 仅间接依赖 14.4.0 | 源码未使用，不应依赖传递安装 | S1 不使用 |
| GSAP | 未安装 | 官方当前包 3.15.0，可用于 Vue；软件采用 GSAP Standard “no charge” license，官方 Skills 仓库为 MIT | S1 不安装；S3 若确需跨场景 Timeline/ScrollTrigger，再单独评估并记录 |
| nxui | 未安装 | MIT；当前仓库面向 Nuxt 4、Tailwind 4、motion-v，完整引入会扩大依赖并与现有栈错位 | 不整库安装；仅参考 Threads/Floating Lines 的视觉机制，自研 CSS/SVG |
| Spark UI | 未安装 | MIT；Vue 3 copy-paste 组件，Animated Beam 依赖其样式与 motion 体系 | 不整库安装；Data Flow 使用项目内 SVG 实现 |
| Lenis | 未安装 | 当前原生锚点、焦点和触控滚动稳定 | 不引入 |
| TresJS | 未安装 | 当前唯一 Three.js 场景已直接管理生命周期 | 不引入 |

参考来源：

- GSAP package 与许可证：<https://github.com/greensock/GSAP/blob/master/package.json>
- GSAP Vue 生命周期模式：<https://github.com/greensock/gsap-skills/tree/main/skills/gsap-frameworks>
- nxui：<https://github.com/vinayakkulkarni/nxui>
- Spark UI：<https://github.com/selemondev/spark-ui>

## 8. 推荐视觉规范

现有品牌 Token 优先，不采用通用 Spatial UI 检索结果中的灰色玻璃材质或外部字体。

### 色彩

- `Carbon Void`：`#101715`，主背景。
- `Deep Basin`：`#0d1412`，场景暗部。
- `Contour Line`：`#344039`，结构线。
- `Land Glow`：`#9bea9f`，只用于节点、进度和少量轨道高光。
- `Editorial Ink`：`#eef3ee`，标题。
- `Field Note`：`#b2c0b7`，正文。

### 排版

- 继续使用现有系统字体栈，避免新字体请求和中文回退差异。
- Manifesto 标题使用 `clamp(44px, 7vw, 104px)` 的编辑式尺度；正文保持 15–17px、行长 32–48 个中文字符。
- 英文仅用于产品名或必要场景索引，不新增装饰性英文标签。

### 布局

- 采用“轨道延续线”串联 Scene 01–03；Scene 04 用 GIS 网格作为转折；Scene 05 用真实界面成为证据；Scene 06 回到轨道圆弧。
- 桌面允许 55/45 或 42/58 的不对称布局；手机恢复单列，不做横向滚动叙事。
- 不使用通用卡片矩阵；业务入口以索引、路径节点和真实界面注释呈现。

### 动效

- 每屏只保留一个主要动作。
- Scene 02：标题按行一次性显现，背景线缓慢但可暂停。
- Scene 03：流程线从起点到终点一次推进，节点随线激活。
- Scene 04：文字切换与真实 GIS 预览轻微位移，不驱动地图本身。
- Scene 05：产品截图仅做 2–4% 的缩放或纵向位移。
- Scene 06：圆弧描边一次性出现，CTA 不持续呼吸。
- `prefers-reduced-motion`：全部直接显示最终状态；静态背景保留。

## 9. 本地可验证实施计划

### S1：场景结构与内容顺序

1. 保留 `LandingHero` 和 `PointCloudGlobe`。
2. 将 Capabilities 改为 Manifesto 场景。
3. 把 Provenance 提前为 Data Intelligence，保留原四步事实并加入 GIS/报告衔接。
4. 保留 Spatial，预留真实 GIS 截图位置。
5. 将 Applications 与 Roles 组合为 Product 场景，保留所有入口和文案。
6. 更新为 6 个场景的顶部导航、移动目录和右侧章节轨道。
7. 在 1440、1280、768、390 下核对结构、锚点、键盘焦点和无 JS 可读性。

### S2：背景组件

建议新增轻量组件：

- `FlowingContourBackground.vue`：Manifesto 使用；SVG 路径，不使用 Canvas。
- `DataFlowPath.vue`：真实流程节点与连线。
- `TopographicGridBackground.vue`：GIS 场景使用。
- `OrbitalAccent.vue`：Final CTA 使用。

组件统一接收强度与静态模式，默认 `aria-hidden="true"`，使用容器裁剪和 CSS Token；卸载不保留事件监听。

### S3：排版与场景动效

- 先用现有 IntersectionObserver 和 CSS 实现一次性进入。
- 只有当跨元素时序无法清晰实现时，再安装 GSAP，并采用 `gsap.context(scope)`、`ctx.revert()`、`ScrollTrigger.refresh()` 和 `gsap.matchMedia()`。
- 不引入 Lenis，不 pin 手机场景，不对正文做视差，不让两个场景同时持续动画。

### S4：质量与性能

- 1440、1280、768、390 四视口截图与交互检查。
- 验证 reduced-motion、地球暂停、路由卸载和返回首页后 Canvas 数量。
- 对比 S0 的 692,430 bytes、812ms 本地 LCP、CLS 0、两次长任务和构建块体积。
- 无法稳定测得的 INP、GPU/CPU、FPS 明确标注未测，不推断达标。

## 10. S0 验收

- 已逐个读取当前首页 Section、地球、Aurora、叙事 composable、主题 Token 和旧升级进度。
- 已完成桌面与手机共 14 张 Section 截图及两张联系表。
- 已核验当前依赖、候选资源技术栈和许可证边界。
- 已形成六场景映射、优先级、视觉规范和本地验证计划。
- 未修改页面、未安装依赖、未部署生产环境。
