<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <!-- 行情卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      <div v-for="q in quotes" :key="q.key" class="c-card p-3.5 asset-card">
        <div class="text-[12px] text-[var(--c-text-2)] font-medium">{{ q.name }}</div>
        <div class="num text-[22px] font-bold text-green mt-1">{{ q.price }}<span class="text-[11px] ml-1 font-normal text-[var(--c-text-3)]">{{ q.unit }}</span></div>
        <div class="text-[10.5px] text-[var(--c-text-3)] mt-1.5">{{ q.source }}</div>
        <div v-if="q.note" class="text-[10.5px] text-amber mt-0.5">{{ q.note }}</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <ChartCard title="碳资产组合结构" height="300" class="lg:col-span-5">
        <div ref="portfolioEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="CEA 碳价走势 & 复旦碳价指数预测" height="300" class="lg:col-span-7">
        <div ref="priceEl" class="w-full h-full" />
      </ChartCard>
    </div>

    <!-- 配额盈缺分析 -->
    <div class="c-card p-4">
      <div class="c-card-title mb-3">配额盈缺分析（2026年度）</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="stat-box"><div class="num text-blue">58,200</div><div class="lbl">配额持有 (tCO₂)</div></div>
        <div class="stat-box"><div class="num text-amber">{{ Math.round(dataStore.yearTotal).toLocaleString() }}</div><div class="lbl">预计排放 (tCO₂，取当前核算年度)</div></div>
        <div class="stat-box"><div class="num" :class="gap < 0 ? 'text-red' : 'text-green'">{{ gap.toLocaleString() }}</div><div class="lbl">{{ gap < 0 ? '配额缺口' : '配额盈余' }} (tCO₂)</div></div>
        <div class="stat-box"><div class="num text-red">{{ gapValue }}</div><div class="lbl">{{ gap < 0 ? '缺口市值' : '盈余市值' }}</div></div>
      </div>
    </div>

    <!-- 履约日历 -->
    <div class="c-card p-4">
      <div class="c-card-title mb-3">碳市场履约日历</div>
      <el-timeline>
        <el-timeline-item v-for="e in calendar" :key="e.date" :timestamp="e.date" :type="e.done ? 'success' : 'warning'" :hollow="!e.done">
          {{ e.text }}
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import ChartCard from '@/components/ChartCard.vue'
import { REALTIME_QUOTES, PRICE_SERIES } from '@/data/carbonMarket'
import { useDataStore } from '@/stores/data'
import { fmt } from '@/utils/format'

const dataStore = useDataStore()
const quotes = REALTIME_QUOTES
const portfolioEl = ref<HTMLElement | null>(null)
const priceEl = ref<HTMLElement | null>(null)
let c1: echarts.ECharts | null = null
let c2: echarts.ECharts | null = null

const gap = computed(() => Math.round(58200 - dataStore.yearTotal))
const gapValue = computed(() => {
  const v = Math.abs(gap.value) * 81.03
  return v >= 10000 ? `¥${fmt(v / 10000)}万` : `¥${fmt(v, 0)}`
})

const calendar = [
  { date: '2025.12.31', text: '第二履约周期配额清缴（已完成）', done: true },
  { date: '2026.03.31', text: '年度碳排放报告提交', done: false },
  { date: '2026.06.30', text: '第三方核查报告提交', done: false },
  { date: '2026.10.15', text: 'CBAM 首次报告提交截止', done: false },
  { date: '2026.12.31', text: '第三履约周期配额清缴', done: false },
]

onMounted(async () => {
  await dataStore.loadSampleData()
  const tt = { backgroundColor: 'rgba(13,23,20,0.94)', borderColor: '#24413a', textStyle: { color: '#e8f5ef', fontSize: 12 } }
  const axis = { axisLine: { lineStyle: { color: '#1e3329' } }, axisLabel: { color: '#9db8ae' }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } } }
  if (portfolioEl.value) {
    c1 = echarts.init(portfolioEl.value)
    c1.setOption({
      tooltip: { trigger: 'item', ...tt },
      series: [{
        type: 'pie', radius: ['46%', '70%'],
        itemStyle: { borderColor: '#0a120f', borderWidth: 2, borderRadius: 6 },
        label: { color: '#9db8ae' },
        data: [
          { name: 'CEA 配额', value: 58, itemStyle: { color: '#10b981' } },
          { name: 'CCER', value: 18, itemStyle: { color: '#0ea5e9' } },
          { name: '碳信用储备', value: 24, itemStyle: { color: '#fde68a' } },
        ],
        animationType: 'scale', animationEasing: 'elasticOut',
      }],
    })
  }
  if (priceEl.value) {
    c2 = echarts.init(priceEl.value)
    c2.setOption({
      tooltip: { trigger: 'axis', ...tt },
      legend: { data: ['CEA实际', '复旦碳价指数预测', 'CCER均价'], bottom: 0, textStyle: { color: '#9db8ae' } },
      grid: { left: '3%', right: '4%', bottom: '14%', top: '12%', containLabel: true },
      xAxis: { type: 'category', data: PRICE_SERIES.months, ...axis },
      yAxis: { type: 'value', name: '¥/t', nameTextStyle: { color: '#5f7a6f' }, ...axis },
      series: [
        { name: 'CEA实际', type: 'line', data: PRICE_SERIES.cea, color: '#10b981', smooth: true, symbolSize: 5, areaStyle: { color: 'rgba(16,185,129,0.12)' }, animationDuration: 1500 },
        { name: '复旦碳价指数预测', type: 'line', data: PRICE_SERIES.fudan, color: '#f59e0b', lineStyle: { type: 'dashed', width: 2 }, smooth: true, animationDuration: 1900 },
        { name: 'CCER均价', type: 'line', data: PRICE_SERIES.ccer, color: '#0ea5e9', smooth: true, animationDuration: 1700 },
      ],
    })
  }
  window.addEventListener('resize', resize)
})
function resize() { c1?.resize(); c2?.resize() }
onBeforeUnmount(() => { window.removeEventListener('resize', resize); c1?.dispose(); c2?.dispose() })
</script>

<style scoped>
.asset-card { transition: transform 0.25s, box-shadow 0.25s; }
.asset-card:hover { transform: translateY(-3px); box-shadow: 0 6px 28px rgba(16, 185, 129, 0.12); }
</style>
