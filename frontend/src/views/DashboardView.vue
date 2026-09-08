<template>
  <div class="dashboard">
    <!-- ===== 顶部：实时碳行情跑马灯 ===== -->
    <div class="ticker-card c-card mb-4">
      <div class="ticker-track" :style="{ animationDuration: quotesLoop.length * 3 + 's' }">
        <div v-for="(q, i) in quotesLoop" :key="i" class="ticker-item">
          <span class="q-name">{{ q.name }}</span>
          <span class="q-price num">{{ q.price }}</span>
          <span class="q-unit">{{ q.unit }}</span>
          <span class="q-src">{{ q.source }}</span>
          <span class="q-sep">|</span>
        </div>
      </div>
      <div class="ticker-meta">
        <el-icon class="animate-pulse" color="#10b981"><DataLine /></el-icon>
        <span>更新 {{ now }}</span>
      </div>
    </div>

    <!-- ===== 统计卡片 ===== -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <StatCard value="—" label="总排放 (tCO₂e)" color="text-green" v-if="false" />
      <div class="stat-box" v-for="s in statCards" :key="s.label">
        <div class="num text-[24px] font-bold" :class="s.color">{{ s.value }}</div>
        <div class="lbl">{{ s.label }}</div>
      </div>
    </div>

    <!-- ===== 主图表区 ===== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <ChartCard title="CEA 碳价走势 & 复旦碳价指数预测 (2026)" height="320">
        <div ref="priceEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="区域碳市场占比" height="320">
        <div ref="marketEl" class="w-full h-full" />
      </ChartCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
      <ChartCard title="粤港澳大湾区 11 城碳排放对比（3D）" height="360" class="lg:col-span-7">
        <div ref="gba3dEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="排放源 Top8（环形图）" height="360" class="lg:col-span-5">
        <div ref="top8El" class="w-full h-full" />
      </ChartCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
      <ChartCard title="Scope 分布" height="280" class="lg:col-span-4">
        <div ref="scopeEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="各年度排放趋势" height="280" class="lg:col-span-8">
        <div ref="trendEl" class="w-full h-full" />
      </ChartCard>
    </div>

    <!-- ===== 异常指标 ===== -->
    <div class="c-card p-4">
      <div class="c-card-title mb-2">异常指标与洞察</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div v-for="h in hints" :key="h" class="hint-item" v-html="h" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import 'echarts-gl'
import ChartCard from '@/components/ChartCard.vue'
import StatCard from '@/components/StatCard.vue'
import { useDataStore } from '@/stores/data'
import { REALTIME_QUOTES, PRICE_SERIES, MARKET_SHARE, GBA_CITIES } from '@/data/carbonMarket'
import { fmt } from '@/utils/format'
import { DataLine } from '@element-plus/icons-vue'

const dataStore = useDataStore()
const now = new Date().toLocaleString('zh-CN')

const quotesLoop = computed(() => [...REALTIME_QUOTES, ...REALTIME_QUOTES])

const statCards = computed(() => {
  const s = dataStore.scopeSummary
  return [
    { label: `总排放 FY${dataStore.currentYear} (tCO₂e)`, value: fmt(dataStore.yearTotal), color: 'text-green' },
    { label: 'Scope 1 直接排放', value: fmt(s['Scope 1'] || 0), color: 'text-red' },
    { label: 'Scope 2 间接排放', value: fmt(s['Scope 2'] || 0), color: 'text-amber' },
    { label: 'Scope 3 价值链排放', value: fmt(s['Scope 3'] || 0), color: 'text-blue' },
  ]
})

const hints = computed(() => {
  const recs = dataStore.yearRecords
  if (!recs.length) return ['📋 暂无核算数据 — 请在「碳排放核算」上传数据，或查看内置示例数据']
  const out: string[] = []
  const total = dataStore.yearTotal
  const maxSrc = [...recs].sort((a, b) => b.emission - a.emission)[0]
  out.push(`🔍 <b>重点关注：</b>${maxSrc.source} 排放占比最高 (${((maxSrc.emission / total) * 100).toFixed(1)}%)`)
  const s1 = (dataStore.scopeSummary['Scope 1'] || 0) / total
  if (s1 > 0.5) out.push('⚠️ <b>Scope 1 占比超 50%</b>，建议优先推进燃料替代 / 工艺优化')
  if ((dataStore.scopeSummary['Scope 2'] || 0) > 0) out.push('💡 Scope 2 电力排放可通过绿电采购(PPA)或分布式光伏降低')
  if (recs.some((r) => r.confidence === 'low')) out.push('📋 存在低置信度条目，建议人工复核排放因子')
  out.push(`📊 排放强度：${fmt(total / 8000, 3)} tCO₂e/万元营收（按行业均值）`)
  out.push(`🧮 配额缺口参考：按 58,200 tCO₂ 配额持有估算，缺口 ${fmt(Math.max(0, total - 58200))} tCO₂`)
  return out
})

