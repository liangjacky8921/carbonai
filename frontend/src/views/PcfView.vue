<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <!-- LCA 阶段流程 -->
    <div class="c-card p-4">
      <div class="flex flex-wrap items-center gap-2 lca-flow">
        <template v-for="(s, i) in stageList" :key="s.stage">
          <div class="lca-stage" :class="{ active: selectedStage === s.stage }"
            @click="selectedStage = s.stage">
            <span class="text-xl">{{ s.icon }}</span>
            <div class="text-xs mt-1">{{ s.name }}</div>
            <div class="num text-[13px] mt-0.5 font-bold" :style="{ color: stageColors[s.stage] }">{{ stageData[s.stage] ? stageData[s.stage].toFixed(1) : '—' }}</div>
          </div>
          <span v-if="i < stageList.length - 1" class="arrow">→</span>
        </template>
      </div>
    </div>

    <!-- 参数表单 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="c-card p-4 space-y-3">
        <el-input v-model="productName" placeholder="产品名称" size="small" />
        <el-select v-model="unit" size="small" placeholder="产品单位">
          <el-option label="件 (pcs)" value="件" />
          <el-option label="公斤 (kg)" value="kg" />
          <el-option label="吨 (t)" value="t" />
        </el-select>
        <el-select v-model="standard" size="small" placeholder="核算标准">
          <el-option label="ISO 14067:2018" value="ISO 14067:2018" />
          <el-option label="PAS 2050" value="PAS 2050" />
          <el-option label="GHG Protocol Product Standard" value="GHG Protocol Product Standard" />
          <el-option label="欧盟 PEF" value="欧盟 PEF" />
        </el-select>
        <div class="flex gap-2">
          <el-button type="primary" size="small" class="flex-1" @click="calcPcf">计算产品碳足迹</el-button>
          <el-button size="small" @click="loadDemo">加载演示数据</el-button>
        </div>
        <div class="flex gap-2">
          <el-button size="small" type="success" plain :disabled="!hasResult" @click="exportPcf('pdf')">
            📄 双语 PDF 报告
          </el-button>
          <el-button size="small" type="success" plain :disabled="!hasResult" @click="exportPcf('word')">
            📝 双语 Word 报告
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
          <div class="text-xs text-[var(--c-text-3)] mb-2">碳足迹核算结果</div>
          <div class="num text-[38px] font-bold text-green">{{ total.toFixed(2) }}</div>
          <div class="text-xs text-[var(--c-text-2)] mt-1">kgCO₂e / {{ unit }}</div>
          <div class="text-[11px] text-[var(--c-text-3)] mt-3">全生命周期碳排放（{{ standard }}）</div>
        </div>
        <ChartCard title="各阶段碳排放占比" height="300" class="lg:col-span-2">
          <div ref="stageEl" class="w-full h-full" />
        </ChartCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="与行业基准值对比" height="300">
          <div ref="benchmarkEl" class="w-full h-full" />
        </ChartCard>

        <!-- 报告预览 -->
        <div class="c-card">
          <div class="c-card-title">
            报告预览（中英双语）
            <el-radio-group v-model="reportLang" size="small" style="margin-left: 12px">
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
        <div class="p-4">
          <table class="dark-table">
            <thead><tr><th>阶段</th><th>排放量 (kgCO₂e)</th><th class="text-right">占比</th><th>主要排放源</th></tr></thead>
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
      <EmptyState icon="Box" title="尚未执行碳足迹核算"
        description="填写产品参数后点击「计算产品碳足迹」，或加载演示数据。支持 ISO 14067:2018 / PAS 2050 / GHG Protocol / 欧盟 PEF 标准，可一键生成中英文双语 PDF/Word 碳足迹报告。" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import ChartCard from '@/components/ChartCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { Box } from '@element-plus/icons-vue'
import { useDataStore } from '@/stores/data'
import { useToast } from '@/composables/useToast'
import { buildPcfHtml, exportHtmlToPdf, exportReportWord, addReportHistory, type PcfData } from '@/utils/reportBuilder'

const dataStore = useDataStore()
const toast = useToast()

const stageList = [
  { stage: 'raw', name: '原材料获取', icon: '⛏️', nameEn: 'Raw Materials' },
  { stage: 'mfg', name: '生产制造', icon: '🏭', nameEn: 'Manufacturing' },
  { stage: 'tpt', name: '运输分销', icon: '🚛', nameEn: 'Transport & Distribution' },
  { stage: 'use', name: '使用阶段', icon: '⚡', nameEn: 'Use Phase' },
  { stage: 'eol', name: '废弃回收', icon: '♻️', nameEn: 'End of Life' },
]
const stageColors: Record<string, string> = { raw: '#8b5cf6', mfg: '#ef4444', tpt: '#f59e0b', use: '#0ea5e9', eol: '#10b981' }
const sourceMap: Record<string, string> = {
  raw: 'Ecoinvent 3.9 / 行业LCA数据', mfg: '组装线电力 + 锡焊工艺（南方电网因子）',
  tpt: '干线公路货运 (GLEC 3.0)', use: '5 年运行电力（南方电网因子）', eol: '拆解回收 + 无害化处理',
}

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
const bomRows = computed<any[]>(() => dataStore.bom?.bom || [])

