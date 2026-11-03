export interface TrajectoryPoint {
  time: string; lat: number; lon: number; speed: number
  load: number; vehicle: string; fuel: string; vehicleId?: string
}

export function trajectoryTime(time: string): number {
  const value = time.trim().replace(' ', 'T')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)) return NaN
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + '+08:00')
}

export function groupTrajectory(points: TrajectoryPoint[]): Map<string, TrajectoryPoint[]> {
  const groups = new Map<string, TrajectoryPoint[]>()
  const hasIds = points.some(p => p.vehicleId?.trim())
  points.forEach((p, i) => {
    if (!Number.isFinite(p.lat) || Math.abs(p.lat) > 90 || !Number.isFinite(p.lon) || Math.abs(p.lon) > 180)
      throw new Error(`第 ${i + 1} 个点经纬度无效。`)
    if (!Number.isFinite(trajectoryTime(p.time))) throw new Error(`第 ${i + 1} 个点时间无效。`)
    if (!Number.isFinite(p.load) || p.load < 0) throw new Error(`第 ${i + 1} 个点载重缺失或无效，请提供吨（t）。`)
    if (!Number.isFinite(p.speed) || p.speed < 0) throw new Error(`第 ${i + 1} 个点速度无效。`)
    const id = p.vehicleId?.trim() || ''
    if (hasIds && !id) throw new Error('部分点缺少 vehicle_id，无法安全区分车辆。')
    const key = id || '未提供车辆ID（按单车处理）'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  })
  for (const group of groups.values()) {
    group.sort((a, b) => trajectoryTime(a.time) - trajectoryTime(b.time))
    if (group.some((p, i) => i > 0 && trajectoryTime(p.time) === trajectoryTime(group[i - 1].time)))
      throw new Error('同一车辆存在重复时间戳，请先核对轨迹。')
  }
  return groups
}

/** 当前模板不支持带逗号的引号字段，遇到时明确拒绝，避免错列计算。 */
export function parseTrajectoryCsv(csv: string): TrajectoryPoint[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  if (lines.length < 2) throw new Error('轨迹 CSV 没有数据行。')
  if (lines.some(l => l.includes('"'))) throw new Error('轨迹 CSV 请使用页面表头格式，不支持引号字段。')
  const header = lines[0].split(',').map(s => s.trim())
  const required = ['timestamp', 'lat', 'lon', 'speed', 'load', 'vehicle_type', 'fuel_type']
  if (new Set(header).size !== header.length || required.some(k => !header.includes(k))) throw new Error('轨迹 CSV 表头缺失或重复。')
  const points = lines.slice(1).map((line, i) => {
    const cells = line.split(',').map(s => s.trim())
    if (cells.length !== header.length) throw new Error(`第 ${i + 2} 行列数与表头不一致。`)
    const get = (key: string) => cells[header.indexOf(key)] || ''
    const num = (key: string) => get(key) === '' ? NaN : Number(get(key))
    return { time: get('timestamp'), lat: num('lat'), lon: num('lon'), speed: num('speed'), load: num('load'),
      vehicle: get('vehicle_type'), fuel: get('fuel_type'), vehicleId: get('vehicle_id') }
  })
  groupTrajectory(points) // Reject invalid rows rather than silently joining across omitted points.
  return points
}

export function distanceKm(a: TrajectoryPoint, b: TrajectoryPoint): number {
  const rad = Math.PI / 180
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))))
}

export function estimateTrajectory(points: TrajectoryPoint[], cargoFactor: number) {
  const segments: { dist: number; tonKm: number; carbon: number; load: number; vehicle: string; vehicleId: string }[] = []
  const vehStats: Record<string, { carbon: number; tonKm: number }> = {}
  for (const [vehicleId, group] of groupTrajectory(points)) {
    for (let i = 1; i < group.length; i++) {
      const p = group[i - 1], dist = distanceKm(p, group[i]), tonKm = dist * p.load
      // Existing illustrative coefficients, interpreted as kgCO2/(t·km); provenance is unverified.
      const ef = 0.078 * (p.speed > 60 ? 1.15 : p.speed < 30 ? 1.3 : 1) * (1 + p.load / 30 * 0.3) * cargoFactor
      const carbon = ef * tonKm
      segments.push({ dist, tonKm, carbon, load: p.load, vehicle: p.vehicle, vehicleId })
      const stats = vehStats[p.vehicle] || (vehStats[p.vehicle] = { carbon: 0, tonKm: 0 })
      stats.carbon += carbon; stats.tonKm += tonKm
    }
  }
  if (!segments.length) throw new Error('每辆车至少需要两个有效轨迹点才能估算。')
  const totals = segments.reduce((s, p) => ({ dist: s.dist + p.dist, tonKm: s.tonKm + p.tonKm, carbon: s.carbon + p.carbon }), { dist: 0, tonKm: 0, carbon: 0 })
  return { segments, totals, vehStats }
}
