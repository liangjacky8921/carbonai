# CarbonAI U5 浏览器验收摘要

> 验收日期：2026-10-12（Asia/Shanghai）
> 环境：Vite 5.4.21 生产预览、Chromium、Playwright CLI
> 范围：U2–U4 修改后的前端交互、响应式、可访问性、图表和导出流程

## 结论

U5 前端浏览器验收通过。14 个主要路由均可打开，桌面端和移动端未发现页面级横向溢出；主要图表、GIS 地图瓦片、报告生成、产品碳足迹计算、数据上传、清空确认及 PDF/Word 下载均按预期工作。

本地验收未启动 FastAPI 后端，因此 `/api/health` 返回 HTTP 500，界面按既有逻辑显示“离线”。除该环境限制外，浏览器控制台未发现应用 JavaScript 异常或警告。

## 覆盖范围与结果

| 项目 | 验收内容 | 结果 |
| --- | --- | --- |
| 路由 | Dashboard、核算、因子库、GIS、轨迹、电网、土壤、污水、资产、PCF、报告、工具、登录、注册 | 通过 |
| 视口 | 375、768、1280、1440px；另用 393px 粗指针设备参数复核 | 通过 |
| Dashboard | 6 个图表、顶栏、移动导航、页面宽度 | 通过 |
| GIS | 地图容器、12 个地图瓦片、375/1280px 自适应 | 通过 |
| PCF | 加载演示数据、2 个结果图表、PDF/Word 按钮状态与真实下载 | 通过 |
| 报告 | 12 个模板按钮、一键生成、历史记录、预览滚动 | 通过 |
| 工具 | 计算结果显示 | 通过 |
| 数据上传 | CSV 文件选择、用户数据状态与合计显示 | 通过 |
| 清空确认 | 取消后保留用户数据；确认后切回示例数据 | 通过 |
| 键盘 | 首次 Tab 聚焦“跳到主要内容”链接 | 通过 |
| 减少动画 | `prefers-reduced-motion: reduce` 下动画时长降至 0.001ms | 通过 |
| 触控 | 粗指针环境首个操作按钮高度 44px | 通过 |
| 登录表单 | 用户名与密码 autocomplete 属性 | 通过 |
| 首屏请求 | 未导出前不请求 html2canvas、jsPDF、docx 或 office 合包 | 通过 |

## 响应式记录

- 1280px Dashboard：`scrollWidth = 1280`，6 个 canvas。
- 375px Dashboard：`scrollWidth = 375`，6 个 canvas；窄屏导航仅显示图标。
- 393px 粗指针环境：`pointer: coarse = true`，首个按钮高度 44px。
- 1280px GIS：`scrollWidth = 1280`，地图已显示并加载 12 个瓦片。
- 375px GIS：`scrollWidth = 375`，地图容器宽 293px。

## 导出证据

- `pcf-test-export.pdf`：344,450 字节。
- `pcf-test-export.docx`：8,923 字节。
- 下载时建议文件名包含产品名、虚拟数据标识和日期，结果区域在导出后保持可见。

## 已知限制与后续项

1. ECharts 与 Element Plus 仍是主要前端大包；当前保留现有 3D 图表及全局组件能力。
2. 可访问性完成键盘、语义快照、焦点、触控尺寸和减少动画验证；完整读屏软件人工走查仍可在发布前补充。
3. 本地 SMTP 和真实 LLM 密钥未配置；验证码使用开发日志通道，AI 顾问按既有设计回退本地知识库。

## 全栈补充验收

继续执行阶段启动了 FastAPI、Vue 开发服务和模拟监测 SSE 服务，并使用隔离 SQLite 数据库完成以下验证：

| 接口或流程 | 结果 |
| --- | --- |
| `/api/health` | HTTP 200，V6.0.0 |
| 示例数据集 | HTTP 200，7 组 |
| 排放因子库 | HTTP 200，22 项 |
| 验证码、注册、登录、用户信息 | HTTP 200，统一响应 code 200 |
| CSV 排放核算 | HTTP 200，解析 1 条记录 |
| 后端 PDF 报告 | HTTP 200，`application/pdf`，3,619 字节 |
| Vue 登录页面 | 真实后端登录成功，显示“后端已连接”和测试用户 |
| GIS SSE | 7 秒内生成 1 个实时 Leaflet 点位，控制台 0 error |
| 单机托管 | `/`、`/dashboard`、`/gis` 均返回 SPA HTML；不存在的静态资源仍返回 404 |

全栈验证期间修复了三个实际问题：应用启动未自动创建认证表、前端 `dist` 路径多出一层 `backend`、Vue 深层路由刷新返回 404。修复后已复测通过。

## 证据文件

- `dashboard-1440.png`、`dashboard-1280.png`、`dashboard-768.png`、`dashboard-375.png`
- `gis-1280.png`、`gis-375.png`
- `pcf-result-1280.png`、`report-1280.png`、`login-375.png`
- `route-audit.js`、`interaction-audit.js`、`export-audit.js`
- `backend-integration-audit.py`、`sample-upload.csv`
- `pcf-test-export.pdf`、`pcf-test-export.docx`、`backend-test-report.pdf`
- `gis-online-1280.png`
