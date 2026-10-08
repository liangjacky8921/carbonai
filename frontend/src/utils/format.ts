/** 全局单位常量（全站统一显示口径，后续改单位只改这一处） */
export const UNIT_TCO2E = 'tCO₂e'
export const UNIT_KGCO2E = 'kgCO₂e'
export const UNIT_WANTCO2E = '万tCO₂e'

/** 监测模块 CONFIG（对应 monitoring-api-spec.md 第七节，禁止在页面硬编码） */
const _env = (import.meta as any).env || {}
export const MONITORING_CONFIG = {
  // 实时流开关：仅当显式配置了 VITE_MONITORING_SSE_URL（生产接入真实服务）或开发模式（本地跑 server.py 演示）才启用；
  // 生产环境默认关闭，避免 HTTPS 页面对不存在的 localhost 服务无限重连、控制台报错刷屏
  realtime_enabled: !!_env.VITE_MONITORING_SSE_URL || !!_env.DEV,
  // SSE 实时流地址：优先 Vite env var，fallback 到本地模拟服务
  sse_url: _env.VITE_MONITORING_SSE_URL || 'http://localhost:8765/stream',
  // 阈值（kg/h，co2e_rate 判定）
  warning_threshold: 50,
  critical_threshold: 80,
  // 冷却窗口（毫秒）
  warning_cooldown_ms: 5 * 60 * 1000,
  critical_cooldown_ms: 10 * 60 * 1000,
  // 断线重连上限：连续失败 N 次后停止（EventSource 自带自动重连，这里防无限重试刷屏）
  max_retries: 3,
  // 模拟点位坐标（示例数据 4403_001234_BL_01 ≈ 深圳光明区锅炉）
  demo_point_lat: 22.75,
  demo_point_lon: 113.85,
  // 推送频率（秒），前端节流参考
  push_interval_seconds: 5,
}

/** 数字格式化工具 */
export function fmt(n: number, digits = 2): string {
  if (!isFinite(n)) return '—'
  if (Math.abs(n) >= 100000) return (n / 10000).toFixed(2) + ' 万'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('zh-CN')
}
export function fmtScopeLabel(s: string): string {
  return s.replace('Scope 1', '范围一(S1)').replace('Scope 2', '范围二(S2)').replace('Scope 3', '范围三(S3)')
}
