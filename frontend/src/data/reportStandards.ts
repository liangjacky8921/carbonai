/** 报告标准模板元数据（12 标准 × 6 区域，与原 v5.2 平台一致） */

export interface ReportStandard {
  key: string
  name: string
  region: string
  desc: string
  tags: string[]
}

export const REGION_LABELS: Record<string, string> = {
  'cn-mainland': '中国大陆', 'cn-hk': '中国香港', 'cn-tw': '中国台湾',
  'eu': '欧盟', 'us': '美国', 'intl': '国际通用',
}

export const REGION_STANDARDS: Record<string, string[]> = {
  auto: ['cn-sse', 'hk-esg', 'eu-csrd'],
  'cn-mainland': ['cn-sse', 'cn-gb', 'cn-mee'],
  'cn-hk': ['hk-esg'],
  'cn-tw': ['tw-ghg'],
  eu: ['eu-csrd', 'cbam'],
  us: ['us-sec'],
  intl: ['issb', 'iso', 'ghg', 'gri'],
}

export const REPORT_STANDARDS: ReportStandard[] = [
  { key: 'cn-sse', name: '上交所/深交所可持续发展报告', region: 'cn-mainland',
    desc: '沪深北三大交易所《上市公司可持续发展报告指引》+《编制指南》(2026.1修订第3-5号)。上证180/深证100/科创50强制披露。',
    tags: ['双重重要性', '21项议题', '2026.4.30前披露'] },
  { key: 'cn-gb', name: 'GB/T 32150-2025 工业企业碳排放核算通则', region: 'cn-mainland',
    desc: '中国国家标准 2025 年修订版。适用于工业企业温室气体排放核算与报告，对接碳市场履约。',
    tags: ['国家标准', '2025修订'] },
  { key: 'cn-mee', name: '生态环境部 企业温室气体排放报告', region: 'cn-mainland',
    desc: '全国碳市场履约主体填报。覆盖发电/钢铁/水泥/铝冶炼等重点行业。',
    tags: ['碳市场履约', '重点行业'] },
  { key: 'hk-esg', name: 'HKEX ESG Code + Part D 气候披露', region: 'cn-hk',
    desc: '港交所《环境、社会及管治报告守则》。LargeCap 2026年全面强制 IFRS S2 气候披露。',
    tags: ['4大部分', 'Part D气候', '情景分析', '内部碳定价', '强制Scope1-2'] },
  { key: 'tw-ghg', name: '气候变迁因应法 温室气体排放量盘查', region: 'cn-tw',
    desc: '依据中国台湾地区气候变迁因应法规进行温室气体盘查登录。', tags: ['盘查登录'] },
  { key: 'eu-csrd', name: 'EU CSRD / ESRS E1 气候变化', region: 'eu',
    desc: '欧盟企业永续发展报告指令。ESRS E1 涵盖气候变化减缓、适应、能源。', tags: ['ESRS E1', '双重重要性'] },
  { key: 'cbam', name: 'EU CBAM 碳边境调节机制', region: 'eu',
    desc: '2026年进入正式期。年进口>50吨须申报隐含碳排放并购买CBAM证书。', tags: ['正式期', '隐含碳排放', '证书申报'] },
  { key: 'us-sec', name: 'SEC Climate Disclosure Rule', region: 'us',
    desc: '美国证监会气候信息披露规则。', tags: ['SEC'] },
  { key: 'issb', name: 'ISSB IFRS S1/S2 可持续披露准则', region: 'intl',
    desc: 'ISSB 2023.6发布。全球30+司法管辖区采纳。TCFD四支柱框架+行业特定指标。', tags: ['IFRS S1/S2', 'TCFD四支柱'] },
  { key: 'iso', name: 'ISO 14064-1:2018 组织层面GHG核查', region: 'intl',
    desc: '国际标准。全球互认核查标准。2025年新增Part4量化方法技术规范。', tags: ['国际互认', '核查标准'] },
  { key: 'ghg', name: 'GHG Protocol 企业核算与报告标准', region: 'intl',
    desc: '温室气体核算体系企业标准，Scope 1/2/3 核算基础。', tags: ['Scope 1-3'] },
  { key: 'gri', name: 'GRI 305:2016 排放 + TCFD框架', region: 'intl',
    desc: 'GRI可持续报告标准排放议题 + TCFD 气候相关财务披露。', tags: ['GRI 305', 'TCFD'] },
]

export const STANDARD_NAMES: Record<string, string> = Object.fromEntries(
  REPORT_STANDARDS.map((s) => [s.key, s.name]),
)

/** 历史报告记录（示例） */
export interface ReportHistoryItem {
  name: string; standard: string; region: string; date: string; status: string
}

export const REPORT_HISTORY_SEED: ReportHistoryItem[] = [
  { name: '2025年度碳排放核查报告', standard: 'ISO 14064-1', region: '国际', date: '2026-03-15', status: '已通过' },
  { name: '2025 CBAM季度报告 Q4', standard: 'EU CBAM', region: '欧盟', date: '2026-01-31', status: '已提交' },
  { name: '2025可持续发展报告', standard: '上交所指引', region: '中国大陆', date: '2026-04-28', status: '已披露' },
  { name: '2024年度ESG环境信息披露', standard: 'GRI 305 + HKEX', region: '中国香港', date: '2025-04-22', status: '已披露' },
]
