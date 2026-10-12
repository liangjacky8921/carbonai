<template>
  <div class="app-shell flex min-h-[100dvh] overflow-hidden">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <!-- ============ 侧边导航 ============ -->
    <aside class="sidebar" :class="{ collapsed: collapsed }">
      <div class="logo-row">
        <img src="/favicon.svg" class="w-9 h-9" alt="CarbonAI" />
        <transition name="fade">
          <div v-show="!collapsed" class="leading-tight">
            <div class="text-[15px] font-bold tracking-wide">CarbonAI</div>
            <div class="text-[10px] text-[var(--c-text-3)]">时空智能碳管理平台 V6.0</div>
          </div>
        </transition>
      </div>

      <!-- 搜索入口 -->
      <div class="px-3 pt-1 pb-2" v-show="!collapsed">
        <el-select v-model="searchQuery" filterable placeholder="搜索功能模块…" size="small" aria-label="搜索功能模块"
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
        <button class="collapse-btn" :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'"
          :aria-expanded="!collapsed" @click="collapsed = !collapsed">
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
          <span class="conn-badge" :class="backendOnline ? 'online' : 'offline'" role="status">
            <span class="conn-wide">{{ backendOnline ? '后端已连接' : '离线降级（示例数据）' }}</span>
            <span class="conn-short">{{ backendOnline ? '在线' : '离线' }}</span>
          </span>
        </div>
        <div class="topbar-actions flex items-center gap-3">
          <el-tooltip :content="hasUserData ? '清空浏览器中的用户数据并切换回完整示例数据集' : '当前全部使用示例数据'" placement="bottom">
            <el-button size="small" type="warning" plain round :disabled="!hasUserData"
              aria-label="清空用户数据并切回示例数据" @click="onToggleSample">
              {{ hasUserData ? '用户数据 · 切回示例' : '当前：示例数据' }}
            </el-button>
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
      <main id="main-content" class="main-content flex-1 overflow-y-auto p-4 md:p-5" tabindex="-1">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
      <footer class="main-footer">
        <IcpRecord />
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import { useToast } from '@/composables/useToast'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { backendOnline } from '@/api/client'
import IcpRecord from '@/components/IcpRecord.vue'
import {
  Odometer, DataAnalysis, Files, MapLocation, Guide, Grid, Histogram, Cpu,
  Coin, Box, Document, ChatDotRound, SetUp, Expand, Fold, UserFilled, SwitchButton,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const dataStore = useDataStore()
const toast = useToast()
const { confirmAction } = useConfirmAction()
const collapsed = ref(window.innerWidth < 900)
const searchQuery = ref('')

const hasUserData = computed(() =>
  Object.values(dataStore.source || {}).some((v) => v === 'user')
)

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

async function onToggleSample() {
  if (!hasUserData.value) return
  const confirmed = await confirmAction(
    '这会永久删除当前浏览器中保存的排放、轨迹、点位、边界、BOM 和产品碳足迹数据。此操作无法撤销。',
    '切回完整示例数据？',
    '清空并切换',
  )
  if (!confirmed) return
  dataStore.resetAllToSample()
  toast.success('已切换回完整示例数据集（本地用户数据已清空）')
}

onMounted(() => {
  // 后端探测已前移到 main.ts（挂载前执行），这里只做日志与示例数据加载
  if (!backendOnline.value) {
    console.info('[CarbonAI] 后端未连接，进入离线降级模式（示例数据）')
  }
  dataStore.loadSampleData()
})
</script>

<style scoped>
.sidebar {
  width: 232px; flex-shrink: 0; display: flex; flex-direction: column;
  background: linear-gradient(180deg, rgba(10, 18, 15, 0.82), rgba(7, 13, 11, 0.88));
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border-right: 1px solid var(--c-border);
  transition: width var(--dur-micro) var(--ease-apple);
}
.skip-link {
  position: fixed; top: 8px; left: 50%; z-index: 10000; transform: translate(-50%, -150%);
  padding: 8px 14px; border-radius: var(--radius-sm); background: var(--c-green); color: #04100c;
  font-weight: 700; text-decoration: none;
}
.skip-link:focus { transform: translate(-50%, 0); }
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
  font-size: 13px; text-decoration: none;
  transition: color var(--dur-micro) var(--ease-apple), background-color var(--dur-micro) var(--ease-apple), border-color var(--dur-micro) var(--ease-apple), transform var(--dur-micro) var(--ease-apple);
  border: 1px solid transparent;
}
.nav-item:hover { color: var(--c-text); background: rgba(16, 185, 129, 0.07); transform: translateX(2px); }
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
  background: transparent; color: var(--c-text-2); cursor: pointer;
  transition: color var(--dur-micro) var(--ease-apple), border-color var(--dur-micro) var(--ease-apple), background-color var(--dur-micro) var(--ease-apple);
}
.collapse-btn:hover { color: var(--c-green); border-color: var(--c-green); }
.topbar {
  height: 54px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
  padding: 0 18px; border-bottom: 0.5px solid var(--c-border);
  background: rgba(13, 23, 20, 0.72);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
}
.conn-badge {
  font-size: 11px; padding: 3px 10px; border-radius: 999px; font-weight: 500;
}
.conn-badge.online { background: var(--c-green-soft); color: var(--c-green); }
.conn-badge.offline { background: rgba(245, 158, 11, 0.1); color: var(--c-amber); }
.conn-short { display: none; }
.user-chip {
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 5px 12px; border-radius: 999px; font-size: 13px;
  background: var(--c-surface-2); border: 1px solid var(--c-border); color: var(--c-text);
}
.user-chip:hover { border-color: var(--c-green); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 900px) {
  .sidebar { width: 64px; }
  .logo-row { justify-content: center; }
  .logo-row > div,
  .sidebar > .px-3,
  .nav-group-label,
  .nav-text,
  .lock-mark { display: none !important; }
  .nav-item { justify-content: center; padding: 11px 0; margin-inline: 12px; }
  .topbar { padding-inline: 12px; }
}
@media (max-width: 640px) {
  .app-shell { min-height: 100dvh; }
  .sidebar, .sidebar.collapsed { width: 56px; }
  .logo-row { padding: 12px 10px; }
  .sidebar.collapsed .nav-item, .nav-item { margin-inline: 8px; }
  .topbar {
    min-height: 88px; height: auto; align-items: stretch; flex-direction: column;
    justify-content: center; gap: 8px; padding-block: 8px;
  }
  .topbar > div:first-child { width: 100%; justify-content: space-between; }
  .topbar-actions { width: 100%; justify-content: space-between; gap: 8px; }
  .topbar-actions .el-button { max-width: 154px; min-width: 0; }
  .conn-wide { display: none; }
  .conn-short { display: inline; }
  .main-content { padding: 12px; }
  .main-footer { padding-inline: 8px; }
}
.main-footer {
  flex-shrink: 0; padding: 8px 18px; border-top: 1px solid var(--c-border);
  background: rgba(10, 18, 15, 0.6); text-align: center;
}
</style>
