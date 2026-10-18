# CarbonAI 碳价图与 GBA 分级发布记录

发布日期：2026-10-18（Asia/Shanghai）。范围：A2 碳价图及行情接口、B1 GBA 城市标记。源码提交 `ccb2282` 已推送 `origin/main`；本记录及浏览器证据另行提交。

## 发布与回滚点

- 前端：本地 `npm run build`（含 TypeScript 检查）通过；将 73 个新构建文件及原线上哈希资源发布到 `/opt/carbonai/frontend/dist`。新 `index.html` SHA-256：`e79310071262da7f04ec75e7776def80a8ef5d04531b7f87ce58c0a242e59153`。发布包 SHA-256：`78ee82088a57a8198a764005932d60f93aec62142a5b460616c44b3bebf451b3`。
- 后端：仅更新 `/opt/carbonai/backend/app/routers/business.py`，SHA-256：`c72af03f30edf8948bcd7d8ee9cf7028da57a0fd59e06c13fe28607d093281b7`；重启 `carbonai-api` 后服务为 `active`。没有覆盖服务器其余未提交的后端文件、数据库、环境变量或 Nginx 配置。
- 服务器已备份到 `/opt/carbonai/releases/c1-ccb2282/`：`business.py-before`、`frontend-dist-before` 和原目录 `frontend-dist-pre-switch`。发布前入口哈希为 `25b86feed29f5233dc70e429313a109c456055e6c5767a6d1f08c3fc4661f06a`；后端目标文件哈希为 `168a14a9f3df4114826785c9fd82a24b0fd2c81b69c3487a8bac1a230589f6f1`。

## 验收

- 前端 3 项、后端 3 项碳价局部测试均通过；构建及 `git diff --check` 通过。
- `www` 与裸域名首页、`/dashboard`、`/gis`、`/api/health` 均为 HTTP 200；入口 JS/CSS 为 200 且 MIME 正确。公网 `/api/market/quotes` 返回带原文链接与发布日期的 **2026-10、2026-12 复旦 CEA 价格预期**；没有把 7–10 月缺失的交易实价或 11 月缺失记录补造出来。
- Chrome Headless 1440×900 与 390×844 手机模拟：首页可见；数据大厅图表已绘制，记录来源与接口响应时间可见，无 `undefined`、`NaN`、页面错误或 JS/CSS 失败；GBA 11 城标记存在，红/黄/绿直径为 48/32/18px，点击、城市选择、居中、缩放、图例及无横向溢出均通过。手机模拟不等于真实手机。
- 证据：[结果 JSON](./evidence/c1-ccb2282-production-results.json)、[桌面数据大厅](./evidence/c1-ccb2282-pc-1440-dashboard.png)、[桌面 GIS](./evidence/c1-ccb2282-pc-1440-gis.png)、[手机模拟数据大厅](./evidence/c1-ccb2282-mobile-sim-390-dashboard.png)、[手机模拟 GIS](./evidence/c1-ccb2282-mobile-sim-390-gis.png)。

## 限制与回滚

CEA、CCER 交易实价没有获得本次可核验记录时，走势图保持缺失；复旦价格预期并非成交价。原有其他参考报价仍为快照，不能视为实时交易行情。用户个人浏览器缓存和实体手机待人工确认。

如出现确认的发布回归，先保留故障版前端目录与后端文件；将 `frontend-dist-before` 恢复到 `/opt/carbonai/frontend/dist`，并将 `business.py-before` 恢复到 `/opt/carbonai/backend/app/routers/business.py`，重启 `carbonai-api`。随后核对入口和后端哈希回到上述发布前值，并检查两个域名、行情接口、数据大厅和 GIS。服务器 Git 工作树原本存在未提交生产配置差异，**不要以 `git reset` 或整仓拉取替代这些文件级回滚步骤**。
