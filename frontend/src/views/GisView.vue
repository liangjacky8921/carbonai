<template>
  <div class="gis-page space-y-4">
    <header class="gis-heading">
      <div><p class="gis-kicker">SPATIAL INTELLIGENCE / GIS</p><h2>GIS 空间分析</h2><p>在地图中查看边界、排放点位与大湾区城市示例；地图不代表实时监测。</p></div>
      <div class="gis-meta" aria-label="地图元信息"><span>坐标输入：经纬度</span><span>底图：高德地图</span><span>数据时间：{{ mode === 'forest' && gisResult ? '2022–2026 年示意估算' : '未提供' }}</span></div>
    </header>
    <!-- 模式切换 -->
    <div class="flex flex-wrap items-center gap-2">
      <el-radio-group v-model="mode" size="small" aria-label="GIS 分析模式">
        <el-radio-button value="forest">林地碳汇</el-radio-button>
        <el-radio-button value="heatmap">碳源热力图</el-radio-button>
        <el-radio-button value="gba">GBA 看板</el-radio-button>
      </el-radio-group>
      <span :class="mode === 'forest' ? badgeCls('boundary') : badgeCls('points')" v-if="mode !== 'gba'">
        {{ mode === 'forest' ? (dataStore.source.boundary === 'user' ? '用户数据' : '示例数据') : (dataStore.source.points === 'user' ? '用户数据' : '示例数据') }}
      </span>
    </div>

    <div class="gis-workspace">
      <!-- 地图 -->
      <div class="c-card gis-map-frame overflow-hidden relative">
        <div ref="mapEl" class="w-full h-full" />
        <div class="gis-map-label">{{ mode === 'forest' ? '林地边界' : mode === 'heatmap' ? '排放点位' : '大湾区城市示例' }} · {{ mode === 'gba' ? '内置示例' : mode === 'forest' ? (dataStore.source.boundary === 'user' ? '用户上传' : '内置示例') : (dataStore.source.points === 'user' ? '用户上传' : '内置示例') }}</div>
        <div v-if="basemapError || mapError" class="gis-map-alert" role="alert">{{ mapError || '底图加载异常；已加载的边界和点位仍可查看。' }}</div>
        <!-- 图例 -->
        <div class="map-legend" v-if="mode === 'heatmap'">
          <div class="text-[11px] font-semibold mb-1">排放强度</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#22c55e" />低</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#eab308" />中</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#f97316" />高</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#ef4444" />极高</div>
        </div>
        <div class="map-legend" v-else-if="mode === 'forest'">
          <div class="text-[11px] font-semibold mb-1">NDVI 参考分级 · 非地图图层</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#a16207" />&lt;0.1 裸地</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#eab308" />0.1-0.3 稀疏</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#84cc16" />0.3-0.6 中等</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#10b981" />&gt;0.6 茂密</div>
        </div>
        <div class="map-legend gba-legend" v-else-if="mode === 'gba'" aria-label="大湾区城市分级图例">
          <div class="gba-legend-title">城市分级 · 内置示例</div>
          <div class="gba-legend-levels">
            <div><span class="gba-legend-circle gba-legend-circle--red" />红 · 大</div>
            <div><span class="gba-legend-circle gba-legend-circle--yellow" />黄 · 中</div>
            <div><span class="gba-legend-circle gba-legend-circle--green" />绿 · 小</div>
          </div>
          <p class="gba-legend-note">圆圈大小表示分级，不代表实际排放量或污染扩散半径。</p>
        </div>
      </div>

      <!-- 控制面板 -->
      <aside class="gis-sidebar space-y-4" aria-label="地图控制与信息">
        <div class="c-card p-4 space-y-3">
          <div class="gis-panel-title">图层与来源</div>
          <div class="gis-layer-row"><span>高德底图</span><span>已启用</span></div>
          <div class="gis-layer-row"><span>{{ mode === 'forest' ? '林地边界' : mode === 'heatmap' ? '排放热力与点位' : '城市点位' }}</span><span>{{ mode === 'forest' ? (gisResult ? '已显示' : '暂无边界') : mode === 'heatmap' ? (dataStore.points.length ? `${dataStore.points.length} 个点位` : '暂无点位') : '内置示例' }}</span></div>
          <p class="gis-note">点位输入为经纬度；高德底图采用其自身坐标体系，跨来源叠加可能有位置偏差。用户上传不代表已核实监测数据。更新时间未提供。</p>
        </div>
        <div class="c-card p-4 space-y-2" aria-live="polite">
          <div class="gis-panel-title">SSE 示例点位 · {{ streamState }}</div>
          <p class="gis-note">{{ streamSource }} · 固定示例坐标；传输连接不等于设备认证。</p>
          <p class="gis-note">最后接收：{{ lastReceivedAt || '暂无数据' }}{{ streamState !== '已连接' && lastReceivedAt ? '（保留旧值，非持续更新）' : '' }}</p>
        </div>
        <!-- 林地碳汇面板 -->
        <div v-if="mode === 'forest'" class="c-card p-4 space-y-3">
          <div class="gis-panel-title">林地边界与估算</div>
          <DataUpload title="上传林地边界 (GeoJSON)"
            hint="或点击「加载示例边界」使用内置示例林地"
            @pick="boundaryInput?.click()" @file="onBoundaryFile" />
          <input ref="boundaryInput" type="file" accept=".geojson,.json" class="hidden" @change="(e:any)=>{const f=e.target.files?.[0]; if(f) onBoundaryFile(f); e.target.value=''}" />
          <div class="flex gap-2">
            <el-button size="small" type="primary" plain @click="loadSampleBoundary">{{ dataStore.source.boundary === 'user' ? '加载当前边界' : '加载示例边界' }}</el-button>
            <el-button size="small" plain @click="drawPolygon">手动圈定边界</el-button>
            <el-button size="small" plain @click="clearLayers">清除</el-button>
          </div>
          <p class="text-[11px] text-[var(--c-text-3)] leading-5" v-if="drawing">单击地图添加顶点，双击完成（≥3 个顶点）</p>
          <p v-if="dataError" class="gis-empty" role="alert">{{ dataError }}</p>
        </div>

        <!-- 热力图面板 -->
        <div v-if="mode === 'heatmap'" class="c-card p-4 space-y-3">
          <div class="gis-panel-title">排放点位与筛选</div>
          <DataUpload title="上传排放点位数据 (Excel/CSV)"
            hint="表头：企业名称 | 纬度(lat) | 经度(lon) | 排放量(tCO₂e) | 所属行业"
            @pick="pointsInput?.click()" @file="onPointsFile" />
          <input ref="pointsInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="(e:any)=>{const f=e.target.files?.[0]; if(f) onPointsFile(f); e.target.value=''}" />
          <label class="gis-field-label" for="gis-point-search">筛选点位（名称、行业、城市）</label>
          <input id="gis-point-search" v-model.trim="pointQuery" class="gis-input" type="search" placeholder="输入关键词" />
          <label class="gis-field-label" for="gis-point-select">定位点位 · {{ filteredPoints.length }} 项</label>
          <select id="gis-point-select" class="gis-input" :value="selectedPointIndex" @change="selectPoint(Number(($event.target as HTMLSelectElement).value))">
            <option value="-1">选择地图点位</option>
            <option v-for="(point, index) in filteredPoints" :key="`${point.name}-${point.lat}-${point.lon}-${index}`" :value="index">{{ point.name }} · {{ point.city?.trim() || point.industry }}</option>
          </select>
          <div v-if="selectedPoint" class="gis-selection" aria-live="polite"><strong>{{ selectedPoint.name }}</strong><span>{{ selectedPoint.emission }} tCO₂e · {{ selectedPoint.industry }}</span><span>{{ selectedPoint.city?.trim() || '城市未提供' }} · {{ selectedPoint.lat.toFixed(4) }}, {{ selectedPoint.lon.toFixed(4) }}</span></div>
          <p v-else-if="!filteredPoints.length" class="gis-empty" role="status">{{ pointQuery ? '没有匹配的点位；请调整筛选条件。' : dataError || '暂无点位；可上传文件或加载内置示例。' }}</p>
          <div class="flex gap-2 items-center">
            <span class="text-xs text-[var(--c-text-3)]">热力半径（像素）</span>
            <el-slider v-model="heatRadius" :min="4" :max="40" :step="2" style="flex:1" @input="renderHeatmap" />
            <span class="num text-xs w-12 text-right">{{ heatRadius }}px</span>
          </div>
          <div class="flex gap-2 items-center">
            <span class="text-xs text-[var(--c-text-3)]">模糊度</span>
            <el-slider v-model="heatBlur" :min="5" :max="30" style="flex:1" @input="renderHeatmap" />
            <span class="num text-xs w-12 text-right">{{ heatBlur }}</span>
          </div>
          <div class="flex gap-2">
            <el-button size="small" type="primary" plain @click="loadSamplePoints">{{ dataStore.source.points === 'user' ? '加载当前点位' : '加载示例点位' }}</el-button>
            <el-button size="small" plain v-if="dataStore.source.points === 'user'" @click="resetPoints">切回示例</el-button>
            <el-button size="small" plain @click="clearLayers">清除</el-button>
          </div>
        </div>

        <!-- GBA 面板 -->
        <div v-if="mode === 'gba'" class="c-card p-4">
          <div class="gis-panel-title mb-2">城市信息</div>
          <p class="text-xs text-[var(--c-text-2)] leading-6 mb-2">粤港澳大湾区 11 城内置示例 — 点击地图标记或使用下方选择框查看城市数据；来源与统计年份待核实。</p>
          <label class="gis-field-label" for="gis-city-select">选择城市</label>
          <select id="gis-city-select" class="gis-input mb-3" :value="selectedCity?.name || ''" @change="selectCity(($event.target as HTMLSelectElement).value)"><option value="">请选择</option><option v-for="city in GBA_CITIES" :key="city.name" :value="city.name">{{ city.name }}</option></select>
          <div v-if="selectedCity" class="city-detail">
            <div class="text-sm font-bold text-[var(--c-green)]">{{ selectedCity.name }} {{ selectedCity.en }}</div>
            <div class="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div class="cell"><div class="num text-amber">{{ selectedCity.emission }}</div><div>碳排放 (万tCO₂)</div></div>
              <div class="cell"><div class="num text-blue">{{ selectedCity.intensity }}</div><div>强度 (t/万元GDP)</div></div>
              <div class="cell"><div class="num text-green">{{ selectedCity.gdp }}</div><div>GDP (亿元)</div></div>
              <div class="cell"><div class="num text-purple">{{ rank }}</div><div>排放排名</div></div>
            </div>
          </div>
          <div v-else class="gis-empty" role="status">选择地图标记或城市名称查看详情。</div>
        </div>

        <!-- 林地碳汇结果 -->
        <div v-if="mode === 'forest' && gisResult" class="c-card p-4">
          <p class="gis-note mb-3">示意估算：当前 NDVI 含随机参数，结果不可作为真实遥感观测或正式碳汇核算依据。</p>
          <div class="grid grid-cols-2 gap-2">
            <div class="stat-box"><div class="num text-green">{{ gisResult.areaHa }}</div><div class="lbl">林地面积 (ha)</div></div>
            <div class="stat-box"><div class="num text-green">{{ gisResult.ndvi }}</div><div class="lbl">平均 NDVI 指数</div></div>
            <div class="stat-box"><div class="num text-amber">{{ gisResult.agb }}</div><div class="lbl">地上生物量 (t/ha)</div></div>
            <div class="stat-box"><div class="num text-blue">{{ gisResult.co2e }}</div><div class="lbl">碳汇量 (tCO₂e)</div></div>
          </div>
        </div>
      </aside>
    </div>

    <!-- 林地碳汇图表 -->
    <div v-if="mode === 'forest' && gisResult" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="NDVI 时序变化" height="260">
        <div ref="ndviEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="碳储量与碳汇量趋势" height="260">
        <div ref="biomassEl" class="w-full h-full" />
      </ChartCard>
    </div>

    <!-- 林地碳汇盘查明细 -->
    <div v-if="mode === 'forest' && gisResult" class="c-card">
      <div class="c-card-title">林地碳汇盘查明细</div>
      <div class="p-4 table-scroll">
        <table class="dark-table">
          <thead><tr><th>年份</th><th class="text-right">NDVI</th><th class="text-right">地上生物量 (t)</th><th class="text-right">碳储量 (tC)</th><th class="text-right">碳汇量 (tCO₂e)</th></tr></thead>
          <tbody>
            <tr v-for="row in gisResult.rows" :key="row.year">
              <td>{{ row.year }}</td>
              <td class="num text-right">{{ row.ndvi.toFixed(3) }}</td>
              <td class="num text-right">{{ row.agb.toFixed(1) }}</td>
              <td class="num text-right">{{ row.carbon.toFixed(1) }}</td>
              <td class="num text-right text-[var(--c-green)] font-semibold">{{ row.co2e.toFixed(1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, nextTick, watch } from 'vue'
import L from 'leaflet'
import 'leaflet.heat'
import * as echarts from 'echarts'
import { CHART_TOOLTIP } from '@/utils/chartTheme'
import { useElementResize } from '@/composables/useElementResize'
import ChartCard from '@/components/ChartCard.vue'
import DataUpload from '@/components/DataUpload.vue'
import { useDataStore, parsePointsFile, type EmissionPoint } from '@/stores/data'
import { GBA_CITIES } from '@/data/carbonMarket'
import { useToast } from '@/composables/useToast'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { MONITORING_CONFIG } from '@/utils/format'
import { prepareForestGeometry, parseMonitoringPacket, monitoringSource, createPacketGuard } from '@/utils/gisSafety'

const dataStore = useDataStore()
const toast = useToast()
const { confirmAction } = useConfirmAction()
const mode = ref<'forest' | 'heatmap' | 'gba'>('forest')

const mapEl = ref<HTMLElement | null>(null)
const ndviEl = ref<HTMLElement | null>(null)
const biomassEl = ref<HTMLElement | null>(null)
const boundaryInput = ref<HTMLInputElement | null>(null)
const pointsInput = ref<HTMLInputElement | null>(null)

let map: L.Map | null = null
let heatLayer: any = null
let drawnItems: L.LayerGroup | null = null
let basemapTiles: L.TileLayer | null = null
let selectedMarker: L.CircleMarker | null = null
let forestPolygon: L.Polygon | null = null
const pointMarkers = new Map<EmissionPoint, L.CircleMarker>()
const basemapError = ref(false)
const mapError = ref('')
const dataError = ref('')
const pointQuery = ref('')
const selectedPoint = ref<EmissionPoint | null>(null)
const selectedPointIndex = computed(() => filteredPoints.value.indexOf(selectedPoint.value as EmissionPoint))
const filteredPoints = computed(() => {
  const q = pointQuery.value.trim().toLocaleLowerCase()
  return q ? dataStore.points.filter((p) => [p.name, p.industry, p.city].some((v) => v?.toLocaleLowerCase().includes(q))) : dataStore.points
})
let drawMode = false
let currentPolygon: L.Polygon | null = null
// T10: 实时点位图层 + SSE 客户端
let realtimePoints: L.LayerGroup | null = null
let sseClient: EventSource | null = null
let lastRealtimeMarker: L.CircleMarker | null = null
let streamTimer: ReturnType<typeof setTimeout> | null = null
let sizeTimer: ReturnType<typeof setTimeout> | null = null
let disposed = false
const packetGuard = createPacketGuard()
const streamState = ref(MONITORING_CONFIG.realtime_enabled ? '连接中' : '未配置')
const streamSource = ref('未知来源（未认证）')
const lastReceivedAt = ref('')
let ndviChart: echarts.ECharts | null = null
let biomassChart: echarts.ECharts | null = null

const heatRadius = ref(16)
const heatBlur = ref(15)
const drawing = ref(false)
const selectedCity = ref<typeof GBA_CITIES[number] | null>(null)
const rank = computed(() => {
  if (!selectedCity.value) return '—'
  const sorted = [...GBA_CITIES].sort((a, b) => b.emission - a.emission)
  return `# ${sorted.findIndex((c) => c.name === selectedCity.value!.name) + 1} / 11`
})

const gisResult = ref<{ areaHa: string; ndvi: string; agb: string; co2e: string; rows: { year: number; ndvi: number; agb: number; carbon: number; co2e: number }[] } | null>(null)

const badgeCls = (key: string) => dataStore.source[key] === 'user' ? 'user-badge' : 'sample-badge'

function initMap() {
  if (disposed || map || !mapEl.value) return
  try {
    map = L.map(mapEl.value, { center: [22.65, 114.05], zoom: 11, zoomControl: true, zoomAnimation: false })
    basemapTiles = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      subdomains: ['1', '2', '3', '4'], attribution: '© 高德地图 | CarbonAI', maxZoom: 18,
    }).on('tileerror', () => { basemapError.value = true }).on('tileload', () => { basemapError.value = false }).addTo(map)
    drawnItems = L.layerGroup().addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!drawMode || !currentPolygon) return
      currentPolygon.addLatLng(e.latlng)
    })
    map.on('dblclick', () => { if (drawMode) finishDraw() })
    sizeTimer = setTimeout(() => { if (!disposed) map?.invalidateSize() }, 300)
  } catch {
    mapError.value = '地图初始化失败，请刷新页面重试。'
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
}

