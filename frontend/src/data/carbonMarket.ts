/** CarbonAI V5.2 — 碳市场行情与区域静态数据（源自线上 v5.2 平台口径，2026-09） */

export interface Quote {
  key: string; name: string; price: string; unit: string; source: string; note?: string
}

export const REALTIME_QUOTES: Quote[] = [
  { key: 'cea', name: 'CEA 全国碳配额', price: '81.03', unit: '¥/t', source: '上海环交所', note: '¥78-88区间' },
  { key: 'ccer', name: 'CCER 核证减排量', price: '82.63', unit: '¥/t', source: '北京绿交所', note: '历史峰值 ¥130' },
  { key: 'eua', name: 'EUA 欧盟碳配额', price: '75.05', unit: '€/t', source: 'ICE Endex', note: 'Q1均价' },
  { key: 'fdi', name: '复旦碳价指数(6月)', price: '80.44', unit: '¥/t', source: '复旦大学', note: '买入77.44 卖出83.42' },
  { key: 'gdea', name: 'GDEA 广东碳配额', price: '37.70', unit: '¥/t', source: '广州碳交所', note: '年内累计 -5.7%' },
  { key: 'szea', name: 'SZEA 深圳碳配额', price: '47.11', unit: '¥/t', source: '深圳绿交所', note: '年内 +23.8%' },
  { key: 'core', name: '香港 Core Climate', price: '100万t', unit: '累计碳信用', source: '香港交易所', note: '累计交易量' },
]

/** CEA 碳价走势 & 复旦碳价指数预测（2026 年度，月度） */
export const PRICE_SERIES = {
  months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月(预)', '8月(预)', '9月(预)', '10月(预)', '11月(预)', '12月(预)'],
  cea: [81.5, 80.2, 82.1, 81.8, 83.0, 81.23, null, null, null, null, null, null],
  ccer: [88.0, 86.5, 88.67, 85.2, 83.5, 82.53, null, null, null, null, null, null],
  fudan: [null, null, null, null, null, 80.44, 80.0, 80.5, 81.0, 80.5, 80.2, 80.0],
  euaCny: [690, 705, 680, 672, 665, 658, null, null, null, null, null, null],
}

/** 区域碳市场占比 */
export const MARKET_SHARE = [
  { name: '全国碳市场CEA(上海)', value: 81.23, color: '#059669' },
  { name: '北京碳配额BJEA', value: 92.0, color: '#0ea5e9' },
  { name: '广东碳市场GDEA(广州)', value: 37.62, color: '#10b981' },
  { name: '深圳碳配额SZEA', value: 47.05, color: '#3b82f6' },
  { name: '湖北碳配额HBEA', value: 48.2, color: '#f59e0b' },
  { name: '天津碳配额TJEA', value: 40.5, color: '#8b5cf6' },
  { name: '重庆碳配额CQEA', value: 38.0, color: '#ef4444' },
  { name: '福建碳配额FJEA', value: 32.6, color: '#94a3b8' },
]

/** 粤港澳大湾区 11 城（联动看板 + 区域对比 3D） */
export interface GbaCity {
  name: string; en: string; lat: number; lon: number
  emission: number   // 万tCO₂（示例口径）
  intensity: number  // tCO₂/万元GDP
  gdp: number        // 亿元
}

export const GBA_CITIES: GbaCity[] = [
  { name: '香港', en: 'Hong Kong', lat: 22.319, lon: 114.169, emission: 3480, intensity: 0.11, gdp: 26800 },
  { name: '深圳', en: 'Shenzhen', lat: 22.543, lon: 114.058, emission: 3860, intensity: 0.12, gdp: 36400 },
  { name: '广州', en: 'Guangzhou', lat: 23.129, lon: 113.264, emission: 5420, intensity: 0.17, gdp: 31000 },
  { name: '佛山', en: 'Foshan', lat: 23.022, lon: 113.122, emission: 4630, intensity: 0.34, gdp: 13300 },
  { name: '东莞', en: 'Dongguan', lat: 23.021, lon: 113.752, emission: 4510, intensity: 0.38, gdp: 11400 },
  { name: '惠州', en: 'Huizhou', lat: 23.111, lon: 114.416, emission: 3240, intensity: 0.31, gdp: 5600 },
  { name: '珠海', en: 'Zhuhai', lat: 22.271, lon: 113.577, emission: 1350, intensity: 0.15, gdp: 4200 },
  { name: '中山', en: 'Zhongshan', lat: 22.517, lon: 113.393, emission: 1880, intensity: 0.29, gdp: 3900 },
  { name: '江门', en: 'Jiangmen', lat: 22.578, lon: 113.081, emission: 2260, intensity: 0.41, gdp: 4100 },
  { name: '肇庆', en: 'Zhaoqing', lat: 23.047, lon: 112.471, emission: 1590, intensity: 0.45, gdp: 2900 },
  { name: '澳门', en: 'Macao', lat: 22.198, lon: 113.544, emission: 320, intensity: 0.09, gdp: 3800 },
]

/** 排放因子库（与原平台一致，20 项） */
export interface FactorItem {
  name: string; value: number; unit: string; source: string; year: string; region: string; dqr: number
}

