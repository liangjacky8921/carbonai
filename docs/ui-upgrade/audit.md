# CarbonAI V6.0 UI/UX 与性能审计（U0）

> 日期：2026-10-12（Asia/Shanghai）
> 范围：只读代码检查、本地 Vite 开发/构建预览、公开网站首页 GET。此文件是 U0 基线，不代表 U1–U5 已执行。
> 仓库：`main`，审计起点 `e244666`；开始时 `git status --short` 为空。未修改页面、业务算法、数据、API、部署配置或远程仓库。

## 1. 当前实现与已完成项

- 当前项目是 V6.0。`frontend/src/router/index.ts` 定义 13 个主导航模块，视图使用动态导入；GIS、监测、报告等路由仍在。`frontend/src/main.ts` 注册 Pinia、Vue Router、Element Plus，并在挂载前探测后端。
- `frontend/src/styles/theme.css` 已有深色碳绿/蓝 Token、卡片/表格/上传区样式、焦点环、`prefers-reduced-motion` 规则。`frontend/src/layouts/MainLayout.vue` 已有折叠侧栏、搜索、顶栏、示例数据标签和路由过渡。`docs/ui-spec-v1.md` 已有 V6.0 视觉规范；U1 应以其和现行代码做差异整理，不重新设计品牌。
- `ChartCard.vue` 已统一图表容器高度与 loading/empty 状态；`EmptyState.vue`、`ToastHost.vue`、`DataUpload.vue` 是现有共享组件。`useEChart.ts` 封装了图表生命周期，但本次检索未见视图调用。大多数视图仍直接初始化 ECharts，并只监听 `window.resize`。
- `README.md` 记载 V6.0 SSE 模拟监测及三类角色视图清单；`docs/monitoring-view-diff.md` 是角色差异规划。当前前端路由没有独立的三角色工作台页面，U2 应只统一**现有** UI，不把规划文档写成已实现的角色界面。
- 线上 `https://www.carbontool.cn/` 本次只读 GET 返回 HTTP 200，HTML 标题为 `CarbonAI V6.0 · 时空智能碳管理平台`。这只确认首页版本与可访问性；本轮视觉检查使用本地环境，未验证线上登录或全功能。

## 2. 构建与首屏性能基线

运行 `npm run build`（`vue-tsc --noEmit && vite build`）成功，Vite 5.4.21，转换 2,938 个模块，构建阶段 17.00 秒。`frontend/package.json` 的包版本/描述仍写 `5.2.0`/V5.2，和 UI/README 的 V6.0 不一致；这是元数据问题，不影响此次构建。

| 生产构建资源 | 原始大小 | gzip | 观察 |
|---|---:|---:|---|
| ECharts 手工 chunk | 1,643.14 kB | 511.49 kB | 仪表盘首屏加载 |
| Element Plus 手工 chunk | 1,171.34 kB | 372.76 kB | 首屏加载；`main.ts` 全局注册 |
| Office 导出手工 chunk | 889.50 kB | 259.91 kB | **`dist/index.html` 中有 `modulepreload`，仪表盘首屏已下载**，虽然 Word/PDF 导出只在报告/PCF 使用 |
| 共享数据 chunk | 339.89 kB | 116.79 kB | 仪表盘首屏加载 |
| 全局 CSS | 400.73 kB | 60.86 kB | 仪表盘首屏加载 |

在本机 `vite preview` 的 1440×900 仪表盘中，浏览器资源记录确认上述 5 个大资源均被请求；其中 `office` 约 254 kB 传输。该记录仅为本地网络与机器的基线，不是线上真实用户 LCP、INP 或网络时延。初步原因是 `vite.config.ts` 的手工 `manualChunks.office` 与入口预加载关系；U4 应以构建依赖图定位后再改，保留导出能力。路由动态导入已存在，不能把“未做路由拆分”列为新问题。

现有脚本只有 `dev`、`build`、`build:fast`、`preview`；未见 `test` 或 `lint` 脚本，前端也未声明 Playwright/Vitest/Cypress 依赖。本轮未安装测试依赖。

## 3. 浏览器布局基线

本地开发服务器（后端未启动）检查 `/dashboard`，视口 375×900、768×900、1280×900、1440×900。四档 `documentElement.scrollWidth` 与视口宽度相等，没有整页横向溢出；仪表盘 6 个 canvas 均渲染。桌面 1440px 有完整侧栏和 4 列 KPI；375/768px 侧栏收为 64px 图标栏。另在 375px 只看了 `/gis` 的视觉呈现：地图与图例可见，控制面板纵向排列；未点击、上传或运行 GIS 计算。

