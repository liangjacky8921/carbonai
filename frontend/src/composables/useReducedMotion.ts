import { onBeforeUnmount, onMounted, readonly, shallowRef } from 'vue'

export function useReducedMotion() {
  const reducedMotion = shallowRef(false)
  let mediaQuery: MediaQueryList | undefined

  const syncPreference = (event: MediaQueryListEvent | MediaQueryList) => {
    reducedMotion.value = event.matches
  }

  onMounted(() => {
    mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    syncPreference(mediaQuery)
    mediaQuery.addEventListener('change', syncPreference)
  })

  onBeforeUnmount(() => mediaQuery?.removeEventListener('change', syncPreference))

  return readonly(reducedMotion)
}