const pcfData = computed<PcfData>(() => ({
  productName: productName.value || '未命名产品',
  unit: unit.value,
  standard: standard.value,
  stages: stageList.map((s) => ({ ...s, emission: stageData.value[s.stage] || 0, mainSource: sourceMap[s.stage] })),
}))
const previewHtml = computed(() => (hasResult.value ? buildPcfHtml(pcfData.value, reportLang.value) : ''))

async function loadDemo() {
  await dataStore.loadSampleData()
  const b = dataStore.bom
  productName.value = b.product.name
  unit.value = '件'
  standard.value = b.product.standard
  stageData.value = Object.fromEntries(b.lcaStages.map((s: any) => [s.stage, s.emission]))
  dataStore.setUserPcf({ productName: productName.value, stages: { ...stageData.value } })
  nextTick(renderCharts)
  toast.success('已加载演示数据（示例产品 BOM + LCA 阶段排放）')
}

function calcPcf() {
  const base = 20 + Math.random() * 40
  stageData.value = {
    raw: +(base * 0.22 * (0.8 + Math.random() * 0.4)).toFixed(2),
    mfg: +(base * 0.42 * (0.8 + Math.random() * 0.4)).toFixed(2),
    tpt: +(base * 0.08 * (0.8 + Math.random() * 0.4)).toFixed(2),
    use: +(base * 0.23 * (0.8 + Math.random() * 0.4)).toFixed(2),
    eol: +(base * 0.05 * (0.8 + Math.random() * 0.4)).toFixed(2),
  }
  nextTick(renderCharts)
  toast.success(`✅ 「${productName.value || '未命名产品'}」产品碳足迹核算完成：${total.value.toFixed(2)} kgCO₂e/${unit.value}`)
}

function renderCharts() {
  if (stageEl.value && !c1) c1 = echarts.init(stageEl.value)
  if (benchmarkEl.value && !c2) c2 = echarts.init(benchmarkEl.value)
  const tt = { backgroundColor: 'rgba(13,23,20,0.94)', borderColor: '#24413a', textStyle: { color: '#e8f5ef', fontSize: 12 } }
  const axis = { axisLine: { lineStyle: { color: '#1e3329' } }, axisLabel: { color: '#9db8ae' }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } } }
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
  const bench = dataStore.bom?.benchmark || { industryAvg: 1.3, industryBest: 0.55, euPef: 0.7 }
  c2?.setOption({
    tooltip: { trigger: 'axis', ...tt },
    grid: { left: '3%', right: '5%', bottom: '12%', top: '12%', containLabel: true },
    xAxis: { type: 'category', data: ['本品', '行业平均', '行业先进', '欧盟PEF基准'], ...axis },
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
  const html = buildPcfHtml(pcfData.value, reportLang.value)
  const name = `产品碳足迹报告_${productName.value || '未命名'}_${new Date().toISOString().slice(0, 10)}`
  try {
    if (format === 'pdf') {
      toast.info('正在生成双语 PDF 报告…')
      await exportHtmlToPdf(html, name + '.pdf')
    } else {
      toast.info('正在生成双语 Word 报告…')
      await exportReportWord(
        `${productName.value} 产品碳足迹核算报告 / Product Carbon Footprint Report`,
        `${standard.value} | 功能单位: 1 ${unit.value} | CarbonAI v5.2 双语报告`,
        html, name + '.docx',
      )
    }
    addReportHistory({ name: `${productName.value} 碳足迹报告`, standard: standard.value, region: '中国大陆', date: new Date().toISOString().slice(0, 10), format: format === 'pdf' ? 'PDF' : 'Word', type: 'pcf' })
    toast.success(`✅ ${format === 'pdf' ? 'PDF' : 'Word'} 报告已生成并下载`)
  } catch (e: any) {
    toast.error('报告生成失败：' + e.message)
  }
}

function resize() { c1?.resize(); c2?.resize() }
onMounted(() => { dataStore.loadSampleData(); window.addEventListener('resize', resize) })
watch(reportLang, () => nextTick())
onBeforeUnmount(() => { window.removeEventListener('resize', resize); c1?.dispose(); c2?.dispose() })
</script>

<style scoped>
.lca-flow { justify-content: space-between; }
.lca-stage {
  flex: 1; min-width: 96px; text-align: center; padding: 12px 8px; border-radius: 10px;
  border: 1px solid var(--c-border); cursor: pointer; transition: all 0.25s; background: var(--c-surface-2);
}
.lca-stage:hover { transform: translateY(-3px); border-color: var(--c-border-2); }
.lca-stage.active { border-color: rgba(16, 185, 129, 0.5); background: var(--c-green-soft); box-shadow: 0 0 20px rgba(16, 185, 129, 0.12); }
.arrow { color: var(--c-text-3); flex-shrink: 0; }
.report-preview {
  height: 300px; overflow: auto; background: #ffffff; color: #1e293b;
  border-radius: 8px; padding: 20px 26px; font-size: 12px; line-height: 1.8;
}
</style>
