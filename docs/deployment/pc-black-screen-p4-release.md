# CarbonAI PC 黑屏修复：生产发布记录

> 发布时间：2026-10-15（Asia/Shanghai）；用户已明确批准。范围仅为前端静态文件。

## 发布内容与回滚点

- 源码变更：`frontend/src/components/landing/LandingProduct.vue`、`LandingClosing.vue` 的 CSS 选择器作用范围修正。S1–S6 页面结构、地球、业务功能、API 地址未改。
- 待发布包：`carbonai-pc-fix-20261015-203128.tar.gz`，SHA-256 `862935baf81720d38161354f799e228cec0ca1e68f5bd9c2317b54a9a4d47421`；服务器暂存解包后入口与首页样式哈希均校验通过。
- 发布前入口 SHA-256：`358ceb4df116fd1856ce99d34f90b34f4a466492a9bca3d69cd705d00cae8e5e`；发布后：`da229c78307cd201773a5eb220f0752f15de38374b66cb2681ccc7d45d5eb06e`。新首页样式 `HomeView-CZHpapzu.css` 的 SHA-256 为 `9e7619173b1c2425e922925f1184d10a52fc80af224f1622c4e3b21c847062f2`。
- 生产目录：`/opt/carbonai/frontend/dist`。**本次首选回滚目录：** `/opt/carbonai/releases/frontend-dist-20261015-203128-pre-pc-fix`，其中 `index.html` 哈希已验证为发布前值。旧哈希资源也保留在新 `dist/assets` 中，以照顾已打开的页面。
- 没有更改/重启 FastAPI、数据库、Nginx、ECS 安全设置；`carbonai-api` 发布前后均为 `active`，`nginx -t` 通过。未提交或推送 GitHub；本地两处 P1 源码仍为未提交修改。

## 发布后验收

| 项目 | 结果 |
| --- | --- |
| HTTP 与资源 | `www` 与裸域名首页 200；公网入口 SHA-256 与待发布包相同；新入口 JS、首页 JS/CSS 及公共 JS/CSS 200，类型为 `application/javascript` 或 `text/css`；不存在的 JS 返回 404；`/api/health` 返回 200。 |
| PC 1440×900、1280×800 | Chrome/Playwright 首页根节点 `opacity:1`，标题和 CTA 可见；六屏逐节滚动、锚点、工作台入口、刷新均通过，无横向溢出或阻断性页面错误。3D 地球资源加载完毕后 Canvas 1。 |
| 手机模拟 390×844 | 首页、六屏、锚点、工作台入口与刷新均通过；静态地球按设计展示。真实手机尚待人工确认。 |
| WebGL 不可用 | 隔离浏览器阻止 WebGL 上下文创建后，地球进入静态后备，首页仍可见。 |
| 登录与 API | 登录页可打开且有表单输入项；生产浏览器进入工作台后 `/api/health` 返回 200，未见阻断性 JS 错误。 |

证据：[三视口浏览器数据](./evidence/p4-production-results.json)、[PC 1440 截图](./evidence/p4-production-pc-1440.png)、[PC 1280 截图](./evidence/p4-production-pc-1280.png)、[手机模拟截图](./evidence/p4-production-mobile-sim-390.png)。

## 仍需注意

- 首次点击进入工作台的一次生产 Chrome 测量约 **20 秒**：大型图表脚本下载较慢；原 10 秒验收脚本因此误报超时。延长等待后路由正常显示且没有 Console 错误。这是性能待办，不是本次黑屏修复失败；未在紧急修复中扩大改动范围。
- 首屏截图拍摄较早，PC 可能暂时显示静态地球；后续专项检查确认 3D Canvas 可正常出现。真实用户 Windows PC 的个人缓存及真实手机尚未自动验证。
- 已上传但尚未推送 GitHub。生产前端静态版本与服务器源码仓库 HEAD 分离，后续应补齐版本追踪记录，避免以服务器 Git HEAD 判断前端发布版。

## 回滚（如发布后出现关键故障）

先保留当前新版 `dist` 到新的事故目录，再将 `/opt/carbonai/releases/frontend-dist-20261015-203128-pre-pc-fix` 恢复为 `/opt/carbonai/frontend/dist`；核查入口 SHA-256 回到 `358ceb4d…e8e5e`，两域名首页与 `/api/health` 正常。此回滚会恢复旧版 PC 黑屏，仅适用于紧急恢复发布前状态；不要改动后端或数据库。