function selectPoint(index: number) {
  const point = filteredPoints.value[index]
  selectedMarker?.setStyle({ radius: 3, weight: 1, color: '#10b981', fillColor: '#10b981' })
  selectedMarker = point ? pointMarkers.get(point) || null : null
  selectedPoint.value = point || null
  if (point && map) {
    selectedMarker?.setStyle({ radius: 9, weight: 2, color: '#f4d06f', fillColor: '#10b981' })
    map.setView([point.lat, point.lon], Math.max(map.getZoom(), 11))
    selectedMarker?.openPopup()
  }
}

function selectCity(name: string) {
  selectedCity.value = GBA_CITIES.find((city) => city.name === name) || null
  if (selectedCity.value) map?.setView([selectedCity.value.lat, selectedCity.value.lon], 10)
}

// Existing SSE demonstration; source declarations are not device authentication.
function closeStream() {
  if (sseClient) { sseClient.onmessage = null; sseClient.onopen = null; sseClient.onerror = null; sseClient.close(); sseClient = null }
}
function initRealtime() {
  if (disposed || !map || sseClient || !MONITORING_CONFIG.realtime_enabled) return
  realtimePoints = L.layerGroup().addTo(map)
  const { sse_url, critical_threshold, warning_threshold, demo_point_lat, demo_point_lon } = MONITORING_CONFIG
  try { sseClient = new EventSource(sse_url) } catch { streamState.value = '连接失败'; return }
  sseClient.onmessage = (ev) => {
    if (disposed) return
    try {
      const p = parseMonitoringPacket(JSON.parse(ev.data))
      if (!p || !packetGuard.accept(p.pointId, p.time)) return
      const color = p.rate >= critical_threshold ? '#ef4444' : p.rate >= warning_threshold ? '#f59e0b' : '#10b981'
      const radius = 10 + Math.min(p.rate / 10, 30)
      streamSource.value = monitoringSource(p.dataSource)
      lastReceivedAt.value = new Date().toLocaleString('zh-CN')
      const popup = `<b>${escapeHtml(p.pointId)}</b><br/>CO₂e: <b>${p.rate} kg/h</b><br/>状态: ${escapeHtml(p.operatingStatus)}<br/>数据源: ${escapeHtml(streamSource.value)}<br/>观测时间: ${escapeHtml(p.timestamp)}`
      if (lastRealtimeMarker && realtimePoints?.hasLayer(lastRealtimeMarker)) {
        lastRealtimeMarker.setStyle({ color, fillColor: color, radius }).bindPopup(popup)
      } else {
        lastRealtimeMarker = L.circleMarker([demo_point_lat, demo_point_lon], { radius, color, fillColor: color, weight: 2, fillOpacity: 0.5 }).bindPopup(popup)
        realtimePoints?.addLayer(lastRealtimeMarker)
      }
    } catch { /* Invalid JSON/packets do not replace the last valid state. */ }
  }
  let failures = 0
  sseClient.onopen = () => { if (!disposed) { failures = 0; streamState.value = '已连接' } }
  sseClient.onerror = () => {
    if (disposed) return
    streamState.value = '连接异常'
    if (++failures >= MONITORING_CONFIG.max_retries) { closeStream(); streamState.value = '已断开' }
  }
}

