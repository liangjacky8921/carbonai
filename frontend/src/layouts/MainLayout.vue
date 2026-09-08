<template>
  <div class="flex h-screen overflow-hidden">
    <!-- ============ 侧边导航 ============ -->
    <aside class="sidebar" :class="{ collapsed: collapsed }">
      <div class="logo-row">
        <img src="/favicon.svg" class="w-9 h-9" alt="CarbonAI" />
        <transition name="fade">
          <div v-show="!collapsed" class="leading-tight">
            <div class="text-[15px] font-bold tracking-wide">CarbonAI</div>
            <div class="text-[10px] text-[var(--c-text-3)]">时空智能碳管理平台 V5.2</div>
          </div>
        </transition>
      </div>

      <!-- 搜索入口 -->
      <div class="px-3 pt-1 pb-2" v-show="!collapsed">
        <el-select v-model="searchQuery" filterable placeholder="搜索功能模块…" size="small"
          style="width: 100%" @change="goSearch" popper-class="carbon-popper">
          <el-option v-for="item in flatNav" :key="item.path" :value="item.path" :label="item.title">
            <span class="flex items-center gap-2">
              <el-icon><component :is="item.icon" /></el-icon>{{ item.title }}
            </span>
          </el-option>
        </el-select>
      </div>

      <el-scrollbar class="flex-1">
        <nav class="nav-list">
          <template v-for="group in navGroups" :key="group.label">
            <div v-show="!collapsed" class="nav-group-label">{{ group.label }}</div>
            <router-link v-for="item in group.items" :key="item.path" :to="item.path"
              class="nav-item" :class="{ active: route.path === item.path }">
              <el-tooltip :content="item.title" placement="right" :disabled="!collapsed">
                <el-icon :size="17"><component :is="item.icon" /></el-icon>
              </el-tooltip>
              <span v-show="!collapsed" class="nav-text">{{ item.title }}</span>
              <span v-if="item.auth && !auth.isLoggedIn" v-show="!collapsed" class="lock-mark">🔒</span>
            </router-link>
          </template>
        </nav>
      </el-scrollbar>

      <div class="sidebar-footer">
        <button class="collapse-btn" @click="collapsed = !collapsed">
          <el-icon :size="16"><component :is="collapsed ? Expand : Fold" /></el-icon>
        </button>
      </div>
    </aside>

    <!-- ============ 主区域 ============ -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 顶栏 -->
      <header class="topbar">
        <div class="flex items-center gap-3 min-w-0">
          <h1 class="text-[15px] font-semibold truncate">{{ route.meta.title }}</h1>
          <span class="conn-badge" :class="backendOnline ? 'online' : 'offline'">
            {{ backendOnline ? '后端已连接' : '前端独立模式' }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <el-tooltip content="示例数据管理：一键切换示例/用户数据" placement="bottom">
            <el-tag size="small" type="warning" effect="plain" round>内置示例数据</el-tag>
          </el-tooltip>
          <el-dropdown v-if="auth.isLoggedIn" @command="onUserCmd">
            <span class="user-chip">
              <el-icon><UserFilled /></el-icon>
              <span class="truncate max-w-[120px]">{{ auth.user?.username }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>{{ auth.user?.email }}</el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button v-else size="small" type="primary" round @click="router.push('/auth/login')">登录 / 注册</el-button>
        </div>
      </header>

      <!-- 路由视图（带过渡动画） -->
      <main class="flex-1 overflow-y-auto p-4 md:p-5">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import { useToast } from '@/composables/useToast'
import { probeBackend, backendOnline } from '@/api/client'
import {
  Odometer, DataAnalysis, Files, MapLocation, Guide, Grid, Histogram, Cpu,
  Coin, Box, Document, ChatDotRound, SetUp, Expand, Fold, UserFilled, SwitchButton,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const dataStore = useDataStore()
const toast = useToast()
const collapsed = ref(window.innerWidth < 900)
const searchQuery = ref('')

const navGroups = [
  {
    label: '总览',
    items: [{ path: '/dashboard', title: '数据大屏', icon: Odometer }],
  },
  {
    label: '碳核算',
    items: [
      { path: '/accounting', title: '碳排放核算', icon: DataAnalysis },
      { path: '/factorlib', title: '排放因子库', icon: Files },
    ],
  },
  {
    label: '时空分析',
    items: [
      { path: '/gis', title: 'GIS碳源热力图', icon: MapLocation },
      { path: '/trajectory', title: '轨迹碳核算', icon: Guide },
      { path: '/grid', title: '网格化监测', icon: Grid },
    ],
  },
  {
    label: '专题建模',
    items: [
      { path: '/soil', title: '土壤高光谱SOC', icon: Histogram },
      { path: '/sewage', title: '污水厂运维', icon: Cpu },
    ],
  },
  {
    label: '资产与产品',
    items: [
      { path: '/asset', title: '碳资产管理', icon: Coin },
      { path: '/pcf', title: '产品碳足迹LCA', icon: Box },
    ],
  },
  {
    label: '报告与工具',
    items: [
      { path: '/report', title: '多标准报告', icon: Document },
      { path: '/ai', title: 'AI碳管理顾问', icon: ChatDotRound, auth: true },
      { path: '/tools', title: '碳计算器', icon: SetUp },
    ],
  },
]

const flatNav = computed(() => navGroups.flatMap((g) => g.items))

function goSearch(path: string) {
  if (path) router.push(path)
  searchQuery.value = ''
}

async function onUserCmd(cmd: string) {
  if (cmd === 'logout') {
    await auth.logout()
    toast.success('已退出登录')
    router.push('/auth/login')
  }
}

onMounted(async () => {
  await probeBackend()
  if (!backendOnline) {
    console.info('[CarbonAI] 后端未连接，运行于前端独立模式（Mock 数据）')
  }
  dataStore.loadSampleData()
})
</script>

<style scoped>
.sidebar {
  width: 232px; flex-shrink: 0; display: flex; flex-direction: column;
  background: linear-gradient(180deg, #0a120f, #070d0b);
  border-right: 1px solid var(--c-border);
  transition: width 0.25s ease;
}
.sidebar.collapsed { width: 64px; }
.logo-row {
  display: flex; align-items: center; gap: 10px; padding: 16px 14px;
  border-bottom: 1px solid var(--c-border);
}
.nav-group-label {
  padding: 14px 16px 6px; font-size: 10.5px; letter-spacing: 2px;
  color: var(--c-text-3); text-transform: uppercase; user-select: none;
}
.nav-item {
  display: flex; align-items: center; gap: 10px; margin: 2px 10px;
  padding: 9px 12px; border-radius: 8px; color: var(--c-text-2);
  font-size: 13px; text-decoration: none; transition: all 0.2s;
  border: 1px solid transparent;
}
.nav-item:hover { color: var(--c-text); background: rgba(16, 185, 129, 0.07); }
.nav-item.active {
  color: var(--c-green); background: var(--c-green-soft);
  border-color: rgba(16, 185, 129, 0.25); font-weight: 600;
  box-shadow: inset 2px 0 0 var(--c-green);
}
.sidebar.collapsed .nav-item { justify-content: center; padding: 11px 0; margin: 2px 12px; }
.lock-mark { font-size: 10px; margin-left: auto; }
.sidebar-footer { padding: 10px; border-top: 1px solid var(--c-border); text-align: center; }
.collapse-btn {
  width: 100%; padding: 6px; border-radius: 8px; border: 1px solid var(--c-border);
  background: transparent; color: var(--c-text-2); cursor: pointer; transition: all 0.2s;
}
.collapse-btn:hover { color: var(--c-green); border-color: var(--c-green); }
.topbar {
  height: 54px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
  padding: 0 18px; border-bottom: 1px solid var(--c-border);
  background: rgba(10, 18, 15, 0.85); backdrop-filter: blur(10px);
}
.conn-badge {
  font-size: 11px; padding: 3px 10px; border-radius: 999px; font-weight: 500;
}
.conn-badge.online { background: var(--c-green-soft); color: var(--c-green); }
.conn-badge.offline { background: rgba(245, 158, 11, 0.1); color: var(--c-amber); }
.user-chip {
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 5px 12px; border-radius: 999px; font-size: 13px;
  background: var(--c-surface-2); border: 1px solid var(--c-border); color: var(--c-text);
}
.user-chip:hover { border-color: var(--c-green); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 900px) { .sidebar { width: 64px; } }
</style>
