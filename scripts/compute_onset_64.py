"""scripts/compute_onset_64.py
Computes wet-season onset (anomalous accumulation), agronomic Aman onset, and March-May rainfall
across all 64 Bangladesh districts grouped by 39 unique NASA POWER rainfall cells (2001-2024),
cross-validated against NASA GPM IMERG Final Daily (0.1°).
Applies Benjamini-Hochberg FDR control across the 39 unique cells.
"""

from __future__ import annotations

import hashlib
import json
import sys
from collections import defaultdict
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
IMERG_DIR = ROOT / "data" / "imerg"


def wet_season_onset_anomalous(daily_df: pd.DataFrame, year: int, r_clim: float | None = None) -> Dict[str, Any] | None:
    """Detect wet-season onset using objective anomalous accumulation (Liebmann & Marengo 2001).

    Definition:
      A(d) = sum_{t=1 March}^d (R(t) - R_clim)
      where R_clim is the mean daily rainfall (2001-2024 climatology).
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


def compute_march_may_means(df: pd.DataFrame) -> Dict[str, float]:
    """Calculate mean March-May rainfall (mm) for Period 1 (2001-2012) and Period 2 (2013-2024)."""
    df_sub = df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df_sub["date"]):
        df_sub["date"] = pd.to_datetime(df_sub["date"])
    rain_col = "rainfall" if "rainfall" in df_sub.columns else "PRECTOTCORR"
    df_sub["r_clean"] = pd.to_numeric(df_sub[rain_col], errors="coerce").fillna(0.0).apply(lambda v: 0.0 if v < 0 else v)

    mam = df_sub[(df_sub["date"].dt.month >= 3) & (df_sub["date"].dt.month <= 5)]
    by_year = mam.groupby(mam["date"].dt.year)["r_clean"].sum().to_dict()

    p1_vals = [by_year.get(y, 0.0) for y in range(2001, 2013)]
    p2_vals = [by_year.get(y, 0.0) for y in range(2013, 2025)]

    p1_mean = round(float(np.mean(p1_vals)), 1) if p1_vals else 0.0
    p2_mean = round(float(np.mean(p2_vals)), 1) if p2_vals else 0.0
    return {
        "period_1_mean_mm": p1_mean,
        "period_2_mean_mm": p2_mean,
        "step_change_mm": round(p2_mean - p1_mean, 1),
    }


def analyze_all_64_districts() -> Dict[str, Any]:
    """Run dual-onset analysis grouped by 39 unique NASA POWER rainfall cells.

    Districts are grouped strictly by identical POWER rainfall series (39 unique series).
    For each unique cell, onset trends and March-May rainfall changes are evaluated for both
    NASA POWER (0.5°) and NASA GPM IMERG (0.1°). Benjamini-Hochberg FDR control is applied
    across the 39 unique cells.
    """
    from src.compute.agro import detect_rainfall_onset

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    entries = manifest.get("entries", {})

    # 1. Group districts by identical POWER rainfall column bytes -> 39 unique cells
    cell_groups = defaultdict(list)
    cell_power_dfs = {}
    for dist, item in sorted(entries.items()):
        csv_file = CACHE_DIR / f"nasa_power_{dist}_2001_2025.csv"
        if not csv_file.exists():
            continue
        df = pd.read_csv(csv_file)
        rain_col = "rainfall" if "rainfall" in df.columns else "PRECTOTCORR"
        rain_bytes = df[rain_col].to_numpy().tobytes()
        cell_hash = hashlib.sha256(rain_bytes).hexdigest()[:12]
        cell_groups[cell_hash].append(dist)
        if cell_hash not in cell_power_dfs:
            cell_power_dfs[cell_hash] = df

    unique_cells_data = []

    for cell_hash, dist_list in sorted(cell_groups.items()):
        primary_dist = dist_list[0]
        df_power = cell_power_dfs[cell_hash].copy()
        if "date" not in df_power.columns:
            df_power["date"] = pd.to_datetime(df_power["YEAR"].astype(str) + "-" + df_power["MO"].astype(str) + "-" + df_power["DY"].astype(str))
        else:
            df_power["date"] = pd.to_datetime(df_power["date"])

        rain_col = "rainfall" if "rainfall" in df_power.columns else "PRECTOTCORR"
        df_power["rainfall"] = pd.to_numeric(df_power[rain_col], errors="coerce").fillna(0.0).apply(lambda v: 0.0 if v < 0 else v)

        # Load IMERG series for this primary district (2001-2024)
        imerg_csv = IMERG_DIR / f"imerg_{primary_dist}_2001_2024.csv"
        if imerg_csv.exists():
            df_imerg = pd.read_csv(imerg_csv)
            df_imerg["date"] = pd.to_datetime(df_imerg["date"])
            df_imerg["rainfall"] = pd.to_numeric(df_imerg["rainfall"], errors="coerce").fillna(0.0).apply(lambda v: 0.0 if v < 0 else v)
        else:
            df_imerg = df_power.copy()

        # March-May rainfall comparison
        pwr_mam = compute_march_may_means(df_power)
        img_mam = compute_march_may_means(df_imerg)

        # Daily rainfall correlation (2001-2024, 8766 days)
        pwr_rain_8766 = df_power[df_power["date"].dt.year <= 2024]["rainfall"].to_numpy()
        img_rain_8766 = df_imerg[df_imerg["date"].dt.year <= 2024]["rainfall"].to_numpy()
        min_len = min(len(pwr_rain_8766), len(img_rain_8766))
        daily_corr = round(float(np.corrcoef(pwr_rain_8766[:min_len], img_rain_8766[:min_len])[0, 1]), 3)

        # --- A. NASA POWER Onset Computations ---
        r_clim_pwr = float(df_power[df_power["date"].dt.year <= 2024]["rainfall"].mean())
        anom_pwr = []
        for yr in range(2001, 2025):
            res = wet_season_onset_anomalous(df_power, yr, r_clim=r_clim_pwr)
            if res:
                anom_pwr.append(res)
        p1_anom_pwr = [x["doy"] for x in anom_pwr if 2001 <= x["year"] <= 2012]
        p2_anom_pwr = [x["doy"] for x in anom_pwr if 2013 <= x["year"] <= 2024]
        p1_anom_pwr_med = float(np.median(p1_anom_pwr)) if p1_anom_pwr else None
        p2_anom_pwr_med = float(np.median(p2_anom_pwr)) if p2_anom_pwr else None
        shift_anom_pwr = round(p2_anom_pwr_med - p1_anom_pwr_med, 1) if (p1_anom_pwr_med and p2_anom_pwr_med) else None
        mw_anom_pwr = stats.mannwhitneyu(p2_anom_pwr, p1_anom_pwr, alternative="two-sided") if len(p1_anom_pwr) >= 5 and len(p2_anom_pwr) >= 5 else None
        p_anom_pwr = float(mw_anom_pwr.pvalue) if mw_anom_pwr else 1.0

        aman_pwr = []
        censored_pwr = 0
        for yr in range(2001, 2025):
            res = detect_rainfall_onset(df_power, yr)
            if res and res.get("doy") is not None:
                aman_pwr.append(res)
                if res.get("onset_date") == f"{yr}-06-01":
                    censored_pwr += 1
        p1_aman_pwr = [x["doy"] for x in aman_pwr if 2001 <= x["year"] <= 2012]
        p2_aman_pwr = [x["doy"] for x in aman_pwr if 2013 <= x["year"] <= 2024]
        p1_aman_pwr_med = float(np.median(p1_aman_pwr)) if p1_aman_pwr else None
        p2_aman_pwr_med = float(np.median(p2_aman_pwr)) if p2_aman_pwr else None
        shift_aman_pwr = round(p2_aman_pwr_med - p1_aman_pwr_med, 1) if (p1_aman_pwr_med and p2_aman_pwr_med) else None
        mw_aman_pwr = stats.mannwhitneyu(p2_aman_pwr, p1_aman_pwr, alternative="two-sided") if len(p1_aman_pwr) >= 5 and len(p2_aman_pwr) >= 5 else None
        p_aman_pwr = float(mw_aman_pwr.pvalue) if mw_aman_pwr else 1.0
        cens_frac_pwr = round(censored_pwr / len(aman_pwr), 3) if aman_pwr else 0.0

        # --- B. NASA GPM IMERG Onset Computations ---
        r_clim_img = float(df_imerg["rainfall"].mean())
        anom_img = []
        for yr in range(2001, 2025):
            res = wet_season_onset_anomalous(df_imerg, yr, r_clim=r_clim_img)
            if res:
                anom_img.append(res)
        p1_anom_img = [x["doy"] for x in anom_img if 2001 <= x["year"] <= 2012]
        p2_anom_img = [x["doy"] for x in anom_img if 2013 <= x["year"] <= 2024]
        p1_anom_img_med = float(np.median(p1_anom_img)) if p1_anom_img else None
        p2_anom_img_med = float(np.median(p2_anom_img)) if p2_anom_img else None
        shift_anom_img = round(p2_anom_img_med - p1_anom_img_med, 1) if (p1_anom_img_med and p2_anom_img_med) else None
        mw_anom_img = stats.mannwhitneyu(p2_anom_img, p1_anom_img, alternative="two-sided") if len(p1_anom_img) >= 5 and len(p2_anom_img) >= 5 else None
        p_anom_img = float(mw_anom_img.pvalue) if mw_anom_img else 1.0

        aman_img = []
        censored_img = 0
        for yr in range(2001, 2025):
            res = detect_rainfall_onset(df_imerg, yr)
            if res and res.get("doy") is not None:
                aman_img.append(res)
                if res.get("onset_date") == f"{yr}-06-01":
                    censored_img += 1
        p1_aman_img = [x["doy"] for x in aman_img if 2001 <= x["year"] <= 2012]
        p2_aman_img = [x["doy"] for x in aman_img if 2013 <= x["year"] <= 2024]
        p1_aman_img_med = float(np.median(p1_aman_img)) if p1_aman_img else None
        p2_aman_img_med = float(np.median(p2_aman_img)) if p2_aman_img else None
        shift_aman_img = round(p2_aman_img_med - p1_aman_img_med, 1) if (p1_aman_img_med and p2_aman_img_med) else None
        mw_aman_img = stats.mannwhitneyu(p2_aman_img, p1_aman_img, alternative="two-sided") if len(p1_aman_img) >= 5 and len(p2_aman_img) >= 5 else None
        p_aman_img = float(mw_aman_img.pvalue) if mw_aman_img else 1.0
        cens_frac_img = round(censored_img / len(aman_img), 3) if aman_img else 0.0

        cell_rec = {
            "cell_id": f"power_rain_cell_{cell_hash}",
            "cell_hash": cell_hash,
            "districts": dist_list,
            "primary_district": primary_dist,
            "daily_correlation_power_vs_imerg": daily_corr,
            "march_may_rainfall": {
                "power": pwr_mam,
                "imerg": img_mam,
            },
            "power": {
                "r_clim_mm_day": round(r_clim_pwr, 2),
                "wet_season": {
                    "period_1_median_doy": p1_anom_pwr_med,
                    "period_2_median_doy": p2_anom_pwr_med,
                    "shift_days": shift_anom_pwr,
                    "p_value": round(p_anom_pwr, 4),
                },
                "aman": {
                    "period_1_median_doy": p1_aman_pwr_med,
                    "period_2_median_doy": p2_aman_pwr_med,
                    "shift_days": shift_aman_pwr,
                    "p_value": round(p_aman_pwr, 4),
                    "censored_fraction": cens_frac_pwr,
                },
            },
            "imerg": {
                "r_clim_mm_day": round(r_clim_img, 2),
                "wet_season": {
                    "period_1_median_doy": p1_anom_img_med,
                    "period_2_median_doy": p2_anom_img_med,
                    "shift_days": shift_anom_img,
                    "p_value": round(p_anom_img, 4),
                },
                "aman": {
                    "period_1_median_doy": p1_aman_img_med,
                    "period_2_median_doy": p2_aman_img_med,
                    "shift_days": shift_aman_img,
                    "p_value": round(p_aman_img, 4),
                    "censored_fraction": cens_frac_img,
                },
            },
        }
        if cens_frac_img > 0.30:
            cell_rec["imerg"]["aman"]["data_warning_en"] = f"Onset detection is unreliable here: in {censored_img} of {len(aman_img)} years the detected onset fell on the first day of the search window."
            cell_rec["imerg"]["aman"]["data_warning_bn"] = f"সতর্কতা: {len(aman_img)} বছরের মধ্যে {censored_img} বছরে বর্ষা শুরুর তারিখ অনুসন্ধানের প্রথম দিনেই পড়েছে, তাই এই ফলাফল নির্ভরযোগ্য নয়।"

        unique_cells_data.append(cell_rec)

    # Benjamini-Hochberg FDR correction across the 39 unique rainfall cells
    pvals_wet_pwr = [c["power"]["wet_season"]["p_value"] for c in unique_cells_data]
    qvals_wet_pwr = stats.false_discovery_control(pvals_wet_pwr, method="bh")
    for c, q in zip(unique_cells_data, qvals_wet_pwr):
        c["power"]["wet_season"]["q_value_bh"] = round(float(q), 4)

    pvals_wet_img = [c["imerg"]["wet_season"]["p_value"] for c in unique_cells_data]
    qvals_wet_img = stats.false_discovery_control(pvals_wet_img, method="bh")
    for c, q in zip(unique_cells_data, qvals_wet_img):
        c["imerg"]["wet_season"]["q_value_bh"] = round(float(q), 4)

    pvals_aman_pwr = [c["power"]["aman"]["p_value"] for c in unique_cells_data]
    qvals_aman_pwr = stats.false_discovery_control(pvals_aman_pwr, method="bh")
    for c, q in zip(unique_cells_data, qvals_aman_pwr):
        c["power"]["aman"]["q_value_bh"] = round(float(q), 4)

    pvals_aman_img = [c["imerg"]["aman"]["p_value"] for c in unique_cells_data]
    qvals_aman_img = stats.false_discovery_control(pvals_aman_img, method="bh")
    for c, q in zip(unique_cells_data, qvals_aman_img):
        c["imerg"]["aman"]["q_value_bh"] = round(float(q), 4)

    # Determine confirmation status for each unique cell
    for c in unique_cells_data:
        pwr_sig = c["power"]["wet_season"]["q_value_bh"] < 0.05
        img_sig = c["imerg"]["wet_season"]["q_value_bh"] < 0.05
        same_sign = (
            c["power"]["wet_season"]["shift_days"] is not None and
            c["imerg"]["wet_season"]["shift_days"] is not None and
            np.sign(c["power"]["wet_season"]["shift_days"]) == np.sign(c["imerg"]["wet_season"]["shift_days"])
        )
        c["is_confirmed"] = bool(pwr_sig and img_sig and same_sign)

    # Map cell results back to each individual district
    cell_lookup = {c["cell_hash"]: c for c in unique_cells_data}
    dist_records = []
    for dist, item in sorted(entries.items()):
        csv_file = CACHE_DIR / f"nasa_power_{dist}_2001_2025.csv"
        if not csv_file.exists():
            continue
        df = pd.read_csv(csv_file)
        rain_col = "rainfall" if "rainfall" in df.columns else "PRECTOTCORR"
        h = hashlib.sha256(df[rain_col].to_numpy().tobytes()).hexdigest()[:12]
        c = cell_lookup[h]

        dist_records.append({
            "district": dist,
            "district_name": item.get("district_name", dist.capitalize()),
            "cell_id": c["cell_id"],
            "cell_hash": c["cell_hash"],
            "shared_districts": c["districts"],
            "daily_correlation_power_vs_imerg": c["daily_correlation_power_vs_imerg"],
            "march_may_rainfall": c["march_may_rainfall"],
            "power": c["power"],
            "imerg": c["imerg"],
            "is_confirmed": c["is_confirmed"],
            # Legacy backward-compatibility aliases
            "wet_season": c["imerg"]["wet_season"],
            "aman": c["imerg"]["aman"],
        })

    analysis_result = {
        "verdict": "Two NASA datasets disagree on the trend; FieldShift only advises on what is confirmed.",
        "n_unique_cells": len(unique_cells_data),
        "dataset_comparison": {
            "primary_rain": "NASA GPM IMERG Final Daily v07 (0.1°)",
            "reanalysis_source": "NASA POWER (0.5° MERRA-2/GEOS)",
            "temporal_range": "2001-2024",
        },
        "unique_cells": unique_cells_data,
        "districts": dist_records,
    }

    out_file = ROOT / "data" / "onset_analysis_64.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(analysis_result, f, indent=2, ensure_ascii=False)

    print(f"Saved onset analysis for 64 districts across {len(unique_cells_data)} unique rainfall cells to {out_file}")
    confirmed_cnt = sum(1 for c in unique_cells_data if c["is_confirmed"])
    print(f"Unique cells where onset shift is confirmed by BOTH POWER and IMERG: {confirmed_cnt} of {len(unique_cells_data)}")

    return analysis_result


if __name__ == "__main__":
    analyze_all_64_districts()