function clearLayers() {
  drawnItems?.clearLayers()
  if (heatLayer && map) { map.removeLayer(heatLayer); heatLayer = null }
  selectedMarker = null
  selectedPoint.value = null
  pointMarkers.clear()
  forestPolygon = null
  gisResult.value = null
  toast.info('图层已清除')
}

// ============ 林地碳汇 ============
async function loadSampleBoundary() {
  try {
    const geo = await dataStore.loadSampleBoundary()
    if (!geo.features?.[0]?.geometry) throw new Error('示例边界文件缺少有效几何')
    dataError.value = ''
    processGeometry(geo.features[0].geometry)
    toast.success(dataStore.source.boundary === 'user' ? '已加载当前用户边界' : '已加载示例林地边界（示例数据）')
  } catch (e) {
    clearForestResult()
    dataError.value = e instanceof Error ? e.message : '示例边界加载失败'
    toast.error(dataError.value)
  }
}

async function onBoundaryFile(file: File) {
  try {
    if (file.name.endsWith('.zip')) throw new Error('Shapefile zip 请先转换为 GeoJSON（推荐 mapshaper.org）')
    const geo = JSON.parse(await file.text())
    const geom = geo.type === 'FeatureCollection' ? geo.features[0].geometry : geo.type === 'Feature' ? geo.geometry : geo
    processGeometry(geom)
    dataStore.setUserBoundary(geo)
    dataError.value = ''
    toast.success('林地边界已上传（用户数据优先）')
  } catch (e: any) {
    clearForestResult()
    dataError.value = e.message || '文件解析失败'
    toast.error(dataError.value)
  }
}

