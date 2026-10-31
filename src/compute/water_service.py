"""FieldShift Water & Irrigation Planning Engine.

Rooted in FAO-56 Penman-Monteith reference evapotranspiration (ET0) using NASA POWER
daily reanalysis, single-crop Kc curves (FAO-56 / BARI / BRRI), and daily soil-water balance
with hydraulic parameters derived from ISRIC SoilGrids 250m via Saxton & Rawls (2006).
"""

from __future__ import annotations

import math
import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from src.compute.advisory_service import DISTRICT_REGISTRY, load_district_climate_data
from src.compute.field_enrichment import fetch_isric_soilgrids
from src.compute.imerg import get_district_imerg_series

logger = logging.getLogger("water_service")

# Standard single-crop FAO-56 parameters for Bangladesh crops
# Stages: (L_ini_pct, L_dev_pct, L_mid_pct, L_late_pct), (Kc_ini, Kc_mid, Kc_late), root_depth_m (min, max), p_depletion
CROP_WATER_PARAMETERS: dict[str, dict[str, Any]] = {
    "Rice": {
        "stages": (0.15, 0.25, 0.40, 0.20),
        "kc": (1.05, 1.20, 0.90),
        "duration": 120,
        "root_depth": (0.20, 0.60),
        "p_depletion": 0.20,  # Flooded/semi-flooded paddy has low allowable depletion
        "season_label": "Kharif-2 (Aman)",
    },
    "Boro Rice": {
        "stages": (0.15, 0.25, 0.40, 0.20),
        "kc": (1.05, 1.20, 0.90),
        "duration": 150,
        "root_depth": (0.20, 0.60),
        "p_depletion": 0.20,
        "season_label": "Rabi (Winter Irrigated)",
    },
    "Aus Rice": {
        "stages": (0.15, 0.25, 0.40, 0.20),
        "kc": (1.00, 1.15, 0.85),
        "duration": 100,
        "root_depth": (0.20, 0.60),
        "p_depletion": 0.35,
        "season_label": "Kharif-1 (Pre-Monsoon)",
    },
    "Wheat": {
        "stages": (0.15, 0.25, 0.40, 0.20),
        "kc": (0.35, 1.15, 0.35),
        "duration": 115,
        "root_depth": (0.30, 1.00),
        "p_depletion": 0.55,
        "season_label": "Rabi",
    },
    "Mustard": {
        "stages": (0.20, 0.30, 0.35, 0.15),
        "kc": (0.35, 1.10, 0.35),
        "duration": 95,
        "root_depth": (0.25, 0.90),
        "p_depletion": 0.60,
        "season_label": "Rabi",
    },
    "Potato": {
        "stages": (0.25, 0.30, 0.30, 0.15),
        "kc": (0.50, 1.15, 0.75),
        "duration": 95,
        "root_depth": (0.25, 0.60),
        "p_depletion": 0.35,
        "season_label": "Rabi",
    },
    "Maize": {
        "stages": (0.15, 0.25, 0.40, 0.20),
        "kc": (0.30, 1.20, 0.50),
        "duration": 110,
        "root_depth": (0.30, 1.20),
        "p_depletion": 0.55,
        "season_label": "Rabi / Kharif-1",
    },
    "Lentil": {
        "stages": (0.20, 0.30, 0.35, 0.15),
        "kc": (0.40, 1.05, 0.30),
        "duration": 100,
        "root_depth": (0.25, 0.80),
        "p_depletion": 0.50,
        "season_label": "Rabi",
    },
    "Chickpea": {
        "stages": (0.20, 0.30, 0.35, 0.15),
        "kc": (0.40, 1.05, 0.30),
        "duration": 95,
        "root_depth": (0.25, 0.80),
        "p_depletion": 0.50,
        "season_label": "Rabi",
    },
    "Mungbean": {
        "stages": (0.20, 0.30, 0.35, 0.15),
        "kc": (0.40, 1.05, 0.35),
        "duration": 70,
        "root_depth": (0.20, 0.70),
        "p_depletion": 0.50,
        "season_label": "Kharif-1",
    },
    "Soybean": {
        "stages": (0.15, 0.25, 0.40, 0.20),
        "kc": (0.40, 1.15, 0.50),
        "duration": 105,
        "root_depth": (0.30, 1.00),
        "p_depletion": 0.50,
        "season_label": "Rabi / Kharif-1",
    },
    "Jute": {
        "stages": (0.15, 0.30, 0.40, 0.15),
        "kc": (0.45, 1.10, 0.65),
        "duration": 120,
        "root_depth": (0.30, 1.00),
        "p_depletion": 0.45,
        "season_label": "Kharif-1",
    },
    "Tomato": {
        "stages": (0.25, 0.30, 0.30, 0.15),
        "kc": (0.60, 1.15, 0.80),
        "duration": 105,
        "root_depth": (0.25, 0.80),
        "p_depletion": 0.40,
        "season_label": "Rabi",
    },
    "Sunflower": {
        "stages": (0.20, 0.30, 0.35, 0.15),
        "kc": (0.35, 1.10, 0.40),
        "duration": 95,
        "root_depth": (0.30, 1.20),
        "p_depletion": 0.55,
        "season_label": "Rabi",
    },
    "Groundnut": {
        "stages": (0.20, 0.30, 0.35, 0.15),
        "kc": (0.40, 1.15, 0.55),
        "duration": 120,
        "root_depth": (0.25, 0.90),
        "p_depletion": 0.50,
        "season_label": "Rabi / Kharif-1",
    },
    "Sesame": {
        "stages": (0.20, 0.30, 0.35, 0.15),
        "kc": (0.35, 1.10, 0.40),
        "duration": 85,
        "root_depth": (0.25, 0.80),
        "p_depletion": 0.60,
        "season_label": "Kharif-1",
    },
    "Fallow": {
        "stages": (0.25, 0.25, 0.25, 0.25),
        "kc": (0.15, 0.15, 0.15),
        "duration": 90,
        "root_depth": (0.10, 0.10),
        "p_depletion": 0.50,
        "season_label": "Fallow",
    },
}