// ============ ECharts 实例 ============
const priceEl = ref<HTMLElement | null>(null)
const marketEl = ref<HTMLElement | null>(null)
const gba3dEl = ref<HTMLElement | null>(null)
const top8El = ref<HTMLElement | null>(null)
const scopeEl = ref<HTMLElement | null>(null)
const trendEl = ref<HTMLElement | null>(null)
let charts: echarts.ECharts[] = []

const tt = { backgroundColor: 'rgba(13,23,20,0.94)', borderColor: '#24413a', textStyle: { color: '#e8f5ef', fontSize: 12 } }
const axis = { axisLine: { lineStyle: { color: '#1e3329' } }, axisLabel: { color: '#9db8ae' }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } } }

function init(el: HTMLElement | null): echarts.ECharts | null {
  if (!el) return null
  const c = echarts.init(el)
  charts.push(c)
  return c
}

function renderPrice(c: echarts.ECharts) {
  c.setOption({
    tooltip: { trigger: 'axis', ...tt },
    legend: { data: ['CEA收盘价', '复旦碳价指数预测中值', 'CCER均价', 'EUA(¥等值)'], bottom: 0, textStyle: { color: '#9db8ae' } },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '12%', containLabel: true },
    xAxis: { type: 'category', data: PRICE_SERIES.months, ...axis },
    yAxis: { type: 'value', name: '¥/t', nameTextStyle: { color: '#5f7a6f' }, ...axis },
    series: [
      { name: 'CEA收盘价', type: 'line', data: PRICE_SERIES.cea, color: '#10b981', smooth: true, symbolSize: 6,
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16,185,129,0.25)' }, { offset: 1, color: 'rgba(16,185,129,0)' }]) },
        animationDuration: 1500 },
      { name: '复旦碳价指数预测中值', type: 'line', data: PRICE_SERIES.fudan, color: '#f59e0b', lineStyle: { type: 'dashed', width: 2 }, smooth: true, animationDuration: 2000 },
      { name: 'CCER均价', type: 'line', data: PRICE_SERIES.ccer, color: '#0ea5e9', smooth: true, animationDuration: 1800 },
      { name: 'EUA(¥等值)', type: 'line', data: PRICE_SERIES.euaCny, color: '#8b5cf6', lineStyle: { type: 'dotted', width: 1.5 }, smooth: true, animationDuration: 2200 },
    ],
  })
}

function renderMarket(c: echarts.ECharts) {
  c.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)', ...tt },
    series: [{
      type: 'pie', radius: ['42%', '70%'], center: ['50%', '46%'],
      itemStyle: { borderColor: '#0a120f', borderWidth: 2, borderRadius: 6 },
      label: { color: '#9db8ae', fontSize: 10.5 },
      data: MARKET_SHARE.map((m) => ({ name: m.name, value: m.value, itemStyle: { color: m.color } })),
      animationType: 'scale', animationEasing: 'elasticOut',
    }],
  })
}

function renderGba3d(c: echarts.ECharts) {
  const cities = GBA_CITIES.map((x) => x.name)
  c.setOption({
    tooltip: { ...tt, formatter: (p: any) => `${p.value[0]} ${p.value[1]}<br/>排放量：${p.value[2]} 万tCO₂` },
    visualMap: {
      show: false, min: 300, max: 5500, inRange: { color: ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444'] },
    },
    xAxis3D: { type: 'category', data: cities, nameTextStyle: { color: '#9db8ae' }, axisLabel: { textStyle: { color: '#9db8ae', fontSize: 10 } } },
    yAxis3D: { type: 'category', data: [''], axisLabel: { textStyle: { color: '#9db8ae' } } },
    zAxis3D: { type: 'value', name: '万tCO₂', nameTextStyle: { color: '#5f7a6f' }, axisLabel: { textStyle: { color: '#9db8ae' } }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.5)' } } },
    grid3D: {
      boxWidth: 200, boxDepth: 60, boxHeight: 70,
      axisLine: { lineStyle: { color: '#1e3329' } },
      axisPointer: { lineStyle: { color: '#10b981' } },
      splitLine: { lineStyle: { color: 'rgba(30,51,41,0.4)' } },
      environment: 'none',
      light: { main: { intensity: 1.2, shadow: true, alpha: 40, beta: 40 }, ambient: { intensity: 0.3 } },
      viewControl: { autoRotate: true, autoRotateSpeed: 8, distance: 220, alpha: 28, beta: 35 },
    },
    series: [{
      type: 'bar3D', shading: 'lambert',
      data: GBA_CITIES.map((x, i) => [i, 0, x.emission]),
      barSize: 12,
      itemStyle: { opacity: 0.9 },
      emphasis: { itemStyle: { color: '#6ee7b7' } },
      animationDurationUpdate: 1000, animation: true,
    }],
  })
}

function renderTop8(c: echarts.ECharts) {
  const bySrc: Record<string, number> = {}
  dataStore.yearRecords.forEach((r) => { bySrc[r.source] = (bySrc[r.source] || 0) + r.emission })
  const top8 = Object.entries(bySrc).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const colors = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#38bdf8', '#a3e635']
  c.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} tCO₂e ({d}%)', ...tt },
    legend: { orient: 'vertical', right: 6, top: 'center', textStyle: { color: '#9db8ae', fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['40%', '68%'], center: ['38%', '50%'],
      itemStyle: { borderColor: '#0a120f', borderWidth: 2, borderRadius: 5 },
      label: { show: false },
      data: top8.map((t, i) => ({ name: t[0], value: +t[1].toFixed(1), itemStyle: { color: colors[i % colors.length] } })),
      animationType: 'scale', animationEasing: 'elasticOut', animationDelay: (i: number) => i * 80,
    }],
  })
}