function drawPolygon() {
  initMap()
  if (!map) return
  drawMode = true
  drawing.value = true
  currentPolygon = L.polygon([], { color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.2 }).addTo(map)
  toast.info('已进入绘制模式：单击添加顶点，双击完成')
}

function finishDraw() {
  drawMode = false
  drawing.value = false
  if (!currentPolygon || !map) return
  const latlngs = currentPolygon.getLatLngs() as L.LatLng[][]
  if (latlngs[0].length < 3) { toast.error('至少需要 3 个顶点'); return }
  map.removeLayer(currentPolygon)
  drawnItems?.addLayer(currentPolygon)
  const coords = latlngs[0].map((ll) => [ll.lng, ll.lat])
  coords.push(coords[0])
  try { processGeometry({ type: 'Polygon', coordinates: [coords as [number, number][]] }) }
  catch (e: any) { clearForestResult(); dataError.value = e.message; toast.error(e.message) }
  currentPolygon = null
}

function clearForestResult() {
  gisResult.value = null
  forestPolygon = null
  drawnItems?.clearLayers()
  ndviChart?.dispose(); biomassChart?.dispose(); ndviChart = null; biomassChart = null
}
function processGeometry(geometry: { type: string; coordinates: any }) {
  const { areaHa, latlngs } = prepareForestGeometry(geometry)
  const ndviBase = 0.55 + Math.random() * 0.2
  const rows: { year: number; ndvi: number; agb: number; carbon: number; co2e: number }[] = []
  for (let year = 2022; year <= 2026; year++) {
    const ndvi = Math.max(0.1, ndviBase - 0.05 * (2026 - year) + (Math.random() - 0.5) * 0.03)
    const agb = 120 * Math.pow(ndvi, 1.8) * areaHa
    const carbon = agb * 1.26 * 0.47
    const co2e = carbon * 3.664
    if (![ndvi, agb, carbon, co2e, agb / areaHa].every(Number.isFinite)) throw new Error('示意估算结果无效')
    rows.push({ year, ndvi, agb, carbon, co2e })
  }
  if (disposed) throw new Error('页面已离开，未保存边界')
  initMap()
  if (!map) throw new Error('地图未就绪，未保存边界')
  const poly = L.polygon(latlngs, { color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.25 })
  clearForestResult()
  forestPolygon = poly
  drawnItems?.addLayer(poly)
  map.fitBounds(poly.getBounds().pad(0.2))
  const latest = rows[rows.length - 1]
  gisResult.value = { areaHa: areaHa.toFixed(1), ndvi: latest.ndvi.toFixed(3), agb: (latest.agb / areaHa).toFixed(1), co2e: latest.co2e.toFixed(1), rows }
  dataError.value = ''
  renderForestCharts(rows)
  toast.success(`林地示意估算完成：${areaHa.toFixed(1)} ha，${latest.co2e.toFixed(0)} tCO₂e`)
}

