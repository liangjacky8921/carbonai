<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <div class="c-card p-4 text-xs text-[var(--c-text-2)] leading-6">
      数据源：博罗县麻陂镇坤元污水处理有限公司 运行月报表 (2022–2026) · <span class="sample-badge">真实运行数据（平台内置）</span>
      处理水量 / COD / 氨氮 / 总磷 / 污泥 / 用电 · {{ months.length }} 个监测月
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="stat-box"><div class="num text-blue">{{ fmt(totalWater, 0) }}</div><div class="lbl">累计处理水量 (吨)</div></div>
      <div class="stat-box"><div class="num text-green">{{ avgRemoval.cod }}%</div><div class="lbl">COD 平均去除率</div></div>
      <div class="stat-box"><div class="num text-amber">{{ avgRemoval.nh }}%</div><div class="lbl">氨氮平均去除率</div></div>
      <div class="stat-box"><div class="num text-purple">{{ fmt(totalSludge, 0) }}</div><div class="lbl">累计污泥产生 (吨)</div></div>
    </div>

    <ChartCard title="月处理水量趋势" height="300">
      <div ref="waterEl" class="w-full h-full" />
    </ChartCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="污染物去除率 (COD / 氨氮 / 总磷)" height="300">
        <div ref="removalEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="COD 进/出水浓度对比" height="300">
        <div ref="codEl" class="w-full h-full" />
      </ChartCard>
    </div>

    <ChartCard title="污泥产生量与用电量" height="280">
      <div ref="sludgeEl" class="w-full h-full" />
    </ChartCard>

    <!-- 温室气体核算与水质合规核验 -->
    <div class="c-card" v-if="kpi">
      <div class="c-card-title">温室气体核算与水质合规核验（GB 18918-2002 一级A · IPCC 2019R）</div>
      <div class="p-4 space-y-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="stat-box"><div class="num text-green">{{ fmt(kpi.total_co2e_t, 1) }}</div><div class="lbl">全期总排放 (tCO₂e)</div></div>
          <div class="stat-box"><div class="num text-blue">{{ fmt(kpi.total_flow_m3, 0) }}</div><div class="lbl">累计处理水量 (m³)</div></div>
          <div class="stat-box"><div class="num text-amber">{{ compliance.overall_rate_pct }}%</div><div class="lbl">水质一级A达标率</div></div>
          <div class="stat-box"><div class="num">{{ kpi.period.n_months }}</div><div class="lbl">连续监测月</div></div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div class="text-xs text-[var(--c-text-3)] mb-2">排放结构（IPCC 2019R + AR6）</div>
            <div class="space-y-1.5">
              <div v-for="s in shareItems" :key="s.label" class="flex items-center gap-2 text-xs">
                <span class="w-8 text-[var(--c-text-2)]">{{ s.label }}</span>
                <div class="flex-1 h-2 rounded-full bg-[var(--c-surface-2)] overflow-hidden">
                  <div class="h-full rounded-full" :style="{ width: s.pct + '%', background: s.color }" />
                </div>
                <span class="num w-12 text-right text-[var(--c-text-2)]">{{ s.pct }}%</span>
              </div>
            </div>
          </div>
          <div>
            <div class="text-xs text-[var(--c-text-3)] mb-2">出水水质合规（1673 天逐日核验）</div>
            <table class="dark-table">
              <thead><tr><th>指标</th><th class="text-right">超标天数</th><th class="text-right">出水P95</th><th class="text-right">一级A限值</th></tr></thead>
              <tbody>
                <tr><td>COD</td><td class="num text-right">{{ compliance.exc_cod_days }}</td><td class="num text-right">{{ compliance.cod_out_p95 }}</td><td class="text-right">≤50</td></tr>
                <tr><td>氨氮</td><td class="num text-right">{{ compliance.exc_nh3n_days }}</td><td class="num text-right">{{ compliance.nh3n_out_p95 }}</td><td class="text-right">≤5</td></tr>
                <tr><td>总磷</td><td class="num text-right text-amber">{{ compliance.exc_tp_days }}</td><td class="num text-right">{{ compliance.tp_out_p95 }}</td><td class="text-right">≤0.5</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div class="text-xs text-[var(--c-text-3)] mb-2">年度核算（运行口径，Scope 2 = 0.5366）</div>
          <div class="max-h-[220px] overflow-auto">
            <table class="dark-table">
              <thead><tr><th>年份</th><th class="text-right">水量(m³)</th><th class="text-right">电耗(kWh)</th><th class="text-right">电力 tCO₂e</th><th class="text-right">CH₄ tCO₂e</th><th class="text-right">N₂O tCO₂e</th><th class="text-right">污泥 tCO₂e</th><th class="text-right">合计 tCO₂e</th></tr></thead>
              <tbody>
                <tr v-for="r in kpi.annual_records" :key="r.year">
                  <td>{{ r.year }}</td>
                  <td class="num text-right">{{ fmt(r.flow_m3, 0) }}</td>
                  <td class="num text-right">{{ fmt(r.kwh, 0) }}</td>
                  <td class="num text-right">{{ fmt(r.co2e_elec_t, 1) }}</td>
                  <td class="num text-right">{{ fmt(r.co2e_ch4_t, 1) }}</td>
                  <td class="num text-right">{{ fmt(r.co2e_n2o_t, 1) }}</td>
                  <td class="num text-right">{{ fmt(r.co2e_sludge_t, 1) }}</td>
                  <td class="num text-right text-[var(--c-green)] font-semibold">{{ fmt(r.co2e_total_t, 1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="text-xs text-[var(--c-text-3)] leading-6" v-if="assumptions">
          关键因子假设：电网 {{ assumptions.grid_ef_kgco2_per_kwh }} kgCO₂/kWh（2022 全国平均，运行口径）· 污泥 {{ assumptions.sludge_ef_tco2e_per_t }} tCO₂e/t · CH₄ 处理 {{ assumptions.ch4_ef_treatment }} / 出水 {{ assumptions.ch4_ef_effluent }} kgCH₄/kgBOD · N₂O {{ assumptions.n2o_ef }} kgN₂O-N/kgN · GWP CH₄={{ assumptions.gwp_ch4 }} / N₂O={{ assumptions.gwp_n2o }}（AR6）
        </div>

        <div class="flex gap-2">
          <el-button type="primary" round @click="downloadReport">生成 PDF 合规报告</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import ChartCard from '@/components/ChartCard.vue'
import { fmt } from '@/utils/format'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const waterEl = ref<HTMLElement | null>(null)
const removalEl = ref<HTMLElement | null>(null)
const codEl = ref<HTMLElement | null>(null)
const sludgeEl = ref<HTMLElement | null>(null)

let data: any = null
const kpi = ref<any>(null)
const assumptions = ref<any>(null)
let c1: echarts.ECharts | null = null
let c2: echarts.ECharts | null = null
let c3: echarts.ECharts | null = null
let c4: echarts.ECharts | null = null

const compliance = computed(() => kpi.value?.water_compliance_1A || null)
const shareItems = computed(() => kpi.value ? [
  { label: '电力', pct: kpi.value.shares.elec_pct, color: '#0ea5e9' },
  { label: 'N₂O', pct: kpi.value.shares.n2o_pct, color: '#8b5cf6' },
  { label: 'CH₄', pct: kpi.value.shares.ch4_pct, color: '#f59e0b' },
  { label: '污泥', pct: kpi.value.shares.sludge_pct, color: '#14b8a6' },
] : [])

async function downloadReport() {
  const yearly = (kpi.value?.annual_records || []).map((r: any) => ({
    source: `${r.year} 年度综合排放`,
    activity: Math.round(r.flow_m3),
    factor: +(r.co2e_total_t / r.flow_m3).toFixed(6),
    scope: 'Scope 1',
    emission: +r.co2e_total_t.toFixed(2),
  }))
  try {
    const body = JSON.stringify({
      standard: 'GB 18918-2002 · IPCC 2019R',
      year: 2026,
      format: 'pdf',
      records: yearly,
    })
    const resp = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (!resp.ok) throw new Error('报告生成失败')
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '麻陂污水厂碳核算与合规报告.pdf'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('合规报告已下载')
  } catch (e: any) {
    toast.error(e.message || '报告生成失败')
  }
}

const months = computed<any[]>(() => data?.months || [])
const totalWater = computed(() => months.value.reduce((a, m) => a + (m.water || 0), 0))
const totalSludge = computed(() => months.value.reduce((a, m) => a + (m.sludge || 0), 0))
const avgRemoval = computed(() => {
  const ms = months.value.filter((m) => m.cod_removal)
  return {
    cod: (ms.reduce((a, m) => a + m.cod_removal, 0) / (ms.length || 1)).toFixed(1),
    nh: (ms.reduce((a, m) => a + m.nh_removal, 0) / (ms.length || 1)).toFixed(1),
  }
})

onMounted(async () => {
  try {
    data = await fetch('/sample-data/sewage.json').then((r) => r.json())
  } catch { /* ignore */ }
  try {
    const [k, a] = await Promise.all([
      fetch('/sample-data/sewage-kpi-summary.json').then((r) => r.json()),
      fetch('/sample-data/sewage-assumptions.json').then((r) => r.json()),
    ])
    kpi.value = k
    assumptions.value = a
  } catch { /* 真实核算/因子数据缺失时仅保留运行看板 */ }
  const tt = { backgroundColor: 'rgba(13,23,20,0.94)', borderColor: '#24413a', textStyle: { color: '#e8f5ef', fontSize: 12 } }
  const axis = { axisLine: { lineStyle: { color: '#1e3329' } }, axisLabel: { color: '#9db8ae', fontSize: 9.5 }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } } }
  const ms = months.value
  const labels = ms.map((m) => m.ym)

  if (waterEl.value) {
    c1 = echarts.init(waterEl.value)
    c1.setOption({
      tooltip: { trigger: 'axis', ...tt },
      grid: { left: '3%', right: '4%', bottom: '12%', top: '12%', containLabel: true },
      xAxis: { type: 'category', data: labels, ...axis },
      yAxis: { type: 'value', name: '吨/月', nameTextStyle: { color: '#5f7a6f' }, ...axis },
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 14, bottom: 2, borderColor: '#1e3329', backgroundColor: '#0d1714', fillerColor: 'rgba(14,165,233,0.15)', textStyle: { color: '#5f7a6f' } }],
      series: [{
        type: 'bar', data: ms.map((m) => m.water), itemStyle: { borderRadius: [3, 3, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#0ea5e9' }, { offset: 1, color: 'rgba(14,165,233,0.1)' }]) },
        animationDelay: (i: number) => i * 20,
      }],
    })
  }
  if (removalEl.value) {
    c2 = echarts.init(removalEl.value)
    c2.setOption({
      tooltip: { trigger: 'axis', ...tt },
      legend: { bottom: 0, textStyle: { color: '#9db8ae' } },
      grid: { left: '3%', right: '4%', bottom: '14%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: labels, ...axis },
      yAxis: { type: 'value', name: '%', nameTextStyle: { color: '#5f7a6f' }, min: 80, max: 100, ...axis },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: 'COD去除率', type: 'line', data: ms.map((m) => m.cod_removal), color: '#10b981', smooth: true, showSymbol: false },
        { name: '氨氮去除率', type: 'line', data: ms.map((m) => m.nh_removal), color: '#f59e0b', smooth: true, showSymbol: false },
        { name: '总磷去除率', type: 'line', data: ms.map((m) => m.tp_removal), color: '#8b5cf6', smooth: true, showSymbol: false },
      ],
    })
  }
  if (codEl.value) {
    c3 = echarts.init(codEl.value)
    c3.setOption({
      tooltip: { trigger: 'axis', ...tt },
      legend: { bottom: 0, textStyle: { color: '#9db8ae' } },
      grid: { left: '3%', right: '4%', bottom: '14%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: labels, ...axis },
      yAxis: { type: 'value', name: 'mg/L', nameTextStyle: { color: '#5f7a6f' }, ...axis },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: '进水COD', type: 'line', data: ms.map((m) => m.cod_in), color: '#ef4444', smooth: true, showSymbol: false, areaStyle: { opacity: 0.12 } },
        { name: '出水COD', type: 'line', data: ms.map((m) => m.cod_out), color: '#10b981', smooth: true, showSymbol: false },
      ],
    })
  }
  if (sludgeEl.value) {
    c4 = echarts.init(sludgeEl.value)
    c4.setOption({
      tooltip: { trigger: 'axis', ...tt },
      legend: { bottom: 0, textStyle: { color: '#9db8ae' } },
      grid: { left: '3%', right: '4%', bottom: '14%', top: '12%', containLabel: true },
      xAxis: { type: 'category', data: labels, ...axis },
      yAxis: [ { type: 'value', name: '污泥(吨)', nameTextStyle: { color: '#5f7a6f' }, ...axis }, { type: 'value', name: '用电(kWh)', nameTextStyle: { color: '#5f7a6f' }, ...axis } ],
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: '污泥产生量', type: 'bar', data: ms.map((m) => m.sludge), itemStyle: { color: '#14b8a6', borderRadius: [3, 3, 0, 0] } },
        { name: '用电量', type: 'line', yAxisIndex: 1, data: ms.map((m) => m.elec), color: '#f59e0b', smooth: true, showSymbol: false },
      ],
    })
  }
  window.addEventListener('resize', resize)
})
function resize() { c1?.resize(); c2?.resize(); c3?.resize(); c4?.resize() }
onBeforeUnmount(() => { window.removeEventListener('resize', resize); c1?.dispose(); c2?.dispose(); c3?.dispose(); c4?.dispose() })
</script>
