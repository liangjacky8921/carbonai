<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <div class="c-card p-4 pcf-disclosure" role="note"><strong>产品碳足迹演示</strong><span>当前页面使用固定示例阶段数据，仅作示例估算 / DEMO ONLY；标准选项仅用于展示模板，不代表标准合规核算或真实材料排放因子匹配。比较图为示例倍率示意，不是外部行业数据库。</span></div>
    <p v-if="dataStore.historicalPcfCache !== null" class="text-xs text-[var(--c-text-3)]" role="note">检测到待确认的历史 PCF 缓存，已保留原始内容，不参与当前示例计算。</p>
    <p v-if="loadError" role="alert">{{ loadError }}</p>
    <!-- LCA 阶段流程 -->
    <div class="c-card p-4">
      <div class="flex flex-wrap items-center gap-2 lca-flow">
        <template v-for="(s, i) in stageList" :key="s.stage">
          <button type="button" class="lca-stage" :class="{ active: selectedStage === s.stage }"
            :aria-pressed="selectedStage === s.stage"
            @click="selectedStage = s.stage">
            <span class="text-xl">{{ s.icon }}</span>
            <div class="text-xs mt-1">{{ s.name }}</div>
            <div class="num text-[13px] mt-0.5 font-bold" :style="{ color: stageColors[s.stage] }">{{ stageData[s.stage] ? stageData[s.stage].toFixed(1) : '—' }}</div>
          </button>
          <span v-if="i < stageList.length - 1" class="arrow">→</span>
        </template>
      </div>
    </div>

    <!-- 参数表单 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="c-card p-4 space-y-3">
        <el-input v-model="productName" readonly placeholder="产品名称" size="small" aria-label="产品名称" />
        <el-select v-model="unit" disabled size="small" placeholder="产品单位" aria-label="产品单位">
          <el-option label="件 (pcs)" value="件" />

        </el-select>
        <el-select v-model="standard" size="small" placeholder="展示模板 / 标准选项" aria-label="展示模板 / 标准选项">
          <el-option label="ISO 14067:2018" value="ISO 14067:2018" />
          <el-option label="PAS 2050" value="PAS 2050" />
          <el-option label="GHG Protocol Product Standard" value="GHG Protocol Product Standard" />
          <el-option label="欧盟 PEF" value="欧盟 PEF" />
        </el-select>
        <p class="text-xs text-[var(--c-text-3)]">固定示例功能单位：1 件，暂不支持 kg / t 换算。标准切换仅改变展示模板。</p>
        <div class="flex gap-2">
          <el-button type="primary" size="small" class="flex-1" @click="calcPcf">生成演示估算</el-button>
          <el-button size="small" @click="loadDemo">加载演示数据</el-button>
        </div>
        <div class="flex gap-2">
          <el-button size="small" type="success" plain :disabled="!hasResult || Boolean(exporting)" :loading="exporting === 'pdf'" @click="exportPcf('pdf')">
            双语 PDF 报告
          </el-button>
          <el-button size="small" type="success" plain :disabled="!hasResult || Boolean(exporting)" :loading="exporting === 'word'" @click="exportPcf('word')">
            双语 Word 报告
          </el-button>
        </div>
      </div>

      <!-- BOM 表 -->
      <div class="c-card lg:col-span-2">
        <div class="c-card-title">
          产品 BOM 清单
          <span :class="dataStore.source.bom === 'user' ? 'user-badge' : 'sample-badge'" style="margin-left: 8px">
            {{ dataStore.source.bom === 'user' ? '用户数据' : '示例数据' }}
          </span>
        </div>
        <div class="p-4 max-h-[300px] overflow-auto">
          <table class="dark-table" v-if="bomRows.length">
            <thead><tr><th>#</th><th>部件</th><th>规格</th><th class="text-right">数量</th><th>单位</th><th>材料</th><th>供应商</th><th class="text-right">排放 (kgCO₂e)</th></tr></thead>
            <tbody>
              <tr v-for="r in bomRows" :key="r.no">
                <td>{{ r.no }}</td><td class="text-[var(--c-text)]">{{ r.part }}</td><td class="text-[11px]">{{ r.spec }}</td>
                <td class="num text-right">{{ r.qty }}</td><td>{{ r.unit }}</td><td>{{ r.material }}</td>
                <td class="text-[11px]">{{ r.supplier }}</td>
                <td class="num text-right text-[var(--c-green)] font-semibold">{{ r.emission }}</td>
              </tr>
            </tbody>
          </table>
          <EmptyState v-else icon="Box" title="暂无 BOM 数据" description="点击「加载演示数据」查看内置示例产品 BOM（智能碳监测终端 CT-200）" />
        </div>
      </div>
    </div>

    <!-- 结果 -->
    <template v-if="hasResult">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="c-card p-5 text-center flex flex-col justify-center">
          <div class="text-xs text-[var(--c-text-3)] mb-2">示例估算 / DEMO ONLY</div>
          <div class="num text-[38px] font-bold text-green">{{ total.toFixed(2) }}</div>
          <div class="text-xs text-[var(--c-text-2)] mt-1">kgCO₂e / {{ unit }}</div>
          <div class="text-[11px] text-[var(--c-text-3)] mt-3">示例数据 · 展示模板 / 标准选项：{{ standard }} · 非合规结论</div>
        </div>
        <ChartCard title="各阶段碳排放占比" height="300" class="lg:col-span-2">
          <div ref="stageEl" class="w-full h-full" />
        </ChartCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="示意比较（示例倍率，非外部基准）" height="300">
          <div ref="benchmarkEl" class="w-full h-full" />
        </ChartCard>

        <!-- 报告预览 -->
        <div class="c-card">
          <div class="c-card-title">
            报告预览（中英双语）
            <el-radio-group v-model="reportLang" size="small" style="margin-left: 12px" aria-label="报告语言">
              <el-radio-button value="both">中英双语</el-radio-button>
              <el-radio-button value="zh">中文</el-radio-button>
              <el-radio-button value="en">English</el-radio-button>
            </el-radio-group>
          </div>
          <div class="p-3">
            <div ref="reportPreview" class="report-preview" v-html="previewHtml" />
          </div>
        </div>
      </div>

      <!-- LCA 明细表 -->
      <div class="c-card">
        <div class="c-card-title">LCA 各阶段排放明细</div>
        <div class="p-4 table-scroll">
          <table class="dark-table">
            <thead><tr><th>阶段</th><th>排放量 (kgCO₂e)</th><th class="text-right">占比</th><th>阶段说明（示例，非因子依据）</th></tr></thead>
            <tbody>
              <tr v-for="s in stageList" :key="s.stage">
                <td>{{ s.icon }} <b>{{ s.name }}</b></td>
                <td class="num font-semibold text-[var(--c-green)]">{{ stageData[s.stage].toFixed(2) }}</td>
                <td class="num text-right">{{ ((stageData[s.stage] / total) * 100).toFixed(1) }}%</td>
                <td class="text-[11px]">{{ sourceMap[s.stage] }}</td>
              </tr>
              <tr class="total-row"><td>合计</td><td>{{ total.toFixed(2) }}</td><td class="num text-right">100%</td><td>kgCO₂e / {{ unit }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    <div v-else class="c-card">
      <EmptyState icon="Box" title="尚无演示估算结果"
        description="可加载固定示例阶段数据，重复操作结果一致。当前页面不提供经核验的产品碳足迹结论。" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { CHART_AXIS, CHART_TOOLTIP } from '@/utils/chartTheme'
import { useElementResize } from '@/composables/useElementResize'
import ChartCard from '@/components/ChartCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { Box } from '@element-plus/icons-vue'
import { useDataStore } from '@/stores/data'
import { useToast } from '@/composables/useToast'
import { buildPcfHtml, exportHtmlToPdf, exportReportWord, addReportHistory, type PcfData } from '@/utils/reportBuilder'

const dataStore = useDataStore()
const toast = useToast()
const exporting = ref<'' | 'pdf' | 'word'>('')
const loadError = ref('')
let loadVersion = 0

const stageList = [
  { stage: 'raw', name: '原材料获取', icon: '⛏️', nameEn: 'Raw Materials' },
  { stage: 'mfg', name: '生产制造', icon: '🏭', nameEn: 'Manufacturing' },
  { stage: 'tpt', name: '运输分销', icon: '🚛', nameEn: 'Transport & Distribution' },
  { stage: 'use', name: '使用阶段', icon: '⚡', nameEn: 'Use Phase' },
  { stage: 'eol', name: '废弃回收', icon: '♻️', nameEn: 'End of Life' },
]
const stageColors: Record<string, string> = { raw: '#8b5cf6', mfg: '#ef4444', tpt: '#f59e0b', use: '#0ea5e9', eol: '#10b981' }
const sourceMap: Record<string, string> = Object.fromEntries(
  stageList.map(s => [s.stage, `${s.name}固定示例值；未经活动数据与排放因子核验`]),
)

const productName = ref('')
const unit = ref('件')
const standard = ref('ISO 14067:2018')
const selectedStage = ref('raw')
const reportLang = ref<'both' | 'zh' | 'en'>('both')
const stageData = ref<Record<string, number>>({})
const stageEl = ref<HTMLElement | null>(null)
const benchmarkEl = ref<HTMLElement | null>(null)
let c1: echarts.ECharts | null = null
let c2: echarts.ECharts | null = null

const hasResult = computed(() => Object.keys(stageData.value).length > 0)
const total = computed(() => stageList.reduce((s, x) => s + (stageData.value[x.stage] || 0), 0))
const bomRows = computed<any[]>(() => hasResult.value ? dataStore.sampleBom?.bom || [] : [])

const pcfData = computed<PcfData>(() => ({
  productName: productName.value || '未命名产品',
  unit: unit.value,
  standard: standard.value,
  stages: stageList.map((s) => ({ ...s, emission: stageData.value[s.stage] || 0, mainSource: sourceMap[s.stage] })),
}))
// PDF 和 Word 共用报告生成器中的完整演示免责声明。
const previewHtml = computed(() => (hasResult.value ? buildPcfHtml(pcfData.value, reportLang.value) : ''))

function clearResult() {
  loadVersion++
  stageData.value = {}
  productName.value = ''
  unit.value = '件'
  loadError.value = ''
  c1?.dispose(); c2?.dispose()
  c1 = null; c2 = null
}

async function loadDemo() {
  clearResult()
  const version = loadVersion
  try {
    const b = await dataStore.loadPcfSample()
    if (version !== loadVersion) return
    productName.value = b.product.name
    unit.value = '件'
    stageData.value = Object.fromEntries(b.lcaStages.map((s: any) => [s.stage, s.emission]))
    nextTick(renderCharts)
    toast.success('已加载固定示例估算 / DEMO ONLY，非真实产品核算')
  } catch (e: any) {
    if (version !== loadVersion) return
    clearResult()
    loadError.value = e.message || '示例加载失败，未保留旧结果'
    toast.error(loadError.value)
  }
}

async function calcPcf() {
  await loadDemo()
}

function renderCharts() {
  if (stageEl.value && !c1) c1 = echarts.init(stageEl.value)
  if (benchmarkEl.value && !c2) c2 = echarts.init(benchmarkEl.value)
  const tt = CHART_TOOLTIP
  const axis = CHART_AXIS
  c1?.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} kgCO₂e ({d}%)', ...tt },
    legend: { bottom: 0, textStyle: { color: '#9db8ae', fontSize: 10.5 } },
    series: [{
      type: 'pie', radius: ['42%', '68%'],
      itemStyle: { borderColor: '#0a120f', borderWidth: 2, borderRadius: 6 },
      label: { color: '#9db8ae' },
      data: stageList.map((s) => ({ name: s.name, value: stageData.value[s.stage], itemStyle: { color: stageColors[s.stage] } })),
      animationType: 'scale', animationEasing: 'elasticOut', animationDelay: (i: number) => i * 100,
    }],
  }, true)
  const bench = dataStore.sampleBom?.benchmark || { industryAvg: 1.3, industryBest: 0.55, euPef: 0.7 }
  c2?.setOption({
    tooltip: { trigger: 'axis', ...tt },
    grid: { left: '3%', right: '5%', bottom: '12%', top: '12%', containLabel: true },
    xAxis: { type: 'category', data: ['本示例', '行业平均（示意）', '行业先进（示意）', 'PEF参考（示意）'], ...axis },
    yAxis: { type: 'value', name: 'kgCO₂e/' + unit.value, nameTextStyle: { color: '#5f7a6f' }, ...axis },
    series: [{
      type: 'bar', barWidth: '45%',
      data: [
        { value: +total.value.toFixed(2), itemStyle: { color: '#10b981' } },
        { value: +(total.value * bench.industryAvg).toFixed(2), itemStyle: { color: '#94a3b8' } },
        { value: +(total.value * bench.industryBest).toFixed(2), itemStyle: { color: '#34d399' } },
        { value: +(total.value * bench.euPef).toFixed(2), itemStyle: { color: '#0ea5e9' } },
      ],
      itemStyle: { borderRadius: [6, 6, 0, 0] },
      label: { show: true, position: 'top', color: '#9db8ae', fontSize: 10 },
      animationDelay: (i: number) => i * 120,
    }],
  }, true)
}

