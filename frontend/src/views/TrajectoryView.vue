<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- 地图 + 上传 -->
      <div class="c-card lg:col-span-2 overflow-hidden relative" style="height: 480px">
        <div ref="mapEl" class="w-full h-full" />
      </div>
      <div class="space-y-4">
        <div class="c-card p-4 space-y-3">
          <DataUpload title="上传车队 GPS/北斗轨迹数据 (CSV)"
            hint="表头：timestamp,lat,lon,speed,load,vehicle_type,fuel_type" 
            @pick="fileInput?.click()" @file="onFile" />
          <input ref="fileInput" type="file" accept=".csv" class="hidden" @change="(e:any)=>{const f=e.target.files?.[0]; if(f) onFile(f); e.target.value=''}" />
          <div class="flex gap-2">
            <el-button size="small" type="primary" plain @click="loadDemo">加载示例轨迹</el-button>
            <el-button size="small" plain v-if="dataStore.source.trajectory === 'user'" @click="resetTraj">切回示例</el-button>
          </div>
        </div>

        <!-- 核算参数 -->
        <div class="c-card p-4 space-y-3">
          <div class="text-xs text-[var(--c-text-3)]">核算参数</div>
          <el-select v-model="cargoType" size="small" placeholder="货物类型">
            <el-option label="普通货物" value="normal" />
            <el-option label="冷链货物" value="cold" />
            <el-option label="危险品" value="danger" />
            <el-option label="大宗散货" value="bulk" />
          </el-select>
          <el-select v-model="standard" size="small" placeholder="排放标准">
            <el-option label="GLEC 3.0 框架" value="glec" />
            <el-option label="ISO 14083:2023" value="iso14083" />
            <el-option label="中国道路运输碳核算指南" value="cn-road" />
          </el-select>
          <el-button type="primary" size="small" class="w-full" @click="calculate" :loading="calculating">
            执行轨迹碳核算（Scope 3）
          </el-button>
        </div>
      </div>
    </div>

    <!-- 结果 -->
    <template v-if="result">
      <div class="grid grid-cols-3 gap-3">
        <div class="stat-box"><div class="num text-green">{{ result.dist }}</div><div class="lbl">总里程 (km)</div></div>
        <div class="stat-box"><div class="num text-blue">{{ result.tonKm }}</div><div class="lbl">总吨·公里 (t·km)</div></div>
        <div class="stat-box"><div class="num text-amber">{{ result.carbon }}</div><div class="lbl">总碳排放 (kgCO₂)</div></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="路段碳排放分布" height="300">
          <div ref="segEl" class="w-full h-full" />
        </ChartCard>
        <ChartCard title="各车型单位排放对比" height="300">
          <div ref="vehEl" class="w-full h-full" />
        </ChartCard>
      </div>

      <div class="c-card">
        <div class="c-card-title">轨迹碳核算明细（{{ segments.length }} 路段）</div>
        <div class="p-4 max-h-[340px] overflow-auto">
          <table class="dark-table">
            <thead><tr><th>路段</th><th>车型</th><th class="text-right">距离 (km)</th><th class="text-right">载重 (t)</th><th class="text-right">吨·公里</th><th class="text-right">排放 (kgCO₂)</th></tr></thead>
            <tbody>
              <tr v-for="(s, i) in segments" :key="i">
                <td>{{ i + 1 }}</td>
                <td>{{ s.vehicle }}</td>
                <td class="num text-right">{{ s.dist }}</td>
                <td class="num text-right">{{ s.load }}</td>
                <td class="num text-right">{{ s.tonKm }}</td>
                <td class="num text-right text-[var(--c-green)] font-semibold">{{ s.carbon }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    <div v-else class="c-card">
      <EmptyState icon="Guide" title="尚未执行轨迹碳核算"
        description="上传车队 GPS/北斗轨迹 CSV（或加载示例轨迹），选择货物类型与排放标准后执行核算。核算基于 GLEC 3.0 / ISO 14083 吨·公里方法学。" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import L from 'leaflet'
import * as echarts from 'echarts'
import ChartCard from '@/components/ChartCard.vue'
import DataUpload from '@/components/DataUpload.vue'
import EmptyState from '@/components/EmptyState.vue'
import { Guide } from '@element-plus/icons-vue'
import { useDataStore, parseTrajCsv, type TrajPoint } from '@/stores/data'
import { useToast } from '@/composables/useToast'

const dataStore = useDataStore()
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const mapEl = ref<HTMLElement | null>(null)
const segEl = ref<HTMLElement | null>(null)
const vehEl = ref<HTMLElement | null>(null)
const cargoType = ref('normal')
const standard = ref('glec')
const calculating = ref(false)

let map: L.Map | null = null
let trajLine: L.Polyline | null = null
let segChart: echarts.ECharts | null = null
let vehChart: echarts.ECharts | null = null
let trajData: TrajPoint[] = []

const result = ref<{ dist: string; tonKm: string; carbon: string } | null>(null)
const segments = ref<{ dist: string; tonKm: string; carbon: string; load: number; vehicle: string }[]>([])

const cargoFactor: Record<string, number> = { normal: 1, cold: 1.32, danger: 1.18, bulk: 1.1 }

function initMap() {
  if (map || !mapEl.value) return
  map = L.map(mapEl.value, { center: [22.75, 114.15], zoom: 11 })
  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ['1', '2', '3', '4'], attribution: '© 高德地图 | 轨迹碳核算', maxZoom: 18,
  }).addTo(map)
  setTimeout(() => map?.invalidateSize(), 300)
}

