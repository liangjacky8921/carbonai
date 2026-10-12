import * as echarts from 'echarts'
import { onMounted, onBeforeUnmount, ref, type Ref, nextTick } from 'vue'
import { CHART_AXIS, CHART_TOOLTIP } from '@/utils/chartTheme'
import { useElementResize } from '@/composables/useElementResize'

/** ECharts 生命周期封装：初始化 / 自适应 / 主题 / 卸载销毁 */
export function useEChart(
  elRef: Ref<HTMLElement | null>,
  optionGetter: () => echarts.EChartsOption | null,
) {
  let chart: echarts.ECharts | null = null
  const loading = ref(true)

  function render() {
    if (!elRef.value) return
    if (!chart) chart = echarts.init(elRef.value, undefined, { renderer: 'canvas' })
    const opt = optionGetter()
    if (opt) {
      chart.setOption(opt as echarts.EChartsOption, true)
      loading.value = false
    }
  }

  const darkTooltip = CHART_TOOLTIP
  const axisStyle = CHART_AXIS

  function resize() { chart?.resize() }
  useElementResize([elRef], resize)

  onMounted(async () => {
    await nextTick()
    render()
  })
  onBeforeUnmount(() => {
    chart?.dispose()
    chart = null
  })

  return { chart: () => chart, render, resize, loading, darkTooltip, axisStyle }
}
