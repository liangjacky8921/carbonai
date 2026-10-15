# CarbonAI PC 黑屏修复：P3 部署前清单

> 状态：2026-10-15 已获批准并执行；本文件保留为发布前检查记录，实际结果见 [P4 发布记录](./pc-black-screen-p4-release.md)。目标：仅替换 ECS 前端静态产物，保留后端及用户数据。

## 已满足的发布前条件

- [x] P1 修复：`frontend/src/components/landing/LandingProduct.vue`、`LandingClosing.vue` 的 scoped CSS 选择器已限定到第五、六屏，构建产物不再有使首页根节点透明的裸 `.story-enhanced` 规则。
- [x] P2 本地回归：Chrome/Playwright 的 PC 1440×900、1280×800 和手机模拟 390×844 均显示首页；六屏滚动、锚点、CTA 路由、刷新及 WebGL 静态降级通过。真实手机与发布后的生产浏览器尚待验收。
- [x] `frontend/npm run build` 通过（含 `vue-tsc --noEmit`）；`git diff --check` 通过。当前 `main` 为 `9bb6c21`，P1 两个 Vue 文件尚未提交。
- [x] `git diff --name-only` 仅列出上述两个前端文件；未修改 FastAPI、数据库、核算算法、认证、API 地址或 Nginx 配置。`docs/deployment/` 为新增事故与测试记录。

## 目标与版本差异

- 目标环境：阿里云 ECS 上 Nginx 读取的 `/opt/carbonai/frontend/dist`，公网为 `https://www.carbontool.cn/` 与 `https://carbontool.cn/`。
- 当前生产：`index.html` SHA-256 为 `358ceb4df116fd1856ce99d34f90b34f4a466492a9bca3d69cd705d00cae8e5e`，首页样式为 `HomeView-CBvkCfSr.css`；生产 PC 根节点因错误样式 `opacity:0`。服务器源码仓库 HEAD `08af901` 不代表前端静态部署版本。
- 待发布构建：本地 `frontend/dist/index.html` SHA-256 为 `da229c78307cd201773a5eb220f0752f15de38374b66cb2681ccc7d45d5eb06e`，首页样式为 `HomeView-CZHpapzu.css`（SHA-256 `9e7619173b1c2425e922925f1184d10a52fc80af224f1622c4e3b21c847062f2`）。Vite 内容哈希还会改变入口和首页 JS 文件名；应整体发布 `dist`，不能只覆盖单个 CSS。
- 发布前必须重新读取生产首页哈希；若不等于上述基线，先停下复核，不覆盖他人的新版本。

## 批准后的发布步骤（此处仅准备）

1. 冻结待发布构建，记录完整包及 `index.html` SHA-256；再次核对 Git 仅有两处 P1 源码变更。上传构建包到 ECS 独立暂存目录，并在服务器校验包与入口哈希。
2. 将**当时正在服务的** `/opt/carbonai/frontend/dist` 完整保留为 `/opt/carbonai/releases/frontend-dist-<发布时间>-pre-pc-fix`；确认备份完整后才切换。旧的 `frontend-dist-20261014-211752-pre-immersive` 是更早版本，不作为本次首选回滚基线。
3. 在暂存目录核实首页 HTML、引用的 JS/CSS 均存在且新 CSS 无裸 `.story-enhanced` 透明规则；保留旧哈希资源供已打开的页面完成按需加载。随后仅切换前端 `dist` 目录，不修改或重启后端、数据库与 Nginx。
4. 发布后先比较公网首页与待发布 `index.html` 哈希，再检查 `www` 与裸域名：首页 HTTP 200；所有首页 JS/CSS 为 200 且 MIME 正确；`/api/health` 为 200 和 `status:ok`；缺失 JS 仍为 404 而非 SPA HTML。
5. 用真实 Chrome 正常/无痕窗口及手机访问验证首页可见、地球或静态后备、六屏滚动、锚点、登录和工作台入口；检查 Console/pageerror、失败资源请求及工作台真实 API 联通。至少复测 1440×900、1280×800、390×844，并请用户确认受影响 Windows PC 与真实手机。仅 HTTP 200 不算通过。

## 风险与回滚

- 主要风险：目录切换间隙的短时静态资源 404、旧页面按需加载旧哈希资源、受影响 PC 的个人浏览器缓存，以及本地 preview 无 `/api` 代理导致修复版与 ECS 的端到端联通尚未预验。未发现 P1 引入后端或数据计算风险。
- 触发回滚：上线后 PC 仍黑屏、关键资源 404/MIME 错误、六屏或入口失效、工作台真实 API 异常，或公网入口哈希与预期不符。
- 回滚顺序：先将失败的新版 `dist` 移入单独保留目录，再把**本次发布前刚备份的** `frontend-dist-<发布时间>-pre-pc-fix` 恢复为 `/opt/carbonai/frontend/dist`；检查首页入口及资源哈希恢复到发布前值、两域名首页可访问、`/api/health` 正常。Nginx 配置不变，无需重启后端；如目录切换异常，停止进一步操作并检查 Nginx 根目录状态。该回滚恢复的是当前已知 PC 黑屏的旧版，仅用于紧急恢复发布前状态。

**决策门：** 用户已明确回复“批准部署本次 PC 黑屏修复”；执行和验收结果另见 P4 发布记录。
