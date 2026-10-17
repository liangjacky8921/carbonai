<template>
  <div class="max-w-[1800px] mx-auto space-y-4 grid-page">
    <header class="grid-heading c-card p-4">
      <div><div class="grid-kicker">SPATIAL GRID / DEMONSTRATION</div><h2>网格化监测界面演示</h2><p>地图网格与统计图由浏览器随机生成，用于交互演示；不代表实测排放或真实预警。</p></div>
      <div class="grid-meta"><span>网格数据：随机演示</span><span>生成时间：{{ generatedAt || '未生成' }}</span><span>SSE 推送：{{ streamState }}</span></div>
    </header>
    <div class="grid-workspace">
      <!-- 地图 -->
      <div class="c-card grid-map-frame overflow-hidden relative">
        <div ref="mapEl" class="w-full h-full" />
        <div class="grid-map-label">{{ GRID_REGIONS[regionKey]?.name }} · {{ windowLabel() }}演示</div>
        <div v-if="mapError || basemapError" class="grid-map-alert" role="alert">{{ mapError || '底图加载异常；演示网格仍可查看。' }}</div>
        <div class="grid-legend"><strong>演示强度分级</strong><span><i class="legend-low" />低</span><span><i class="legend-mid" />中</span><span><i class="legend-high" />高</span><span><i class="legend-red" />超红色阈值</span></div>
      </div>
      <!-- 控制面板 -->
      <aside class="space-y-4 grid-sidebar" aria-label="区域与网格详情">
        <div class="c-card p-4 space-y-3">
          <div class="grid-panel-title">区域与演示条件</div>
          <div class="text-xs text-[var(--c-text-3)]">演示区域</div>
          <el-select v-model="regionKey" size="small" aria-label="演示区域" @change="refresh">
            <el-option v-for="(r, k) in GRID_REGIONS" :key="k" :label="r.name" :value="k" />
          </el-select>
          <div class="text-xs text-[var(--c-text-3)] mt-2">示意时间窗口</div>
          <el-radio-group v-model="timeWindow" size="small" aria-label="示意时间窗口" @change="refresh">
            <el-radio-button value="realtime">当前演示</el-radio-button>
            <el-radio-button value="1h">近1小时</el-radio-button>
            <el-radio-button value="24h">近24小时</el-radio-button>
            <el-radio-button value="7d">近7天</el-radio-button>
          </el-radio-group>
          <div class="text-xs text-[var(--c-text-3)] mt-3">演示阈值（无实测单位）</div>
          <div class="flex items-center gap-2">
            <el-input-number v-model="yellowThreshold" size="small" :min="1" :max="20" style="width: 100px" aria-label="黄色预警阈值" />
            <span class="text-[11px] text-amber">黄色预警</span>
          </div>
          <div class="flex items-center gap-2">
            <el-input-number v-model="redThreshold" size="small" :min="2" :max="40" style="width: 100px" aria-label="红色预警阈值" />
            <span class="text-[11px] text-red">红色预警</span>
          </div>
          <el-button type="primary" size="small" class="w-full" @click="refresh">重新生成演示网格</el-button>
          <p class="grid-note">更改区域、时间窗或阈值会重新生成随机演示数据，不保留历史结果。</p>
        </div>

        <div class="c-card p-4 space-y-2" aria-live="polite"><div class="grid-panel-title">选中网格</div><p v-if="!selectedCell" class="grid-note">点击或轻触地图网格查看演示值及位置。</p><template v-else><strong class="grid-cell-value">{{ selectedCell.value.toFixed(2) }}</strong><span class="grid-note">演示强度 · {{ selectedCell.level }}</span><span class="grid-note">{{ selectedCell.lat.toFixed(4) }}, {{ selectedCell.lon.toFixed(4) }}（输入经纬度）</span></template></div>

        <!-- 预警事件日志 -->
        <div class="c-card p-4">
          <div class="grid-panel-title mb-2">阈值事件</div>
          <p class="grid-note mb-2">演示事件与已配置的 SSE 实时推送分别标记。</p>
          <div class="space-y-2 max-h-[180px] overflow-auto">
            <div v-for="alert in alerts" :key="alert.id" class="alert-item" :class="alert.level">
              <b>{{ alert.source === 'realtime' ? 'SSE 实时推送' : '随机演示' }} · {{ alert.level === 'red' ? '红色阈值' : alert.level === 'yellow' ? '黄色阈值' : '正常' }}</b>
              <span class="text-[11px]">{{ alert.text }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="演示网格强度分布" height="280" sample source-note="浏览器随机生成 · 非实测">
        <div ref="histEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="演示网格阈值统计" height="280" sample source-note="浏览器随机生成 · 非实测">
        <div ref="statEl" class="w-full h-full" />
      </ChartCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import L from 'leaflet'
import * as echarts from 'echarts'
import { CHART_AXIS, CHART_TOOLTIP } from '@/utils/chartTheme'
import { useElementResize } from '@/composables/useElementResize'
import ChartCard from '@/components/ChartCard.vue'
import { GRID_REGIONS } from '@/data/carbonMarket'
import { useToast } from '@/composables/useToast'
import { MONITORING_CONFIG } from '@/utils/format'

const toast = useToast()
const mapEl = ref<HTMLElement | null>(null)
const histEl = ref<HTMLElement | null>(null)
const statEl = ref<HTMLElement | null>(null)
const regionKey = ref('sz_gm')
const timeWindow = ref('realtime')
const yellowThreshold = ref(6)
const redThreshold = ref(12)
const generatedAt = ref('')
const streamState = ref(MONITORING_CONFIG.realtime_enabled ? '连接中' : '未配置')
const basemapError = ref(false)
const mapError = ref('')
const selectedCell = ref<{ lat: number; lon: number; value: number; level: string } | null>(null)

let map: L.Map | null = null
let histChart: echarts.ECharts | null = null
let statChart: echarts.ECharts | null = null
let selectedRect: L.Rectangle | null = null
let streamTimer: ReturnType<typeof setTimeout> | null = null
// T11: SSE 实时流客户端
let sseClient: EventSource | null = null

interface Alert { id: number; level: 'red' | 'yellow' | 'normal'; text: string; source?: string }
const alerts = ref<Alert[]>([])

function initMap() {
  if (map || !mapEl.value) return
  try {
    const reg = GRID_REGIONS[regionKey.value]
    map = L.map(mapEl.value, { center: [reg.lat, reg.lon], zoom: reg.zoom })
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      subdomains: ['1', '2', '3', '4'], attribution: '© 高德地图 | CarbonAI', maxZoom: 18,
    }).on('tileerror', () => { basemapError.value = true }).on('tileload', () => { basemapError.value = false }).addTo(map)
    setTimeout(() => map?.invalidateSize(), 300)
  } catch { mapError.value = '地图初始化失败，请刷新页面重试。' }
}

