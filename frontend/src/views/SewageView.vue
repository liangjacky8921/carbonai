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
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import ChartCard from '@/components/ChartCard.vue'
import { fmt } from '@/utils/format'

const waterEl = ref<HTMLElement | null>(null)
const removalEl = ref<HTMLElement | null>(null)
const codEl = ref<HTMLElement | null>(null)
const sludgeEl = ref<HTMLElement | null>(null)

let data: any = null
let c1: echarts.ECharts | null = null
let c2: echarts.ECharts | null = null
let c3: echarts.ECharts | null = null
let c4: echarts.ECharts | null = null

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