function renderScope(c: echarts.ECharts) {
  const s = dataStore.scopeSummary
  c.setOption({
    tooltip: { trigger: 'item', ...tt },
    series: [{
      type: 'pie', radius: ['50%', '75%'],
      itemStyle: { borderColor: '#0a120f', borderWidth: 2, borderRadius: 6 },
      label: { color: '#9db8ae' },
      data: [
        { name: 'Scope 1 直接排放', value: +(s['Scope 1'] || 0).toFixed(1), itemStyle: { color: '#ef4444' } },
        { name: 'Scope 2 间接排放', value: +(s['Scope 2'] || 0).toFixed(1), itemStyle: { color: '#f59e0b' } },
        { name: 'Scope 3 价值链排放', value: +(s['Scope 3'] || 0).toFixed(1), itemStyle: { color: '#0ea5e9' } },
      ],
      animationType: 'scale', animationEasing: 'elasticOut',
    }],
  })
}

function renderTrend(c: echarts.ECharts) {
  const years = dataStore.emissionYears
  const s1: number[] = [], s2: number[] = [], s3: number[] = []
  years.forEach((y) => {
    const recs = dataStore.emissions.filter((r) => r.year === y)
    const g = (sc: string) => +recs.filter((r) => r.scope === sc).reduce((a, b) => a + b.emission, 0).toFixed(1)
    s1.push(g('Scope 1')); s2.push(g('Scope 2')); s3.push(g('Scope 3'))
  })
  c.setOption({
    tooltip: { trigger: 'axis', ...tt },
    legend: { data: ['Scope1', 'Scope2', 'Scope3'], bottom: 0, textStyle: { color: '#9db8ae' } },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '14%', containLabel: true },
    xAxis: { type: 'category', data: years.map(String), ...axis },
    yAxis: { type: 'value', name: 'tCO₂e', nameTextStyle: { color: '#5f7a6f' }, ...axis },
    series: [
      { name: 'Scope1', type: 'line', data: s1, color: '#ef4444', smooth: true, stack: 'x', areaStyle: { opacity: 0.25 }, animationDuration: 1400 },
      { name: 'Scope2', type: 'line', data: s2, color: '#f59e0b', smooth: true, stack: 'x', areaStyle: { opacity: 0.25 }, animationDuration: 1600 },
      { name: 'Scope3', type: 'line', data: s3, color: '#0ea5e9', smooth: true, stack: 'x', areaStyle: { opacity: 0.25 }, animationDuration: 1800 },
    ],
  })
}

function renderAll() {
  const p = init(priceEl.value); if (p) renderPrice(p)
  const m = init(marketEl.value); if (m) renderMarket(m)
  const g = init(gba3dEl.value); if (g) renderGba3d(g)
  const t8 = init(top8El.value); if (t8) renderTop8(t8)
  const sc = init(scopeEl.value); if (sc) renderScope(sc)
  const tr = init(trendEl.value); if (tr) renderTrend(tr)
}

function resizeAll() { charts.forEach((c) => c.resize()) }

onMounted(async () => {
  await dataStore.loadSampleData()
  renderAll()
  window.addEventListener('resize', resizeAll)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeAll)
  charts.forEach((c) => c.dispose())
})
</script>

<style scoped>
.dashboard { max-width: 1600px; margin: 0 auto; }

/* 行情跑马灯 */
.ticker-card { position: relative; overflow: hidden; padding: 12px 16px; }
.ticker-track {
  display: flex; gap: 34px; width: max-content;
  animation: marquee linear infinite;
}
.ticker-item { display: flex; align-items: center; gap: 8px; font-size: 13px; white-space: nowrap; }
.q-name { color: var(--c-text-2); }
.q-price { color: var(--c-green); font-weight: 700; font-size: 16px; }
.q-unit { color: var(--c-text-3); font-size: 11px; }
.q-src { color: var(--c-text-3); font-size: 11px; }
.q-sep { color: var(--c-border-2); }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.ticker-meta {
  position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
  display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--c-text-3);
  background: linear-gradient(90deg, transparent, #0d1714 30%); padding-left: 30px;
}

.hint-item {
  padding: 9px 12px; border-radius: 8px; font-size: 12.5px; line-height: 1.7; color: var(--c-text-2);
  background: rgba(16, 185, 129, 0.05); border-left: 3px solid var(--c-green);
}
.hint-item :deep(b) { color: var(--c-text); }
</style>
