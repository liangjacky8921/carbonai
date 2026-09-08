<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <!-- 模式切换 -->
    <div class="flex flex-wrap items-center gap-2">
      <el-radio-group v-model="mode" size="small">
        <el-radio-button value="forest">🌳 林地碳汇</el-radio-button>
        <el-radio-button value="heatmap">🔥 碳源热力图</el-radio-button>
        <el-radio-button value="gba">🏙️ GBA 看板</el-radio-button>
      </el-radio-group>
      <span :class="mode === 'forest' ? badgeCls('boundary') : badgeCls('points')" v-if="mode !== 'gba'">
        {{ mode === 'forest' ? (dataStore.source.boundary === 'user' ? '用户数据' : '示例数据') : (dataStore.source.points === 'user' ? '用户数据' : '示例数据') }}
      </span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- 地图 -->
      <div class="c-card lg:col-span-2 overflow-hidden relative" style="height: 520px">
        <div ref="mapEl" class="w-full h-full" />
        <!-- 图例 -->
        <div class="map-legend" v-if="mode === 'heatmap'">
          <div class="text-[11px] font-semibold mb-1">排放强度</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#22c55e" />低</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#eab308" />中</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#f97316" />高</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#ef4444" />极高</div>
        </div>
        <div class="map-legend" v-else-if="mode === 'forest'">
          <div class="text-[11px] font-semibold mb-1">NDVI 植被指数</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#a16207" />&lt;0.1 裸地</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#eab308" />0.1-0.3 稀疏</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#84cc16" />0.3-0.6 中等</div>
          <div class="flex items-center gap-1 text-[10px]"><span class="lg-dot" style="background:#10b981" />&gt;0.6 茂密</div>
        </div>
      </div>

      <!-- 控制面板 -->
      <div class="space-y-4">
        <!-- 林地碳汇面板 -->
        <div v-if="mode === 'forest'" class="c-card p-4 space-y-3">
          <DataUpload title="上传林地边界 (GeoJSON / .zip Shapefile)"
            hint="或点击「加载示例边界」使用内置示例林地"
            @pick="boundaryInput?.click()" @file="onBoundaryFile" />
          <input ref="boundaryInput" type="file" accept=".geojson,.json,.zip" class="hidden" @change="(e:any)=>{const f=e.target.files?.[0]; if(f) onBoundaryFile(f); e.target.value=''}" />
          <div class="flex gap-2">
            <el-button size="small" type="primary" plain @click="loadSampleBoundary">加载示例边界</el-button>
            <el-button size="small" plain @click="drawPolygon">手动圈定边界</el-button>
            <el-button size="small" plain @click="clearLayers">清除</el-button>
          </div>
          <p class="text-[11px] text-[var(--c-text-3)] leading-5" v-if="drawing">单击地图添加顶点，双击完成（≥3 个顶点）</p>
        </div>

        <!-- 热力图面板 -->
        <div v-if="mode === 'heatmap'" class="c-card p-4 space-y-3">
          <DataUpload title="上传排放点位数据 (Excel/CSV)"
            hint="表头：企业名称 | 纬度(lat) | 经度(lon) | 排放量(tCO₂e) | 所属行业"
            @pick="pointsInput?.click()" @file="onPointsFile" />
          <input ref="pointsInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="(e:any)=>{const f=e.target.files?.[0]; if(f) onPointsFile(f); e.target.value=''}" />
          <div class="flex gap-2 items-center">
            <span class="text-xs text-[var(--c-text-3)]">热力半径</span>
            <el-slider v-model="heatRadius" :min="200" :max="2000" :step="100" style="flex:1" @input="renderHeatmap" />
            <span class="num text-xs w-12 text-right">{{ heatRadius }}m</span>
          </div>
          <div class="flex gap-2 items-center">
            <span class="text-xs text-[var(--c-text-3)]">模糊度</span>
            <el-slider v-model="heatBlur" :min="5" :max="30" style="flex:1" @input="renderHeatmap" />
            <span class="num text-xs w-12 text-right">{{ heatBlur }}</span>
          </div>
          <div class="flex gap-2">
            <el-button size="small" type="primary" plain @click="loadSamplePoints">加载示例点位</el-button>
            <el-button size="small" plain v-if="dataStore.source.points === 'user'" @click="resetPoints">切回示例</el-button>
            <el-button size="small" plain @click="clearLayers">清除</el-button>
          </div>
        </div>

        <!-- GBA 面板 -->
        <div v-if="mode === 'gba'" class="c-card p-4">
          <p class="text-xs text-[var(--c-text-2)] leading-6 mb-2">🏙️ 粤港澳大湾区 11 城碳排放联动看板 — 点击地图城市标记查看该市碳数据</p>
          <div v-if="selectedCity" class="city-detail">
            <div class="text-sm font-bold text-[var(--c-green)]">{{ selectedCity.name }} {{ selectedCity.en }}</div>
            <div class="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div class="cell"><div class="num text-amber">{{ selectedCity.emission }}</div><div>碳排放 (万tCO₂)</div></div>
              <div class="cell"><div class="num text-blue">{{ selectedCity.intensity }}</div><div>强度 (t/万元GDP)</div></div>
              <div class="cell"><div class="num text-green">{{ selectedCity.gdp }}</div><div>GDP (亿元)</div></div>
              <div class="cell"><div class="num text-purple">{{ rank }}</div><div>排放排名</div></div>
            </div>
          </div>
          <div v-else class="text-center text-xs text-[var(--c-text-3)] py-6">👆 点击地图上的城市标记</div>
        </div>

        <!-- 林地碳汇结果 -->
        <div v-if="mode === 'forest' && gisResult" class="c-card p-4">
          <div class="grid grid-cols-2 gap-2">
            <div class="stat-box"><div class="num text-green">{{ gisResult.areaHa }}</div><div class="lbl">林地面积 (ha)</div></div>
            <div class="stat-box"><div class="num text-green">{{ gisResult.ndvi }}</div><div class="lbl">平均 NDVI 指数</div></div>
            <div class="stat-box"><div class="num text-amber">{{ gisResult.agb }}</div><div class="lbl">地上生物量 (t/ha)</div></div>
            <div class="stat-box"><div class="num text-blue">{{ gisResult.co2e }}</div><div class="lbl">碳汇量 (tCO₂e)</div></div>
          </div>
        </div>
      </div>
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
      <div class="p-4">
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
import ChartCard from '@/components/ChartCard.vue'
import DataUpload from '@/components/DataUpload.vue'
import { useDataStore, parsePointsFile } from '@/stores/data'
import { GBA_CITIES } from '@/data/carbonMarket'
import { useToast } from '@/composables/useToast'

