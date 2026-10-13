# CarbonAI V6.2 动态视觉升级 · M0 审计

日期：2026-10-13（Asia/Shanghai）。基线：main / 6445a827，开始时工作区干净。本文件记录 M0 当时的本地概念验证；M1 后续正式接入与删除临时入口的结果见 [progress.md](./progress.md)。

## 当前项目

- Vue 3.5.42、Vue Router 4.6.4、Pinia 2.3.1、Vite 5.4.21、TypeScript 5.9.3，Composition API / TS。
- `/` 重定向 `/dashboard`，没有独立公开营销首页；业务路由共用 MainLayout，认证页独立布局。
- 主入口全局加载 Element Plus、主题样式及 Leaflet 样式，并探测后端。营销入口若沿用该入口，会带入业务依赖和 API 请求。
- 深绿主题已具备色彩、排版、间距、焦点和状态 Token；原有页面动画、Skeleton、行情跑马灯及 ECharts 入场存在。
- GIS 使用 Leaflet；Dashboard 使用 ECharts GL。GIS 卸载逻辑已存在，本阶段未修改其行为。
- StatCard 的数值动画使用 requestAnimationFrame、卸载时取消；没有独立的减少动画判断，应在 M3 核验实际使用位置后处理。
- Dashboard 跑马灯有持续动画，未见用户暂停控件；图表配置存在 elasticOut 和显式动画参数，M3 应逐一核验减少动画偏好是否覆盖。
- 历史 U0–U6 已完成记录与截图可复用，但进度文档仍有发布前“未部署”的旧描述。实际此前已发布 V6.0，本次审计不据旧文档判断生产状态。

## 问题与机会

| 优先级 | 证据 / 位置 | 建议 |
|---|---|---|
| P1 | frontend/src/router/index.ts：根路由为数据大屏 | M1 决定公开首页入口；保持原业务路径与认证语义 |
| P1 | frontend/src/main.ts：全局 UI 库与后端探测 | 展示入口保持轻量，避免加载完整业务栈 |
| P1 | frontend/src/views/DashboardView.vue：ticker 和弹性图表动效 | M3 增加暂停及减少动画核验，收敛持续运动 |
| P1 | frontend/src/components/StatCard.vue：JS 数值动画 | M3 尊重实时偏好变化，始终以实际值结束 |
| P2 | frontend/src/styles/theme.css：Skeleton 动画背景位置 | 后续测量重绘成本；优先 transform/opacity |
| P2 | Element Plus / ECharts GL 大包 | 不因展示效果扩大业务首屏体积 |

这些是源码审计发现，尚未重新验收生产业务操作；本次浏览器检查集中于独立概念入口。

## 本机 Skills

frontend-design、ui-ux-pro-max、web-design-guidelines、vue-best-practices、playwright-cli 的 SKILL.md 均存在，未重复安装。已读取 Vue 四个基础参考及最新 Web Interface Guidelines。ui-ux-pro-max 查询返回 Spatial UI 建议；其白色玻璃方案与碳绿品牌不协调，采用其可访问性与暂停建议，视觉按项目简报调整。

## 三种方案评分

评分为设计判断，满分 5；权重：品牌 30%、识别度 25%、业务清晰度 25%、性能 20%。

| 方案 | 品牌 | 识别度 | 清晰度 | 性能 | 加权分 | 应用位置 |
|---|---:|---:|---:|---:|---:|---|
| A. Aurora Carbon | 5 | 5 | 4 | 4 | 4.55 | 首页单一缓慢极光视觉 |
| B. Spatial Intelligence | 5 | 4 | 4 | 4 | 4.30 | GIS 入口、抽象地形 SVG |
| C. Executive Carbon | 4 | 3 | 5 | 5 | 4.20 | 数据工作台、表格及报告 |

推荐组合：A 首页 + B GIS 展示入口 + C 后台。首页用排版和环境光建立识别，地图功能与数据保持在工作台中。

## 设计规范与组件地图

- 基底石墨绿 `#101715`，正文 `#eef3ee`，辅助文字 `#b2c0b7`，边界 `#344039`，局部环境光 `#4f9a74`，行动按钮 `#c7e4cc`。
- Segoe UI / PingFang SC / Microsoft YaHei 本机字体，避免外部字体请求；首屏标题 44–76px、章节标题 28–42px、正文 14–16px。
- 左侧三行中文标题，右侧极光留白；能力区用横向条目而非重复 Features 卡片；空间区以地形线示意收束。
- 主标题描述现有核算、GIS、报告能力；没有官方认可、实时全国监测或虚构客户陈述。
- AuroraBackdrop：装饰性双层渐变，接收 paused；页面隐藏、离屏、减少动画时停止。无 WebGL、RAF 循环或后端数据。
- SpatialContour：静态 SVG 地形线，显式标注视觉示意；没有地理数据或真实点位。
- MotionPreview：编排首屏、能力条目与空间入口，管理用户暂停状态；main.ts 仅挂载 Vue，不加载业务路由、Store 或 API。
- 入场仅一次 850ms；极光 24/31 秒缓动，transform/opacity；按钮反馈 200ms；提供暂停、键盘焦点、跳转链接与减少动画静态模式。

## 阶段成本估计

以下为工程工作量估计，不是交付承诺：M1 正式首页接入 1–2 人日；M2 原生滚动叙事 1–2 人日；M3 后台微交互与偏好核验 2–3 人日；M4 仅评估 0.5 人日，暂不引入 3D；M5 性能与回归 1–2 人日。复杂数据问题或后端改动不在估计范围。

## 隔离与初测

- 新入口 `frontend/motion-preview.html`，独立配置 `vite.motion.config.ts`，仅绑定 127.0.0.1。
- 正式 Vite 默认输入仍为 index.html，概念页不进入默认生产构建；业务源码、API、服务器、数据库和路由未修改。
- 基线 npm run build（包含 vue-tsc）通过：2,939 模块，Vite 构建 27.93 秒。
- 基线主 JS 96.11 kB / gzip 38.38 kB，主 CSS 403.65 / gzip 61.61 kB；Element Plus 1,171.35 / gzip 372.76 kB；ECharts 1,643.14 / gzip 511.49 kB。
- 概念构建与浏览器初测见 evidence/initial-check.json 和 progress.md；本地单次实验不能作为线上 Core Web Vitals 达标声明。

## 资源来源与版权

见 [resources.md](./resources.md)。本次代码由 AI 辅助独立编写，未复制外部组件；保留真实使用记录，未将外部实现作为自研源码。M0 完成后停止，后续执行先读取 progress.md。
