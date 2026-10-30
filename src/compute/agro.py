"""Deterministic Agro-climatic Science Module for FieldShift 2026.

Implements official agricultural science for the NASA Planting-Window Advisory
targeting Bangladeshi rice systems (Aman, Boro, Aus).

Key Capabilities:
1. Configurable daily usable rainfall onset detection with dry-spell lookahead.
2. Crop-specific Growing Degree Day (GDD) accumulation with base temperature and cap.
3. Multi-decadal annual onset series generation (Period 1: 2001-2012 vs Period 2: 2013-2025).
4. Mann-Whitney U test comparison with documented assumptions and limitations.
5. Sensitivity analysis across +/- 5 mm onset rainfall thresholds.
6. Agronomically defensible recommendation rules (incorporating nursery duration,
   variety phenology like BRRI dhan75 vs BRRI dhan49, terminal drought escape,
   and SMS-length Bangla delivery).
"""

from __future__ import annotations

import json
from pathlib import Path

import math
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
from scipy import stats

# Authoritative Base Temperatures and Upper Thresholds (°C)
# Sourced from: BRRI (Bangladesh Rice Research Institute) Rice Knowledge Bank & FAO-33
RICE_THERMAL_SPECS = {
    "aman": {"t_base": 10.0, "t_cap": 35.0, "nursery_days": 28, "total_duration": 135},
    "boro": {"t_base": 10.0, "t_cap": 35.0, "nursery_days": 40, "total_duration": 145},
    "aus": {"t_base": 10.0, "t_cap": 35.0, "nursery_days": 25, "total_duration": 110},
    "default": {"t_base": 10.0, "t_cap": 35.0, "nursery_days": 28, "total_duration": 135},
}

# Standard Search Windows for Bangladesh Rice Seasons (Month, Day)
RICE_SEASON_WINDOWS = {
    "aman": {"start_md": (6, 1), "end_md": (8, 31)},  # Kharif-2 Monsoon onset window
    "aus": {"start_md": (3, 15), "end_md": (5, 31)},   # Kharif-1 Pre-monsoon window
    "boro": {"start_md": (11, 15), "end_md": (1, 31)}, # Rabi Dry-irrigated winter window
}


@dataclass(frozen=True)
class AgronomicConfig:
    """Configurable scientific parameters for rainfall onset and agro-meteorology.
    
    All defaults are calibrated to Bangladesh Agricultural Research Council (BARC)
    and Bangladesh Rice Research Institute (BRRI) agro-ecological standards.
    """
    search_start_month: int = 6
    search_start_day: int = 1
    search_end_month: int = 8
    search_end_day: int = 31
    window_days: int = 3
    threshold_mm: float = 25.0
    min_rainy_days: int = 1
    dry_spell_window_days: int = 21
    dry_spell_max_consecutive_days: int = 7
    dry_day_threshold_mm: float = 2.0
    base_temperature_c: float = 10.0
    upper_cap_temperature_c: float = 35.0
    max_missing_days_allowed: int = 15

    def validate(self) -> None:
        """Validate parameter boundaries."""
        if self.window_days < 1:
            raise ValueError("window_days must be >= 1")
        if self.threshold_mm <= 0:
            raise ValueError("threshold_mm must be positive")
        if self.dry_spell_window_days < 1:
            raise ValueError("dry_spell_window_days must be >= 1")
        if self.dry_spell_max_consecutive_days < 1:
            raise ValueError("dry_spell_max_consecutive_days must be >= 1")
        if self.base_temperature_c >= self.upper_cap_temperature_c:
            raise ValueError("base_temperature_c must be less than upper_cap_temperature_c")


def wet_season_onset_anomalous(
    daily_df: pd.DataFrame,
    year: int,
    r_clim: Optional[float] = None,
) -> Optional[Dict[str, Any]]:
    """Detect wet-season onset using objective anomalous accumulation (Liebmann & Marengo 2001).

    Scientific Definition:
      A(d) = sum_{t=1 March}^d (R(t) - R_clim)
      where R_clim is the mean daily rainfall (2001-2025 climatology).
      Onset is the Day of Year (DOY) of the minimum anomalous accumulation A(d) within 1 March - 31 August.
    """
    if daily_df.empty or "date" not in daily_df.columns:
        return None

    if "rain_clean" not in daily_df.columns or not pd.api.types.is_datetime64_any_dtype(daily_df["date"]):
        df = daily_df.copy()
        if not pd.api.types.is_datetime64_any_dtype(df["date"]):
            df["date"] = pd.to_datetime(df["date"], errors="coerce")
        rain_col = "rainfall" if "rainfall" in df.columns else ("PRECTOTCORR" if "PRECTOTCORR" in df.columns else None)
        if not rain_col:
            return None
        r_clean = pd.to_numeric(df[rain_col], errors="coerce").fillna(0.0)
        df["rain_clean"] = r_clean.apply(lambda v: 0.0 if v < 0 else v)
    else:
        df = daily_df

    if r_clim is None:
        r_clim = float(df["rain_clean"].mean())

    if "year" in df.columns and "month" in df.columns:
        sub = df[(df["year"] == year) & (df["month"] >= 3) & (df["month"] <= 8)].copy().reset_index(drop=True)
    else:
        mar1 = pd.Timestamp(year, 3, 1)
        aug31 = pd.Timestamp(year, 8, 31)
        sub = df[(df["date"] >= mar1) & (df["date"] <= aug31)].copy().reset_index(drop=True)

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
        "r_clim_mm_day": round(float(r_clim), 4),
        "min_accumulation_anomaly_mm": round(float(cum_anom.loc[min_idx]), 2),
    }


