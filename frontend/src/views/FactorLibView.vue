<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <!-- 统计与筛选 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="stat-box"><div class="num text-green">{{ filtered.length }}</div><div class="lbl">收录因子总数（当前筛选）</div></div>
      <div class="stat-box"><div class="num text-blue">{{ sources.size }}</div><div class="lbl">来源数据库</div></div>
      <div class="stat-box"><div class="num text-amber">{{ highDqr }}</div><div class="lbl">高 DQR 因子 (≥4★)</div></div>
      <div class="stat-box"><div class="num">{{ regions.size }}</div><div class="lbl">覆盖区域</div></div>
    </div>

    <div class="c-card p-4 flex flex-wrap gap-3 items-center">
      <el-select v-model="sourceFilter" placeholder="全部来源" clearable size="small" style="width: 180px">
        <el-option v-for="s in sources" :key="s" :label="s" :value="s" />
      </el-select>
      <el-select v-model="regionFilter" placeholder="全部地区" clearable size="small" style="width: 200px">
        <el-option v-for="r in regionOptions" :key="r" :label="r" :value="r" />
      </el-select>
      <el-input v-model="keyword" placeholder="搜索因子名称…" clearable size="small" style="width: 200px" :prefix-icon="Search" />
      <el-button size="small" type="primary" plain @click="exportCsv">导出因子表(含溯源)</el-button>
    </div>

    <!-- 因子库表格 -->
    <div class="c-card">
      <div class="c-card-title">排放因子数据库（可溯源 · 满足核查机构 DQR 要求）</div>
      <div class="p-4 max-h-[460px] overflow-auto">
        <table class="dark-table">
          <thead>
            <tr>
              <th>排放因子名称</th><th class="text-right">数值</th><th>单位</th><th>来源</th>
              <th>年份</th><th>适用地区</th><th>DQR</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in filtered" :key="f.name">
              <td class="text-[var(--c-text)] font-medium">{{ f.name }}</td>
              <td class="num text-right text-[var(--c-green)] font-semibold">{{ f.value }}</td>
              <td>{{ f.unit }}</td>
              <td><el-tag size="small" effect="plain" type="success">{{ f.source }}</el-tag></td>
              <td>{{ f.year }}</td>
              <td class="text-[11px]">{{ f.region }}</td>
              <td>
                <span class="text-amber" :title="`DQR 数据质量评级 ${f.dqr}/5`">{{ '★'.repeat(f.dqr) }}{{ '☆'.repeat(5 - f.dqr) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 图表 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="各电网排放因子对比" height="300">
        <div ref="gridEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="因子来源分布" height="300">
        <div ref="srcEl" class="w-full h-full" />
      </ChartCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import ChartCard from '@/components/ChartCard.vue'
import { FACTOR_LIB } from '@/data/carbonMarket'
import { useToast } from '@/composables/useToast'
import { Search } from '@element-plus/icons-vue'

const toast = useToast()
const sourceFilter = ref('')
const regionFilter = ref('')
const keyword = ref('')

const sources = computed(() => new Set(FACTOR_LIB.map((f) => f.source)))
const regions = computed(() => new Set(FACTOR_LIB.map((f) => f.region)))
const regionOptions = ['全国通用', '全球', '南方电网', '华东电网', '华北电网', '华中电网', '西北电网', '东北电网']
const highDqr = computed(() => FACTOR_LIB.filter((f) => f.dqr >= 4).length)

const filtered = computed(() =>
  FACTOR_LIB.filter((f) =>
    (!sourceFilter.value || f.source === sourceFilter.value) &&
    (!regionFilter.value || f.region.includes(regionFilter.value)) &&
    (!keyword.value || f.name.includes(keyword.value)),
  ),
)

function exportCsv() {
  const header = '排放因子名称,数值,单位,来源,年份,适用地区,DQR\n'
  const body = filtered.value.map((f) => [f.name, f.value, f.unit, f.source, f.year, f.region, f.dqr].join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'CarbonAI排放因子表_含溯源.csv'
  a.click()
  toast.success('因子表已导出（含溯源信息）')
}

const gridEl = ref<HTMLElement | null>(null)
const srcEl = ref<HTMLElement | null>(null)
let c1: echarts.ECharts | null = null
let c2: echarts.ECharts | null = null
const tt = { backgroundColor: 'rgba(13,23,20,0.94)', borderColor: '#24413a', textStyle: { color: '#e8f5ef', fontSize: 12 } }
const axis = { axisLine: { lineStyle: { color: '#1e3329' } }, axisLabel: { color: '#9db8ae', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } } }

onMounted(() => {
  if (gridEl.value) {
    c1 = echarts.init(gridEl.value)
    const gridFactors = FACTOR_LIB.filter((f) => f.name.startsWith('电网排放因子'))
    c1.setOption({
      tooltip: { trigger: 'axis', ...tt },
      grid: { left: '3%', right: '5%', bottom: '14%', top: '12%', containLabel: true },
      xAxis: { type: 'category', data: gridFactors.map((f) => f.name.replace('电网排放因子-', '')), ...axis },
      yAxis: { type: 'value', name: 'kgCO₂/kWh', nameTextStyle: { color: '#5f7a6f' }, ...axis },
      series: [{
        type: 'bar', barWidth: '50%',
        data: gridFactors.map((f) => f.value),
        itemStyle: { borderRadius: [6, 6, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#0ea5e9' }, { offset: 1, color: 'rgba(14,165,233,0.12)' }]) },
        animationDelay: (i: number) => i * 90,
        label: { show: true, position: 'top', color: '#9db8ae', fontSize: 10 },
      }],
    })
  }
  if (srcEl.value) {
    c2 = echarts.init(srcEl.value)
    const bySrc: Record<string, number> = {}
    FACTOR_LIB.forEach((f) => { bySrc[f.source] = (bySrc[f.source] || 0) + 1 })
    const colors = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#14b8a6', '#ef4444']
    c2.setOption({
      tooltip: { trigger: 'item', ...tt },
      legend: { bottom: 0, textStyle: { color: '#9db8ae', fontSize: 10 } },
      series: [{
        type: 'pie', radius: ['38%', '64%'],
        itemStyle: { borderColor: '#0a120f', borderWidth: 2, borderRadius: 6 },
        label: { color: '#9db8ae' },
        data: Object.entries(bySrc).map(([n, v], i) => ({ name: n, value: v, itemStyle: { color: colors[i % colors.length] } })),
        animationType: 'scale', animationEasing: 'elasticOut',
      }],
    })
  }
  window.addEventListener('resize', resize)
})
function resize() { c1?.resize(); c2?.resize() }
onBeforeUnmount(() => { window.removeEventListener('resize', resize); c1?.dispose(); c2?.dispose() })
</script>
