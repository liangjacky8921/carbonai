import { accountingUnitSummary } from './accountingUnits'
/**
 * CarbonAI V6.0 — 报告生成引擎（纯前端）
 * ① 产品碳足迹 LCA 中英文双语报告（PDF via html2canvas+jsPDF / Word via docx）
 * ② 多标准披露报告（CBAM / HKEX ESG / ISSB / ISO 14064-1 等 12 标准）
 * ③ 报告历史记录（localStorage 持久化）
 */
import type { EmissionRecord } from '@/stores/data'
import { STANDARD_NAMES } from '@/data/reportStandards'
import { fmt } from './format'

export interface PcfData {
  productName: string
  unit: string
  standard: string
  stages: { stage: string; name: string; nameEn: string; emission: number; mainSource: string }[]
}

export interface ReportRecord {
  id: string
  name: string
  standard: string
  region: string
  date: string
  format: 'PDF' | 'Word' | '草稿'
  action?: 'draft' | 'export'
  type: 'pcf' | 'standard'
}

// ================================================================
// 一、产品碳足迹双语报告
// ================================================================

const STAGE_ICON: Record<string, string> = { raw: '⛏️', mfg: '🏭', tpt: '🚛', use: '⚡', eol: '♻️' }

export const PCF_DEMO_DISCLAIMER = '本报告为产品碳足迹功能演示资料，所展示的阶段数据和计算结果仅用于软件功能展示，未经真实活动数据及排放因子核验，不得作为正式产品碳足迹声明或合规报告使用。'

export function buildPcfHtml(d: PcfData, lang: 'zh' | 'en' | 'both' = 'both'): string {
  const total = d.stages.reduce((s, x) => s + x.emission, 0)
  const zh = lang !== 'en'
  const en = lang !== 'zh'
  const t = (z: string, e: string) => (zh && en ? `${z}<span style="color:#64748b"> / ${e}</span>` : zh ? z : e)

  const rows = d.stages.map((s) => {
    const pct = total ? ((s.emission / total) * 100).toFixed(1) : '0'
    return `<tr>
      <td>${STAGE_ICON[s.stage] || ''} <b>${zh ? s.name : ''}${en ? (zh ? ' ' + s.nameEn : s.nameEn) : ''}</b></td>
      <td class="num">${s.emission.toFixed(2)}</td>
      <td class="num">${pct}%</td>
      <td style="font-size:11px">${s.mainSource}</td>
    </tr>`
  }).join('')

  const bars = d.stages.map((s) => {
    const pct = total ? (s.emission / total) * 100 : 0
    const colors: Record<string, string> = { raw: '#8b5cf6', mfg: '#ef4444', tpt: '#f59e0b', use: '#0ea5e9', eol: '#10b981' }
    return `<div style="margin:6px 0">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
        <span>${zh ? s.name : s.nameEn}</span><span class="num">${s.emission.toFixed(2)} kgCO₂e (${pct.toFixed(1)}%)</span>
      </div>
      <div style="background:#e2e8f0;border-radius:4px;height:10px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${colors[s.stage] || '#10b981'};border-radius:4px"></div>
      </div>
    </div>`
  }).join('')

  return `
  <p style="padding:10px 14px;border:2px solid #d97706;color:#78350f;background:#fffbeb;font-weight:700">DEMO ONLY / 示例估算：${PCF_DEMO_DISCLAIMER}</p>
  <div style="text-align:center;padding:34px 0 22px;border-bottom:3px solid #059669;margin-bottom:18px">
    <h1 style="color:#059669;font-size:22px;margin:0 0 6px">${t('产品碳足迹演示资料', 'Demo Product Carbon Footprint / DEMO ONLY')}</h1>
    <p style="color:#334155;font-size:13px;margin:4px 0">${t('产品', 'Product')}: <b>${d.productName}</b></p>
    <p style="color:#64748b;font-size:11px;margin:4px 0">
      ${t('展示模板 / 标准选项（非合规依据）', 'Display option (not compliance evidence)')}: ${d.standard} | ${t('功能单位', 'Functional Unit')}: 1 ${d.unit} |
      ${t('报告日期', 'Date')}: ${new Date().toLocaleDateString('zh-CN')}
    </p>
  </div>

  <h2 style="color:#059669;font-size:15px">${t('一、核算结果总览', '1. Summary of Results')}</h2>
  <p style="font-size:13px;line-height:2">${t('本示例五阶段数据合计为', 'The sum of the five demonstration stages is')}
    <b style="font-size:20px;color:#059669"> ${total.toFixed(2)} kgCO₂e</b> / ${d.unit}，
    ${t('仅选用展示模板', 'display template only:')} ${d.standard}，${t('覆盖原材料获取、生产制造、运输分销、使用阶段与废弃回收五个生命周期阶段。', 'covering five life cycle stages: raw materials, manufacturing, transport & distribution, use, and end-of-life.')}</p>

  <h2 style="color:#059669;font-size:15px">${t('二、各阶段排放分布', '2. Emissions by Life Cycle Stage')}</h2>
  ${bars}

  <h2 style="color:#059669;font-size:15px">${t('三、LCA 明细表', '3. LCA Detail Table')}</h2>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:#f0fdf4;color:#166534">
      <th style="padding:8px;text-align:left;border:1px solid #d1d5db">${t('阶段', 'Stage')}</th>
      <th style="padding:8px;text-align:right;border:1px solid #d1d5db">${t('排放量 (kgCO₂e)', 'Emissions')}</th>
      <th style="padding:8px;text-align:right;border:1px solid #d1d5db">${t('占比', 'Share')}</th>
      <th style="padding:8px;text-align:left;border:1px solid #d1d5db">${t('主要排放源', 'Main Source')}</th>
    </tr></thead>
    <tbody>${rows}
      <tr style="background:#f0fdf4;font-weight:700;color:#166534">
        <td style="padding:8px;border:1px solid #d1d5db">${t('合计', 'Total')}</td>
        <td style="padding:8px;text-align:right;border:1px solid #d1d5db" class="num">${total.toFixed(2)}</td>
        <td style="padding:8px;text-align:right;border:1px solid #d1d5db">100%</td>
        <td style="padding:8px;border:1px solid #d1d5db">kgCO₂e / ${d.unit}</td>
      </tr>
    </tbody>
  </table>

  <div style="text-align:center;font-size:9px;color:#94a3b8;margin-top:26px;border-top:1px solid #e2e8f0;padding-top:8px">
    CarbonAI V6.0 · ${t('本报告仅为软件功能演示，非合规报告，不可作为正式产品排放声明。',
    'Software demonstration only; not a compliance report or an official product emissions declaration.')}
  </div>`
}

