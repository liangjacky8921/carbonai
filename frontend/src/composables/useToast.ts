import { ref } from 'vue'

export interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

let seed = 0
const toasts = ref<ToastItem[]>([])

export function useToast() {
  function show(message: string, type: ToastItem['type'] = 'success', duration = 2600) {
    const id = ++seed
    toasts.value.push({ id, type, message })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, duration)
  }
  return {
    toasts,
    success: (m: string) => show(m, 'success'),
    error: (m: string) => show(m, 'error'),
    info: (m: string) => show(m, 'info'),
    warning: (m: string) => show(m, 'warning'),
  }
}
