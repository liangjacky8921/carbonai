<template>
  <div class="max-w-[1600px] mx-auto space-y-4">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- 地图 -->
      <div class="c-card lg:col-span-2 overflow-hidden relative" style="height: 480px">
        <div ref="mapEl" class="w-full h-full" />
      </div>
      <!-- 控制面板 -->
      <div class="space-y-4">
        <div class="c-card p-4 space-y-3">
          <div class="text-xs text-[var(--c-text-3)]">监测区域</div>
          <el-select v-model="regionKey" size="small" @change="refresh">
            <el-option v-for="(r, k) in GRID_REGIONS" :key="k" :label="r.name" :value="k" />
          </el-select>
          <div class="text-xs text-[var(--c-text-3)] mt-2">时间窗口</div>
          <el-radio-group v-model="timeWindow" size="small" @change="refresh">
            <el-radio-button value="realtime">实时监测</el-radio-button>
            <el-radio-button value="1h">近1小时</el-radio-button>
            <el-radio-button value="24h">近24小时</el-radio-button>
            <el-radio-button value="7d">近7天</el-radio-button>
          </el-radio-group>
          <div class="text-xs text-[var(--c-text-3)] mt-3">预警阈值 (tCO₂/km²·h)</div>
          <div class="flex items-center gap-2">
            <el-input-number v-model="yellowThreshold" size="small" :min="1" :max="20" style="width: 100px" />
            <span class="text-[11px] text-amber">黄色预警</span>
          </div>
          <div class="flex items-center gap-2">
            <el-input-number v-model="redThreshold" size="small" :min="2" :max="40" style="width: 100px" />
            <span class="text-[11px] text-red">红色预警</span>
          </div>
          <el-button type="primary" size="small" class="w-full" @click="refresh">刷新监测</el-button>
        </div>

        <!-- 预警事件日志 -->
        <div class="c-card p-4">
          <div class="text-xs text-[var(--c-text-3)] mb-2">预警事件日志</div>
          <div class="space-y-2 max-h-[180px] overflow-auto">
            <div v-for="alert in alerts" :key="alert.id" class="alert-item" :class="alert.level">
              <b>{{ alert.level === 'red' ? '🔴 红色预警' : alert.level === 'yellow' ? '🟡 黄色预警' : '🟢 正常' }}</b>
              <span class="text-[11px]">{{ alert.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="排放热力分布（网格强度分布）" height="280">
        <div ref="histEl" class="w-full h-full" />
      </ChartCard>
      <ChartCard title="网格监测统计" height="280">
        <div ref="statEl" class="w-full h-full" />
      </ChartCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import L from 'leaflet'
import * as echarts from 'echarts'
import ChartCard from '@/components/ChartCard.vue'
import { GRID_REGIONS } from '@/data/carbonMarket'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const mapEl = ref<HTMLElement | null>(null)
const histEl = ref<HTMLElement | null>(null)
const statEl = ref<HTMLElement | null>(null)
const regionKey = ref('sz_gm')
const timeWindow = ref('realtime')
const yellowThreshold = ref(6)
const redThreshold = ref(12)

let map: L.Map | null = null
let histChart: echarts.ECharts | null = null
let statChart: echarts.ECharts | null = null

interface Alert { id: number; level: 'red' | 'yellow' | 'normal'; text: string }
const alerts = ref<Alert[]>([])

function initMap() {
  if (map || !mapEl.value) return
  const reg = GRID_REGIONS[regionKey.value]
  map = L.map(mapEl.value, { center: [reg.lat, reg.lon], zoom: reg.zoom })
  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ['1', '2', '3', '4'], attribution: '© 高德地图 | 双碳网格化监测', maxZoom: 18,
  }).addTo(map)
  setTimeout(() => map?.invalidateSize(), 300)
}

let gridLayer: L.LayerGroup | null = null

function refresh() {
  initMap()
  if (!map) return
  const reg = GRID_REGIONS[regionKey.value]
  map.setView([reg.lat, reg.lon], reg.zoom)
  if (gridLayer) map.removeLayer(gridLayer)
  gridLayer = L.layerGroup().addTo(map)

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
      L.rectangle([[lat - step / 2, lng - step / 2], [lat + step / 2, lng + step / 2]], {
        color: 'transparent', fillColor: color, fillOpacity: val > redThreshold.value ? 0.6 : 0.4, weight: 0.5,
      }).addTo(gridLayer!)
    }
  }

  // 预警日志
  const newAlerts: Alert[] = [{ id: Date.now(), level: 'normal', text: `${reg.name} · ${windowLabel()}监测完成，共 ${values.length} 个网格` }]
  if (redCells.length) newAlerts.unshift({ id: Date.now() + 1, level: 'red', text: `${reg.name} ${redCells.length} 个网格超过红色阈值 ${redThreshold.value} tCO₂/km²·h，建议立即派员核查` })
  if (yellowCells.length) newAlerts.unshift({ id: Date.now() + 2, level: 'yellow', text: `${reg.name} ${yellowCells.length} 个网格超过黄色阈值 ${yellowThreshold.value} tCO₂/km²·h` })
  alerts.value = [...newAlerts, ...alerts.value].slice(0, 30)

  renderCharts(values)
  toast.success(`✅ ${reg.name} 网格监测已刷新（${windowLabel()}）`)
}

function windowLabel() {
  return { realtime: '实时', '1h': '近1小时', '24h': '近24小时', '7d': '近7天' }[timeWindow.value]
}

function renderCharts(values: number[]) {
  if (histEl.value && !histChart) histChart = echarts.init(histEl.value)
  if (statEl.value && !statChart) statChart = echarts.init(statEl.value)
  const tt = { backgroundColor: 'rgba(13,23,20,0.94)', borderColor: '#24413a', textStyle: { color: '#e8f5ef', fontSize: 12 } }
  const axis = { axisLine: { lineStyle: { color: '#1e3329' } }, axisLabel: { color: '#9db8ae' }, splitLine: { lineStyle: { color: 'rgba(30,51,41,0.6)' } } }
  const bins = [0, 2, 4, 6, 8, 10, 12, 14, 99]
  const counts = bins.slice(1).map((b, i) => values.filter((v) => v > bins[i] && v <= b).length)
  histChart?.setOption({
    tooltip: { trigger: 'axis', ...tt },
    grid: { left: '3%', right: '5%', bottom: '12%', top: '14%', containLabel: true },
    xAxis: { type: 'category', data: ['0-2', '2-4', '4-6', '6-8', '8-10', '10-12', '12-14', '>14'], name: 'tCO₂/km²·h', nameTextStyle: { color: '#5f7a6f' }, ...axis },
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
onMounted(() => { initMap(); refresh(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); map?.remove(); histChart?.dispose(); statChart?.dispose() })
</script>

<style scoped>
.alert-item {
  padding: 8px 10px; border-radius: 8px; font-size: 12px; line-height: 1.6;
  background: rgba(34, 197, 94, 0.06); border-left: 3px solid #22c55e;
}
.alert-item.yellow { background: rgba(245, 158, 11, 0.08); border-left-color: #f59e0b; }
.alert-item.red { background: rgba(239, 68, 68, 0.08); border-left-color: #ef4444; animation: pulseGlow 1.6s infinite; }
</style>
