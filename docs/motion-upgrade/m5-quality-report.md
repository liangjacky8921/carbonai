# CarbonAI V6.2 M5 性能与质量验收

更新：2026-10-13（Asia/Shanghai）

## 结论

本地正式构建与自动化回归通过。Playwright 共执行 15 项检查，结果为 **15 通过、0 失败**。首页在 1440×1000、1280×900 和 375×812 下无页面横向溢出，6 个滚动章节均成功进入可见状态；Dashboard、GIS、减少动画、WebGL 不可用、页面隐藏/恢复与路由往返均通过。

本结果来自本机 Chrome 154、Vite 正式预览和 loopback 网络，不代表生产环境真实用户 Core Web Vitals，也不构成生产部署批准。

## 构建与资源

- `npm run build` 通过，包含 `vue-tsc --noEmit`；本轮实测 46.26 秒。
- M5 没有修改产品运行时代码或增加依赖，构建资源与 M4/M3 最终实现一致。
- 首页异步块：JS 14,373 B / gzip 5,620 B；CSS 17,554 B / gzip 4,185 B。
- Dashboard 异步块：JS 13,614 B / gzip 5,571 B；CSS 3,457 B / gzip 1,087 B。
- 主入口 JS：98,028 B / gzip 38,525 B；全局 CSS：403,907 B / gzip 61,671 B。
- 当前主要体积仍来自 ECharts 1,643,810 B / gzip 511,487 B 和 Element Plus 1,171,533 B / gzip 372,802 B。M5 未为压缩数字删除业务依赖。

完整资产清单保存在 `evidence/m5-quality-check.json`。

## 浏览器回归

### 首页和动效

- 1440、1280、375 三档视口均通过：文档宽度等于视口宽度，滚动章节 6/6 可见。
- 极光暂停、恢复、离开首屏暂停、回到首屏恢复通过。
- 合成 `visibilitychange` 检查通过：隐藏时停止，重新显示时恢复。
- `prefers-reduced-motion: reduce` 下，极光停止、装饰动画关闭、页面滚动恢复为 `auto`，章节内容直接显示。
- 首页不创建 canvas；禁用 WebGL 后标题、入口和页面交互仍正常。

### Dashboard

- 4 个 KPI、6 个数据图表和异常洞察正常显示。
- 行情暂停按钮的 `aria-pressed` 和实际 CSS 播放状态一致。
- 375px 缩放后无页面横向溢出，图表实例仍保留。
- WebGL 不可用时，页面主内容、4 个 KPI 和非 3D 图表继续显示；未出现 WebGL 相关控制台异常。

### GIS 与生命周期

- Leaflet 容器、地图缩放、热力图模式和 40 个内置示例点位通过。
- Dashboard 与 GIS 往返 2 轮后，Dashboard canvas 数量保持一致，GIS 始终只有 1 个地图容器。
- 高德底图为外部网络资源。路由切换时记录到 22 个 `net::ERR_ABORTED`，均是离开 GIS 时取消仍在加载的瓦片请求；覆盖层、缩放控件和热力点已通过。该样本不能证明不同生产网络下的底图可用性。

## 性能样本

| 项目 | 本地样本 | 解释 |
| --- | ---: | --- |
| 首页首次 LCP | 444 ms | 新浏览器上下文、loopback、无节流 |
| 首页首次 CLS | 0 | PerformanceObserver 样本 |
| 首页首次传输 | 486,395 B | 浏览器 `transferSize` 汇总 |
| 首页 DCL / load | 237 / 248 ms | 本地导航计时 |
| Dashboard LCP | 396 ms | 同一上下文的路由导航，不是冷启动 |
| Dashboard CLS | 0 | PerformanceObserver 样本 |
| Dashboard 最长任务 | 217 ms | 2 个 long task，图表初始化阶段仍有优化空间 |
| Dashboard 事件耗时样本 | 56 ms | Event Timing 诊断值，不等同于 INP |
| 首页 2 秒 RAF | 289 回调，平均间隔 6.94 ms，最大 10.7 ms | 无大于 34 ms 的间隔；不是 GPU FPS |
| 首页 TaskDuration 增量 | 0.0925 s / 2 s | Chromium Performance 诊断值，不是系统 CPU 百分比 |
| 首页 JS heap | 4,172,144 B | 单点样本 |
| 两轮路由后 JS heap | 52,901,408 B | 含 ECharts、Leaflet 与业务模块；不能据此单独判定泄漏 |

在本地无节流条件下，测得 LCP 和 CLS 低于参考目标。**INP、真实 CPU 百分比、GPU 内存、生产网络 LCP 与长期内存趋势未测**，因此不声明这些指标已经达标。

## 错误与环境限制

- 意外 HTTP 4xx/5xx：0。
- 本地后端未启动，共记录 8 次 `/api/health` 404；与页面已有离线示例数据状态一致。
- 8 条通用资源 404 控制台消息与上述健康检查一一对应。
- GIS 外部瓦片请求在路由离开时被浏览器取消，已单独记录，未计作应用资源错误。

## 证据

- 自动化脚本：[`evidence/m5-quality-check.cjs`](./evidence/m5-quality-check.cjs)
- 完整结构化结果：[`evidence/m5-quality-check.json`](./evidence/m5-quality-check.json)
- 首页：[1440px](./evidence/m5-home-1440.png) · [1280px](./evidence/m5-home-1280.png) · [375px](./evidence/m5-home-375.png)
- 工作台与 GIS：[Dashboard](./evidence/m5-dashboard-1280.png) · [GIS](./evidence/m5-gis-1280.png)
- 减少动画：[截图](./evidence/m5-reduced-motion.png)

上述 5 类截图已人工打开复核。未发现文字遮挡、页面横向溢出、图表缺失或 GIS 控件不可操作问题。

## 后续建议

1. 在接近生产的网络和设备上采集真实 LCP、INP、CLS；当前本地结果只能作为回归基线。
2. 若继续做性能专项，优先拆分 ECharts/Element Plus 使用范围，并分析 Dashboard 图表初始化产生的 217 ms 长任务。
3. 部署前连接受控后端测试环境，复测健康检查、真实 API、认证和数据刷新。
4. 对高德底图做独立网络与授权检查，确认生产域名、并发和服务条款适配。

