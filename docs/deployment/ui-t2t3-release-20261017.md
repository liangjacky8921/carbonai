# CarbonAI T2/T3 工作台 UI 上线记录

发布日期：2026-10-17（Asia/Shanghai）

## 发布范围与版本

- 源码提交：`6c1b59c`（`main`，已推送 `origin/main`）。包含数据大厅及内部页面的 T2/T3 UI、来源标签、空/错状态、移动布局与验收文档。
- 只部署 `frontend/dist` 到阿里云 ECS 的 `/opt/carbonai/frontend/dist`；没有修改 FastAPI、数据库、核算公式、API 地址、认证守卫、Nginx 配置或安全组，没有重启后端。
- `npm run build` 通过：`vue-tsc --noEmit` 与 Vite，2993 个模块，约 21.68 秒。
- 上传包：`/opt/carbonai/releases/carbonai-ui-6c1b59c.tar.gz`，SHA-256 `c2be5a8ccc85fe61eb3a27cb3f03d35211fcc65644c65687cf7d30bb45793b2c`；暂存解包 73 个文件，与本地文件数一致。
- 入口 `index.html` 发布前 SHA-256：`da229c78307cd201773a5eb220f0752f15de38374b66cb2681ccc7d45d5eb06e`；发布后和公网：`25b86feed29f5233dc70e429313a109c456055e6c5767a6d1f08c3fc4661f06a`。
- **本次首选回滚目录：** `/opt/carbonai/releases/frontend-dist-pre-ui-6c1b59c`，入口哈希已核对为发布前值。切换前将旧哈希资源复制到新 `assets`，供已打开旧页面继续按需加载。

## 发布后检查

| 检查 | 结果 |
| --- | --- |
| 服务器 | `nginx -t` 通过，`carbonai-api` 仍为 `active`。 |
| 域名与路由 | `https://www.carbontool.cn/`、`https://carbontool.cn/`、`/dashboard`、`/gis` 均返回 HTTP 200；公网入口与新包哈希一致。 |
| 静态资源 | 入口 JS、Element Plus JS、全局 CSS、数据大厅和 GIS 的 JS/CSS 抽查均为 HTTP 200，MIME 为 `application/javascript` 或 `text/css`；不存在的 JS 为 404。 |
| API | `/api/health` 为 HTTP 200、JSON；未把健康检查当作全部业务 API 的证明。 |
| 真实浏览器渲染 | Chrome Headless 检查 1440×900、1280×800 首页及 390×844 手机模拟首页，六屏均存在、标题可见、无横向溢出；桌面与手机模拟数据大厅各有 6 个图表 Canvas，GIS Leaflet 容器和登录表单可见。 |
| 页面错误 | 本次自动化检查未记录阻断性 Console/pageerror 或失败的 JS/CSS 请求。数据大厅一次 `/api/health` 请求在测试关闭页面时显示 `ERR_ABORTED`；独立健康检查为 200，未据此认定业务接口故障。 |

证据：[浏览器结果](./evidence/ui-6c1b59c-production-results.json)、[PC 首页](./evidence/ui-6c1b59c-pc-1440-home.png)、[PC 数据大厅](./evidence/ui-6c1b59c-pc-1440-dashboard.png)、[手机模拟数据大厅](./evidence/ui-6c1b59c-mobile-sim-390-dashboard.png)。自动化脚本见同目录 `ui-6c1b59c-production-smoke.cjs`。

## 限制与后续核对

- Headless Chrome 本次显示了可用的**静态地球后备**；真实 Windows PC 的 WebGL 地球、个人缓存状态及实体手机需用户在设备侧确认。
- 登录表单可打开；未使用生产账号进行注册、登录或报告导出，也未上传真实企业数据。市场、因子、污水厂资料和 GIS 示例数据的来源授权仍按 T3-6 报告逐项核实。
- 数据大厅首次加载期间会出现加载占位和数字递增；验收等待六张图表绘制后记录。生产客户端 Web Vitals、长期 CPU/GPU 负载未测。
- 个别浏览器会在健康探测尚未完成时短暂显示“后端离线”；生产 `/api/health` 独立请求成功，若用户设备持续显示离线，应另行检查客户端网络和探测时序。

## 回滚

如出现确认的关键回归，先保留故障版 `/opt/carbonai/frontend/dist` 到新的事故目录；将 `/opt/carbonai/releases/frontend-dist-pre-ui-6c1b59c` 恢复为 `/opt/carbonai/frontend/dist`。核对入口 SHA-256 回到 `da229c…05e6`，并检查两个域名首页、数据大厅、GIS、关键 JS/CSS 与 `/api/health`。静态文件回滚不需改动后端、数据库或 Nginx 配置。
