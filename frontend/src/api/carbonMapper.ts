import { http } from './client'
import type { ApiResponse } from './types'
import { useAuthStore } from '@/stores/auth'

function sessionHeaders() {
  const token = useAuthStore().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface RemoteObservation {
  id: string
  gas: 'CH4' | 'CO2'
  longitude: number
  latitude: number
  coordinateSystem: string
  observedAt: string | null
  publishedAt: string | null
  emissionRateKgPerHour: number | null
  emissionUncertaintyKgPerHour: number | null
  quality: string | null
  status: string | null
  instrument: string | null
  productCollection: string | null
  emissionVersion: string | null
  source: { name: string; url: string }
}

export interface ObservationList {
  items: RemoteObservation[]
  matchedCount: number | null
  fetchedAt: string
  cacheStatus: string
  source: { name: string; url: string; termsUrl: string }
  notice: string
}

export interface ObservationQuery {
  bbox: [number, number, number, number]
  gas: 'CH4' | 'CO2'
  from?: string
  to?: string
  limit: number
}

/** This endpoint must never use the application's example-data fallback. */
export async function listRemoteObservations(query: ObservationQuery, signal: AbortSignal): Promise<ObservationList> {
  const response = await http.get<ApiResponse<ObservationList>>('/observations/carbon-mapper', {
    params: { bbox: query.bbox.join(','), gas: query.gas, from: query.from || undefined, to: query.to || undefined, limit: query.limit },
    headers: sessionHeaders(),
    signal,
  })
  if (response.data.code !== 200 || !Array.isArray(response.data.data?.items)) throw new Error('观测接口返回格式异常')
  return response.data.data
}

export async function getRemoteObservation(id: string, signal: AbortSignal): Promise<RemoteObservation> {
  const response = await http.get<ApiResponse<{ item: RemoteObservation }>>(
    `/observations/carbon-mapper/${encodeURIComponent(id)}`, { headers: sessionHeaders(), signal },
  )
  if (response.data.code !== 200 || !response.data.data?.item) throw new Error('观测详情返回格式异常')
  return response.data.data.item
}

/** 高德瓦片使用 GCJ-02；仅用于地图位置，详情仍显示官方 WGS84 坐标。 */
export function wgs84ToGcj02(longitude: number, latitude: number): [number, number] {
  if (longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271) {
    return [longitude, latitude]
  }
  const x = longitude - 105, y = latitude - 35
  const transformLat = (a: number, b: number) => -100 + 2 * a + 3 * b + .2 * b * b + .1 * a * b
    + .2 * Math.sqrt(Math.abs(a)) + (20 * Math.sin(6 * a * Math.PI) + 20 * Math.sin(2 * a * Math.PI)) * 2 / 3
    + (20 * Math.sin(b * Math.PI) + 40 * Math.sin(b / 3 * Math.PI)) * 2 / 3
    + (160 * Math.sin(b / 12 * Math.PI) + 320 * Math.sin(b * Math.PI / 30)) * 2 / 3
  const transformLon = (a: number, b: number) => 300 + a + 2 * b + .1 * a * a + .1 * a * b
    + .1 * Math.sqrt(Math.abs(a)) + (20 * Math.sin(6 * a * Math.PI) + 20 * Math.sin(2 * a * Math.PI)) * 2 / 3
    + (20 * Math.sin(a * Math.PI) + 40 * Math.sin(a / 3 * Math.PI)) * 2 / 3
    + (150 * Math.sin(a / 12 * Math.PI) + 300 * Math.sin(a / 30 * Math.PI)) * 2 / 3
  const rad = latitude / 180 * Math.PI
  const magic = 1 - 0.006693421622965943 * Math.sin(rad) ** 2
  const root = Math.sqrt(magic)
  const dLat = transformLat(x, y) * 180 / ((6335552.717000426 / (magic * root)) * Math.PI)
  const dLon = transformLon(x, y) * 180 / ((6378245 / root) * Math.cos(rad) * Math.PI)
  return [longitude + dLon, latitude + dLat]
}

/** 反算视野边界供 WGS84 API 查询；显示位置仍由官方原始坐标决定。 */
export function gcj02ToWgs84(longitude: number, latitude: number): [number, number] {
  let wgsLon = longitude, wgsLat = latitude
  for (let i = 0; i < 3; i++) {
    const [gcjLon, gcjLat] = wgs84ToGcj02(wgsLon, wgsLat)
    wgsLon += longitude - gcjLon
    wgsLat += latitude - gcjLat
  }
  return [wgsLon, wgsLat]
}
