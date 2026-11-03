<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <div class="c-card p-4 asset-context" role="note">
      <strong>碳资产资料概览</strong>
      <span>{{ marketOrigin }}。交易记录与官方价格预期分开显示；链接及字段检查不等于已核验真实成交。</span>
      <span>快照组装/缓存时间：{{ snapshotTime || '未提供' }}（接口提供，不是各报价发布日期）。本次行情请求：{{ requestTime || '尚未发起' }}（浏览器时间）。</span>
      <span>组合58/18/24、基准数值58,200、单价81.03及日期均为固定演示，不代表真实账户、持仓市值或履约结论。</span>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      <div v-for="q in displayQuotes" :key="q.key" class="c-card p-3.5 asset-card">
        <div class="text-[12px] text-[var(--c-text-2)] font-medium">{{ q.name }}</div>
        <div class="num text-[22px] font-bold text-green mt-1">{{ q.price }}<span class="text-[11px] ml-1 font-normal text-[var(--c-text-3)]">{{ q.unit }}</span></div>
        <div class="text-[10.5px] text-amber mt-1.5">{{ q.nature }}</div>
        <template v-if="q.record">
          <div class="text-[10.5px] text-[var(--c-text-3)]">来源：{{ priceRecordSource(q.record) }}</div>
          <div class="text-[10.5px] text-[var(--c-text-3)]">交易日：{{ q.record.observedAt || '不适用（价格预期）' }} · 发布：{{ q.record.publishedAt }} · 目标月份：{{ q.record.targetMonth }}</div>
          <a class="text-[11px] text-green underline" :href="q.record.sourceUrl" target="_blank" rel="noopener noreferrer">查看来源原文（需复核）</a>
        </template>
        <template v-else>
          <div class="text-[10.5px] text-[var(--c-text-3)]">资料声明来源：{{ q.source }}（未独立核验）</div>
          <div class="text-[10.5px] text-[var(--c-text-3)]">发布日期：未知；不作为当前报价</div>
          <div v-if="q.note" class="text-[10.5px] text-[var(--c-text-3)]">原参考说明：{{ q.note }}</div>
        </template>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <ChartCard title="碳资产组合结构 · 内置演示" height="320" class="lg:col-span-5" sample source-note="固定组合58/18/24，非真实持仓">
        <div ref="portfolioEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard :title="`交易记录与官方价格预期（${priceYear}）`" height="320" class="lg:col-span-7"
        :loading="marketState === 'loading'" :error="marketState === 'error' ? marketError : ''"
        :empty="marketState === 'empty'" empty-text="暂无通过来源与日期检查的价格记录；未使用旧静态曲线补齐" :source-note="marketOrigin">
        <div ref="priceEl" class="w-full h-full" />
      </ChartCard>
    </div>
    <p class="asset-note">缺失月份留空；历史交易不等于最新报价，官方价格预期不是平台预测模型。静态资料卡和图表来源分别标记；CCER当前无已核实的动态接入渠道。</p>
    <div class="c-card p-4">
      <div class="c-card-title mb-3">配额数值与估值 · 固定假设演示</div>
      <p class="asset-note">核算页当前年度 {{ dataStore.currentYear }}：{{ emissionsSourceLabel }}。当前记录标示：{{ accountingBasis.unit }}；不把相同数字转换为tCO₂或tCO₂e。{{ accountingBasis.note }}以下仅做数值差额与金额示意，不适用于真实配额履约。</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="stat-box"><div class="num text-blue">58,200</div><div class="lbl">演示基准数值（沿用当前记录展示口径假设）</div></div>
        <div class="stat-box"><div class="num text-amber">{{ hasEmissionRecords ? fmt(dataStore.yearTotal) : '—' }}</div><div class="lbl">当前核算记录合计（{{ accountingBasis.unit }}）</div></div>
        <div class="stat-box"><div class="num text-green">{{ gap === null ? '—' : gap.toLocaleString() }}</div><div class="lbl">演示数值差额（{{ accountingBasis.unit }}，取整示意）</div></div>
        <div class="stat-box"><div class="num text-red">{{ gapValue }}</div><div class="lbl">演示估值（固定乘数81.03，非本次行情）</div></div>
      </div>
    </div>
    <div class="c-card p-4">
      <div class="c-card-title mb-3">履约日期 · 内置演示资料</div>
      <p class="asset-note">日期、事项及完成标记均为预置示例，未经现行规则或企业事实核验。</p>
      <el-timeline>
        <el-timeline-item v-for="e in calendar" :key="e.date" :timestamp="e.date" :type="e.done ? 'success' : 'warning'" :hollow="!e.done">{{ e.text }}</el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<script setup lang="ts">
