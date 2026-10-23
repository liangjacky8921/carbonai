# CarbonAI V6.0 UI 精修进度

更新：2026-10-21。当前阶段：UI-2 已完成；未提交、未部署。

## UI-1 文案（上一阶段）

- 已修改：`frontend/src/components/landing/LandingProvenance.vue`、`LandingSpatial.vue`、`LandingProduct.vue`、`LandingClosing.vue` 的首页标题、章节标签和示例数据用语。
- 上一阶段 `npm run build` 成功；本阶段保留这些未提交改动，未覆盖或重写。

## UI-2 局部 CSS

- 修改文件：`frontend/src/components/landing/LandingProvenance.vue`、`LandingSpatial.vue`、`LandingProduct.vue` 的 scoped style，以及 `frontend/src/layouts/MainLayout.vue` 的顶栏分割线。
- 数据路径步骤编号、摘要、范围提示等 9–10px 信息字调至 11px；GIS 章节标签、能力编号、预览工具栏与说明调至 11–12px；产品预览栏、功能编号/说明和截图注释调至 11–12px。顶栏分割线从 0.5px 调至 1px。
- 未发现首页同用途截图框的圆角冲突，两处均为直角边框，因此不改圆角。未改 `theme.css` 变量、章节 padding、动效或移动目录；现有移动目录实色背景保留。

## 验证与风险

- `frontend` 目录执行一次 `npm run build`（含 `vue-tsc --noEmit` 与 Vite）：成功。`git diff --check`：无空白错误；Git 的 LF/CRLF 警告仅为工作区换行提示。
- 本地预览 `http://127.0.0.1:4175/`：桌面默认视口约 1264px，检查数据路径章节；390×844 视口检查数据路径、GIS 预览和产品展示。截图中标题、步骤和截图说明可见，未见互相遮挡；`document.documentElement.scrollWidth=382px`，小于 390px 视口。浏览器视口已恢复默认。
- 未执行整站回归或真实手机验证。截图内部分低对比度辅助文字仍沿用原色，本阶段未改色彩。若后续验收发现可读性不足，应单独核对对比度后再调整。
