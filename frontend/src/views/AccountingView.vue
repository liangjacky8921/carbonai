<template>
  <div class="max-w-[1600px] mx-auto space-y-4 accounting-page">
    <div class="c-card p-4 accounting-context">
      <div><strong>碳排放核算</strong><p>边界：当前年份的上传记录或虚拟企业示例；按现有 Scope 1–3 分类汇总。结果单位：tCO₂e。</p></div>
      <div class="accounting-meta"><span>统计年份：{{ dataStore.currentYear || '未选择' }}</span><span>计算路径：{{ calculationPath }}</span><span>因子版本：未单独提供；逐条来源见明细</span></div>
    </div>
    <!-- 上传区 -->
    <div class="c-card p-4">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[280px]">
          <DataUpload title="点击或拖拽上传碳排放数据 (Excel .xlsx/.xls/.csv)"
            hint="表头：排放源 | 活动数据 | 单位 | Scope | 年份（可选：月份、部门）。本地回退会按排放源匹配因子，请核对逐条结果。"
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
      <p class="accounting-caveat">当前解析器在本地回退时按排放源名称匹配因子；未匹配项可能使用默认因子并标为低置信。上传文件的 Scope 列和年份请与结果明细逐项核对。</p>
      <p v-if="uploadError" class="accounting-error" role="alert">{{ uploadError }}</p>
      <p v-if="lowConfidenceCount" class="accounting-error" role="status">{{ lowConfidenceCount }} 条记录的因子匹配为低置信，请核对活动数据、因子及来源。</p>
    </div>

    <!-- 年份切换 -->
    <div class="flex flex-wrap items-center gap-3" v-if="dataStore.emissionYears.length">
      <span class="text-xs text-[var(--c-text-3)]">数据年份：</span>
      <el-radio-group v-model="dataStore.currentYear" size="small" aria-label="数据年份">
        <el-radio-button v-for="y in dataStore.emissionYears" :key="y" :value="y">{{ y }}</el-radio-button>
      </el-radio-group>
      <span class="sample-badge" v-if="dataStore.source.emissions === 'sample'">示例数据</span>
      <span class="user-badge" v-else>用户数据</span>
    </div>

    <!-- 统计 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="stat-box"><div class="num text-green">{{ hasRecords ? fmt(dataStore.yearTotal) : '—' }}</div><div class="lbl">总排放 (tCO₂e)</div></div>
      <div class="stat-box"><div class="num text-red">{{ hasRecords ? fmt(s1) : '—' }}</div><div class="lbl">Scope 1 直接排放 (tCO₂e)</div></div>
      <div class="stat-box"><div class="num text-amber">{{ hasRecords ? fmt(s2) : '—' }}</div><div class="lbl">Scope 2 间接排放 (tCO₂e)</div></div>
      <div class="stat-box"><div class="num text-blue">{{ hasRecords ? fmt(s3) : '—' }}</div><div class="lbl">Scope 3 价值链排放 (tCO₂e)</div></div>
    </div>

    <!-- 图表 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="排放结构 (Scope 1–3)" height="280" :empty="!hasRecords" :sample="dataStore.source.emissions === 'sample'" :user-tag="dataStore.source.emissions === 'user'" source-note="当前年份核算记录；逐条因子来源见明细">
        <div ref="scopeEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="部门排放对比 · tCO₂e" height="280" :empty="!hasRecords" :sample="dataStore.source.emissions === 'sample'" :user-tag="dataStore.source.emissions === 'user'" source-note="当前年份核算记录">
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
              <td class="text-[11px]">{{ r.factorSource || '未提供' }} <span v-if="r.confidence === 'low'" class="text-amber">低置信</span></td>
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
import { computed, nextTick, onMounted, ref, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import { CHART_TOOLTIP } from '@/utils/chartTheme'
import { useElementResize } from '@/composables/useElementResize'
import ChartCard from '@/components/ChartCard.vue'
import DataUpload from '@/components/DataUpload.vue'
import EmptyState from '@/components/EmptyState.vue'
import { DataAnalysis } from '@element-plus/icons-vue'
import { useDataStore, parseEmissionFile } from '@/stores/data'
import { useToast } from '@/composables/useToast'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { fmt } from '@/utils/format'
import { bizApi, backendOnline } from '@/api/client'

const dataStore = useDataStore()
const toast = useToast()
const { confirmAction } = useConfirmAction()
const fileInput = ref<HTMLInputElement | null>(null)
const uploadError = ref('')
const calculationPath = ref('未执行核算')
const hasRecords = computed(() => dataStore.yearRecords.length > 0)
const lowConfidenceCount = computed(() => dataStore.yearRecords.filter((record) => record.confidence === 'low').length)

const s1 = computed(() => dataStore.scopeSummary['Scope 1'] || 0)
const s2 = computed(() => dataStore.scopeSummary['Scope 2'] || 0)
const s3 = computed(() => dataStore.scopeSummary['Scope 3'] || 0)
const sortedRecords = computed(() => [...dataStore.yearRecords].sort((a, b) => b.emission - a.emission))
const pct = (v: number) => dataStore.yearTotal ? ((v / dataStore.yearTotal) * 100).toFixed(1) : '0'

async function onFile(file: File) {
  uploadError.value = ''
  if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size === 0) {
    uploadError.value = '请选择非空的 .xlsx、.xls 或 .csv 文件。'
    return
  }
  toast.info('正在解析文件…')
  try {
    const records = await uploadAndAccount(file)
    if (!records.length) throw new Error('文件中没有可核算的有效记录，请检查表头和活动数据。')
    dataStore.setUserEmissions(records)
    toast.success(`核算完成：${records.length} 条记录`)
  } catch (e: any) {
    uploadError.value = e.message || '解析失败'
    toast.error(uploadError.value)
  }
}

