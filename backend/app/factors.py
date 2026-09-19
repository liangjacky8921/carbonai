"""排放因子集中管理。

因子数据在此维护，供核算接口（emissions/upload）与因子库接口（/api/factors）
共用，避免前后端各存一份。因子数值与来源均可在对应官方/标准文档中追溯。
"""
from typing import Optional


# ---------------------------------------------------------------
# 核算匹配因子：按排放源名称关键词匹配，用于 emissions/upload 计算。
# factor_unit 即 activity * factor 后得到的排放量单位。
# ---------------------------------------------------------------
ACCOUNTING_FACTORS: list[dict] = [
    {"name": "烟煤", "aliases": ["煤", "coal"], "factor": 1.9003,
     "unit": "吨", "factor_unit": "tCO₂/t", "scope": "Scope 1", "source": "国家发改委气候司"},
    {"name": "无烟煤", "aliases": ["anthracite"], "factor": 2.53,
     "unit": "吨", "factor_unit": "tCO₂/t", "scope": "Scope 1", "source": "国家发改委气候司"},
    {"name": "柴油", "aliases": ["diesel"], "factor": 3.1605,
     "unit": "吨", "factor_unit": "tCO₂/t", "scope": "Scope 1", "source": "IPCC 2006"},
    {"name": "汽油", "aliases": ["gasoline"], "factor": 2.9251,
     "unit": "吨", "factor_unit": "tCO₂/t", "scope": "Scope 1", "source": "IPCC 2006"},
    {"name": "天然气", "aliases": ["natural gas"], "factor": 21.84,
     "unit": "万m³", "factor_unit": "tCO₂/万m³", "scope": "Scope 1", "source": "IPCC 2006"},
    {"name": "外购电力", "aliases": ["电力", "electricity"], "factor": 0.5703,
     "unit": "MWh", "factor_unit": "tCO₂/MWh", "scope": "Scope 2", "source": "中国电网2023(南方)"},
    {"name": "热力", "aliases": ["蒸汽", "steam"], "factor": 0.11,
     "unit": "GJ", "factor_unit": "tCO₂/GJ", "scope": "Scope 2", "source": "GB/T 32151"},
    {"name": "航空客运", "aliases": ["飞行", "航空", "flight"], "factor": 0.115,
     "unit": "人·km", "factor_unit": "tCO₂/人·km", "scope": "Scope 3", "source": "ICAO"},
    {"name": "公路货运", "aliases": ["卡车", "货运"], "factor": 0.078,
     "unit": "吨·km", "factor_unit": "tCO₂/吨·km", "scope": "Scope 3", "source": "GLEC 3.0"},
]

# 默认兜底：当排放源名称无法匹配任何已知因子时使用，标记为低置信，供后续人工复核。
DEFAULT_FACTOR = {
    "name": "未识别排放源", "factor": 1.0, "unit": "吨",
    "factor_unit": "tCO₂/t", "scope": "Scope 3", "source": "默认排放因子",
}


def match_factor(name: str) -> dict:
    """按排放源名称匹配核算因子；命中别名即返回，否则返回默认因子。"""
    normalized = str(name).lower().replace(" ", "").replace("-", "").replace("_", "")
    for item in ACCOUNTING_FACTORS:
        aliases = [item["name"].lower()] + [a.lower() for a in item["aliases"]]
        for alias in aliases:
            if normalized and alias and alias in normalized:
                return item
    return dict(DEFAULT_FACTOR, name=name or DEFAULT_FACTOR["name"])


