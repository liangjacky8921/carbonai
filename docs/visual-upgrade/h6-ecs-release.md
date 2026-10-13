# CarbonAI 首页视觉升级 H6 ECS 发布记录

> 发布时间：2026-10-13（Asia/Shanghai）
> 生产地址：<https://www.carbontool.cn/>

## 发布内容

- Aurora Carbon 首页与绿色点云 3D 地球。
- 七章节产品叙事、环境业务入口与 GIS 空间能力展示。
- 桌面、平板和手机导航与响应式布局。
- reduced-motion、手机静态地球和 WebGL 失败回退。
- 首页动效暂停、离屏暂停以及 3D 场景卸载和资源释放。
- 工作台公开浏览与账户功能提示。

本次只发布前端静态文件，没有修改 API 地址、FastAPI、数据库、认证、Nginx 配置或服务器安全组，也没有重启后端服务。

## 构建与发布包

- `npm run build`：通过，2,981 个模块。
- 上传包：`carbonai-home-h5-20261013-01.tar.gz`。
- 上传包 SHA-256：`e51947c422e59f3ad2101cd90e9e183768d28ee02e43b3b0d37fa3dce8e83c7c`。
- 生产 `index.html` SHA-256：`3a87815b20e23655c7d0211047436eafdb16b2d294f9671b9742932135d1e290`，与本地构建一致。

## ECS 切换

- 生产前端目录：`/opt/carbonai/frontend/dist`。
- 回滚目录：`/opt/carbonai/releases/frontend-dist-20261013-h5-01`。
- 压缩包上传后先校验 SHA-256，再解压到独立暂存目录。
- 切换前后 `nginx -t` 均通过。
- 服务器本机 HTTPS 首页和 `/api/health` 均通过。
- `carbonai-api` 发布前后保持 `active`，没有重启。

## 公网验收

Playwright 使用 Chrome 对生产环境执行 7 项只读检查，结果为 **7 通过、0 失败、0 控制台错误、0 失败响应**：

1. 首页标题、7 个章节、登录入口、横向布局和 3D 地球。
2. 首页背景动效暂停与按钮状态。
3. 工作台 4 个 KPI、6 个 Canvas 和 ECS API 健康状态。
4. GIS 地图、缩放控件和 12 张已加载瓦片。
5. 登录页面表单入口。
6. 390px 手机端静态地球与折叠目录。
7. reduced-motion 下静态地球、Aurora ribbon 和网格停止动画。

证据：

- `docs/visual-upgrade/evidence/h6-production-smoke.cjs`
- `docs/visual-upgrade/evidence/h6-production-smoke.json`
- `docs/visual-upgrade/evidence/h6-production-home-1440.png`
- `docs/visual-upgrade/evidence/h6-production-home-390.png`
- `docs/visual-upgrade/evidence/h6-production-gis-1440.png`

## 回滚

如需回滚，先将当前 `/opt/carbonai/frontend/dist` 移至新的保留目录，再将 `/opt/carbonai/releases/frontend-dist-20261013-h5-01` 恢复为 `/opt/carbonai/frontend/dist`，随后执行 `nginx -t`、重载 Nginx，并重新检查首页和 `/api/health`。

## 发布后信息确认

- 站点主体随后确认唯一备案信息为“粤ICP备2026140571号”。
- 仓库没有可核实的公开联系方式，本次未添加邮箱或电话。
- 公网 LCP、CLS、INP 和长期 GPU 数据尚未形成可靠测量记录。
