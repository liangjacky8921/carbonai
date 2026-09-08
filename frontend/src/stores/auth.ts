import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/client'
import type { UserInfo } from '@/api/types'

const LS_TOKEN = 'carbonai_jwt'
const LS_USER = 'carbonai_user'
const LS_REMEMBER = 'carbonai_remember_username'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem(LS_TOKEN) || '')
  const user = ref<UserInfo | null>(JSON.parse(localStorage.getItem(LS_USER) || 'null'))
  const rememberedUsername = ref<string>(localStorage.getItem(LS_REMEMBER) || '')

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  function persist(t: string, u: UserInfo) {
    token.value = t
    user.value = u
    localStorage.setItem(LS_TOKEN, t)
    localStorage.setItem(LS_USER, JSON.stringify(u))
  }

  function setRemember(username: string) {
    rememberedUsername.value = username
    if (username) localStorage.setItem(LS_REMEMBER, username)
    else localStorage.removeItem(LS_REMEMBER)
  }

  async function login(username: string, password: string) {
    const r = await authApi.login({ username, password })
    if (r.code === 200 && r.data) {
      const d = r.data as { token: string; user: UserInfo }
      persist(d.token, d.user)
    }
    return r
  }

  async function register(payload: { username: string; email: string; password: string; code: string }) {
    return await authApi.register(payload)
  }

  async function sendCode(email: string) {
    return await authApi.sendCode(email)
  }

  async function logout() {
    await authApi.logout()
    token.value = ''
    user.value = null
    localStorage.removeItem(LS_TOKEN)
    localStorage.removeItem(LS_USER)
  }

  return { token, user, isLoggedIn, rememberedUsername, login, register, sendCode, logout, setRemember, persist }
})
