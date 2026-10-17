<template>
  <div class="dashboard">
    <header class="dashboard-heading">
      <div>
        <p class="dashboard-eyebrow">CarbonAI · 数据总览</p>
        <h2>数据大厅</h2>
        <p class="dashboard-description">查看当前排放记录、碳市场参考行情与区域示例分析。</p>
      </div>
      <div class="dashboard-context" aria-label="当前数据范围">
        <span class="context-item">记录范围 <strong class="num">{{ recordRange }}</strong></span>
        <span class="context-item" :class="hasUserEmissions ? 'context-user' : 'context-sample'">
          {{ hasUserEmissions ? '用户上传排放数据' : '内置示例排放数据' }}
        </span>
      </div>
    </header>
    <p class="dashboard-data-note">排放记录未提供更新日期；页面展示的是已载入数据，并非实时监测。</p>

    <section class="dashboard-filters" aria-label="排放记录筛选">
      <label>年份
        <select v-model.number="dataStore.currentYear" :disabled="!dataStore.emissionYears.length">
          <option v-for="year in dataStore.emissionYears" :key="year" :value="year">{{ year }} 年</option>
        </select>
      </label>
      <label>开始月份
        <select v-model.number="startMonth" :disabled="!hasMonthData">
          <option v-for="month in 12" :key="month" :value="month">{{ month }} 月</option>
        </select>
      </label>
      <label>结束月份
        <select v-model.number="endMonth" :disabled="!hasMonthData">
          <option v-for="month in 12" :key="month" :value="month" :disabled="month < startMonth">{{ month }} 月</option>
        </select>
      </label>
      <label>部门
        <select v-model="selectedDepartment" :disabled="!departments.length">
          <option value="">全部部门</option>
          <option v-for="department in departments" :key="department" :value="department">{{ department }}</option>
        </select>
      </label>
      <button v-if="filtersActive" type="button" class="filter-reset" @click="resetFilters">重置筛选</button>
      <p class="filter-note">仅筛选排放记录、指标与核算图；行情和湾区城市图使用各自的参考或示例数据。<span v-if="!hasMonthData">当前年份无有效月份字段，月份筛选不可用。</span><span v-else-if="hasUndatedRecords">所选月份范围会排除月份缺失的记录。</span></p>
    </section>

    <div class="ticker-card c-card">
      <div class="ticker-flow">
        <div class="ticker-track" :class="{ paused: tickerStopped }" :style="{ animationDuration: quotesLoop.length * 3 + 's' }">
          <div v-for="(q, i) in quotesLoop" :key="i" class="ticker-item">
            <span class="q-name">{{ q.name }}</span>
            <span class="q-price num">{{ q.price }}</span>
            <span class="q-unit">{{ q.unit }}</span>
            <span class="q-src">{{ q.source }}</span>
            <span class="q-sep">|</span>
          </div>
        </div>
      </div>
      <div class="ticker-meta">
        <el-icon color="#81c7a4"><DataLine /></el-icon>
        <span>{{ marketTimestamp ? `接口响应 ${marketTimestamp}` : '本地参考快照' }}</span>
        <button
          type="button"
          class="ticker-control"
          :disabled="reducedMotion"
          :aria-pressed="tickerPaused"
          :aria-label="reducedMotion ? '行情滚动已按系统设置停止' : tickerPaused ? '继续行情滚动' : '暂停行情滚动'"
          @click="tickerPaused = !tickerPaused"
        >{{ reducedMotion ? '已静止' : tickerPaused ? '继续' : '暂停' }}</button>
      </div>
    </div>

    <!-- ===== 统计卡片 ===== -->
    <div class="dashboard-kpis grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="stat-box kpi-card" v-for="(s, index) in statCards" :key="s.label" :style="{ '--kpi-index': index }">
        <div class="lbl">{{ s.label }}</div>
        <div v-if="chartsLoading" class="skeleton kpi-skeleton" aria-label="正在加载排放记录" />
        <div v-else class="kpi-measure"><span v-if="hasYearRecords" class="num" :class="s.color"><MotionNumber :value="s.value" :reduced-motion="reducedMotion" /></span><span v-else class="num kpi-unavailable">—</span><span v-if="hasYearRecords" class="kpi-unit">tCO₂e</span></div>
        <div class="kpi-meta">{{ chartsLoading ? '正在加载排放记录' : hasYearRecords ? s.meta : emissionEmptyText }}</div>
      </div>
    </div>
    <p class="dashboard-data-note indicator-note">碳强度缺少已核实的营收或产值分母；能源活动记录含不同单位，暂不汇总为能源消耗指标。</p>

    <div class="dashboard-section-label"><h3>碳市场参考</h3><span>价格与指数快照</span></div>
    <div class="chart-grid grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="CEA、CCER 与复旦指数参考走势（2026）" height="320" :loading="chartsLoading" :empty="!priceSeriesAvailable" empty-text="暂无可展示的价格序列">
        <div ref="priceEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="区域碳配额参考价格（¥/t）" height="320" :loading="chartsLoading" :empty="!dynamicMarketShare.length" empty-text="暂无区域参考价格">
        <div ref="marketEl" class="w-full h-full" />
      </ChartCard>
    </div>
    <p class="dashboard-source-note">{{ marketSourceText }}{{ marketTimestamp ? ` · 接口响应 ${marketTimestamp}` : '' }}。各行情原始发布时间未统一提供。</p>

    <div class="dashboard-section-label"><h3>排放与空间</h3><span>区域图为示例数据</span></div>
    <div class="chart-grid grid grid-cols-1 lg:grid-cols-12 gap-4">
      <ChartCard title="粤港澳大湾区 11 城碳排放对比（3D）" height="360" class="lg:col-span-7" :loading="chartsLoading" :empty="!GBA_CITIES.length" empty-text="暂无区域示例数据" sample>
        <template #extra><label class="city-picker">查看城市 <select :value="selectedCity?.name || ''" @change="selectCity"><option value="">选择城市</option><option v-for="city in GBA_CITIES" :key="city.name" :value="city.name">{{ city.name }}</option></select></label></template>
        <div class="relative w-full h-full">
          <div ref="gba3dEl" class="w-full h-full" />
          <transition name="page">
            <div v-if="selectedCity" class="city-popover">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-bold text-[var(--c-green)]">
                  {{ selectedCity.name }}
                  <span class="text-xs text-[var(--c-text-3)] font-normal">{{ selectedCity.en }}</span>
                </div>
                <button class="cp-close" type="button" aria-label="关闭城市详情" @click="selectedCity = null">×</button>
              </div>
              <div class="grid grid-cols-3 gap-2 text-center">
                <div class="cp-cell"><div class="num text-amber">{{ selectedCity.emission }}</div><div>碳排放(万t)</div></div>
                <div class="cp-cell"><div class="num text-blue">{{ selectedCity.gdp }}</div><div>GDP(亿元)</div></div>
                <div class="cp-cell"><div class="num text-green">{{ selectedCity.intensity }}</div><div>强度(t/万元)</div></div>
                <div class="cp-cell"><div class="num">{{ selectedCity.population }}</div><div>人口(万)</div></div>
                <div class="cp-cell"><div class="num">{{ selectedCity.area }}</div><div>面积(km²)</div></div>
                <div class="cp-cell"><div class="num text-purple">{{ selectedCity.perCapita }}</div><div>人均(t/人)</div></div>
              </div>
              <div class="text-[11px] text-[var(--c-text-2)] mt-2">支柱产业：{{ selectedCity.industry }}</div>
              <div class="text-[11px] text-[var(--c-text-3)] mt-1">排放排名：第 {{ rankOf(selectedCity) }} / {{ GBA_CITIES.length }} 位</div>
            </div>
          </transition>
        </div>
      </ChartCard>
      <ChartCard title="排放源 Top8（环形图）" height="360" class="lg:col-span-5" :loading="chartsLoading" :error="emissionLoadError" :empty="!hasYearRecords" :empty-text="emissionEmptyText" :sample="!hasUserEmissions" :user-tag="hasUserEmissions">
        <div ref="top8El" class="w-full h-full" />
      </ChartCard>
    </div>

    <div class="dashboard-section-label"><h3>核算结构</h3><span>基于当前排放记录</span></div>
    <div class="chart-grid grid grid-cols-1 lg:grid-cols-12 gap-4">
      <ChartCard title="Scope 分布" height="280" class="lg:col-span-4" :loading="chartsLoading" :error="emissionLoadError" :empty="!hasYearRecords" :empty-text="emissionEmptyText" :sample="!hasUserEmissions" :user-tag="hasUserEmissions">
        <div ref="scopeEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="当前筛选逐月排放记录" height="280" class="lg:col-span-8" :loading="chartsLoading" :error="emissionLoadError" :empty="!hasDatedFilteredRecords" :empty-text="hasYearRecords ? '当前筛选记录缺少月份，无法绘制逐月趋势' : emissionEmptyText" :sample="!hasUserEmissions" :user-tag="hasUserEmissions">
        <div ref="trendEl" class="w-full h-full" />
      </ChartCard>
    </div>

    <!-- ===== 异常指标 ===== -->
    <div class="dashboard-insights c-card p-4">
      <div class="c-card-title mb-2">异常指标与洞察</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div v-for="h in hints" :key="h" class="hint-item">{{ h }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import { CHART_AXIS, CHART_TOOLTIP } from '@/utils/chartTheme'
import { useElementResize } from '@/composables/useElementResize'
import 'echarts-gl'
import ChartCard from '@/components/ChartCard.vue'
import MotionNumber from '@/components/MotionNumber.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useDataStore, type EmissionRecord } from '@/stores/data'
import { REALTIME_QUOTES, PRICE_SERIES, MARKET_SHARE, GBA_CITIES, type GbaCity } from '@/data/carbonMarket'
import { fmt } from '@/utils/format'
import { DataLine } from '@element-plus/icons-vue'
import { bizApi, backendOnline } from '@/api/client'

const dataStore = useDataStore()
const reducedMotion = useReducedMotion()
const tickerPaused = ref(false)
const tickerStopped = computed(() => tickerPaused.value || reducedMotion.value)
const chartsLoading = ref(true)

// ============ 碳市场行情（后端在线则拉取实时快照，离线回退本地静态） ============
const dynamicQuotes = ref(REALTIME_QUOTES)
const dynamicPriceSeries = ref(PRICE_SERIES)
const dynamicMarketShare = ref(MARKET_SHARE)
const marketTimestamp = ref('')
const marketLiveSources = ref<string[]>([])
const marketFetchFailed = ref(false)

const quotesLoop = computed(() => [...dynamicQuotes.value, ...dynamicQuotes.value])
const hasUserEmissions = computed(() => dataStore.source.emissions === 'user' && dataStore.userEmissions.length > 0)
const startMonth = shallowRef(1)
const endMonth = shallowRef(12)
const selectedDepartment = shallowRef('')
const yearRecords = computed(() => dataStore.yearRecords)
const departments = computed(() => [...new Set(yearRecords.value.map((record) => record.department).filter((value): value is string => typeof value === 'string' && value.trim().length > 0))].sort((a, b) => a.localeCompare(b, 'zh-CN')))
const hasMonthData = computed(() => yearRecords.value.some((record) => validMonth(record.month)))
const hasUndatedRecords = computed(() => yearRecords.value.some((record) => !validMonth(record.month)))
const filtersActive = computed(() => selectedDepartment.value !== '' || (hasMonthData.value && (startMonth.value !== 1 || endMonth.value !== 12)))
const filteredRecords = computed(() => yearRecords.value.filter((record) =>
  (!selectedDepartment.value || record.department === selectedDepartment.value)
  && (!hasMonthData.value || (startMonth.value === 1 && endMonth.value === 12) || (validMonth(record.month) && record.month! >= startMonth.value && record.month! <= endMonth.value))))
const hasYearRecords = computed(() => filteredRecords.value.length > 0)
const hasDatedFilteredRecords = computed(() => filteredRecords.value.some((record) => validMonth(record.month)))
const filteredTotal = computed(() => filteredRecords.value.reduce((sum, record) => sum + record.emission, 0))
const filteredScope = computed(() => {
  const summary: Record<EmissionRecord['scope'], number> = { 'Scope 1': 0, 'Scope 2': 0, 'Scope 3': 0 }
  filteredRecords.value.forEach((record) => { summary[record.scope] += record.emission })
  return summary
})
const emissionEmptyText = computed(() => yearRecords.value.length ? '当前筛选条件下无排放记录' : `${dataStore.currentYear} 年无排放记录`)

function validMonth(month: number | undefined): month is number {
  return typeof month === 'number' && Number.isInteger(month) && month >= 1 && month <= 12
}
function resetFilters() {
  startMonth.value = 1
  endMonth.value = 12
  selectedDepartment.value = ''
}
watch(startMonth, (month) => { if (endMonth.value < month) endMonth.value = month })
watch(() => dataStore.currentYear, resetFilters)
watch(departments, (available) => { if (selectedDepartment.value && !available.includes(selectedDepartment.value)) selectedDepartment.value = '' })
const recordRange = computed(() => {
  const records = filteredRecords.value
  if (!records.length) return `${dataStore.currentYear} 年（无记录）`
  const months = records.map((record) => record.month)
  if (months.some((month) => !validMonth(month))) {
    return `${dataStore.currentYear} 年（月份未提供）`
  }
  return `${dataStore.currentYear} 年 ${Math.min(...(months as number[]))}–${Math.max(...(months as number[]))} 月记录`
})
const emissionLoadError = computed(() => !chartsLoading.value && !dataStore.emissions.length
  ? '排放记录未载入，请检查示例数据文件或重新上传数据'
  : undefined)
const priceSeriesAvailable = computed(() => {
  const series = dynamicPriceSeries.value
  return series.months.length > 0 && [series.cea, series.ccer, series.fudan, series.euaCny]
    .some((values) => values.some((value) => typeof value === 'number'))
})
const marketSourceText = computed(() => marketLiveSources.value.length
  ? `${marketLiveSources.value.join('、')}取自公开页面；其余为参考快照`
  : marketFetchFailed.value ? '行情接口请求失败，展示内置参考快照' : '内置或接口参考快照，未确认实源更新')
const statCards = computed(() => {
  const s = filteredScope.value
  return [
    { label: '总排放', meta: recordRange.value, value: filteredTotal.value, color: 'text-green' },
    { label: 'Scope 1 · 直接排放', meta: recordRange.value, value: s['Scope 1'] || 0, color: 'text-red' },
    { label: 'Scope 2 · 间接排放', meta: recordRange.value, value: s['Scope 2'] || 0, color: 'text-amber' },
    { label: 'Scope 3 · 价值链排放', meta: recordRange.value, value: s['Scope 3'] || 0, color: 'text-blue' },
  ]
})

// 异常洞察的行业示例基准：目标企业年营收（万元）与配额持有量（tCO₂）
const REVENUE_BASELINE = 8000
const QUOTA_HOLDING = 58200

const hints = computed(() => {
  const recs = filteredRecords.value
  if (!recs.length) return [emissionEmptyText.value]
  const out: string[] = []
  const total = filteredTotal.value
  const maxSrc = [...recs].sort((a, b) => b.emission - a.emission)[0]
  if (total > 0) out.push(`重点关注：${maxSrc.source} 排放占比最高 (${((maxSrc.emission / total) * 100).toFixed(1)}%)`)
  const s1 = total > 0 ? (filteredScope.value['Scope 1'] || 0) / total : 0
  if (s1 > 0.5) out.push('Scope 1 占比超 50%，建议优先推进燃料替代 / 工艺优化')
  if ((filteredScope.value['Scope 2'] || 0) > 0) out.push('Scope 2 电力排放可通过绿电采购(PPA)或分布式光伏降低')
  if (recs.some((r) => r.confidence === 'low')) out.push('存在低置信度条目，建议人工复核排放因子')
  out.push(`排放强度示意：${fmt(total / REVENUE_BASELINE, 3)} tCO₂e/万元营收（按示例营收 ${REVENUE_BASELINE} 万元估算，非企业实测）`)
  out.push(`配额缺口参考：按 ${QUOTA_HOLDING} tCO₂ 配额持有估算，缺口 ${fmt(Math.max(0, total - QUOTA_HOLDING))} tCO₂`)
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
let top8Compact: boolean | null = null
let scopeCompact: boolean | null = null

// 3D 城市图中当前选中的城市（点击柱子更新）
const selectedCity = ref<GbaCity | null>(null)
function selectCity(event: Event) {
  const name = (event.target as HTMLSelectElement).value
  selectedCity.value = GBA_CITIES.find((city) => city.name === name) || null
}

function rankOf(city: GbaCity): number {
  const sorted = [...GBA_CITIES].sort((a, b) => b.emission - a.emission)
  return sorted.findIndex((c) => c.name === city.name) + 1
}

const tt = CHART_TOOLTIP
const axis = CHART_AXIS

function init(el: HTMLElement | null): echarts.ECharts | null {
  if (!el) return null
  const c = echarts.getInstanceByDom(el) || echarts.init(el)
  if (charts.includes(c)) return c
  charts.push(c)
  return c
}

function renderPrice(c: echarts.ECharts) {
  const ds = dynamicPriceSeries.value
  c.setOption({
    animation: !reducedMotion.value,
    tooltip: { ...tt, trigger: 'axis', valueFormatter: (value: number | string) => `${value} ¥/t` },
    legend: { type: 'scroll', data: ['CEA收盘价', '复旦碳价指数预测中值', 'CCER均价', 'EUA(¥等值)'], bottom: 0, left: 8, right: 8, textStyle: { color: '#b4c9bc', fontSize: 10 } },
    grid: { left: 44, right: 46, bottom: 62, top: 28 },
    xAxis: { type: 'category', data: ds.months, ...axis, axisLabel: { interval: 'auto', hideOverlap: true, color: '#aac1b2', fontSize: 10 } },
    yAxis: [
      { type: 'value', name: '¥/t', nameTextStyle: { color: '#92ad9d' }, ...axis },
      { type: 'value', name: 'EUA 折算', nameTextStyle: { color: '#92ad9d' }, ...axis },
    ],
    series: [
      { name: 'CEA收盘价', type: 'line', data: ds.cea, color: '#10b981', smooth: true, symbolSize: 6,
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16,185,129,0.25)' }, { offset: 1, color: 'rgba(16,185,129,0)' }]) },
        animationDuration: 1500 },
      { name: '复旦碳价指数预测中值', type: 'line', data: ds.fudan, color: '#f59e0b', lineStyle: { type: 'dashed', width: 2 }, smooth: true, animationDuration: 2000 },
      { name: 'CCER均价', type: 'line', data: ds.ccer, color: '#0ea5e9', smooth: true, animationDuration: 1800 },
      { name: 'EUA(¥等值)', type: 'line', yAxisIndex: 1, data: ds.euaCny, color: '#8b5cf6', lineStyle: { type: 'dotted', width: 1.5 }, smooth: true, animationDuration: 2200 },
    ],
  })
}

function renderMarket(c: echarts.ECharts) {
  const ds = dynamicMarketShare.value
  c.setOption({
    animation: !reducedMotion.value,
    tooltip: { ...tt, trigger: 'item', formatter: '{b}: {c} ¥/t' },
    grid: { left: '39%', right: 38, top: 12, bottom: 32 },
    xAxis: { type: 'value', name: '¥/t', nameTextStyle: { color: '#92ad9d' }, ...axis },
    yAxis: { type: 'category', inverse: true, data: ds.map((m) => m.name), axisLabel: { color: '#b4c9bc', fontSize: 10, width: 110, overflow: 'truncate' }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar', barMaxWidth: 17,
      label: { show: true, position: 'right', formatter: '{c}', color: '#c3d9cb', fontSize: 10 },
      data: ds.map((m) => ({ name: m.name, value: m.value, itemStyle: { color: m.color } })),
    }],
  })
}

function renderGba3d(c: echarts.ECharts) {
  const cities = GBA_CITIES.map((x) => x.name)
  c.setOption({
    animation: !reducedMotion.value,
    tooltip: {
      ...tt,
      formatter: (p: any) => {
        const city = GBA_CITIES[p.dataIndex]
        return city
          ? `${city.name} (${city.en})<br/>碳排放：${city.emission} 万tCO₂<br/>强度：${city.intensity} t/万元GDP<br/>人口：${city.population} 万`
          : ''
      },
    },
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
      viewControl: { autoRotate: !reducedMotion.value, autoRotateSpeed: 8, distance: 220, alpha: 28, beta: 35 },
    },
    series: [{
      type: 'bar3D', shading: 'lambert',
      data: GBA_CITIES.map((x, i) => [i, 0, x.emission]),
      barSize: 12,
      itemStyle: { opacity: 0.9 },
      emphasis: { itemStyle: { color: '#6ee7b7' } },
      animationDurationUpdate: 1000, animation: !reducedMotion.value,
    }],
  })
  c.off('click')
  c.on('click', (params: any) => {
    const idx = params.dataIndex
    if (idx != null && GBA_CITIES[idx]) {
      selectedCity.value = GBA_CITIES[idx]
    }
  })
}

