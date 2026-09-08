<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <!-- 上传区 -->
    <div class="c-card p-4">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[280px]">
          <DataUpload title="点击或拖拽上传碳排放数据 (Excel .xlsx/.xls/.csv)"
            hint="表头：排放源 | 活动数据 | 单位 | Scope | 年份（可选：月份、部门）— 上传后自动匹配因子核算"
            @pick="fileInput?.click()" @file="onFile" />
          <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onInputChange" />
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <el-button size="small" @click="loadSample">加载示例数据</el-button>
            <el-button size="small" type="warning" plain v-if="dataStore.source.emissions === 'user'" @click="resetUser">
              切回示例数据
            </el-button>
          </div>
          <span :class="dataStore.source.emissions === 'user' ? 'user-badge' : 'sample-badge'">
            {{ dataStore.source.emissions === 'user' ? '当前：用户上传数据' : '当前：示例数据（虚拟企业）' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 年份切换 -->
    <div class="flex flex-wrap items-center gap-3" v-if="dataStore.emissionYears.length">
      <span class="text-xs text-[var(--c-text-3)]">数据年份：</span>
      <el-radio-group v-model="dataStore.currentYear" size="small">
        <el-radio-button v-for="y in dataStore.emissionYears" :key="y" :value="y">{{ y }}</el-radio-button>
      </el-radio-group>
      <span class="sample-badge" v-if="dataStore.source.emissions === 'sample'">示例数据</span>
      <span class="user-badge" v-else>用户数据</span>
    </div>

    <!-- 统计 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="stat-box"><div class="num text-green">{{ fmt(dataStore.yearTotal) }}</div><div class="lbl">总排放 (tCO₂e)</div></div>
      <div class="stat-box"><div class="num text-red">{{ fmt(s1 ) }}</div><div class="lbl">Scope 1 直接排放</div></div>
      <div class="stat-box"><div class="num text-amber">{{ fmt(s2) }}</div><div class="lbl">Scope 2 间接排放</div></div>
      <div class="stat-box"><div class="num text-blue">{{ fmt(s3) }}</div><div class="lbl">Scope 3 价值链排放</div></div>
    </div>

    <!-- 图表 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="排放结构 (Scope 1-3)" height="280">
        <div ref="scopeEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="部门排放对比" height="280">
        <div ref="deptEl" class="w-full h-full" />
      </ChartCard>
    </div>

    <!-- 明细表 -->
    <div class="c-card">
      <div class="c-card-title">核算结果明细（{{ dataStore.yearRecords.length }} 条）</div>
      <div class="p-4 max-h-[420px] overflow-auto">
        <EmptyState v-if="!dataStore.yearRecords.length" icon="DataAnalysis"
          title="暂无核算数据" description="上传 Excel/CSV 碳排放数据，或点击「加载示例数据」体验完整核算流程" />
        <table v-else class="dark-table">
          <thead>
            <tr>
              <th>排放源</th><th>部门</th><th>Scope</th>
              <th class="text-right">活动数据</th><th>单位</th><th class="text-right">因子</th>
              <th class="text-right">tCO₂e</th><th class="text-right">占比</th><th>因子来源</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in sortedRecords" :key="i">
              <td class="text-[var(--c-text)] font-medium">{{ r.source }}</td>
              <td>{{ r.department || '—' }}</td>
              <td><el-tag size="small" effect="plain" :type="r.scope === 'Scope 1' ? 'danger' : r.scope === 'Scope 2' ? 'warning' : 'info'">{{ r.scope }}</el-tag></td>
              <td class="num text-right">{{ fmt(r.activity) }}</td>
              <td>{{ r.unit }}</td>
              <td class="num text-right">{{ r.factor }}</td>
              <td class="num text-right font-semibold text-[var(--c-green)]">{{ fmt(r.emission) }}</td>
              <td class="num text-right">{{ pct(r.emission) }}%</td>
              <td class="text-[11px]">{{ r.factorSource }} <span v-if="r.confidence === 'low'" class="text-amber">⚠️低置信</span></td>
            </tr>
            <tr class="total-row">
              <td colspan="6">合计</td>
              <td class="num text-right">{{ fmt(dataStore.yearTotal) }}</td>
              <td class="num text-right">100%</td><td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import ChartCard from '@/components/ChartCard.vue'
import DataUpload from '@/components/DataUpload.vue'
import EmptyState from '@/components/EmptyState.vue'
import { DataAnalysis } from '@element-plus/icons-vue'
import { useDataStore, parseEmissionFile } from '@/stores/data'
import { useToast } from '@/composables/useToast'
import { fmt } from '@/utils/format'

const dataStore = useDataStore()
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)

const s1 = computed(() => dataStore.scopeSummary['Scope 1'] || 0)
const s2 = computed(() => dataStore.scopeSummary['Scope 2'] || 0)
const s3 = computed(() => dataStore.scopeSummary['Scope 3'] || 0)
const sortedRecords = computed(() => [...dataStore.yearRecords].sort((a, b) => b.emission - a.emission))
const pct = (v: number) => dataStore.yearTotal ? ((v / dataStore.yearTotal) * 100).toFixed(1) : '0'

async function onFile(file: File) {
  try {
    toast.info('正在解析文件…')
    const records = await parseEmissionFile(file)
    dataStore.setUserEmissions(records)
    toast.success(`✅ 解析成功：${records.length} 条记录已核算（用户数据优先展示）`)
  } catch (e: any) {
    toast.error(e.message || '解析失败')
  }
}
function onInputChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) onFile(f)
  ;(e.target as HTMLInputElement).value = ''
}
async function loadSample() {
  await dataStore.loadSampleData()
  toast.success('已加载示例数据（虚拟企业 2022-2026）')
}
function resetUser() {
  dataStore.resetEmissions()
  toast.info('已切回示例数据')
}