// ================================================================
// 二、多标准披露报告（HTML 构建，源自 v5.2 逻辑并增强）
// ================================================================

export type ReportDataSource = 'sample' | 'user' | 'unknown'

/** 只陈述传入记录的来源状态与可观察日期，不把上传或月份缺失视为真实性证明。 */
export function buildReportDataNote(records: EmissionRecord[], year: number, source: ReportDataSource = 'unknown'): string {
  const label = source === 'sample' ? '内置虚拟企业示例数据' : source === 'user' ? '用户上传记录（真实性未核验）' : '来源待确认'
  const validYear = (value: number) => Number.isInteger(value) && value >= 1000 && value <= 9999
  const years = [...new Set(records.filter(r => validYear(r.year)).map(r => r.year))].sort((a, b) => a - b)
  const dated = records.filter(r => validYear(r.year) && Number.isInteger(r.month) && r.month! >= 1 && r.month! <= 12)
  const months = [...new Set(dated.map(r => `${r.year}-${String(r.month).padStart(2, '0')}`))].sort()
  return `<p style="padding:10px 14px;border:1px solid #64748b;font-size:12px;line-height:1.8">
    <b>数据来源：</b>${label}。<b>报告选择年度：</b>${validYear(year) ? year : '未提供'}。
    <b>实际记录年度：</b>${years.length ? years.join('、') : '未提供'}。
    <b>实际记录月份：</b>${months.length ? months.join('、') : '未提供'}。
    <b>记录条数：</b>${records.length}；日期字段缺失或无效：${records.length - dated.length}条。
    月份按实际存在的记录列示，不代表全年或连续覆盖。上述记录未经真实性与排放因子适用性核验，用户上传不等于真实监测。
    <b>文件性质：</b>报告草稿，不代表已完成标准合规审查、认证或核查。</p>`
}

