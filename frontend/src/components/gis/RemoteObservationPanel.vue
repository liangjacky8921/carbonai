<script setup lang="ts">
import { computed } from 'vue'
import type { RemoteObservation } from '@/api/carbonMapper'

type QueryStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'disabled' | 'error'

const props = defineProps<{
  enabled: boolean
  gas: 'CH4' | 'CO2'
  fromDate: string
  toDate: string
  status: QueryStatus
  items: RemoteObservation[]
  count: number
  fetchedAt: string | null
  selected: RemoteObservation | null
  detailLoading: boolean
  message: string
}>()
const emit = defineEmits<{
  toggle: [enabled: boolean]
  gas: [gas: 'CH4' | 'CO2']
  fromDate: [value: string]
  toDate: [value: string]
  query: []
  select: [id: string]
}>()

const statusText = computed(() => {
  if (!props.enabled) return '图层已关闭'
  if (props.status === 'loading') return '正在查询当前地图区域…'
  if (props.status === 'empty') return '暂无数据；该区域和时间内未返回公开观测。'
  if (props.status === 'disabled') return '服务未启用；请由管理员配置后端开关与凭据。'
  if (props.status === 'error') return props.message || '观测请求失败，请稍后重试。'
  if (props.status === 'ready') return `当前地图区域显示 ${props.count} 条观测（最多 100 条）`
  return '设置筛选条件后查询当前地图区域。'
})

function formatTime(value: string | null) {
  if (!value) return '未提供'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}
</script>

<template>
  <section class="observation-panel c-card p-4" aria-label="温室气体遥感观测">
    <div class="panel-header">
      <div><h3>温室气体遥感观测</h3><p>Carbon Mapper · 离散羽流观测</p></div>
      <label class="panel-switch"><input type="checkbox" :checked="enabled" @change="emit('toggle', ($event.target as HTMLInputElement).checked)" /><span>显示图层</span></label>
    </div>
    <template v-if="enabled">
      <div class="panel-filters">
        <label>气体
          <select :value="gas" @change="emit('gas', ($event.target as HTMLSelectElement).value as 'CH4' | 'CO2')">
            <option value="CH4">CH₄ 甲烷</option><option value="CO2">CO₂ 二氧化碳</option>
          </select>
        </label>
        <label>观测日期起
          <input type="date" :value="fromDate" :max="toDate || undefined" @change="emit('fromDate', ($event.target as HTMLInputElement).value)" />
        </label>
        <label>观测日期止
          <input type="date" :value="toDate" :min="fromDate || undefined" @change="emit('toDate', ($event.target as HTMLInputElement).value)" />
        </label>
      </div>
      <button class="query-button" type="button" :disabled="status === 'loading' || (!!fromDate && !!toDate && fromDate > toDate)" @click="emit('query')">查询当前地图区域</button>
    </template>
    <p class="panel-status" :role="status === 'error' ? 'alert' : 'status'" aria-live="polite">{{ statusText }}</p>
    <label v-if="enabled && items.length" class="result-select">查看观测记录
      <select :value="selected?.id || ''" @change="emit('select', ($event.target as HTMLSelectElement).value)">
        <option value="">请选择</option>
        <option v-for="item in items" :key="item.id" :value="item.id">{{ item.gas }} · {{ formatTime(item.observedAt) }} · {{ item.id }}</option>
      </select>
    </label>
    <p v-if="enabled && fetchedAt" class="panel-note">获取时间：{{ formatTime(fetchedAt) }} · 不缓存</p>
    <div v-if="enabled && selected" class="detail" aria-live="polite">
      <strong>{{ selected.gas === 'CH4' ? 'CH₄ 甲烷' : 'CO₂ 二氧化碳' }} · {{ selected.id }}</strong>
      <span>排放率：{{ selected.emissionRateKgPerHour == null ? '暂无数据' : `${selected.emissionRateKgPerHour.toLocaleString()} kg/h` }}</span>
      <span>不确定性：{{ selected.emissionUncertaintyKgPerHour == null ? '未提供' : `±${selected.emissionUncertaintyKgPerHour.toLocaleString()} kg/h` }}</span>
      <span>观测时间：{{ formatTime(selected.observedAt) }}</span>
      <span>发布时间：{{ formatTime(selected.publishedAt) }}</span>
      <span>仪器：{{ selected.instrument || '未提供' }} · 质量：{{ selected.quality || '未知（不可视为合格）' }}</span>
      <span>官方坐标：{{ selected.latitude.toFixed(5) }}°N, {{ selected.longitude.toFixed(5) }}°E (WGS84)</span>
      <a :href="selected.source.url" target="_blank" rel="noopener noreferrer">来源：Carbon Mapper ↗</a>
      <small v-if="detailLoading">正在读取观测详情…</small>
      <small v-else-if="message">{{ message }}</small>
    </div>
    <p class="panel-note">观测点不代表企业归属、连续实时监测或年度排放量；数值为单次羽流排放率。仅授权账户可查询。查看 <router-link to="/data-use/carbon-mapper">来源、学术引用与非商业使用条件</router-link>。</p>
  </section>
</template>

<style scoped>
.observation-panel { display: grid; gap: 12px; color: var(--c-text-2); }
.panel-header { display: flex; align-items: start; justify-content: space-between; gap: 10px; }
.panel-header h3 { margin: 0; color: var(--c-text); font-size: 13px; font-weight: 700; }
.panel-header p { margin: 3px 0 0; font-size: 11px; }
.panel-switch { display: flex; align-items: center; gap: 6px; white-space: nowrap; font-size: 11px; cursor: pointer; }
.panel-switch input { accent-color: #10b981; width: 17px; height: 17px; }
.panel-filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.panel-filters label { display: grid; gap: 5px; font-size: 11px; }
.result-select { display: grid; gap: 5px; font-size: 11px; }
.panel-filters label:first-child { grid-column: 1 / -1; }
.panel-filters select, .panel-filters input { min-width: 0; width: 100%; min-height: 36px; padding: 6px 8px; border: 1px solid var(--c-border-2); border-radius: 6px; background: var(--c-surface-2); color: var(--c-text); color-scheme: dark; }
.result-select select { width: 100%; min-width: 0; min-height: 36px; padding: 6px 8px; border: 1px solid var(--c-border-2); border-radius: 6px; background: var(--c-surface-2); color: var(--c-text); }
.query-button { min-height: 38px; border: 1px solid #137c60; border-radius: 6px; background: #103d30; color: #d7f5e6; font-size: 12px; font-weight: 600; }
.query-button:hover:not(:disabled) { background: #16503e; }
.query-button:disabled { cursor: wait; opacity: .6; }
.panel-switch input:focus-visible, .panel-filters :is(select, input):focus-visible, .result-select select:focus-visible, .query-button:focus-visible, .detail a:focus-visible { outline: 2px solid #a8e8cb; outline-offset: 2px; }
.panel-status { margin: 0; border: 1px dashed var(--c-border-2); border-radius: 6px; padding: 9px 10px; font-size: 11px; line-height: 1.5; }
.panel-note { margin: 0; color: var(--c-text-3); font-size: 10px; line-height: 1.6; }
.panel-note a, .detail a { color: #8fdbb9; text-decoration: underline; }
.detail { display: grid; gap: 5px; border-left: 2px solid #10b981; background: var(--c-surface-2); padding: 10px; font-size: 11px; overflow-wrap: anywhere; }
.detail strong { color: var(--c-text); font-size: 12px; }
.detail small { color: var(--c-text-3); }
@media (max-width: 420px) { .panel-header { flex-wrap: wrap; } }
</style>
