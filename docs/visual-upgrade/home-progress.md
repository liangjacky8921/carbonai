# CarbonAI 首页视觉升级进度

> 更新日期：2026-10-13

## 当前阶段

- 阶段：H8 ICP 备案信息确认
- 状态：已完成
- 下一阶段：持续监测或独立性能优化

## H8 备案信息确认完成

- 站点主体确认唯一备案信息为“粤ICP备2026140571号”。
- 页脚备案组件固定显示该备案号，不再渲染第二条备案信息。
- 生产浏览器验证：备案链接数量 1、文字和工信部链接正确、页面错误 0。
- 已发布 ECS；回滚目录为 `/opt/carbonai/releases/frontend-dist-20261013-h8-icp-02`。
- 详细记录见 `docs/visual-upgrade/h8-icp-confirmation.md`。

## H7 导航修复完成

- 右侧章节导航缩为贴住视口右边缘的 46px 索引轨道。
- 默认只显示编号；中文标签仅在悬停或键盘聚焦时向左显示。
- 1530px 生产视口中，暂停按钮与导航轨道之间保留约 100px，不再遮挡。
- 1180px 以下继续使用顶部折叠目录。
- 本地和生产专项测试均通过，控制台错误为 0。
- 已发布 ECS；回滚目录为 `/opt/carbonai/releases/frontend-dist-20261013-h7-nav`。
- 详细记录见 `docs/visual-upgrade/h7-navigation-rail-release.md`。

## H6 发布完成

- 本地生产构建打包并校验 SHA-256 后发布到阿里云 ECS。
- 旧前端保留在 `/opt/carbonai/releases/frontend-dist-20261013-h5-01`。
- 新版 `index.html` 生产哈希与本地构建一致。
- `nginx -t`、服务器本机 HTTPS 首页和 `/api/health` 均通过。
- 后端 `carbonai-api` 保持 active，没有重启。
- 公网 Playwright 冒烟：7/7 通过、控制台错误 0、失败响应 0。
- 生产首页、手机首页和 GIS 截图已保存到 `docs/visual-upgrade/evidence/`。
- 详细记录见 `docs/visual-upgrade/h6-ecs-release.md`。

## H5 本轮完成

- 完成 1440×1000、1280×900、768×900、390×844 四个视口的生产构建浏览器复测。
- 修复 768px 顶部导航被压缩成多行的问题：折叠目录断点由 600px 调整为 900px。
- 验证背景动效暂停按钮的状态和文案切换。
- 验证进入 `/dashboard` 后首页及 3D Canvas 卸载，返回首页后只恢复一个 Canvas。
- 验证 390px 手机端不初始化 WebGL，使用静态 SVG 地球。
- 四个视口均无横向溢出，路由往返后控制台错误为 0。
- 完成本地生产预览 5 次 HTML 请求计时，并记录构建产物体积。
- 对当前环境无法可靠测量的 Web Vitals、长时间 FPS、CPU/GPU 内存、后台标签恢复和完全禁用 WebGL 场景明确标为未测。
- 新增最终验收记录 `docs/visual-upgrade/home-acceptance.md`。

## 累计完成

- H0：真实项目、依赖、首页与旧问题审计。
- H1：Natural Earth 点云 3D 地球、动态加载、WebGL/移动端降级、暂停和资源释放。
- H2：七章节编辑式首页结构、真实业务入口、统一标题与间距。
- H3：一次性章节入场、锚点焦点管理、离屏暂停、reduced-motion 与移动端静态降级。
- H4：桌面和手机导航、账户提示、CTA、页脚与备案入口细节。
- H5：四视口、构建、交互、路由生命周期和可测性能验收。

## 本轮修改文件

- `frontend/src/components/landing/LandingPage.vue`
- `docs/visual-upgrade/home-acceptance.md`
- `docs/visual-upgrade/home-progress.md`

## 最终构建结果

- `npm run build`：通过。
- 转换模块：2,981。
- 首页 JS：22.91 KB，gzip 9.47 KB。
- 首页 CSS：25.23 KB，gzip 5.60 KB。
- Three.js 地球块：130.51 KB gzip。
- 地理点数据块：50.11 KB gzip。
- Element Plus 共享块：372.80 KB gzip。
- ECharts 共享块：511.49 KB gzip。

## H5 浏览器结果

| 场景 | 结果 |
| --- | --- |
| 1440 × 1000 | 桌面导航完整；Canvas 1；无横向溢出 |
| 1280 × 900 | 桌面导航完整；Canvas 1；无横向溢出 |
| 768 × 900 | 折叠目录启用；Canvas 1；无横向溢出 |
| 390 × 844 | 折叠目录启用；静态地球；Canvas 0；无横向溢出 |
| 暂停动效 | `aria-pressed=true`，按钮显示“播放背景动效” |
| 路由卸载 | `/dashboard` 中首页和 Canvas 均为 0 |
| 返回首页 | Canvas 恢复为 1，没有重复实例 |
| 控制台 | 错误 0 |

## 本地加载记录

- 生产预览 HTML TTFB：3.53–6.07 ms，中位数约 3.82 ms。
- 总请求时间：3.58–6.13 ms。
- 仅代表本机回环网络，不代表公网性能。

## 剩余风险与限制

- LCP、CLS、INP、长时间 FPS、CPU/GPU 内存和公网表现未在当前工具环境中可靠测量。
- 页面隐藏再恢复与浏览器完全禁用 WebGL 的场景未做运行时实测；相关暂停、回退和释放逻辑已检查。
- Element Plus 与 ECharts 共享块较大，后续按需导入应作为独立优化任务评估。
- 站点主体已确认唯一备案信息为“粤ICP备2026140571号”；公开联系方式仍待提供。

## 发布状态

- ECS 已部署并通过公网验收。
- 源码、验收证据与发布记录已提交并推送到 `origin/main`。