def compute_wet_season_series(
    daily_df: pd.DataFrame,
    start_year: int = 2001,
    end_year: int = 2025,
    r_clim: Optional[float] = None,
) -> Dict[str, Any]:
    """Compute annual wet season onsets using anomalous accumulation for 2001-2025."""
    if daily_df.empty:
        return {"full_series": [], "period_1": {"doys": []}, "period_2": {"doys": []}}

    df = daily_df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    rain_col = "rainfall" if "rainfall" in df.columns else ("PRECTOTCORR" if "PRECTOTCORR" in df.columns else None)
    if rain_col:
        r_clean = pd.to_numeric(df[rain_col], errors="coerce").fillna(0.0)
        df["rain_clean"] = r_clean.apply(lambda v: 0.0 if v < 0 else v)
    else:
        df["rain_clean"] = 0.0

    if r_clim is None:
        r_clim = float(df["rain_clean"].mean())

    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month

    series = []
    for yr in range(start_year, end_year + 1):
        res = wet_season_onset_anomalous(df, yr, r_clim=r_clim)
        if res:
            series.append(res)
        else:
            series.append({
                "year": yr,
                "onset_date": None,
                "doy": None,
                "method": "anomalous_accumulation_liebmann_marengo",
                "status": "no_data_for_year"
            })

    p1 = [item for item in series if 2001 <= item["year"] <= 2012 and item.get("doy") is not None]
    p2 = [item for item in series if 2013 <= item["year"] <= 2025 and item.get("doy") is not None]

    return {
        "full_series": series,
        "r_clim_mm_day": round(float(r_clim), 4) if r_clim is not None else None,
        "period_1": {
            "label": "2001–2012 Baseline",
            "start_year": 2001,
            "end_year": 2012,
            "total_years": 12,
            "valid_samples": len(p1),
            "onsets": p1,
            "doys": [x["doy"] for x in p1],
        },
        "period_2": {
            "label": "2013–2025 Recent Era",
            "start_year": 2013,
            "end_year": 2025,
            "total_years": 13,
            "valid_samples": len(p2),
            "onsets": p2,
            "doys": [x["doy"] for x in p2],
        },
    }


