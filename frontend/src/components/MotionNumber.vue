<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { fmt } from '@/utils/format'

const props = withDefaults(defineProps<{
  value: number
  digits?: number
  reducedMotion?: boolean
}>(), { digits: 2, reducedMotion: false })

const displayedValue = ref(0)
let frame = 0

function updateValue(target: number) {
  cancelAnimationFrame(frame)
  if (props.reducedMotion || !Number.isFinite(target)) {
    displayedValue.value = target
    return
  }

  const start = displayedValue.value
  const startedAt = performance.now()
  const duration = 520

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    displayedValue.value = start + (target - start) * eased
    if (progress < 1) frame = requestAnimationFrame(step)
    else displayedValue.value = target
  }

  frame = requestAnimationFrame(step)
}

watch([() => props.value, () => props.reducedMotion], ([value]) => updateValue(value), { immediate: true })
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <span :aria-label="fmt(value, digits)">{{ fmt(displayedValue, digits) }}</span>
</template>
