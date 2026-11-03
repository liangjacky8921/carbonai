"""Conservative activity-unit validation; no new factors or gas-basis conversion."""
import math

ACCOUNTING_VERSION = 'activity-unit-v1'
TABLES = {
    'MWh': ('tCO₂/MWh', {'MWh': 1, 'kWh': 0.001}),
    '吨': ('tCO₂/t', {'吨': 1, 't': 1, 'kg': 0.001}),
    '万m³': ('tCO₂/万m³', {'万m³': 1, '万m3': 1, 'm³': 0.0001, 'm3': 0.0001}),
    'GJ': ('tCO₂/GJ', {'GJ': 1}),
}


def calculate_unit_checked(activity, original_unit, factor):
    if not math.isfinite(activity) or activity <= 0:
        raise ValueError('活动数据必须为有限正数')
    if not math.isfinite(factor['factor']) or factor['factor'] < 0 or factor['source'] == '默认排放因子':
        raise ValueError('排放因子未识别或无效，需人工核实')
    if factor['unit'] in {'人·km', '吨·km'}:
        raise ValueError('航空/货运因子在核算映射与参考库的kg/t口径不一致，暂不自动计算')
    table = TABLES.get(factor['unit'])
    unit = original_unit.strip() if isinstance(original_unit, str) else ''
    if not table or factor['factor_unit'] != table[0] or unit not in table[1]:
        raise ValueError(f'活动单位“{unit or "空白"}”与因子分母不匹配或不支持，请核对单位及大小写')
    scale = table[1][unit]
    normalized = activity * scale
    emission = normalized * factor['factor']
    if not math.isfinite(normalized) or not math.isfinite(emission):
        raise ValueError('换算或计算结果超出有效范围')
    return dict(accountingVersion=ACCOUNTING_VERSION, normalizedActivity=normalized,
                normalizedUnit=factor['unit'], factorUnit=factor['factor_unit'],
                unitCheck='matched' if scale == 1 else 'converted', emissionUnit='tCO₂',
                basisStatus='factor-declared-unverified', emission=emission, confidence='low')