**发现的严重窄屏缺陷：** 在 375px，顶栏右侧示例标签和登录按钮占据约 215px，左侧标题/连接状态只剩约 60px。标题压成约 6px 宽，状态徽章换成多行且超出 54px 顶栏高度；截图可见顶栏文字竖排。`MainLayout.vue` 顶栏 `justify-between` 两组并排，只有侧栏在 `max-width:900px` 下折叠，顶栏没有独立移动端排版。

本地浏览器报出 `TypeError: v[w] is not a function`，堆栈来源为 `chrome-extension://...` 注入脚本，**不能归因于应用代码**。开发环境 `/api` 请求出现 500，因本轮未启动 FastAPI、Vite 代理目标 `127.0.0.1:8000` 不可用；UI 显示“离线降级（示例数据）”。本轮不将其记作已证实的生产故障。

## 4. 按优先级列出的问题

### P0：严重功能或布局

1. **375px 顶栏内容不可读。** `frontend/src/layouts/MainLayout.vue:50`、`:68`、`:235`；需要移动端重排标题、连接状态、示例标签和登录入口，保证 375px 下全部可读可点。移动端侧栏已收缩，不必重做路由。
2. **“切回示例”立即清空本地上传数据。** `MainLayout.vue:61`、`:184` 调用 `dataStore.resetAllToSample()`；`frontend/src/stores/data.ts:197` 明确删除本地用户数据及 PCF。当前入口是可点击 `el-tag`，没有确认/撤销，也没有显式键盘操作语义。需先给出明确破坏性提示与确认或可撤销路径，避免误触造成数据丢失。

### P1：明显设计、可访问性或性能

3. **导出依赖进入仪表盘首屏。** `frontend/vite.config.ts:26` 手工 chunk + `frontend/dist/index.html` 的 `office` `modulepreload`；本地预览实测约 254 kB 传输。U4 调整动态导入/分包并记录前后首屏请求与构建体积。
4. **上传控件和操作反馈的键盘/读屏支持不足。** `frontend/src/components/DataUpload.vue:2` 使用可点击 `div`，没有按钮语义与键盘激活；`frontend/src/components/ToastHost.vue:2` 没有 `aria-live` 或状态角色；`MainLayout.vue:44` 图标折叠按钮无可访问名称。U2/U3 应修正交互语义，保留现有拖放与文件选择行为。
5. **限制缩放和辅助文字对比度。** `frontend/index.html:6` 设置 `maximum-scale=2.0`；`theme.css:25` 的 `--c-text-3: #5f7a6f` 与主卡片背景 `#0d1714` 的对比约 3.91:1，低于常规正文 4.5:1 目标。许多 10–11px 标签使用该色。U1/U3 应区分装饰性与关键说明，优先保证关键单位、来源、状态与表单文案的可读性。
6. **响应式图表依赖全局窗口事件。** `DashboardView.vue:315`、`GisView.vue:451` 等直接监听 `window.resize`，现有 `useEChart.ts` 未被视图复用。侧栏动画、容器变化可能没有对应 resize 时机；U3/U4 应在页面逐一验证并考虑容器级 `ResizeObserver`，本轮未确认所有图表存在裁切。

### P2：细节与维护成本

7. `DashboardView.vue:22` 的 `StatCard v-if="false"` 是死分支，而同页另有内联 KPI；现有 `StatCard.vue` 的数字补间并未用于仪表盘 KPI。U1 可确定一种卡片实现后清理重复结构。
8. `theme.css:175`、`MainLayout.vue:219`、`DashboardView.vue:383` 使用 `transition: all`。现有 `prefers-reduced-motion` 规则有效，但属性范围过宽，U2 应按实际反馈列出 `transform`、`opacity`、边框色等属性。
9. `docs/ui-spec-v1.md` 的卡片示例使用 `--radius-md` 10px，而 `theme.css` 当前 `.c-card` 使用 `--radius-lg` 12px；字号、颜色仍有页面局部硬编码。U1 应盘点实际值后统一文档与实现。
10. `frontend/index.html` 未声明 `color-scheme: dark` 或匹配背景的 `theme-color`；`ToastHost`、表单及原生控件的暗色状态应在 U1/U3 一起检查。
11. 桌面主导航没有面包屑；13 个模块都在一层，当前路由名称标题已经明确。U2 先确认面包屑是否增加定位价值，避免重复标题。