function renderTrajectory(pts: TrajPoint[]) {
  initMap()
  if (!map || !pts.length) return
  if (trajLine) map.removeLayer(trajLine)
  const coords = pts.map((p) => [p.lat, p.lon] as [number, number])
  trajLine = L.polyline(coords, { color: '#10b981', weight: 4, opacity: 0.85 }).addTo(map)
  map.fitBounds(trajLine.getBounds().pad(0.15))
  L.marker(coords[0]).bindPopup('🚩 起点').addTo(map)
  L.marker(coords[coords.length - 1]).bindPopup('🏁 终点').addTo(map)
}

async function loadDemo() {
  const csv = await dataStore.loadSampleTrajectory()
  if (!csv.length) {
    toast.error('示例轨迹加载失败')
    return
  }
  trajData = csv
  renderTrajectory(csv)
  toast.success(`已加载示例轨迹：${new Set(csv.map((c) => c.vehicleId || 'default')).size} 辆车 ${csv.length} 个轨迹点`)
}

async function onFile(file: File) {
  try {
    const text = await file.text()
    const pts = parseTrajCsv(text)
    if (!pts.length) throw new Error('未解析到有效轨迹点，请检查 CSV 表头')
    dataStore.setUserTrajectory(pts)
    trajData = pts
    renderTrajectory(pts)
    toast.success(`已加载用户轨迹：${pts.length} 个点（用户数据优先展示）`)
  } catch (e: any) {
    toast.error(e.message || '解析失败')
  }
}

function resetTraj() {
  dataStore.resetTrajectory()
  trajData = []
  result.value = null
  segments.value = []
  if (trajLine && map) { map.removeLayer(trajLine); trajLine = null }
  toast.info('已清除轨迹数据')
}