function renderForestCharts(rows: { year: number; ndvi: number; carbon: number; co2e: number }[]) {
  nextTick(() => {
    if (disposed) return
    if (ndviEl.value && !ndviChart) ndviChart = echarts.init(ndviEl.value)
    if (biomassEl.value && !biomassChart) biomassChart = echarts.init(biomassEl.value)
    const tt = CHART_TOOLTIP
    ndviChart?.setOption({
      tooltip: { trigger: 'axis', ...tt },
      grid: { left: '3%', right: '5%', bottom: '10%', top: '14%', containLabel: true },
      xAxis: { type: 'category', data: rows.map((r) => r.year), axisLabel: { color: '#9db8ae' } },
      yAxis: { type: 'value', min: 0, max: 1, axisLabel: { color: '#9db8ae' }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } } },
      series: [{ type: 'line', data: rows.map((r) => +r.ndvi.toFixed(3)), color: '#10b981', smooth: true, symbolSize: 7,
        areaStyle: { color: 'rgba(16,185,129,0.15)' } }],
    }, true)
    biomassChart?.setOption({
      tooltip: { trigger: 'axis', ...tt },
      legend: { bottom: 0, textStyle: { color: '#9db8ae' } },
      grid: { left: '3%', right: '5%', bottom: '14%', top: '14%', containLabel: true },
      xAxis: { type: 'category', data: rows.map((r) => r.year), axisLabel: { color: '#9db8ae' } },
      yAxis: { type: 'value', axisLabel: { color: '#9db8ae' }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } } },
      series: [
        { name: '碳储量(tC)', type: 'bar', data: rows.map((r) => +r.carbon.toFixed(1)), itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] }, animationDelay: (i: number) => i * 100 },
        { name: '碳汇量(tCO₂e)', type: 'bar', data: rows.map((r) => +r.co2e.toFixed(1)), itemStyle: { color: '#0ea5e9', borderRadius: [4, 4, 0, 0] }, animationDelay: (i: number) => i * 100 + 50 },
      ],
    }, true)
  })
}

