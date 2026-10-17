<template>
  <div class="max-w-[1600px] mx-auto space-y-4 soil-page">
    <div class="c-card p-4 soil-heading">
      <div><div class="soil-kicker">SOIL SPECTRAL ANALYSIS</div><h2>土壤光谱与 SOC 建模准备</h2><p>平台内置第三批光谱处理结果；实验数据来源、授权与适用范围待核实。</p></div>
      <div class="soil-meta"><span>处理日期：{{ data?.meta?.['处理日期'] || '未提供' }}</span><span>样本：{{ data?.n_samples ?? '—' }} · 波段：{{ data?.n_bands ?? '—' }}</span><span>波长：{{ wavelengthRange }}</span></div>
    </div>

    <!-- 分组筛选 -->
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-[var(--c-text-3)]">分组筛选：</span>
      <el-radio-group v-model="groupFilter" size="small" aria-label="土壤样本分组筛选">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button v-for="g in groups" :key="g" :value="g">{{ g }}</el-radio-button>
      </el-radio-group>
      <el-button size="small" plain :loading="loading" @click="loadData">重新加载</el-button>
    </div>

    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="c-card p-4"><div class="skeleton h-60 w-full" /></div>
      <div class="c-card p-4"><div class="skeleton h-60 w-full" /></div>
    </div>

    <div v-else-if="loadError" class="soil-state" role="alert">{{ loadError }}</div>
    <div v-else-if="!data" class="soil-state" role="status">暂无可用的土壤光谱资料。</div>
    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="stat-box"><div class="num text-green">{{ samples.length }}</div><div class="lbl">光谱样本数</div></div>
        <div class="stat-box"><div class="num text-blue">{{ wavelengths.length }}</div><div class="lbl">波段数</div></div>
        <div class="stat-box"><div class="num text-amber">{{ groups.length }}</div><div class="lbl">样本分组</div></div>
        <div class="stat-box"><div class="num text-purple">{{ pc1Var }}{{ pc1Var === '—' ? '' : '%' }}</div><div class="lbl">PC1 方差解释率（内置 PCA）</div></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="分组均值光谱曲线 · 波长 nm / 反射率" height="320" :empty="!samples.length" source-note="平台内置第三批光谱处理结果">
          <div ref="spectralEl" class="w-full h-full" />
        </ChartCard>
        <ChartCard title="PCA 样本投影（无监督）" height="320" :empty="!samples.length" source-note="平台内置第三批光谱处理结果">
          <div ref="pcaEl" class="w-full h-full" />
        </ChartCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="有机质敏感光谱指数 · 特征而非 SOC 预测" height="300" :empty="!samples.length" source-note="平台内置第三批光谱处理结果">
          <div ref="indicesEl" class="w-full h-full" />
        </ChartCard>

        <!-- SOC 标签导入 + ML 建模 -->
        <div class="c-card p-4 space-y-3">
          <div class="soil-model-status"><strong>SOC 模型尚未训练</strong><span>模型版本：未提供 · 预测值：未提供 · 误差指标：未测 · 适用范围：未验证</span></div>
          <p class="soil-note">当前文件没有 SOC 实测标签。本入口仅检查 CSV 标签格式、数值及与内置样本名称的匹配情况，不执行 PLSR / SVR / RF / LightGBM 训练或预测。SOC 数值单位未在文件中约定，需另行核实。</p>
          <DataUpload title="检查 SOC 标签 CSV" hint="表头：样本（或 sample）, SOC；样本名须与光谱文件一致" @pick="socInput?.click()" />
          <input ref="socInput" type="file" accept=".csv" class="hidden" @change="onSocFile" />
          <el-button size="small" type="primary" plain @click="checkFeasibility">检查标签配对</el-button>
          <div v-if="socError" class="soil-state" role="alert">{{ socError }}</div>
          <div v-if="socCount > 0" class="soil-note" role="status">已校验 {{ socCount }} 对匹配的样本—SOC 标签；这不是模型训练结果。</div>
        </div>
      </div>
      <div class="c-card p-4">
        <h3 class="soil-subtitle">样本信息</h3>
        <p class="soil-note">以下为内置光谱处理结果的样本元数据，不包含 SOC 实测值。</p>
        <div class="soil-table-wrap"><table class="soil-table"><thead><tr><th>样本名称</th><th>分组</th><th>有效像元</th><th>有效比例</th></tr></thead><tbody><tr v-for="sample in samples" :key="sample.name"><td>{{ sample.name }}</td><td>{{ sample.group }}</td><td>{{ sample.valid_pixels ?? '—' }}</td><td>{{ sample.valid_pct == null ? '—' : `${sample.valid_pct}%` }}</td></tr></tbody></table></div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import { CHART_AXIS, CHART_TOOLTIP } from '@/utils/chartTheme'
