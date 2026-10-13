# 动态视觉资源与许可证核验

核验日期：2026-10-13。以下均为候选资源，不代表已引入依赖。

| 资源 | 官方资料 / 安装方式 | 版本核验 | 许可证 | 本阶段决策 |
|---|---|---|---|---|
| Vue Bits | [README](https://github.com/DavidHDev/vue-bits)、[Aurora 文档](https://vue-bits.dev/backgrounds/aurora)，官方按组件使用 jsrepo | GitHub latest release 无结果，不能当作版本号 | [MIT + Commons Clause](https://github.com/DavidHDev/vue-bits/blob/main/LICENSE.md)：允许作为网站/产品的一部分使用，限制组件本身销售、许可或再分发，需保留版权许可 | 已查阅；文档为客户端渲染，未取得可核验安装命令，不执行猜测的命令。采用自研 CSS，不复制 shader 或组件 |
| Lenis | [README](https://github.com/darkroomengineering/lenis)，npm i lenis | GitHub latest v1.3.26 | MIT | 仅候选 M2；原生滚动足以验证，不安装 |
| TresJS | [README](https://github.com/Tresjs/tres)、[安装指南](https://docs.tresjs.org/getting-started/installation) | npm `@tresjs/core` 5.9.3；peer `three` 最新 0.186.1（2026-10-13） | [MIT](https://github.com/Tresjs/tres/blob/main/LICENSE) | M4 已评估并取消：装饰收益不足以覆盖新增 Three.js、依赖、Vite 配置和 WebGL 生命周期成本；详见 [m4-spatial-decision.md](./m4-spatial-decision.md) |
| VueUse | [README](https://github.com/vueuse/vueuse)，npm i @vueuse/core | GitHub latest v15.0.0 | [MIT](https://github.com/vueuse/vueuse/blob/main/LICENSE) | 当前 package.json 未直接依赖；几项监听使用 Vue 和浏览器原生 API，无需新增 |

GitHub latest release 和 npm 版本可能不同，正式安装前必须重新核验具体包及锁文件。没有下载完整库，没有执行第三方安装脚本，package.json / package-lock.json 未修改。

本次视觉：独立编写 CSS 渐变、内联 SVG 纹理与抽象等高线，无外部图片、字体或模型。使用既有 Vue 3.5.42（MIT）及 Vite 构建工具。新增 AI 辅助开发记录仅描述本次真实行为，不追溯伪造开发过程。

评审依据：[Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md)，重点应用暂停、减少动画、语义导航、焦点、触控目标和避免 CLS。
