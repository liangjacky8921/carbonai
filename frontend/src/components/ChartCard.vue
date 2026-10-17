<template>
  <div class="c-card flex flex-col" :style="{ height: cssHeight }" :aria-busy="loading">
    <div v-if="title || sample || userTag || $slots.extra" class="c-card-title">
      <span>{{ title }}</span>
      <slot name="extra" />
      <span v-if="sample" class="sample-badge ml-auto">示例数据</span>
      <span v-else-if="userTag" class="user-badge ml-auto">用户数据</span>
    </div>
    <div v-if="sourceNote || updatedAt" class="chart-source-meta">
      <span v-if="sourceNote">来源：{{ sourceNote }}</span>
      <span>更新时间：{{ updatedAt || '未提供' }}</span>
    </div>
    <div class="flex-1 min-h-0 relative">
      <div v-if="loading" class="absolute inset-0 z-10 space-y-3 p-4" role="status" aria-live="polite">
        <span class="sr-only">图表加载中…</span>
        <div class="skeleton h-5 w-2/5" />
        <div class="skeleton" style="height: calc(100% - 60px)" />
      </div>
      <div v-else-if="error" class="h-full flex items-center justify-center" role="alert">
        <div class="state-panel h-full">
          <el-icon :size="36" class="mb-2 opacity-60"><WarningFilled /></el-icon>
          <p class="state-panel__description">{{ error }}</p>
        </div>
      </div>
      <div v-else-if="empty" class="h-full flex items-center justify-center" role="status">
        <slot name="empty">
          <div class="state-panel h-full">
            <el-icon :size="42" class="mb-2 opacity-40"><DataLine /></el-icon>
            <p class="state-panel__description">{{ emptyText }}</p>
          </div>
        </slot>
      </div>
      <slot v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DataLine, WarningFilled } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  title?: string
  height?: number | string
  loading?: boolean
  error?: string
  empty?: boolean
  emptyText?: string
  sample?: boolean
  userTag?: boolean
  sourceNote?: string
  updatedAt?: string | null
}>(), { height: 300, loading: false, empty: false, emptyText: '暂无数据，请上传数据或加载示例数据' })

const cssHeight = computed(() => {
  const h = props.height
  if (typeof h === 'number') return h + 'px'
  return /^\d+$/.test(h) ? h + 'px' : h
})
</script>

<style scoped>
.chart-source-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  padding: 4px 16px 0;
  color: var(--c-text-2);
  font-size: var(--text-caption);
  line-height: var(--leading-body);
}
@media (max-width: 640px) {
  .chart-source-meta { padding-inline: 12px; }
}
</style>
