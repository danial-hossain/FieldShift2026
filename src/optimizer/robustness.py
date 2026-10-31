"""FieldShift Rotation Robustness Evaluator.

Evaluates a proposed 6-period (2-year x 3-season) crop rotation against
24 historical weather years (2001-2024) combining NASA POWER (temperature,
solar radiation, humidity) and NASA GPM IMERG v07 (daily precipitation).
"""

from __future__ import annotations

import logging
from typing import Any, Mapping, Sequence, Optional
import numpy as np
import pandas as pd

from src.compute.advisory_service import DISTRICT_REGISTRY, load_district_climate_data
from src.compute.imerg import get_district_imerg_series
from src.data.crops import load_crop_knowledge
from src.optimizer.dynamic_agronomy import SeasonalEnvironment, compute_dynamic_crop_season_metrics
from src.state.field_state import build_field_state, FieldState

logger = logging.getLogger(__name__)

HISTORICAL_YEARS = list(range(2001, 2025))  # 2001 to 2024 inclusive (24 years)


def extract_period_crop_map(rotation: Any) -> dict[str, str]:
    """Extract a mapping of period -> crop name from various input formats."""
    result: dict[str, str] = {}
    if isinstance(rotation, dict):
        if "selected_crop_by_period" in rotation and isinstance(rotation["selected_crop_by_period"], dict):
            return extract_period_crop_map(rotation["selected_crop_by_period"])
        elif "rotation" in rotation and isinstance(rotation["rotation"], (list, dict)):
            rotation = rotation["rotation"]
        elif "milp_status" in rotation and isinstance(rotation["milp_status"], dict):
            return extract_period_crop_map(rotation["milp_status"])
        else:
            for k, v in rotation.items():
                if isinstance(v, str):
                    result[k] = v
                elif isinstance(v, dict) and "crop" in v:
                    result[k] = str(v["crop"])

    if isinstance(rotation, list):
        for item in rotation:
            if isinstance(item, dict):
                p = item.get("period") or item.get("season_key") or item.get("period_name")
                c = item.get("crop") or item.get("selected_crop") or item.get("crop_name")
                if p and c:
                    result[str(p)] = str(c)

    # Standardize to 6 periods
    standard_periods = ["Y1_S1", "Y1_S2", "Y1_S3", "Y2_S1", "Y2_S2", "Y2_S3"]
    # If passed as 6-element list in order without period keys
    if not result and isinstance(rotation, list) and len(rotation) == 6:
        for idx, item in enumerate(rotation):
            c_name = item if isinstance(item, str) else (item.get("crop") if isinstance(item, dict) else "Fallow")
            result[standard_periods[idx]] = str(c_name)

    return result


