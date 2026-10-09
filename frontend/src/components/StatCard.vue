<template>
  <div class="stat-box">
    <div class="num" :class="color">{{ displayValue }}</div>
    <div class="lbl">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{ value: string | number; label: string; color?: string }>()

const displayValue = ref<string | number>(props.value)
let rafId: number | null = null

function animateTo(to: number, from: number = 0) {
  if (rafId) cancelAnimationFrame(rafId)
  const duration = 600
  const start = performance.now()
  const tick = (now: number) => {
    const t = Math.min((now - start) / duration, 1)
    // easeOutCubic — 与 --ease-apple 同族，Apple 风格减速曲线
    const eased = 1 - Math.pow(1 - t, 3)
    const cur = from + (to - from) * eased
    displayValue.value = Number.isInteger(to) ? Math.round(cur) : cur.toFixed(1)
    if (t < 1) rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

watch(() => props.value, (newVal, oldVal) => {
  if (typeof newVal === 'number' && typeof oldVal === 'number') {
    animateTo(newVal, oldVal)
  } else {
    displayValue.value = newVal
  }
})

onMounted(() => {
  if (typeof props.value === 'number') {
    animateTo(props.value)
  }
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>