/** 优先调用后端核算，后端不可用或失败时回退本地解析 */
async function uploadAndAccount(file: File) {
  if (backendOnline.value) {
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await bizApi.uploadEmissions(fd)
      if (res.code === 200 && Array.isArray(res.data)) { calculationPath.value = '现有后端接口'; return res.data }
    } catch {
      // 后端异常，回退本地
    }
  }
  const records = await parseEmissionFile(file)
  calculationPath.value = '浏览器本地回退解析'
  return records
}
function onInputChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) onFile(f)
  ;(e.target as HTMLInputElement).value = ''
}
async function loadSample() {
  await dataStore.loadSampleData()
  calculationPath.value = '内置示例数据'
  toast.success('已加载示例数据（虚拟企业 2022-2026）')
}
async function resetUser() {
  const confirmed = await confirmAction('这会删除当前浏览器中保存的排放核算数据，且无法撤销。', '切回示例排放数据？', '删除并切换')
  if (!confirmed) return
  dataStore.resetEmissions()
  calculationPath.value = '内置示例数据'
  toast.info('已切回示例数据')
}

// ===== 图表 =====
const scopeEl = ref<HTMLElement | null>(null)
const deptEl = ref<HTMLElement | null>(null)
let scopeChart: echarts.ECharts | null = null
let deptChart: echarts.ECharts | null = null
const tt = CHART_TOOLTIP

function renderCharts() {
  if (!hasRecords.value) {
    scopeChart?.dispose(); deptChart?.dispose()
    scopeChart = null; deptChart = null
    return
  }
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
useElementResize([scopeEl, deptEl], resize)

onMounted(async () => {
  await dataStore.loadSampleData()
  if (dataStore.source.emissions === 'sample') calculationPath.value = '内置示例数据'
  else calculationPath.value = '浏览器保存的用户核算记录（路径未记录）'
  await nextTick()
  renderCharts()
})
watch(() => [dataStore.currentYear, dataStore.source.emissions, dataStore.yearRecords.length], async () => { await nextTick(); renderCharts() }, { flush: 'post' })
onBeforeUnmount(() => { scopeChart?.dispose(); deptChart?.dispose() })
</script>

<style scoped>
.accounting-context { display: flex; justify-content: space-between; gap: 1.5rem; color: var(--c-text); }
.accounting-context strong { font-size: 1.2rem; }
.accounting-context p, .accounting-meta, .accounting-caveat { color: var(--c-text-3); font-size: .76rem; line-height: 1.65; }
.accounting-meta { display: grid; gap: .2rem; min-width: 16rem; }
.accounting-caveat { margin-top: .75rem; }
.accounting-error { margin-top: .55rem; color: var(--c-amber, #f0b75e); font-size: .76rem; }
@media (max-width: 700px) { .accounting-context { flex-direction: column; } .accounting-meta { min-width: 0; } }
</style>
