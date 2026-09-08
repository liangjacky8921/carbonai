<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <!-- 区域选择 -->
    <div class="c-card p-4 flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="text-xs text-[var(--c-text-3)]">🌍 自动检测区域</span>
        <el-select v-model="region" size="small" style="width: 150px" @change="onRegionChange">
          <el-option v-for="(label, key) in REGION_LABELS" :key="key" :label="label" :value="key" />
        </el-select>
      </div>
      <span class="text-[11px] text-[var(--c-text-3)]">{{ regionHint }}</span>
    </div>

    <!-- 标准模板卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      <div v-for="std in REPORT_STANDARDS" :key="std.key" class="rpt-card c-card p-4"
        :class="{ selected: current === std.key, dim: regionStandards.length && !regionStandards.includes(std.key) }"
        @click="selectReport(std.key)">
        <div class="flex items-start justify-between gap-2">
          <div class="text-[13px] font-semibold text-[var(--c-text)] leading-6">{{ std.name }}</div>
          <el-tag size="small" effect="plain" type="success">{{ REGION_LABELS[std.region] }}</el-tag>
        </div>
        <p class="text-[11.5px] text-[var(--c-text-2)] leading-5 mt-2">{{ std.desc }}</p>
        <div class="flex flex-wrap gap-1.5 mt-3">
          <el-tag v-for="t in std.tags" :key="t" size="small" effect="dark" type="info" class="!text-[10px]">{{ t }}</el-tag>
        </div>
      </div>
    </div>

    <!-- 预览 + 操作 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div class="c-card lg:col-span-8">
        <div class="c-card-title">
          报告预览 · {{ currentName }}
          <span v-if="dataStore.source.emissions === 'sample'" class="sample-badge ml-auto">基于示例数据</span>
          <span v-else class="user-badge ml-auto">基于用户数据</span>
        </div>
        <div class="p-3">
          <div class="report-preview" v-html="previewHtml" />
        </div>
      </div>
      <div class="lg:col-span-4 space-y-4">
        <div class="c-card p-4 space-y-3">
          <el-button type="primary" class="w-full" @click="generate">一键生成报告</el-button>
          <div class="grid grid-cols-2 gap-2">
            <el-button size="small" type="success" plain @click="exportPdf">📄 导出 PDF</el-button>
            <el-button size="small" type="success" plain @click="exportWord">📝 导出 Word</el-button>
          </div>
          <div class="text-[11px] text-[var(--c-text-3)] leading-5">
            报告数据取自「碳排放核算」模块（{{ dataStore.currentYear }} 年度，{{ dataStore.yearRecords.length }} 条记录）。
            上传企业数据后报告自动更新，用户数据优先展示。
          </div>
        </div>

        <!-- 历史报告 -->
        <div class="c-card">
          <div class="c-card-title">
            历史报告
            <el-button size="small" text type="danger" style="margin-left: auto" @click="clearHistory">清空</el-button>
          </div>
          <div class="p-3 max-h-[320px] overflow-auto">
            <table class="dark-table">
              <thead><tr><th>报告名称</th><th>标准</th><th>日期</th><th>状态</th></tr></thead>
              <tbody>
                <tr v-for="h in history" :key="h.name + h.date">
                  <td class="text-[11.5px] text-[var(--c-text)]">{{ h.name }}</td>
                  <td class="text-[11px]">{{ h.standard }}</td>
                  <td class="text-[11px] num">{{ h.date }}</td>
                  <td><el-tag size="small" :type="h.status === '已生成' ? 'success' : 'info'" effect="plain">{{ h.status }}</el-tag></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDataStore } from '@/stores/data'
import { useToast } from '@/composables/useToast'
import { REPORT_STANDARDS, REGION_LABELS, REGION_STANDARDS, STANDARD_NAMES } from '@/data/reportStandards'
import { buildStandardReportHtml, exportHtmlToPdf, exportReportWord, addReportHistory, getReportHistory, clearReportHistory } from '@/utils/reportBuilder'

const dataStore = useDataStore()
const toast = useToast()
const region = ref('auto')
const current = ref('cn-sse')
const history = ref<any[]>([])

