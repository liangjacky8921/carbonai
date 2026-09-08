# -*- coding: utf-8 -*-
"""
CarbonAI v5.2 — 数据预处理脚本
从原始 xlsx 生成前端内嵌用的 JSON 数据文件。

输入:
  1) 土壤光谱: 土壤光谱数据处理结果_第三批.xlsx
     -> data/soil_spectral.json    (46 样本 x 256 波段均值光谱 + 分组 + 元数据)
  2) 污水厂月报: 麻陂污水厂运行月报表 2022-2026
     -> data/sewage.json           (逐月 处理水量/水质进出去除率/污泥/用电 时间序列)

输出目录: D:/research/data/
用法:  python build_data.py
"""
import os
import json
import glob
import re
import numpy as np
import pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE, "data")
JS_DIR = os.path.join(BASE, "js")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(JS_DIR, exist_ok=True)


def write_json_and_js(name, obj):
    """同时写出 .json (供 Python/分析用) 与 .js (前端内嵌, 避免 file:// 下 fetch 受限)"""
    jp = os.path.join(DATA_DIR, name + ".json")
    with open(jp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    jsp = os.path.join(JS_DIR, "data-" + name + ".js")
    gvar = name.upper() + "_DATA"
    with open(jsp, "w", encoding="utf-8") as f:
        f.write("/* CarbonAI v5.2 — 自动生成数据 (勿手改, 由 build_data.py 生成) */\n")
        f.write("window." + gvar + " = " + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n")
    return jp, jsp

SOIL_XLSX = r"C:\Users\30207\Desktop\科研项目土壤高光谱反演\土壤光谱测量2025年【第三批】Aggregate\土壤光谱数据处理结果_第三批.xlsx"
SEWAGE_DIR = r"G:\污水厂运行维护记录表"

# ─────────────────────────────────────────────────────────────
# 1) 土壤高光谱
# ─────────────────────────────────────────────────────────────
def build_soil():
    # 均值光谱汇总: 第 3 行(row2)=样本名, 第 0 列=波长, 数据从 row3 开始
    df_mean = pd.read_excel(SOIL_XLSX, sheet_name="均值光谱汇总", header=None)
    sample_names = [str(x).strip() for x in df_mean.iloc[2, 1:].tolist()]
    wavelengths = pd.to_numeric(df_mean.iloc[3:, 0], errors="coerce").dropna().tolist()
    spectra = []
    for col in range(1, len(sample_names) + 1):
        vals = pd.to_numeric(df_mean.iloc[3:, col], errors="coerce").tolist()
        spectra.append(vals[:len(wavelengths)])

    # 汇总 sheet: 序号/分组/样本编号/有效像素占比 等元数据
    df_sum = pd.read_excel(SOIL_XLSX, sheet_name="汇总", header=None)
    # 表头在第 3 行(row 2): 序号,分组,样本编号,影像尺寸,有效像素数,有效像素占比,光谱曲线均值
    meta = {}
    for r in range(3, len(df_sum)):
        row = df_sum.iloc[r]
        name = str(row[2]).strip()
        if not name or name == "nan":
            continue
        pct = row[5]
        try:
            pct_val = float(str(pct).replace("%", ""))
        except (ValueError, TypeError):
            pct_val = None
        meta[name] = {
            "group": str(row[1]).strip(),
            "valid_pixels": row[4],
            "valid_pct": pct_val,
        }

    # 元数据 sheet
    df_md = pd.read_excel(SOIL_XLSX, sheet_name="元数据", header=None)
    md = {}
    for r in range(len(df_md)):
        k = df_md.iloc[r, 0]
        v = df_md.iloc[r, 1]
        if pd.notna(k) and pd.notna(v):
            md[str(k).strip()] = str(v).strip()

    samples = []
    for name, spec in zip(sample_names, spectra):
        # 分组: 从 "Gonghe1/Gonghe1-10raw_ref" 取斜杠前
        group = name.split("/")[0] if "/" in name else (meta.get(name, {}).get("group") or "")
        # 元数据 key 用的是短编号(斜杠后), 如 "Gonghe1-10raw_ref"
        short = name.split("/")[-1] if "/" in name else name
        m = meta.get(short, {})
        samples.append({
            "name": name,
            "group": group,
            "valid_pixels": m.get("valid_pixels"),
            "valid_pct": m.get("valid_pct"),
            "spectrum": [round(float(x), 6) if x == x else None for x in spec],
        })

    groups = sorted(set(s["group"] for s in samples if s["group"]))

    # —— PCA 降维（无监督，真实计算）——
    # 用均值光谱矩阵 (n_samples x n_bands) 做 PCA，取前 2 主成分用于散点聚类展示
    pca_xy = None
    pca_var = None
    try:
        M = np.array([s["spectrum"] for s in samples], dtype=np.float64)
        # 剔除含空值的样本
        valid_idx = [i for i in range(len(samples)) if samples[i]["spectrum"][0] is not None]
        Mv = M[valid_idx]
        if Mv.shape[0] > 2:
            # 标准化
            Mc = Mv - Mv.mean(axis=0)
            U, S, Vt = np.linalg.svd(Mc, full_matrices=False)
            scores = U[:, :2] * S[:2]
            pca_var = [round(float(S[i] ** 2 / np.sum(S ** 2) * 100), 2) for i in range(2)]
            pca_xy = {valid_idx[i]: [round(float(scores[i, 0]), 4), round(float(scores[i, 1]), 4)]
                      for i in range(len(valid_idx))}
    except Exception as e:
        print(f"[土壤光谱] PCA 计算失败(忽略): {e}")

    # —— 有机质/土壤敏感光谱指数 ——
    # 每样本计算若干常用光谱指数(基于反射率波段, 用于后续 SOC 建模特征工程)
    def band_idx(wl):
        # 返回最接近给定波长的波段下标
        return int(np.argmin(np.abs(np.array(wavelengths) - wl)))

    idx_450 = band_idx(450); idx_660 = band_idx(660)
    idx_750 = band_idx(750); idx_850 = band_idx(850); idx_900 = band_idx(900)
    for s in samples:
        sp = [x if x is not None else float("nan") for x in s["spectrum"]]
        def r(i):
            return sp[i] if sp[i] == sp[i] else float("nan")
        def ndi(a, b):
            ra, rb = r(a), r(b)
            return round((rb - ra) / (rb + ra), 5) if (ra == ra and rb == rb and (ra + rb) != 0) else None
        s["indices"] = {
            "NDVI": ndi(idx_660, idx_850),      # 归一化植被指数(光谱)
            "ND450_750": ndi(idx_450, idx_750), # 有机质敏感归一化指数
            "R750_450": (round(r(idx_750) / r(idx_450), 5) if (r(idx_750) == r(idx_750) and r(idx_450) == r(idx_450) and r(idx_450)) else None),
        }

    soil = {
        "source": "土壤光谱数据处理结果_第三批.xlsx",
        "meta": md,
        "wavelengths": [round(float(w), 2) for w in wavelengths],
        "n_bands": len(wavelengths),
        "n_samples": len(samples),
        "groups": groups,
        "pca": {"variance_ratio": pca_var, "coordinates": pca_xy},
        "samples": samples,
    }
    jp, jsp = write_json_and_js("soil_spectral", soil)
    print(f"[土壤光谱] {len(samples)} 样本 x {len(wavelengths)} 波段 -> {jp}")
    print(f"           JS: {jsp}")

# ─────────────────────────────────────────────────────────────
# 2) 污水厂月报 (麻陂 每日明细 -> 逐月汇总)
# ─────────────────────────────────────────────────────────────
def _num(x):
    try:
        v = float(x)
        return v if v == v else None  # 排除 NaN
    except (ValueError, TypeError):
        return None

def build_sewage():
    # 只处理「麻陂污水厂运行月报表」(每日明细版)
    files = sorted(glob.glob(os.path.join(SEWAGE_DIR, "*麻陂污水厂运行月报表.xlsx")))
    monthly = []  # [{ym, year, month, water, cod_in, cod_out, nh_in, nh_out, tp_in, tp_out, sludge, elec, fee}]

    for fp in files:
        try:
            xl = pd.ExcelFile(fp)
        except Exception as e:
            print(f"[跳过] {os.path.basename(fp)}: {e}")
            continue
        for sheet in xl.sheet_names:
            # sheet 形如 "2026-1"
            m = re.match(r"^(\d{4})-(\d{1,2})$", sheet.strip())
            if not m:
                continue
            year, month = int(m.group(1)), int(m.group(2))
            df = pd.read_excel(fp, sheet_name=sheet, header=None)

            # 定位表头行(含"处理水量")与数据起始
            header_row = None
            for i in range(min(6, len(df))):
                row_str = " ".join(str(x) for x in df.iloc[i].tolist() if pd.notna(x))
                if "处理水量" in row_str and "COD" in row_str:
                    header_row = i
                    break
            if header_row is None:
                continue

            # 数据行: 表头之后, 第3列(col2)为日期(1-31)
            ncols = df.shape[1]
            def _cell(r, c):
                if c < ncols:
                    return df.iloc[r, c]
                return None

            daily = []
            for r in range(header_row + 2, len(df)):
                day = _cell(r, 2)
                if pd.isna(day):
                    continue
                d = _num(day)
                if d is None or d < 1 or d > 31:
                    continue
                water = _num(_cell(r, 3))
                cod_in = _num(_cell(r, 4)); cod_out = _num(_cell(r, 5))
                nh_in = _num(_cell(r, 6));  nh_out = _num(_cell(r, 7))
                tp_in = _num(_cell(r, 8));  tp_out = _num(_cell(r, 9))
                sludge = _num(_cell(r, 11))
                elec = _num(_cell(r, 14))
                fee = _num(_cell(r, 15))
                daily.append({
                    "day": int(d), "water": water,
                    "cod_in": cod_in, "cod_out": cod_out,
                    "nh_in": nh_in, "nh_out": nh_out,
                    "tp_in": tp_in, "tp_out": tp_out,
                    "sludge": sludge, "elec": elec, "fee": fee,
                })

            if not daily:
                continue

            def _sum(key):
                vals = [d[key] for d in daily if d.get(key) is not None]
                return round(sum(vals), 2) if vals else None

            def _mean(key):
                vals = [d[key] for d in daily if d.get(key) is not None]
                return round(sum(vals) / len(vals), 3) if vals else None

            def _first(key):
                vals = [d[key] for d in daily if d.get(key) is not None]
                return vals[0] if vals else None

            water = _sum("water")
            cod_in, cod_out = _mean("cod_in"), _mean("cod_out")
            nh_in, nh_out = _mean("nh_in"), _mean("nh_out")
            tp_in, tp_out = _mean("tp_in"), _mean("tp_out")

            def removal(i, o):
                if i and o and i > 0:
                    return round((i - o) / i * 100, 2)
                return None

            monthly.append({
                "ym": f"{year}-{month:02d}",
                "year": year, "month": month,
                "water": water,
                "cod_in": cod_in, "cod_out": cod_out,
                "cod_removal": removal(cod_in, cod_out),
                "nh_in": nh_in, "nh_out": nh_out,
                "nh_removal": removal(nh_in, nh_out),
                "tp_in": tp_in, "tp_out": tp_out,
                "tp_removal": removal(tp_in, tp_out),
                "sludge": _first("sludge"),
                "elec": _first("elec"),
                "fee": _first("fee"),
                "days": len(daily),
            })

    monthly.sort(key=lambda x: x["ym"])
    sewage = {
        "source": "麻陂污水厂运行月报表 2022-2026",
        "plant": "博罗县麻陂镇坤元污水处理有限公司",
        "unit": {"water": "吨", "cod": "mg/L", "nh": "mg/L", "tp": "mg/L", "sludge": "吨", "elec": "kWh", "fee": "元"},
        "n_months": len(monthly),
        "months": monthly,
    }
    jp, jsp = write_json_and_js("sewage", sewage)
    print(f"[污水厂] {len(monthly)} 个月度记录 -> {jp}")
    print(f"           JS: {jsp}")
    for r in monthly[:3]:
        print("   ", r["ym"], "水量", r["water"], "COD去", r["cod_removal"], "%", "污泥", r["sludge"])


if __name__ == "__main__":
    print("=" * 60)
    print("CarbonAI v5.2 数据预处理")
    print("=" * 60)
    build_soil()
    print("-" * 60)
    build_sewage()
    print("=" * 60)
    print("完成。JSON 已写入", DATA_DIR)