async function exportPcf(format: 'pdf' | 'word') {
  if (!hasResult.value || exporting.value) return
  const html = previewHtml.value
  const exportProduct = productName.value
  const exportStandard = standard.value
  const name = `演示资料_产品碳足迹_${productName.value || '未命名'}_${new Date().toISOString().slice(0, 10)}`
  exporting.value = format
  try {
    if (format === 'pdf') {
      toast.info('正在生成双语 PDF 报告…')
      await exportHtmlToPdf(html, name + '.pdf')
    } else {
      toast.info('正在生成双语 Word 报告…')
      await exportReportWord(
        `${productName.value} 产品碳足迹演示资料 / Demo Product Carbon Footprint`,
        `演示资料，非合规报告 | 展示模板 / 标准选项（非合规依据）: ${exportStandard} | 功能单位: 1 ${unit.value}`,
        html, name + '.docx',
      )
    }
    addReportHistory({ name: `${exportProduct} 碳足迹演示资料 / DEMO ONLY`, standard: `展示选项（非合规依据）：${exportStandard}`, region: '中国大陆', date: new Date().toISOString().slice(0, 10), format: format === 'pdf' ? 'PDF' : 'Word', type: 'pcf' })
    toast.success(`✅ ${format === 'pdf' ? 'PDF' : 'Word'} 报告已生成并下载`)
  } catch (e: any) {
    toast.error('报告生成失败：' + e.message)
  } finally {
    exporting.value = ''
  }
}

