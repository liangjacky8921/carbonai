import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'

/** 排放记录结构（与企业示例数据 JSON / 上传 Excel 解析结果一致） */
export interface EmissionRecord {
  year: number
  month?: number
  department?: string
  source: string
  activity: number
  unit: string
  factor: number
  scope: 'Scope 1' | 'Scope 2' | 'Scope 3'
  emission: number
  factorSource?: string
  confidence?: 'high' | 'low'
}

export interface TrajPoint {
  time: string; lat: number; lon: number; speed: number
  load: number; vehicle: string; fuel: string; vehicleId?: string
}

export interface EmissionPoint {
  name: string; lat: number; lon: number; emission: number; industry: string; city?: string
}

export type DataSource = 'sample' | 'user'

const LS_PREFIX = 'carbonai_user_'

/** 上传解析结果持久化键 */
const userKeys = {
  emissions: LS_PREFIX + 'emissions',
  trajectory: LS_PREFIX + 'trajectory',
  points: LS_PREFIX + 'points',
  boundary: LS_PREFIX + 'boundary',
  bom: LS_PREFIX + 'bom',
  pcf: LS_PREFIX + 'pcf',
}

function lsGet<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function lsSet(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val))
}
function lsDel(key: string) {
  localStorage.removeItem(key)
}

export const useDataStore = defineStore('data', () => {
  // ---------- 数据源标识（示例 / 用户） ----------
  const source = ref<Record<string, DataSource>>({
    emissions: 'sample', trajectory: 'sample', points: 'sample',
    boundary: 'sample', bom: 'sample', pcf: 'sample',
  })

  // ---------- 排放记录 ----------
  const sampleEmissions = ref<EmissionRecord[]>([])
  const userEmissions = ref<EmissionRecord[]>(lsGet<EmissionRecord[]>(userKeys.emissions) || [])
  const emissions = computed<EmissionRecord[]>(() =>
    source.value.emissions === 'user' && userEmissions.value.length ? userEmissions.value : sampleEmissions.value)
  const emissionYears = computed(() => [...new Set(emissions.value.map((r) => r.year))].sort())
  const currentYear = ref<number>(new Date().getFullYear())
  const yearRecords = computed(() => emissions.value.filter((r) => r.year === currentYear.value))
  const yearTotal = computed(() => yearRecords.value.reduce((s, r) => s + r.emission, 0))
  const scopeSummary = computed(() => {
    const s = { 'Scope 1': 0, 'Scope 2': 0, 'Scope 3': 0 } as Record<string, number>
    yearRecords.value.forEach((r) => { s[r.scope] = (s[r.scope] || 0) + r.emission })
    return s
  })

  // ---------- 车队轨迹 ----------
  const userTrajectory = ref<TrajPoint[]>(lsGet<TrajPoint[]>(userKeys.trajectory) || [])
  const trajectory = computed<TrajPoint[]>(() =>
    source.value.trajectory === 'user' && userTrajectory.value.length ? userTrajectory.value : [])

  // ---------- 排放点位 ----------
  const samplePoints = ref<EmissionPoint[]>([])
  const userPoints = ref<EmissionPoint[]>(lsGet<EmissionPoint[]>(userKeys.points) || [])
  const points = computed<EmissionPoint[]>(() =>
    source.value.points === 'user' && userPoints.value.length ? userPoints.value : samplePoints.value)

  // ---------- 林地边界 ----------
  const userBoundary = ref<any>(lsGet(userKeys.boundary))
  const boundary = computed(() =>
    source.value.boundary === 'user' && userBoundary.value ? userBoundary.value : null)

  // ---------- 产品 BOM / PCF ----------
  const sampleBom = ref<any>(null)
  const userBom = ref<any>(lsGet(userKeys.bom))
  const bom = computed(() =>
    source.value.bom === 'user' && userBom.value ? userBom.value : sampleBom.value)
  const userPcf = ref<any>(lsGet(userKeys.pcf))

  // ================= 示例数据加载 =================
  async function loadSampleData() {
    if (sampleEmissions.value.length && samplePoints.value.length && sampleBom.value) return
    try {
      const [ent, pts, b] = await Promise.all([
        fetch('/sample-data/enterprise-emissions.json').then((r) => r.json()),
        fetch('/sample-data/emission-points.csv').then((r) => r.text()),
        fetch('/sample-data/product-bom.json').then((r) => r.json()),
      ])
      if (!sampleEmissions.value.length) sampleEmissions.value = ent.records
      if (!sampleBom.value) sampleBom.value = b
      if (!samplePoints.value.length) {
        const lines = pts.trim().split('\n').filter((l) => !l.startsWith('#'))
        samplePoints.value = lines.slice(1).map((line) => {
          const v = line.split(',')
          return { name: v[0], lat: +v[1], lon: +v[2], emission: +v[3], industry: v[4], city: v[5] }
        })
      }
      if (!emissionYears.value.includes(currentYear.value) && emissionYears.value.length) {
        currentYear.value = emissionYears.value[emissionYears.value.length - 1]
      }
    } catch (e) {
      console.warn('[CarbonAI] 示例数据加载失败', e)
    }
  }

  async function loadSampleTrajectory(): Promise<TrajPoint[]> {
    if (trajectory.value.length) return trajectory.value
    const csv = await fetch('/sample-data/fleet-gps-trajectory.csv').then((r) => r.text())
    const data = parseTrajCsv(csv)
    // 示例轨迹不落库，仅回填展示
    return data
  }

  async function loadSampleBoundary(): Promise<any> {
    if (boundary.value) return boundary.value
    return await fetch('/sample-data/forest-boundary.geojson').then((r) => r.json())
  }

  // ================= 用户数据上传（优先展示） =================
  function setUserEmissions(records: EmissionRecord[]) {
    userEmissions.value = records
    lsSet(userKeys.emissions, records)
    source.value.emissions = 'user'
    const years = [...new Set(records.map((r) => r.year))]
    if (years.length) currentYear.value = Math.max(...years)
  }
  function resetEmissions() {
    userEmissions.value = []
    lsDel(userKeys.emissions)
    source.value.emissions = 'sample'
    if (emissionYears.value.length) currentYear.value = emissionYears.value[emissionYears.value.length - 1]
  }
  function setUserTrajectory(pts: TrajPoint[]) {
    userTrajectory.value = pts
    lsSet(userKeys.trajectory, pts)
    source.value.trajectory = 'user'
  }
  function resetTrajectory() {
    userTrajectory.value = []
    lsDel(userKeys.trajectory)
    source.value.trajectory = 'sample'
  }
  function setUserPoints(pts: EmissionPoint[]) {
    userPoints.value = pts
    lsSet(userKeys.points, pts)
    source.value.points = 'user'
  }
  function resetPoints() {
    userPoints.value = []
    lsDel(userKeys.points)
    source.value.points = 'sample'
  }
  function setUserBoundary(geojson: any) {
    userBoundary.value = geojson
    lsSet(userKeys.boundary, geojson)
    source.value.boundary = 'user'
  }
  function resetBoundary() {
    userBoundary.value = null
    lsDel(userKeys.boundary)
    source.value.boundary = 'sample'
  }
  function setUserBom(b: any) {
    userBom.value = b
    lsSet(userKeys.bom, b)
    source.value.bom = 'user'
  }
  function resetBom() {
    userBom.value = null
    lsDel(userKeys.bom)
    source.value.bom = 'sample'
  }
  function setUserPcf(p: any) {
    userPcf.value = p
    lsSet(userKeys.pcf, p)
    source.value.pcf = 'user'
  }

  return {
    source, emissions, userEmissions, emissionYears, currentYear, yearRecords, yearTotal, scopeSummary,
    sampleEmissions, samplePoints, sampleBom,
    trajectory, points, boundary, bom, userPcf,
    loadSampleData, loadSampleTrajectory, loadSampleBoundary,
    setUserEmissions, resetEmissions, setUserTrajectory, resetTrajectory,
    setUserPoints, resetPoints, setUserBoundary, resetBoundary, setUserBom, resetBom, setUserPcf,
  }
})

