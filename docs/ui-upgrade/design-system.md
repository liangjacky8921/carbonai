# CarbonAI Design System V6.0（U1）

> 状态：已实现于前端基础层，更新于 2026-10-12。适用于 CarbonAI 时空智能碳管理平台现有 Vue 3 页面。本文记录实际代码约束，不代表软著材料或功能承诺。

## 1. 设计定位

CarbonAI 是面向碳管理、ESG 与 GIS 分析的高信息密度企业工具。视觉继续采用深色碳绿、低饱和边框、等宽数字和紧凑网格。Apple HIG 只用于清晰层级、即时反馈、克制动效和可访问性原则，不复制 Apple 品牌素材或拟物效果。

设计参数：变化度 3/10、动效强度 3/10、信息密度 8/10。界面以数据可信度、单位和来源可读为优先，不用装饰覆盖业务信息。

## 2. 基础 Token

实现位置：`frontend/src/styles/theme.css`。

### 2.1 色彩

| 语义 | Token | 当前值 | 用途 |
|---|---|---:|---|
| 页面背景 | `--c-bg` | `#070d0b` | 应用最底层 |
| 二级背景 | `--c-bg-2` | `#0a120f` | 导航、地图底色 |
| 主表面 | `--c-surface` | `#0d1714` | 卡片与浮层 |
| 次表面 | `--c-surface-2` | `#101d18` | 表单、统计块 |
| 普通边框 | `--c-border` | `#1c2f27` | 静态分隔 |
| 强调边框 | `--c-border-2` | `#2f5146` | hover、浮层 |
| 品牌主色 | `--c-green` | `#10b981` | 主操作、达标状态 |
| 信息色 | `--c-blue` | `#0ea5e9` | 数据、电力、信息 |
| 警告色 | `--c-warning` | `#fbbf24` | 需关注状态 |
| 危险色 | `--c-danger` | `#f87171` | 错误、超阈值 |
| 主文字 | `--c-text` | `#e8f5ef` | 标题和主要数据 |
| 次文字 | `--c-text-2` | `#9db8ae` | 正文和表头 |
| 辅助文字 | `--c-text-3` | `#6f8d81` | 单位、来源、说明 |

`--c-text-3` 从 `#5f7a6f` 调整为 `#6f8d81`，与主卡片背景的对比约为 5.05:1。关键单位、来源和表单说明可使用此 Token；更弱的颜色仅用于禁用或纯装饰状态。

### 2.2 字体与数字

- 中文界面使用系统字体栈，避免新增网络字体请求。
- 标题使用 `--font-head`，正文默认 14px / 1.55 行高。
- Caption、Body、Subtitle、Title、Display 分别使用 `12 / 13 / 14 / 18 / 28px` Token。
- 业务数字必须使用 `.num` 或 `--font-num`，并启用 `tabular-nums lining-nums`。
- 不用全大写模拟层级；表头保持中文原始大小写。

### 2.3 间距、圆角和阴影

- 间距采用 4px 基准：`--space-1` 至 `--space-6` 为 `4 / 8 / 12 / 16 / 24 / 32px`。
- 圆角采用 `6 / 10 / 12px`；Badge 才使用 `--radius-pill`。
- 卡片默认 12px 圆角，统计块 10px；同类组件不得自行新增半径。
- 阴影只表示悬停或浮层。普通卡片靠背景与边框划分，不叠加大面积模糊光晕。

## 3. 组件规范

### 卡片和统计块

- `.c-card` 用于内容面板，`.stat-box` 用于 KPI。
- hover 只变化边框、阴影和最多 1px 位移。
- KPI 标签使用 `--c-text-3`，数字使用等宽数字字体。

### 按钮、表单和表格

- 小尺寸控件统一 32px 高，主要动作使用 Element Plus `primary`。
- 输入框、选择器、文本域使用次表面背景和统一内边框；焦点由全局 `--c-focus` 表达。
- 原生暗色控件通过 `color-scheme: dark` 适配。
- 表头使用 `--c-text-2`，取消强制大写；行 hover 使用绿色软背景。
- 删除、清空等不可逆操作的确认流程属于 U2，不能只用颜色表达风险。

### Loading、Empty、Error、Success

- Loading：使用 `.skeleton`，保持容器尺寸，避免布局跳动。
- Empty：使用 `.state-panel`、`.state-panel__icon`、`__title`、`__description`；说明下一步可执行动作。
- Success / Warning / Error / Info：分别使用 `--c-success / --c-warning / --c-danger / --c-info`。
- Toast 使用 `aria-live="polite"` 与 `role="status"`，文字必须能独立说明结果，颜色圆点只作辅助。

### 弹窗、抽屉与通知

- Dialog、Drawer、MessageBox、Popover 共用主表面、强调边框、12px 圆角和浮层阴影。
- 遮罩使用 `--c-overlay`。浮层不能隐藏数据来源、单位或限制条件。

## 4. 图表系统

共享实现：`frontend/src/utils/chartTheme.ts`。

- `CHART_TOOLTIP`：统一深色背景、边框、文字、圆角和阴影。
- `CHART_AXIS`：统一轴线、刻度、标签和分隔线。
- `createChartAxisStyle(fontSize)`：只在紧凑图表需要更小轴标签时使用。
- `CHART_COLORS`：业务系列的标准绿、蓝、琥珀、红、紫、青色。
- `CHART_LEGEND`：图例文字基准。

现有核算、资产、仪表盘、因子库、GIS、网格、PCF、污水、土壤与轨迹页面已接入共享 tooltip/轴配置。业务阈值、GIS 图层颜色、系列含义和计算结果保持原样。后续新增图表应导入共享配置，不复制十六进制 tooltip/坐标轴对象。

## 5. 动效与交互反馈

- 使用 `--ease-apple` 与 `--dur-micro / --dur-page`。
- 只声明实际变化的属性，禁止 `transition: all`。
- 页面动效以 `opacity` 和 `transform` 为主；不使用无业务意义的连续动画。
- 全局遵守 `prefers-reduced-motion`。GSAP 不是本阶段依赖，当前反馈用 CSS 和 ECharts 原生能力即可。

## 6. 可访问性与响应式基线

- 正文与背景目标对比度至少 4.5:1，键盘焦点必须可见。
- 页面允许用户缩放；viewport 不限制最大比例。
- 触控目标、移动端顶栏、上传区键盘语义等在 U2/U3 逐项完成。
- U3 在 375、768、1280、1440px 验证遮挡、滚动、触控和字体缩放。

## 7. Skill 采用记录

- 已采用 `frontend-design`、`ui-ux-pro-max`、`web-design-guidelines` 与 Vue 最佳实践来约束设计和实现。
- `playwright-cli` 已安装，按阶段安排在 U5 做真实浏览器验收。
- Taste Skill 明确排除密集型 Dashboard，因此不把其营销页与 Hero 模式用于本平台。
- GSAP 与 React Bits 官方仓库没有可安装的 `SKILL.md`。GSAP 是动画运行库，React Bits 是 React 组件库；当前 Vue 项目未新增这两项依赖。

## 8. 验收与后续边界

U1 已通过 `vue-tsc --noEmit` 和 Vite 生产构建。U2 继续处理导航、破坏性操作确认、上传/导入/导出反馈、表单键盘操作和多角色现有 UI 一致性；U3 处理响应式与完整可访问性；U4 处理体积和渲染性能；U5 统一做浏览器截图和流程验收。
