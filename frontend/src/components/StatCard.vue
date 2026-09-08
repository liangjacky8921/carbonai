<template>
  <div class="stat-box">
    <div class="num" :class="color">{{ value }}</div>
    <div class="lbl">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ value: string | number; label: string; color?: string }>()
</script>