def evaluate_rotation_robustness(
    rotation: Any,
    district: str = "bogura",
    area_ha: float = 1.0,
    field_state: Optional[FieldState] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> dict[str, Any]:
    """Run a 6-period rotation through 24 historical years (2001-2024) of NASA weather.

    Returns the 24-point distribution of annual net profit and crop performance.
    """
    crop_map = extract_period_crop_map(rotation)
    if not crop_map:
        raise ValueError("Could not extract rotation periods and crops from input.")

    dist_key = (district or "bogura").strip().lower()
    if dist_key not in DISTRICT_REGISTRY:
        if latitude is not None and longitude is not None:
            from src.compute.advisory_service import nearest_district
            dist_key = nearest_district(float(latitude), float(longitude))
        else:
            dist_key = "bogura"

    # Load POWER and IMERG data
    power_df, _ = load_district_climate_data(dist_key, offline=True)
    if "date" in power_df.columns:
        power_df["date"] = pd.to_datetime(power_df["date"])

    imerg_df = get_district_imerg_series(dist_key)
    if not imerg_df.empty and "date" in imerg_df.columns:
        imerg_df["date"] = pd.to_datetime(imerg_df["date"])

    # Load crop knowledge
    crops_df = load_crop_knowledge()
    crops_by_name = {row["crop"]: row.to_dict() for _, row in crops_df.iterrows()}

    # Baseline field state if not provided
    if field_state is None:
        ctx = DISTRICT_REGISTRY.get(dist_key, {})
        lat = float(latitude or ctx.get("latitude") or ctx.get("lat") or 24.8465)
        lon = float(longitude or ctx.get("longitude") or ctx.get("lon") or 89.3777)
        field_state = build_field_state(
            field_id=f"{dist_key}_robustness",
            latitude=lat,
            longitude=lon,
            decision_date=pd.to_datetime("2024-12-31"),
            nasa_power_data=power_df.tail(60),
            crop_knowledge=crops_df,
        )
    field_state.field_size_ha = float(area_ha)
    field_state.area_ha = float(area_ha)

    yearly_evaluations: list[dict[str, Any]] = []
    annual_profits: list[float] = []

    # Map periods to season definitions
    period_season_map = {
        "Y1_S1": ("rabi", 1, 1),
        "Y1_S2": ("kharif1", 1, 2),
        "Y1_S3": ("kharif2", 1, 3),
        "Y2_S1": ("rabi", 2, 1),
        "Y2_S2": ("kharif1", 2, 2),
        "Y2_S3": ("kharif2", 2, 3),
    }

    for year in HISTORICAL_YEARS:
        # Extract season weather for this specific historical year
        # 1. Rabi (Nov of year-1 to Feb of year)
        power_rabi = power_df[
            ((power_df["date"].dt.year == year - 1) & (power_df["date"].dt.month.isin([11, 12]))) |
            ((power_df["date"].dt.year == year) & (power_df["date"].dt.month.isin([1, 2])))
        ]
        imerg_rabi = imerg_df[
            ((imerg_df["date"].dt.year == year - 1) & (imerg_df["date"].dt.month.isin([11, 12]))) |
            ((imerg_df["date"].dt.year == year) & (imerg_df["date"].dt.month.isin([1, 2])))
        ] if not imerg_df.empty else power_rabi

        # 2. Kharif-1 (Mar-Jun of year)
        power_k1 = power_df[(power_df["date"].dt.year == year) & (power_df["date"].dt.month.isin([3, 4, 5, 6]))]
        imerg_k1 = imerg_df[(imerg_df["date"].dt.year == year) & (imerg_df["date"].dt.month.isin([3, 4, 5, 6]))] if not imerg_df.empty else power_k1

        # 3. Kharif-2 (Jul-Oct of year)
        power_k2 = power_df[(power_df["date"].dt.year == year) & (power_df["date"].dt.month.isin([7, 8, 9, 10]))]
        imerg_k2 = imerg_df[(imerg_df["date"].dt.year == year) & (imerg_df["date"].dt.month.isin([7, 8, 9, 10]))] if not imerg_df.empty else power_k2

        season_subsets = {
            "rabi": (power_rabi, imerg_rabi, "Rabi (Nov-Feb, dry)"),
            "kharif1": (power_k1, imerg_k1, "Kharif-1 (Mar-Jun, pre-monsoon)"),
            "kharif2": (power_k2, imerg_k2, "Kharif-2 (Jul-Oct, monsoon)"),
        }

        period_results: dict[str, Any] = {}
        y1_profit = 0.0
        y2_profit = 0.0

        for p_key, (s_name, y_num, s_idx) in period_season_map.items():
            crop_name = crop_map.get(p_key, "Fallow")
            crop_data = crops_by_name.get(crop_name)
            if not crop_data:
                # Fallback to Fallow
                crop_data = {"crop": "Fallow", "expected_yield": 0.0, "market_price": 0.0, "production_cost": 0.0, "water_requirement_mm": 0.0}

            p_sub, i_sub, s_label = season_subsets[s_name]

            # Compute year-specific climate parameters
            t_mean = float(p_sub["temperature"].mean()) if not p_sub.empty and "temperature" in p_sub else 24.0
            t_min = float(p_sub["temperature"].min()) if not p_sub.empty and "temperature" in p_sub else 18.0
            t_max = float(p_sub["temperature"].max()) if not p_sub.empty and "temperature" in p_sub else 32.0
            solar = float(p_sub["solar_radiation"].mean()) if not p_sub.empty and "solar_radiation" in p_sub else 16.0
            rh = float(p_sub["humidity"].mean()) if not p_sub.empty and "humidity" in p_sub else 75.0

            r_col = "precipitation" if "precipitation" in i_sub.columns else ("rainfall" if "rainfall" in i_sub.columns else None)
            r_tot = float(i_sub[r_col].sum()) if not i_sub.empty and r_col else 100.0

            env = SeasonalEnvironment(
                period=f"Y{y_num}_{p_key}",
                year=y_num,
                season_index=s_idx,
                season_name=s_label,
                mean_temperature_c=round(t_mean, 2),
                min_temperature_c=round(t_min, 2),
                max_temperature_c=round(t_max, 2),
                rainfall_mm=round(r_tot, 1),
                solar_radiation_mj=round(solar, 2),
                relative_humidity_pct=round(rh, 1),
                environment_basis=f"nasa_historical_{year}",
            )

            metrics = compute_dynamic_crop_season_metrics(crop_data, env, field_state)
            profit_per_ha = float(metrics.get("dynamic_gross_margin_bdt_ha", 0.0))
            crop_profit = profit_per_ha * area_ha

            if y_num == 1:
                y1_profit += crop_profit
            else:
                y2_profit += crop_profit

            water_bal = metrics.get("water_balance", {})
            irrig_req = float(water_bal.get("irrigation_required_mm", 0.0))

            period_results[p_key] = {
                "crop": crop_name,
                "season": s_name,
                "yield_tons_per_ha": round(float(metrics.get("dynamic_yield_t_ha", 0.0)), 2),
                "profit_bdt": round(crop_profit, 1),
                "irrigation_mm": round(irrig_req, 1),
                "rainfall_mm": round(r_tot, 1),
                "mean_temp_c": round(t_mean, 1),
            }

        annual_avg_profit = round((y1_profit + y2_profit) / 2.0, 1)
        annual_profits.append(annual_avg_profit)

        yearly_evaluations.append({
            "year": year,
            "annual_profit_bdt": annual_avg_profit,
            "y1_profit_bdt": round(y1_profit, 1),
            "y2_profit_bdt": round(y2_profit, 1),
            "periods": period_results,
        })

    arr = np.array(annual_profits, dtype=float)

    return {
        "status": "ok",
        "district": dist_key,
        "area_ha": area_ha,
        "years_evaluated": len(HISTORICAL_YEARS),
        "period_range": f"{HISTORICAL_YEARS[0]}-{HISTORICAL_YEARS[-1]}",
        "basis": "24 historical years (2001-2024) of NASA POWER temperature/solar/humidity + NASA GPM IMERG v07 precipitation",
        "annual_profit_distribution": {
            "mean": round(float(np.mean(arr)), 1),
            "median": round(float(np.median(arr)), 1),
            "p10": round(float(np.percentile(arr, 10)), 1),
            "p90": round(float(np.percentile(arr, 90)), 1),
            "min": round(float(np.min(arr)), 1),
            "max": round(float(np.max(arr)), 1),
            "std": round(float(np.std(arr)), 1),
        },
        "yearly_records": yearly_evaluations,
    }
