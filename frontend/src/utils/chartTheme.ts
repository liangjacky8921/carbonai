/** CarbonAI ECharts 共享视觉配置。业务页面可在展开后覆盖局部字号或单位。 */
export const CHART_COLORS = {
  green: '#10b981',
  blue: '#0ea5e9',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  teal: '#14b8a6',
} as const

export const CHART_TOOLTIP = {
  backgroundColor: 'rgba(13, 23, 20, 0.96)',
  borderColor: '#2f5146',
  borderWidth: 1,
  padding: [8, 10],
  textStyle: {
    color: '#e8f5ef',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Consolas', monospace",
  },
  extraCssText: 'border-radius: 8px; box-shadow: 0 10px 28px rgba(0, 0, 0, 0.38);',
} as const

export function createChartAxisStyle(fontSize = 11) {
  return {
    axisLine: { lineStyle: { color: '#2a453b' } },
    axisTick: { lineStyle: { color: '#2a453b' } },
    axisLabel: { color: '#9db8ae', fontSize },
    splitLine: { lineStyle: { color: 'rgba(47, 81, 70, 0.5)' } },
  }
}

export const CHART_AXIS = createChartAxisStyle()

export const CHART_LEGEND = {
  textStyle: { color: '#9db8ae', fontSize: 11 },
} as const
