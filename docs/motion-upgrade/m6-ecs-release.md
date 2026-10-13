# CarbonAI M6 动态视觉升格与 ECS 发布记录

发布时间：2026-10-13（Asia/Shanghai）

## 发布内容

- 在既有 Aurora Carbon 首屏中增加低亮度空间网格，保持单一标志性视觉。
- 桌面精细指针设备增加经过 `requestAnimationFrame` 合并的局部光场响应。
- 移动端不启用指针光场；`prefers-reduced-motion` 下极光、网格均保持静态。
- 页面离屏、浏览器隐藏或用户暂停后，持续动画维持原有停止逻辑。
- 未引入 Vue Bits、GSAP、Three.js、Lenis 或其他新依赖。
- 未修改 API 地址、FastAPI、数据库、认证、核算结果或 Nginx 配置。

## 构建与本地回归

- `npm run build` 通过：2,971 个模块，Vite 构建 15.38 秒。
- 首页异步块：JS 13.73 kB / gzip 5.96 kB，CSS 19.04 kB / gzip 4.53 kB。
- 相比 M5，首页 JS gzip 增加约 0.34 kB，CSS gzip 增加约 0.35 kB。
- M5 Playwright 全量回归重新执行：15/15 通过。
- 未增加运行依赖，`package.json` 和锁文件没有变化。

## ECS 发布

- 入口：`https://www.carbontool.cn`，Ubuntu Nginx。
- 前端目录：`/opt/carbonai/frontend/dist`。
- 后端服务：`carbonai-api`，发布前后保持 active，本次未重启。
- 上传包 SHA-256：`50c80ffdcfd6723cfb67b9caaca903a41d5a05861c4155e12bf5398099464a37`。
- 新版 `index.html` SHA-256：`0446f68c30b09ee87a6980000eb2f0b5ad7c8eeb92d80c4eb3f0cc098bdd90ec`。
- 回滚目录：`/opt/carbonai/releases/frontend-dist-20261013-132106`。
- 发布过程先校验压缩包，再解压到独立暂存目录，保留旧版后切换目录。
- `nginx -t`、服务器本机 HTTPS 首页和 `/api/health` 均通过。

## 生产验收

Playwright 通过 `https://www.carbontool.cn` 执行 5 项只读检查，结果为 **5 通过、0 失败、0 控制台错误、0 失败响应**：

1. 首页 6 个章节、无横向溢出、空间网格存在，指针移动可更新光场位置。
2. 首页暂停控制可停止动效。
3. Dashboard 显示 4 个 KPI 和 6 个 canvas，ECS `/api/health` 返回 200。
4. GIS 地图和缩放控件可见，加载 12 张底图瓦片。
5. 减少动画模式下极光和空间网格均为静态。

证据：

- [`evidence/m6-production-smoke.cjs`](./evidence/m6-production-smoke.cjs)
- [`evidence/m6-production-smoke.json`](./evidence/m6-production-smoke.json)
- [生产首页截图](./evidence/m6-production-home-1440.png)
- [生产 GIS 截图](./evidence/m6-production-gis-1440.png)

## 回滚

若前端静态页面需要回滚，可在 ECS 上将当前 `/opt/carbonai/frontend/dist` 移出并把 `/opt/carbonai/releases/frontend-dist-20261013-132106` 恢复为该目录，然后再次执行 `nginx -t` 和首页/API 健康检查。操作前应另行保留当前版本。