export function buildStandardReportHtml(type: string, records: EmissionRecord[], year: number, source: ReportDataSource = 'unknown'): string {
  const content = buildStandardReportContent(type, records, year, source)
  if (!records.some(r => r.accountingVersion === 'activity-unit-v1')) return content
  const basis = accountingUnitSummary(records)
  const totalLabel = basis.unit === 'tCO₂' ? '因子声明CO₂合计（非完整温室气体清单）' : '记录数值合计（混合口径待核实）'
  return `<p style="padding:10px;border:1px solid #64748b">${basis.note}明细保留原始活动量与单位，排放量使用换算后的活动量。</p>`
    + content.replace(/tCO₂e/g, basis.unit).replace(/温室气体总排放/g, totalLabel).replace(/GHG排放/g, '因子声明CO₂排放')
}

function buildStandardReportContent(type: string, records: EmissionRecord[], year: number, source: ReportDataSource = 'unknown'): string {
  const name = STANDARD_NAMES[type] || type
  const total = records.reduce((s, r) => s + r.emission, 0)
  const scope: Record<string, number> = {}
  records.forEach((r) => { scope[r.scope] = (scope[r.scope] || 0) + r.emission })
  const s1 = scope['Scope 1'] || 0, s2 = scope['Scope 2'] || 0, s3 = scope['Scope 3'] || 0

  const detailRows = [...records].sort((a, b) => b.emission - a.emission).map((r) =>
    `<tr><td>${r.source}</td><td>${r.scope}</td><td class="num">${fmt(r.activity)}</td><td>${r.unit}</td>
     <td class="num">${r.factor}${r.accountingVersion === 'activity-unit-v1' ? ` <small>${r.factorUnit || '分母待核实'}</small>` : ''}</td><td class="num"><b>${fmt(r.emission)}</b></td>
     <td class="num">${total ? ((r.emission / total) * 100).toFixed(1) : 0}%</td></tr>`).join('')
  const emisTable = `<table style="width:100%;border-collapse:collapse;font-size:11.5px">
    <thead><tr style="background:#f0fdf4;color:#166534">
      <th style="padding:6px;border:1px solid #d1d5db;text-align:left">排放源</th><th style="padding:6px;border:1px solid #d1d5db">Scope</th>
      <th style="padding:6px;border:1px solid #d1d5db;text-align:right">活动数据</th><th style="padding:6px;border:1px solid #d1d5db">单位</th>
      <th style="padding:6px;border:1px solid #d1d5db;text-align:right">因子</th><th style="padding:6px;border:1px solid #d1d5db;text-align:right">tCO₂e</th>
      <th style="padding:6px;border:1px solid #d1d5db;text-align:right">占比</th></tr></thead>
    <tbody>${detailRows}
      <tr style="background:#f0fdf4;font-weight:700;color:#166534"><td colspan="5" style="padding:6px;border:1px solid #d1d5db">合计</td>
      <td class="num" style="padding:6px;border:1px solid #d1d5db;text-align:right">${fmt(total)}</td>
      <td style="padding:6px;border:1px solid #d1d5db;text-align:right">100%</td></tr></tbody></table>`

  const header = buildReportDataNote(records, year, source) + `<div style="text-align:center;padding:34px 0 22px;border-bottom:3px solid #059669;margin-bottom:18px">
    <h1 style="color:#059669;font-size:22px;margin:0 0 6px">${name}</h1>
    <p style="color:#64748b;font-size:11px">报告年度 FY${year} | 生成日期 ${new Date().toLocaleDateString('zh-CN')} | CarbonAI V6.0</p>
  </div>`

  if (type === 'hk-esg') return header + `
    <p><b>模板参考：</b>HKEX相关披露资料草稿；适用主体、期间和具体披露要求待核实，不代表完成标准认证或核查。</p>
    <h2 style="color:#059669;font-size:15px">Part I — 管治 (§D19)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr><td style="padding:6px;border:1px solid #d1d5db"><b>董事会监督：</b></td><td style="padding:6px;border:1px solid #d1d5db">待企业填写/待核实：董事会监督安排及证明材料</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db"><b>管理层角色：</b></td><td style="padding:6px;border:1px solid #d1d5db">待企业填写/待核实：管理层职责与实际决策记录</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db"><b>薪酬关联：</b></td><td style="padding:6px;border:1px solid #d1d5db">待企业填写/待核实：是否存在薪酬关联及其依据</td></tr></table>
    <h2 style="color:#059669;font-size:15px">Part II — 策略 (§D20-26)</h2>
    <p style="font-size:12px;line-height:2"><b>气候情景分析：</b>待企业填写/待核实：是否开展情景分析、采用的模型、数据及结论。<br>
    <b>转型计划：</b>待企业填写/待核实：减排目标、转型措施和风险暴露；无资料时不生成企业事实。</p>
    <h2 style="color:#059669;font-size:15px">Part III — 风险管理 (§D27)</h2>
    <p style="font-size:12px">待企业填写/待核实：气候风险是否纳入ERM、评估流程及执行证据。</p>
    <h2 style="color:#059669;font-size:15px">Part IV — 指标与目标 (§D28-40)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr style="background:#f0fdf4"><th style="padding:6px;border:1px solid #d1d5db;text-align:left">KPI</th><th style="padding:6px;border:1px solid #d1d5db">FY${year}</th><th style="padding:6px;border:1px solid #d1d5db">单位</th></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">Scope 1 GHG排放</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(s1)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">Scope 2 GHG排放</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(s2)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">Scope 3 GHG排放(鼓励)</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(s3)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr>
      <tr style="font-weight:700"><td style="padding:6px;border:1px solid #d1d5db">总排放(Scope 1+2)</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(s1 + s2)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">排放强度</td><td class="num" style="padding:6px;border:1px solid #d1d5db">待核实（营收及适用分母未提供）</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e/万元营收</td></tr></table>
    <p style="font-size:12px"><b>内碳定价：</b>待企业填写/待核实 | <b>减排目标：</b>待企业填写/待核实</p>
    <p style="font-size:9px;color:#64748b">未提供依据的治理、财务与管理事实不自动生成结论；需由企业补充资料。</p>
    <h2 style="color:#059669;font-size:15px">排放源明细</h2>${emisTable}`

  if (type === 'cn-sse') return header + `
    <p><b>依据：</b>《上市公司可持续发展报告指引》(2024.5.1实施) + 《编制指南》(2026.1修订) | 强制主体：上证180/深证100/科创50</p>
    <h2 style="color:#059669;font-size:15px">温室气体排放 (议题2-应对气候变化)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr><td style="padding:6px;border:1px solid #d1d5db">范围1直接排放</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(s1)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">范围2间接排放</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(s2)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">范围3价值链排放(鼓励)</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(s3)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr>
      <tr style="font-weight:700;background:#f0fdf4"><td style="padding:6px;border:1px solid #d1d5db">温室气体总排放</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(total)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr></table>
    <p style="font-size:12px"><b>排放强度：</b>待核实（营收及适用分母未提供） | <b>内碳定价：</b>待企业填写/待核实</p>
    <h2 style="color:#059669;font-size:15px">排放源明细</h2>${emisTable}`

  if (type === 'cbam') {
    const demoImplied = (total - s3) * 0.85
    return header + `
    <p><b>模板参考：</b>CBAM资料草稿；适用法规、申报范围、截止时间、产品归因与电力分类均待核实。</p>
    <p style="font-size:12px"><b>演示假设（未经核验）：</b>分配比例0.85、参考价75.05 €/t、示意碳价81.03 ¥/t、比例50%。这些是固定演示输入，不代表现行法规参数或适用报价，不适用于正式申报。</p>
    <h2 style="color:#059669;font-size:15px">Scope 1原始记录摘录（未完成产品直接排放归因）</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr style="background:#f0fdf4"><th style="padding:6px;border:1px solid #d1d5db;text-align:left">原始排放源</th><th style="padding:6px;border:1px solid #d1d5db;text-align:right">消耗量</th><th style="padding:6px;border:1px solid #d1d5db;text-align:right">排放因子</th><th style="padding:6px;border:1px solid #d1d5db;text-align:right">排放量(tCO₂e)</th></tr>
      ${records.filter((r) => r.scope === 'Scope 1').map((r) => `<tr><td style="padding:6px;border:1px solid #d1d5db">${r.source}</td><td class="num" style="padding:6px;border:1px solid #d1d5db;text-align:right">${fmt(r.activity)} ${r.unit}</td><td class="num" style="padding:6px;border:1px solid #d1d5db;text-align:right">${r.factor}${r.accountingVersion === 'activity-unit-v1' ? ` <small>${r.factorUnit || '分母待核实'}</small>` : ''}</td><td class="num" style="padding:6px;border:1px solid #d1d5db;text-align:right">${fmt(r.emission)}</td></tr>`).join('') || '<tr><td colspan="4" style="padding:6px;border:1px solid #d1d5db;color:#94a3b8">无 Scope 1 记录</td></tr>'}
    </table>
    <h2 style="color:#059669;font-size:15px">Scope 2原始记录摘录（未认定为电力排放）</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr style="background:#f0fdf4"><th style="padding:6px;border:1px solid #d1d5db;text-align:left">活动数据</th><th style="padding:6px;border:1px solid #d1d5db">原始排放源</th><th style="padding:6px;border:1px solid #d1d5db;text-align:right">排放因子</th><th style="padding:6px;border:1px solid #d1d5db;text-align:right">排放量(tCO₂e)</th></tr>
      ${records.filter((r) => r.scope === 'Scope 2').map((r) => `<tr><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(r.activity)} ${r.unit}</td><td style="padding:6px;border:1px solid #d1d5db">${r.source}</td><td class="num" style="padding:6px;border:1px solid #d1d5db;text-align:right">${r.factor}${r.accountingVersion === 'activity-unit-v1' ? ` <small>${r.factorUnit || '分母待核实'}</small>` : ''}</td><td class="num" style="padding:6px;border:1px solid #d1d5db;text-align:right">${fmt(r.emission)}</td></tr>`).join('') || '<tr><td colspan="4" style="padding:6px;border:1px solid #d1d5db;color:#94a3b8">无 Scope 2 记录</td></tr>'}
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px">
      <tr><td style="padding:6px;border:1px solid #d1d5db"><b>演示分配后的汇总量（非申报隐含排放）</b></td><td class="num" style="padding:6px;border:1px solid #d1d5db"><b>${fmt(demoImplied)} tCO₂e</b></td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">演示碳价乘积（非已认定抵扣额）</td><td class="num" style="padding:6px;border:1px solid #d1d5db">¥81.03/t × ${fmt(demoImplied, 0)}</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">演示金额（非证书需求或申报金额）</td><td class="num" style="padding:6px;border:1px solid #d1d5db">€${fmt(demoImplied * 75.05 * 0.5)}</td></tr></table>
    <p style="font-size:9px;color:#64748b">固定演示式：(Scope 1 + Scope 2汇总) × 0.85；演示金额再乘75.05 × 50%。未核验产品归属、产量、分配及抵扣依据；Scope 2可能包含热力等记录，不能自动归为电力。本模板不生成真实证书需求、抵扣结论或合规判断。</p>
    <h2 style="color:#059669;font-size:15px">排放源明细</h2>${emisTable}`
  }

  if (type === 'issb') return header + `
    <p><b>依据：</b>IFRS S1 可持续相关财务信息一般披露 + IFRS S2 气候相关披露 | TCFD四支柱 | 全球30+司法管辖区采纳</p>
    <h2 style="color:#059669;font-size:15px">治理 (IFRS S2 §6)</h2>
    <p style="font-size:12px">董事会及管理委员会对气候相关风险和机遇的监督机制；管理层在治理流程中的角色。</p>
    <h2 style="color:#059669;font-size:15px">战略 (IFRS S2 §14-35)</h2>
    <p style="font-size:12px">气候相关风险与机遇；情景分析(NGFS 1.5°C/2°C/3°C)；转型计划与气候韧性评估。</p>
    <h2 style="color:#059669;font-size:15px">风险管理 (IFRS S2 §24-26)</h2>
    <p style="font-size:12px">识别、评估气候风险的流程，以及如何纳入整体风险管理体系。</p>
    <h2 style="color:#059669;font-size:15px">指标和目标 (IFRS S2 §29-37)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr style="background:#f0fdf4"><th style="padding:6px;border:1px solid #d1d5db;text-align:left">跨行业指标</th><th style="padding:6px;border:1px solid #d1d5db">FY${year}</th><th style="padding:6px;border:1px solid #d1d5db">单位</th></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">范围1温室气体排放</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(s1)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">范围2温室气体排放</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(s2)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">范围3温室气体排放</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(s3)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr>
      <tr style="font-weight:700"><td style="padding:6px;border:1px solid #d1d5db">合计排放</td><td class="num" style="padding:6px;border:1px solid #d1d5db">${fmt(total)}</td><td style="padding:6px;border:1px solid #d1d5db">tCO₂e</td></tr></table>
    <h2 style="color:#059669;font-size:15px">排放源明细</h2>${emisTable}`

  if (type === 'iso') return header + `
    <p><b>模板参考：</b>ISO 14064-1:2018；适用范围待核实，选择模板不代表完成标准认证或核查。</p>
    <h2 style="color:#059669;font-size:15px">报告边界</h2>
    <p style="font-size:12px">合并方法：待填写/待核实 | 基准年：待填写/待核实 | 类别覆盖及证据：待填写/待核实</p>
    <h2 style="color:#059669;font-size:15px">输入记录汇总（未完成ISO类别认定）</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr style="background:#f0fdf4"><th style="padding:6px;border:1px solid #d1d5db;text-align:left">输入记录分类（沿用Scope字段）</th><th style="padding:6px;border:1px solid #d1d5db">对应范围</th><th style="padding:6px;border:1px solid #d1d5db;text-align:right">排放量(tCO₂e)</th></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">Scope 1记录（非经核查的ISO类别映射）</td><td style="padding:6px;border:1px solid #d1d5db">Scope 1</td><td class="num" style="padding:6px;border:1px solid #d1d5db;text-align:right">${fmt(s1)}</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">Scope 2记录（非经核查的ISO类别映射）</td><td style="padding:6px;border:1px solid #d1d5db">Scope 2</td><td class="num" style="padding:6px;border:1px solid #d1d5db;text-align:right">${fmt(s2)}</td></tr>
      <tr><td style="padding:6px;border:1px solid #d1d5db">Scope 3记录（未验证类别3–6覆盖）</td><td style="padding:6px;border:1px solid #d1d5db">Scope 3</td><td class="num" style="padding:6px;border:1px solid #d1d5db;text-align:right">${fmt(s3)}</td></tr>
      <tr style="font-weight:700;background:#f0fdf4"><td colspan="2" style="padding:6px;border:1px solid #d1d5db">温室气体排放总量</td><td class="num" style="padding:6px;border:1px solid #d1d5db;text-align:right">${fmt(total)}</td></tr></table>
    <p style="font-size:12px"><b>不确定度声明：</b>示例占位，尚未进行不确定度评估；未形成核查结论。</p>
    <h2 style="color:#059669;font-size:15px">排放源明细</h2>${emisTable}`

  // 通用模板
  return header + `
    <h2 style="color:#059669;font-size:15px">温室气体排放总览</h2>
    <p style="font-size:12px">范围一：${fmt(s1)} tCO₂e | 范围二：${fmt(s2)} tCO₂e | 范围三：${fmt(s3)} tCO₂e | <b>合计：${fmt(total)} tCO₂e</b></p>
    <h2 style="color:#059669;font-size:15px">排放源明细</h2>${emisTable}`
}

