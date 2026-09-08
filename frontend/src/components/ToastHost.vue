<template>
  <transition-group name="toast" tag="div" class="toast-host">
    <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.type">
      <span class="toast-dot" />
      <span>{{ t.message }}</span>
    </div>
  </transition-group>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
const { toasts } = useToast()
</script>

<style scoped>
.toast-host {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  z-index: 9999; display: flex; flex-direction: column; gap: 10px; align-items: center;
  pointer-events: none;
}
.toast-item {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 500;
  background: rgba(13, 23, 20, 0.92); backdrop-filter: blur(10px);
  border: 1px solid var(--c-border-2); color: var(--c-text);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
  animation: toastIn 0.3s ease;
}
.toast-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.toast-item.success { border-color: rgba(16, 185, 129, 0.5); }
.toast-item.success .toast-dot { background: var(--c-green); box-shadow: 0 0 8px var(--c-green); }
.toast-item.error { border-color: rgba(239, 68, 68, 0.5); }
.toast-item.error .toast-dot { background: var(--c-red); box-shadow: 0 0 8px var(--c-red); }
.toast-item.warning { border-color: rgba(245, 158, 11, 0.5); }
.toast-item.warning .toast-dot { background: var(--c-amber); box-shadow: 0 0 8px var(--c-amber); }
.toast-item.info { border-color: rgba(14, 165, 233, 0.5); }
.toast-item.info .toast-dot { background: var(--c-blue); box-shadow: 0 0 8px var(--c-blue); }
.toast-enter-from { opacity: 0; transform: translateY(-12px); }
.toast-leave-to { opacity: 0; transform: translateY(-8px); }
@keyframes toastIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }
</style>