import { useElementResize } from '@/composables/useElementResize'
import ChartCard from '@/components/ChartCard.vue'
import DataUpload from '@/components/DataUpload.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const loading = ref(true)
const groupFilter = ref('all')
const spectralEl = ref<HTMLElement | null>(null)
const pcaEl = ref<HTMLElement | null>(null)
const indicesEl = ref<HTMLElement | null>(null)
const socInput = ref<HTMLInputElement | null>(null)
const socCount = ref(0)
const socError = ref('')
const loadError = ref('')

const data = shallowRef<any>(null)
let c1: echarts.ECharts | null = null
let c2: echarts.ECharts | null = null
let c3: echarts.ECharts | null = null

const wavelengths = computed<number[]>(() => data.value?.wavelengths || [])
const samples = computed<any[]>(() => {
  if (!data.value) return []
  return groupFilter.value === 'all' ? data.value.samples : data.value.samples.filter((s: any) => s.group === groupFilter.value)
})
const groups = computed<string[]>(() => data.value?.groups || [])
const wavelengthRange = computed(() => wavelengths.value.length ? `${wavelengths.value[0]}–${wavelengths.value[wavelengths.value.length - 1]} nm` : '未提供')
// 注：数据源 variance_ratio 已为百分比（如 97.52），直接 toFixed 即可，禁止再 * 100
const pc1Var = computed(() => typeof data.value?.pca?.variance_ratio?.[0] === 'number' ? data.value.pca.variance_ratio[0].toFixed(2) : '—')

const GROUP_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6']

async function loadData() {
  loading.value = true
  loadError.value = ''
  c1?.dispose(); c2?.dispose(); c3?.dispose()
  c1 = null; c2 = null; c3 = null
  try {
    const response = await fetch('/sample-data/soil_spectral.json')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    data.value = await response.json()
  } catch {
    data.value = null
    loadError.value = '土壤光谱资料加载失败，请稍后重试。'
    toast.error('土壤光谱数据加载失败')
  } finally {
    loading.value = false
  }
  await nextTick()
  if (data.value) renderAll()
}

function renderAll() {
  if (!data.value) return
  // 均值光谱
  if (spectralEl.value && !c1) c1 = echarts.init(spectralEl.value)
  const tt = CHART_TOOLTIP
  const axis = CHART_AXIS

  const showGroups = groupFilter.value === 'all' ? groups.value : [groupFilter.value]
  const series = showGroups.map((g, gi) => {
    const gs = data.value.samples.filter((s: any) => s.group === g)
    if (!gs.length) return null
    const mean = wavelengths.value.map((_, wi) => gs.reduce((a: number, s: any) => a + s.spectrum[wi], 0) / gs.length)
    return { name: g, type: 'line', data: mean.map((v: number, i: number) => [wavelengths.value[i], +v.toFixed(4)]), showSymbol: false, smooth: true, color: GROUP_COLORS[gi % GROUP_COLORS.length], lineStyle: { width: 2 } }
  }).filter(Boolean)
  c1?.setOption({
    tooltip: { trigger: 'axis', ...tt, formatter: (p: any) => `${p[0].axisValue} nm<br/>` + p.map((x: any) => `${x.marker} ${x.seriesName}: ${x.value[1]}`).join('<br/>') },
    legend: { bottom: 0, textStyle: { color: '#9db8ae' } },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '10%', containLabel: true },
    xAxis: { type: 'value', name: '波长 (nm)', nameTextStyle: { color: '#5f7a6f' }, min: wavelengths.value[0], max: wavelengths.value[wavelengths.value.length - 1], ...axis },
    yAxis: { type: 'value', name: '反射率', nameTextStyle: { color: '#5f7a6f' }, ...axis },
    series, animationDuration: 1600,
  }, true)

  // PCA 散点
  if (pcaEl.value && !c2) c2 = echarts.init(pcaEl.value)
  const pcSeries = showGroups.map((g: string) => {
    const pts = data.value.samples.map((s: any, i: number) => ({ s, i })).filter(({ s }: { s: any; i: number }) => s.group === g)
    return {
      name: g, type: 'scatter', symbolSize: 9,
      itemStyle: { color: GROUP_COLORS[groups.value.indexOf(g) % GROUP_COLORS.length], opacity: 0.85 },
      data: pts.map(({ i }: { s: any; i: number }) => data.value.pca.coordinates[String(i)]),
    }
  })
  c2?.setOption({
    tooltip: { ...tt, formatter: (p: any) => `${p.seriesName}<br/>PC1: ${p.value[0]}<br/>PC2: ${p.value[1]}` },
    legend: { bottom: 0, textStyle: { color: '#9db8ae' } },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '10%', containLabel: true },
    xAxis: { name: 'PC1', nameTextStyle: { color: '#5f7a6f' }, ...axis },
    yAxis: { name: 'PC2', nameTextStyle: { color: '#5f7a6f' }, ...axis },
    series: pcSeries, animationDelay: (i: number) => i * 20,
  }, true)

  // 光谱指数箱线近似（分组均值 ± 范围）
  if (indicesEl.value && !c3) c3 = echarts.init(indicesEl.value)
  const idxNames = ['NDVI', 'ND450_750', 'R750_450']
  const idxSeries = showGroups.map((g) => {
    const gs = data.value.samples.filter((s: any) => s.group === g)
    return { name: g, type: 'bar', data: idxNames.map((n) => +(gs.reduce((a: number, s: any) => a + s.indices[n], 0) / gs.length).toFixed(3)), itemStyle: { color: GROUP_COLORS[groups.value.indexOf(g) % GROUP_COLORS.length], borderRadius: [4, 4, 0, 0] }, animationDelay: (i: number) => i * 80 }
  })
  c3?.setOption({
    tooltip: { trigger: 'axis', ...tt },
    legend: { bottom: 0, textStyle: { color: '#9db8ae' } },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '12%', containLabel: true },
    xAxis: { type: 'category', data: idxNames, ...axis },
    yAxis: { type: 'value', ...axis },
    series: idxSeries,
  }, true)
}