function renderTop8(c: echarts.ECharts) {
  const bySrc: Record<string, number> = {}
  filteredRecords.value.forEach((r) => { bySrc[r.source] = (bySrc[r.source] || 0) + r.emission })
  const top8 = Object.entries(bySrc).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const colors = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#38bdf8', '#a3e635']
  const compact = c.getWidth() < 440
  top8Compact = compact
  c.setOption({
    animation: !reducedMotion.value,
    tooltip: { trigger: 'item', formatter: '{b}: {c} tCO₂e ({d}%)', ...tt },
    legend: compact
      ? { type: 'scroll', orient: 'horizontal', left: 8, right: 8, bottom: 4, textStyle: { color: '#b4c9bc', fontSize: 10 } }
      : { type: 'scroll', orient: 'vertical', right: 6, top: 'center', bottom: 10, textStyle: { color: '#b4c9bc', fontSize: 11 } },
    series: [{
      type: 'pie', radius: compact ? ['34%', '59%'] : ['40%', '68%'], center: compact ? ['50%', '43%'] : ['38%', '50%'],
      itemStyle: { borderColor: '#0a120f', borderWidth: 2, borderRadius: 5 },
      label: { show: false },
      data: top8.map((t, i) => ({ name: t[0], value: +t[1].toFixed(1), itemStyle: { color: colors[i % colors.length] } })),
      animationType: 'scale', animationEasing: 'elasticOut', animationDelay: (i: number) => i * 80,
    }],
  })
}

