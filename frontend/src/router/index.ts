import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { guest: true },
    children: [
      { path: 'login', name: 'login', component: () => import('@/views/auth/LoginView.vue'), meta: { title: '登录' } },
      { path: 'register', name: 'register', component: () => import('@/views/auth/RegisterView.vue'), meta: { title: '注册' } },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '数据大屏', icon: 'Odometer' } },
      { path: 'accounting', name: 'accounting', component: () => import('@/views/AccountingView.vue'), meta: { title: '碳排放核算', icon: 'DataAnalysis' } },
      { path: 'factorlib', name: 'factorlib', component: () => import('@/views/FactorLibView.vue'), meta: { title: '排放因子库', icon: 'Files' } },
      { path: 'gis', name: 'gis', component: () => import('@/views/GisView.vue'), meta: { title: 'GIS碳源热力图', icon: 'MapLocation' } },
      { path: 'trajectory', name: 'trajectory', component: () => import('@/views/TrajectoryView.vue'), meta: { title: '轨迹碳核算', icon: 'Guide' } },
      { path: 'grid', name: 'grid', component: () => import('@/views/GridView.vue'), meta: { title: '网格化监测', icon: 'Grid' } },
      { path: 'soil', name: 'soil', component: () => import('@/views/SoilView.vue'), meta: { title: '土壤高光谱SOC', icon: 'Histogram' } },
      { path: 'sewage', name: 'sewage', component: () => import('@/views/SewageView.vue'), meta: { title: '污水厂运维', icon: 'Cpu' } },
      { path: 'asset', name: 'asset', component: () => import('@/views/AssetView.vue'), meta: { title: '碳资产管理', icon: 'Coin' } },
      { path: 'pcf', name: 'pcf', component: () => import('@/views/PcfView.vue'), meta: { title: '产品碳足迹LCA', icon: 'Box' } },
      { path: 'report', name: 'report', component: () => import('@/views/ReportView.vue'), meta: { title: '多标准报告', icon: 'Document' } },
      { path: 'ai', name: 'ai', component: () => import('@/views/AiAdvisorView.vue'), meta: { title: 'AI碳管理顾问', icon: 'ChatDotRound', requireAuth: true } },
      { path: 'tools', name: 'tools', component: () => import('@/views/ToolsView.vue'), meta: { title: '碳计算器', icon: 'SetUp' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const auth = useAuthStore()
  // 路由守卫：未登录用户仅可访问登录/注册页
  if (to.meta.requireAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // 已登录访问登录页 → 回首页
  if ((to.name === 'login' || to.name === 'register') && auth.isLoggedIn) {
    return { path: '/' }
  }
  document.title = `${to.meta.title ?? ''} · CarbonAI V5.2 时空智能碳管理平台`
})

export default router
