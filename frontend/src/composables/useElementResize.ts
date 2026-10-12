import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

/** 监听实际容器尺寸，避免只依赖 window.resize 导致侧栏和网格变化后图表裁切。 */
export function useElementResize(
  targets: Ref<HTMLElement | null>[],
  callback: () => void,
) {
  let observer: ResizeObserver | null = null
  let frame = 0

  function schedule() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(callback)
  }

  const stops = targets.map((target) => watch(target, (element, previous) => {
    if (previous) observer?.unobserve(previous)
    if (element) observer?.observe(element)
  }, { flush: 'post' }))

  onMounted(async () => {
    await nextTick()
    observer = new ResizeObserver(schedule)
    targets.forEach((target) => {
      if (target.value) observer?.observe(target.value)
    })
  })

  onBeforeUnmount(() => {
    stops.forEach((stop) => stop())
    cancelAnimationFrame(frame)
    observer?.disconnect()
    observer = null
  })
}