def compute_mann_kendall_theil_sen(years: List[int], values: List[float]) -> Dict[str, Any]:
    """Calculate Mann-Kendall test (tau, p-value) and Theil-Sen slope over the series."""
    if len(years) < 5 or len(values) < 5:
        return {
            "theil_sen_slope": None,
            "theil_sen_intercept": None,
            "theil_sen_low_slope": None,
            "theil_sen_high_slope": None,
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


def detect_rainfall_onset(
    daily_df: pd.DataFrame,
    year: int,
    config: Optional[AgronomicConfig] = None,
) -> Optional[Dict[str, Any]]:
    """Detect usable rainfall onset for a single calendar year.

    Scientific Definition:
    1. Search starts on `search_start_month`-`search_start_day` (e.g., June 1 for Aman).
    2. Identifies the first occurrence where cumulative rainfall over `window_days`
       (e.g., 3 days) reaches or exceeds `threshold_mm` (e.g., 25.0 mm), with at
       least `min_rainy_days` having measurable rain (>= 1.0 mm).
    3. Dry-Spell Lookahead Rule: Evaluates subsequent `dry_spell_window_days` (21 days).
       If consecutive dry days (daily rain < `dry_day_threshold_mm`) exceed or equal
       `dry_spell_max_consecutive_days` (7 days), the tentative date is rejected
       as a false onset.
    4. If no valid date is found before `search_end_month`-`search_end_day`, returns None.
    """
    cfg = config or AgronomicConfig()
    cfg.validate()

    if daily_df.empty or "date" not in daily_df.columns or "rainfall" not in daily_df.columns:
        return None

    # Filter for the target year
    df = daily_df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # Filter year
    ydf = df[df["date"].dt.year == year].sort_values("date").reset_index(drop=True)
    if ydf.empty:
        return None

    # Missing data check within search window
    start_dt = pd.Timestamp(year, cfg.search_start_month, cfg.search_start_day)
    end_dt = pd.Timestamp(year, cfg.search_end_month, cfg.search_end_day)

    sub = ydf[(ydf["date"] >= start_dt) & (ydf["date"] <= end_dt)].reset_index(drop=True)
    if len(sub) == 0:
        return None

    missing_count = sub["rainfall"].isna().sum() + (sub["rainfall"] == -999).sum()
    if missing_count > cfg.max_missing_days_allowed:
        # Too many missing observations to deterministically identify onset
        return None

    # Clean numeric rainfall values
    sub["rainfall_clean"] = pd.to_numeric(sub["rainfall"], errors="coerce").fillna(0.0)
    sub["rainfall_clean"] = sub["rainfall_clean"].apply(lambda v: 0.0 if v < 0 else v)

    n = len(sub)
    w = cfg.window_days

    for i in range(n - w + 1):
        # The candidate onset must start on an actual rainy day (>= 1.0 mm)
        if sub.loc[i, "rainfall_clean"] < 1.0:
            continue

        window_slice = sub.loc[i : i + w - 1, "rainfall_clean"]
        window_sum = float(window_slice.sum())
        rainy_days = int((window_slice >= 1.0).sum())

        if window_sum >= cfg.threshold_mm and rainy_days >= cfg.min_rainy_days:
            # Candidate found; verify dry-spell condition
            lookahead_start = i + w
            lookahead_end = min(n, i + w + cfg.dry_spell_window_days)
            lookahead_slice = sub.loc[lookahead_start : lookahead_end - 1, "rainfall_clean"].values

            # Calculate maximum consecutive dry days
            max_consecutive_dry = 0
            current_dry = 0
            for r in lookahead_slice:
                if r < cfg.dry_day_threshold_mm:
                    current_dry += 1
                    if current_dry > max_consecutive_dry:
                        max_consecutive_dry = current_dry
                else:
                    current_dry = 0

            # If dry spell does not exceed the allowed threshold, onset is confirmed
            if max_consecutive_dry < cfg.dry_spell_max_consecutive_days:
                onset_row = sub.iloc[i]
                onset_date = onset_row["date"]
                doy = int(onset_date.dayofyear)
                return {
                    "year": int(year),
                    "onset_date": onset_date.strftime("%Y-%m-%d"),
                    "doy": doy,
                    "cumulative_window_rainfall_mm": round(window_sum, 2),
                    "max_lookahead_dry_spell_days": int(max_consecutive_dry),
                    "is_leap_year": bool(onset_date.is_leap_year),
                }

    # No onset detected meeting all criteria
    return None


def calculate_growing_degree_days(
    daily_df: pd.DataFrame,
    base_temperature_c: float = 10.0,
    upper_cap_temperature_c: float = 35.0,
    start_month: int = 6,
    end_month: int = 10,
) -> Dict[str, Any]:
    """Calculate daily and seasonal Growing Degree Days (GDD) for rice.
    
    Thermal Formula:
        T_mean = (T_max + T_min) / 2.0
        T_effective = min(upper_cap_temperature_c, T_mean)
        Daily GDD = max(0.0, T_effective - base_temperature_c)
        
    Base temperature for rice is 10°C (BRRI/IRRI). Development ceases below 10°C.
    Upper threshold is 35°C, above which development plateaus and spikelet sterility rises.
    """
    if daily_df.empty or "date" not in daily_df.columns:
        return {"error": "Empty or invalid dataframe for GDD calculation"}

    df = daily_df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # Clean temperature columns
    t_max = pd.to_numeric(df.get("temp_max", df.get("t2m_max", df.get("temperature", np.nan))), errors="coerce")
    t_min = pd.to_numeric(df.get("temp_min", df.get("t2m_min", df.get("temperature", np.nan))), errors="coerce")

    # Replace -999 missing markers with NaN
    t_max = t_max.mask(t_max == -999)
    t_min = t_min.mask(t_min == -999)

    t_mean = (t_max + t_min) / 2.0
    t_eff = t_mean.clip(upper=upper_cap_temperature_c)
    daily_gdd = (t_eff - base_temperature_c).clip(lower=0.0)

    df["daily_gdd"] = daily_gdd
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month

    # Seasonal accumulation (e.g. Kharif season June 1 to Oct 31)
    season_mask = (df["month"] >= start_month) & (df["month"] <= end_month)
    seasonal_gdd = df[season_mask].groupby("year")["daily_gdd"].sum()

    # Split into Period 1 (2001-2012) and Period 2 (2013-2025)
    p1 = seasonal_gdd[(seasonal_gdd.index >= 2001) & (seasonal_gdd.index <= 2012)]
    p2 = seasonal_gdd[(seasonal_gdd.index >= 2013) & (seasonal_gdd.index <= 2025)]

    p1_mean = float(p1.mean()) if len(p1) > 0 else None
    p2_mean = float(p2.mean()) if len(p2) > 0 else None
    gdd_delta = (p2_mean - p1_mean) if (p1_mean is not None and p2_mean is not None) else None

    return {
        "base_temperature_c": float(base_temperature_c),
        "upper_cap_temperature_c": float(upper_cap_temperature_c),
        "seasonal_window": f"Month {start_month:02d} to Month {end_month:02d}",
        "period_1_mean_seasonal_gdd": round(p1_mean, 1) if p1_mean is not None else None,
        "period_2_mean_seasonal_gdd": round(p2_mean, 1) if p2_mean is not None else None,
        "gdd_change": round(gdd_delta, 1) if gdd_delta is not None else None,
        "interpretation": (
            "Higher thermal accumulation (+{:.1f} GDD) accelerates vegetative phase and raises water transpiration; "
            "adequate soil moisture during heading is essential to prevent heat-induced spikelet sterility."
        ).format(gdd_delta) if gdd_delta and gdd_delta > 0 else "Thermal accumulation remains stable across periods."
    }


def compute_onset_series(
    daily_df: pd.DataFrame,
    config: Optional[AgronomicConfig] = None,
    start_year: int = 2001,
    end_year: int = 2025,
) -> Dict[str, Any]:
    """Compute annual onset dates and DOYs for all years between start_year and end_year."""
    cfg = config or AgronomicConfig()
    series = []
    window_start_censored_years = []
    
    for yr in range(start_year, end_year + 1):
        onset = detect_rainfall_onset(daily_df, yr, cfg)
        if onset:
            series.append(onset)
            search_start_str = f"{yr}-{cfg.search_start_month:02d}-{cfg.search_start_day:02d}"
            if onset.get("onset_date") == search_start_str:
                window_start_censored_years.append(yr)
        else:
            series.append({
                "year": yr,
                "onset_date": None,
                "doy": None,
                "cumulative_window_rainfall_mm": None,
                "max_lookahead_dry_spell_days": None,
                "is_leap_year": bool(calendar_is_leap(yr)),
                "status": "no_onset_detected_or_excessive_missing_days"
            })

    # Segregate into Period 1 (2001-2012) and Period 2 (2013-2025)
    p1 = [item for item in series if 2001 <= item["year"] <= 2012 and item.get("doy") is not None]
    p2 = [item for item in series if 2013 <= item["year"] <= 2025 and item.get("doy") is not None]

    valid_samples = len(p1) + len(p2)
    censored_fraction = round(len(window_start_censored_years) / valid_samples, 4) if valid_samples > 0 else 0.0

    return {
        "full_series": series,
        "window_start_censored_years": window_start_censored_years,
        "censored_fraction": censored_fraction,
        "period_1": {
            "label": "2001–2012 Baseline",
            "start_year": 2001,
            "end_year": 2012,
            "total_years": 12,
            "valid_samples": len(p1),
            "onsets": p1,
            "doys": [x["doy"] for x in p1],
        },
        "period_2": {
            "label": "2013–2025 Recent Era",
            "start_year": 2013,
            "end_year": 2025,
            "total_years": 13,
            "valid_samples": len(p2),
            "onsets": p2,
            "doys": [x["doy"] for x in p2],
        },
    }


def calendar_is_leap(year: int) -> bool:
    """Deterministic leap year check."""
    return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)


