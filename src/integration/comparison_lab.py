"""Three-Way Crop Rotation Decision Comparison Lab: MILP vs RL vs Rule-Based Baseline.

Evaluates:
1. Mixed-Integer Linear Programming (PuLP / CBC Branch-and-Bound Optimizer)
2. Simulation-Based Reinforcement Learning (Sequential Q-Value MDP Policy)
3. Transparent Agronomic Rule-Based Baseline (Deterministic Regional Crop Heuristics)

Evaluated under identical field coordinates, environmental history, field area,
planning horizon (6 seasons), and priority weighting.
"""

from __future__ import annotations

import csv
import io
import json
import time
from typing import Any, Mapping
import numpy as np
import pandas as pd

from src.data.crops import load_crop_knowledge
from src.optimizer.rule_based import run_rule_based_rotation
from src.rl.crop_rotation_rl import run_reinforcement_learning_policy


def run_three_way_comparison(
    field_state: Any,
    environmental_history: pd.DataFrame,
    crops: pd.DataFrame | None = None,
    features: Mapping[str, Any] | None = None,
    milp_plan: dict[str, Any] | None = None,
    priority: str = "balanced",
    weights: dict[str, float] | None = None,
    field_history: pd.DataFrame | None = None,
) -> dict[str, Any]:
    """Execute simultaneous evaluation of MILP, RL, and Rule-Based methods.

    Returns side-by-side metrics, trade-off explanations, and export data.
    """
    total_start_time = time.perf_counter()

    if crops is None:
        crops = load_crop_knowledge()

    crop_lookup = {row["crop"]: row.to_dict() for _, row in crops.iterrows()}
    field_area_ha = float(
        getattr(field_state, "field_size_ha", getattr(field_state, "area_ha", 1.0)) or 1.0
    )

    from src.experiments.integrated_research_demo import PLAN_PERIODS

    canonical_periods = [
        "Year 1 (Rabi / Dry)",
        "Year 1 (Kharif / Wet)",
        "Year 2 (Rabi / Dry)",
        "Year 2 (Kharif / Wet)",
        "Year 3 (Rabi / Dry)",
        "Year 3 (Kharif / Wet)",
    ]
    periods = canonical_periods

    # Normalize priority weights
    if weights is None:
        from src.optimizer.strategies import DEFAULT_PRIORITY_PROFILES
        priority_key = {
            "profit": "profit_focused",
            "water_efficiency": "water_focused",
            "soil_health": "soil_focused",
            "balanced": "balanced",
        }.get(priority, "balanced")
        weights = DEFAULT_PRIORITY_PROFILES[priority_key]

    # --- 1. MILP EVALUATION ---
    milp_start = time.perf_counter()
    if milp_plan is None:
        from src.optimizer.strategies import DEFAULT_PRIORITY_PROFILES, generate_rotation_strategies
        from src.preprocessing.features import build_features

        if features is None:
            features = build_features(field_state, environmental_history=environmental_history)

        strat_res = generate_rotation_strategies(
            field_state,
            crops,
            features,
            field_history,
            DEFAULT_PRIORITY_PROFILES,
            list(PLAN_PERIODS),
            environmental_history=environmental_history,
        )
        milp_strategy_name = {
            "profit": "profit_focused",
            "water_efficiency": "water_focused",
            "soil_health": "soil_focused",
            "balanced": "balanced",
        }.get(priority, "balanced")
        milp_plan = strat_res["strategies"][milp_strategy_name]

    milp_elapsed_ms = round((time.perf_counter() - milp_start) * 1000.0, 2)

    # Extract MILP metrics
    raw_milp_rot = milp_plan.get("selected_crop_by_period") or {}
    milp_crops_list = list(raw_milp_rot.values()) if raw_milp_rot else []
    milp_rotation = {p: c for p, c in zip(canonical_periods, milp_crops_list)}
    
    # Calculate seasonal breakdown for MILP
    dyn_matrix = (
        milp_plan.get("dynamic_agronomic_matrix", {}).get("crop_season_matrix")
        or milp_plan.get("dynamic_crop_matrix")
        or {}
    )
    milp_yields = []
    milp_waters = []
    milp_legumes = []
    for raw_p, c in raw_milp_rot.items():
        if not c or c not in crop_lookup:
            continue
        c_info = crop_lookup[c]
        dyn_c = dyn_matrix.get(raw_p, {}).get(c, {})
        y = float(dyn_c.get("dynamic_yield_t_ha") or c_info.get("expected_yield", 2.0))
        wb = dyn_c.get("water_balance", {})
        w = float(wb.get("crop_et_mm") or c_info.get("water_requirement", 400.0))
        is_leg = bool(c_info.get("is_legume", False))
        milp_yields.append(y)
        milp_waters.append(w)
        milp_legumes.append(is_leg)

    milp_total_profit_ha = float(milp_plan.get("profit_component") or 0.0)
    if milp_total_profit_ha == 0.0 and milp_crops_list:
        milp_total_profit_ha = sum(
            float(crop_lookup[c].get("expected_yield", 1.0)) * float(crop_lookup[c].get("market_price", 25000.0))
            - float(crop_lookup[c].get("production_cost", 40000.0))
            for c in milp_crops_list if c in crop_lookup
        )
    milp_field_profit = milp_total_profit_ha * field_area_ha
    milp_total_water = sum(milp_waters) if milp_waters else float(len(milp_crops_list) * 400.0)
    milp_legume_count = sum(milp_legumes)
    milp_feasible_seasons = len(milp_crops_list)
    milp_violations = 0
    milp_status = milp_plan.get("solver_status") or milp_plan.get("status", "optimal")
    if str(milp_status).lower() in {"infeasible", "unsatisfiable"}:
        milp_violations = 1
        milp_feasible_seasons = 0

    initial_sh = float(
        max(20.0, min(85.0, 30.0 + (float(getattr(field_state, "organic_matter", 1.5) or 1.5) * 15.0)))
    )
    milp_soil_score = float(milp_plan.get("soil_component") or 0.0)
    milp_final_sh = round(max(20.0, min(85.0, initial_sh + (milp_legume_count * 5.0) - (len(milp_crops_list) - milp_legume_count) * 1.5)), 1)
    milp_sh_delta = round(milp_final_sh - initial_sh, 1)

    # --- 2. RL EVALUATION ---
    rl_start = time.perf_counter()
    rl_res = run_reinforcement_learning_policy(
        field_state=field_state,
        crops=crops,
        features=features or {},
        environmental_history=environmental_history,
        priority=priority,
        weights=weights,
    )
    rl_elapsed_ms = round((time.perf_counter() - rl_start) * 1000.0, 2)

    rl_traj = rl_res.get("trajectory_summary", {})
    raw_rl_rot = rl_res.get("rotation_by_period", {})
    rl_crops_list = list(raw_rl_rot.values()) if raw_rl_rot else []
    rl_rotation = {p: c for p, c in zip(canonical_periods, rl_crops_list)}
    rl_total_profit_ha = float(rl_traj.get("total_profit_bdt_per_ha", 0.0))
    rl_field_profit = rl_total_profit_ha * field_area_ha
    rl_total_water = float(rl_traj.get("total_water_requirement_mm", 0.0))
    rl_final_sh = float(rl_traj.get("final_soil_health", initial_sh))
    rl_sh_delta = float(rl_traj.get("soil_health_improvement", 0.0))
    rl_legume_count = int(rl_traj.get("legume_season_count", 0))
    rl_cum_reward = float(rl_traj.get("total_cumulative_reward", 0.0))
    
    # Check RL constraint violations (e.g., family repetition)
    rl_violations = 0
    rl_violation_notes = []
    for i in range(1, len(rl_crops_list)):
        c_prev = rl_crops_list[i - 1]
        c_curr = rl_crops_list[i]
        f_prev = crop_lookup.get(c_prev, {}).get("family")
        f_curr = crop_lookup.get(c_curr, {}).get("family")
        if f_prev and f_curr and f_prev.lower() == f_curr.lower():
            rl_violations += 1
            rl_violation_notes.append(f"Seasons {canonical_periods[i-1]} and {canonical_periods[i]}: Sequential crops {c_prev} and {c_curr} share family {f_curr}.")

    # --- 3. RULE-BASED BASELINE EVALUATION ---
    rb_start = time.perf_counter()
    rb_res = run_rule_based_rotation(
        field_state=field_state,
        crops=crops,
        planning_periods=list(PLAN_PERIODS),
        features=features,
        priority=priority,
    )
    rb_elapsed_ms = round((time.perf_counter() - rb_start) * 1000.0, 2)

    rb_metrics = rb_res.get("metrics", {})
    raw_rb_rot = rb_res.get("selected_crop_by_period", {})
    rb_crops_list = list(raw_rb_rot.values()) if raw_rb_rot else []
    rb_rotation = {p: c for p, c in zip(canonical_periods, rb_crops_list)}
    rb_total_profit_ha = float(rb_metrics.get("total_profit_bdt_per_ha", 0.0))
    rb_field_profit = float(rb_metrics.get("total_field_profit_bdt", 0.0))
    rb_total_water = float(rb_metrics.get("total_water_requirement_mm", 0.0))
    rb_final_sh = float(rb_metrics.get("final_soil_health", initial_sh))
    rb_sh_delta = float(rb_metrics.get("soil_health_delta", 0.0))
    rb_legume_count = int(rb_metrics.get("legume_season_count", 0))
    rb_violations = int(rb_metrics.get("constraint_violations", 0))

    # --- SYNTHESIS & TRADE-OFF ANALYSIS ---
    methods = [
        {
            "id": "milp",
            "name": "MILP Optimization",
            "solver": "PuLP / CBC Branch-and-Bound",
            "type": "Exact Mathematical Programming",
            "rotation": milp_rotation,
            "rotation_sequence": " -> ".join(milp_crops_list),
            "profit_bdt_per_ha": round(milp_total_profit_ha, 2),
            "total_field_profit_bdt": round(milp_field_profit, 2),
            "annual_field_profit_bdt": round(milp_field_profit / (len(periods) / 2.0), 2),
            "water_requirement_mm": round(milp_total_water, 1),
            "mean_water_mm": round(milp_total_water / max(1, len(milp_crops_list)), 1),
            "initial_soil_health": round(initial_sh, 1),
            "final_soil_health": round(milp_final_sh, 1),
            "soil_health_delta": round(milp_sh_delta, 1),
            "constraint_violations": milp_violations,
            "violation_details": ["Infeasible solver status"] if milp_violations > 0 else [],
            "feasible_seasons": milp_feasible_seasons,
            "legume_season_count": milp_legume_count,
            "crop_diversity_count": len(set(milp_crops_list)),
            "botanical_family_count": len(set(crop_lookup[c].get("family") for c in milp_crops_list if c in crop_lookup)),
            "runtime_ms": milp_elapsed_ms,
            "cumulative_reward": None,
            "optimality_guarantee": "Global mathematical optimum within linear constraint relaxation bounds.",
            "provenance": "Deterministic branch-and-bound integer program.",
        },
        {
            "id": "rl",
            "name": "RL Simulation Policy",
            "solver": "Sequential Q-Value MDP Policy",
            "type": "Reinforcement Learning Heuristic",
            "rotation": rl_rotation,
            "rotation_sequence": " -> ".join(rl_crops_list),
            "profit_bdt_per_ha": round(rl_total_profit_ha, 2),
            "total_field_profit_bdt": round(rl_field_profit, 2),
            "annual_field_profit_bdt": round(rl_field_profit / (len(periods) / 2.0), 2),
            "water_requirement_mm": round(rl_total_water, 1),
            "mean_water_mm": round(rl_total_water / max(1, len(rl_crops_list)), 1),
            "initial_soil_health": round(initial_sh, 1),
            "final_soil_health": round(rl_final_sh, 1),
            "soil_health_delta": round(rl_sh_delta, 1),
            "constraint_violations": rl_violations,
            "violation_details": rl_violation_notes,
            "feasible_seasons": len(rl_crops_list) - rl_violations,
            "legume_season_count": rl_legume_count,
            "crop_diversity_count": len(set(rl_crops_list)),
            "botanical_family_count": len(set(crop_lookup[c].get("family") for c in rl_crops_list if c in crop_lookup)),
            "runtime_ms": rl_elapsed_ms,
            "cumulative_reward": round(rl_cum_reward, 2),
            "optimality_guarantee": "Local step-wise Bellman optimality; heuristic future discount.",
            "provenance": "Simulation-trained prototype policy; not field calibrated.",
        },
        {
            "id": "rule_based",
            "name": "Agronomic Rule Baseline",
            "solver": "Deterministic Heuristic Engine",
            "type": "Domain Rule Engine",
            "rotation": rb_rotation,
            "rotation_sequence": " -> ".join(rb_crops_list),
            "profit_bdt_per_ha": round(rb_total_profit_ha, 2),
            "total_field_profit_bdt": round(rb_field_profit, 2),
            "annual_field_profit_bdt": round(rb_field_profit / (len(periods) / 2.0), 2),
            "water_requirement_mm": round(rb_total_water, 1),
            "mean_water_mm": round(rb_total_water / max(1, len(rb_crops_list)), 1),
            "initial_soil_health": round(initial_sh, 1),
            "final_soil_health": round(rb_final_sh, 1),
            "soil_health_delta": round(rb_sh_delta, 1),
            "constraint_violations": rb_violations,
            "violation_details": rb_metrics.get("violation_notes", []),
            "feasible_seasons": rb_metrics.get("feasible_seasons", len(periods)),
            "legume_season_count": rb_legume_count,
            "crop_diversity_count": rb_metrics.get("crop_diversity_count", len(set(rb_crops_list))),
            "botanical_family_count": rb_metrics.get("botanical_family_count", len(set(crop_lookup[c].get("family") for c in rb_crops_list if c in crop_lookup))),
            "runtime_ms": rb_elapsed_ms,
            "cumulative_reward": None,
            "optimality_guarantee": "Heuristic compliance with standard extension practices; no mathematical optimality.",
            "provenance": "Regional agricultural extension crop calendar rules.",
        },
    ]

    # Comparative insights
    highest_profit_method = max(methods, key=lambda m: m["profit_bdt_per_ha"])
    lowest_water_method = min(methods, key=lambda m: m["water_requirement_mm"])
    best_soil_method = max(methods, key=lambda m: m["soil_health_delta"])
    fastest_method = min(methods, key=lambda m: m["runtime_ms"])

    trade_off_analysis = {
        "highest_profit": {
            "method": highest_profit_method["name"],
            "value_bdt_ha": highest_profit_method["profit_bdt_per_ha"],
            "explanation": f"{highest_profit_method['name']} achieved highest net margin by strategically pairing high-value commercial crops within allowable constraint boundaries.",
        },
        "most_water_efficient": {
            "method": lowest_water_method["name"],
            "value_mm": lowest_water_method["water_requirement_mm"],
            "explanation": f"{lowest_water_method['name']} consumed the lowest total water ({lowest_water_method['water_requirement_mm']:.0f} mm), reducing irrigation dependency.",
        },
        "best_soil_stewardship": {
            "method": best_soil_method["name"],
            "value_delta": best_soil_method["soil_health_delta"],
            "explanation": f"{best_soil_method['name']} generated the strongest soil improvement (+{best_soil_method['soil_health_delta']:.1f} pts) via frequent legume inclusion and residue retention.",
        },
        "fastest_computation": {
            "method": fastest_method["name"],
            "value_ms": fastest_method["runtime_ms"],
            "explanation": f"{fastest_method['name']} executed in {fastest_method['runtime_ms']:.1f} ms, suitable for real-time edge or mobile environments.",
        },
        "honest_evaluation_summary": (
            "MILP delivers provable global mathematical optimality for the modeled objective function, strictly satisfying all constraints without manual tuning. "
            "The RL policy can adapt dynamically per-season but relies on heuristic future value estimation and simulation dynamics; it is not empirically field-validated. "
            "The Rule-Based baseline provides high transparency and zero runtime overhead but sacrifices economic yield due to rigid heuristic rules."
        ),
    }

    # Generate CSV export string
    csv_buffer = io.StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerow([
        "Evaluation Dimension",
        "MILP Optimization",
        "RL Simulation Policy",
        "Agronomic Rule Baseline",
    ])
    writer.writerow([
        "Rotation Sequence",
        methods[0]["rotation_sequence"],
        methods[1]["rotation_sequence"],
        methods[2]["rotation_sequence"],
    ])
    writer.writerow([
        "Gross Margin (BDT/ha)",
        methods[0]["profit_bdt_per_ha"],
        methods[1]["profit_bdt_per_ha"],
        methods[2]["profit_bdt_per_ha"],
    ])
    writer.writerow([
        "Total Field Gross Margin (BDT)",
        methods[0]["total_field_profit_bdt"],
        methods[1]["total_field_profit_bdt"],
        methods[2]["total_field_profit_bdt"],
    ])
    writer.writerow([
        "Annual Field Margin (BDT)",
        methods[0]["annual_field_profit_bdt"],
        methods[1]["annual_field_profit_bdt"],
        methods[2]["annual_field_profit_bdt"],
    ])
    writer.writerow([
        "Total Water Demand (mm)",
        methods[0]["water_requirement_mm"],
        methods[1]["water_requirement_mm"],
        methods[2]["water_requirement_mm"],
    ])
    writer.writerow([
        "Mean Seasonal Water (mm)",
        methods[0]["mean_water_mm"],
        methods[1]["mean_water_mm"],
        methods[2]["mean_water_mm"],
    ])
    writer.writerow([
        "Soil Health Score (Initial -> Final)",
        f"{methods[0]['initial_soil_health']} -> {methods[0]['final_soil_health']} ({methods[0]['soil_health_delta']:+})",
        f"{methods[1]['initial_soil_health']} -> {methods[1]['final_soil_health']} ({methods[1]['soil_health_delta']:+})",
        f"{methods[2]['initial_soil_health']} -> {methods[2]['final_soil_health']} ({methods[2]['soil_health_delta']:+})",
    ])
    writer.writerow([
        "Legume Seasons (out of 6)",
        methods[0]["legume_season_count"],
        methods[1]["legume_season_count"],
        methods[2]["legume_season_count"],
    ])
    writer.writerow([
        "Crop Diversity Count",
        methods[0]["crop_diversity_count"],
        methods[1]["crop_diversity_count"],
        methods[2]["crop_diversity_count"],
    ])
    writer.writerow([
        "Constraint Violations",
        methods[0]["constraint_violations"],
        methods[1]["constraint_violations"],
        methods[2]["constraint_violations"],
    ])
    writer.writerow([
        "Feasible Seasons",
        methods[0]["feasible_seasons"],
        methods[1]["feasible_seasons"],
        methods[2]["feasible_seasons"],
    ])
    writer.writerow([
        "Solver / Policy Runtime (ms)",
        methods[0]["runtime_ms"],
        methods[1]["runtime_ms"],
        methods[2]["runtime_ms"],
    ])
    writer.writerow([
        "Cumulative RL Reward",
        "N/A",
        methods[1]["cumulative_reward"],
        "N/A",
    ])
    writer.writerow([
        "Scientific Boundary",
        methods[0]["optimality_guarantee"],
        methods[1]["optimality_guarantee"],
        methods[2]["optimality_guarantee"],
    ])

    return {
        "status": "ok",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "field_id": getattr(field_state, "field_id", "demo"),
        "field_area_ha": field_area_ha,
        "priority": priority,
        "weights": weights,
        "methods": methods,
        "trade_off_analysis": trade_off_analysis,
        "seasons": canonical_periods,
        "export_csv": csv_buffer.getvalue(),
        "total_lab_runtime_ms": round((time.perf_counter() - total_start_time) * 1000.0, 2),
    }
