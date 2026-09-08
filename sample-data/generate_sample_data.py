# -*- coding: utf-8 -*-
"""CarbonAI v5.2 — 预置示例数据生成器
生成 5 组完整可演示的示例数据（均标注"示例数据"标识，非真实企业数据）：
  1) enterprise-emissions.json   虚拟企业年度碳排放（按年份/月份/部门/排放源/Scope）
  2) fleet-gps-trajectory.csv    车队 GPS 轨迹（深圳-惠州干线，3辆车）
  3) emission-points.csv         大湾区排放点位（企业名称/纬度/经度/排放量/行业）
  4) forest-boundary.geojson     林地边界（惠州象头山南麓虚拟边界）
  5) product-bom.json            产品 BOM 清单 + LCA 各阶段排放
运行: python generate_sample_data.py
"""
import json, csv, random, math, os

random.seed(20260908)
OUT = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------
# 1. 虚拟企业年度碳排放（2022-2026，按月×部门×排放源）
# ---------------------------------------------------------------
DEPARTMENTS = [
    {"name": "生产一部", "sources": [
        {"source": "烟煤燃烧", "unit": "吨", "factor": 1.9003, "scope": "Scope 1", "base": 420.0},
        {"source": "柴油发电机组", "unit": "吨", "factor": 3.1605, "scope": "Scope 1", "base": 65.0},
        {"source": "外购电力", "unit": "MWh", "factor": 0.5703, "scope": "Scope 2", "base": 3100.0},
    ]},
    {"name": "生产二部", "sources": [
        {"source": "天然气锅炉", "unit": "万m³", "factor": 21.84, "scope": "Scope 1", "base": 28.0},
        {"source": "外购电力", "unit": "MWh", "factor": 0.5703, "scope": "Scope 2", "base": 2450.0},
        {"source": "外购热力", "unit": "GJ", "factor": 0.11, "scope": "Scope 2", "base": 880.0},
    ]},
    {"name": "物流运输部", "sources": [
        {"source": "公路货运", "unit": "吨·km", "factor": 0.078, "scope": "Scope 3", "base": 96000.0},
        {"source": "柴油重卡", "unit": "吨", "factor": 3.1605, "scope": "Scope 1", "base": 96.0},
        {"source": "商务飞行", "unit": "人·km", "factor": 0.115, "scope": "Scope 3", "base": 52000.0},
    ]},
    {"name": "研发与办公楼", "sources": [
        {"source": "外购电力", "unit": "MWh", "factor": 0.5703, "scope": "Scope 2", "base": 760.0},
        {"source": "天然气食堂", "unit": "万m³", "factor": 21.84, "scope": "Scope 1", "base": 4.2},
    ]},
]

records = []
for year in range(2022, 2027):
    year_trend = 1.0 - (year - 2022) * 0.045  # 逐年减排趋势
    for month in range(1, 13):
        season = 1.0 + 0.18 * math.cos((month - 1) / 12 * 2 * math.pi)  # 夏冬高峰
        if year == 2026 and month > 6:
            continue  # 示例仅到 2026-06
        for dept in DEPARTMENTS:
            for s in dept["sources"]:
                activity = round(s["base"] / 12 * season * year_trend * random.uniform(0.9, 1.1), 2)
                emission = round(activity * s["factor"], 2)  # activity×factor = tCO₂e（factor 单位与 activity 匹配）
                records.append({
                    "year": year, "month": month, "department": dept["name"],
                    "source": s["source"], "activity": activity, "unit": s["unit"],
                    "factor": s["factor"], "scope": s["scope"], "emission": emission,
                    "factorSource": "国家发改委气候司 / IPCC 2006 / 中国电网2023 / GLEC 3.0",
                })

enterprise = {
    "_meta": {
        "dataType": "SAMPLE", "sampleLabel": "示例数据",
        "description": "虚拟企业「绿湾智造科技有限公司」年度碳排放示例数据（2022-2026H1），按月份/部门/排放源/Scope组织，仅供演示，非真实企业数据",
        "company": "绿湾智造科技有限公司（虚拟）",
        "generatedAt": "2026-09-08", "generator": "CarbonAI sample-data generator v5.2",
    },
    "records": records,
}
with open(os.path.join(OUT, "enterprise-emissions.json"), "w", encoding="utf-8") as f:
    json.dump(enterprise, f, ensure_ascii=False, indent=1)

