/**
 * CarbonAI V5.2 — API 客户端
 * 启动时探测 FastAPI 后端（/api/health）；在线走真实 API，离线自动回退 Mock。
 * 所有响应统一 { code: 200, message: "success", data: {...} }。
 */
import axios from 'axios'
import type { ApiResponse, UserInfo } from './types'
import { mockApi } from '@/mock/server'

const BASE = import.meta.env.VITE_API_BASE || '/api'

export const http = axios.create({ baseURL: BASE, timeout: 8000 })

export let backendOnline = false

export async function probeBackend(): Promise<boolean> {
  try {
    const r = await axios.get(`${BASE}/health`, { timeout: 2500 })
    backendOnline = r.status === 200 && r.data?.status === 'ok'
  } catch {
    backendOnline = false
  }
  return backendOnline
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
    backendOnline ? wrap(http.post('/auth/send-code', { email })) : mockApi.sendCode(email),
  register: (payload: { username: string; email: string; password: string; code: string }) =>
    backendOnline ? wrap(http.post('/auth/register', payload)) : mockApi.register(payload),
  login: (payload: { username: string; password: string }) =>
    backendOnline ? wrap(http.post('/auth/login', payload)) : mockApi.login(payload),
  logout: () =>
    backendOnline ? wrap(http.post('/auth/logout', {})) : mockApi.logout(),
  userInfo: (token: string) =>
    backendOnline ? wrap(http.get('/auth/user-info', { headers: { Authorization: `Bearer ${token}` } })) : mockApi.userInfo(token),
}

/** 业务占位接口（后端接入后启用） */
export const bizApi = {
  chat: (message: string, history: { role: string; content: string }[]) =>
    wrap(http.post('/ai/chat', { message, history })),
  uploadEmissions: (formData: FormData) =>
    wrap(http.post('/emissions/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
}
