export const ACCOUNTING_VERSION = 'activity-unit-v1'
export interface CheckedAccounting {
  accountingVersion: typeof ACCOUNTING_VERSION
  normalizedActivity: number
  normalizedUnit: string
  factorUnit: string
  unitCheck: 'matched' | 'converted'
  emissionUnit: 'tCO₂'
  basisStatus: 'factor-declared-unverified'
  emission: number
  confidence: 'low'
}

/** Exact, case-sensitive unit allowlist. No density, gas-basis or unknown-unit inference. */
export function calculateUnitChecked(activity: number, originalUnit: string, factor: { unit: string; factor: number; factorUnit: string; source?: string }): CheckedAccounting {
  if (!Number.isFinite(activity) || activity <= 0) throw new Error('活动数据必须为有限正数')
  if (!Number.isFinite(factor.factor) || factor.factor < 0 || factor.source === '默认排放因子') throw new Error('排放因子未识别或无效，需人工核实')
  if (factor.unit === '人·km' || factor.unit === '吨·km') throw new Error('航空/货运因子在核算映射与参考库的kg/t口径不一致，暂不自动计算')
  const tables: Record<string, { factorUnit: string; units: Record<string, number> }> = {
    MWh: { factorUnit: 'tCO₂/MWh', units: { MWh: 1, kWh: 0.001 } },
    '吨': { factorUnit: 'tCO₂/t', units: { '吨': 1, t: 1, kg: 0.001 } },
    '万m³': { factorUnit: 'tCO₂/万m³', units: { '万m³': 1, '万m3': 1, 'm³': 0.0001, m3: 0.0001 } },
    GJ: { factorUnit: 'tCO₂/GJ', units: { GJ: 1 } },
  }
  const table = tables[factor.unit]
  const unit = typeof originalUnit === 'string' ? originalUnit.trim() : ''
  if (!table || factor.factorUnit !== table.factorUnit || !Object.prototype.hasOwnProperty.call(table.units, unit)) throw new Error(`活动单位“${unit || '空白'}”与因子分母不匹配或不支持，请核对单位及大小写`)
  const scale = table.units[unit], normalizedActivity = activity * scale
  const emission = normalizedActivity * factor.factor
  if (![normalizedActivity, emission].every(Number.isFinite)) throw new Error('换算或计算结果超出有效范围')
  return { accountingVersion: ACCOUNTING_VERSION, normalizedActivity, normalizedUnit: factor.unit,
    factorUnit: factor.factorUnit, unitCheck: scale === 1 ? 'matched' : 'converted',
    emissionUnit: 'tCO₂', basisStatus: 'factor-declared-unverified', emission, confidence: 'low' }
}

export function isUnitCheckedRecord(row: any): boolean {
  if (!row || row.accountingVersion !== ACCOUNTING_VERSION || row.emissionUnit !== 'tCO₂' || row.basisStatus !== 'factor-declared-unverified') return false
  try {
    const checked = calculateUnitChecked(row.activity, row.unit, { unit: row.normalizedUnit, factor: row.factor, factorUnit: row.factorUnit, source: row.factorSource })
    return checked.unitCheck === row.unitCheck && row.confidence === 'low'
      && Math.abs(checked.normalizedActivity - row.normalizedActivity) <= Math.max(1, checked.normalizedActivity) * 1e-12
      && typeof row.emission === 'number' && Math.abs(checked.emission - row.emission) <= Math.max(1, checked.emission) * 1e-12
  } catch { return false }
}

/** Read-only compatibility: never recalculate or migrate legacy/sample records. */
export function accountingUnitSummary(rows: readonly any[]) {
  const checked = rows.filter(isUnitCheckedRecord).length
  if (rows.length && checked === rows.length) return { unit: 'tCO₂', note: '仅活动单位已按规则校验；CO₂为因子声明口径，因子来源未经独立核验，不能认定为完整温室气体CO₂e。' }
  if (checked) return { unit: '吨（口径待核实）', note: '当前记录混合新CO₂结果与历史未核验口径，数值合计不可作为同口径正式结果。' }
  return { unit: 'tCO₂e', note: '历史缓存或内置示例沿用原标示tCO₂e；本轮未重算，单位及气体口径仍待核实。' }
}
