/** Existing GIS demonstrations: validation only, not a certified geospatial model. */
type Point = [number, number]
type Ring = Point[]
export function prepareForestGeometry(geometry: any) {
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) throw new Error('仅支持 Polygon / MultiPolygon')
  const input = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  if (!Array.isArray(input) || !input.length) throw new Error('林地边界不能为空')
  function ringArea(ring: Ring) {
    let sum = 0
    for (let i = 0; i < ring.length - 1; i++) {
      const [x, y] = ring[i], [nx, ny] = ring[i + 1]
      sum += (nx - x) * Math.PI / 180 * (2 + Math.sin(y * Math.PI / 180) + Math.sin(ny * Math.PI / 180))
    }
    return Math.abs(sum * 6371000 ** 2 / 2) / 10000
  }
  const polygons: Ring[][] = input.map((polygon: unknown) => {
    if (!Array.isArray(polygon) || !polygon.length) throw new Error('多边形缺少外环')
    return polygon.map((ring: unknown) => {
      if (!Array.isArray(ring) || ring.length < 4) throw new Error('边界环至少需要三个顶点并闭合')
      const points: Ring = ring.map((p: unknown) => {
        if (!Array.isArray(p) || p.length < 2 || typeof p[0] !== 'number' || typeof p[1] !== 'number'
          || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) throw new Error('边界坐标必须是有效经纬度')
        return [p[0], p[1]]
      })
      const first = points[0], last = points[points.length - 1]
      if (first[0] !== last[0] || first[1] !== last[1]) throw new Error('边界环必须闭合')
      // Local origin avoids cancellation when detecting collinear/duplicate vertices.
      const planar = points.slice(1).reduce((sum, p, i) => sum + (points[i][0] - first[0]) * (p[1] - first[1]) - (p[0] - first[0]) * (points[i][1] - first[1]), 0)
      if (new Set(points.map(p => p.join(','))).size < 3 || Math.abs(planar) < 1e-14 || !(ringArea(points) > 0)) throw new Error('边界环退化或面积为零')
      return points
    })
  })
  const areaHa = polygons.reduce((sum, rings) => {
    const area = ringArea(rings[0]) - rings.slice(1).reduce((n, ring) => n + ringArea(ring), 0)
    if (!(area > 0) || !Number.isFinite(area)) throw new Error('多边形扣除孔洞后面积必须大于零')
    return sum + area
  }, 0)
  if (!Number.isFinite(areaHa) || areaHa <= 0) throw new Error('林地面积无效')
  return { areaHa, latlngs: polygons.map(rings => rings.map(ring => ring.map(([lon, lat]): Point => [lat, lon]))) }
}

export function validGridThresholds(yellow: unknown, red: unknown): boolean {
  return typeof yellow === 'number' && typeof red === 'number' && Number.isFinite(yellow) && Number.isFinite(red) && yellow > 0 && yellow < red
}
export function gridLevel(value: number, yellow: number, red: number): 'normal' | 'yellow' | 'red' {
  return value > red ? 'red' : value > yellow ? 'yellow' : 'normal'
}
export function monitoringSource(source: string | null): string {
  return source === 'simulated' ? '模拟数据' : source ? `已声明来源（未认证）：${source}` : '未知来源（未认证）'
}
export function parseMonitoringPacket(raw: unknown, now = Date.now()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const p = raw as Record<string, unknown>
  if (typeof p.co2e_rate !== 'number' || !Number.isFinite(p.co2e_rate) || p.co2e_rate < 0
    || typeof p.point_id !== 'string' || !p.point_id.trim() || p.point_id.length > 128
    || typeof p.timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(p.timestamp)
    || (p.data_source != null && (typeof p.data_source !== 'string' || p.data_source.length > 128))
    || (p.operating_status != null && (typeof p.operating_status !== 'string' || p.operating_status.length > 128))) return null
  const time = Date.parse(p.timestamp)
  // Bounded live-demo window; this is not a historical replay interface.
  if (!Number.isFinite(time) || time < now - 5 * 60_000 || time > now + 60_000) return null
  return { rate: p.co2e_rate, pointId: p.point_id.trim(), timestamp: p.timestamp, time,
    dataSource: typeof p.data_source === 'string' ? p.data_source.trim() || null : null,
    operatingStatus: typeof p.operating_status === 'string' ? p.operating_status : '未提供' }
}

/** Per-component, bounded point timestamps reject duplicate/out-of-order packets. */
export function createPacketGuard() {
  const latest = new Map<string, number>()
  return {
    accept(point: string, time: number) {
      if (time <= (latest.get(point) ?? -Infinity)) return false
      latest.delete(point); latest.set(point, time)
      if (latest.size > 256) latest.delete(latest.keys().next().value!)
      return true
    },
    clear() { latest.clear() },
  }
}