def doy_to_calendar_date(year: int, doy: int) -> str:
    """Convert Day of Year to calendar string YYYY-MM-DD."""
    return (pd.Timestamp(year, 1, 1) + pd.Timedelta(days=doy - 1)).strftime("%Y-%m-%d")


def compare_periods(
    p1_doys: List[int],
    p2_doys: List[int],
) -> Dict[str, Any]:
    """Execute Mann-Whitney U test comparing Period 1 vs Period 2 onset DOYs.

    Documented Statistical Assumptions & Limitations:
    1. Independent Observations: Each year's onset DOY is treated as an independent observation.
    2. Continuous / Ordinal Data: DOY represents an ordered calendar day.
    3. Non-Parametric Rank-Sum: Does not assume a normal distribution; evaluates whether one
       distribution is stochastically shifted relative to the other.
    4. Limitations: With n1=12 and n2=13, statistical power is moderate. A non-significant p-value
       (p >= 0.05) indicates high interannual climate variability, not proof of zero shift.
    """
    n1 = len(p1_doys)
    n2 = len(p2_doys)

    if n1 < 5 or n2 < 5:
        return {
            "status": "insufficient_evidence",
            "n1": n1,
            "n2": n2,
            "shift_days_median": None,
            "shift_days_mean": None,
            "mann_whitney_u": None,
            "p_value": None,
            "is_significant": False,
            "notes": f"Insufficient valid onset years detected (n1={n1}, n2={n2}; minimum 5 required)."
        }

    s1 = pd.Series(p1_doys, dtype=float)
    s2 = pd.Series(p2_doys, dtype=float)

    p1_median = float(s1.median())
    p2_median = float(s2.median())
    p1_mean = float(s1.mean())
    p2_mean = float(s2.mean())

    shift_median = round(p2_median - p1_median, 1)
    shift_mean = round(p2_mean - p1_mean, 1)

    # Mann-Whitney U test (two-sided)
    u_res = stats.mannwhitneyu(s2, s1, alternative="two-sided")
    u_stat = float(u_res.statistic)
    p_val = float(u_res.pvalue)
    is_significant = bool(p_val < 0.05)

    if is_significant:
        status = "statistically_significant_delay" if shift_median > 0 else "statistically_significant_advance"
    else:
        if abs(shift_median) >= 3.0:
            status = "moderate_shift_cautionary"
        else:
            status = "no_statistically_significant_shift"

    return {
        "status": status,
        "n1": n1,
        "n2": n2,
        "period_1_median_doy": p1_median,
        "period_2_median_doy": p2_median,
        "period_1_mean_doy": round(p1_mean, 1),
        "period_2_mean_doy": round(p2_mean, 1),
        "shift_days_median": shift_median,
        "shift_days_mean": shift_mean,
        "mann_whitney_u": round(u_stat, 2),
        "p_value": round(p_val, 4),
        "is_significant": is_significant,
        "assumptions": [
            "Observations are independent annual realizations of the South Asian summer monsoon onset.",
            "Two-sided Mann-Whitney rank sum test evaluates stochastic dominance without assuming normality.",
            "High interannual variance in Bangladesh monsoons means substantial shifts can occur even at p > 0.05.",
        ],
        "limitations": [
            "Sample sizes (n1=12, n2=13) reflect available satellite observation eras, yielding moderate statistical power.",
            "Rainfall onset shift does not directly equal transplanting window shift; seedbed and soil hydrology must mediate recommendations.",
        ],
    }


