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
    planning_periods: Sequence[str] = ("Y1_S1", "Y1_S2", "Y2_S1", "Y2_S2", "Y3_S1", "Y3_S2"),
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

    for idx, period in enumerate(planning_periods):
        year = (idx // 2) + 1
        s_idx = (idx % 2) + 1
        is_dry = (s_idx == 1)
        s_key = "rabi" if is_dry else "kharif"

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

        seasonal_envs[period] = SeasonalEnvironment(
            period=period,
            year=year,
            season_index=s_idx,
            season_name=f"Year {year} {'Rabi (Nov-Apr, dry)' if is_dry else 'Kharif (May-Oct, wet)'}",
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
) -> tuple[float, str]:
    """Calculate soil suitability factor [0.0, 1.15] based on pH, OM, and texture."""
    ph = getattr(field_state, "ph", 6.5)
    if ph is None or not math.isfinite(ph):
        ph = 6.5
    om = getattr(field_state, "organic_matter", 2.0)
    if om is None or not math.isfinite(om):
        om = 2.0
    texture = getattr(field_state, "texture", "loam") or "loam"

    ph_min = float(crop.get("min_ph", 5.5))
    ph_max = float(crop.get("max_ph", 7.5))
    ph_opt = (ph_min + ph_max) / 2.0

    if ph < ph_min - 0.3 or ph > ph_max + 0.3:
        return 0.0, f"Soil pH {ph:.1f} out of acceptable range [{ph_min}, {ph_max}]"

    half_ph_range = max(0.5, (ph_max - ph_min) / 2.0)
    ph_factor = max(0.5, 1.0 - 0.35 * (abs(ph - ph_opt) / half_ph_range))

    # Organic matter multiplier (2.0% baseline)
    om_factor = max(0.85, min(1.15, 1.0 + 0.04 * (om - 2.0)))

    # Texture multiplier (1.00 baseline for loam)
    texture_multipliers = {
        "loam": 1.00,
        "silty_loam": 1.00,
        "clay_loam": 0.98,
        "sandy_loam": 0.94,
        "unknown": 1.00,
    }
    tex_factor = texture_multipliers.get(str(texture).lower(), 1.00)

    soil_factor = round(ph_factor * om_factor * tex_factor, 4)
    return soil_factor, f"pH={ph:.1f}, OM={om:.1f}%, Texture={texture} (factor={soil_factor:.2f})"


def compute_crop_water_balance(
    crop: Mapping[str, Any],
    env: SeasonalEnvironment,
    field_state: Any,
) -> dict[str, Any]:
    """Calculate crop seasonal water demand, irrigation deficit, and water stress."""
    base_water = float(crop.get("water_requirement", 400.0))
    irrig_cap = getattr(field_state, "irrigation_capacity_mm", None)
    if irrig_cap is None or not math.isfinite(irrig_cap):
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
    soil_factor, soil_diag = compute_crop_soil_suitability(crop, field_state)
    water_data = compute_crop_water_balance(crop, env, field_state)

    is_feasible = (thermal_factor > 0.0) and (soil_factor > 0.0) and water_data["is_water_feasible"]

    if not is_feasible:
        dyn_yield = 0.0
        dyn_margin = -base_cost
    else:
        # Dynamic expected yield
        dyn_yield = round(base_yield * thermal_factor * soil_factor * water_data["water_stress_factor"], 3)
        # Production cost includes base cultivation + energy pumping cost (20 BDT/mm for pumped water)
        pumping_cost = water_data["irrigation_supplied_mm"] * 20.0
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
    planning_periods: Sequence[str] = ("Y1_S1", "Y1_S2", "Y2_S1", "Y2_S2", "Y3_S1", "Y3_S2"),
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
