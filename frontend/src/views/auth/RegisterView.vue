<template>
  <div class="auth-card c-card">
    <h2 class="text-lg font-bold mb-1">创建账号</h2>
    <p class="text-xs text-[var(--c-text-3)] mb-5">邮箱 + 账号 + 密码注册（密码至少 8 位，含大小写字母和数字）</p>

    <el-form :model="form" label-position="top" size="large" @submit.prevent="onRegister">
      <el-form-item>
        <el-input v-model="form.email" placeholder="邮箱（用于接收验证码）" :prefix-icon="Message" clearable />
      </el-form-item>
      <el-form-item>
        <div class="flex gap-2 w-full">
          <el-input v-model="form.code" placeholder="邮箱验证码" :prefix-icon="Key" maxlength="6" />
          <el-button :disabled="cooldown > 0" @click="onSendCode" style="min-width: 108px">
            {{ cooldown > 0 ? `${cooldown}s` : '获取验证码' }}
          </el-button>
        </div>
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.username" placeholder="账号名（至少 2 位）" :prefix-icon="User" clearable />
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.password" type="password" placeholder="密码（≥8位，含大小写字母和数字）"
          :prefix-icon="Lock" show-password />
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.confirm" type="password" placeholder="确认密码" :prefix-icon="Lock"
          show-password @keyup.enter="onRegister" />
      </el-form-item>

      <div class="pwd-meter mb-3" v-if="form.password">
        <div class="meter-bar">
          <span :style="{ width: strength.pct + '%', background: strength.color }" />
        </div>
        <span class="text-[11px]" :style="{ color: strength.color }">{{ strength.label }}</span>
      </div>

      <el-button type="primary" class="w-full" :loading="loading" round @click="onRegister">注 册</el-button>
    </el-form>

    <el-divider class="my-4"><span class="text-[11px] text-[var(--c-text-3)]">已有账号？</span></el-divider>
    <el-button class="w-full" round @click="router.push('/auth/login')">返回登录</el-button>
    <p class="tip">🔒 邮箱验证码接口为占位实现（send-code），后端数据库接入后自动启用真实邮件发送</p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Message, Key } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { validatePassword } from '@/api/types'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const loading = ref(false)
const cooldown = ref(0)

const form = reactive({ email: '', code: '', username: '', password: '', confirm: '' })

const strength = computed(() => {
  const p = form.password
  let score = 0
  if (p.length >= 8) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  const map = [
    { pct: 10, color: '#ef4444', label: '弱' },
    { pct: 35, color: '#f59e0b', label: '一般' },
    { pct: 65, color: '#0ea5e9', label: '良好' },
    { pct: 100, color: '#10b981', label: '强' },
  ]
  return { ...map[Math.max(0, score - 1)], pct: Math.max(10, score * 25) }
})

async function onSendCode() {
  if (!form.email) return toast.warning('请先输入邮箱')
  const r = await auth.sendCode(form.email.trim())
  if (r.code === 200) {
    toast.success(r.message)
    cooldown.value = 60
    const timer = setInterval(() => {
      cooldown.value--
      if (cooldown.value <= 0) clearInterval(timer)
    }, 1000)
  } else {
    toast.error(r.message)
  }
}

async function onRegister() {
  if (!form.email) return toast.warning('请输入邮箱')
  if (!form.code) return toast.warning('请输入邮箱验证码')
  if (!form.username || form.username.length < 2) return toast.warning('请输入至少 2 位的账号名')
  const pwdErr = validatePassword(form.password)
  if (pwdErr) return toast.error(pwdErr)
  if (form.password !== form.confirm) return toast.error('两次输入的密码不一致')
  loading.value = true
  const r = await auth.register({
    email: form.email.trim(), code: form.code.trim(),
    username: form.username.trim(), password: form.password,
  })
  loading.value = false
  if (r.code === 200) {
    toast.success('注册成功，请登录')
    router.push('/auth/login')
  } else {
    toast.error(r.message)
  }
}
</script>

<style scoped>
.auth-card { width: 100%; padding: 28px 32px 24px; border-radius: 16px; }
.tip { margin-top: 14px; font-size: 11px; color: var(--c-text-3); line-height: 1.7; }
.pwd-meter { display: flex; align-items: center; gap: 10px; }
.meter-bar { flex: 1; height: 4px; border-radius: 2px; background: #16261f; overflow: hidden; }
.meter-bar span { display: block; height: 100%; border-radius: 2px; transition: all 0.3s; }
</style>
