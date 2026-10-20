# S4 — Carbon Mapper 上线阻断项收口与受控预览判断

日期：2026-10-20（北京时间）。**结论：代码侧收口完成；目前不允许启用受控预览，更不允许公开或生产部署。**默认开关仍为关闭。未检测到可确认是新取得的服务端 API Token，因此没有进行真实接口联调。

## 范围与依据

依据 `S3_5_PRELAUNCH_REVIEW.md` 的阻断项，复核 [Carbon Mapper Terms（当前页面标为 2026-01-13）](https://carbonmapper.org/terms) §3.1–3.5、§5.1及[官方数据与开发者页](https://carbonmapper.org/data)。当前项目按负责人所述为免费个人／高校研究展示；该事实不自动覆盖未来商业用途或公开再分发。未采用聊天中曾暴露的任何 Token，未读取或输出真实凭据。

## 本阶段修改文件与技术决策

| 文件 | 修改 |
| --- | --- |
| `backend/app/main.py` | 仅对 `/api/observations/carbon-mapper` 及其详情路径的成功与错误响应设置 `Cache-Control: no-store`、`Pragma: no-cache`、`Vary: Authorization`。不改变其他 API。 |
| `backend/app/routers/carbon_mapper.py` | 复用平台签名会话及用户表，增加现有用户 ID 白名单；开关、上游 Token 或白名单缺失均拒绝服务。匿名/无效会话返回 401，未授权账户返回 403。请求通过前扣减账户额度。 |
| `backend/app/carbon_mapper.py` | 保留每进程每分钟最多 10 次上游请求，新增每账户每分钟最多 6 次的本地额度；8 秒上游超时与无观测缓存沿用 S2。 |
| `backend/.env.example` | 增加默认关闭的 `CARBON_MAPPER_ENABLED=false`、空的服务端 `CARBON_MAPPER_API_KEY` 和空的 `CARBON_MAPPER_ALLOWED_USER_IDS` 示例；未写入真实密钥或用户 ID。 |
| `frontend/src/api/carbonMapper.ts` | 观测列表/详情仅发送已有平台登录会话；Carbon Mapper 上游 Token 不进入浏览器。无模拟数据回退。 |
| `frontend/src/views/GisView.vue`、`frontend/src/components/gis/RemoteObservationPanel.vue` | 说明受控访问，区分未登录、未授权、额度用尽及详情失败；保留“离散观测”“质量未知”“排放率暂无数据”等原有边界。 |
| `frontend/src/views/CarbonMapperDataUseView.vue`、`frontend/src/router/index.ts`、`frontend/src/components/IcpRecord.vue` | 增加网站级数据使用说明，并在首页／工作台共享页脚提供入口。说明来源、建议学术引用字段、下游同等非商业及署名条件、观测局限和许可终止处置；不复制官方 Logo。 |
| `backend/tests/test_carbon_mapper.py` | 补充认证白名单、失效账户、默认拒绝、账户额度和成功/错误响应禁止缓存测试。 |

## 测试与检查

- `backend/.venv/Scripts/python.exe -m unittest discover -s tests -p 'test_*.py' -q`：**14/14 通过**。首次运行时测试桩把同步响应传给异步中间件，修正测试桩后重跑通过；业务实现没有因此改动。
- `npm run build`（含 TypeScript 检查）：通过，Vite 转换 3000 个模块。
- `git diff --check`：通过；只有 Windows CRLF 提示。
- 本机 Process/User/Machine 环境中 `CARBON_MAPPER_API_KEY`、`CARBON_MAPPER_ENABLED` 均未设置，`backend/.env` 不存在；前端源码及构建产物没有 `CARBON_MAPPER_API_KEY` 字符串；Git 未跟踪实际 `.env` 文件。此检查无法证明其他主机、历史提交或外部日志绝无旧密钥。
- 未运行真实上游请求：没有检测到可确认的新服务端 Token。也未创建预览环境、未推送、未部署或修改生产配置。

## 许可终止和商业化切换处置

1. 一旦 Carbon Mapper 许可终止、运营转为收费/商业用途或用途不再符合官方 Purpose，先将服务端 `CARBON_MAPPER_ENABLED` 置为关闭并撤下预览访问，停止新的数据请求及再分发；撤销相关 API Token。
2. 清点本平台实际持有的数据副本：运行内存、代理/CDN、浏览器可控缓存、日志、导出文件、截图、备份和未来新增存储。当前适配层没有数据库/应用数据缓存，但仍须检查基础设施是否另有副本。按官方条款删除不得继续持有的副本，保留清理记录；不要误删平台自身业务数据。
3. 检查入口和 API 均不再返回 Carbon Mapper 数据；通知受控预览参与者停止使用/再分发并按其所接受条件处理副本。已生成衍生品的例外及后续分发边界以官方 §3.5 原文为准。
4. 商业化前单独评估并取得适用许可。当前全局开关和用户白名单不是商业使用授权，也没有商业/学术租户自动隔离。

## 仍未关闭的预览门槛

1. **有效且新取得的 Token／正式账户权限**：由负责人在服务端 Secret 中配置后，在本地或受控预览做少量 CH₄/CO₂ 列表、详情、401/429 联调；不得使用聊天中曾暴露的 Token。
2. **预览环境和访问边界**：确认独立域名、仅单 worker（当前内存限流不跨进程）、访问控制、正式账户额度及回滚方法；平台用户白名单须只含经许可的研究参与者。生产网站保持不变。
3. **许可落实**：负责人确认免费研究用途、运营主体、是否有广告/商业客户，并审核站点使用说明是否足以让下游接收者接受官方要求的同等非商业及署名条件。若公开 API 可被非授权者获取，继续阻断。
4. **真实环境回归**：在启用前检查授权与未授权账户、观测空值/质量、地图坐标和移动布局，以及原有 GIS、碳核算、异常和日志；确认预览代理/CDN 不缓存观测响应，也不记录 Authorization 头。

**受控预览判断：NO-GO（当前）。**可准备独立预览基础设施并保持开关关闭；只有上述门槛经实测和负责人确认后，才重新评估是否打开受控预览。公开/生产上线仍需单独决策。