let gridLayer: L.LayerGroup | null = null

function refresh() {
  initMap()
  if (!map) return
  const reg = GRID_REGIONS[regionKey.value]
  map.setView([reg.lat, reg.lon], reg.zoom)
  if (gridLayer) map.removeLayer(gridLayer)
  gridLayer = L.layerGroup().addTo(map)
  selectedCell.value = null
  selectedRect = null
  generatedAt.value = new Date().toLocaleString('zh-CN')

  const windowFactor = timeWindow.value === 'realtime' ? 1 : timeWindow.value === '1h' ? 2.5 : timeWindow.value === '24h' ? 8 : 20
  const span = 0.015, step = span / 10
  const values: number[] = []
  const yellowCells: [number, number][] = []
  const redCells: [number, number][] = []
  for (let lat = reg.lat - span; lat <= reg.lat + span; lat += step) {
    for (let lng = reg.lon - span; lng <= reg.lon + span; lng += step) {
      const val = Math.random() * 14 * windowFactor / 4
      values.push(val)
      const color = val > redThreshold.value ? '#ef4444' : val > yellowThreshold.value ? '#f97316' : val > yellowThreshold.value / 2 ? '#eab308' : '#22c55e'
      const cell: [number, number] = [lat, lng]
      if (val > redThreshold.value) redCells.push(cell)
      else if (val > yellowThreshold.value) yellowCells.push(cell)
      const rectangle = L.rectangle([[lat - step / 2, lng - step / 2], [lat + step / 2, lng + step / 2]], {
        color: 'transparent', fillColor: color, fillOpacity: val > redThreshold.value ? 0.6 : 0.4, weight: 0.5,
      }).on('click', () => {
        selectedRect?.setStyle({ color: 'transparent', weight: 0.5 })
        selectedRect = rectangle
        rectangle.setStyle({ color: '#f2d27a', weight: 2 })
        rectangle.bringToFront()
        selectedCell.value = { lat, lon: lng, value: val, level: val > redThreshold.value ? '红色阈值' : val > yellowThreshold.value ? '黄色阈值' : '正常范围' }
      }).addTo(gridLayer!)
    }
  }

  // 预警日志
  const newAlerts: Alert[] = [{ id: Date.now(), level: 'normal', source: 'demo', text: `${reg.name} · ${windowLabel()}演示网格已生成，共 ${values.length} 个网格` }]
  if (redCells.length) newAlerts.unshift({ id: Date.now() + 1, level: 'red', source: 'demo', text: `${reg.name} ${redCells.length} 个随机网格超过红色演示阈值 ${redThreshold.value}` })
  if (yellowCells.length) newAlerts.unshift({ id: Date.now() + 2, level: 'yellow', source: 'demo', text: `${reg.name} ${yellowCells.length} 个随机网格超过黄色演示阈值 ${yellowThreshold.value}` })
  alerts.value = [...newAlerts, ...alerts.value].slice(0, 30)

  renderCharts(values)
  toast.success(`${reg.name} 演示网格已重新生成（${windowLabel()}）`)
}

