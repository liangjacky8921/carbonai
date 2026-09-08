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