def fao56_penman_monteith_et0(
    t_mean: float,
    t_min: float,
    t_max: float,
    rh: float,
    u2: float,
    rs: float,
    lat: float,
    doy: int,
    elevation_m: float = 15.0,
) -> float:
    """Calculate daily reference evapotranspiration ET0 (mm/day) using FAO-56 Penman-Monteith."""
    # 1. Atmospheric pressure and psychrometric constant
    p_kpa = 101.3 * math.pow((293.0 - 0.0065 * elevation_m) / 293.0, 5.26)
    gamma = 0.000665 * p_kpa

    # 2. Slope of vapor pressure curve (Delta)
    delta = 4098.0 * (0.6108 * math.exp(17.27 * t_mean / (t_mean + 237.3))) / math.pow(t_mean + 237.3, 2)

    # 3. Vapor pressure deficit (es - ea)
    e_tmax = 0.6108 * math.exp(17.27 * t_max / (t_max + 237.3))
    e_tmin = 0.6108 * math.exp(17.27 * t_min / (t_min + 237.3))
    es = (e_tmax + e_tmin) / 2.0
    ea = es * max(0.10, min(1.0, rh / 100.0))

    # 4. Extraterrestrial radiation (Ra)
    phi = math.radians(lat)
    dr = 1.0 + 0.033 * math.cos(2.0 * math.pi * doy / 365.0)
    solar_dec = 0.409 * math.sin(2.0 * math.pi * doy / 365.0 - 1.39)
    cos_phi_cos_dec = math.cos(phi) * math.cos(solar_dec)
    sin_phi_sin_dec = math.sin(phi) * math.sin(solar_dec)
    tan_phi_tan_dec = math.tan(phi) * math.tan(solar_dec)

    ws_arg = -tan_phi_tan_dec
    ws = math.acos(max(-1.0, min(1.0, ws_arg)))
    ra = (24.0 * 60.0 / math.pi) * 0.0820 * dr * (ws * sin_phi_sin_dec + cos_phi_cos_dec * math.sin(ws))

    # 5. Clear sky radiation (Rso) and Net radiation (Rn)
    rso = (0.75 + 2e-5 * elevation_m) * ra
    rns = 0.77 * rs  # Albedo 0.23 for reference grass

    sigma = 4.903e-9  # MJ / K4 / m2 / day
    t_max_k4 = math.pow(t_max + 273.16, 4)
    t_min_k4 = math.pow(t_min + 273.16, 4)
    cloudiness = max(0.3, min(1.0, rs / max(0.1, rso)))
    rnl = sigma * ((t_max_k4 + t_min_k4) / 2.0) * (0.34 - 0.14 * math.sqrt(max(0.01, ea))) * (1.35 * cloudiness - 0.35)
    rn = max(0.0, rns - rnl)

    # 6. FAO-56 Penman-Monteith equation
    wind = max(0.2, u2)
    numerator = 0.408 * delta * rn + gamma * (900.0 / (t_mean + 273.0)) * wind * (es - ea)
    denominator = delta + gamma * (1.0 + 0.34 * wind)
    et0 = numerator / denominator

    return max(0.5, round(float(et0), 2))