## 5. 最值得升级的前 5 项

| 顺序 | 项目 | 阶段 | 验收重点 |
|---:|---|---|---|
| 1 | 修复 375px 顶栏排版 | U2/U3 | 标题、状态、示例与账号操作可读可点，无重叠 |
| 2 | 给“清空用户数据”加入清晰确认/撤销和键盘语义 | U2/U3 | 不误删本地上传数据；键盘和触控可操作 |
| 3 | 让 Office 导出依赖退出仪表盘首屏 | U4 | 保留报告导出；前后资源请求与 gzip 体积可复核 |
| 4 | 修复上传、折叠按钮、Toast 的可访问语义与缩放限制 | U2/U3 | 键盘、读屏、200% 以上缩放流程可用 |
| 5 | 统一重要说明文字、卡片和图表样式 | U1/U3 | 关键单位/来源对比度达标；规范与实际 Token 一致 |

## 6. Skills 核查与使用决定

Codex 当前可用的相关本地 Skills 是 `skill-installer`（系统）、`tabbit`（已安装浏览器 CLI）；用户列出的 8 个外部项目在当前 Codex Skills 目录中均未发现同名已安装项。本轮使用 `skill-installer` 的安装规则检查来源，并用 `tabbit` 做本地视觉和资源检查。没有运行第三方安装脚本；U0 的审计任务不需要给仓库新增设计或动画依赖。

| 项目 | 官方来源和已核对信息 | U0 判断 |
|---|---|---|
| [frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | `SKILL.md` 可读；该目录 `LICENSE.txt` 为 Apache-2.0；仓库 README 给 Claude 插件安装方式，Codex 可在后续按 `skill-installer` 的 GitHub 路径方式安装 | U1 视觉参考可用，U0 不安装 |
| [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 官方 README、MIT `LICENSE` 可读；仓库提供 CLI/Skill | U1 可评估，U0 不安装 |
| [web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | 官方 `SKILL.md` 指向最新 [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md)，本轮已读并用于审计；agent-skills 仓库根目录未找到 LICENSE，故未复制/安装该 Skill | U0 已用公开规则核对，U1/U3 可继续参照 |
| [vue-best-practices / vue-router-best-practices](https://github.com/vuejs-ai/skills) | 官方 README 列出 `npx skills add vuejs-ai/skills`；MIT `LICENSE` 可读，README 自述为社区早期实验 | U4 再按需要安装或读取具体条目 |
| [playwright-cli](https://github.com/microsoft/playwright-cli) | 官方 README 给 `npm install -g @playwright/cli@latest`、`playwright-cli install --skills`；Apache-2.0 `LICENSE` 可读 | U5 再决定；U0 已有 `tabbit`，不重复安装 |
| [GSAP](https://github.com/greensock/GSAP) | 官方 README 说明 `npm install gsap` 与商用免费，但这是动画库；仓库根目录未找到 LICENSE | 当前 CSS/Vue 动效足够，U0 不加入运行依赖 |
| [React Bits](https://github.com/DavidHDev/react-bits) | 官方 README 明示 React 组件库；`LICENSE.md` 为 MIT + Commons Clause，限制组件本身转售/再分发 | Vue 项目不复制其组件，U0 不安装 |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | 官方 README 可读，MIT `LICENSE` 可读 | U1 仅在有明确收益时使用，U0 不安装 |

说明：上表是本轮来源/许可与适用性核查，不把 README 的宣传语当作性能或设计验收结果。若后续安装，先核对该时点的仓库内容、命令、依赖与许可证，并记录版本。

## 7. U1 入口和边界

U1 从 `docs/ui-spec-v1.md`、`frontend/src/styles/theme.css`、`MainLayout.vue`、`ChartCard.vue`、`StatCard.vue`、`DataUpload.vue`、`ToastHost.vue` 开始，先统一 Token、组件与状态样式。P0 的移动顶栏/清空确认由 U2/U3 处理，但 U1 设计 Token 应为其预留密度和对比度规范。任何阶段都不改碳核算因子、GIS 空间计算、数据库或 API 业务语义。

本轮限制：只检查公开首页与本地未登录页面；未启动后端、未运行登录/上传/导出链路；没有生产 RUM 或性能采样，因此不对线上交互性能作结论。