def run_sensitivity_analysis(
    daily_df: pd.DataFrame,
    base_config: Optional[AgronomicConfig] = None,
    step_mm: float = 5.0,
) -> List[Dict[str, Any]]:
    """Evaluate onset distributions and shift across threshold_mm +/- step_mm (e.g. 20, 25, 30 mm)."""
    cfg = base_config or AgronomicConfig()
    thresholds = [
        round(cfg.threshold_mm - step_mm, 1),
        round(cfg.threshold_mm, 1),
        round(cfg.threshold_mm + step_mm, 1),
    ]

    results = []
    for th in thresholds:
        step_cfg = AgronomicConfig(
            search_start_month=cfg.search_start_month,
            search_start_day=cfg.search_start_day,
            search_end_month=cfg.search_end_month,
            search_end_day=cfg.search_end_day,
            window_days=cfg.window_days,
            threshold_mm=th,
            min_rainy_days=cfg.min_rainy_days,
            dry_spell_window_days=cfg.dry_spell_window_days,
            dry_spell_max_consecutive_days=cfg.dry_spell_max_consecutive_days,
            dry_day_threshold_mm=cfg.dry_day_threshold_mm,
            base_temperature_c=cfg.base_temperature_c,
            upper_cap_temperature_c=cfg.upper_cap_temperature_c,
        )
        series_data = compute_onset_series(daily_df, step_cfg)
        comparison = compare_periods(
            series_data["period_1"]["doys"],
            series_data["period_2"]["doys"],
        )
        results.append({
            "threshold_mm": th,
            "shift_days_median": comparison.get("shift_days_median"),
            "shift_days_mean": comparison.get("shift_days_mean"),
            "period_1_median_doy": comparison.get("period_1_median_doy"),
            "period_2_median_doy": comparison.get("period_2_median_doy"),
            "p_value": comparison.get("p_value"),
            "valid_samples_p1": comparison.get("n1"),
            "valid_samples_p2": comparison.get("n2"),
            "status": comparison.get("status"),
        })

    return results


