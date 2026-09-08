<template>
  <div class="c-card flex flex-col" :style="{ height: cssHeight }">
    <div v-if="title || sample" class="c-card-title">
      <span>{{ title }}</span>
      <slot name="extra" />
      <span v-if="sample" class="sample-badge ml-auto">示例数据</span>
      <span v-else-if="userTag" class="user-badge ml-auto">用户数据</span>
    </div>
    <div class="flex-1 min-h-0 relative">
      <div v-if="loading" class="absolute inset-0 z-10 space-y-3 p-4">
        <div class="skeleton h-5 w-2/5" />
        <div class="skeleton" style="height: calc(100% - 60px)" />
      </div>
      <div v-else-if="empty" class="h-full flex items-center justify-center">
        <slot name="empty">
          <div class="text-center text-[var(--c-text-3)]">
            <el-icon :size="42" class="mb-2 opacity-40"><DataLine /></el-icon>
            <p class="text-xs">{{ emptyText }}</p>
          </div>
        </slot>
      </div>
      <slot v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DataLine } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  title?: string
  height?: number | string
  loading?: boolean
  empty?: boolean
  emptyText?: string
  sample?: boolean
  userTag?: boolean
}>(), { height: 300, loading: false, empty: false, emptyText: '暂无数据 — 请上传数据或加载示例数据' })

const cssHeight = computed(() => {
  const h = props.height
  if (typeof h === 'number') return h + 'px'
  return /^\d+$/.test(h) ? h + 'px' : h
})
</script>
