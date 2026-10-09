# CarbonAI V6.0 · UI 设计规范 v1

> 适用范围：全部 13 个导航模块的页面改造与新增组件。后续设计/开发必须遵守本文档，禁止绕过规范直接写内联样式。

---

## 一、设计语言

**学术精密感 + 数据大屏风格**。整体深色主题，绿蓝主色调，等宽数字字体，低饱和强调色，圆角偏小、间距偏紧，符合"碳管理专业工具"而非"消费级 App"的气质。

---

## 二、色板 Token（见 `frontend/src/styles/theme.css`）

| Token | 值 | 用途 |
|---|---|---|
| `--c-bg` | `#070d0b` | 页面最底背景 |
| `--c-bg-2` | `#0a120f` | 区块二级背景 |
| `--c-surface` | `#0d1714` | 卡片/面板主背景 |
| `--c-surface-2` | `#101d18` | 卡片悬停/选中态 |
| `--c-border` | `#1c2f27` | 卡片边框（细线） |
| `--c-border-2` | `#24413a` | 选中/强调边框 |
| `--c-green` | `#10b981` | 主色调 · 正常/正向排放 |
| `--c-green-deep` | `#059669` | 主色深色态 |
| `--c-green-accent` | `#0d9488` | 青绿强调 |
| `--c-green-soft` | `rgba(16,185,129,0.12)` | 绿色软背景 |
| `--c-blue` | `#0ea5e9` | 次色调 · 电力/数据 |
| `--c-blue-soft` | `rgba(14,165,233,0.12)` | 蓝色软背景 |
| `--c-amber` | `#f59e0b` | 黄色预警 / 碳排放中 |
| `--c-red` | `#ef4444` | 红色阈值 / 高排放 |
| `--c-purple` | `#8b5cf6` | 紫色 · N₂O/CH₄ 等特殊 GHG |
| `--c-text` | `#e8f5ef` | 主文字 |
| `--c-text-2` | `#9db8ae` | 次级文字 |
| `--c-text-3` | `#5f7a6f` | 辅助文字/说明 |

**使用规则**：禁止写硬编码颜色值（如 `color: #10b981`），统一用 Token。Tailwind 可配在主题里，CSS 里必须用 `var(--c-green)`。

---

## 三、字号层级

| 层级 | 字号 | 字重 | 用途 |
|---|---|---|---|
| Display | 28-32px | 600 | 数据大屏核心数字（KPI 大卡片） |
| H1 | 18-20px | 600 | 卡片标题 |
| H2 | 15-16px | 600 | 顶栏路由标题、Card 副标题 |
| H3 | 13-14px | 500 | 表单项标签、分区标题 |
| Body | 13px | 400 | 正文、描述文案 |
| Caption | 11-12px | 400 | 辅助说明、图表轴标签、表格小字 |
| Number | 等宽 16-28px | 500 | 数字展示（必须用 `--font-num`） |

---

## 四、间距规范

| Token | 值 | 用途 |
|---|---|---|
| Space-1 | 4px | icon 与文字微间距 |
| Space-2 | 8px | 紧凑内部元素间距 |
| Space-3 | 12px | Card 内部分组间距（默认） |
| Space-4 | 16px | 区块间距、表单控件间距 |
| Space-5 | 24px | Card 之间、主要分区块间距 |
| Space-6 | 32px | 页面底部留白 |

**Card 内边距**：`p-4`（16px）为默认，密度高的面板可 `p-3`。

---

## 五、组件样式规范

### 5.1 Card（`.c-card`）
```css
.c-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);  /* 10px */
  padding: 16px;
}
.c-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text);
  margin-bottom: 12px;
}
```

### 5.2 Button
- **主按钮**（`type="primary"`）：El Plus 主题已覆盖为绿色 `#10b981`，禁用态灰化
- **次要按钮**：`plain` + 默认样式，边框色用 `--c-border-2`
- **危险操作**：`type="danger"` 红色
- **尺寸**：默认 32px 高；小面板内用 `size="small"`（28px）

### 5.3 Chart（ECharts）
- **主题配置**：所有图表必须走共享的轴/tooltip 配置对象（`tt` 和 `axis`），禁止各图表各写各的色值
- **背景**：`rgba(13,23,20,0.94)` 深色半透明
- **网格线**：`rgba(30,51,41,0.6)` 深绿灰
- **动效**：无 `animationEasing: 'bounce'`，用 `'easeOutQuint'` 或不指定（默认）
- **单位**：全局常量 `UNIT_TCO2E / UNIT_KGCO2E`（见 `utils/format.ts`），禁止硬写

### 5.4 Form（Element Plus）
- **Select/Input/DatePicker**：统一 `size="small"`（紧凑）
- **Radio/Checkbox**：`size="small"`
- **Label**：灰色小字 `--c-text-3`
- **Input 背景**：`--c-surface-2`

### 5.5 Table
- 表头字重 500，色 `--c-text-2`
- 斑马纹禁用（深色主题不明显）
- hover 行背景 `var(--c-green-soft)`

### 5.6 StatCard（KPI 卡片）
- 大号数字用等宽字体 `--font-num`
- 色值语义：绿色=正向/达标，红色=超阈值，琥珀色=中性/中值
- Label 字 11-12px，色 `--c-text-3`

### 5.7 Badge / Tag
- 禁用 `type="info"`（蓝色与主色冲突）
- 禁用 `effect="dark"`（深色主题对比度不够），用 `effect="plain"`

---

## 六、动效规范（Apple HIG 风格升级）

### 6.1 缓动曲线