import { accountingUnitSummary } from '@/utils/accountingUnits'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import { CHART_AXIS, CHART_TOOLTIP } from '@/utils/chartTheme'
import { useElementResize } from '@/composables/useElementResize'
import ChartCard from '@/components/ChartCard.vue'
import { REALTIME_QUOTES } from '@/data/carbonMarket'
import { useDataStore } from '@/stores/data'
import { fmt } from '@/utils/format'
import { bizApi, backendOnline, probeBackend } from '@/api/client'
import { formatPriceTooltip, makePricePlot, marketToday, parsePriceRecords, priceRecordNature, priceRecordSource, type PriceRecord } from '@/utils/carbonPriceChart'

const dataStore = useDataStore()
const accountingBasis = computed(() => accountingUnitSummary(dataStore.yearRecords))
const DEMO_QUOTA = 58200, DEMO_PRICE = 81.03
const priceYear = Number(marketToday().slice(0, 4))
const asOf = ref(marketToday())
const priceRecords = ref<PriceRecord[]>([])
const pricePlot = computed(() => makePricePlot(priceRecords.value, priceYear, asOf.value))
const marketState = ref<'loading' | 'ready' | 'empty' | 'error'>('loading')
const marketError = ref('')
const snapshotTime = ref('')
const requestTime = ref('')
const marketOrigin = computed(() => marketState.value === 'loading' ? '正在检查行情来源'
  : marketState.value === 'error' ? '行情接口不可用；价格图留空，资料卡仅为固定参考'
  : marketState.value === 'empty' ? '没有合格价格记录；资料卡仅为固定参考'
  : '接口逐条来源记录（历史/近期交易与官方预期分别标记）')
const displayQuotes = computed(() => REALTIME_QUOTES.map(q => {
  const record = priceRecords.value.filter(r => r.targetMonth.startsWith(`${priceYear}-`) && (q.key === 'cea'
    ? r.product === 'CEA' && r.kind === 'spot_close'
    : q.key === 'fdi' && r.product === 'CEA' && r.kind === 'expected_mid'))
    .sort((a, b) => (b.observedAt ?? b.publishedAt).localeCompare(a.observedAt ?? a.publishedAt) || b.publishedAt.localeCompare(a.publishedAt) || b.targetMonth.localeCompare(a.targetMonth))[0] || null
  return { ...q, record, name: record ? (record.status === 'expected' ? '复旦 CEA 价格预期' : 'CEA 日收盘价') : q.name,
    price: record ? record.value.toFixed(2) : q.price, nature: record ? priceRecordNature(record, asOf.value) : '固定参考资料（非当前报价）' }
}))
const emissionsSourceLabel = computed(() => {
  if (dataStore.source.emissions === 'sample' && dataStore.emissions === dataStore.sampleEmissions) return '内置虚拟企业示例'
  if (dataStore.source.emissions === 'user' && dataStore.emissions === dataStore.userEmissions) return '用户上传记录（未经真实性核验）'
  return '来源待确认'
})
const hasEmissionRecords = computed(() => dataStore.yearRecords.length > 0 && Number.isFinite(dataStore.yearTotal))
const gap = computed(() => hasEmissionRecords.value ? Math.round(DEMO_QUOTA - dataStore.yearTotal) : null)
const gapValue = computed(() => {
  if (gap.value === null) return '—'
  const value = Math.abs(gap.value) * DEMO_PRICE
  return value >= 10000 ? `¥${fmt(value / 10000)}万` : `¥${fmt(value, 0)}`
})
const calendar = [
  { date: '2025.12.31', text: '配额清缴（预置示例完成标记）', done: true },
  { date: '2026.03.31', text: '年度碳排放报告（预置示例事项）', done: false },
  { date: '2026.06.30', text: '第三方核查报告（预置示例事项）', done: false },
  { date: '2026.10.15', text: 'CBAM 报告（预置示例事项）', done: false },
  { date: '2026.12.31', text: '配额清缴（预置示例事项）', done: false },
]
const portfolioEl = ref<HTMLElement | null>(null), priceEl = ref<HTMLElement | null>(null)
let c1: echarts.ECharts | null = null, c2: echarts.ECharts | null = null
let disposed = false, requestId = 0
let pending: Promise<void> | null = null

