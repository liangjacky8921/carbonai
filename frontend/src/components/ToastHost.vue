<template>
  <transition-group name="toast" tag="div" class="toast-host" aria-live="polite" aria-atomic="true">
    <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.type" :role="t.type === 'error' ? 'alert' : 'status'">
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
  background: rgba(13, 23, 20, 0.96); backdrop-filter: blur(10px);
  border: 1px solid var(--c-border-2); color: var(--c-text);
  box-shadow: var(--shadow-overlay);
  animation: toastIn 0.3s var(--ease-apple);
}
.toast-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.toast-item.success { border-color: rgba(16, 185, 129, 0.5); }
.toast-item.success .toast-dot { background: var(--c-success); box-shadow: 0 0 8px var(--c-success); }
.toast-item.error { border-color: rgba(239, 68, 68, 0.5); }
.toast-item.error .toast-dot { background: var(--c-danger); box-shadow: 0 0 8px var(--c-danger); }
.toast-item.warning { border-color: rgba(245, 158, 11, 0.5); }
.toast-item.warning .toast-dot { background: var(--c-warning); box-shadow: 0 0 8px var(--c-warning); }
.toast-item.info { border-color: rgba(14, 165, 233, 0.5); }
.toast-item.info .toast-dot { background: var(--c-info); box-shadow: 0 0 8px var(--c-info); }
.toast-enter-from { opacity: 0; transform: translateY(-12px); }
.toast-leave-to { opacity: 0; transform: translateY(-8px); }
@keyframes toastIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }
@media (max-width: 640px) {
  .toast-host { top: max(12px, env(safe-area-inset-top)); width: calc(100vw - 24px); }
  .toast-item { width: 100%; padding: 10px 12px; }
}
</style>