export const FACTOR_LIB: FactorItem[] = [
  { name: '电网排放因子-南方', value: 0.5703, unit: 'kgCO₂/kWh', source: '中国电网2023', year: '2023', region: '广东、广西、云南、贵州、海南', dqr: 5 },
  { name: '电网排放因子-华东', value: 0.589, unit: 'kgCO₂/kWh', source: '中国电网2023', year: '2023', region: '上海、江苏、浙江、安徽、福建', dqr: 5 },
  { name: '电网排放因子-华北', value: 0.741, unit: 'kgCO₂/kWh', source: '中国电网2023', year: '2023', region: '北京、天津、河北、山西、山东、蒙西', dqr: 5 },
  { name: '电网排放因子-华中', value: 0.525, unit: 'kgCO₂/kWh', source: '中国电网2023', year: '2023', region: '河南、湖北、湖南、江西', dqr: 4 },
  { name: '电网排放因子-西北', value: 0.612, unit: 'kgCO₂/kWh', source: '中国电网2023', year: '2023', region: '陕西、甘肃、青海、宁夏、新疆', dqr: 4 },
  { name: '电网排放因子-东北', value: 0.776, unit: 'kgCO₂/kWh', source: '中国电网2023', year: '2023', region: '辽宁、吉林、黑龙江、蒙东', dqr: 4 },
  { name: '烟煤排放因子', value: 1.9003, unit: 'tCO₂/t', source: '国家发改委气候司', year: '2015', region: '全国通用', dqr: 4 },
  { name: '无烟煤排放因子', value: 2.53, unit: 'tCO₂/t', source: '国家发改委气候司', year: '2015', region: '全国通用', dqr: 4 },
  { name: '柴油排放因子', value: 3.1605, unit: 'tCO₂/t', source: 'IPCC 2006', year: '2006', region: '全球', dqr: 5 },
  { name: '汽油排放因子', value: 2.9251, unit: 'tCO₂/t', source: 'IPCC 2006', year: '2006', region: '全球', dqr: 5 },
  { name: '天然气排放因子', value: 21.84, unit: 'tCO₂/万m³', source: 'IPCC 2006', year: '2006', region: '全球', dqr: 5 },
  { name: '货运-重型柴油车', value: 0.078, unit: 'kgCO₂/t·km', source: 'Ecoinvent 3.9', year: '2022', region: '全球', dqr: 4 },
  { name: '货运-轻型货车', value: 0.156, unit: 'kgCO₂/t·km', source: 'Ecoinvent 3.9', year: '2022', region: '全球', dqr: 4 },
  { name: '航空-短途(<1500km)', value: 0.115, unit: 'kgCO₂/人·km', source: 'ICAO', year: '2021', region: '全球', dqr: 4 },
  { name: '航空-长途(>1500km)', value: 0.092, unit: 'kgCO₂/人·km', source: 'ICAO', year: '2021', region: '全球', dqr: 4 },
  { name: '热力(蒸汽)', value: 0.11, unit: 'tCO₂/GJ', source: 'GB/T 32151', year: '2015', region: '全国通用', dqr: 3 },
  { name: '水泥-熟料生产', value: 0.525, unit: 'tCO₂/t熟料', source: 'IPCC 2019 Refinement', year: '2019', region: '全球', dqr: 5 },
  { name: '钢铁-高炉转炉', value: 1.68, unit: 'tCO₂/t粗钢', source: 'Ecoinvent 3.9', year: '2022', region: '全球', dqr: 4 },
  { name: '冷链货运-冷藏车', value: 0.132, unit: 'kgCO₂/t·km', source: 'Ecoinvent 3.9', year: '2022', region: '全球', dqr: 3 },
  { name: '电力-全国平均', value: 0.5703, unit: 'kgCO₂/kWh', source: '生态环境部', year: '2024', region: '全国（建议优先使用区域电网因子）', dqr: 4 },
]

/** 网格化监测区域（与原平台一致） */
export const GRID_REGIONS: Record<string, { name: string; lat: number; lon: number; zoom: number }> = {
  sz_gm: { name: '深圳市光明区', lat: 22.75, lon: 113.95, zoom: 13 },
  sz_ns: { name: '深圳市南山区', lat: 22.53, lon: 113.93, zoom: 13 },
  sz_ft: { name: '深圳市福田区', lat: 22.55, lon: 114.05, zoom: 14 },
  sz_ba: { name: '深圳市宝安区', lat: 22.58, lon: 113.88, zoom: 12 },
  gz_hp: { name: '广州市黄埔区', lat: 23.1, lon: 113.45, zoom: 13 },
  hz_hc: { name: '惠州市惠城区', lat: 23.085, lon: 114.42, zoom: 12 },
  hz_hy: { name: '惠州市惠阳区(大亚湾)', lat: 22.75, lon: 114.47, zoom: 11 },
  hk_yj: { name: '香港油尖旺区', lat: 22.31, lon: 114.17, zoom: 15 },
  hk_c: { name: '香港中环', lat: 22.28, lon: 114.16, zoom: 16 },
}