// ===== 图表 =====
const scopeEl = ref<HTMLElement | null>(null)
const deptEl = ref<HTMLElement | null>(null)
let scopeChart: echarts.ECharts | null = null
let deptChart: echarts.ECharts | null = null
const tt = { backgroundColor: 'rgba(13,23,20,0.94)', borderColor: '#24413a', textStyle: { color: '#e8f5ef', fontSize: 12 } }

function renderCharts() {
  if (scopeEl.value && !scopeChart) scopeChart = echarts.init(scopeEl.value)
  if (deptEl.value && !deptChart) deptChart = echarts.init(deptEl.value)
  scopeChart?.setOption({
    tooltip: { trigger: 'item', ...tt },
    series: [{
      type: 'pie', radius: ['46%', '72%'],
      itemStyle: { borderColor: '#0a120f', borderWidth: 2, borderRadius: 6 },
      label: { color: '#9db8ae' },
      data: [
        { name: 'Scope 1', value: +s1.value.toFixed(1), itemStyle: { color: '#ef4444' } },
        { name: 'Scope 2', value: +s2.value.toFixed(1), itemStyle: { color: '#f59e0b' } },
        { name: 'Scope 3', value: +s3.value.toFixed(1), itemStyle: { color: '#0ea5e9' } },
      ], animationType: 'scale', animationEasing: 'elasticOut',
    }],
  }, true)
  const byDept: Record<string, number> = {}
  dataStore.yearRecords.forEach((r) => {
    const d = r.department || '未分组'
    byDept[d] = (byDept[d] || 0) + r.emission
  })
  const entries = Object.entries(byDept).sort((a, b) => b[1] - a[1])
  deptChart?.setOption({
    tooltip: { trigger: 'axis', ...tt },
    grid: { left: '3%', right: '5%', bottom: '10%', top: '12%', containLabel: true },
    xAxis: { type: 'category', data: entries.map((e) => e[0]), axisLabel: { color: '#9db8ae' }, axisLine: { lineStyle: { color: '#1e3329' } } },
    yAxis: { type: 'value', axisLabel: { color: '#9db8ae' }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } } },
    series: [{
      type: 'bar', data: entries.map((e) => +e[1].toFixed(1)), barWidth: '45%',
      itemStyle: { borderRadius: [6, 6, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#10b981' }, { offset: 1, color: 'rgba(16,185,129,0.15)' }]) },
      animationDelay: (i: number) => i * 100,
    }],
  }, true)
}

function resize() { scopeChart?.resize(); deptChart?.resize() }

onMounted(async () => {
  await dataStore.loadSampleData()
  renderCharts()
  window.addEventListener('resize', resize)
})
watch(() => [dataStore.currentYear, dataStore.source.emissions, dataStore.yearRecords.length], renderCharts)
onBeforeUnmount(() => { window.removeEventListener('resize', resize); scopeChart?.dispose(); deptChart?.dispose() })
</script>