function windowLabel() {
  return { realtime: '当前', '1h': '近1小时', '24h': '近24小时', '7d': '近7天' }[timeWindow.value]
}

function renderCharts(values: number[]) {
  if (histEl.value && !histChart) histChart = echarts.init(histEl.value)
  if (statEl.value && !statChart) statChart = echarts.init(statEl.value)
  const tt = CHART_TOOLTIP
  const axis = CHART_AXIS
  const bins = [0, 2, 4, 6, 8, 10, 12, 14, 99]
  const counts = bins.slice(1).map((b, i) => values.filter((v) => v > bins[i] && v <= b).length)
  histChart?.setOption({
    tooltip: { trigger: 'axis', ...tt },
    grid: { left: '3%', right: '5%', bottom: '12%', top: '14%', containLabel: true },
    xAxis: { type: 'category', data: ['0-2', '2-4', '4-6', '6-8', '8-10', '10-12', '12-14', '>14'], name: '演示强度', nameTextStyle: { color: '#5f7a6f' }, ...axis },
    yAxis: { type: 'value', name: '网格数', nameTextStyle: { color: '#5f7a6f' }, ...axis },
    series: [{ type: 'bar', data: counts, itemStyle: { borderRadius: [4, 4, 0, 0], color: '#f59e0b' }, animationDelay: (i: number) => i * 60 }],
  }, true)
  statChart?.setOption({
    tooltip: { trigger: 'item', ...tt },
    series: [{
      type: 'pie', radius: ['42%', '68%'],
      itemStyle: { borderColor: '#0a120f', borderWidth: 2, borderRadius: 6 },
      label: { color: '#9db8ae' },
      data: [
        { name: '正常网格', value: values.filter((v) => v <= yellowThreshold.value).length, itemStyle: { color: '#22c55e' } },
        { name: '黄色预警', value: values.filter((v) => v > yellowThreshold.value && v <= redThreshold.value).length, itemStyle: { color: '#eab308' } },
        { name: '红色预警', value: values.filter((v) => v > redThreshold.value).length, itemStyle: { color: '#ef4444' } },
      ],
      animationType: 'scale', animationEasing: 'elasticOut',
    }],
  }, true)
}

function resize() { map?.invalidateSize(); histChart?.resize(); statChart?.resize() }
useElementResize([mapEl, histEl, statEl], resize)

// T11: 接 SSE 实时流 → 超 CONFIG 阈值触发预警联动
function initRealtimeStream() {
  // 未启用实时流（生产环境未配置 VITE_MONITORING_SSE_URL）→ 不发起连接
  if (!MONITORING_CONFIG.realtime_enabled) return
  const { sse_url, critical_threshold, warning_threshold } = MONITORING_CONFIG
  try {
    sseClient = new EventSource(sse_url)
  } catch { streamState.value = '连接失败'; return }

  // 冷却窗口：同一点位 5 分钟内不重复追加同级别预警
  const lastAlertAt = new Map<string, number>()

  sseClient.onmessage = (ev) => {
    try {
      const p = JSON.parse(ev.data)
      if (p.type === 'connected' || !p.co2e_rate) return

      const rate = p.co2e_rate
      const pid = p.point_id
      const now = Date.now()

      // 用 CONFIG 阈值判定（kg/h 绝对值，不影响网格密度阈值体系）
      let level: Alert['level'] | null = null
      let coolMs = 0
      if (rate >= critical_threshold) { level = 'red'; coolMs = MONITORING_CONFIG.critical_cooldown_ms }
      else if (rate >= warning_threshold) { level = 'yellow'; coolMs = MONITORING_CONFIG.warning_cooldown_ms }

      if (level) {
        const last = lastAlertAt.get(pid + level) || 0
        if (now - last > coolMs) {
          lastAlertAt.set(pid + level, now)
          const newAlert: Alert = {
            id: now + Math.random(),
            level,
            source: 'realtime',
            text: `SSE 推送 ${pid}：${rate} kg/h 超过 ${level === 'red' ? 'critical' : 'warning'} 阈值（${level === 'red' ? critical_threshold : warning_threshold} kg/h）· ${p.timestamp}`,
          }
          alerts.value.unshift(newAlert)
          alerts.value = alerts.value.slice(0, 50)
          toast.warning(`${level === 'red' ? '红色' : '黄色'} SSE 预警：${pid} 排放速率 ${rate} kg/h`)
        }
      }
    } catch { /* 坏包跳过 */ }
  }

  // 断线有限重连：连续失败 max_retries 次后关闭连接，防止服务不存在时无限重试刷屏
  let rtFailures = 0
  sseClient.onopen = () => { rtFailures = 0; streamState.value = '已连接' }
  sseClient.onerror = () => {
    rtFailures++
    streamState.value = '连接异常'
    if (rtFailures >= MONITORING_CONFIG.max_retries) { sseClient?.close(); sseClient = null; streamState.value = '已断开' }
  }
}