const regionStandards = computed(() => (region.value === 'auto' ? [] : REGION_STANDARDS[region.value] || []))
const currentName = computed(() => STANDARD_NAMES[current.value] || current.value)
const regionHint = computed(() =>
  region.value === 'auto' ? '自动检测所有区域标准' : `当前区域：${REGION_LABELS[region.value]} | ${regionStandards.value.length} 个标准模板可用`)

const previewHtml = computed(() => {
  if (!dataStore.yearRecords.length) {
    return '<p style="color:#64748b;text-align:center;padding:30px">请先在「碳排放核算」页面加载数据（示例数据或上传数据），系统将自动按所选标准填充报告内容</p>'
  }
  return buildStandardReportHtml(current.value, dataStore.yearRecords, dataStore.currentYear)
})

function selectReport(key: string) {
  current.value = key
  // 自动匹配区域
  const std = REPORT_STANDARDS.find((s) => s.key === key)
  if (std && region.value !== 'auto') region.value = std.region
}

function onRegionChange() {
  if (region.value !== 'auto' && regionStandards.value.length) {
    current.value = regionStandards.value[0]
  }
}

function generate() {
  if (!dataStore.yearRecords.length) { toast.warning('请先在「碳排放核算」加载数据'); return }
  addReportHistory({
    name: `${dataStore.currentYear}年度${currentName.value}`, standard: currentName.value,
    region: REGION_LABELS[region.value] || '自动', date: new Date().toISOString().slice(0, 10),
    format: 'PDF', type: 'standard',
  })
  history.value = getReportHistory()
  toast.success('✅ 报告已生成，请查看预览（已计入历史记录）')
}

async function exportPdf() {
  if (!dataStore.yearRecords.length) { toast.warning('请先在「碳排放核算」加载数据'); return }
  try {
    toast.info('正在生成 PDF 报告…')
    await exportHtmlToPdf(previewHtml.value, `合规报告_${currentName.value}_${dataStore.currentYear}.pdf`)
    addReportHistory({ name: `${dataStore.currentYear}年度${currentName.value}`, standard: currentName.value, region: REGION_LABELS[region.value] || '自动', date: new Date().toISOString().slice(0, 10), format: 'PDF', type: 'standard' })
    history.value = getReportHistory()
    toast.success('✅ PDF 报告已导出')
  } catch (e: any) { toast.error('PDF 生成失败：' + e.message) }
}

async function exportWord() {
  if (!dataStore.yearRecords.length) { toast.warning('请先在「碳排放核算」加载数据'); return }
  try {
    toast.info('正在生成 Word 报告…')
    await exportReportWord(
      `${currentName.value}（${dataStore.currentYear}年度）`,
      `合规碳排放报告 | CarbonAI v5.2 | ${new Date().toLocaleDateString('zh-CN')}`,
      previewHtml.value, `合规报告_${currentName.value}_${dataStore.currentYear}.docx`,
    )
    addReportHistory({ name: `${dataStore.currentYear}年度${currentName.value}`, standard: currentName.value, region: REGION_LABELS[region.value] || '自动', date: new Date().toISOString().slice(0, 10), format: 'Word', type: 'standard' })
    history.value = getReportHistory()
    toast.success('✅ Word 报告已导出')
  } catch (e: any) { toast.error('Word 生成失败：' + e.message) }
}

function clearHistory() {
  clearReportHistory()
  history.value = []
  toast.info('历史记录已清空')
}

onMounted(async () => {
  await dataStore.loadSampleData()
  history.value = getReportHistory()
})
</script>

<style scoped>
.rpt-card { cursor: pointer; transition: all 0.25s; }
.rpt-card:hover { transform: translateY(-3px); border-color: var(--c-border-2); }
.rpt-card.selected { border-color: rgba(16, 185, 129, 0.55); background: rgba(16, 185, 129, 0.06); box-shadow: 0 0 24px rgba(16, 185, 129, 0.1); }
.rpt-card.dim { opacity: 0.42; }
.report-preview {
  height: 560px; overflow: auto; background: #ffffff; color: #1e293b;
  border-radius: 8px; padding: 24px 30px; font-size: 12px; line-height: 1.8;
}
</style>
