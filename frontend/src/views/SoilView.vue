<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <div class="c-card p-4 text-xs text-[var(--c-text-2)] leading-6">
      数据源：土壤光谱数据处理结果（第三批） · <span class="sample-badge">真实实验数据（平台内置）</span>
      46 样本 × 256 波段 (396.2–1035.9 nm) · SpecVIEW + ENVI 流程 · 分组均值光谱 / PCA 聚类 / 敏感光谱指数
    </div>

    <!-- 分组筛选 -->
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-[var(--c-text-3)]">分组筛选：</span>
      <el-radio-group v-model="groupFilter" size="small">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button v-for="g in groups" :key="g" :value="g">{{ g }}</el-radio-button>
      </el-radio-group>
      <el-button size="small" plain :loading="loading" @click="loadData">重新加载</el-button>
    </div>

    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="c-card p-4"><div class="skeleton h-60 w-full" /></div>
      <div class="c-card p-4"><div class="skeleton h-60 w-full" /></div>
    </div>

    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="stat-box"><div class="num text-green">{{ samples.length }}</div><div class="lbl">光谱样本数</div></div>
        <div class="stat-box"><div class="num text-blue">{{ wavelengths.length }}</div><div class="lbl">波段数 (nm)</div></div>
        <div class="stat-box"><div class="num text-amber">{{ groups.length }}</div><div class="lbl">样本分组</div></div>
        <div class="stat-box"><div class="num text-purple">{{ pc1Var }}%</div><div class="lbl">PC1 方差解释率</div></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="分组均值光谱曲线" height="320">
          <div ref="spectralEl" class="w-full h-full" />
        </ChartCard>
        <ChartCard title="PCA 主成分聚类 (无监督)" height="320">
          <div ref="pcaEl" class="w-full h-full" />
        </ChartCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="有机质敏感光谱指数 (SOC 建模特征)" height="300">
          <div ref="indicesEl" class="w-full h-full" />
        </ChartCard>

        <!-- SOC 标签导入 + ML 建模 -->
        <div class="c-card p-4 space-y-3">
          <div class="text-xs text-[var(--c-text-3)] leading-6">
            SOC 标签导入 + ML 建模框架：当前数据文件不含 SOC 实测值。导入「样本, SOC」成对标签 CSV 后可启动回归建模
            （CSV 表头需含 <code class="text-amber">样本</code> 与 <code class="text-amber">SOC</code> 两列，中英文均可）。
          </div>
          <DataUpload title="导入 SOC 标签 (CSV)" hint="表头：样本, SOC" @pick="socInput?.click()" />
          <input ref="socInput" type="file" accept=".csv" class="hidden" @change="onSocFile" />
          <el-button size="small" type="primary" plain @click="checkFeasibility">检查建模可行性</el-button>
          <div v-if="socCount > 0" class="text-xs text-[var(--c-green)]">✅ 已导入 {{ socCount }} 条 SOC 标签，可启动 PLSR / SVR / RF / LightGBM 回归建模</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
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

let data: any = null
let c1: echarts.ECharts | null = null
let c2: echarts.ECharts | null = null
let c3: echarts.ECharts | null = null

const wavelengths = computed<number[]>(() => data?.wavelengths || [])
const samples = computed<any[]>(() => {
  if (!data) return []
  return groupFilter.value === 'all' ? data.samples : data.samples.filter((s: any) => s.group === groupFilter.value)
})
const groups = computed<string[]>(() => data?.groups || [])
const pc1Var = computed(() => data ? (data.pca.variance_ratio[0] * 100).toFixed(1) : '—')

const GROUP_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6']

async function loadData() {
  loading.value = true
  try {
    data = await fetch('/sample-data/soil_spectral.json').then((r) => r.json())
  } catch {
    toast.error('土壤光谱数据加载失败')
  }
  loading.value = false
  renderAll()
}

function renderAll() {
  if (!data) return
  // 均值光谱
  if (spectralEl.value && !c1) c1 = echarts.init(spectralEl.value)
  const tt = { backgroundColor: 'rgba(13,23,20,0.94)', borderColor: '#24413a', textStyle: { color: '#e8f5ef', fontSize: 12 } }
  const axis = { axisLine: { lineStyle: { color: '#1e3329' } }, axisLabel: { color: '#9db8ae' }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } } }

  const showGroups = groupFilter.value === 'all' ? groups.value : [groupFilter.value]
  const series = showGroups.map((g, gi) => {
    const gs = data.samples.filter((s: any) => s.group === g)
    if (!gs.length) return null
    const mean = wavelengths.value.map((_, wi) => gs.reduce((a: number, s: any) => a + s.spectrum[wi], 0) / gs.length)
    return { name: g, type: 'line', data: mean.map((v: number, i: number) => [wavelengths.value[i], +v.toFixed(4)]), showSymbol: false, smooth: true, color: GROUP_COLORS[gi % GROUP_COLORS.length], lineStyle: { width: 2 } }
  }).filter(Boolean)
  c1?.setOption({
    tooltip: { trigger: 'axis', ...tt, formatter: (p: any) => `${p[0].axisValue} nm<br/>` + p.map((x: any) => `${x.marker} ${x.seriesName}: ${x.value[1]}`).join('<br/>') },
    legend: { bottom: 0, textStyle: { color: '#9db8ae' } },
    grid: { left: '3%', right: '4%', bottom: '14%', top: '10%', containLabel: true },
    xAxis: { type: 'value', name: '波长 (nm)', nameTextStyle: { color: '#5f7a6f' }, min: 396, max: 1036, ...axis },
    yAxis: { type: 'value', name: '反射率', nameTextStyle: { color: '#5f7a6f' }, ...axis },
    series, animationDuration: 1600,
  }, true)

  // PCA 散点
  if (pcaEl.value && !c2) c2 = echarts.init(pcaEl.value)
  const pcSeries = groups.value.map((g: string, gi: number) => {
    const pts = data.samples.map((s: any, i: number) => ({ s, i })).filter(({ s }: { s: any; i: number }) => s.group === g)
    return {
      name: g, type: 'scatter', symbolSize: 9,
      itemStyle: { color: GROUP_COLORS[gi % GROUP_COLORS.length], opacity: 0.85 },
      data: pts.map(({ s, i }: { s: any; i: number }) => data.pca.coordinates[String(i)]),
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
  const idxSeries = groups.value.map((g, gi) => {
    const gs = data.samples.filter((s: any) => s.group === g)
    return { name: g, type: 'bar', data: idxNames.map((n) => +(gs.reduce((a: number, s: any) => a + s.indices[n], 0) / gs.length).toFixed(3)), itemStyle: { color: GROUP_COLORS[gi % GROUP_COLORS.length], borderRadius: [4, 4, 0, 0] }, animationDelay: (i: number) => i * 80 }
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
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const text = await file.text()
  const lines = text.trim().split('\n')
  const count = lines.length - 1
  if (count <= 0) { toast.error('CSV 无数据行'); return }
  socCount.value = count
  toast.success(`已导入 ${count} 条 SOC 标签`)
  ;(e.target as HTMLInputElement).value = ''
}

function checkFeasibility() {
  if (socCount.value >= 10) toast.success(`建模可行性检查通过：${socCount.value} 对样本-标签，建议样本数 ≥ 46（当前样本 ${samples.value.length}）`)
  else toast.warning('SOC 标签不足（建议 ≥10 对），请先导入「样本, SOC」CSV 标签')
}

function resize() { c1?.resize(); c2?.resize(); c3?.resize() }
onMounted(async () => { await loadData(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); c1?.dispose(); c2?.dispose(); c3?.dispose() })
</script>