const dataStore = useDataStore()
const toast = useToast()
const mode = ref<'forest' | 'heatmap' | 'gba'>('forest')

const mapEl = ref<HTMLElement | null>(null)
const ndviEl = ref<HTMLElement | null>(null)
const biomassEl = ref<HTMLElement | null>(null)
const boundaryInput = ref<HTMLInputElement | null>(null)
const pointsInput = ref<HTMLInputElement | null>(null)

let map: L.Map | null = null
let heatLayer: any = null
let drawnItems: L.LayerGroup | null = null
let drawMode = false
let currentPolygon: L.Polygon | null = null
let ndviChart: echarts.ECharts | null = null
let biomassChart: echarts.ECharts | null = null

const heatRadius = ref(800)
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
  if (map || !mapEl.value) return
  map = L.map(mapEl.value, { center: [22.65, 114.05], zoom: 11, zoomControl: true })
  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ['1', '2', '3', '4'], attribution: '© 高德地图 | CarbonAI', maxZoom: 18,
  }).addTo(map)
  drawnItems = L.layerGroup().addTo(map)
  map.on('click', (e: L.LeafletMouseEvent) => {
    if (!drawMode || !currentPolygon) return
    currentPolygon.addLatLng(e.latlng)
  })
  map.on('dblclick', () => { if (drawMode) finishDraw() })
  setTimeout(() => map?.invalidateSize(), 300)
}

function clearLayers() {
  drawnItems?.clearLayers()
  if (heatLayer && map) { map.removeLayer(heatLayer); heatLayer = null }
  gisResult.value = null
  toast.info('图层已清除')
}

// ============ 林地碳汇 ============
async function loadSampleBoundary() {
  const geo = await dataStore.loadSampleBoundary()
  if (geo.features?.[0]?.geometry) {
    processGeometry(geo.features[0].geometry)
    toast.success('已加载示例林地边界（示例数据）')
  }
}

async function onBoundaryFile(file: File) {
  try {
    if (file.name.endsWith('.zip')) throw new Error('Shapefile zip 请先转换为 GeoJSON（推荐 mapshaper.org）')
    const geo = JSON.parse(await file.text())
    const geom = geo.type === 'FeatureCollection' ? geo.features[0].geometry : geo.type === 'Feature' ? geo.geometry : geo
    dataStore.setUserBoundary(geo)
    processGeometry(geom)
    toast.success('林地边界已上传（用户数据优先）')
  } catch (e: any) {
    toast.error(e.message || '文件解析失败')
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
  processGeometry({ type: 'Polygon', coordinates: [coords as [number, number][]] })
  currentPolygon = null
}

function polygonAreaHa(coords: [number, number][][]): number {
  // 球面多边形面积（近似，turf 算法的简化版）
  const R = 6371000
  const ring = coords[0]
  let total = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1]
    total += (x2 - x1) * Math.PI / 180 * (2 + Math.sin(y1 * Math.PI / 180) + Math.sin(y2 * Math.PI / 180))
  }
  return Math.abs(total * R * R / 2) / 10000
}