function resize() { c1?.resize(); c2?.resize() }
useElementResize([stageEl, benchmarkEl], resize)
onMounted(loadDemo)
watch(() => dataStore.pcfResetVersion, clearResult, { flush: 'sync' })
watch(() => dataStore.source.bom, () => { if (dataStore.source.bom === 'user') clearResult() }, { flush: 'sync' })
watch(reportLang, () => nextTick())
onBeforeUnmount(clearResult)
</script>

<style scoped>
.pcf-disclosure { display: grid; gap: .35rem; border-left: 2px solid var(--c-green); }
.pcf-disclosure strong { color: var(--c-text); }
.pcf-disclosure span { color: var(--c-text-3); font-size: .77rem; line-height: 1.65; }
.lca-flow { justify-content: space-between; }
.lca-stage {
  appearance: none; color: inherit; font: inherit;
  flex: 1; min-width: 96px; text-align: center; padding: 12px 8px; border-radius: 10px;
  border: 1px solid var(--c-border); cursor: pointer; background: var(--c-surface-2);
  transition: transform var(--dur-micro) var(--ease-apple), border-color var(--dur-micro) var(--ease-apple), background-color var(--dur-micro) var(--ease-apple), box-shadow var(--dur-micro) var(--ease-apple);
}
.lca-stage:hover { transform: translateY(-3px); border-color: var(--c-border-2); }
.lca-stage.active { border-color: rgba(16, 185, 129, 0.5); background: var(--c-green-soft); box-shadow: 0 0 20px rgba(16, 185, 129, 0.12); }
.arrow { color: var(--c-text-3); flex-shrink: 0; }
.report-preview {
  height: 300px; overflow: auto; background: #ffffff; color: #1e293b;
  border-radius: 8px; padding: 20px 26px; font-size: 12px; line-height: 1.8;
}
</style>