// ============ 热力图 ============
async function loadSamplePoints() {
  await dataStore.loadSampleData()
  dataError.value = dataStore.points.length ? '' : '示例点位未能加载；请检查数据文件或上传点位。'
  if (dataError.value) { toast.error(dataError.value); return }
  renderHeatmap()
  toast.success(dataStore.source.points === 'user' ? `已加载 ${dataStore.points.length} 个用户点位` : `已加载 ${dataStore.points.length} 个示例排放点位（大湾区）`)
}

async function onPointsFile(file: File) {
  try {
    const pts = await parsePointsFile(file)
    dataStore.setUserPoints(pts)
    dataError.value = ''
    renderHeatmap()
    toast.success(`已上传 ${pts.length} 个排放点位（用户数据优先展示）`)
  } catch (e: any) {
    toast.error(e.message || '解析失败')
  }
}

async function resetPoints() {
  const confirmed = await confirmAction('这会删除当前浏览器中保存的排放点位数据，且无法撤销。', '切回示例点位？', '删除并切换')
  if (!confirmed) return
  dataStore.resetPoints()
  renderHeatmap()
  toast.info('已切回示例点位')
}

function renderHeatmap() {
  initMap()
  if (!map) return
  drawnItems?.clearLayers()
  pointMarkers.clear()
  selectedMarker = null
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null }
  const pts = filteredPoints.value
  if (!pts.length) return
  const maxVal = Math.max(1, ...pts.map((p) => p.emission))
  const heatData = pts.map((p) => [p.lat, p.lon, Math.min(p.emission / maxVal, 1)])
  // @ts-ignore leaflet.heat 扩展
  heatLayer = L.heatLayer(heatData, {
    radius: heatRadius.value, blur: heatBlur.value, max: 1,
    gradient: { 0.2: '#22c55e', 0.4: '#eab308', 0.6: '#f97316', 0.8: '#ef4444' },
  }).addTo(map)
  map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lon] as [number, number])).pad(0.15))
  // 点位标记
  pts.forEach((p) => {
    const marker = L.circleMarker([p.lat, p.lon], { radius: 3, color: '#10b981', fillColor: '#10b981', fillOpacity: 0.8 })
      .bindPopup(`<b>${escapeHtml(p.name)}</b><br/>排放：${escapeHtml(p.emission)} tCO₂e<br/>行业：${escapeHtml(p.industry)}${p.city ? `<br/>城市：${escapeHtml(p.city.trim())}` : ''}`)
      .on('click', () => selectPoint(pts.indexOf(p)))
      .addTo(drawnItems!)
    pointMarkers.set(p, marker)
  })
  if (selectedPoint.value) selectPoint(pts.indexOf(selectedPoint.value))
}

