export interface PriceRecord {
  product: 'CEA' | 'CCER'
  kind: 'spot_close' | 'spot_avg' | 'expected_mid'
  status: 'observed' | 'expected'
  targetMonth: string
  observedAt?: string
  publishedAt: string
  sourceUrl: string
  value: number
  unit: '¥/t'
}

export interface PricePlotSeries {
  name: string
  color: string
  dashed: boolean
  data: (number | null)[]
  records: (PriceRecord | null)[]
}

export interface PricePlot {
  months: string[]
  series: PricePlotSeries[]
}

const definitions = [
  { product: 'CEA', kind: 'spot_close', status: 'observed', name: 'CEA 日收盘价', color: '#10b981', dashed: false },
  { product: 'CCER', kind: 'spot_avg', status: 'observed', name: 'CCER 交易均价', color: '#0ea5e9', dashed: false },
  { product: 'CEA', kind: 'expected_mid', status: 'expected', name: '复旦 CEA 预期中间价', color: '#f59e0b', dashed: true },
] as const

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function parsePriceRecords(input: unknown): PriceRecord[] {
  if (!Array.isArray(input)) return []
  return input.filter((record): record is PriceRecord => {
    if (!record || typeof record !== 'object') return false
    const item = record as Partial<PriceRecord>
    const definition = definitions.find((entry) => entry.product === item.product && entry.kind === item.kind && entry.status === item.status)
    if (!definition || item.unit !== '¥/t' || typeof item.value !== 'number' || !Number.isFinite(item.value) || item.value <= 0) return false
    if (typeof item.targetMonth !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.targetMonth)) return false
    if (!validDate(item.publishedAt) || (item.status === 'observed' && !validDate(item.observedAt))) return false
    if (item.status === 'observed' && item.observedAt?.slice(0, 7) !== item.targetMonth) return false
    if (typeof item.sourceUrl !== 'string') return false
    try { return new URL(item.sourceUrl).protocol === 'https:' } catch { return false }
  })
}

export function makePricePlot(input: unknown, year: number): PricePlot {
  const months = Array.from({ length: 12 }, (_, index) => `${index + 1}月`)
  const records = parsePriceRecords(input).filter((record) => record.targetMonth.startsWith(`${year}-`))
  const series = definitions.map((definition): PricePlotSeries => {
    const points = months.map((_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, '0')}`
      return records.filter((record) => record.product === definition.product && record.kind === definition.kind)
        .filter((record) => record.targetMonth === month)
        .sort((a, b) => (b.observedAt ?? b.publishedAt).localeCompare(a.observedAt ?? a.publishedAt))[0] ?? null
    })
    return { name: definition.name, color: definition.color, dashed: definition.dashed,
      data: points.map((point) => point?.value ?? null), records: points }
  }).filter((entry) => entry.records.some(Boolean))
  return { months, series }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

export function formatPriceTooltip(params: unknown, plot: PricePlot): string {
  const items = Array.isArray(params) ? params : [params]
  const month = items[0]?.axisValue
  const index = plot.months.indexOf(month)
  if (index < 0) return '暂无可核验记录'
  const activeNames = new Set(items.map((item) => item?.seriesName))
  const rows = plot.series.filter((entry) => activeNames.has(entry.name))
    .map((entry) => ({ entry, record: entry.records[index] }))
    .filter((row): row is { entry: PricePlotSeries; record: PriceRecord } => row.record !== null)
  if (!rows.length) return `${escapeHtml(month)}<br/>暂无可核验记录`
  return [`<strong>${escapeHtml(month)}</strong>`, ...rows.map(({ entry, record }) => {
    const source = record.status === 'expected' ? '复旦大学可持续发展研究中心' : '交易所公开行情'
    const date = record.status === 'expected' ? `发布 ${record.publishedAt}` : `交易日 ${record.observedAt}`
    return `${escapeHtml(entry.name)}：${record.value.toFixed(2)} ${record.unit}（${record.status === 'expected' ? '价格预期' : '交易实价'}）<br/>${date} · ${source} · <a href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">原文</a>`
  })].join('<br/>')
}