// ================= 文件解析工具 =================

/** 因子匹配（与原 v5.2 核算逻辑一致） */
export const EMISSION_FACTORS = [
  { kw: '烟煤', kw2: '煤', kw3: 'coal', factor: 1.9003, unit: '吨', factorUnit: 'tCO₂/t', scope: 'Scope 1' as const, source: '国家发改委气候司' },
  { kw: '无烟煤', factor: 2.53, unit: '吨', factorUnit: 'tCO₂/t', scope: 'Scope 1' as const, source: '国家发改委气候司' },
  { kw: '柴油', kw3: 'diesel', factor: 3.1605, unit: '吨', factorUnit: 'tCO₂/t', scope: 'Scope 1' as const, source: 'IPCC 2006' },
  { kw: '汽油', kw3: 'gasoline', factor: 2.9251, unit: '吨', factorUnit: 'tCO₂/t', scope: 'Scope 1' as const, source: 'IPCC 2006' },
  { kw: '天然气', kw3: 'natural gas', factor: 21.84, unit: '万m³', factorUnit: 'tCO₂/万m³', scope: 'Scope 1' as const, source: 'IPCC 2006' },
  { kw: '电力', kw2: '外购电力', kw3: 'electricity', factor: 0.5703, unit: 'MWh', factorUnit: 'tCO₂/MWh', scope: 'Scope 2' as const, source: '中国电网2023(南方)' },
  { kw: '热力', kw2: '蒸汽', factor: 0.11, unit: 'GJ', factorUnit: 'tCO₂/GJ', scope: 'Scope 2' as const, source: 'GB/T 32151' },
  { kw: '飞行', kw2: '航空', kw3: 'flight', factor: 0.115, unit: '人·km', factorUnit: 'tCO₂/人·km', scope: 'Scope 3' as const, source: 'ICAO' },
  { kw: '公路货运', kw2: '卡车', factor: 0.078, unit: '吨·km', factorUnit: 'tCO₂/吨·km', scope: 'Scope 3' as const, source: 'GLEC 3.0' },
]

