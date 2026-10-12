# CarbonAI UI 升级进度

> 更新：2026-10-12（Asia/Shanghai）

## 当前阶段

- U0 项目现状检查：已完成，见 [`audit.md`](./audit.md)。
- **U1 统一设计系统：已完成，见 [`design-system.md`](./design-system.md)。**
- **U2 全站交互：已完成。**
- **U3 响应式与可访问性：已完成并通过浏览器复核。**
- **U4 Vue 与前端性能：已完成。**
- **U5 浏览器验收：已完成，见 [`evidence/test-summary.md`](./evidence/test-summary.md)。**

用户已授权连续执行 U2–U5。未部署、未提交或推送远程仓库。

## U6 发布前准备

- 新增前后端环境变量示例，将页面标题统一为 V6.0，并补充实时监测 SSE、SMTP、数据库和 AI 配置项。
- 生产模式要求 `AUTH_SECRET_KEY` 至少 32 个字符；默认值或弱密钥会阻止服务启动。
- Render Blueprint 自动生成会话密钥，并要求首次创建时填写持久化 `DATABASE_URL`。
- 新增 `release-readiness.md`，记录上线前必须配置项、发布后检查和暂不执行事项。
- 生产模式验证通过：根路径与 Vue 路由返回 HTML，健康检查返回 JSON；关闭的 API 文档、未知 API 和缺失静态资源均返回 404；CORS 只响应白名单域名。
- Render YAML 解析通过；默认弱密钥阻断测试通过；V6.0 生产构建通过（2,939 个模块，25.09 秒）。
- 未部署、未写入真实密钥。

## 全栈补充验收

- 启动 FastAPI、Vue 开发服务和模拟监测 SSE 服务，使用隔离 SQLite 数据库完成真实接口回归。
- 修复后端启动不自动创建认证表的问题；Render 和本地首次启动不再依赖人工执行建表命令。
- 修复单机托管 `frontend/dist` 路径，并增加 Vue History 路由回退；`/dashboard`、`/gis` 刷新返回 HTML，缺失静态资源保持 404。
- 健康检查、7 组示例数据、22 项因子、验证码、注册、登录、用户信息、CSV 核算和后端 PDF 报告全部通过。
- 浏览器使用真实后端登录成功，显示“后端已连接”；GIS 在 7 秒内收到 SSE 并生成实时点位，控制台无错误。
- 测试脚本、后端 PDF 和在线状态截图已保存到 `docs/ui-upgrade/evidence/`。

## U2 阶段记录

- 新增统一确认流程 `useConfirmAction.ts`；全局切回示例、排放数据、GIS 点位、轨迹数据和报告历史清理均需确认。
- 移动顶栏改为窄屏两行结构，示例/用户数据按钮不再挤压页面标题。
- 上传区、报告模板和 LCA 阶段卡片改为语义按钮；补充侧栏折叠、城市详情关闭和主要内容跳转的可访问名称。
- PDF/Word 导出按钮增加 loading 与重复点击保护。
- U2 构建通过：2,940 个模块，17.80 秒。

## U3 阶段记录

- 增加主要内容跳转链接、可见焦点、读屏状态、图标按钮名称和表单可访问名称。
- 登录/注册字段补充 `name`、`autocomplete`、验证码 `inputmode`；计算器数字输入补充移动键盘提示。
- 粗指针设备上的按钮、单选、导航与表单控件最小高度统一为 44px。
- Dialog、Drawer、MessageBox、Toast 增加窄屏宽度与滚动约束；数据表补充横向滚动容器。
- 375px 顶栏、56px 导航轨、内容边距和短连接状态完成窄屏规则；viewport 保持允许缩放。
- U3 构建通过：2,940 个模块，16.65 秒。375/768/1280/1440px 的实际截图与交互结果在 U5 记录。

## U4 阶段记录

- 删除 `manualChunks.office`；保留报告导出动态导入，PDF/Word 库只在实际导出时加载。
- 构建入口的 modulepreload 从 ECharts、Element Plus、Office、数据等多项收敛为仅 Element Plus；Office 259.91 kB gzip 不再首屏预加载。
- 新增 `useElementResize.ts`，十个图表页面及共享 `useEChart` 改用容器级 `ResizeObserver`；侧栏和网格尺寸变化可触发图表重绘。
- 清理 Dashboard 未启用的 `StatCard v-if="false"` 分支。
- `package.json`、锁文件和报告可见版本统一为 V6.0；历史软著 V5.2 文档未擅自改写。
- U4 构建通过：2,939 个模块，14.83 秒。ECharts 与 Element Plus 仍是主要大包，保留现有 3D 图表和全局组件能力。