def saxton_rawls_hydraulic_properties(
    sand_pct: float,
    clay_pct: float,
    om_pct: float,
) -> dict[str, float]:
    """Calculate soil water retention parameters using Saxton & Rawls (2006) equations."""
    s = max(0.01, min(0.95, sand_pct / 100.0))
    c = max(0.01, min(0.95, clay_pct / 100.0))
    om = max(0.1, min(8.0, om_pct))

    # Permanent Wilting Point (theta_1500t)
    theta_1500t = (
        -0.024 * s
        + 0.487 * c
        + 0.006 * om
        + 0.005 * (s * om)
        - 0.013 * (c * om)
        + 0.068 * (s * c)
        + 0.031
    )
    theta_wp = theta_1500t + (0.14 * theta_1500t - 0.02)
    theta_wp = max(0.04, min(0.35, theta_wp))

    # Field Capacity (theta_33t)
    theta_33t = (
        -0.251 * s
        + 0.195 * c
        + 0.011 * om
        + 0.006 * (s * om)
        - 0.027 * (c * om)
        + 0.452 * (s * c)
        + 0.299
    )
    theta_fc = theta_33t + (1.283 * (theta_33t ** 2) - 0.374 * theta_33t - 0.015)
    theta_fc = max(theta_wp + 0.04, min(0.50, theta_fc))

    # Total Available Water (TAW in mm per meter of root zone)
    taw_mm_m = round(1000.0 * (theta_fc - theta_wp), 1)

    return {
        "wilting_point": round(theta_wp, 3),
        "field_capacity": round(theta_fc, 3),
        "taw_mm_per_m": taw_mm_m,
    }


def generate_crop_kc_series(crop_name: str, total_days: int) -> tuple[list[float], list[float]]:
    """Generate daily single-crop Kc and root zone depth (m) for the duration of the crop."""
    params = CROP_WATER_PARAMETERS.get(crop_name, CROP_WATER_PARAMETERS["Rice"])
    l_ini_pct, l_dev_pct, l_mid_pct, l_late_pct = params["stages"]
    kc_ini, kc_mid, kc_late = params["kc"]
    zr_min, zr_max = params["root_depth"]

    n_ini = max(1, int(round(total_days * l_ini_pct)))
    n_dev = max(1, int(round(total_days * l_dev_pct)))
    n_mid = max(1, int(round(total_days * l_mid_pct)))
    n_late = total_days - (n_ini + n_dev + n_mid)
    if n_late < 1:
        n_late = 1

    kc_series: list[float] = []
    zr_series: list[float] = []

    # Initial stage
    for _ in range(n_ini):
        kc_series.append(kc_ini)
        zr_series.append(zr_min)

    # Crop development stage (linear increase)
    for i in range(n_dev):
        frac = (i + 1) / n_dev
        kc_val = kc_ini + frac * (kc_mid - kc_ini)
        zr_val = zr_min + frac * (zr_max - zr_min)
        kc_series.append(round(kc_val, 3))
        zr_series.append(round(zr_val, 3))

    # Mid-season stage
    for _ in range(n_mid):
        kc_series.append(kc_mid)
        zr_series.append(zr_max)

    # Late-season stage (linear decrease)
    for i in range(n_late):
        frac = (i + 1) / n_late
        kc_val = kc_mid - frac * (kc_mid - kc_late)
        kc_series.append(round(kc_val, 3))
        zr_series.append(zr_max)

    return kc_series[:total_days], zr_series[:total_days]