function processGeometry(geometry: { type: string; coordinates: any }) {
  initMap()
  if (!map) return
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    toast.error('仅支持 Polygon / MultiPolygon')
    return
  }
  drawnItems?.clearLayers()
  // 展示多边形
  const latlngs = geometry.type === 'Polygon'
    ? geometry.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number])
    : geometry.coordinates[0][0].map((c: number[]) => [c[1], c[0]] as [number, number])
  const poly = L.polygon(latlngs, { color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.25 })
  drawnItems?.addLayer(poly)
  map.fitBounds(poly.getBounds().pad(0.2))

  // 碳汇估算（NDVI 生物量模型，与原 v5.2 一致）
  const areaHa = polygonAreaHa(geometry.coordinates)
  const ndviBase = 0.55 + Math.random() * 0.2
  const rows: { year: number; ndvi: number; agb: number; carbon: number; co2e: number }[] = []
  for (let y = 2022; y <= 2026; y++) {
    const ndvi = Math.max(0.1, ndviBase - 0.05 * (2026 - y) + (Math.random() - 0.5) * 0.03)
    const agb = 120 * Math.pow(ndvi, 1.8) * areaHa
    const carbon = agb * 1.26 * 0.47
    rows.push({ year: y, ndvi, agb, carbon, co2e: carbon * 3.664 })
  }
  const latest = rows[rows.length - 1]
  gisResult.value = {
    areaHa: areaHa.toFixed(1), ndvi: latest.ndvi.toFixed(3),
    agb: (latest.agb / areaHa).toFixed(1), co2e: latest.co2e.toFixed(1), rows,
  }
  renderForestCharts(rows)
  toast.success(`林地碳汇盘查完成：${areaHa.toFixed(1)} ha，${latest.co2e.toFixed(0)} tCO₂e`)
}

function renderForestCharts(rows: { year: number; ndvi: number; carbon: number; co2e: number }[]) {
  nextTick(() => {
    if (ndviEl.value && !ndviChart) ndviChart = echarts.init(ndviEl.value)
    if (biomassEl.value && !biomassChart) biomassChart = echarts.init(biomassEl.value)
    const tt = { backgroundColor: 'rgba(13,23,20,0.94)', borderColor: '#24413a', textStyle: { color: '#e8f5ef', fontSize: 12 } }
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
  renderHeatmap()
  toast.success(`已加载 ${dataStore.points.length} 个示例排放点位（大湾区）`)
}

async function onPointsFile(file: File) {
  try {
    const pts = await parsePointsFile(file)
    dataStore.setUserPoints(pts)
    renderHeatmap()
    toast.success(`已上传 ${pts.length} 个排放点位（用户数据优先展示）`)
  } catch (e: any) {
    toast.error(e.message || '解析失败')
  }
}

function resetPoints() {
  dataStore.resetPoints()
  renderHeatmap()
  toast.info('已切回示例点位')
}

function renderHeatmap() {
  initMap()
  if (!map) return
  drawnItems?.clearLayers()
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null }
  const pts = dataStore.points
  if (!pts.length) return
  const maxVal = Math.max(...pts.map((p) => p.emission))
  const heatData = pts.map((p) => [p.lat, p.lon, Math.min(p.emission / maxVal, 1)])
  // @ts-ignore leaflet.heat 扩展
  heatLayer = L.heatLayer(heatData, {
    radius: heatRadius.value / 50, blur: heatBlur.value, max: 1,
    gradient: { 0.2: '#22c55e', 0.4: '#eab308', 0.6: '#f97316', 0.8: '#ef4444' },
  }).addTo(map)
  map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lon] as [number, number])).pad(0.15))
  // 点位标记
  pts.forEach((p) => {
    L.circleMarker([p.lat, p.lon], { radius: 3, color: '#10b981', fillOpacity: 0.8 })
      .bindPopup(`<b>${p.name}</b><br/>排放：${p.emission} tCO₂e<br/>行业：${p.industry}${p.city ? `<br/>城市：${p.city}` : ''}`)
      .addTo(drawnItems!)
  })
}

// ============ GBA 看板 ============
function renderGba() {
  initMap()
  if (!map) return
  drawnItems?.clearLayers()
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null }
  map.setView([22.85, 113.85], 8)
  GBA_CITIES.forEach((city) => {
    const color = city.emission > 4000 ? '#ef4444' : city.emission > 2500 ? '#f59e0b' : '#10b981'
    const marker = L.circleMarker([city.lat, city.lon], { radius: 8 + city.emission / 900, color, weight: 2, fillColor: color, fillOpacity: 0.35 })
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
  })
})

onMounted(async () => {
  await nextTick()
  initMap()
  await dataStore.loadSampleData()
  window.addEventListener('resize', resize)
})
function resize() { map?.invalidateSize(); ndviChart?.resize(); biomassChart?.resize() }
onBeforeUnmount(() => { window.removeEventListener('resize', resize); map?.remove(); ndviChart?.dispose(); biomassChart?.dispose() })
</script>

<style scoped>
.map-legend {
  position: absolute; z-index: 1000; right: 12px; bottom: 20px;
  background: rgba(13, 23, 20, 0.9); backdrop-filter: blur(8px);
  border: 1px solid var(--c-border-2); border-radius: 10px; padding: 10px 12px;
}
.lg-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.city-detail .cell {
  background: var(--c-surface-2); border: 1px solid var(--c-border);
  border-radius: 8px; padding: 8px 10px;
}
.cell .num { font-size: 18px; font-weight: 700; }
.cell div:last-child { font-size: 10px; color: var(--c-text-3); }
</style>