# ---------------------------------------------------------------
# 2. 车队 GPS 轨迹 CSV（深圳盐田港 → 惠州仲恺，3辆车）
# ---------------------------------------------------------------
def haversine_step(lat, lon, bearing_deg, dist_km):
    R = 6371.0
    b = math.radians(bearing_deg)
    d = dist_km / R
    la, lo = math.radians(lat), math.radians(lon)
    la2 = math.asin(math.sin(la) * math.cos(d) + math.cos(la) * math.sin(d) * math.cos(b))
    lo2 = lo + math.atan2(math.sin(b) * math.sin(d) * math.cos(la), math.cos(d) - math.sin(la) * math.sin(la2))
    return math.degrees(la2), math.degrees(lo2)

vehicles = [
    {"id": "粤B·D8261", "type": "重型柴油车", "fuel": "diesel", "load": 18.5, "start": (22.578, 114.262), "bearing": 52},
    {"id": "粤B·F1037", "type": "轻型货车", "fuel": "diesel", "load": 3.2, "start": (22.546, 114.241), "bearing": 55},
    {"id": "粤L·Q5580", "type": "冷链货车", "fuel": "diesel", "load": 9.8, "start": (22.989, 114.415), "bearing": 340},
]
rows = []
for v in vehicles:
    lat, lon = v["start"]
    t_min = 8 * 60
    for i in range(60):
        speed = random.choice([35, 42, 48, 55, 60, 52, 45, 38, 62, 50])
        dist = speed * 15 / 60.0
        lat, lon = haversine_step(lat, lon, v["bearing"] + random.uniform(-6, 6), dist)
        hh, mm = divmod(t_min, 60)
        rows.append([f"2026-06-10 {hh:02d}:{mm:02d}:00", f"{lat:.5f}", f"{lon:.5f}",
                     speed, v["load"], v["type"], v["fuel"], v["id"]])
        t_min += 15