export function matchFactor(name: string) {
  const n = String(name).toLowerCase().replace(/[\s-]/g, '')
  for (const f of EMISSION_FACTORS) {
    for (const k of ['kw', 'kw2', 'kw3'] as const) {
      if (f[k] && n.includes(String(f[k]).toLowerCase().replace(/[\s-]/g, ''))) return f
    }
  }
  return { kw: name, factor: 1.0, unit: '吨', factorUnit: 'tCO₂/t', scope: 'Scope 3' as const, source: '默认排放因子' }
}

/** 解析碳排放 Excel/CSV（表头：排放源 | 活动数据 | 单位 | Scope | 年份，兼容月份/部门） */
export async function parseEmissionFile(file: File): Promise<EmissionRecord[]> {
  const isCsv = /\.csv$/i.test(file.name)
  let rows: any[][] = []
  if (isCsv) {
    const text = await file.text()
    const wb = XLSX.read(text, { type: 'string' })
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
  } else {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
  }
  let hi = -1, ni = -1, vi = -1, ui = -1, yi = -1, mi = -1, di = -1
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = rows[i]
    for (let j = 0; j < r.length; j++) {
      const c = String(r[j]).trim()
      if (c.includes('排放源') || c.toLowerCase().includes('source')) { ni = j; hi = i }
      if (c.includes('活动数据') || c.toLowerCase().includes('activity') || c.includes('用量')) vi = j
      if (c.includes('单位') || c.toLowerCase().includes('unit')) ui = j
      if (c.includes('年份') || c.toLowerCase().includes('year')) yi = j
      if (c.includes('月份') || c.toLowerCase().includes('month')) mi = j
      if (c.includes('部门') || c.includes('组织') || c.toLowerCase().includes('depart')) di = j
    }
  }
  if (ni < 0 || vi < 0) throw new Error('未识别到「排放源 / 活动数据」列，请检查文件表头')
  const records: EmissionRecord[] = []
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i]
    const srcName = String(r[ni] || '').trim()
    const rawVal = parseFloat(r[vi]) || 0
    if (!srcName || rawVal <= 0) continue
    const m = matchFactor(srcName)
    const year = yi >= 0 ? (parseInt(r[yi]) || new Date().getFullYear()) : new Date().getFullYear()
    records.push({
      year, month: mi >= 0 ? parseInt(r[mi]) || undefined : undefined,
      department: di >= 0 ? String(r[di] || '') || undefined : undefined,
      source: srcName, activity: rawVal,
      unit: ui >= 0 ? String(r[ui] || m.unit) : m.unit,
      factor: m.factor, scope: m.scope,
      emission: +(rawVal * m.factor).toFixed(2),
      factorSource: m.source,
      confidence: m.source === '默认排放因子' ? 'low' : 'high',
    })
  }
  if (!records.length) throw new Error('未解析到有效数据行')
  return records
}

/** 解析车队轨迹 CSV：timestamp,lat,lon,speed,load,vehicle_type,fuel_type[,vehicle_id] */
export function parseTrajCsv(csv: string): TrajPoint[] {
  const lines = csv.trim().split('\n').filter((l) => l && !l.startsWith('#'))
  const out: TrajPoint[] = []
  for (let i = 1; i < lines.length; i++) {
    const v = lines[i].split(',')
    if (v.length < 7 || isNaN(parseFloat(v[1]))) continue
    out.push({
      time: v[0], lat: parseFloat(v[1]), lon: parseFloat(v[2]), speed: parseFloat(v[3]),
      load: parseFloat(v[4]), vehicle: v[5], fuel: v[6], vehicleId: v[7] || '',
    })
  }
  return out
}

/** 解析排放点位 CSV/Excel：企业名称,纬度,经度,排放量,所属行业[,城市] */
export async function parsePointsFile(file: File): Promise<EmissionPoint[]> {
  let rows: any[][]
  if (/\.csv$/i.test(file.name)) {
    const text = await file.text()
    const wb = XLSX.read(text, { type: 'string' })
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
  } else {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
  }
  const start = rows.findIndex((r) => String(r[0]).includes('企业') || String(r[0]).toLowerCase().includes('name'))
  const out: EmissionPoint[] = []
  for (let i = start + 1; i < rows.length; i++) {
    const v = rows[i]
    const lat = parseFloat(v[1]), lon = parseFloat(v[2]), emission = parseFloat(v[3])
    if (!v[0] || isNaN(lat) || isNaN(lon)) continue
    out.push({ name: String(v[0]), lat, lon, emission: emission || 1, industry: String(v[4] || '综合'), city: String(v[5] || '') })
  }
  if (!out.length) throw new Error('未解析到有效点位（表头需含：企业名称,纬度,经度,排放量,所属行业）')
  return out
}
