"""Deterministic, transparent rule-based crop rotation baseline.

Implements standard regional agronomic heuristics for Bangladesh crop rotations:
- Seasonal crop calendar alignment (Rabi/dry vs Kharif/monsoon)
- Strict botanical family alternation to break pest/pathogen cycles
- Mandatory legume inclusion at least once every 3 seasons for nitrogen fixation
- Agro-climatic feasibility envelopes (temperature, soil pH, available water)
- Deterministic heuristic ranking without mathematical programming or reinforcement learning

This serves as the transparent benchmark against which MILP optimization and
RL simulation policies are compared in the Comparison Lab.
"""

from __future__ import annotations

import time
from typing import Any, Mapping
import numpy as np
import pandas as pd

from src.data.crops import load_crop_knowledge
from src.experiments.integrated_research_demo import PLAN_PERIODS
from src.knowledge.agronomic_rules import evaluate_crop_compatibility


# Canonical seasonal suitability mapping for Bangladesh agro-climatic conditions
# Dry season (Rabi: Nov-Mar / cooler, lower rainfall)
# Wet season (Kharif: Apr-Oct / warmer, monsoon/pre-monsoon rainfall)
SEASONAL_PREFERENCES = {
    "dry": [
        "Wheat",
        "Lentil",
        "Mustard",
        "Potato",
        "Chickpea",
        "Tomato",
    ],
    "wet": [
        "Rice",
        "Maize",
        "Mungbean",
        "Jute",
        "Soybean",
        "Sorghum",
        "Sesame",
        "Groundnut",
        "Sunflower",
    ],
}