onMounted(() => {
  initMap()
  refresh()
  streamTimer = setTimeout(initRealtimeStream, 800)  // T11: 延迟启动 SSE，避免阻塞初始渲染
})
onBeforeUnmount(() => {
  if (streamTimer) clearTimeout(streamTimer)
  sseClient?.close()  // T11: 清理 SSE 连接
  map?.remove(); histChart?.dispose(); statChart?.dispose()
})
</script>

<style scoped>
.grid-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.grid-kicker { color: var(--c-green); font-size: 10px; letter-spacing: .12em; }
.grid-heading h2 { color: var(--c-text); font-size: 19px; font-weight: 700; margin: 2px 0 5px; }
.grid-heading p, .grid-note { color: var(--c-text-2); font-size: 11px; line-height: 1.6; }
.grid-meta { display: flex; justify-content: end; flex-wrap: wrap; gap: 6px; }
.grid-meta span { padding: 5px 8px; border: 1px solid var(--c-border); border-radius: 5px; background: var(--c-surface-2); color: var(--c-text-2); font-size: 11px; }
.grid-workspace { display: grid; grid-template-columns: minmax(0, 2.2fr) minmax(280px, .85fr); gap: 16px; align-items: start; }
.grid-map-frame { height: clamp(540px, calc(100vh - 210px), 800px); min-width: 0; background: #081712; }
.grid-sidebar { min-width: 0; max-height: 800px; overflow-y: auto; }
.grid-map-label { position: absolute; z-index: 500; top: 12px; left: 50px; max-width: calc(100% - 64px); padding: 7px 10px; border: 1px solid var(--c-border-2); border-radius: 6px; background: rgba(8,20,16,.92); color: var(--c-text); font-size: 11px; pointer-events: none; }
.grid-map-alert { position: absolute; z-index: 1001; left: 12px; bottom: 12px; max-width: min(360px, calc(100% - 24px)); padding: 10px 12px; border: 1px solid #b0783d; border-radius: 6px; background: #241c12; color: #ffdaad; font-size: 12px; }
.grid-legend { position: absolute; z-index: 500; right: 12px; bottom: 20px; display: grid; gap: 3px; padding: 9px 11px; border: 1px solid var(--c-border-2); border-radius: 7px; background: rgba(8,20,16,.92); color: var(--c-text-2); font-size: 10px; pointer-events: none; }
.grid-legend strong { color: var(--c-text); font-size: 11px; }
.grid-legend span { display: flex; align-items: center; gap: 6px; }
.grid-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; }
.legend-low { background: #22c55e; }.legend-mid { background: #eab308; }.legend-high { background: #f97316; }.legend-red { background: #ef4444; }
.grid-panel-title { color: var(--c-text); font-size: 13px; font-weight: 700; }
.grid-cell-value { display: block; color: var(--c-green); font-size: 25px; font-variant-numeric: tabular-nums; }
.alert-item {
  padding: 8px 10px; border-radius: 8px; font-size: 12px; line-height: 1.6;
  background: rgba(34, 197, 94, 0.06); border-left: 3px solid #22c55e;
}
.alert-item.yellow { background: rgba(245, 158, 11, 0.08); border-left-color: #f59e0b; }
.alert-item.red { background: rgba(239, 68, 68, 0.08); border-left-color: #ef4444; }
@media (max-width: 900px) { .grid-heading { align-items: start; flex-direction: column; }.grid-meta { justify-content: start; }.grid-workspace { grid-template-columns: minmax(0, 1fr); }.grid-map-frame { height: min(62vh, 620px); min-height: 380px; }.grid-sidebar { max-height: none; overflow: visible; } }
@media (max-width: 480px) { .grid-map-frame { height: 430px; }.grid-map-label { left: 12px; top: 60px; }.grid-legend { right: 8px; bottom: 28px; padding: 6px 8px; } }
</style>