function renderScope(c: echarts.ECharts) {
  const s = filteredScope.value
  const compact = c.getWidth() < 440
  scopeCompact = compact
  c.setOption({
    animation: !reducedMotion.value,
    tooltip: { trigger: 'item', ...tt },
    legend: compact ? { type: 'scroll', bottom: 2, left: 8, right: 8, textStyle: { color: '#b4c9bc', fontSize: 10 } } : { show: false },
    series: [{
      type: 'pie', radius: compact ? ['36%', '61%'] : ['50%', '70%'], center: compact ? ['50%', '43%'] : ['50%', '50%'],
      itemStyle: { borderColor: '#0a120f', borderWidth: 2, borderRadius: 6 },
      label: compact
        ? { show: true, position: 'inside', color: '#f1f8f3', fontSize: 10, formatter: '{d}%' }
        : { color: '#b4c9bc', fontSize: 10, formatter: '{b}\n{d}%' },
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
  const months = [...new Set(filteredRecords.value.map((record) => record.month).filter(validMonth))].sort((a, b) => a - b)
  const s1: number[] = [], s2: number[] = [], s3: number[] = []
  months.forEach((month) => {
    const recs = filteredRecords.value.filter((record) => record.month === month)
    const g = (sc: string) => +recs.filter((r) => r.scope === sc).reduce((a, b) => a + b.emission, 0).toFixed(1)
    s1.push(g('Scope 1')); s2.push(g('Scope 2')); s3.push(g('Scope 3'))
  })
  c.setOption({
    animation: !reducedMotion.value,
    tooltip: { ...tt, trigger: 'axis', valueFormatter: (value: number | string) => `${value} tCO₂e` },
    legend: { data: ['Scope1', 'Scope2', 'Scope3'], bottom: 0, textStyle: { color: '#b4c9bc', fontSize: 10 } },
    grid: { left: 54, right: 14, bottom: 48, top: 25 },
    xAxis: { type: 'category', data: months.map((month) => `${month} 月`), ...axis, axisLabel: { color: '#aac1b2', fontSize: 10 } },
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

function renderEmissionCharts() {
  charts = charts.filter((chart) => {
    if (document.contains(chart.getDom())) return true
    chart.dispose()
    return false
  })
  const top8 = init(top8El.value); if (top8) renderTop8(top8)
  const scope = init(scopeEl.value); if (scope) renderScope(scope)
  const trend = init(trendEl.value); if (trend) renderTrend(trend)
}

function resizeAll() {
  charts.forEach((c) => c.resize())
  const top8 = top8El.value && echarts.getInstanceByDom(top8El.value)
  if (top8 && (top8.getWidth() < 440) !== top8Compact) renderTop8(top8)
  const scope = scopeEl.value && echarts.getInstanceByDom(scopeEl.value)
  if (scope && (scope.getWidth() < 440) !== scopeCompact) renderScope(scope)
}
useElementResize([priceEl, marketEl, gba3dEl, top8El, scopeEl, trendEl], resizeAll)

watch(() => [dataStore.emissions, dataStore.currentYear, startMonth.value, endMonth.value, selectedDepartment.value], async () => {
  if (chartsLoading.value) return
  await nextTick()
  renderEmissionCharts()
}, { flush: 'post' })

watch(reducedMotion, (reduced) => {
  charts.forEach((chart) => chart.setOption({ animation: !reduced }))
  const gba = gba3dEl.value && echarts.getInstanceByDom(gba3dEl.value)
  if (gba) gba.setOption({ grid3D: { viewControl: { autoRotate: !reduced } } })
})

onMounted(async () => {
  // 优先拉取后端行情快照（含时间戳），离线自动降级本地静态
  try {
    if (backendOnline.value) {
      const r = await bizApi.getMarketQuotes()
      if (r.code === 200 && r.data) {
        const d: any = r.data
        if (d.quotes) dynamicQuotes.value = d.quotes
        if (d.priceSeries) dynamicPriceSeries.value = d.priceSeries
        if (d.marketShare) dynamicMarketShare.value = d.marketShare
        if (d.timestamp) marketTimestamp.value = d.timestamp
        if (Array.isArray(d.liveSources)) marketLiveSources.value = d.liveSources.filter((source: unknown): source is string => typeof source === 'string')
      } else {
        marketFetchFailed.value = true
      }
    }
  } catch {
    // 行情接口失败时继续使用已标注来源的本地静态快照。
    marketFetchFailed.value = true
  }
  await dataStore.loadSampleData()
  chartsLoading.value = false
  await nextTick()
  renderAll()
})
onBeforeUnmount(() => {
  charts.forEach((c) => c.dispose())
})
</script>

<style scoped>
.dashboard {
  max-width: 1600px;
  min-width: 0;
  margin: 0 auto;
  padding: 4px 0 28px;
  color: var(--c-text);
}
.dashboard-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin: 0 0 18px;
}
.dashboard-eyebrow { margin: 0 0 5px; color: #82bea0; font-size: 11px; font-weight: 600; letter-spacing: .06em; }
.dashboard-heading h2 { margin: 0; color: #f1f8f3; font-size: clamp(25px, 2.2vw, 34px); line-height: 1.2; font-weight: 670; letter-spacing: -.035em; }
.dashboard-description { margin: 7px 0 0; color: #9eb4aa; font-size: 13px; line-height: 1.55; }
.dashboard-data-note, .dashboard-source-note { margin: 0; color: #90aa9a; font-size: 11px; line-height: 1.55; }
.dashboard-data-note { margin-top: -8px; }
.dashboard-source-note { margin-top: 8px; }
.indicator-note { margin-top: 8px; }
.dashboard-filters {
  display: flex; flex-wrap: wrap; align-items: end; gap: 9px 12px;
  margin: 13px 0 15px; padding: 12px; border: 1px solid #2b4034; border-radius: 8px;
  background: #111c17;
}
.dashboard-filters label, .city-picker { display: flex; flex-direction: column; gap: 5px; color: #a7c0ae; font-size: 11px; }
.dashboard-filters select, .city-picker select {
  min-width: 95px; min-height: 40px; padding: 6px 27px 6px 9px;
  color: #e9f4eb; background: #17241d; border: 1px solid #375540; border-radius: 6px;
  font: inherit; font-size: 12px;
}
.dashboard-filters select:disabled { opacity: .55; cursor: not-allowed; }
.dashboard-filters select:focus-visible, .city-picker select:focus-visible, .filter-reset:focus-visible { outline: 2px solid #83dba7; outline-offset: 2px; }
.filter-reset { min-height: 40px; padding: 0 12px; color: #c5e8d1; background: #1b3325; border: 1px solid #416950; border-radius: 6px; cursor: pointer; }
.filter-note { flex-basis: 100%; margin: 0; color: #94ad9a; font-size: 11px; line-height: 1.5; }
.filter-note span { display: block; color: #d3bc87; }
.city-picker { flex-direction: row; align-items: center; white-space: nowrap; }
.city-picker select { min-width: 88px; min-height: 32px; padding: 3px 7px; }
.dashboard-context { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
.context-item {
  display: inline-flex; align-items: center; gap: 7px;
  min-height: 32px; padding: 5px 11px; white-space: nowrap;
  color: #b7c8bf; font-size: 11px;
  background: #111b18; border: 1px solid #2b3d34; border-radius: 6px;
}
.context-item strong { font-size: 12px; color: #e4f2e9; }
.context-sample { color: #e7bc78; border-color: #655034; }
.context-user { color: #a5dec0; border-color: #345c47; }
.dashboard-section-label {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
  margin: 21px 0 10px; padding: 0 2px 8px;
  border-bottom: 1px solid #26372f;
}
.dashboard-section-label h3 { margin: 0; color: #e6f1ea; font-size: 14px; font-weight: 600; letter-spacing: -.01em; }
.dashboard-section-label span { color: #8fa99b; font-size: 11px; }
.chart-grid { min-width: 0; }
.chart-grid > * { min-width: 0; }
.chart-grid :deep(.c-card) {
  min-width: 0;
  background: linear-gradient(155deg, #121d19, #0e1714 72%);
  border-color: #2a3e33;
  box-shadow: inset 0 1px rgba(194, 236, 207, .035);
}
.chart-grid :deep(.c-card:hover) { transform: none; border-color: #3b5747; box-shadow: inset 0 1px rgba(194, 236, 207, .04); }
.chart-grid :deep(.c-card-title) { gap: 7px; min-width: 0; font-size: 13px; padding-top: 13px; }
.chart-grid :deep(.c-card-title > span:first-child) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chart-grid :deep(.sample-badge), .chart-grid :deep(.user-badge) { flex-shrink: 0; }
.dashboard-insights { margin-top: 18px; background: linear-gradient(155deg, #121d19, #0e1714); border-color: #2a3e33; }
.dashboard-insights:hover { transform: none; }

.dashboard-kpis { min-width: 0; margin-top: 12px; }
.kpi-card {
  position: relative; min-width: 0; min-height: 112px;
  padding: 16px 17px 14px;
  background: linear-gradient(155deg, #17231e, #101a16 76%);
  border-color: #304439;
  box-shadow: inset 0 1px rgba(217, 245, 225, .04);
}
.kpi-card::before { content: ''; position: absolute; inset: 15px auto 15px 0; width: 2px; border-radius: 2px; background: #527f61; }
.kpi-card:first-child::before { background: #6fc592; }
.kpi-card:hover { transform: none; border-color: #466551; }
.kpi-card .lbl { margin: 0; color: #a9c0b2; font-size: 11px; font-weight: 570; }
.kpi-measure { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; margin-top: 9px; }
.kpi-measure .num { font-size: clamp(21px, 2vw, 28px); line-height: 1.15; font-weight: 660; }
.kpi-unit { color: #94ae9e; font-size: 11px; white-space: nowrap; }
.kpi-meta { margin-top: 9px; color: #829c8c; font-size: 10px; }
.kpi-unavailable { color: #9ab1a2; }
.kpi-skeleton { width: 65%; height: 26px; margin-top: 12px; }

/* 行情跑马灯 */
.ticker-card {
  display: flex; align-items: center; gap: 10px;
  min-width: 0; padding: 9px 12px;
  background: #101b17; border-color: #2a3e33;
}
.ticker-card:hover { transform: none; }
.ticker-flow { flex: 1; min-width: 0; overflow: hidden; }
.ticker-track {
  display: flex; gap: 34px; width: max-content;
  animation: marquee linear infinite;
}
.ticker-track.paused { animation-play-state: paused; }
.ticker-item { display: flex; align-items: center; gap: 8px; font-size: 13px; white-space: nowrap; }
.q-name { color: var(--c-text-2); }
.q-price { color: var(--c-green); font-weight: 700; font-size: 16px; }
.q-unit { color: var(--c-text-3); font-size: 11px; }
.q-src { color: var(--c-text-3); font-size: 11px; }
.q-sep { color: var(--c-border-2); }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.ticker-meta {
  display: flex; flex-shrink: 0; align-items: center; gap: 7px;
  color: #9eb4a7; font-size: 11px;
}
.ticker-control {
  min-width: 44px; min-height: 32px; padding: 0 9px; border: 1px solid #3a5544;
  border-radius: var(--radius-sm); color: var(--c-text-2); background: var(--c-surface-2);
  font: inherit; cursor: pointer; transition: color var(--dur-micro) var(--ease-apple), border-color var(--dur-micro) var(--ease-apple), background-color var(--dur-micro) var(--ease-apple);
}
.ticker-control:hover:not(:disabled) { color: var(--c-text); border-color: var(--c-green); background: var(--c-green-soft); }
.ticker-control:disabled { cursor: default; opacity: .72; }
.kpi-card { animation: kpiEnter 420ms var(--ease-apple) both; animation-delay: calc(var(--kpi-index) * 45ms); }
@keyframes kpiEnter { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
@media (hover: hover) { .ticker-card:hover .ticker-track { animation-play-state: paused; } }
@media (prefers-reduced-motion: reduce) { .ticker-track { animation: none; transform: none; }.kpi-card { animation: none; } }

.hint-item {
  padding: 9px 12px; border-radius: 8px; font-size: 12.5px; line-height: 1.7; color: var(--c-text-2);
  background: #17241c; border-left: 2px solid #6cb98a;
}
.hint-item :deep(b) { color: var(--c-text); }

/* 3D 城市详情浮层：Apple 玻璃拟态 */
.city-popover {
  position: absolute; right: 12px; top: 8px; width: 236px; z-index: 10;
  background: rgba(13, 23, 20, 0.94);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 0.5px solid var(--c-border-2);
  border-radius: 14px; padding: 12px 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: popoverIn 0.3s var(--ease-spring) both;
}
@keyframes popoverIn { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: none; } }
.cp-close {
  width: 20px; height: 20px; line-height: 1; border-radius: 999px;
  border: 1px solid var(--c-border); background: transparent;
  color: var(--c-text-3); cursor: pointer; font-size: 14px;
  transition: color var(--dur-micro) var(--ease-apple), border-color var(--dur-micro) var(--ease-apple), background-color var(--dur-micro) var(--ease-apple);
}
.cp-close:hover { color: var(--c-green); border-color: var(--c-green); }
.cp-cell { padding: 6px 4px; border-radius: 8px; background: rgba(16, 29, 24, 0.5); }
.cp-cell .num { font-size: 15px; font-weight: 700; }
.cp-cell div:last-child { font-size: 10px; color: var(--c-text-3); margin-top: 2px; }
@media (max-width: 760px) {
  .dashboard-heading { align-items: flex-start; flex-direction: column; gap: 11px; }
  .dashboard-context { justify-content: flex-start; }
  .ticker-card { align-items: stretch; flex-direction: column; gap: 4px; }
  .ticker-flow { width: 100%; min-height: 24px; }
  .ticker-meta { justify-content: space-between; border-top: 1px solid #263a2f; padding-top: 6px; }
  .ticker-control { min-height: 40px; }
}
@media (max-width: 480px) {
  .dashboard { padding-top: 0; }
  .dashboard-filters label { flex: 1 1 calc(50% - 12px); }
  .dashboard-filters select { width: 100%; }
  .city-picker { font-size: 0; }
  .city-picker select { max-width: 104px; }
  .dashboard-description { max-width: 30ch; }
  .dashboard-kpis { gap: 8px; }
  .kpi-card { padding: 12px 11px; min-height: 107px; }
  .kpi-card::before { top: 12px; bottom: 12px; }
  .kpi-measure .num { font-size: clamp(18px, 5vw, 23px); }
  .kpi-unit { font-size: 10px; }
  .dashboard-section-label span { max-width: 48%; text-align: right; }
  .chart-grid :deep(.c-card-title) { font-size: 12px; }
  .city-popover { width: min(236px, calc(100% - 16px)); right: 8px; top: 8px; padding: 10px; }
}
@media (pointer: coarse) {
  .ticker-control, .cp-close { min-height: 44px; min-width: 44px; }
}
</style>
