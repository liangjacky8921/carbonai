<template>
  <div class="auth-card c-card">
    <h2 class="text-lg font-bold mb-1">欢迎回来</h2>
    <p class="text-xs text-[var(--c-text-3)] mb-5">登录 CarbonAI，管理您的碳资产与报告</p>

    <el-form :model="form" @submit.prevent="onLogin" size="large">
      <el-form-item>
        <el-input v-model="form.username" placeholder="账号 / 邮箱" :prefix-icon="User" clearable />
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.password" type="password" placeholder="密码" :prefix-icon="Lock"
          show-password @keyup.enter="onLogin" />
      </el-form-item>
      <div class="flex items-center justify-between mb-4">
        <el-checkbox v-model="remember" size="small">记住我</el-checkbox>
        <span class="text-[11px] text-[var(--c-text-3)]">忘记密码请联系管理员</span>
      </div>
      <el-button type="primary" class="w-full" :loading="loading" round @click="onLogin">登 录</el-button>
    </el-form>

    <el-divider class="my-4"><span class="text-[11px] text-[var(--c-text-3)]">还没有账号？</span></el-divider>
    <el-button class="w-full" round @click="router.push('/auth/register')">注册新账号</el-button>

    <p class="tip">💡 演示提示：Mock 模式下首次使用请先注册；账号信息仅存于本机浏览器</p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const toast = useToast()
const loading = ref(false)
const remember = ref(!!auth.rememberedUsername)

const form = reactive({ username: auth.rememberedUsername || '', password: '' })

async function onLogin() {
  if (!form.username || !form.password) return toast.warning('请输入账号和密码')
  loading.value = true
  const r = await auth.login(form.username.trim(), form.password)
  loading.value = false
  if (r.code === 200) {
    auth.setRemember(remember.value ? form.username.trim() : '')
    toast.success(`欢迎回来，${auth.user?.username}`)
    router.push((route.query.redirect as string) || '/')
  } else {
    toast.error(r.message)
  }
}
</script>

<style scoped>
.auth-card { width: 100%; padding: 30px 32px 26px; border-radius: 16px; }
.tip { margin-top: 16px; font-size: 11px; color: var(--c-text-3); line-height: 1.7; }
</style>