// ================================================================
// 三、导出：PDF（html2canvas + jsPDF）与 Word（docx）
// ================================================================

/** 按完整内容块/表格行分页；超大原子块明确报错，不静默切断正文。 */
export function paginateReportHtml(host: HTMLElement, html: string, pageHeight: number): HTMLElement[] {
  const source = document.createElement('div')
  source.innerHTML = html
  host.appendChild(source)
  const pages: HTMLElement[] = []
  const newPage = () => {
    const page = document.createElement('div')
    page.style.cssText = 'display:flow-root;background:white;padding-bottom:12px'
    host.appendChild(page)
    pages.push(page)
    return page
  }
  let page = newPage()
  const fits = () => page.getBoundingClientRect().height <= pageHeight - 2
  const ensureFits = () => { if (!fits()) throw new Error('报告存在超过单页高度的段落、图形或表格行，请缩短该内容后导出；未截断保存') }
  const addBlock = (block: HTMLElement) => {
    const copy = block.cloneNode(true) as HTMLElement
    page.appendChild(copy)
    if (!fits() && page.children.length > 1) {
      copy.remove()
      // 避免章节标题独自留在上一页。
      const previous = page.lastElementChild
      const carry = previous?.matches('h1,h2,h3') ? previous : null
      let tableTail: HTMLTableElement | null = null
      // 页尾说明/免责声明不独自落页：带上前表的末两行及表头。
      if (previous instanceof HTMLTableElement && previous.tBodies[0]?.rows.length > 2) {
        tableTail = previous.cloneNode(true) as HTMLTableElement
        const tail = tableTail.tBodies[0]
        while (tail.rows.length > 2) tail.deleteRow(0)
        previous.tBodies[0].deleteRow(-1)
        previous.tBodies[0].deleteRow(-1)
      }
      page = newPage()
      if (carry) page.appendChild(carry)
      if (tableTail) page.appendChild(tableTail)
      page.appendChild(copy)
    }
    ensureFits()
  }
  const addTable = (table: HTMLTableElement) => {
    if ([...table.rows].some(row => [...row.cells].some(cell => cell.rowSpan > 1))) {
      // 当前模板没有跨行合并；跨页拆分跨行单元格尚未实现，禁止悄悄丢失它。
      addBlock(table)
      return
    }
    const rows = [...table.rows]
    const headers = table.tHead ? [...table.tHead.rows] : rows[0]?.querySelector('th') ? [rows[0]] : []
    const bodyRows = rows.filter(row => !headers.includes(row))
    const first = rows[0]
    const widths = first ? [...first.cells].map(cell => cell.getBoundingClientRect().width) : []
    const makeTable = () => {
      const copy = table.cloneNode(false) as HTMLTableElement
      copy.style.tableLayout = 'fixed'
      const cols = document.createElement('colgroup')
      widths.forEach(width => { const col = document.createElement('col'); col.style.width = `${width}px`; cols.appendChild(col) })
      copy.appendChild(cols)
      if (table.caption) copy.appendChild(table.caption.cloneNode(true))
      const head = copy.createTHead()
      headers.forEach(row => head.appendChild(row.cloneNode(true)))
      const body = copy.createTBody()
      page.appendChild(copy)
      return { copy, body }
    }
    let part = makeTable()
    for (let i = 0; i < bodyRows.length; i++) {
      const row = bodyRows[i].cloneNode(true) as HTMLTableRowElement
      part.body.appendChild(row)
      if (!fits()) {
        row.remove()
        // 合计行和至少一条明细同行翻页，避免只有合计的尾页。
        const isTotal = i === bodyRows.length - 1 && /合计|总量|total/i.test(row.textContent || '')
        const carry = isTotal ? part.body.lastElementChild : null
        if (carry) carry.remove()
        if (!part.body.children.length) {
          part.copy.remove()
          const heading = page.lastElementChild
          page = newPage()
          if (heading?.matches('h1,h2,h3')) page.appendChild(heading)
        } else page = newPage()
        part = makeTable()
        if (carry) part.body.appendChild(carry)
        part.body.appendChild(row)
        ensureFits()
      }
    }
    if (!bodyRows.length) ensureFits()
  }
  // 仅展开包含表格的容器，保留声明、标题组、图形等完整语义块。
  const visit = (node: Node) => {
    if (node instanceof HTMLElement) {
      if (node.matches('script,style')) return
      if (node instanceof HTMLTableElement) addTable(node)
      else if (node.querySelector('table')) node.childNodes.forEach(visit)
      else addBlock(node)
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      const p = document.createElement('p'); p.textContent = node.textContent; addBlock(p)
    }
  }
  source.childNodes.forEach(visit)
  source.remove()
  return pages.filter(p => { if (p.children.length) return true; p.remove(); return false })
}

