# CarbonAI H7 右侧章节导航修复记录

> 日期：2026-10-13  
> 生产地址：<https://www.carbontool.cn/>

## 问题

宽屏或浏览器缩放后，右侧章节导航会常驻显示编号和中文标签，占用较宽的覆盖区域，并可能遮挡 3D 地球、动效按钮或章节内容。

## 修复

- 将右侧导航改为固定在浏览器最右边的 46px 窄轨道。
- 默认只显示 `01–07` 编号，中文标签不再持续占用页面宽度。
- 鼠标悬停或键盘聚焦某个编号时，仅该章节标签向左显示。
- 当前章节继续使用高亮线和亮色编号指示。
- 为每个索引链接补充完整的 `aria-label`。
- 1180px 以下继续隐藏侧边轨道，使用顶部折叠目录。

## 验证

- `npm run build`：通过，2,981 个模块。
- 1530 × 741：轨道位于 `x=1484–1530`，宽度 46px，与视口右边缘对齐。
- 暂停按钮右边界约 1384px，与轨道之间保留约 100px 空间。
- 7 个中文标签默认透明度均为 0。
- 悬停标签透明度为 1，键盘可通过完整名称识别链接。
- 1180px 视口侧边轨道隐藏。
- 本地与生产专项测试均通过，控制台错误为 0。

证据：

- `docs/visual-upgrade/evidence/h7-navigation-rail.cjs`
- `docs/visual-upgrade/evidence/h7-navigation-rail.json`
- `docs/visual-upgrade/evidence/h7-navigation-rail-1530.png`

## 发布

- 上传包 SHA-256：`73ac53b3997820a08b4c35a4d2a32e015d73071beff0d88f236a783094774367`。
- 生产 `index.html` SHA-256：`b25ba3a7f407e6f0487463000004f3e5b86bdb543465e9f06ec48e0ccb2b70e0`。
- 回滚目录：`/opt/carbonai/releases/frontend-dist-20261013-h7-nav`。
- Nginx 配置检查通过，后端 `carbonai-api` 保持 active。