def generate_recommendation(
    district: str,
    crop: str,
    comparison: Dict[str, Any],
    sensitivity: List[Dict[str, Any]],
    gdd_context: Dict[str, Any],
    lang: str = "bn",
    wet_season_comparison: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Generate agronomically defensible recommendations and an SMS summary (< 160 chars).

    Agronomic Calibration Rationale (BARI / BRRI Krishi Diary):
    - Rainfed Aman rice needs 25-30 days in nursery bed before transplanting.
    - Sowing too early risks seedling over-aging and transplant shock if rains stall.
    - Sowing too late (transplanting after August 15) risks terminal drought during flowering
      (October/November) and cold injury from northern air masses.
    - When evidence shows a delayed onset shift, the defensible recommendation is:
      1. Moderate buffer shift of nursery seedbeds (7 to 10 days).
      2. Variety switch: recommend short/medium duration varieties (e.g. BRRI dhan75, 115 days;
         BRRI dhan71, 115-120 days) rather than 145-day BRRI dhan49.
      3. Staggered seedbeds in 2 batches (7 days apart) to mitigate false onset risk.
      4. Prepare supplemental irrigation readiness for October heading stage.
    """
    shift = comparison.get("shift_days_median") or 0.0
    status = comparison.get("status", "no_statistically_significant_shift")
    is_significant = bool(comparison.get("is_significant", False))
    p_val = comparison.get("p_value")
    censored_fraction = comparison.get("censored_fraction", 0.0)
    is_censored = bool(censored_fraction > 0.30 or status == "unreliable_window_censored")

    dist_registry = {
        "rajshahi": {"name_en": "Rajshahi", "name_bn": "রাজশাহী"},
        "bogura": {"name_en": "Bogura", "name_bn": "বগুড়া"},
        "rangpur": {"name_en": "Rangpur", "name_bn": "রংপুর"},
        "mymensingh": {"name_en": "Mymensingh", "name_bn": "ময়মনসিংহ"},
        "jashore": {"name_en": "Jashore", "name_bn": "যশোর"},
        "cumilla": {"name_en": "Cumilla", "name_bn": "কুমিল্লা"},
    }
    geo_path = Path(__file__).resolve().parents[2] / "data" / "geo" / "bd_districts.json"
    if geo_path.exists():
        try:
            with open(geo_path, "r", encoding="utf-8") as f:
                geo_data = json.load(f)
            for d in geo_data.get("districts", []):
                k = d["name"].strip().lower().replace(" ", "_").replace("-", "_")
                if k == "comilla":
                    k = "cumilla"
                if k not in dist_registry:
                    dist_registry[k] = {"name_en": d["name"], "name_bn": d.get("bn_name", d["name"])}
        except Exception:
            pass
    crop_registry = {
        "aman": {"name_en": "Aman", "name_bn": "আমন"},
        "aus": {"name_en": "Aus", "name_bn": "আউশ"},
        "boro": {"name_en": "Boro", "name_bn": "বোরো"},
    }

    dist_key = district.strip().lower()
    crop_key = crop.strip().lower()

    district_bn = dist_registry.get(dist_key, {}).get("name_bn", district)
    district_en = dist_registry.get(dist_key, {}).get("name_en", district.capitalize())
    crop_bn = crop_registry.get(crop_key, {}).get("name_bn", crop)
    crop_en = crop_registry.get(crop_key, {}).get("name_en", crop.capitalize())

    # Recommended Calendar Windows: apply buffer ONLY in case (a)
    if is_significant and shift >= 3.0 and not is_censored:
        buffer_days = min(int(round(shift)), 12)
        sow_start_doy = 166 + buffer_days  # June 15 + buffer
        sow_end_doy = 181 + buffer_days    # June 30 + buffer
        trans_start_doy = 196 + buffer_days # July 15 + buffer
        trans_end_doy = 217 + buffer_days   # August 5 + buffer
    else:
        sow_start_doy = 166
        sow_end_doy = 181
        trans_start_doy = 196
        trans_end_doy = 217

    sowing_window_bn = f"{doy_to_bn_date(2025, sow_start_doy)} – {doy_to_bn_date(2025, sow_end_doy)}"
    transplant_window_bn = f"{doy_to_bn_date(2025, trans_start_doy)} – {doy_to_bn_date(2025, trans_end_doy)}"
    sowing_window_en = f"{doy_to_en_date(2025, sow_start_doy)} - {doy_to_en_date(2025, sow_end_doy)}"
    transplant_window_en = f"{doy_to_en_date(2025, trans_start_doy)} - {doy_to_en_date(2025, trans_end_doy)}"

    # Evaluate whether wet season onset is significantly earlier
    wet_shift = wet_season_comparison.get("shift_days_median") if wet_season_comparison else None
    wet_p = wet_season_comparison.get("p_value") if wet_season_comparison else None
    wet_q = wet_season_comparison.get("q_value_bh", wet_p) if wet_season_comparison else None
    wet_is_sig_earlier = bool(wet_q is not None and wet_q < 0.05 and wet_shift is not None and wet_shift <= -3.0)
    aman_not_sig = (not is_significant or shift > -3.0 or is_censored)

    # Headline and SMS formulations
    if status == "insufficient_evidence":
        evidence_level = "insufficient"
        headline_bn = f"{district_bn} জেলায় পর্যাপ্ত পর্যবেক্ষণ উপাত্ত না থাকায় প্রচলিত বিআরআরআই ক্যালেন্ডার অনুসরণ করুন।"
        headline_en = f"Insufficient continuous observation data for {district_en}; follow standard BRRI crop calendar."
        sms_bn = f"{district_bn} {crop_bn}: বীজতলা জুনের শেষ সপ্তাহে ফেলুন। পর্যাপ্ত বৃষ্টি না হলে সম্পূরক সেচ দিন। বিআরআরআই পরামর্শ।"
    elif is_significant and shift >= 3.0 and not is_censored:
        evidence_level = "significant"
        delay_int = int(round(shift))
        headline_bn = (
            f"নাসা উপাত্তে {district_bn} অঞ্চলে বৃষ্টিপাত শুরুর মধ্যমা {delay_int} দিন পিছিয়েছে; "
            f"বীজতলা বপন ৭-১০ দিন পিছিয়ে স্বল্পমেয়াদী ব্রি ধান-৭৫ চাষের পরামর্শ দেওয়া হচ্ছে।"
        )
        headline_en = (
            f"NASA observations indicate a {delay_int}-day delay in median rainfall onset for {district_en}. "
            f"Shift nursery sowing by 7–10 days and cultivate short-duration BRRI dhan75."
        )
        sms_bn = (
            f"{district_bn} {crop_bn}: বৃষ্টি {delay_int} দিন দেরিতে আসছে। "
            f"বীজতলা {doy_to_bn_date(2025, sow_start_doy)} এর পরে ফেলুন। "
            f"ব্রি ধান৭৫ চাষ করুন ও সম্পূরক সেচ প্রস্তুত রাখুন।"
        )
    elif is_significant and shift <= -3.0 and not is_censored:
        evidence_level = "significant"
        adv_int = abs(int(round(shift)))
        headline_bn = f"নাসা উপাত্তে {district_bn} অঞ্চলে বৃষ্টিপাত {adv_int} দিন এগিয়ে এসেছে; আগাম বীজতলা প্রস্তুতি নিন।"
        headline_en = f"NASA data indicates rainfall onset advanced by {adv_int} days in {district_en}; prepare early seedbeds."
        sms_bn = f"{district_bn} {crop_bn}: বৃষ্টি {adv_int} দিন আগে শুরু হচ্ছে। বীজতলা জুনের দ্বিতীয় সপ্তাহে ফেলুন। ব্রি ধান৪৯/৭৫ লাগান।"
    elif wet_is_sig_earlier and aman_not_sig:
        # Phase C3: Pre-monsoon / wet-season onset earlier, but conventional Aman onset unchanged
        if crop_key == "aman":
            evidence_level = "not_significant"
            headline_bn = f"{district_bn} অঞ্চলে আমন রোপণ সময় অপরিবর্তিত (জুলাইয়ের মাঝামাঝি থেকে আগস্টের প্রথম সপ্তাহ); প্রচলিত বিআরআরআই ক্যালেন্ডার অনুসরণ করুন।"
            headline_en = f"Aman planting window for {district_en} remains unchanged (mid-July to early August); follow standard BRRI crop calendar."
            sms_bn = f"{district_bn} আমন: রোপণের সময় অপরিবর্তিত। বীজতলা জুনের শেষ সপ্তাহে ও রোপণ জুলাইতে করুন। বিআরআরআই নির্দেশিকা মেনে চলুন।"
        elif crop_key == "aus":
            evidence_level = "significant"
            headline_bn = f"{district_bn} অঞ্চলে প্রাক-বর্ষার বৃষ্টি এখন আগে শুরু হচ্ছে: আউশ রোপণ ও জমি প্রস্তুতি আগে করা যায়।"
            headline_en = f"Pre-monsoon rains in {district_en} now start earlier: Aus planting and land preparation can advance."
            sms_bn = f"{district_bn} {crop_bn}: প্রাক-বর্ষার বৃষ্টি এখন আগে শুরু হচ্ছে: আউশ রোপণ ও জমি প্রস্তুতি আগে করা যায়।"
        else:
            evidence_level = "not_significant"
            headline_bn = f"{district_bn} অঞ্চলে প্রাক-বর্ষার বৃষ্টি এখন আগে শুরু হচ্ছে: জমি প্রস্তুতি আগে করা যায়।"
            headline_en = f"Pre-monsoon rains in {district_en} now start earlier: early land preparation can advance."
            sms_bn = f"{district_bn} {crop_bn}: প্রাক-বর্ষার বৃষ্টি এখন আগে শুরু হচ্ছে: জমি প্রস্তুতি আগে করা যায়।"
    else:
        # Case (c): Not significant / censored / moderate trend
        evidence_level = "not_significant"
        p_val_display = p_val if p_val is not None else "N/A"
        headline_bn = (
            f"{district_bn} অঞ্চলে ২৫ বছরের নাসা উপাত্তে বর্ষা শুরুর সময়ে পরিসংখ্যানগতভাবে নিশ্চিত কোনো পরিবর্তন পাওয়া যায়নি, "
            f"তবে বছরভেদে শুরুর সময় অনেক ওঠানামা করে। ঝুঁকি কমাতে দুই কিস্তিতে বীজতলা ফেলুন এবং স্বল্পমেয়াদী জাত বিবেচনা করুন।"
        )
        english_headline = (
            f"No statistically significant change in rainfall onset for {district_en} over 2001-2025 (p = {p_val_display}). "
            f"Onset varies widely from year to year, so stagger seedbeds and consider short-duration varieties."
        )
        headline_en = english_headline
        sms_bn = (
            f"{district_bn} {crop_bn}: বর্ষা শুরুর সময় অনিশ্চিত। বীজতলা ৭ দিন ব্যবধানে দুই কিস্তিতে ফেলুন। "
            f"স্বল্পমেয়াদী জাত (ব্রি ধান৭৫) বিবেচনা করুন।"
        )

    warning_en = comparison.get("data_warning_en")
    warning_bn = comparison.get("data_warning_bn")
    if is_censored and not warning_en:
        warning_en = "Onset detection is unreliable here due to search window censoring."
        warning_bn = "সতর্কতা: বর্ষা শুরুর তারিখ অনুসন্ধানের সীমানায় আবদ্ধ হওয়ায় এই ফলাফল নির্ভরযোগ্য নয়।"

    return {
        "evidence_level": evidence_level,
        "bangla_headline": headline_bn,
        "english_headline": headline_en,
        "bangla_sms": sms_bn,
        "sms_character_count": len(sms_bn),
        "data_warning_en": warning_en,
        "data_warning_bn": warning_bn,
        "data_warning": warning_bn if lang == "bn" else warning_en,
        "suggested_nursery_window_bn": sowing_window_bn,
        "suggested_transplant_window_bn": transplant_window_bn,
        "suggested_nursery_window_en": sowing_window_en,
        "suggested_transplant_window_en": transplant_window_en,
        "recommended_varieties": [
            {
                "name": "ব্রি ধান-৭৫ (BRRI dhan75)",
                "duration_days": 115,
                "role": "স্বল্পমেয়াদী খরা-এড়ানো জাত (Drought-escaping early maturity)",
                "why": "দেরিতে রোপণ করলেও অক্টোবরের শেষ ও নভেম্বরের শীত ও খরার আগে পরিপক্ক হয়।"
            },
            {
                "name": "ব্রি ধান-৭১ (BRRI dhan71)",
                "duration_days": 118,
                "role": "খরা সহনশীল জাত (Drought-tolerant)",
                "why": "বরেন্দ্র অঞ্চলের পানির সংকটে উচ্চ ফলন ধরে রাখে।"
            },
            {
                "name": "ব্রি ধান-৪৯ (BRRI dhan49)",
                "duration_days": 145,
                "role": "প্রধান মৌসুমী জাত (Standard long-duration)",
                "why": "কেবল জুলাইর মধ্যে রোপণ সম্ভব হলে এবং সম্পূরক সেচ সুবিধা থাকলে চাষ করুন।"
            }
        ],
        "tactical_actions": [
            "বীজতলা দুই কিস্তিতে (৭ দিন ব্যবধানে) তৈরি করুন যেন ভুয়া অনসেটে সম্পূর্ণ ক্ষতি না হয়।",
            "দানা পুষ্ট হওয়ার সময় (অক্টোবর) সম্পূরক সেচ বা AWD নলকূপ প্রস্তুত রাখুন।",
            "২৫ দিনের বেশি বয়স্ক চারা রোপণ পরিহার করুন।"
        ],
        "scientific_rationale": (
            f"বৃষ্টিপাত অনসেটের মধ্যমা শিফট ({shift:+.1f} দিন, p={p_val if p_val is not None else 'N/A'}) "
            f"সরাসরি রোপণ শিফটের সমান নয়। ধানের জীবনকাল (Duration) ও পরবর্তী রবি ফসলের (সরিষা/গম) "
            f"বপন সময় বিবেচনা করে সর্বোচ্চ ৭-১০ দিনের পরিমিত শিফট এবং দ্রুত পরিপক্ক জাতের নির্বাচন সুপারিশ করা হয়েছে।"
        )
    }


def doy_to_bn_date(year: int, doy: int) -> str:
    """Helper to convert DOY to Bengali formatted date string (e.g. ২৫ জুন)."""
    ts = pd.Timestamp(year, 1, 1) + pd.Timedelta(days=doy - 1)
    month_names_bn = {
        1: "জানুয়ারি", 2: "ফেব্রুয়ারি", 3: "মার্চ", 4: "এপ্রিল",
        5: "মে", 6: "জুন", 7: "জুলাই", 8: "আগস্ট",
        9: "সেপ্টেম্বর", 10: "অক্টোবর", 11: "নভেম্বর", 12: "ডিসেম্বর"
    }
    bn_digits = {"0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯"}
    day_str = "".join(bn_digits.get(d, d) for d in str(ts.day))
    return f"{day_str} {month_names_bn[ts.month]}"


def doy_to_en_date(year: int, doy: int) -> str:
    """Helper to convert DOY to English formatted date string (e.g. 25 June)."""
    ts = pd.Timestamp(year, 1, 1) + pd.Timedelta(days=doy - 1)
    return ts.strftime("%d %B")
