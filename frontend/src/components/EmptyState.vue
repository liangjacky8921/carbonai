<template>
  <div class="h-full flex flex-col items-center justify-center gap-3 py-10 text-center">
    <div class="w-16 h-16 rounded-2xl flex items-center justify-center"
      style="background: var(--c-green-soft); border: 1px solid rgba(16,185,129,0.3); animation: pulseGlow 2.4s infinite">
      <el-icon :size="28" color="#10b981"><component :is="iconComp" /></el-icon>
    </div>
    <p class="text-sm text-[var(--c-text)] font-medium">{{ title }}</p>
    <p class="text-xs text-[var(--c-text-3)] max-w-sm leading-6">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import * as Icons from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  icon?: string
  title?: string
  description?: string
}>(), { icon: 'DataLine', title: '暂无数据', description: '' })

const iconComp = computed<Component>(() => (Icons as Record<string, Component>)[props.icon] || Icons.DataLine)
</script>