export async function exportHtmlToPdf(html: string, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#ffffff;padding:40px;font-family:"PingFang SC","Microsoft YaHei",sans-serif;font-size:12px;line-height:1.8;color:#1e293b'
  document.body.appendChild(host)
  try {
    await document.fonts.ready
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const imgW = 190, availableH = 277
    const pages = paginateReportHtml(host, html, (host.clientWidth - 80) * availableH / imgW)
    if (!pages.length) throw new Error('报告没有可导出的正文')
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const imgH = canvas.height * imgW / canvas.width
      if (imgH > availableH) throw new Error('报告分页高度异常，未保存截断文件')
      if (i) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 10, 10, imgW, imgH)
      // 每次只保留一页栅格资源，避免长表产生巨型Canvas。
      canvas.width = canvas.height = 0
    }
    pdf.save(filename)
  } finally { host.remove() }
}

/** Word 导出：基于 docx 库生成真实 .docx（中文友好的 OOXML） */
export async function exportReportWord(
  title: string, subtitle: string, html: string, filename: string,
): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, TableLayoutType } = await import('docx')

  // 简易 HTML → docx（标题 / 段落 / 表格）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = []
  const root = new DOMParser().parseFromString(html, 'text/html').body
  // 以预览中的主标题为准；只有没有h1的调用方才使用包装标题。
  if (!root.querySelector('h1')) children.push(new Paragraph({
    text: title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [new TextRun({ text: subtitle, size: 18, color: '64748B' })],
  }))

  // DOM 按文档顺序遍历：容器只递归一次，表格/段落作为原子块，保留 div 裸文本。
  const tokens: { type: 'h1' | 'h2' | 'p' | 'table'; content: string }[] = []
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) tokens.push({ type: 'p', content: node.textContent })
      return
    }
    if (!(node instanceof Element)) return
    const tag = node.tagName.toLowerCase()
    if (['script', 'style'].includes(tag)) return
    if (tag === 'table' || tag === 'h1' || tag === 'h2' || tag === 'p') {
      tokens.push({ type: tag, content: tag === 'table' ? node.outerHTML : node.innerHTML })
    } else {
      node.childNodes.forEach(walk)
    }
  }
  root.childNodes.forEach(walk)

  const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()

  for (const t of tokens) {
    if (t.type === 'h1' || t.type === 'h2') {
      children.push(new Paragraph({ text: stripTags(t.content), heading: t.type === 'h1' ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } }))
    } else if (t.type === 'p') {
      const text = stripTags(t.content)
      if (text) children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text, size: 22 })] }))
    } else {
      const table = new DOMParser().parseFromString(t.content, 'text/html').querySelector('table')!
      const rows = [...table.rows]
      if (!rows.length) continue
      const occupied: number[] = []
      let columns = 0
      const placements = rows.map((row, ri) => {
        let column = 0
        return [...row.cells].map(cell => {
          while ((occupied[column] || 0) > ri) column++
          const start = column
          for (let j = 0; j < cell.colSpan; j++) occupied[column++] = ri + cell.rowSpan
          columns = Math.max(columns, column)
          return { cell, start }
        })
      })
      const colWidth = Math.floor(9000 / Math.max(columns, 1))
      const tableRows = placements.map((cells, ri) => new TableRow({
        tableHeader: rows[ri].parentElement?.tagName === 'THEAD' || (ri === 0 && !!rows[ri].querySelector('th')),
        cantSplit: true,
        children: cells.map(({ cell }) => new TableCell({
          width: { size: colWidth * cell.colSpan, type: WidthType.DXA },
          columnSpan: cell.colSpan, rowSpan: cell.rowSpan,
          shading: cell.tagName === 'TH' ? { fill: 'F0FDF4' } : undefined,
          children: [new Paragraph({
            alignment: cell.style.textAlign === 'right' || cell.classList.contains('num') ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [new TextRun({ text: cell.textContent?.trim() || ' ', bold: cell.tagName === 'TH', size: 18 })],
          })],
        })),
      }))
      children.push(new Table({ rows: tableRows, width: { size: 9000, type: WidthType.DXA }, columnWidths: Array(columns).fill(colWidth), layout: TableLayoutType.FIXED }))
      children.push(new Paragraph({ text: '' }))
    }
  }

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 300 },
    children: [new TextRun({ text: 'CarbonAI V6.0 生成，正式提交前须经第三方核查机构审核', size: 16, color: '94A3B8' })],
  }))

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ================================================================
// 四、报告历史记录
// ================================================================

const LS_HISTORY = 'carbonai_report_history'

export function getReportHistory(): ReportRecord[] {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]') } catch { return [] }
}

export function addReportHistory(rec: Omit<ReportRecord, 'id'>): ReportRecord[] {
  const list = getReportHistory()
  list.unshift({ ...rec, action: rec.action ?? (rec.format === '草稿' ? 'draft' : 'export'), id: Date.now() + '' + Math.floor(Math.random() * 1000) })
  localStorage.setItem(LS_HISTORY, JSON.stringify(list.slice(0, 50)))
  return list
}

export function clearReportHistory(): void {
  localStorage.removeItem(LS_HISTORY)
}

/** 旧记录保持原样；旧格式字段不能证明当时实际导出成功。 */
export function reportHistoryLabel(record: ReportRecord): string {
  if (record.action === 'draft') return '已生成草稿'
  if (record.action === 'export') return `已导出${record.format}（仅元数据）`
  return '旧记录（操作未区分）'
}