// ============ GBA 看板 ============
function renderGba() {
  initMap()
  if (!map) return
  drawnItems?.clearLayers()
  selectedPoint.value = null
  selectedMarker = null
  pointMarkers.clear()
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null }
  map.setView([22.85, 113.85], 8)
  // 大圈先绘制，小圈后绘制，避免相邻城市的小标记被遮住。
  const citiesByMarkerSize = [...GBA_CITIES].sort((a, b) => b.emission - a.emission)
  citiesByMarkerSize.forEach((city) => {
    const isRed = city.emission > 4000
    const isYellow = city.emission > 2500
    const color = isRed ? '#ef4444' : isYellow ? '#f59e0b' : '#10b981'
    const marker = L.circleMarker([city.lat, city.lon], {
      radius: isRed ? 24 : isYellow ? 16 : 9,
      color, weight: 2, fillColor: color, fillOpacity: isRed ? 0.2 : isYellow ? 0.27 : 0.35,
      className: `gba-city-marker gba-city-marker--${isRed ? 'red' : isYellow ? 'yellow' : 'green'}`,
    })
      .bindTooltip(`${city.name} · ${city.emission} 万tCO₂`)
      .on('click', () => { selectedCity.value = city })
      .addTo(drawnItems!)
  })
}

watch(mode, () => {
  nextTick(() => {
    map?.invalidateSize()
    if (mode.value === 'heatmap') renderHeatmap()
    else if (mode.value === 'gba') renderGba()
    else { drawnItems?.clearLayers(); if (heatLayer && map) { map.removeLayer(heatLayer); heatLayer = null }; if (forestPolygon) { drawnItems?.addLayer(forestPolygon); map?.fitBounds(forestPolygon.getBounds().pad(0.2)) } }
  })
})
watch(pointQuery, () => { if (mode.value === 'heatmap') renderHeatmap() })

onMounted(async () => {
  await nextTick()
  if (disposed) return
  initMap()
  // T10: 初始化实时点位图层（不阻塞主线程，失败静默降级）
  streamTimer = setTimeout(initRealtime, 500)
  await dataStore.loadSampleData()
  if (!disposed && !dataStore.points.length) dataError.value = '示例点位未能加载；请检查数据文件或上传点位。'
})
function resize() { map?.invalidateSize(); ndviChart?.resize(); biomassChart?.resize() }
useElementResize([mapEl, ndviEl, biomassEl], resize)
onBeforeUnmount(() => {
  disposed = true
  if (streamTimer) clearTimeout(streamTimer)
  if (sizeTimer) clearTimeout(sizeTimer)
  closeStream()
  packetGuard.clear()
  lastRealtimeMarker = null
  // T10: 清理 SSE + 实时点位层
  realtimePoints?.remove()
  basemapTiles?.off()
  map?.off(); map?.remove(); map = null
  realtimePoints = null; drawnItems = null; forestPolygon = null
  ndviChart?.dispose(); biomassChart?.dispose(); ndviChart = null; biomassChart = null
})
</script>