def compute_water_plan(
    district: str = "bogura",
    crop: str = "Rice",
    area_ha: float = 1.0,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    custom_soil: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Compute comprehensive daily water and irrigation plan using FAO-56 Penman-Monteith and SoilGrids."""
    dist_key = (district or "bogura").strip().lower()
    if dist_key not in DISTRICT_REGISTRY:
        if latitude is not None and longitude is not None:
            from src.compute.advisory_service import nearest_district
            dist_key = nearest_district(float(latitude), float(longitude))
        else:
            dist_key = "bogura"

    dist_meta = DISTRICT_REGISTRY.get(dist_key, {})
    lat = float(latitude or dist_meta.get("latitude") or dist_meta.get("lat") or 24.8465)
    lon = float(longitude or dist_meta.get("longitude") or dist_meta.get("lon") or 89.3777)

    # 1. Load daily weather and IMERG rainfall
    power_df, _ = load_district_climate_data(dist_key, offline=True)
    if "date" in power_df.columns:
        power_df["date"] = pd.to_datetime(power_df["date"])

    imerg_df = get_district_imerg_series(dist_key)
    if not imerg_df.empty and "date" in imerg_df.columns:
        imerg_df["date"] = pd.to_datetime(imerg_df["date"])

    # 2. Derive soil hydraulic parameters from ISRIC SoilGrids
    soil_data = custom_soil or fetch_isric_soilgrids(lat, lon, allow_network=False)
    if not soil_data:
        soil_data = {
            "clay_pct": 32.0,
            "sand_pct": 28.0,
            "silt_pct": 40.0,
            "organic_matter_pct": 2.2,
            "texture_class": dist_meta.get("soil_type", "clay loam"),
        }

    c_pct = float(soil_data.get("clay_pct") or 32.0)
    s_pct = float(soil_data.get("sand_pct") or 28.0)
    om_pct = float(soil_data.get("organic_matter_pct") or 2.2)
    texture = str(soil_data.get("texture_class") or dist_meta.get("soil_type") or "clay loam")

    hydraulics = saxton_rawls_hydraulic_properties(s_pct, c_pct, om_pct)
    taw_unit = hydraulics["taw_mm_per_m"]

    # 3. Crop parameters & season window selection
    crop_name = crop.strip() if crop else "Rice"
    if crop_name not in CROP_WATER_PARAMETERS:
        # Match case-insensitively
        matched = None
        for k in CROP_WATER_PARAMETERS:
            if k.lower() == crop_name.lower():
                matched = k
                break
        crop_name = matched or "Rice"

    c_meta = CROP_WATER_PARAMETERS[crop_name]
    duration_days = int(c_meta["duration"])
    p_depletion = float(c_meta["p_depletion"])

    # Determine typical planting month in Bangladesh for crop
    # Kharif-2 Aman: July 15; Rabi (Wheat/Mustard/Boro): Nov 15; Kharif-1 Aus/Jute: Apr 01
    season_lbl = c_meta["season_label"]
    if "Kharif-2" in season_lbl:
        start_month, start_day = 7, 15
    elif "Rabi" in season_lbl:
        start_month, start_day = 11, 15
    elif "Kharif-1" in season_lbl:
        start_month, start_day = 4, 1
    else:
        start_month, start_day = 1, 1

    # Extract weather window from the most recent full historical year (e.g., 2024)
    target_year = 2024
    if start_month == 11:
        # Cross-year season (Nov 2023 to Feb/Mar 2024)
        start_date = pd.Timestamp(year=target_year - 1, month=start_month, day=start_day)
    else:
        start_date = pd.Timestamp(year=target_year, month=start_month, day=start_day)

    end_date = start_date + pd.Timedelta(days=duration_days - 1)

    sub_power = power_df[(power_df["date"] >= start_date) & (power_df["date"] <= end_date)].copy()
    if len(sub_power) < duration_days:
        # Fallback to climatological day-of-year window
        sub_power = power_df.tail(duration_days).copy()

    sub_imerg = pd.DataFrame()
    if not imerg_df.empty:
        sub_imerg = imerg_df[(imerg_df["date"] >= start_date) & (imerg_df["date"] <= end_date)].copy()

    kc_series, zr_series = generate_crop_kc_series(crop_name, len(sub_power))

    # 4. Daily simulation: ET0, ETc, P_eff, Root Zone Depletion, Irrigation Triggers
    daily_records: list[dict[str, Any]] = []
    tot_et0 = 0.0
    tot_etc = 0.0
    tot_rain = 0.0
    tot_eff_rain = 0.0
    tot_irrig = 0.0
    irrig_events = 0
    event_days: list[int] = []

    # Initial root zone depletion is zero (field at field capacity at transplanting/sowing)
    dr = 0.0

    for day_idx, (_, row) in enumerate(sub_power.iterrows()):
        d_val = row["date"]
        doy = int(d_val.day_of_year)
        t_m = float(row.get("temperature", 25.0))
        t_min = float(row.get("temp_min", t_m - 4.0))
        t_max = float(row.get("temp_max", t_m + 5.0))
        rh = float(row.get("humidity", 75.0))
        u2 = float(row.get("wind_speed", 1.5))
        solar = float(row.get("solar_radiation", 16.0))

        # IMERG precipitation if available, else POWER rainfall
        if not sub_imerg.empty and day_idx < len(sub_imerg):
            i_row = sub_imerg.iloc[day_idx]
            rain = float(i_row.get("precipitation", row.get("rainfall", 0.0)))
        else:
            rain = float(row.get("rainfall", 0.0))

        # FAO-56 Reference ET0
        et0 = fao56_penman_monteith_et0(t_m, t_min, t_max, rh, u2, solar, lat, doy)
        kc = kc_series[day_idx] if day_idx < len(kc_series) else 1.0
        etc = round(et0 * kc, 2)

        # Effective rainfall (USDA SCS method)
        p_eff = max(0.0, round(rain * 0.80 - 4.0, 2)) if rain > 5.0 else 0.0

        # Soil hydraulic capacity for current root zone depth
        zr = zr_series[day_idx] if day_idx < len(zr_series) else 0.60
        taw_t = round(taw_unit * zr, 1)
        raw_t = round(p_depletion * taw_t, 1)

        # Depletion before irrigation
        dr = dr - p_eff + etc
        dr = max(0.0, dr)

        # Irrigation trigger check
        irrig_applied = 0.0
        is_trigger = False
        if dr >= raw_t and raw_t > 5.0:
            # Apply irrigation to bring root zone back to field capacity
            irrig_applied = round(dr, 1)
            dr = 0.0
            is_trigger = True
            irrig_events += 1
            event_days.append(day_idx + 1)

        tot_et0 += et0
        tot_etc += etc
        tot_rain += rain
        tot_eff_rain += p_eff
        tot_irrig += irrig_applied

        daily_records.append({
            "day": day_idx + 1,
            "date": d_val.strftime("%Y-%m-%d"),
            "et0_mm": et0,
            "kc": kc,
            "etc_mm": etc,
            "rainfall_mm": round(rain, 1),
            "effective_rain_mm": p_eff,
            "root_depth_m": zr,
            "taw_mm": taw_t,
            "raw_mm": raw_t,
            "depletion_mm": round(dr, 1),
            "irrigation_applied_mm": irrig_applied,
            "irrigation_trigger": is_trigger,
        })

    # Recommended interval between irrigations
    if len(event_days) > 1:
        diffs = [event_days[i] - event_days[i - 1] for i in range(1, len(event_days))]
        rec_interval_days = int(round(float(np.median(diffs))))
    elif len(event_days) == 1:
        rec_interval_days = int(duration_days // 2)
    else:
        rec_interval_days = 0

    # Volume and economics (Bangladesh Tube-well benchmark)
    # 1 mm over 1 ha = 10 m3
    water_demand_m3 = round(tot_etc * 10.0 * area_ha, 1)
    net_irrig_m3 = round(tot_irrig * 10.0 * area_ha, 1)

    # Pumping cost at standard shallow tube-well rate in BD (~2.50 BDT / m3)
    pumping_rate_bdt_m3 = 2.50
    pumping_cost_bdt = round(net_irrig_m3 * pumping_rate_bdt_m3, 0)

    # Conventional unmanaged flood irrigation comparison (efficiency ~45% vs managed ~75%)
    # Conventional flood uses ~1.67x water
    flood_factor = 1.67
    flood_demand_m3 = round(net_irrig_m3 * flood_factor, 1)
    flood_cost_bdt = round(flood_demand_m3 * pumping_rate_bdt_m3, 0)
    water_savings_m3 = round(flood_demand_m3 - net_irrig_m3, 1)
    cost_savings_bdt = round(flood_cost_bdt - pumping_cost_bdt, 0)

    return {
        "status": "ok",
        "district": dist_key,
        "crop": crop_name,
        "area_ha": area_ha,
        "growing_season": {
            "season_name": c_meta["season_label"],
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "duration_days": duration_days,
        },
        "soil_properties": {
            "source": "ISRIC SoilGrids 250 m",
            "texture_class": texture,
            "sand_pct": s_pct,
            "clay_pct": c_pct,
            "organic_matter_pct": om_pct,
            "field_capacity_vol": hydraulics["field_capacity"],
            "wilting_point_vol": hydraulics["wilting_point"],
            "taw_mm_per_m": taw_unit,
        },
        "water_balance_summary": {
            "total_reference_et0_mm": round(tot_et0, 1),
            "total_crop_water_demand_etc_mm": round(tot_etc, 1),
            "total_crop_water_demand_m3": water_demand_m3,
            "total_rainfall_mm": round(tot_rain, 1),
            "total_effective_rainfall_mm": round(tot_eff_rain, 1),
            "net_irrigation_requirement_mm": round(tot_irrig, 1),
            "net_irrigation_requirement_m3": net_irrig_m3,
            "irrigation_events_count": irrig_events,
            "recommended_interval_days": rec_interval_days,
        },
        "economic_and_conservation": {
            "pumping_rate_bdt_per_m3": pumping_rate_bdt_m3,
            "managed_pumping_cost_bdt": pumping_cost_bdt,
            "conventional_flood_demand_m3": flood_demand_m3,
            "conventional_flood_cost_bdt": flood_cost_bdt,
            "water_savings_m3": water_savings_m3,
            "cost_savings_bdt": cost_savings_bdt,
            "water_reduction_pct": round((1.0 - 1.0 / flood_factor) * 100.0, 1),
        },
        "provenance": {
            "evapotranspiration_model": "FAO-56 Penman-Monteith (1998)",
            "weather_source": "NASA POWER Daily Agroclimatology (0.5°)",
            "precipitation_source": "NASA GPM IMERG Final Daily v07 (0.1°)",
            "soil_hydraulics_model": "Saxton & Rawls (2006) Pedotransfer Functions",
            "soil_data_source": "ISRIC SoilGrids 250 m REST API v2.0",
            "physical_basis": "FAO-56 Penman-Monteith ET0 (NASA POWER) + single-Kc water balance + ISRIC SoilGrids hydraulic parameters",
        },
        "daily_plan": daily_records,
    }
