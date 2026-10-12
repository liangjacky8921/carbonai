<template>
  <div class="state-panel h-full">
    <div class="state-panel__icon">
      <el-icon :size="28"><component :is="iconComp" /></el-icon>
    </div>
    <p class="state-panel__title">{{ title }}</p>
    <p v-if="description" class="state-panel__description">{{ description }}</p>
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