function disposePrice() { c2?.dispose(); c2 = null }

function renderPrice() {
  if (disposed || !priceEl.value || marketState.value !== 'ready') return
  const plot = pricePlot.value
  c2 ??= echarts.init(priceEl.value)
  c2.setOption({
    tooltip: { ...CHART_TOOLTIP, trigger: 'axis', enterable: true, formatter: (params: unknown) => formatPriceTooltip(params, plot) },
    legend: { data: plot.series.map(s => s.name), bottom: 0, textStyle: { color: '#9db8ae' } },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '12%', containLabel: true },
    xAxis: { ...CHART_AXIS, type: 'category', data: plot.months },
    yAxis: { ...CHART_AXIS, type: 'value', name: '¥/t', nameTextStyle: { color: '#5f7a6f' } },
    series: plot.series.map(s => ({ name: s.name, type: 'line', data: s.data, color: s.color,
      smooth: false, connectNulls: false, symbolSize: 5, lineStyle: { type: s.dashed ? 'dashed' : 'solid' } })),
  }, true)
}

function loadMarketRecords(): Promise<void> {
  if (disposed) return Promise.resolve()
  if (pending) return pending
  const id = ++requestId
  const active = () => !disposed && id === requestId
  marketState.value = 'loading'
  marketError.value = ''; priceRecords.value = []; snapshotTime.value = ''; requestTime.value = ''
  disposePrice()
  const task = (async () => {
    try {
      if (!backendOnline.value && !await probeBackend()) throw new Error('offline')
      if (!active()) return
      requestTime.value = new Date().toLocaleString('zh-CN', { hour12: false })
      const result = await bizApi.getMarketQuotes()
      if (!active()) return
      if (result.code !== 200 || !result.data || typeof result.data !== 'object') throw new Error('unavailable')
      const data = result.data as { priceRecords?: unknown; timestamp?: unknown }
      asOf.value = marketToday()
      priceRecords.value = parsePriceRecords(data.priceRecords, asOf.value)
      snapshotTime.value = typeof data.timestamp === 'string' && data.timestamp.length <= 64 ? data.timestamp : ''
      marketState.value = pricePlot.value.series.length ? 'ready' : 'empty'
      await nextTick()
      if (active()) renderPrice()
    } catch {
      if (active()) { disposePrice(); priceRecords.value = []; marketState.value = 'error'; marketError.value = '行情请求失败；未使用旧静态价格补齐，请稍后重新进入页面。' }
    }
  })()
  pending = task
  const clear = () => { if (pending === task) pending = null }
  void task.then(clear, clear)
  return task
}

onMounted(async () => {
  try { await dataStore.loadSampleData() } catch { /* 核算数据缺失不阻止行情独立检查。 */ }
  if (disposed) return
  if (portfolioEl.value) {
    c1 = echarts.init(portfolioEl.value)
    c1.setOption({ tooltip: { trigger: 'item', ...CHART_TOOLTIP }, series: [{ type: 'pie', radius: ['46%', '70%'],
      itemStyle: { borderColor: '#0a120f', borderWidth: 2, borderRadius: 6 }, label: { color: '#9db8ae' },
      data: [{ name: 'CEA 配额（演示）', value: 58, itemStyle: { color: '#10b981' } },
        { name: 'CCER（演示）', value: 18, itemStyle: { color: '#0ea5e9' } },
        { name: '碳信用储备（演示）', value: 24, itemStyle: { color: '#fde68a' } }] }] })
  }
  void loadMarketRecords()
})
function resize() { c1?.resize(); c2?.resize() }
useElementResize([portfolioEl, priceEl], resize)
onBeforeUnmount(() => { disposed = true; requestId++; c1?.dispose(); c2?.dispose(); c1 = c2 = null })
</script>

<style scoped>
.asset-context { display: grid; gap: .35rem; }
.asset-context strong { color: var(--c-text); }
.asset-context span, .asset-note { color: var(--c-text-3); font-size: .76rem; line-height: 1.65; }
.asset-note { margin-bottom: .75rem; }
.asset-card { transition: transform 0.25s, box-shadow 0.25s; }
.asset-card:hover { transform: translateY(-3px); box-shadow: 0 6px 28px rgba(16, 185, 129, 0.12); }
</style>
