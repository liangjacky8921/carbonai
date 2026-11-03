# CarbonAI 教师意见与已验收候选版本发布记录

日期：2026-11-03。用户明确批准提交、推送及公网部署。本记录不代表软件著作权材料冻结或申报验收。

## 已发布版本
- 公网：https://www.carbontool.cn/ ；版本证明：https://www.carbontool.cn/release.json 。
- 候选源码提交：`47530c421669159f46574c6fc267efb9c1826264`，已推送原功能分支。
- main发布合并：`29683a01a0b5e14b95a331832de0acc8de1bb974`。合并保留main既有LICENSE及发布文档；经树差异核对，前后端运行源码与已测试候选完全一致。
- 原`v6.0.0`仍为`7c4158cf700597512636fdc156809ece079a83ea`，没有覆盖、重建或移动标签。
- 当前本地分支仍为`feature/carbon-mapper-s4-readiness`，未切换或覆盖未跟踪手册、截图、历史审计与私有材料。

## 发布范围
- 中国区域翡翠绿面、薄荷绿轮廓及点云强调，取代北京定位点；保留旋转、暂停、原点云与静态后备。Natural Earth来源记录随资产README提交。
- 首页主标题缩小，保持文字和三行结构。
- 新增受登录保护的“数据采集与来源管理”：真实JPG/PNG保存、照片预览、时间/说明、地图选点与手输坐标、来源档案、分页记录、所有者核验声明。
- 同步当前已完成的单位、轨迹、LCA、报告、AI鉴权、行情与GIS/网格修复，保持同一个可追溯候选；移除Carbon Mapper运行代码及入口。正式手册、原截图与鉴别PDF未自动更新或上传。

## 构建与发布前测试
- 全部前端78项、隔离后端36项通过；36项后端测试另在服务器独立目录及合成SQLite中通过。
- `vue-tsc --noEmit`与`git diff --cached --check`通过。仅清理一项新测试文件末尾空行，未改变断言。
- Linux独立构建先因约1.7GB内存环境的V8堆不足失败，生产服务保持active；未修改交换分区、系统配置或生产依赖。
- Windows标准`npm run build`最终通过，保留原TypeScript检查、Vite目标和压缩。使用随提交附带的`deploy/esbuild-stdin.cjs`预加载，使esbuild已有的大输入stdin回退替代本机被拒绝删除的临时文件路径；未改第三方库、未关闭系统防护。
- 若同一Windows环境需要重建，可将该脚本的绝对路径（使用正斜杠并加引号）放入`NODE_OPTIONS=--require=".../deploy/esbuild-stdin.cjs"`，仅在本次构建进程使用；常规环境无需此兼容措施。
- 构建输出78项文件；入口SHA256：`21258a148a8ded02f8ab3bde3d9975a8a70dacc8f229f3a6f85e932d29398ef6`。

## 生产保护与实际操作
- 先确认线上active及五个未提交文件。线上auth/business与本地修复前HEAD逐字一致，db.py/factors.py与当前候选一致，因此没有盲目覆盖独立生产改动。
- 在`/var/backups/carbonai/teacher-20261103-prepublish/`保留全项目归档、配置、systemd单元和SQLite在线一致性备份；根目录700、备份600，四项哈希与归档读取通过，数据库`integrity_check=ok`。备份及密钥不进入GitHub或静态站点。
- 文件级更新main、auth、business、requirements；加入accounting_units及采集模型/路由。保留线上db.py、factors.py、现有数据库记录、环境变量、systemd和Nginx配置。
- 新增`collection_sources`与`collection_records`两个表，先在备份副本验证再显式创建；没有迁移或重写既有表、记录或因子。真实生产架构仍为SQLite，并非已迁移PostgreSQL/PostGIS。
- 私有照片目录`/opt/carbonai/backend/var/collection`权限700，照片通过所有者Bearer鉴权接口读取，不放入公网静态目录。
- 前端目录切换前保留原目录，保留旧哈希assets供已打开页面继续读取；随后重启现有`carbonai-api`，服务active，健康检查通过。
- 生产Git工作树依旧保留原`08af901`及文件级生产修改，不以Git HEAD冒称新部署版本；新版本以release.json、构建入口和后端文件哈希交叉证明。

## 公网验收
- www与裸域首页返回200，公网HTML SHA256与已验证产物一致；入口JS/CSS状态200且MIME正确。
- Chrome headless 1440×900：真实渲染中国区域高亮、原3D Canvas与暂停按钮、标题；工作台及新增菜单可见。
- 390×844手机模拟：首页静态区域高亮、标题及按钮可见，文档宽度390px无横向溢出；桌面reduced-motion后备通过。
- 未登录进入采集模块会跳转既有登录入口；采集列表和AI聊天匿名请求均401；删除的Carbon Mapper API为404。
- 本轮公网浏览器pageerror 0、失败JS/CSS响应0；后端9个运行/依赖文件SHA256与本地候选逐字一致，数据库完整性ok；付费AI开关确认关闭。
- 结构化证据：同目录`evidence/teacher-20261103/`中的production-results.json、public-hash-check.json、backend-hashes.json、server-final-check.json。内部截图、完整日志与私有备份未自动公开。

## 回滚
- 已保留可运行脚本：`sudo python3 /var/backups/carbonai/teacher-20261103-prepublish/rollback.py`。
- 脚本确认当前仍为本次发布后，恢复四个既有后端文件及原前端目录，再重启原服务。保留新表、采集原件与新增未引用文件，避免丢失发布后用户资料；不恢复过时数据库覆盖新数据。
- 原前端：`/opt/carbonai/releases/teacher-20261103-candidate/frontend-dist-before-switch`；后端原件：私有备份下`files-before/`。
- 回滚脚本已做语法检查并保存，**没有为演练而执行线上回滚**。执行后需重验首页、登录、健康状态及原入口哈希。

## 仍需人工验收
- 真实iOS/Android、个人浏览器旧缓存及真实账号在生产上传后的业务验收未自动执行；没有创建生产测试账号、访问真实用户档案或上传企业照片。
- 上传、跨用户隔离、原件读回和事务失败清理已在本地及服务器隔离数据库验证；不把这些测试称为实际生产用户操作通过。
- 外部底图的地域可用性、真实照片授权、归档/备份周期、长期磁盘额度及正式申报材料更新仍需负责人确认。未进行全站Lighthouse或虚报性能数值。