def run_rule_based_rotation(
    field_state: Any,
    crops: pd.DataFrame | None = None,
    planning_periods: list[str] | None = None,
    features: Mapping[str, Any] | None = None,
    available_water_mm: float | None = None,
    priority: str = "balanced",
) -> dict[str, Any]:
    """Execute a transparent rule-based crop rotation plan across all planning periods.

    Returns a standardized dictionary compatible with the MILP and RL evaluation pipelines.
    """
    start_time = time.perf_counter()

    if crops is None:
        crops = load_crop_knowledge()

    crop_lookup = {row["crop"]: row.to_dict() for _, row in crops.iterrows()}

    if planning_periods is None:
        planning_periods = list(PLAN_PERIODS)

    field_area_ha = float(
        getattr(field_state, "field_size_ha", getattr(field_state, "area_ha", 1.0)) or 1.0
    )
    soil_ph = getattr(field_state, "ph", None)
    if soil_ph is not None:
        try:
            soil_ph = float(soil_ph)
            if not np.isfinite(soil_ph):
                soil_ph = None
        except (TypeError, ValueError):
            soil_ph = None

    temp_c = getattr(field_state, "temperature", 25.0)
    try:
        temp_c = float(temp_c)
        if not np.isfinite(temp_c):
            temp_c = 25.0
    except (TypeError, ValueError):
        temp_c = 25.0

    water_budget = available_water_mm
    if water_budget is None and features:
        water_budget = features.get("available_water_mm")
    if water_budget is None:
        water_budget = float(getattr(field_state, "irrigation_capacity_mm", 450.0) or 450.0)

    # Track rotation state across periods
    selected_crops: dict[str, str] = {}
    seasonal_records: list[dict[str, Any]] = []
    rule_traces: list[dict[str, Any]] = []
    constraint_violations = 0
    violation_notes: list[str] = []

    prior_crop = getattr(field_state, "previous_crop", None)
    prior_family = getattr(field_state, "previous_crop_family", None)
    if prior_crop and prior_crop in crop_lookup and not prior_family:
        prior_family = crop_lookup[prior_crop].get("family")

    seasons_since_legume = 0 if getattr(field_state, "previous_crop_is_legume", False) else 1

    current_soil_health = float(
        max(20.0, min(85.0, 30.0 + (float(getattr(field_state, "organic_matter", 1.5) or 1.5) * 15.0)))
    )

    for step_idx, period in enumerate(planning_periods):
        is_dry = "dry" in period.lower() or (step_idx % 2 == 0)
        season_type = "dry" if is_dry else "wet"
        preferred_crops = SEASONAL_PREFERENCES.get(season_type, list(crop_lookup.keys()))

        # Determine if a legume is mandatorily needed to prevent rule violation
        must_plant_legume = seasons_since_legume >= 2

        # Filter candidate crops
        candidates = []
        rejected_reasons: dict[str, list[str]] = {}

        for crop_name, row in crop_lookup.items():
            reasons = []
            family = str(row.get("family", "Unknown")).strip()
            is_legume = bool(row.get("is_legume", False))
            water_req = float(row.get("water_requirement", 400.0))
            min_temp = float(row.get("min_temperature", 10.0))
            max_temp = float(row.get("max_temperature", 38.0))
            min_ph = float(row.get("min_ph", 5.0))
            max_ph = float(row.get("max_ph", 8.5))

            # 1. Botanical family alternation
            if prior_family and family.lower() == prior_family.lower():
                reasons.append(f"Family alternation conflict: Same botanical family ({family}) as preceding crop {prior_crop}.")

            # 2. Legume interval urgency
            if must_plant_legume and not is_legume:
                reasons.append(f"Legume interval requirement: {seasons_since_legume} seasons without legume; Fabaceae break mandatory.")

            # 3. Temperature tolerance
            if temp_c < min_temp or temp_c > max_temp:
                reasons.append(f"Temperature tolerance: Field temperature {temp_c:.1f}°C outside [{min_temp:.0f}-{max_temp:.0f}°C].")

            # 4. Soil pH tolerance
            if soil_ph is not None and (soil_ph < min_ph or soil_ph > max_ph):
                reasons.append(f"Soil pH tolerance: Measured pH {soil_ph:.1f} outside tolerance [{min_ph:.1f}-{max_ph:.1f}].")

            # 5. Seasonal alignment
            if crop_name not in preferred_crops:
                reasons.append(f"Seasonal maladaptation: {crop_name} is not traditionally suited for {season_type} season.")

            # 6. Water budget
            if water_req > water_budget * 1.5:
                reasons.append(f"Excessive water demand: {water_req:.0f} mm exceeds available water budget ({water_budget:.0f} mm).")

            if not reasons:
                # Calculate heuristic score based on priority
                yield_t = float(row.get("expected_yield", 2.0))
                price = float(row.get("market_price", 25000.0))
                cost = float(row.get("production_cost", 40000.0))
                margin = yield_t * price - cost

                if priority == "profit":
                    score = margin
                elif priority == "water_efficiency":
                    score = margin / max(100.0, water_req) * 500.0
                elif priority == "soil_health":
                    score = (20000.0 if is_legume else 5000.0) + (margin * 0.3)
                else:  # balanced
                    score = (margin * 0.5) - (water_req * 30.0) + (15000.0 if is_legume else 0.0)

                candidates.append({
                    "crop": crop_name,
                    "family": family,
                    "is_legume": is_legume,
                    "gross_margin_bdt_ha": margin,
                    "water_requirement_mm": water_req,
                    "yield_t_ha": yield_t,
                    "score": score,
                })
            else:
                rejected_reasons[crop_name] = reasons

        # Fallback if strict filter eliminated all candidates
        chosen = None
        if candidates:
            candidates.sort(key=lambda x: x["score"], reverse=True)
            chosen = candidates[0]
        else:
            # Relax family constraint or legume constraint as needed, noting the violation
            constraint_violations += 1
            fallback_list = [c for c in preferred_crops if c in crop_lookup] or list(crop_lookup.keys())
            fallback_crop = fallback_list[0]
            chosen_row = crop_lookup[fallback_crop]
            chosen = {
                "crop": fallback_crop,
                "family": chosen_row.get("family", "Unknown"),
                "is_legume": bool(chosen_row.get("is_legume", False)),
                "gross_margin_bdt_ha": float(chosen_row.get("expected_yield", 1.5)) * float(chosen_row.get("market_price", 25000.0)) - float(chosen_row.get("production_cost", 40000.0)),
                "water_requirement_mm": float(chosen_row.get("water_requirement", 400.0)),
                "yield_t_ha": float(chosen_row.get("expected_yield", 1.5)),
                "score": 0.0,
            }
            v_note = f"Season {period}: Relaxed constraints to maintain feasibility. Selected fallback {chosen['crop']}."
            violation_notes.append(v_note)

        # Update state
        selected_crops[period] = chosen["crop"]
        prior_crop = chosen["crop"]
        prior_family = chosen["family"]

        # Soil health effect
        if chosen["is_legume"]:
            soil_delta = +6.0
            seasons_since_legume = 0
        elif chosen["crop"] in {"Rice", "Potato"}:
            soil_delta = -3.0
            seasons_since_legume += 1
        else:
            soil_delta = +1.0
            seasons_since_legume += 1

        current_soil_health = max(20.0, min(85.0, current_soil_health + soil_delta))

        seasonal_records.append({
            "period": period,
            "crop": chosen["crop"],
            "family": chosen["family"],
            "is_legume": chosen["is_legume"],
            "yield_t_ha": round(chosen["yield_t_ha"], 2),
            "production_tons": round(chosen["yield_t_ha"] * field_area_ha, 2),
            "gross_margin_bdt_ha": round(chosen["gross_margin_bdt_ha"], 2),
            "total_gross_margin_bdt": round(chosen["gross_margin_bdt_ha"] * field_area_ha, 2),
            "water_requirement_mm": round(chosen["water_requirement_mm"], 1),
            "soil_health_delta": round(soil_delta, 1),
            "soil_health_after": round(current_soil_health, 1),
        })

        rule_traces.append({
            "period": period,
            "chosen_crop": chosen["crop"],
            "family": chosen["family"],
            "selection_rationale": (
                f"Selected {chosen['crop']} ({chosen['family']}) under {season_type} season rules. "
                f"Maintains botanical family diversification and delivers ৳{chosen['gross_margin_bdt_ha']:,.0f}/ha gross margin."
            ),
            "rejected_crops_sample": {
                crop: reasons[0] for crop, reasons in list(rejected_reasons.items())[:4]
            },
        })

    elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    total_profit_ha = sum(r["gross_margin_bdt_ha"] for r in seasonal_records)
    total_field_profit = total_profit_ha * field_area_ha
    total_water = sum(r["water_requirement_mm"] for r in seasonal_records)
    legumes_count = sum(1 for r in seasonal_records if r["is_legume"])
    unique_crops = len(set(r["crop"] for r in seasonal_records))
    unique_families = len(set(r["family"] for r in seasonal_records))

    return {
        "status": "optimal" if constraint_violations == 0 else "feasible",
        "method": "rule_based_baseline",
        "label": "Transparent Agronomic Rule-Based Baseline",
        "description": "Standard regional agronomic heuristic using seasonal crop calendars, strict botanical family alternation, and mandatory tri-seasonal legume breaks.",
        "planning_periods": planning_periods,
        "selected_crop_by_period": selected_crops,
        "rotation_sequence": " -> ".join(selected_crops.values()),
        "seasonal_records": seasonal_records,
        "rule_traces": rule_traces,
        "metrics": {
            "total_profit_bdt_per_ha": round(total_profit_ha, 2),
            "total_field_profit_bdt": round(total_field_profit, 2),
            "annual_field_profit_bdt": round(total_field_profit / (len(planning_periods) / 2.0), 2),
            "total_water_requirement_mm": round(total_water, 1),
            "mean_water_requirement_mm": round(total_water / len(planning_periods), 1),
            "final_soil_health": round(current_soil_health, 1),
            "soil_health_delta": round(current_soil_health - float(max(20.0, min(85.0, 30.0 + (float(getattr(field_state, "organic_matter", 1.5) or 1.5) * 15.0)))), 1),
            "legume_season_count": legumes_count,
            "legume_fraction": round(legumes_count / len(planning_periods), 2),
            "crop_diversity_count": unique_crops,
            "botanical_family_count": unique_families,
            "constraint_violations": constraint_violations,
            "violation_notes": violation_notes,
            "feasible_seasons": len(planning_periods) - constraint_violations,
            "runtime_ms": elapsed_ms,
        },
    }
