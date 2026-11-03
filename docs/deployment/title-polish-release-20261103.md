# 首页字体与可见标注精修发布记录

2026-11-03；用户已审核后明确批准提交及公网部署。

## 版本与范围
- 公网：https://www.carbontool.cn/ ；版本元数据：https://www.carbontool.cn/release.json 。
- 源码提交：`a0c741d58baf2e8694c91a7b6430941078501f97`，已推送原功能分支。
- main发布合并：`4c84cbb28a800687a3d211f954995b21a25652c8`；运行代码相对上轮仅以下3项差异。
- `frontend/src/components/landing/PointCloudGlobe.vue`：删除可见“中国区域 · 地理示意”及专用CSS，保留区域高亮、旋转、点云与无障碍说明。
- `frontend/src/components/landing/LandingPage.vue`：六处首页主标题沿用Hero字体栈，统一字号clamp(34px,4vw,58px)、500字重、1.23行高与-0.045em字距；不更改正文、按钮、背景或GSAP。
- `frontend/tests/teacherFeedback.test.mjs`：同步既有检查的标题尺寸依据及可见标注移除检查。
- 原`v6.0.0`仍为`7c4158cf700597512636fdc156809ece079a83ea`。未切换本地分支、未覆盖未跟踪手册及其他申报材料。

## 验证
- 发布前78项前端测试、TypeScript检查、标准Vite压缩构建及git diff检查通过；Windows沿用已记录的esbuild stdin兼容预加载。
- 复用同一已审核构建，78项产物，入口SHA256：`3466de82cc4bb4ea0f06500b6f07fb4227aa634210e57877300e12d305e06d2e`。
- 公网HTML哈希与产物一致；入口JS/CSS为200且MIME正确。
- Chrome headless真实公网：1440px各主标题57.6px、1280px均51.2px、390px均34px，字体栈/字重/行高一致，标题及文档无横向溢出。
- 可见标注已删除，原H1文字与断行保留；reduced-motion后备正常，pageerror 0，后端健康状态ok。
- 手机为390×844模拟，未冒称真实iOS测试；本次未进行全站性能评分或真实用户数据操作。

## 发布方式与保护
- 先核对上一版入口及release.json，将原前端完整复制到`/opt/carbonai/releases/title-polish-20261103/frontend-dist-before`。
- 追加27个新哈希资源、保留旧资源；确认无未版本化静态资源变化后，原子替换index.html及release.json。
- 后端9项运行/依赖文件、环境配置及systemd单元发布前后哈希一致，服务PID未变、没有重启；未访问或修改数据库。
- 结构化证据保存在同目录`evidence/title-polish-20261103/`；截图及完整本地日志保留本机，不自动公开。

## 回滚
- `sudo python3 /opt/carbonai/releases/title-polish-20261103/rollback.py`。
- 脚本核对当前仍是本次版本后，恢复备份的index.html与release.json；旧哈希资源仍在，不需重启后端，不触碰数据库或采集照片。
- 已做脚本语法检查，未为演练而实际回滚生产。执行后须重新验证入口哈希、页面与健康状态。

本次仅发布已审核的首页精修，不构成新软著版本冻结。