| Token | 值 | 用途 |
|---|---|---|
| `--ease-apple` | `cubic-bezier(0.32, 0.72, 0, 1)` | **统一默认曲线** — 微交互、卡片 hover、页面转场 |
| `--ease-ios` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | 旧版兼容（已废弃，新代码用 `--ease-apple`） |
| `--ease-spring` | `cubic-bezier(0.22, 1, 0.36, 1)` | 弹性回弹（仅 press 回弹等极少场景） |

**规则**：全站 transition / animation 统一使用 `var(--ease-apple)`，禁止 `ease` / `linear` / `ease-in-out` 等浏览器默认曲线。

### 6.2 时长档位

| Token | 值 | 用途 |
|---|---|---|
| `--dur-micro` | `250ms` | 微交互：hover、press、按钮、卡片、nav-item |
| `--dur-page` | `450ms` | 页面转场：route transition |
| `--dur-stagger` | `50ms` | 列表入场 stagger 间隔（40-60ms 范围） |

### 6.3 交互质感

- **hover 微放大**：`transform: scale(1.01)` 或 `translateY(-1px)` / `translateX(2px)`，只用 `transform` + `opacity`，保证 60fps
- **press 回弹**：`transform: scale(0.97)`，250ms 回弹
- **卡片悬停**：阴影从 `0 2px 12px` 加深到 `0 4px 24px`，+ `translateY(-1px)`
- **nav-item 悬停**：`translateX(2px)` 微位移

### 6.4 毛玻璃（backdrop-filter）

| 元素 | 值 |
|---|---|
| 顶栏 topbar | `backdrop-filter: blur(20px) saturate(1.5)` |
| 侧栏 sidebar | `backdrop-filter: blur(20px) saturate(1.5)` |
| 表头 dark-table th | `backdrop-filter: blur(6px)` |

背景半透明：`rgba(13, 23, 20, 0.72)` — 保证内容可读性。

### 6.5 KPI 数字补间

- KPI 数字变化用 `requestAnimationFrame` 补间过渡（`easeOutCubic` 曲线，600ms），禁止跳变
- 实现见 `components/StatCard.vue` — `value` 为数字时自动触发补间
- 图表数据追加用 ECharts 默认 `animationEasing: 'cubicOut'`（与 Apple 曲线同族）

### 6.6 骨架屏 shimmer

- 1.4s 循环，`background-position` 100%→0% 滑动
- 颜色：`#101d18 → #16261f → #101d18`

### 6.7 可访问性

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

用户系统偏好「减少动态」时，所有动画/过渡降为 0.001ms。

---

## 七、空状态与引导

- **空状态组件**：`<EmptyState icon="..." title="..." description="...">`，见 `components/EmptyState.vue`
- **首次引导**：用 localStorage 标记，看过即消失（key 命名 `carbonai_<页面>_guided_v6`）
- **数据铁律**：模拟数据必须显式带示例/样本标签，禁止冒充真实数据

---

## 八、单位规范

全局常量定义在 `utils/format.ts`，template 中直接引用：

```typescript
export const UNIT_TCO2E = 'tCO₂e'
export const UNIT_KGCO2E = 'kgCO₂e'
export const UNIT_WANTCO2E = '万tCO₂e'
```

- 展示层统一用 `tCO₂e`（带 e 表示当量）和 `kgCO₂e`
- **例外**：排放因子原始值（tCO₂/t、kgCO₂/kWh 等）按行业惯例保留 tCO₂（因子本身的行业标准单位）
- **例外**：配额/CCC/CEA 等碳市场配额单位，行业惯例仍用 tCO₂

---

## 九、13 页面改造优先级

> 排序依据：**用户高频访问频次 × 改动成本低**。高频=用户停留时间长/核心功能，成本低=纯样式微调无逻辑变更。

| 优先级 | 页面 | 路由 | 改动内容 | 预估工作量 |
|---|---|---|---|---|
| **P0** | DashboardView 数据大屏 | `/dashboard` | KPI 卡片单位/样式统一；异常洞察文案优化 | 小（1h） |
| **P0** | GridView 网格化监测 | `/grid` | 接实时流 + 超阈值预警联动（T11）；色板 Token 对齐 | 中（3h，已含在 T11） |
| **P1** | GisView GIS 碳源 | `/gis` | 叠加实时点位图层（T10）；Popup 单位修复 | 中（2h，已含在 T10） |
| **P1** | TrajectoryView 轨迹碳核算 | `/trajectory` | 3 步引导（已在 T5 完成）；结果区数值单位 | 小（已完成） |
| **P1** | SewageView 污水厂运维 | `/sewage` | KPI 修复（T2 已完成）；因子假设文案单位 | 小（已完成） |
| **P2** | AccountingView 排放核算 | `/accounting` | EmptyState 优化；因子库匹配提示 | 小（2h） |
| **P2** | FactorLibView 排放因子库 | `/factorlib` | 图表单位统一；因子来源字段对齐 | 小（1h） |
| **P2** | ToolsView 碳计算器 | `/tools` | 结果文案单位统一；计算器空态 | 小（1h） |
| **P3** | ReportView 多标准报告 | `/report` | reportBuilder 单位统一（已在 T4 完成） | 极小 |
| **P3** | PcfView 产品碳足迹 | `/pcf` | 单位检查；EmptyState 增强 | 小（2h） |
| **P3** | AssetView 碳资产 | `/asset` | 配额数字等宽字体；单位检查 | 小（1h） |
| **P4** | SoilView 土壤高光谱 | `/soil` | PC1 方差 bug（T1 已完成） | 极小 |
| **P4** | AiAdvisorView AI 顾问 | `/ai` | 知识库单位文案统一 | 极小 |