async function onSocFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  socCount.value = 0
  socError.value = ''
  try {
    if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('仅支持 CSV 文件。')
    const rows = (await file.text()).trim().replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.split(',').map((cell) => cell.trim()))
    if (rows.length < 2) throw new Error('CSV 没有数据行。')
    const sampleColumn = rows[0].findIndex((cell) => ['样本', 'sample'].includes(cell.toLowerCase()))
    const socColumn = rows[0].findIndex((cell) => cell.toLowerCase() === 'soc')
    if (sampleColumn < 0 || socColumn < 0) throw new Error('CSV 表头需要“样本（或 sample）”和“SOC”。')
    const knownSamples = new Set(data.value.samples.map((sample: any) => sample.name))
    const seen = new Set<string>()
    for (const [index, row] of rows.slice(1).entries()) {
      const name = row[sampleColumn]
      const value = Number(row[socColumn])
      if (!name || !knownSamples.has(name)) throw new Error(`第 ${index + 2} 行样本名称未匹配内置光谱。`)
      if (seen.has(name)) throw new Error(`第 ${index + 2} 行样本名称重复。`)
      if (!row[socColumn] || !Number.isFinite(value) || value < 0) throw new Error(`第 ${index + 2} 行 SOC 不是有效的非负数值。`)
      seen.add(name)
    }
    socCount.value = seen.size
    toast.success(`已校验 ${seen.size} 对样本标签`)
  } catch (error) {
    socError.value = error instanceof Error ? error.message : 'CSV 校验失败。'
  } finally {
    input.value = ''
  }
}

function checkFeasibility() {
  if (socCount.value > 0) toast.info(`已完成 ${socCount.value} 对标签格式与样本配对检查；模型训练和精度评估尚未实现。`)
  else toast.warning('请先选择含“样本,SOC”列的 CSV 文件并通过校验。')
}

watch(groupFilter, async () => { await nextTick(); if (!loading.value && data.value) renderAll() })

function resize() { c1?.resize(); c2?.resize(); c3?.resize() }
useElementResize([spectralEl, pcaEl, indicesEl], resize)
onMounted(async () => { await loadData() })
onBeforeUnmount(() => { c1?.dispose(); c2?.dispose(); c3?.dispose() })
</script>

<style scoped>
.soil-heading { display: flex; justify-content: space-between; gap: 1.5rem; align-items: start; }
.soil-heading h2 { margin: .35rem 0; font-size: clamp(1.3rem, 2vw, 1.8rem); font-weight: 650; color: var(--c-text); }
.soil-heading p, .soil-note { color: var(--c-text-3); font-size: .8rem; line-height: 1.7; }
.soil-kicker { color: var(--c-green); font-size: .65rem; letter-spacing: .14em; }
.soil-meta { display: grid; gap: .3rem; min-width: 14rem; color: var(--c-text-3); font-size: .75rem; }
.soil-model-status { display: grid; gap: .4rem; border-left: 2px solid var(--c-green); padding-left: .75rem; }
.soil-model-status strong { color: var(--c-text); }
.soil-model-status span { color: var(--c-text-3); font-size: .76rem; line-height: 1.6; }
.soil-state { padding: .8rem 1rem; border: 1px solid var(--c-border); border-radius: .5rem; color: var(--c-text-3); }
.soil-subtitle { color: var(--c-text); font-weight: 600; margin-bottom: .25rem; }
.soil-table-wrap { max-height: 19rem; overflow: auto; margin-top: .75rem; }
.soil-table { width: 100%; min-width: 36rem; text-align: left; font-size: .75rem; color: var(--c-text-3); }
.soil-table th, .soil-table td { padding: .55rem .75rem; border-bottom: 1px solid var(--c-border); }
.soil-table th { position: sticky; top: 0; background: var(--c-surface); color: var(--c-text); }
@media (max-width: 640px) { .soil-heading { flex-direction: column; } .soil-meta { min-width: 0; } }
</style>
