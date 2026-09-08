import * as echarts from 'echarts'
import { onMounted, onBeforeUnmount, ref, type Ref, watch, nextTick } from 'vue'

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

  const darkTooltip = {
    backgroundColor: 'rgba(13,23,20,0.92)',
    borderColor: '#24413a',
    textStyle: { color: '#e8f5ef', fontSize: 12 },
  }
  const axisStyle = {
    axisLine: { lineStyle: { color: '#1e3329' } },
    axisLabel: { color: '#9db8ae' },
    splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } },
  }

  function resize() { chart?.resize() }

  onMounted(async () => {
    await nextTick()
    render()
    window.addEventListener('resize', resize)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    chart?.dispose()
    chart = null
  })

  return { chart: () => chart, render, resize, loading, darkTooltip, axisStyle }
}