# ---------------------------------------------------------------
# 因子库：供 /api/factors 展示与导出，字段与前端 FactorItem 一致。
# ---------------------------------------------------------------
FACTOR_LIB: list[dict] = [
    {"name": "电网排放因子-南方", "value": 0.5703, "unit": "kgCO₂/kWh",
     "source": "中国电网2023", "year": "2023", "region": "广东、广西、云南、贵州、海南", "dqr": 5},
    {"name": "电网排放因子-华东", "value": 0.589, "unit": "kgCO₂/kWh",
     "source": "中国电网2023", "year": "2023", "region": "上海、江苏、浙江、安徽、福建", "dqr": 5},
    {"name": "电网排放因子-华北", "value": 0.741, "unit": "kgCO₂/kWh",
     "source": "中国电网2023", "year": "2023", "region": "北京、天津、河北、山西、山东、蒙西", "dqr": 5},
    {"name": "电网排放因子-华中", "value": 0.525, "unit": "kgCO₂/kWh",
     "source": "中国电网2023", "year": "2023", "region": "河南、湖北、湖南、江西", "dqr": 4},
    {"name": "电网排放因子-西北", "value": 0.612, "unit": "kgCO₂/kWh",
     "source": "中国电网2023", "year": "2023", "region": "陕西、甘肃、青海、宁夏、新疆", "dqr": 4},
    {"name": "电网排放因子-东北", "value": 0.776, "unit": "kgCO₂/kWh",
     "source": "中国电网2023", "year": "2023", "region": "辽宁、吉林、黑龙江、蒙东", "dqr": 4},
    {"name": "电力-全国平均（运行口径）", "value": 0.5366, "unit": "kgCO₂/kWh",
     "source": "生态环境部 2024 公告", "year": "2022", "region": "全国", "dqr": 5},
    {"name": "电力-全国碳足迹（生命周期口径）", "value": 0.5777, "unit": "kgCO₂e/kWh",
     "source": "生态环境部·国家统计局·国家能源局", "year": "2024", "region": "全国", "dqr": 4},
    {"name": "烟煤排放因子", "value": 1.9003, "unit": "tCO₂/t",
     "source": "国家发改委气候司", "year": "2015", "region": "全国通用", "dqr": 4},
    {"name": "无烟煤排放因子", "value": 2.53, "unit": "tCO₂/t",
     "source": "国家发改委气候司", "year": "2015", "region": "全国通用", "dqr": 4},
    {"name": "柴油排放因子", "value": 3.1605, "unit": "tCO₂/t",
     "source": "IPCC 2006", "year": "2006", "region": "全球", "dqr": 5},
    {"name": "汽油排放因子", "value": 2.9251, "unit": "tCO₂/t",
     "source": "IPCC 2006", "year": "2006", "region": "全球", "dqr": 5},
    {"name": "天然气排放因子", "value": 21.84, "unit": "tCO₂/万m³",
     "source": "IPCC 2006", "year": "2006", "region": "全球", "dqr": 5},
    {"name": "货运-重型柴油车", "value": 0.078, "unit": "kgCO₂/t·km",
     "source": "Ecoinvent 3.9", "year": "2022", "region": "全球", "dqr": 4},
    {"name": "货运-轻型货车", "value": 0.156, "unit": "kgCO₂/t·km",
     "source": "Ecoinvent 3.9", "year": "2022", "region": "全球", "dqr": 4},
    {"name": "航空-短途(<1500km)", "value": 0.115, "unit": "kgCO₂/人·km",
     "source": "ICAO", "year": "2021", "region": "全球", "dqr": 4},
    {"name": "航空-长途(>1500km)", "value": 0.092, "unit": "kgCO₂/人·km",
     "source": "ICAO", "year": "2021", "region": "全球", "dqr": 4},
    {"name": "热力(蒸汽)", "value": 0.11, "unit": "tCO₂/GJ",
     "source": "GB/T 32151", "year": "2015", "region": "全国通用", "dqr": 3},
    {"name": "水泥-熟料生产", "value": 0.525, "unit": "tCO₂/t熟料",
     "source": "IPCC 2019 Refinement", "year": "2019", "region": "全球", "dqr": 5},
    {"name": "钢铁-高炉转炉", "value": 1.68, "unit": "tCO₂/t粗钢",
     "source": "Ecoinvent 3.9", "year": "2022", "region": "全球", "dqr": 4},
    {"name": "冷链货运-冷藏车", "value": 0.132, "unit": "kgCO₂/t·km",
     "source": "Ecoinvent 3.9", "year": "2022", "region": "全球", "dqr": 3},
    {"name": "电力-全国平均（区域优先）", "value": 0.5703, "unit": "kgCO₂/kWh",
     "source": "生态环境部", "year": "2024", "region": "全国（建议优先使用区域电网因子）", "dqr": 4},
]