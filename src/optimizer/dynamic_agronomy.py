"""Dynamic Agronomic Response Engine for FieldShift.

Calculates climate suitability, water balance, irrigation deficit, soil response,
dynamic yield, production costs, gross margins, and soil health scores dynamically
from:
1. Real field properties (soil texture, pH, organic matter, irrigation capacity, area)
2. Location-specific NASA POWER environmental variables (temperature, rainfall, solar radiation)
3. Seasonal partitioning (Dry/Rabi vs Wet/Kharif)
4. Crop botanical and agronomic reference properties
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Mapping, Optional, Sequence
import numpy as np
import pandas as pd

from src.data.crops import load_crop_knowledge


CROP_SOIL_TEXTURE_SUITABILITY = {
    "rice": {"clay": 1.12, "clay_loam": 1.08, "silty_loam": 0.98, "loam": 0.94, "sandy_loam": 0.72, "unknown": 1.0},
    "boro rice": {"clay": 1.14, "clay_loam": 1.08, "silty_loam": 0.98, "loam": 0.94, "sandy_loam": 0.70, "unknown": 1.0},
    "aus rice": {"clay": 1.08, "clay_loam": 1.05, "silty_loam": 1.00, "loam": 0.96, "sandy_loam": 0.80, "unknown": 1.0},
    "chickpea": {"sandy_loam": 1.15, "silty_loam": 1.10, "loam": 1.00, "clay_loam": 0.72, "clay": 0.35, "unknown": 1.0},
    "lentil": {"sandy_loam": 1.15, "silty_loam": 1.10, "loam": 1.00, "clay_loam": 0.75, "clay": 0.40, "unknown": 1.0},
    "potato": {"sandy_loam": 1.18, "silty_loam": 1.14, "loam": 1.00, "clay_loam": 0.70, "clay": 0.30, "unknown": 1.0},
    "groundnut": {"sandy_loam": 1.20, "silty_loam": 1.10, "loam": 1.00, "clay_loam": 0.70, "clay": 0.35, "unknown": 1.0},
    "maize": {"silty_loam": 1.12, "loam": 1.06, "clay_loam": 0.98, "sandy_loam": 0.92, "clay": 0.80, "unknown": 1.0},
    "mustard": {"silty_loam": 1.10, "loam": 1.05, "sandy_loam": 1.00, "clay_loam": 0.95, "clay": 0.78, "unknown": 1.0},
    "sunflower": {"clay_loam": 1.10, "loam": 1.05, "silty_loam": 1.00, "sandy_loam": 0.92, "clay": 0.88, "unknown": 1.0},
    "soybean": {"clay_loam": 1.10, "loam": 1.05, "silty_loam": 1.00, "sandy_loam": 0.90, "clay": 0.85, "unknown": 1.0},
    "sesame": {"sandy_loam": 1.15, "silty_loam": 1.08, "loam": 1.00, "clay_loam": 0.72, "clay": 0.40, "unknown": 1.0},
    "wheat": {"silty_loam": 1.14, "loam": 1.05, "clay_loam": 0.95, "sandy_loam": 0.90, "clay": 0.78, "unknown": 1.0},
    "tomato": {"silty_loam": 1.10, "loam": 1.05, "sandy_loam": 1.04, "clay_loam": 0.85, "clay": 0.55, "unknown": 1.0},
    "jute": {"silty_loam": 1.12, "clay_loam": 1.06, "loam": 1.00, "sandy_loam": 0.88, "clay": 0.85, "unknown": 1.0},
    "fallow": {"clay": 1.0, "clay_loam": 1.0, "silty_loam": 1.0, "loam": 1.0, "sandy_loam": 1.0, "unknown": 1.0},
}

COASTAL_SALINE_DISTRICTS = {
    "satkhira", "khulna", "bagerhat", "patuakhali", "barguna", "bhola", "pirojpur", "jhalokati", "coxsbazar"
}

HAOR_DISTRICTS = {
    "sunamganj", "netrokona", "kishoreganj", "habiganj", "moulvibazar", "sylhet", "brahmanbaria"
}


@dataclass(frozen=True)
class SeasonalEnvironment:
    """Environmental condition for a specific planning season."""
    period: str
    year: int
    season_index: int  # 1 = Dry/Rabi, 2 = Wet/Kharif
    season_name: str
    mean_temperature_c: float
    min_temperature_c: float
    max_temperature_c: float
    rainfall_mm: float
    solar_radiation_mj: float
    relative_humidity_pct: float
    environment_basis: str = "default_no_history" 


def partition_seasonal_environments(
    field_state: Any,
    environmental_history: Optional[pd.DataFrame] = None,
    planning_periods: Sequence[str] = ("Y1_S1", "Y1_S2", "Y1_S3", "Y2_S1", "Y2_S2", "Y2_S3"),
) -> dict[str, SeasonalEnvironment]:
    """Derive seasonal environmental conditions from NASA POWER history or field baseline."""
    base_temp = getattr(field_state, "temperature", 26.0)
    if base_temp is None or not math.isfinite(base_temp):
        base_temp = 26.0

    base_rain = getattr(field_state, "rainfall", 500.0)
    if base_rain is None or not math.isfinite(base_rain):
        base_rain = 500.0

    has_history = environmental_history is not None and not environmental_history.empty and "date" in environmental_history.columns

    seasonal_envs = {}
    
    # Calculate overall NASA summary if history is available
    overall_t_mean = base_temp
    overall_t_min = base_temp - 4.0
    overall_t_max = base_temp + 4.0
    overall_r_tot = base_rain
    overall_solar = 16.0
    overall_rh = 75.0

    n_years = 0
    valid_df = pd.DataFrame()
    if has_history:
        df = environmental_history.copy()
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        valid_df = df.loc[df["date"].notna()]
        if not valid_df.empty:
            unique_years = valid_df["date"].dt.year.unique()
            n_years = len(unique_years)
            if "temperature" in valid_df and not valid_df["temperature"].dropna().empty:
                overall_t_mean = float(valid_df["temperature"].mean())
                overall_t_min = float(valid_df["temperature"].min())
                overall_t_max = float(valid_df["temperature"].max())
            if "rainfall" in valid_df and not valid_df["rainfall"].dropna().empty:
                overall_r_tot = float(valid_df["rainfall"].sum())
            if "solar_radiation" in valid_df and not valid_df["solar_radiation"].dropna().empty:
                overall_solar = float(valid_df["solar_radiation"].mean())
            if "humidity" in valid_df and not valid_df["humidity"].dropna().empty:
                overall_rh = float(valid_df["humidity"].mean())

    # Pre-calculate multi-year climatological stats if >= 2 years available
    climatology = {}
    if n_years >= 2 and not valid_df.empty:
        # 1. Kharif (May-Oct, wet)
        kharif_sub = valid_df.loc[valid_df["date"].dt.month.isin([5, 6, 7, 8, 9, 10])]
        if not kharif_sub.empty and len(kharif_sub["date"].dt.year.unique()) >= 2:
            k_rain_tot = float(kharif_sub.groupby(kharif_sub["date"].dt.year)["rainfall"].sum().mean())
            k_t_mean = float(kharif_sub.groupby(kharif_sub["date"].dt.year)["temperature"].mean().mean())
            tmin_col = "temp_min" if "temp_min" in kharif_sub and not kharif_sub["temp_min"].dropna().empty else "temperature"
            tmax_col = "temp_max" if "temp_max" in kharif_sub and not kharif_sub["temp_max"].dropna().empty else "temperature"
            k_t_min = float(kharif_sub.groupby(kharif_sub["date"].dt.year)[tmin_col].min().mean())
            k_t_max = float(kharif_sub.groupby(kharif_sub["date"].dt.year)[tmax_col].max().mean())
            k_solar = float(kharif_sub.groupby(kharif_sub["date"].dt.year)["solar_radiation"].mean().mean()) if "solar_radiation" in kharif_sub and not kharif_sub["solar_radiation"].dropna().empty else overall_solar
            k_rh = float(kharif_sub.groupby(kharif_sub["date"].dt.year)["humidity"].mean().mean()) if "humidity" in kharif_sub and not kharif_sub["humidity"].dropna().empty else overall_rh
            climatology["kharif"] = {
                "t_mean": k_t_mean, "t_min": k_t_min, "t_max": k_t_max,
                "r_tot": k_rain_tot, "solar": k_solar, "rh": k_rh,
                "basis": f"nasa_power_climatology_{n_years}_years"
            }

        # 2. Rabi (Nov-Apr, dry)
        rabi_year_series = valid_df["date"].apply(lambda d: d.year if d.month <= 4 else (d.year + 1 if d.month >= 11 else None))
        rabi_sub = valid_df.loc[rabi_year_series.notna()].copy()
        rabi_sub["rabi_year"] = rabi_year_series.dropna()
        if not rabi_sub.empty and len(rabi_sub["rabi_year"].unique()) >= 2:
            r_rain_tot = float(rabi_sub.groupby("rabi_year")["rainfall"].sum().mean())
            r_t_mean = float(rabi_sub.groupby("rabi_year")["temperature"].mean().mean())
            rtmin_col = "temp_min" if "temp_min" in rabi_sub and not rabi_sub["temp_min"].dropna().empty else "temperature"
            rtmax_col = "temp_max" if "temp_max" in rabi_sub and not rabi_sub["temp_max"].dropna().empty else "temperature"
            r_t_min = float(rabi_sub.groupby("rabi_year")[rtmin_col].min().mean())
            r_t_max = float(rabi_sub.groupby("rabi_year")[rtmax_col].max().mean())
            r_solar = float(rabi_sub.groupby("rabi_year")["solar_radiation"].mean().mean()) if "solar_radiation" in rabi_sub and not rabi_sub["solar_radiation"].dropna().empty else overall_solar
            r_rh = float(rabi_sub.groupby("rabi_year")["humidity"].mean().mean()) if "humidity" in rabi_sub and not rabi_sub["humidity"].dropna().empty else overall_rh
            climatology["rabi"] = {
                "t_mean": r_t_mean, "t_min": r_t_min, "t_max": r_t_max,
                "r_tot": r_rain_tot, "solar": r_solar, "rh": r_rh,
                "basis": f"nasa_power_climatology_{n_years}_years"
            }

    # Calculate climatology for both 2-season (Nov-Apr / May-Oct) and 3-season modes
    if n_years >= 2 and not valid_df.empty:
        # 2-season Rabi (Nov-Apr)
        rabi2_sub = valid_df.loc[valid_df["date"].dt.month.isin([11, 12, 1, 2, 3, 4])]
        if not rabi2_sub.empty:
            climatology["rabi_2season"] = {
                "t_mean": float(rabi2_sub.groupby(rabi2_sub["date"].dt.year)["temperature"].mean().mean()),
                "t_min": float(rabi2_sub.groupby(rabi2_sub["date"].dt.year)["temperature"].min().mean()),
                "t_max": float(rabi2_sub.groupby(rabi2_sub["date"].dt.year)["temperature"].max().mean()),
                "r_tot": float(rabi2_sub.groupby(rabi2_sub["date"].dt.year)["rainfall"].sum().mean()),
                "solar": float(rabi2_sub["solar_radiation"].mean()) if "solar_radiation" in rabi2_sub else overall_solar,
                "rh": float(rabi2_sub["humidity"].mean()) if "humidity" in rabi2_sub else 60.0,
                "basis": f"nasa_power_climatology_{n_years}_years"
            }
        # 2-season Kharif (May-Oct)
        kharif2_sub = valid_df.loc[valid_df["date"].dt.month.isin([5, 6, 7, 8, 9, 10])]
        if not kharif2_sub.empty:
            climatology["kharif_2season"] = {
                "t_mean": float(kharif2_sub.groupby(kharif2_sub["date"].dt.year)["temperature"].mean().mean()),
                "t_min": float(kharif2_sub.groupby(kharif2_sub["date"].dt.year)["temperature"].min().mean()),
                "t_max": float(kharif2_sub.groupby(kharif2_sub["date"].dt.year)["temperature"].max().mean()),
                "r_tot": float(kharif2_sub.groupby(kharif2_sub["date"].dt.year)["rainfall"].sum().mean()),
                "solar": float(kharif2_sub["solar_radiation"].mean()) if "solar_radiation" in kharif2_sub else overall_solar,
                "rh": float(kharif2_sub["humidity"].mean()) if "humidity" in kharif2_sub else 80.0,
                "basis": f"nasa_power_climatology_{n_years}_years"
            }
        # 3-season Rabi (Nov-Feb)
        rabi_sub = valid_df.loc[valid_df["date"].dt.month.isin([11, 12, 1, 2])]
        if not rabi_sub.empty:
            climatology["rabi_3season"] = {
                "t_mean": float(rabi_sub.groupby(rabi_sub["date"].dt.year)["temperature"].mean().mean()),
                "t_min": float(rabi_sub.groupby(rabi_sub["date"].dt.year)["temperature"].min().mean()),
                "t_max": float(rabi_sub.groupby(rabi_sub["date"].dt.year)["temperature"].max().mean()),
                "r_tot": float(rabi_sub.groupby(rabi_sub["date"].dt.year)["rainfall"].sum().mean()),
                "solar": float(rabi_sub["solar_radiation"].mean()) if "solar_radiation" in rabi_sub else overall_solar,
                "rh": float(rabi_sub["humidity"].mean()) if "humidity" in rabi_sub else 60.0,
                "basis": f"nasa_power_climatology_{n_years}_years"
            }
        # 3-season Kharif-1 (Mar-Jun)
        k1_sub = valid_df.loc[valid_df["date"].dt.month.isin([3, 4, 5, 6])]
        if not k1_sub.empty:
            climatology["kharif1"] = {
                "t_mean": float(k1_sub.groupby(k1_sub["date"].dt.year)["temperature"].mean().mean()),
                "t_min": float(k1_sub.groupby(k1_sub["date"].dt.year)["temperature"].min().mean()),
                "t_max": float(k1_sub.groupby(k1_sub["date"].dt.year)["temperature"].max().mean()),
                "r_tot": float(k1_sub.groupby(k1_sub["date"].dt.year)["rainfall"].sum().mean()),
                "solar": float(k1_sub["solar_radiation"].mean()) if "solar_radiation" in k1_sub else overall_solar,
                "rh": float(k1_sub["humidity"].mean()) if "humidity" in k1_sub else 70.0,
                "basis": f"nasa_power_climatology_{n_years}_years"
            }
        # 3-season Kharif-2 (Jul-Oct)
        k2_sub = valid_df.loc[valid_df["date"].dt.month.isin([7, 8, 9, 10])]
        if not k2_sub.empty:
            climatology["kharif2"] = {
                "t_mean": float(k2_sub.groupby(k2_sub["date"].dt.year)["temperature"].mean().mean()),
                "t_min": float(k2_sub.groupby(k2_sub["date"].dt.year)["temperature"].min().mean()),
                "t_max": float(k2_sub.groupby(k2_sub["date"].dt.year)["temperature"].max().mean()),
                "r_tot": float(k2_sub.groupby(k2_sub["date"].dt.year)["rainfall"].sum().mean()),
                "solar": float(k2_sub["solar_radiation"].mean()) if "solar_radiation" in k2_sub else overall_solar,
                "rh": float(k2_sub["humidity"].mean()) if "humidity" in k2_sub else 85.0,
                "basis": f"nasa_power_climatology_{n_years}_years"
            }

    has_three_seasons = any("_S3" in p for p in planning_periods) or (len(planning_periods) % 3 == 0)
    seasons_per_yr = 3 if has_three_seasons else 2

    for idx, period in enumerate(planning_periods):
        year = (idx // seasons_per_yr) + 1
        s_idx = (idx % seasons_per_yr) + 1
        is_dry = (s_idx == 1)
        if seasons_per_yr == 3:
            s_key = "rabi_3season" if s_idx == 1 else ("kharif1" if s_idx == 2 else "kharif2")
        else:
            s_key = "rabi_2season" if s_idx == 1 else "kharif_2season"

        if s_key in climatology:
            c_data = climatology[s_key]
            t_mean = c_data["t_mean"]
            t_min = c_data["t_min"]
            t_max = c_data["t_max"]
            r_tot = c_data["r_tot"]
            solar = c_data["solar"]
            rh = c_data["rh"]
            basis = c_data["basis"]
        elif has_history and not valid_df.empty:
            # Single window or partial season - extrapolate
            basis = "single_window_extrapolated"
            sub = valid_df.loc[valid_df["date"].dt.month.isin([11, 12, 1, 2, 3, 4] if is_dry else [5, 6, 7, 8, 9, 10])]
            if not sub.empty and "temperature" in sub and not sub["temperature"].dropna().empty:
                t_mean = float(sub["temperature"].mean())
                t_min = float(sub["temperature"].min())
                t_max = float(sub["temperature"].max())
                r_tot = float(sub["rainfall"].sum()) if "rainfall" in sub and not sub["rainfall"].dropna().empty else (overall_r_tot * 0.20 if is_dry else overall_r_tot)
                solar = float(sub["solar_radiation"].mean()) if "solar_radiation" in sub and not sub["solar_radiation"].dropna().empty else overall_solar
                rh = float(sub["humidity"].mean()) if "humidity" in sub and not sub["humidity"].dropna().empty else overall_rh
            else:
                if is_dry:
                    t_mean = overall_t_mean - 6.5
                    t_min = t_mean - 5.0
                    t_max = t_mean + 6.0
                    r_tot = round(overall_r_tot * 0.15, 1)
                    solar = round(overall_solar + 1.2, 2)
                    rh = max(45.0, round(overall_rh - 20.0, 1))
                else:
                    t_mean = overall_t_mean
                    t_min = overall_t_min
                    t_max = overall_t_max
                    r_tot = overall_r_tot
                    solar = overall_solar
                    rh = min(95.0, round(overall_rh, 1))
        else:
            basis = "default_no_history"
            if is_dry:
                t_mean = base_temp - 4.5
                t_min = t_mean - 4.5
                t_max = t_mean + 5.0
                r_tot = base_rain * 0.25
                solar = 17.2
                rh = 60.0
            else:
                t_mean = base_temp + 1.5
                t_min = t_mean - 3.5
                t_max = t_mean + 5.5
                r_tot = base_rain * 0.75
                solar = 15.5
                rh = 82.0

        if seasons_per_yr == 3:
            s_label = "Rabi (Nov-Feb, dry)" if s_idx == 1 else ("Kharif-1 (Mar-Jun, pre-monsoon)" if s_idx == 2 else "Kharif-2 (Jul-Oct, monsoon)")
        else:
            s_label = "Rabi (Nov-Apr, dry)" if s_idx == 1 else "Kharif (May-Oct, wet)"

        seasonal_envs[period] = SeasonalEnvironment(
            period=period,
            year=year,
            season_index=s_idx,
            season_name=f"Year {year} {s_label}",
            mean_temperature_c=round(t_mean, 2),
            min_temperature_c=round(t_min, 2),
            max_temperature_c=round(t_max, 2),
            rainfall_mm=round(r_tot, 1),
            solar_radiation_mj=round(solar, 2),
            relative_humidity_pct=round(rh, 1),
            environment_basis=basis,
        )

    return seasonal_envs

def compute_crop_thermal_suitability(
    crop: Mapping[str, Any],
    env: SeasonalEnvironment,
) -> tuple[float, str]:
    """Calculate crop temperature suitability factor [0.0, 1.0] and diagnostic status."""
    t_min = float(crop.get("min_temperature", 10.0))
    t_max = float(crop.get("max_temperature", 35.0))
    t_opt = (t_min + t_max) / 2.0
    t_curr = env.mean_temperature_c

    if t_curr < t_min - 1.0:
        return 0.0, f"Cold boundary: Season temperature {t_curr}°C is below crop minimum {t_min}°C"
    if t_curr > t_max + 1.0:
        return 0.0, f"Heat boundary: Season temperature {t_curr}°C exceeds crop maximum {t_max}°C"

    # Parabolic thermal response curve: 1.0 at optimum, smooth tapering towards 0.5 at boundaries
    half_width = max(1.0, (t_max - t_min) / 2.0)
    deviation = abs(t_curr - t_opt)
    suitability = max(0.40, min(1.0, 1.0 - 0.55 * (deviation / half_width) ** 2))
    return round(suitability, 4), f"Thermal suitability [{t_min}, {t_max}]°C (factor={suitability:.2f})"


def compute_crop_soil_suitability(
    crop: Mapping[str, Any],
    field_state: Any,
    season_name: str = "",
) -> tuple[float, str]:
    """Calculate soil suitability factor [0.0, 1.20] based on crop-specific texture, pH, OM, and coastal salinity."""
    crop_name = str(crop.get("crop", "")).lower().strip()
    ph = getattr(field_state, "ph", 6.5)
    if ph is None or not math.isfinite(ph):
        ph = 6.5
    om = getattr(field_state, "organic_matter", 2.0)
    if om is None or not math.isfinite(om):
        om = 2.0
    texture = str(getattr(field_state, "texture", "loam") or "loam").lower().strip()
    dist = str(getattr(field_state, "district", "") or "").lower().strip()

    ph_min = float(crop.get("min_ph", 5.5))
    ph_max = float(crop.get("max_ph", 7.5))
    ph_opt = (ph_min + ph_max) / 2.0

    if ph < ph_min - 0.3 or ph > ph_max + 0.3:
        return 0.0, f"Soil pH {ph:.1f} out of acceptable range [{ph_min}, {ph_max}]"

    half_ph_range = max(0.5, (ph_max - ph_min) / 2.0)
    ph_factor = max(0.5, 1.0 - 0.35 * (abs(ph - ph_opt) / half_ph_range))

    # Organic matter multiplier (2.0% baseline)
    om_factor = max(0.85, min(1.15, 1.0 + 0.04 * (om - 2.0)))

    # Crop-specific soil texture suitability factor
    crop_tex_map = CROP_SOIL_TEXTURE_SUITABILITY.get(crop_name, {})
    tex_factor = crop_tex_map.get(texture, 1.00)

    # Coastal salinity check in dry winter season (Rabi)
    salinity_factor = 1.00
    is_coastal = (dist in COASTAL_SALINE_DISTRICTS) or bool(getattr(field_state, "coastal_saline", False))
    is_rabi = ("rabi" in season_name.lower()) or ("s1" in season_name.lower())
    if is_coastal and is_rabi:
        if crop_name in ["chickpea", "lentil", "potato", "mungbean"]:
            # Salt-sensitive crops cannot tolerate dry season topsoil salinity (EC > 4 dS/m)
            return 0.0, f"Coastal salinity constraint: {crop_name} cannot tolerate dry-season soil salinity in {dist}."
        elif crop_name in ["sunflower", "mustard"]:
            salinity_factor = 1.08  # Salt-tolerant coastal recommendation

    soil_factor = round(ph_factor * om_factor * tex_factor * salinity_factor, 4)
    return soil_factor, f"pH={ph:.1f}, OM={om:.1f}%, Texture={texture} (factor={soil_factor:.2f})"


def compute_crop_water_balance(
    crop: Mapping[str, Any],
    env: SeasonalEnvironment,
    field_state: Any,
) -> dict[str, Any]:
    """Calculate crop seasonal water demand, irrigation deficit, and water stress."""
    base_water = float(crop.get("water_requirement", 400.0))
    dist = str(getattr(field_state, "district", "") or "").lower().strip()
    is_haor = (dist in HAOR_DISTRICTS) or bool(getattr(field_state, "seasonally_flooded", False))

    irrig_cap = getattr(field_state, "irrigation_capacity_mm", None)
    if irrig_cap is None or not math.isfinite(irrig_cap):
        if is_haor and env.season_index == 1:
            # Haor wetland basin: abundant surface water from beels and rivers for winter Boro
            irrig_cap = 1200.0
        else:
            irrig_cap = 400.0

    # Temperature adjustment to crop evapotranspiration (ETc)
    temp_adj = 1.0 + 0.010 * (env.mean_temperature_c - 24.0)
    crop_et_mm = round(base_water * max(0.85, min(1.20, temp_adj)), 1)

    # Effective rainfall (FAO approximation)
    p_eff = max(0.0, round(env.rainfall_mm * 0.80 - 4.0, 1)) if env.rainfall_mm > 5 else 0.0

    # Irrigation required to satisfy full ETc
    irrig_req = max(0.0, round(crop_et_mm - p_eff, 1))

    # Irrigation actually supplied (bounded by field capacity)
    irrig_supplied = min(irrig_req, irrig_cap)

    # Unmet water deficit
    water_deficit = max(0.0, round(irrig_req - irrig_supplied, 1))

    # Water stress factor (FAO yield response Ky ~ 0.85)
    deficit_ratio = water_deficit / crop_et_mm if crop_et_mm > 0 else 0.0
    water_factor = max(0.0, round(1.0 - 0.75 * deficit_ratio, 4))

    # If severe water deficit (>80% unmet ETc), crop cannot sustain economic yield
    is_water_feasible = deficit_ratio <= 0.80

    return {
        "crop_et_mm": crop_et_mm,
        "effective_rainfall_mm": p_eff,
        "irrigation_required_mm": irrig_req,
        "irrigation_supplied_mm": irrig_supplied,
        "irrigation_capacity_mm": irrig_cap,
        "water_deficit_mm": water_deficit,
        "water_stress_factor": water_factor,
        "is_water_feasible": is_water_feasible,
        "deficit_ratio": round(deficit_ratio, 3),
        "is_haor": is_haor,
    }


def compute_dynamic_crop_season_metrics(
    crop: Mapping[str, Any],
    env: SeasonalEnvironment,
    field_state: Any,
) -> dict[str, Any]:
    """Calculate complete dynamic performance metrics for a single crop in a specific season."""
    crop_name = str(crop.get("crop", ""))
    family = str(crop.get("family", "Unknown"))
    is_legume = bool(crop.get("is_legume", False))
    base_yield = float(crop.get("expected_yield", 1.0))
    market_price = float(crop.get("market_price", 50000.0))
    base_cost = float(crop.get("production_cost", 30000.0))

    thermal_factor, thermal_diag = compute_crop_thermal_suitability(crop, env)
    soil_factor, soil_diag = compute_crop_soil_suitability(crop, field_state, env.season_name)
    water_data = compute_crop_water_balance(crop, env, field_state)

    is_feasible = (thermal_factor > 0.0) and (soil_factor > 0.0) and water_data["is_water_feasible"]

    if not is_feasible:
        dyn_yield = 0.0
        dyn_margin = -base_cost
    else:
        # Dynamic expected yield
        dyn_yield = round(base_yield * thermal_factor * soil_factor * water_data["water_stress_factor"], 3)
        # Low-lift surface water pumping in haor costs 8 BDT/mm; deep groundwater pumping costs 20 BDT/mm
        pump_rate = 8.0 if water_data.get("is_haor") else 20.0
        pumping_cost = water_data["irrigation_supplied_mm"] * pump_rate
        dyn_cost = round(base_cost + pumping_cost, 2)
        dyn_margin = round(dyn_yield * market_price - dyn_cost, 2)

    # Dynamic soil contribution
    nutrient_effect = str(crop.get("nutrient_effect", "moderate_nutrient_demand")).lower()
    soil_impact = str(crop.get("soil_impact", "moderate_residue")).lower()

    n_val = 1.0 if "nitrogen_fixation" in nutrient_effect else (-1.0 if "high_nitrogen_demand" in nutrient_effect or "high_potassium_demand" in nutrient_effect else 0.0)
    s_val = 1.0 if "improves_rotation_diversity" in soil_impact else (0.5 if "residue" in soil_impact else -0.5)
    raw_soil = (float(is_legume) + n_val + s_val) / 3.0
    norm_soil = round((raw_soil + 0.5) / 1.5, 4)

    # Fair water efficiency score: 1.0 = zero irrigation required, tapering to 0 at 800mm
    irrig_req = float(water_data.get("irrigation_required_mm", 0.0))
    norm_water = round(1.0 - min(irrig_req, 800.0) / 800.0, 4)

    # Bare fallow receives zero agronomic benefit score
    if crop_name.lower() == "fallow":
        norm_soil = 0.0
        norm_water = 0.0

    return {
        "crop": crop_name,
        "family": family,
        "is_legume": is_legume,
        "period": env.period,
        "season_name": env.season_name,
        "is_feasible": is_feasible,
        "feasibility_reasons": {
            "thermal": thermal_diag,
            "soil": soil_diag,
            "water": f"Water stress factor: {water_data['water_stress_factor']:.2f} (deficit={water_data['water_deficit_mm']}mm)",
        },
        "base_yield_t_ha": base_yield,
        "dynamic_yield_t_ha": dyn_yield,
        "thermal_factor": thermal_factor,
        "soil_factor": soil_factor,
        "water_stress_factor": water_data["water_stress_factor"],
        "market_price_bdt_t": market_price,
        "dynamic_gross_margin_bdt_ha": dyn_margin,
        "crop_et_mm": water_data["crop_et_mm"],
        "water_balance": water_data,
        "normalized_water_score": norm_water,
        "normalized_soil_score": norm_soil,
    }


def build_dynamic_crop_season_matrix(
    field_state: Any,
    crops: Optional[pd.DataFrame] = None,
    environmental_history: Optional[pd.DataFrame] = None,
    planning_periods: Sequence[str] = ("Y1_S1", "Y1_S2", "Y1_S3", "Y2_S1", "Y2_S2", "Y2_S3"),
) -> dict[str, Any]:
    """Build the full dynamic matrix of crop-by-season performance metrics for MILP optimization."""
    crop_df = load_crop_knowledge() if crops is None else crops
    seasonal_envs = partition_seasonal_environments(
        field_state=field_state,
        environmental_history=environmental_history,
        planning_periods=planning_periods,
    )

    matrix = {}
    for period in planning_periods:
        env = seasonal_envs[period]
        matrix[period] = {}
        for _, crop_row in crop_df.iterrows():
            crop_name = str(crop_row["crop"])
            metrics = compute_dynamic_crop_season_metrics(crop_row, env, field_state)
            matrix[period][crop_name] = metrics

    # Normalize profit gross margins across candidate matrix
    all_margins = [
        matrix[p][c]["dynamic_gross_margin_bdt_ha"]
        for p in planning_periods
        for c in matrix[p]
        if matrix[p][c]["is_feasible"]
    ]
    min_m = min(all_margins) if all_margins else 0.0
    max_m = max(all_margins) if all_margins else 100000.0
    m_range = max(1.0, max_m - min_m)

    for p in planning_periods:
        for c in matrix[p]:
            if matrix[p][c]["is_feasible"]:
                norm_p = (matrix[p][c]["dynamic_gross_margin_bdt_ha"] - min_m) / m_range
                matrix[p][c]["normalized_profit_score"] = round(max(0.0, min(1.0, norm_p)), 4)
            else:
                matrix[p][c]["normalized_profit_score"] = 0.0

    first_period_basis = seasonal_envs[planning_periods[0]].environment_basis if planning_periods and planning_periods[0] in seasonal_envs else "default_no_history"
    return {
        "planning_periods": list(planning_periods),
        "seasonal_environments": seasonal_envs,
        "crop_season_matrix": matrix,
        "profit_bounds": {"min_bdt_ha": min_m, "max_bdt_ha": max_m},
        "environment_basis": first_period_basis,
    }
