/**
 * 统一 API 响应格式：{ code: 200, message: "success", data: {...} }
 * 后端未接入时自动回退 Mock（localStorage 模拟），后端接入后无需改前端代码。
 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface UserInfo {
  id: number
  username: string
  email: string
  created_at: string
}

export const ok = <T>(data: T, message = 'success'): ApiResponse<T> => ({ code: 200, message, data })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const err = (message: string, code = 400): ApiResponse<any> => ({ code, message, data: null })

/** 密码强度校验：至少8位，含大小写字母和数字 */
export function validatePassword(pwd: string): string | null {
  if (!pwd || pwd.length < 8) return '密码长度至少 8 位'
  if (!/[a-z]/.test(pwd)) return '密码需包含小写字母'
  if (!/[A-Z]/.test(pwd)) return '密码需包含大写字母'
  if (!/[0-9]/.test(pwd)) return '密码需包含数字'
  return null
}
