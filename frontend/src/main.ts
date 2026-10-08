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

// 挂载前先探测后端：Vue 子组件 onMounted 先于父组件触发，
// 若放在 MainLayout 里探测，各视图读到的在线标志可能是过期的 false
probeBackend()

app.mount('#app')
