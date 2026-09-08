# CarbonAI 时空智能碳管理平台 V5.2

> **已上线运营的 Web 平台** · 深色碳主题大屏数据可视化 · 12 大功能模块 · 中英双语碳足迹报告 · 多标准 ESG 披露
> 线上地址：https://www.carbontool.cn 

![Tech](https://img.shields.io/badge/Vue-3.5-10b981) ![TS](https://img.shields.io/badge/TypeScript-5.6-0ea5e9) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-059669) ![Vite](https://img.shields.io/badge/Vite-5-8b5cf6) ![License](https://img.shields.io/badge/版权-梁家深-orange)

## V5.2 升级亮点（相对 版本v5.1 ）

1. **工程化前端**：Vue 3 + Vite + TypeScript + Element Plus + ECharts + Tailwind CSS，替代 154KB 单页 HTML；深色碳主题（绿/蓝主色）统一设计系统，页面过渡动画、骨架屏、空状态引导、Toast 反馈、hover 提示，适配 PC 与 Pad。
2. **登录注册系统（前端先行）**：路由守卫限制未登录访问；统一 API 契约 `{code, message, data}`；后端未接入时自动回退本地 Mock。
3. **预置示例数据**：虚拟企业年度碳排放（月/部门/排放源，2022-2026）、车队 GPS 轨迹（3 辆车）、大湾区 40 个排放点位、林地边界 GeoJSON、产品 BOM 清单，全部标注「示例数据」标识；**用户上传数据后优先展示**，一键切回。
4. **报告能力增强**：产品碳足迹 LCA 支持中英文双语 PDF/Word 报告一键生成（客户端 docx/jsPDF）；多标准报告覆盖 CBAM、HKEX ESG、ISSB IFRS S1/S2、ISO 14064-1、上交所/深交所指引等 12 项标准；报告预览、下载、历史记录。
5. **数据大屏升级**：碳价走势动画、粤港澳大湾区 11 城 3D 碳排放对比（echarts-gl）、排放源 Top8 环形图、实时碳行情跑马灯、Scope 堆叠趋势、异常指标洞察。
6. **云部署就绪**：FastAPI + Nginx + 云服务器（阿里云/腾讯云学生机）与 Render 免费版双部署文档，7×24 在线。

## 功能模块（12 个，完整保留 v5.1 全部功能入口）

| 分组 | 模块 | 说明 |
|---|---|---|
| 总览 | 数据大屏 | 实时碳行情（CEA/CCER/EUA/复旦指数/GDEA/SZEA/Core Climate）、碳价走势与预测、区域市场占比、3D 区域对比、Top8 环形图、Scope 分布、趋势、异常指标 |
| 碳核算 | 碳排放核算 | Excel/CSV 上传、因子自动匹配、Scope 1/2/3 核算、部门对比、年度切换 |
| | 排放因子库 | 20 项因子可溯源（Ecoinvent/IPCC/中国电网/发改委），DQR 分级，导出含溯源 |
| 时空分析 | GIS 碳源热力图 | Leaflet + 高德底图，林地碳汇盘查（NDVI 生物量模型）、排放点位热力图（半径/模糊度可调）、GBA 11 城联动看板 |
| | 轨迹碳核算 | GPS/北斗轨迹 CSV 上传，吨·公里方法学（GLEC 3.0 / ISO 14083），路段分布、车型对比 |
| | 网格化监测 | 9 个监测区域、时间窗口、黄/红预警阈值、网格热力分布、预警事件日志 |
| 专题建模 | 土壤高光谱 SOC | 46 样本×256 波段真实数据，分组均值光谱、PCA 聚类、敏感光谱指数、SOC 标签导入 |
| | 污水厂运维 | 2022-2026 真实月报数据，水量趋势、去除率、COD 对比、污泥与用电 |
| 资产与产品 | 碳资产管理 | 7 类行情卡片、组合结构、CEA 走势预测、配额盈缺分析、履约日历 |
| | 产品碳足迹 LCA | 五阶段流程、BOM 清单、行业基准对比、**中英双语 PDF/Word 报告** |
| 报告与工具 | 多标准报告 | 12 项标准 × 6 区域自动匹配，报告预览/生成/导出/历史记录 |
| | AI 碳管理顾问 | 登录后可用，本地知识库回退 + 后端 LLM 代理占位 |
| | 碳计算器 | 电力/燃料/通勤/飞行四大计算器 |

## 快速开始

```bash
# 前端（开发）
cd frontend
npm install --registry=https://registry.npmmirror.com
npm run dev            

# http://localhost:5173
# 后端（可选，未启动时前端自动走 Mock 模式）
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000            # http://127.0.0.1:8000/docs
```

## 仓库结构

```
carbonai/
├── frontend/        # Vue 3 前端（src/views 12+2 模块页面）
├── backend/         # FastAPI 后端（auth 占位 + 示例数据 + 业务占位接口）
├── sample-data/     # 预置示例数据（含生成器 generate_sample_data.py）
├── docs/            # 部署指南（云服务器/Render）+ 软著登记全流程
├── legacy/          # 原 v5.1/v5.2 静态单页版（软著源码素材与回退参考）
├── render.yaml      # Render 一键部署
└── README.md
```

## 部署

- **Vercel（carbontool.cn 当前托管）**：项目 Root Directory 已设为 `frontend/`、框架 Vite（零配置自动构建），`frontend/vercel.json` 提供 SPA history 路由回退，推送 main 分支即自动部署
- **云服务器（推荐，7×24）**：[docs/部署指南-云服务器.md](docs/部署指南-云服务器.md) — 阿里云/腾讯云学生机 + Nginx + systemd，约 ¥10/月
- **免费过渡**：[docs/部署指南-Render免费版.md](docs/部署指南-Render免费版.md) — Render 免费版一键部署


## 版权与作者

- 作者：Jacky Liang· 梁家深 地理信息科学
- 版权所有 © 2026。
