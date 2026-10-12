/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
declare module 'leaflet.heat'
interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_APP_TITLE: string
  readonly VITE_MONITORING_SSE_URL?: string
  readonly VITE_ICP_BEIAN?: string
  readonly VITE_POLICE_BEIAN?: string
}
