/**
 * CarbonAI V5.2 — 本地 Mock 服务（后端数据库未接入期间的占位实现）
 * 完整实现统一契约：register / login / logout / send-code / user-info
 * 用户数据存于 localStorage（carbonai_mock_users），后端接入后直接切换。
 */
import type { ApiResponse, UserInfo } from '@/api/types'
import { ok, err, validatePassword } from '@/api/types'

const LS_USERS = 'carbonai_mock_users'
const LS_CODES = 'carbonai_mock_email_codes'

interface MockUser extends UserInfo {
  password: string
}

function loadUsers(): MockUser[] {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS) || '[]')
  } catch {
    return []
  }
}
function saveUsers(users: MockUser[]) {
  localStorage.setItem(LS_USERS, JSON.stringify(users))
}

export const mockApi = {
  async health(): Promise<boolean> {
    return false // mock 层不响应健康检查，由上层探测真实后端
  },

  async sendCode(email: string): Promise<ApiResponse<{ expires_in: number }>> {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('邮箱格式不正确')
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const codes: Record<string, { code: string; ts: number }> = JSON.parse(localStorage.getItem(LS_CODES) || '{}')
    codes[email] = { code, ts: Date.now() }
    localStorage.setItem(LS_CODES, JSON.stringify(codes))
    // 占位：真实环境由后端发送邮件验证码。Mock 下在控制台输出，方便演示。
    console.info(`[CarbonAI Mock] 邮箱验证码已生成（演示）：${email} → ${code}`)
    return ok({ expires_in: 300 }, '验证码已发送（演示模式：请查看浏览器控制台）')
  },

  async register(payload: { username: string; email: string; password: string; code: string }): Promise<ApiResponse<UserInfo>> {
    const { username, email, password, code } = payload
    if (!username || username.length < 2) return err('请输入至少2位的账号名')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('邮箱格式不正确')
    const pwdErr = validatePassword(password)
    if (pwdErr) return err(pwdErr)
    const users = loadUsers()
    if (users.some((u) => u.username === username)) return err('该账号已被注册')
    if (users.some((u) => u.email === email)) return err('该邮箱已被注册')
    const codes: Record<string, { code: string; ts: number }> = JSON.parse(localStorage.getItem(LS_CODES) || '{}')
    const rec = codes[email]
    if (!rec) return err('请先获取邮箱验证码')
    if (Date.now() - rec.ts > 5 * 60 * 1000) return err('验证码已过期，请重新获取')
    if (rec.code !== code) return err('验证码不正确')
    const user: MockUser = {
      id: users.length + 1, username, email, password,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    users.push(user)
    saveUsers(users)
    const { password: _p, ...info } = user
    return ok(info, '注册成功')
  },

  async login(payload: { username: string; password: string }): Promise<ApiResponse<{ token: string; user: UserInfo }>> {
    const users = loadUsers()
    const user = users.find((u) => u.username === payload.username || u.email === payload.username)
    if (!user || user.password !== payload.password) return err('账号或密码错误')
    const token = 'mock-jwt-' + btoa(unescape(encodeURIComponent(`${user.id}:${Date.now()}`)))
    const { password: _p, ...info } = user
    return ok({ token, user: info }, '登录成功')
  },

  async logout(): Promise<ApiResponse<null>> {
    return ok(null, '已退出登录')
  },

  async userInfo(token: string): Promise<ApiResponse<UserInfo>> {
    const users = loadUsers()
    if (!token.startsWith('mock-jwt-')) return err('无效凭证', 401)
    const id = Number(atob(escape(decodeURIComponent(token.replace('mock-jwt-', '')))).split(':')[0])
    const user = users.find((u) => u.id === id)
    if (!user) return err('用户不存在', 401)
    const { password: _p, ...info } = user
    return ok(info)
  },
}
