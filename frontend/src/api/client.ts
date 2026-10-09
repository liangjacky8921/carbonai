/**
 * CarbonAI V6.0 — API 客户端
 * 启动时探测 FastAPI 后端（/api/health）；在线走真实 API，离线自动回退 Mock。
 * 所有响应统一 { code: 200, message: "success", data: {...} }。
 */
import axios from 'axios'
import { ref } from 'vue'
import type { ApiResponse, UserInfo } from './types'
import { mockApi } from '@/mock/server'

const BASE = import.meta.env.VITE_API_BASE || '/api'

export const http = axios.create({ baseURL: BASE, timeout: 8000 })

// 后端在线标志：必须用 ref（普通 let 非响应式，探测成功后模板/逻辑读不到新值 → 徽章一直显示「离线降级」）
export const backendOnline = ref(false)

export async function probeBackend(): Promise<boolean> {
  try {
    const r = await axios.get(`${BASE}/health`, { timeout: 2000 })
    backendOnline.value = r.status === 200 && r.data?.status === 'ok'
  } catch {
    backendOnline.value = false
  }
  return backendOnline.value
}

function wrap<T>(p: Promise<{ data: ApiResponse<T> }>): Promise<ApiResponse<T>> {
  return p.then((r) => r.data).catch((e) => ({
    code: e.response?.status ?? 500,
    message: e.response?.data?.message ?? e.message ?? '网络错误',
    data: null as T,
  }))
}

export const authApi = {
  sendCode: (email: string) =>
    backendOnline.value ? wrap(http.post('/auth/send-code', { email })) : mockApi.sendCode(email),
  register: (payload: { username: string; email: string; password: string; code: string }) =>
    backendOnline.value ? wrap(http.post('/auth/register', payload)) : mockApi.register(payload),
  login: (payload: { username: string; password: string }) =>
    backendOnline.value ? wrap(http.post('/auth/login', payload)) : mockApi.login(payload),
  logout: () =>
    backendOnline.value ? wrap(http.post('/auth/logout', {})) : mockApi.logout(),
  userInfo: (token: string) =>
    backendOnline.value ? wrap(http.get('/auth/user-info', { headers: { Authorization: `Bearer ${token}` } })) : mockApi.userInfo(token),
}

/** 业务接口：后端在线时调用，离线时由各模块回退本地实现 */
export const bizApi = {
  chat: (message: string, history: { role: string; content: string }[]) =>
    wrap(http.post('/ai/chat', { message, history })),
  uploadEmissions: (formData: FormData) =>
    wrap(http.post('/emissions/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
  getFactors: () =>
    wrap(http.get('/factors')),
  generateReport: (payload: { standard: string; year: number; format: string; records?: unknown[] }) =>
    wrap(http.post('/reports/generate', payload)),
  /** 碳市场行情快照（含时间戳 + 免责声明），离线时各视图回退 carbonMarket.ts 静态数据 */
  getMarketQuotes: () =>
    wrap(http.get('/market/quotes')),
}
