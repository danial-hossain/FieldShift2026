"""scripts/compute_onset_64.py
Computes wet-season onset (anomalous accumulation) and agronomic Aman onset across
all 64 Bangladesh districts for 2001-2025, with Benjamini-Hochberg FDR control and
Mann-Kendall / Theil-Sen trend metrics.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
MANIFEST_PATH = ROOT / "data" / "nasa_power" / "manifest_64.json"
CACHE_DIR = ROOT / "data" / "nasa_power" / "advisory_cache"


def wet_season_onset_anomalous(daily_df: pd.DataFrame, year: int, r_clim: float | None = None) -> Dict[str, Any] | None:
    """Detect wet-season onset using objective anomalous accumulation (Liebmann & Marengo 2001).

    Definition:
      A(d) = sum_{t=1 March}^d (R(t) - R_clim)
      where R_clim is the mean daily rainfall (2001-2025 climatology).
      Onset is the Day of Year (DOY) of the minimum anomalous accumulation A(d) within 1 March - 31 August.
    """
    if daily_df.empty or "date" not in daily_df.columns:
        return None

    df = daily_df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    rain_col = "rainfall" if "rainfall" in df.columns else ("PRECTOTCORR" if "PRECTOTCORR" in df.columns else None)
    if not rain_col:
        return None

    r_clean = pd.to_numeric(df[rain_col], errors="coerce").fillna(0.0)
    df["rain_clean"] = r_clean.apply(lambda v: 0.0 if v < 0 else v)

    if r_clim is None:
        r_clim = float(df["rain_clean"].mean())

    ydf = df[df["date"].dt.year == year].sort_values("date").reset_index(drop=True)
    if ydf.empty:
        return None

    mar1 = pd.Timestamp(year, 3, 1)
    aug31 = pd.Timestamp(year, 8, 31)

    sub = ydf[(ydf["date"] >= mar1) & (ydf["date"] <= aug31)].copy().reset_index(drop=True)
    if sub.empty:
        return None

    anom = sub["rain_clean"] - r_clim
    cum_anom = anom.cumsum()
    min_idx = cum_anom.idxmin()

    onset_date = sub.loc[min_idx, "date"]
    doy = int(onset_date.dayofyear)

    return {
        "year": year,
        "onset_date": onset_date.strftime("%Y-%m-%d"),
        "doy": doy,
        "method": "anomalous_accumulation_liebmann_marengo",
        "r_clim_mm_day": round(r_clim, 4),
        "min_accumulation_anomaly_mm": round(float(cum_anom.loc[min_idx]), 2),
    }


def compute_mann_kendall_theil_sen(years: List[int], values: List[float]) -> Dict[str, Any]:
    """Calculate Mann-Kendall test (tau, p-value) and Theil-Sen slope over the series."""
    if len(years) < 5 or len(values) < 5:
        return {
            "theil_sen_slope": None,
            "kendall_tau": None,
            "p_value": None,
        }

    x = np.array(years, dtype=float)
    y = np.array(values, dtype=float)

    ts_res = stats.theilslopes(y, x)
    tau_res = stats.kendalltau(x, y)

    return {
        "theil_sen_slope": round(float(ts_res.slope), 4),
        "theil_sen_intercept": round(float(ts_res.intercept), 4),
        "theil_sen_low_slope": round(float(ts_res.low_slope), 4),
        "theil_sen_high_slope": round(float(ts_res.high_slope), 4),
        "kendall_tau": round(float(tau_res.statistic), 4),
        "p_value": round(float(tau_res.pvalue), 4),
    }


def analyze_all_64_districts() -> List[Dict[str, Any]]:
    """Run dual-onset analysis across all 64 districts with BH multiple-testing correction."""
    from src.compute.agro import detect_rainfall_onset

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    dist_records = []
    entries = manifest.get("entries", {})
    for dist, item in entries.items():
        csv_file = CACHE_DIR / f"nasa_power_{dist}_2001_2025.csv"
        if not csv_file.exists():
            continue

        df = pd.read_csv(csv_file)
        rain_col = "rainfall" if "rainfall" in df.columns else ("PRECTOTCORR" if "PRECTOTCORR" in df.columns else None)
        df["rainfall"] = pd.to_numeric(df[rain_col], errors="coerce").fillna(0.0).apply(lambda v: 0.0 if v < 0 else v)
        if "date" not in df.columns:
            df["date"] = pd.to_datetime(df["YEAR"].astype(str) + "-" + df["MO"].astype(str) + "-" + df["DY"].astype(str))
        else:
            df["date"] = pd.to_datetime(df["date"])

        r_clim = float(df["rainfall"].mean())

        # 1. Anomalous Accumulation Onset
        anom_series = []
        for yr in range(2001, 2026):
            res = wet_season_onset_anomalous(df, yr, r_clim=r_clim)
            if res:
                anom_series.append(res)

        p1_anom = [x["doy"] for x in anom_series if 2001 <= x["year"] <= 2012]
        p2_anom = [x["doy"] for x in anom_series if 2013 <= x["year"] <= 2025]

        p1_anom_med = float(np.median(p1_anom)) if p1_anom else None
        p2_anom_med = float(np.median(p2_anom)) if p2_anom else None
        shift_anom = round(p2_anom_med - p1_anom_med, 1) if (p1_anom_med and p2_anom_med) else None
        mw_anom = stats.mannwhitneyu(p2_anom, p1_anom, alternative="two-sided") if len(p1_anom) >= 5 and len(p2_anom) >= 5 else None
        p_anom = float(mw_anom.pvalue) if mw_anom else 1.0

        anom_trend = compute_mann_kendall_theil_sen([x["year"] for x in anom_series], [x["doy"] for x in anom_series])

        # 2. Agronomic Aman Onset (existing rule)
        aman_series = []
        censored_count = 0
        valid_aman = 0
        for yr in range(2001, 2026):
            res = detect_rainfall_onset(df, yr)
            if res and res.get("doy") is not None:
                aman_series.append(res)
                valid_aman += 1
                if res.get("onset_date") == f"{yr}-06-01":
                    censored_count += 1

        p1_aman = [x["doy"] for x in aman_series if 2001 <= x["year"] <= 2012]
        p2_aman = [x["doy"] for x in aman_series if 2013 <= x["year"] <= 2025]

        p1_aman_med = float(np.median(p1_aman)) if p1_aman else None
        p2_aman_med = float(np.median(p2_aman)) if p2_aman else None
        shift_aman = round(p2_aman_med - p1_aman_med, 1) if (p1_aman_med and p2_aman_med) else None
        mw_aman = stats.mannwhitneyu(p2_aman, p1_aman, alternative="two-sided") if len(p1_aman) >= 5 and len(p2_aman) >= 5 else None
        p_aman = float(mw_aman.pvalue) if mw_aman else 1.0

        aman_trend = compute_mann_kendall_theil_sen([x["year"] for x in aman_series], [x["doy"] for x in aman_series])
        censored_frac = round(censored_count / valid_aman, 3) if valid_aman > 0 else 0.0

        dist_records.append({
            "district": dist,
            "district_name": item.get("district_name", dist.capitalize()),
            "r_clim_mm_day": round(r_clim, 2),
            "wet_season": {
                "period_1_median_doy": p1_anom_med,
                "period_2_median_doy": p2_anom_med,
                "shift_days": shift_anom,
                "p_value": round(p_anom, 4),
                "trend": anom_trend,
            },
            "aman": {
                "period_1_median_doy": p1_aman_med,
                "period_2_median_doy": p2_aman_med,
                "shift_days": shift_aman,
                "p_value": round(p_aman, 4),
                "censored_fraction": censored_frac,
                "trend": aman_trend,
            },
        })

    # Benjamini-Hochberg FDR correction across all 64 districts
    pvals_wet = [r["wet_season"]["p_value"] for r in dist_records]
    qvals_wet = stats.false_discovery_control(pvals_wet, method="bh")
    for r, q in zip(dist_records, qvals_wet):
        r["wet_season"]["q_value_bh"] = round(float(q), 4)

    pvals_aman = [r["aman"]["p_value"] for r in dist_records]
    qvals_aman = stats.false_discovery_control(pvals_aman, method="bh")
    for r, q in zip(dist_records, qvals_aman):
        r["aman"]["q_value_bh"] = round(float(q), 4)

    return dist_records


if __name__ == "__main__":
    records = analyze_all_64_districts()
    out_file = ROOT / "data" / "onset_analysis_64.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({"districts": records}, f, indent=2)
    print(f"Saved onset analysis for {len(records)} districts to {out_file}")

    # Summary of findings
    sig_wet = [r for r in records if r["wet_season"]["q_value_bh"] < 0.05]
    print(f"\nDistricts with wet_season q_BH < 0.05 ({len(sig_wet)} districts):")
    for r in sig_wet:
        w = r["wet_season"]
        print(f"  {r['district']:<16}: P1={w['period_1_median_doy']} -> P2={w['period_2_median_doy']} (shift={w['shift_days']}d, p={w['p_value']}, q={w['q_value_bh']})")

    sig_aman = [r for r in records if r["aman"]["q_value_bh"] < 0.05 and r["aman"]["censored_fraction"] <= 0.30]
    print(f"\nDistricts with aman q_BH < 0.05 and not censored ({len(sig_aman)} districts):")
    for r in sig_aman:
        a = r["aman"]
        print(f"  {r['district']:<16}: P1={a['period_1_median_doy']} -> P2={a['period_2_median_doy']} (shift={a['shift_days']}d, p={a['p_value']}, q={a['q_value_bh']}, censored={a['censored_fraction']})")