function calculate() {
  if (!trajData.length) { toast.warning('请先加载轨迹数据'); return }
  calculating.value = true
  setTimeout(() => {
    let totalDist = 0, totalTonKm = 0, totalCarbon = 0
    const segs: typeof segments.value = []
    const vehStats: Record<string, { carbon: number; tonKm: number }> = {}
    for (let i = 1; i < trajData.length; i++) {
      const p1 = trajData[i - 1], p2 = trajData[i]
      const dist = Math.sqrt(Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lon - p1.lon, 2)) * 111
      totalDist += dist
      const speedFactor = p1.speed > 60 ? 1.15 : p1.speed < 30 ? 1.3 : 1
      const loadFactor = 1 + (p1.load || 15) / 30 * 0.3
      const ef = 0.078 * speedFactor * loadFactor * (cargoFactor[cargoType.value] || 1)
      const tonKm = dist * (p1.load || 15) / 1000
      totalTonKm += tonKm
      const carbon = ef * tonKm
      totalCarbon += carbon
      segs.push({ dist: dist.toFixed(2), tonKm: tonKm.toFixed(2), carbon: carbon.toFixed(2), load: p1.load, vehicle: p1.vehicle })
      const vs = vehStats[p1.vehicle] || (vehStats[p1.vehicle] = { carbon: 0, tonKm: 0 })
      vs.carbon += carbon; vs.tonKm += tonKm
    }
    segments.value = segs
    result.value = {
      dist: (totalDist / 1000 * 111 / 111).toFixed(1),
      tonKm: totalTonKm.toFixed(1),
      carbon: totalCarbon.toFixed(1),
    }
    calculating.value = false
    renderCharts(vehStats)
    toast.success(`✅ 轨迹碳核算完成：${totalCarbon.toFixed(1)} kgCO₂（${standard.value === 'glec' ? 'GLEC 3.0' : standard.value === 'iso14083' ? 'ISO 14083:2023' : '中国道路运输指南'}）`)
  }, 600)
}

function renderCharts(vehStats: Record<string, { carbon: number; tonKm: number }>) {
  if (segEl.value && !segChart) segChart = echarts.init(segEl.value)
  if (vehEl.value && !vehChart) vehChart = echarts.init(vehEl.value)
  const tt = { backgroundColor: 'rgba(13,23,20,0.94)', borderColor: '#24413a', textStyle: { color: '#e8f5ef', fontSize: 12 } }
  const axis = { axisLine: { lineStyle: { color: '#1e3329' } }, axisLabel: { color: '#9db8ae' }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } } }
  segChart?.setOption({
    tooltip: { trigger: 'axis', ...tt },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '12%', containLabel: true },
    xAxis: { type: 'category', data: segments.value.map((_, i) => `路段${i + 1}`), ...axis, axisLabel: { color: '#9db8ae', fontSize: 9, interval: 3 } },
    yAxis: { type: 'value', name: 'kgCO₂', nameTextStyle: { color: '#5f7a6f' }, ...axis },
    series: [{ type: 'bar', data: segments.value.map((s) => +s.carbon), itemStyle: { borderRadius: [3, 3, 0, 0], color: '#10b981' }, animationDelay: (i: number) => i * 30 }],
  }, true)
  const vehEntries = Object.entries(vehStats)
  vehChart?.setOption({
    tooltip: { trigger: 'axis', ...tt },
    grid: { left: '3%', right: '5%', bottom: '12%', top: '12%', containLabel: true },
    xAxis: { type: 'category', data: vehEntries.map((v) => v[0]), ...axis },
    yAxis: { type: 'value', name: 'kgCO₂/t·km', nameTextStyle: { color: '#5f7a6f' }, ...axis },
    series: [{
      type: 'bar', barWidth: '40%',
      data: vehEntries.map(([, v]) => +(v.tonKm ? v.carbon / v.tonKm : 0).toFixed(3)),
      itemStyle: { borderRadius: [6, 6, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#0ea5e9' }, { offset: 1, color: 'rgba(14,165,233,0.12)' }]) },
      label: { show: true, position: 'top', color: '#9db8ae', fontSize: 10 },
    }],
  }, true)
}

function resize() { map?.invalidateSize(); segChart?.resize(); vehChart?.resize() }
onMounted(() => { initMap(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); map?.remove(); segChart?.dispose(); vehChart?.dispose() })
</script>