## U5 阶段记录

- 用 Chromium 检查 14 个主要路由，并在 375、768、1280、1440px 视口复核布局；未发现页面级横向溢出。
- 复核 Dashboard 6 个图表、GIS 地图和瓦片、PCF 结果图表、报告生成、工具结果、登录字段与移动端布局。
- 375px 首轮检查发现侧栏文字在动态缩放后挤压；已增加窄屏 CSS 兜底，复测时导航文字隐藏且页面宽度保持 375px。
- CSV 上传、清空用户数据确认的取消/确认分支均通过；PDF 与 Word 已真实下载并保存到证据目录。
- 键盘首次 Tab 可到达跳转链接；粗指针按钮高度为 44px；减少动画偏好生效。
- 浏览器仅记录 `/api/health` 500：本地预览未启动 FastAPI 后端，界面正常进入离线状态；未发现应用 JavaScript 异常或警告。
- 最终构建通过：2,939 个模块，18.71 秒。截图、脚本、导出文件和完整摘要见 `docs/ui-upgrade/evidence/`。

## U1 已修改文件

- 基础系统：`frontend/src/styles/theme.css`、`frontend/index.html`
- 共享组件：`ChartCard.vue`、`EmptyState.vue`、`ToastHost.vue`
- 图表系统：新增 `frontend/src/utils/chartTheme.ts`，并更新 `useEChart.ts`
- 图表接入：Accounting、Asset、Dashboard、FactorLib、GIS、Grid、PCF、Sewage、Soil、Trajectory 十个现有视图
- 动效属性收敛：`MainLayout.vue`、`DashboardView.vue`、`PcfView.vue`、`ReportView.vue`、`RegisterView.vue`
- 文档：新增 `design-system.md`，更新 `docs/ui-spec-v1.md` 的当前规范入口与本进度文件

未修改碳核算算法、排放因子、数据库、API 语义、GIS 空间分析逻辑、业务数据、路由或模块。

## U1 完成内容

1. 新增色彩、状态、字阶、行高、间距、圆角、焦点和阴影 Token；辅助文字对比度由约 3.91:1 提升至约 5.05:1。
2. 统一 Element Plus 的暗色状态色、32px 小控件、输入框、表格、Dialog、Drawer、Popover 与遮罩表面。
3. 统一卡片、KPI 数字、表格表头、Loading 与 Empty 状态；Toast 增加读屏状态播报。
4. 新增 ECharts 共享 tooltip、坐标轴、图例和标准系列色；十个视图删除重复 tooltip/轴配置并接入共享实现。
5. 移除本次检索到的 `transition: all`，继续遵守减少动画偏好。
6. 移除 viewport 最大缩放限制，增加暗色 `theme-color` 与 `color-scheme`。

## 检查结果

- `npm run build`：通过。
- `vue-tsc --noEmit`：通过（由 build 脚本执行）。
- Vite 5.4.21：2,939 个模块，生产构建 15.25 秒。
- 主要大包与 U0 基线相同：ECharts 511.49 kB gzip、Element Plus 372.76 kB、Office 259.91 kB；性能分包留到 U4。
- `git diff --check`：无空白错误。
- 未做完整浏览器交互回归或截图；真实浏览器验收按计划集中在 U5。

## 已安装 Skills

- `frontend-design`
- `ui-ux-pro-max`
- `web-design-guidelines`
- `vue-best-practices`
- `vue-router-best-practices`
- `playwright-cli`
- `taste-skill`

GSAP 与 React Bits 仓库没有 `SKILL.md`，未作为 Skill 或项目依赖安装。Taste Skill 的适用范围明确排除密集型 Dashboard，因此 U1 未采用其营销页模式。

## 未解决问题

1. ECharts 和 Element Plus 包体仍较大；进一步拆分需要评估 3D 图表与全局组件注册方式。
2. 已完成浏览器语义、键盘、焦点和减少动画验证；发布前仍可补充 Windows Narrator 或 NVDA 人工读屏走查。
3. 本地 SMTP 和真实 LLM 密钥未配置，未向外部邮箱发送验证码，也未调用付费模型服务。

## 后续建议

1. 在预发布环境配置独立 `AUTH_SECRET_KEY`、正式数据库、SMTP 和可选 LLM 密钥，再执行生产配置验收。
2. 以页面使用清单评估 Element Plus 按需引入，并单独验证 ECharts GL 的拆分收益和兼容性。
3. 由产品负责人复核本轮截图与实际功能描述，再决定是否纳入软著说明材料；本轮没有生成或提交正式申请材料。
