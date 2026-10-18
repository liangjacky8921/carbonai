import test from 'node:test'
import assert from 'node:assert/strict'
import { formatPriceTooltip, makePricePlot } from '../src/utils/carbonPriceChart.ts'

const observed = {
  product: 'CEA', kind: 'spot_close', status: 'observed', targetMonth: '2026-10',
  observedAt: '2026-10-16', publishedAt: '2026-10-16',
  sourceUrl: 'https://www.cneeex.com/c/2026-10-16/1.shtml', value: 82.4, unit: '¥/t',
}
const expected = {
  product: 'CEA', kind: 'expected_mid', status: 'expected', targetMonth: '2026-12',
  publishedAt: '2026-09-29', sourceUrl: 'https://rcsd.fudan.edu.cn/info/1134/2138.htm',
  value: 95.64, unit: '¥/t',
}

test('旧月份不把无来源的历史快照当作交易实价', () => {
  const plot = makePricePlot([{ ...observed, targetMonth: '2026-03', observedAt: undefined }], 2026)
  assert.equal(plot.series.length, 0)
  assert.equal(makePricePlot(null, 2026).series.length, 0)
  const verifiedOld = makePricePlot([{ ...expected, targetMonth: '2026-06', value: 80.44,
    publishedAt: '2026-05-29', sourceUrl: 'https://rcsd.fudan.edu.cn/info/1134/2067.htm' }], 2026)
  assert.equal(verifiedOld.series[0].data[5], 80.44)
})

test('最新 CEA 实价按交易日入图，复旦未来预期单独标记', () => {
  const plot = makePricePlot([observed, expected], 2026)
  assert.deepEqual(plot.series.map((series) => series.name), ['CEA 日收盘价', '复旦 CEA 预期中间价'])
  assert.equal(plot.series[0].data[9], 82.4)
  assert.equal(plot.series[1].data[11], 95.64)
  assert.equal(plot.series[0].data[11], null)
  const tooltip = formatPriceTooltip([
    { axisValue: '12月', seriesName: '复旦 CEA 预期中间价', value: undefined },
  ], plot)
  assert.match(tooltip, /价格预期/)
  assert.match(tooltip, /发布 2026-09-29/)
  assert.doesNotMatch(tooltip, /undefined|NaN|交易实价/)
})

test('空值、NaN 与异常接口数据不会形成无效图例或错误单位', () => {
  const plot = makePricePlot([observed, { ...expected, value: Number.NaN },
    { ...observed, product: 'CCER', kind: 'spot_avg', sourceUrl: '' }], 2026)
  assert.deepEqual(plot.series.map((series) => series.name), ['CEA 日收盘价'])
  const tooltip = formatPriceTooltip([{ axisValue: '3月', seriesName: 'CEA 日收盘价', value: undefined }], plot)
  assert.match(tooltip, /暂无可核验记录/)
  assert.doesNotMatch(tooltip, /undefined|NaN|¥\/t/)
})