<style scoped>
.gis-page { max-width: 1880px; margin: 0 auto; }
.gis-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; }
.gis-heading h2 { margin: 0 0 6px; color: var(--c-text); font-size: clamp(22px, 2vw, 30px); font-weight: 700; }
.gis-heading p { margin: 0; color: var(--c-text-2); font-size: 12px; line-height: 1.6; }
.gis-kicker { color: var(--c-green) !important; letter-spacing: .13em; font-size: 10px !important; }
.gis-meta { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.gis-meta span { color: var(--c-text-2); border: 1px solid var(--c-border); background: var(--c-surface-2); border-radius: 4px; padding: 6px 9px; font-size: 11px; }
.gis-workspace { display: grid; grid-template-columns: minmax(0, 2.35fr) minmax(280px, .8fr); gap: 16px; align-items: start; }
.gis-map-frame { height: clamp(540px, calc(100vh - 215px), 860px); min-width: 0; background: #081712; }
.gis-sidebar { min-width: 0; max-height: 860px; overflow-y: auto; }
.gis-panel-title { color: var(--c-text); font-size: 13px; font-weight: 700; letter-spacing: .02em; }
.gis-layer-row { display: flex; justify-content: space-between; gap: 8px; border-top: 1px solid var(--c-border); padding: 9px 0; color: var(--c-text-2); font-size: 11px; }
.gis-layer-row span:last-child { color: var(--c-green); white-space: nowrap; }
.gis-layer-disabled span:last-child { color: var(--c-text-3); }
.gis-note { color: var(--c-text-3); font-size: 11px; line-height: 1.6; }
.gis-map-label { position: absolute; z-index: 500; top: 12px; left: 50px; max-width: calc(100% - 64px); padding: 7px 10px; border: 1px solid var(--c-border-2); border-radius: 6px; background: rgba(8,20,16,.92); color: var(--c-text); font-size: 11px; pointer-events: none; }
.gis-map-alert { position: absolute; z-index: 1001; left: 12px; bottom: 12px; max-width: min(360px, calc(100% - 24px)); padding: 10px 12px; border: 1px solid #b0783d; border-radius: 6px; background: #241c12; color: #ffdaad; font-size: 12px; }
.gis-field-label { display: block; color: var(--c-text-2); font-size: 11px; margin-bottom: 5px; }
.gis-input { width: 100%; min-height: 36px; padding: 7px 10px; border: 1px solid var(--c-border-2); border-radius: 6px; background: var(--c-surface-2); color: var(--c-text); font-size: 12px; }
.gis-input:focus-visible { outline: 2px solid var(--c-green); outline-offset: 2px; }
.gis-selection { display: grid; gap: 4px; padding: 10px; border-left: 2px solid var(--c-green); background: var(--c-surface-2); color: var(--c-text-2); font-size: 11px; }
.gis-selection strong { color: var(--c-text); font-size: 12px; }
.gis-empty { padding: 12px; border: 1px dashed var(--c-border-2); border-radius: 6px; color: var(--c-text-2); font-size: 12px; line-height: 1.5; }
.map-legend {
  position: absolute; z-index: 1000; right: 12px; bottom: 20px;
  background: rgba(13, 23, 20, 0.9); backdrop-filter: blur(8px);
  border: 1px solid var(--c-border-2); border-radius: 10px; padding: 10px 12px;
}
.lg-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.gba-legend { width: 220px; max-width: calc(100% - 16px); color: var(--c-text); pointer-events: none; }
.gba-legend-title { font-size: 11px; font-weight: 600; }
.gba-legend-levels { display: flex; align-items: end; justify-content: space-between; gap: 8px; margin-top: 8px; font-size: 10px; text-align: center; }
.gba-legend-levels > div { display: flex; flex-direction: column; align-items: center; gap: 4px; white-space: nowrap; }
.gba-legend-circle { display: block; border-radius: 50%; border: 2px solid currentColor; }
.gba-legend-circle--red { width: 48px; height: 48px; color: #ef4444; background: rgba(239, 68, 68, .2); }
.gba-legend-circle--yellow { width: 32px; height: 32px; color: #f59e0b; background: rgba(245, 158, 11, .27); }
.gba-legend-circle--green { width: 18px; height: 18px; color: #10b981; background: rgba(16, 185, 129, .35); }
.gba-legend-note { margin-top: 8px; color: var(--c-text-2); font-size: 10px; line-height: 1.5; }
.city-detail .cell {
  background: var(--c-surface-2); border: 1px solid var(--c-border);
  border-radius: 8px; padding: 8px 10px;
}
.cell .num { font-size: 18px; font-weight: 700; }
.cell div:last-child { font-size: 10px; color: var(--c-text-3); }
@media (max-width: 900px) {
  .gis-heading { align-items: start; flex-direction: column; }
  .gis-meta { justify-content: flex-start; }
  .gis-workspace { grid-template-columns: minmax(0, 1fr); }
  .gis-map-frame { height: min(62vh, 620px); min-height: 380px; }
  .gis-sidebar { max-height: none; overflow: visible; }
}
@media (max-width: 480px) {
  .gis-map-frame { height: 430px; }
  .gis-map-label { left: 12px; top: 60px; }
  .map-legend { right: 8px; bottom: 28px; padding: 6px 8px; }
  .gis-meta span { font-size: 10px; }
}
</style>
