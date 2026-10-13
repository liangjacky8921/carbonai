import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'leaflet/dist/leaflet.css'
import './styles/tailwind.css'
import './styles/theme.css'
import App from './App.vue'
import router from './router'
import ToastHost from './components/ToastHost.vue'
import { UNIT_TCO2E, UNIT_KGCO2E, UNIT_WANTCO2E } from './utils/format'
import { probeBackend } from './api/client'

const app = createApp(App)
// 注册全局单位常量，template 里可直接用 {{ UNIT_TCO2E }}
app.config.globalProperties.UNIT_TCO2E = UNIT_TCO2E
app.config.globalProperties.UNIT_KGCO2E = UNIT_KGCO2E
app.config.globalProperties.UNIT_WANTCO2E = UNIT_WANTCO2E
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.component('ToastHost', ToastHost)

// 公开首页不依赖业务 API；首次进入业务路由时再执行一次后端探测。
let backendProbeStarted = false
router.afterEach((to) => {
  if (to.name === 'home' || backendProbeStarted) return
  backendProbeStarted = true
  void probeBackend()
})

app.mount('#app')