with open(os.path.join(OUT, "fleet-gps-trajectory.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["# 示例数据：车队GPS轨迹（深圳-惠州干线，3辆车，15分钟采样）"])
    w.writerow(["timestamp", "lat", "lon", "speed", "load", "vehicle_type", "fuel_type", "vehicle_id"])
    w.writerows(rows)

# ---------------------------------------------------------------
# 3. 大湾区排放点位 CSV（40个虚拟企业）
# ---------------------------------------------------------------
GBA_CORES = [
    ("深圳", 22.543, 114.058), ("广州", 23.129, 113.264), ("东莞", 23.021, 113.752),
    ("佛山", 23.022, 113.122), ("惠州", 23.111, 114.416), ("珠海", 22.271, 113.577),
    ("中山", 22.517, 113.393), ("江门", 22.578, 113.081), ("肇庆", 23.047, 112.471),
    ("香港", 22.319, 114.169), ("澳门", 22.198, 113.544),
]
INDUSTRIES = ["电子制造", "纺织印染", "食品加工", "化工", "机械制造", "电力", "建材", "印刷包装"]
with open(os.path.join(OUT, "emission-points.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["# 示例数据：粤港澳大湾区排放点位（40家虚拟企业）"])
    w.writerow(["企业名称", "lat", "lon", "排放量", "所属行业", "城市"])
    for i in range(40):
        city, clat, clon = GBA_CORES[i % len(GBA_CORES)]
        lat = clat + random.uniform(-0.09, 0.09)
        lon = clon + random.uniform(-0.11, 0.11)
        w.writerow([f"{city}示例企业{i+1:02d}号（虚拟）", f"{lat:.5f}", f"{lon:.5f}",
                    round(random.uniform(2.0, 48.0), 1), random.choice(INDUSTRIES), city])

# ---------------------------------------------------------------
# 4. 林地边界 GeoJSON（惠州象头山南麓，虚拟演示边界）
# ---------------------------------------------------------------
ring = []
clat, clon = 23.235, 114.318
for k in range(12):
    ang = k / 12 * 2 * math.pi
    r = 0.018 * (1 + 0.35 * math.sin(3 * ang))
    ring.append([round(clon + r * math.cos(ang), 5), round(clat + r * 0.85 * math.sin(ang), 5)])
ring.append(ring[0])
geojson = {
    "type": "FeatureCollection",
    "_meta": {"dataType": "SAMPLE", "sampleLabel": "示例数据", "description": "虚拟林地演示边界（惠州象头山南麓附近），非真实权属边界"},
    "features": [{
        "type": "Feature",
        "properties": {"name": "示例林地A区（虚拟）", "forestType": "亚热带常绿阔叶林", "year": 2026},
        "geometry": {"type": "Polygon", "coordinates": [ring]},
    }],
}
with open(os.path.join(OUT, "forest-boundary.geojson"), "w", encoding="utf-8") as f:
    json.dump(geojson, f, ensure_ascii=False, indent=1)

# ---------------------------------------------------------------
# 5. 产品 BOM 清单 + LCA 阶段排放
# ---------------------------------------------------------------
bom = {
    "_meta": {
        "dataType": "SAMPLE", "sampleLabel": "示例数据",
        "description": "虚拟产品「智能碳监测终端 CT-200」BOM 清单与 LCA 各阶段排放（示例）",
    },
    "product": {"name": "智能碳监测终端 CT-200（虚拟）", "unit": "件 (pcs)", "annualOutput": 10000,
                "standard": "ISO 14067:2018", "region": "cn-mainland"},
    "lcaStages": [
        {"stage": "raw", "name": "原材料获取", "emission": 12.5, "mainSource": "PCB/铝外壳/线材 (Ecoinvent 3.9)"},
        {"stage": "mfg", "name": "生产制造", "emission": 28.3, "mainSource": "组装线电力+锡焊工艺"},
        {"stage": "tpt", "name": "运输分销", "emission": 5.7, "mainSource": "干线公路货运 (GLEC 3.0)"},
        {"stage": "use", "name": "使用阶段", "emission": 18.2, "mainSource": "5年运行电力(南方电网)"},
        {"stage": "eol", "name": "废弃回收", "emission": 3.1, "mainSource": "拆解回收+无害化处理"},
    ],
    "bom": [
        {"no": 1, "part": "主控PCB板", "spec": "4层板 FR-4", "qty": 1, "unit": "块", "material": "覆铜板", "supplier": "示例供应商A（虚拟）", "emission": 4.8},
        {"no": 2, "part": "铝合金外壳", "spec": "6061-T6 阳极氧化", "qty": 1, "unit": "个", "material": "铝合金", "supplier": "示例供应商B（虚拟）", "emission": 3.6},
        {"no": 3, "part": "NDIR CO₂传感器", "spec": "0-5000ppm ±30ppm", "qty": 1, "unit": "颗", "material": "MEMS", "supplier": "示例供应商C（虚拟）", "emission": 2.4},
        {"no": 4, "part": "温湿度传感器", "spec": "SHT30", "qty": 1, "unit": "颗", "material": "MEMS", "supplier": "示例供应商C（虚拟）", "emission": 0.6},
        {"no": 5, "part": "锂电池组", "spec": "18650×2 3.7V 5000mAh", "qty": 1, "unit": "组", "material": "锂电", "supplier": "示例供应商D（虚拟）", "emission": 1.9},
        {"no": 6, "part": "线材与连接器", "spec": "USB-C / 端子排", "qty": 6, "unit": "件", "material": "PVC+铜", "supplier": "示例供应商E（虚拟）", "emission": 0.8},
        {"no": 7, "part": "说明书与包装", "spec": "再生纸+蜂窝纸缓冲", "qty": 1, "unit": "套", "material": "纸制品", "supplier": "示例供应商F（虚拟）", "emission": 0.4},
    ],
    "benchmark": {"industryAvg": 1.30, "industryBest": 0.55, "euPef": 0.70},
}
with open(os.path.join(OUT, "product-bom.json"), "w", encoding="utf-8") as f:
    json.dump(bom, f, ensure_ascii=False, indent=1)

total = sum(r["emission"] for r in records)
print(f"[OK] enterprise-emissions.json  {len(records)} 条记录, 2022-2026H1 合计 {total:.0f} tCO2e")
print(f"[OK] fleet-gps-trajectory.csv   {len(rows)} 条轨迹点 (3辆车)")
print(f"[OK] emission-points.csv        40 个排放点位 (大湾区11城)")
print(f"[OK] forest-boundary.geojson    林地边界 1 个多边形")
print(f"[OK] product-bom.json           BOM {len(bom['bom'])} 项 + LCA 5 阶段")
