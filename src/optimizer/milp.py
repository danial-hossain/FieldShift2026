import os
import shutil
import tempfile
"""MILP model for long-term crop-rotation planning with explicit priorities."""

from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Mapping, Optional, Sequence, Union

import numpy as np
import pandas as pd
import pulp

from src.data.crops import CROP_COLUMNS, load_crop_knowledge
from src.data.field_history import (
    FIELD_HISTORY_COLUMNS,
    load_field_history,
    normalize_field_history,
)
from src.knowledge.agronomic_rules import evaluate_crop_compatibility
from src.optimizer.dynamic_agronomy import build_dynamic_crop_season_matrix

DEFAULT_PLANNING_YEARS = 2
DEFAULT_SEASONS_PER_YEAR = 3
LEGUME_INTERVAL_SEASONS = 3
DEFAULT_PERIODS = (
    "Y1_S1", "Y1_S2", "Y1_S3",
    "Y2_S1", "Y2_S2", "Y2_S3"
)
OBJECTIVE_COMPONENTS = ("profit", "water", "soil", "national_need")
STATUS_MAP = {
    "observed": "observed",
    "synthetic": "synthetic",
    "demo": "synthetic",
    "missing": "unknown",
}

# Explicit, illustrative mappings for the bundled crop knowledge vocabulary.
NUTRIENT_EFFECT_VALUES = {
    "biological_nitrogen_fixation": 1.0,
    "high_nitrogen_demand": -1.0,
    "moderate_nitrogen_demand": 0.0,
    "high_potassium_demand": -1.0,
    "moderate_nutrient_demand": 0.0,
    "neutral": 0.0,
}
SOIL_IMPACT_VALUES = {
    "improves_rotation_diversity": 1.0,
    "moderate_residue": 0.5,
    "deep_root_residue": 0.5,
    "moderate_soil_disturbance": -0.5,
    "high_water_use": -0.5,
    "moderate_water_use": -0.2,
    "neutral": 0.0,
}


@dataclass(frozen=True)
class FarmerPriorityWeights:
    """Farmer-selected objective priorities; they are not universal defaults."""

    profit_weight: float = 0.5
    water_weight: float = 0.3
    soil_weight: float = 0.2
    national_need_weight: float = 0.0

    def normalized(self, available: Optional[Sequence[str]] = None) -> dict[str, float]:
        supplied = {
            "profit": self.profit_weight,
            "water": self.water_weight,
            "soil": self.soil_weight,
        }
        if self.national_need_weight > 0:
            supplied["national_need"] = self.national_need_weight
        values = {}
        for name, value in supplied.items():
            if isinstance(value, (bool, np.bool_)):
                raise ValueError(
                    "Priority weights must be numeric, finite, and non-negative."
                )
            try:
                numeric = float(value)
            except (TypeError, ValueError, OverflowError) as error:
                raise ValueError(
                    "Priority weights must be numeric, finite, and non-negative."
                ) from error
            if not np.isfinite(numeric) or numeric < 0:
                raise ValueError(
                    "Priority weights must be numeric, finite, and non-negative."
                )
            values[name] = numeric
        if sum(values.values()) <= 0:
            raise ValueError("Priority weights must include at least one positive value.")
        selected = set(available) if available is not None else set(values)
        active_sum = sum(value for name, value in values.items() if name in selected)
        if active_sum <= 0:
            return {name: 0.0 for name in values}
        return {
            name: value / active_sum if name in selected else 0.0
            for name, value in values.items()
        }


def _period_list(
    planning_periods: Optional[Sequence[str]],
    years: int,
    seasons_per_year: int,
) -> list[str]:
    if planning_periods is None:
        if (
            isinstance(years, bool)
            or not isinstance(years, int)
            or years < 1
        ):
            raise ValueError("years must be a positive integer.")
        if (
            isinstance(seasons_per_year, bool)
            or not isinstance(seasons_per_year, int)
            or seasons_per_year < 1
        ):
            raise ValueError("seasons_per_year must be a positive integer.")
        return [
            f"Y{year}_S{season}"
            for year in range(1, years + 1)
            for season in range(1, seasons_per_year + 1)
        ]
    periods = list(planning_periods)
    if not periods or any(not isinstance(period, str) or not period.strip() for period in periods):
        raise ValueError("planning_periods must contain non-empty strings.")
    if len(set(periods)) != len(periods):
        raise ValueError("planning_periods must be unique.")
    return periods


def _period_season(period: str, period_idx: int) -> str:
    """Map planning period (e.g. Y1_S1, Y1_S2, Y1_S3) to agro-ecological season ('rabi', 'kharif1', or 'kharif2')."""
    p_upper = period.upper()
    if "_S" in p_upper:
        try:
            s_num = int(p_upper.split("_S")[-1])
            if s_num == 1:
                return "rabi"
            elif s_num == 2:
                return "kharif1"
            elif s_num == 3:
                return "kharif2"
        except ValueError:
            pass
    if p_upper.startswith("S") and p_upper[1:].isdigit():
        s_num = int(p_upper[1:])
        if s_num == 1:
            return "rabi"
        elif s_num == 2:
            return "kharif1"
        elif s_num == 3:
            return "kharif2"
    s_idx = (period_idx % 3) + 1
    if s_idx == 1:
        return "rabi"
    elif s_idx == 2:
        return "kharif1"
    return "kharif2"


def _crop_frame(crops: Optional[pd.DataFrame]) -> pd.DataFrame:
    frame = load_crop_knowledge() if crops is None else crops.copy()
    if "allowed_seasons" not in frame.columns:
        frame["allowed_seasons"] = "rabi|kharif"
    else:
        frame["allowed_seasons"] = frame["allowed_seasons"].replace("", "rabi|kharif").fillna("rabi|kharif")
    missing = [column for column in CROP_COLUMNS if column not in frame.columns]
    if missing:
        raise ValueError("Crop data is missing required columns: " + ", ".join(missing))
    frame = frame[CROP_COLUMNS].reset_index(drop=True)
    if frame.empty:
        raise ValueError("At least one candidate crop is required.")
    frame["crop"] = frame["crop"].astype(str).str.strip()
    if frame["crop"].eq("").any() or frame["crop"].duplicated().any():
        raise ValueError("Crop names must be non-empty and unique.")
    frame["family"] = frame["family"].astype(str).str.strip()
    def parse_legume(value):
        if isinstance(value, (bool, np.bool_)):
            return bool(value)
        text = str(value).strip().lower()
        if text in {"true", "1", "yes"}:
            return True
        if text in {"false", "0", "no"}:
            return False
        raise ValueError("Crop is_legume must be true or false for every candidate.")

    frame["is_legume"] = frame["is_legume"].map(parse_legume)
    for column in (
        "water_requirement",
        "duration_days",
        "min_temperature",
        "max_temperature",
        "min_ph",
        "max_ph",
        "expected_yield",
        "production_cost",
        "market_price",
    ):
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    return frame


def _history_frame(
    history: Optional[Union[pd.DataFrame, str, Path]],
    field_state,
) -> pd.DataFrame:
    if history is None:
        field_id = getattr(field_state, "field_id", None)
        if not field_id:
            return pd.DataFrame(columns=FIELD_HISTORY_COLUMNS)
        records = load_field_history(field_id=field_id)
    elif isinstance(history, pd.DataFrame):
        records = normalize_field_history(history)
    elif isinstance(history, (str, Path)):
        records = load_field_history(
            csv_path=history,
            field_id=getattr(field_state, "field_id", None),
        )
    else:
        raise TypeError("field_history must be a DataFrame, CSV path, or None.")
    if records.empty or not getattr(field_state, "field_id", None):
        return pd.DataFrame(columns=FIELD_HISTORY_COLUMNS)
    as_of = pd.Timestamp(field_state.as_of_date).normalize()
    return records.loc[
        records["field_id"].astype(str).eq(str(field_state.field_id))
        & records["year"].lt(as_of.year)
    ].reset_index(drop=True)


def _compatibility_proxy(field_state, previous_family: Optional[str]):
    """Supply the public Phase 6 rule API with the family being transitioned from."""
    return SimpleNamespace(
        field_id=getattr(field_state, "field_id", "planning_field"),
        as_of_date=getattr(field_state, "as_of_date", pd.Timestamp("1900-01-01")),
        temperature=getattr(field_state, "temperature", np.nan),
        ph=getattr(field_state, "ph", np.nan),
        soil_moisture=getattr(field_state, "soil_moisture", np.nan),
        rainfall=getattr(field_state, "rainfall", np.nan),
        nitrogen=getattr(field_state, "nitrogen", np.nan),
        phosphorus=getattr(field_state, "phosphorus", np.nan),
        potassium=getattr(field_state, "potassium", np.nan),
        organic_matter=getattr(field_state, "organic_matter", np.nan),
        texture=getattr(field_state, "texture", None),
        previous_crop=getattr(field_state, "previous_crop", None),
        previous_crop_family=previous_family,
        previous_crop_is_legume=getattr(
            field_state, "previous_crop_is_legume", None
        ),
        environment_source=getattr(field_state, "environment_source", "missing"),
        soil_source=getattr(field_state, "soil_source", "missing"),
        soil_moisture_source=getattr(
            field_state, "soil_moisture_source", "missing"
        ),
        history_source=getattr(field_state, "history_source", "missing"),
        data_status=getattr(field_state, "data_status", {}),
    )


def _previous_crop_family(
    field_state, history: pd.DataFrame, crop_catalog: pd.DataFrame
) -> Optional[str]:
    family = getattr(field_state, "previous_crop_family", None)
    if isinstance(family, str) and family.strip():
        return family.strip()

    crop_name = getattr(field_state, "previous_crop", None)
    if not crop_name and not history.empty:
        crop_name = history.iloc[-1]["crop"]
    if not isinstance(crop_name, str) or not crop_name.strip():
        return None

    matches = crop_catalog.loc[
        crop_catalog["crop"].str.casefold() == crop_name.strip().casefold()
    ]
    if matches.empty:
        return None
    return str(matches.iloc[0]["family"])


def _evaluate_rules(
    crops: pd.DataFrame,
    field_state,
    features: Optional[Mapping[str, Any]],
    history: pd.DataFrame,
) -> dict[str, dict[str, Any]]:
    previous_family = _previous_crop_family(field_state, history, crops)
    compatibility_state = _compatibility_proxy(field_state, previous_family)
    return {
        row["crop"]: evaluate_crop_compatibility(
            row,
            compatibility_state,
            features=features,
            field_history=history,
            crop_catalog=crops,
        )
        for _, row in crops.iterrows()
    }


def _normalized(values: Mapping[str, Optional[float]], direction: str) -> dict[str, Optional[float]]:
    available = [value for value in values.values() if value is not None]
    if not available:
        return {name: None for name in values}
    low = min(available)
    high = max(available)
    result = {}
    for name, value in values.items():
        if value is None:
            result[name] = None
        elif high == low:
            result[name] = 1.0
        elif direction == "maximize":
            result[name] = (value - low) / (high - low)
        else:
            result[name] = (high - value) / (high - low)
    return result


def _objective_data(crops: pd.DataFrame) -> dict[str, dict[str, Optional[float]]]:
    profit: dict[str, Optional[float]] = {}
    water: dict[str, Optional[float]] = {}
    soil: dict[str, Optional[float]] = {}

    for _, crop in crops.iterrows():
        name = crop["crop"]
        yield_value = crop["expected_yield"]
        price = crop["market_price"]
        cost = crop["production_cost"]
        if any(pd.isna(value) for value in (yield_value, price, cost)):
            profit[name] = None
        else:
            profit[name] = float(yield_value * price - cost)

        water_value = crop["water_requirement"]
        water[name] = None if pd.isna(water_value) else float(water_value)

        nutrient_value = NUTRIENT_EFFECT_VALUES.get(
            str(crop["nutrient_effect"]).strip().lower()
        )
        soil_impact = SOIL_IMPACT_VALUES.get(
            str(crop["soil_impact"]).strip().lower()
        )
        is_legume = crop["is_legume"]
        if nutrient_value is None or soil_impact is None or pd.isna(is_legume):
            soil[name] = None
        else:
            soil[name] = float(
                (float(bool(is_legume)) + nutrient_value + soil_impact) / 3.0
            )

    # 4. National demand / self-sufficiency from FAOSTAT Bangladesh
    faostat_csv = Path(__file__).resolve().parents[2] / "data" / "market" / "faostat_bd.csv"
    national_need: dict[str, Optional[float]] = {}
    fao_scores = {}
    if faostat_csv.exists():
        try:
            fao_df = pd.read_csv(faostat_csv)
            fao_scores = dict(zip(fao_df["crop"], fao_df["import_dependency_ratio"]))
        except Exception:
            pass

    for _, crop in crops.iterrows():
        name = crop["crop"]
        score = fao_scores.get(name)
        if score is None:
            if "rice" in name.lower():
                score = fao_scores.get("Rice", 0.0288)
            elif name.lower() == "fallow":
                score = 0.0
            else:
                score = 0.1
        national_need[name] = float(score)

    component_status = {
        "profit": "available" if all(v is not None for v in profit.values()) else "excluded_missing_metadata",
        "water": "available" if all(v is not None for v in water.values()) else "excluded_missing_metadata",
        "soil": "available" if all(v is not None for v in soil.values()) else "excluded_missing_metadata",
        "national_need": "available",
    }

    return {
        "profit_raw": profit,
        "water_raw": water,
        "soil_raw": soil,
        "national_need_raw": national_need,
        "profit_normalized": _normalized(profit, "maximize"),
        "water_normalized": _normalized(water, "minimize"),
        "soil_normalized": _normalized(soil, "maximize"),
        "national_need_normalized": _normalized(national_need, "maximize"),
        "component_status": component_status,
    }


def _compatible_pair(
    crop: pd.Series,
    previous_family: Optional[str],
    field_state,
    features: Optional[Mapping[str, Any]],
    history: pd.DataFrame,
    crop_catalog: pd.DataFrame,
) -> bool:
    proxy = _compatibility_proxy(field_state, previous_family)
    result = evaluate_crop_compatibility(
        crop,
        proxy,
        features=features,
        field_history=history,
        crop_catalog=crop_catalog,
    )
    return result["rules"]["family_rotation"]["status"] != "incompatible"


def build_milp_model(
    field_state,
    crops: Optional[pd.DataFrame] = None,
    features: Optional[Mapping[str, Any]] = None,
    field_history: Optional[Union[pd.DataFrame, str, Path]] = None,
    environmental_history: Optional[pd.DataFrame] = None,
    planning_periods: Optional[Sequence[str]] = None,
    years: int = DEFAULT_PLANNING_YEARS,
    seasons_per_year: int = DEFAULT_SEASONS_PER_YEAR,
    legume_interval_seasons: int = LEGUME_INTERVAL_SEASONS,
    profit_weight: float = 0.5,
    water_weight: float = 0.3,
    soil_weight: float = 0.2,
    national_need_weight: float = 0.0,
):
    """Build and return a PuLP problem and its prepared model metadata.

    Dynamic agronomic response computes seasonal thermal suitability, effective
    rainfall, irrigation requirements, and soil impact per period.
    """
    if (
        isinstance(legume_interval_seasons, bool)
        or not isinstance(legume_interval_seasons, int)
        or legume_interval_seasons < 1
    ):
        raise ValueError("legume_interval_seasons must be a positive integer.")
    periods = _period_list(planning_periods, years, seasons_per_year)
    crop_frame = _crop_frame(crops)
    history = _history_frame(field_history, field_state)
    weights = FarmerPriorityWeights(
        profit_weight, water_weight, soil_weight, national_need_weight
    ).normalized()
    rule_results = _evaluate_rules(crop_frame, field_state, features, history)

    # Dynamic seasonal agronomy engine
    dynamic_data = build_dynamic_crop_season_matrix(
        field_state=field_state,
        crops=crop_frame,
        environmental_history=environmental_history,
        planning_periods=periods,
    )
    dyn_matrix = dynamic_data["crop_season_matrix"]

    static_check_rules = (
        ("ph",)
        if environmental_history is not None
        else ("temperature", "ph", "water")
    )
    eligibility = {}
    for _, crop in crop_frame.iterrows():
        result = rule_results[crop["crop"]]
        static_rules = result["rules"]
        explicitly_incompatible = any(
            static_rules[name]["status"] == "incompatible"
            for name in static_check_rules
        )
        eligibility[crop["crop"]] = not explicitly_incompatible

    objective = _objective_data(crop_frame)
    candidate_names = list(crop_frame["crop"])
    included_components = [
        component
        for component, status in objective["component_status"].items()
        if status == "available"
    ]
    effective_weights = FarmerPriorityWeights(
        profit_weight, water_weight, soil_weight, national_need_weight
    ).normalized(included_components)

    problem = pulp.LpProblem("FieldShift_Crop_Rotation", pulp.LpMaximize)
    variables = {
        (crop, period): pulp.LpVariable(
            f"x_{crop_index}_{period_index}",
            lowBound=0,
            upBound=1,
            cat=pulp.LpBinary,
        )
        for crop_index, crop in enumerate(candidate_names)
        for period_index, period in enumerate(periods)
    }

    for period in periods:
        problem += (
            pulp.lpSum(variables[(crop, period)] for crop in candidate_names) == 1,
            f"one_crop_{period}",
        )

    excluded_static = [
        name for name in candidate_names if not eligibility[name]
    ]
    for crop_name in excluded_static:
        for period in periods:
            problem += variables[(crop_name, period)] == 0, (
                f"static_incompatibility_{candidate_names.index(crop_name)}_{periods.index(period)}"
            )

    # Dynamic seasonal incompatibility enforcement (water deficit, thermal boundary)
    for period_idx, period in enumerate(periods):
        for crop_idx, crop_name in enumerate(candidate_names):
            if not dyn_matrix[period][crop_name]["is_feasible"]:
                problem += variables[(crop_name, period)] == 0, (
                    f"dynamic_seasonal_infeasible_{crop_idx}_{period_idx}"
                )

    # Agro-ecological season suitability constraints (e.g. Chickpea/Wheat/Mustard only in Rabi, Mungbean/Jute only in Kharif)
    season_suitability_exclusions = {}
    for period_idx, period in enumerate(periods):
        p_season = _period_season(period, period_idx)
        excluded_for_period = []
        for crop_idx, crop_name in enumerate(candidate_names):
            crop_row = crop_frame.loc[crop_frame["crop"] == crop_name].iloc[0]
            allowed_str = str(crop_row.get("allowed_seasons", "rabi|kharif1|kharif2")).lower()
            allowed = [s.strip() for s in allowed_str.split("|")]
            is_match = (
                p_season in allowed
                or ("kharif" in allowed and p_season in ("kharif1", "kharif2"))
            )
            if not is_match:
                excluded_for_period.append(crop_name)
                problem += variables[(crop_name, period)] == 0, (
                    f"season_suitability_{crop_idx}_{period_idx}"
                )
        season_suitability_exclusions[period] = excluded_for_period

    # Duration vs window occupancy constraint
    # If crop 1 duration + crop 2 duration > 240 days, they cannot be grown in adjacent seasons
    for p_idx in range(len(periods) - 1):
        p_curr = periods[p_idx]
        p_next = periods[p_idx + 1]
        for c1 in candidate_names:
            dur1 = float(crop_frame.loc[crop_frame["crop"] == c1, "duration_days"].iloc[0])
            for c2 in candidate_names:
                dur2 = float(crop_frame.loc[crop_frame["crop"] == c2, "duration_days"].iloc[0])
                if dur1 + dur2 > 240:
                    problem += (
                        variables[(c1, p_curr)] + variables[(c2, p_next)] <= 1,
                        f"duration_overlap_{p_idx}_{candidate_names.index(c1)}_{candidate_names.index(c2)}"
                    )

    # Rotation realism 1: No crop in the same season two years running (unless rice in kharif2 or fallow)
    if len(periods) == 6:
        for s in range(3):
            p_y1 = periods[s]
            p_y2 = periods[s + 3]
            for c in candidate_names:
                is_rice_in_k2 = (s == 2 and ("rice" in c.lower() or c == "Rice"))
                is_fallow = (c.lower() == "fallow")
                if not is_rice_in_k2 and not is_fallow:
                    problem += (
                        variables[(c, p_y1)] + variables[(c, p_y2)] <= 1,
                        f"no_same_crop_consecutive_years_{s}_{candidate_names.index(c)}"
                    )

    previous_family = _previous_crop_family(field_state, history, crop_frame)
    first_period_blocked = []
    if previous_family is not None:
        for _, crop in crop_frame.iterrows():
            if not _compatible_pair(
                crop,
                previous_family,
                field_state,
                features,
                history,
                crop_frame,
            ):
                crop_name = crop["crop"]
                first_period_blocked.append(crop_name)
                problem += variables[(crop_name, periods[0])] == 0, (
                    f"previous_family_{candidate_names.index(crop_name)}"
                )

    adjacency_count = 0
    family_compatibility = {}
    family_representatives = {
        family: crop_frame.loc[crop_frame["family"] == family].iloc[0]
        for family in dict.fromkeys(crop_frame["family"].astype(str))
    }
    for previous_family in family_representatives:
        for current_family, crop in family_representatives.items():
            family_compatibility[(previous_family, current_family)] = _compatible_pair(
                crop,
                previous_family,
                field_state,
                features,
                history,
                crop_frame,
            )
    for previous_period, current_period in zip(periods, periods[1:]):
        for previous_crop_name in candidate_names:
            previous_crop = crop_frame.loc[
                crop_frame["crop"] == previous_crop_name
            ].iloc[0]
            for current_crop_name in candidate_names:
                current_crop = crop_frame.loc[
                    crop_frame["crop"] == current_crop_name
                ].iloc[0]
                family_pair = (
                    str(previous_crop["family"]),
                    str(current_crop["family"]),
                )
                if not family_compatibility[family_pair]:
                    problem += (
                        variables[(previous_crop_name, previous_period)]
                        + variables[(current_crop_name, current_period)]
                        <= 1,
                        f"family_transition_{periods.index(previous_period)}_"
                        f"{candidate_names.index(previous_crop_name)}_"
                        f"{candidate_names.index(current_crop_name)}",
                    )
                    adjacency_count += 1

    legume_names = [
        row["crop"]
        for _, row in crop_frame.iterrows()
        if bool(row["is_legume"])
    ]
    legume_window_count = 0
    for start in range(0, len(periods) - legume_interval_seasons + 1):
        window = periods[start : start + legume_interval_seasons]
        if legume_names:
            problem += (
                pulp.lpSum(
                    variables[(crop, period)]
                    for crop in legume_names
                    for period in window
                )
                >= 1,
                f"legume_interval_{start}",
            )
        else:
            problem += (
                pulp.lpSum(
                    variables[(crop, window[0])] for crop in candidate_names
                )
                <= 0,
                f"legume_interval_impossible_{start}",
            )
        legume_window_count += 1

    # Multi-objective optimization over dynamic seasonal metrics & national need
    nat_norm = objective.get("national_need_normalized", {})
    objective_expression = pulp.lpSum(
        (
            effective_weights.get("profit", 0.0) * dyn_matrix[period][crop]["normalized_profit_score"]
            + effective_weights.get("water", 0.0) * dyn_matrix[period][crop]["normalized_water_score"]
            + effective_weights.get("soil", 0.0) * dyn_matrix[period][crop]["normalized_soil_score"]
            + effective_weights.get("national_need", 0.0) * (nat_norm.get(crop) or 0.0)
        )
        * variables[(crop, period)]
        for crop in candidate_names
        for period in periods
    )
    problem += objective_expression

    metadata = {
        "crops": crop_frame,
        "periods": periods,
        "variables": variables,
        "objective": objective,
        "dynamic_agronomic_matrix": dynamic_data,
        "seasonal_environments": dynamic_data["seasonal_environments"],
        "rule_results": rule_results,
        "weights": weights,
        "effective_weights": effective_weights,
        "included_components": included_components,
        "component_status": {
            component: "included"
            if status == "available"
            else "excluded_missing_metadata"
            for component, status in objective["component_status"].items()
        },
        "eligibility": eligibility,
        "excluded_static": excluded_static,
        "season_suitability_exclusions": season_suitability_exclusions,
        "first_period_blocked": first_period_blocked,
        "legume_names": legume_names,
        "legume_window_count": legume_window_count,
        "family_transition_constraint_count": adjacency_count,
        "legume_interval_seasons": legume_interval_seasons,
        "objective_expression": objective_expression,
        "history": history,
    }
    return problem, metadata


def _source_status(value: Any) -> str:
    return STATUS_MAP.get(str(value).strip().lower(), "unknown")


def _result_provenance(field_state, crops: pd.DataFrame, history: pd.DataFrame):
    crop_sources = list(dict.fromkeys(crops["source"].astype(str).tolist()))
    crop_statuses = list(
        dict.fromkeys(crops["data_status"].astype(str).tolist())
    )
    history_sources = (
        list(dict.fromkeys(history["source"].astype(str).tolist()))
        if not history.empty
        else [getattr(field_state, "history_source", "missing")]
    )
    history_statuses = (
        list(dict.fromkeys(history["data_status"].astype(str).tolist()))
        if not history.empty
        else [getattr(field_state, "data_status", {}).get("history", "missing")]
    )
    statuses = getattr(field_state, "data_status", {}) or {}
    return {
        "environment": {
            "source": getattr(field_state, "environment_source", "missing"),
            "data_status": statuses.get("environment", "missing"),
            "observation_date": getattr(
                field_state, "environment_observation_date", None
            ),
        },
        "soil": {
            "source": getattr(field_state, "soil_source", "missing"),
            "data_status": statuses.get("soil", "missing"),
            "as_of_date": getattr(field_state, "soil_as_of_date", None),
        },
        "soil_moisture": {
            "source": getattr(field_state, "soil_moisture_source", "missing"),
            "data_status": statuses.get("soil_moisture", "missing"),
            "observation_date": getattr(
                field_state, "soil_moisture_observation_date", None
            ),
        },
        "crop_knowledge": {
            "source": crop_sources,
            "data_status": crop_statuses,
            "economic_values_are_illustrative": any(
                _source_status(value) in {"synthetic", "unknown"}
                for value in crop_statuses
            ),
        },
        "field_history": {
            "source": history_sources,
            "data_status": history_statuses,
            "decision_date": str(pd.Timestamp(field_state.as_of_date).date()),
        },
        "agronomic_rules": {
            "source": "src.knowledge.agronomic_rules.evaluate_crop_compatibility",
            "data_status": "applied",
        },
    }


def _result_data_status(field_state, metadata: Mapping[str, Any]) -> dict[str, Any]:
    crop_statuses = list(
        dict.fromkeys(metadata["crops"]["data_status"].astype(str).tolist())
    )
    return {
        "environment": getattr(field_state, "data_status", {}).get(
            "environment", "missing"
        ),
        "soil": getattr(field_state, "data_status", {}).get("soil", "missing"),
        "soil_moisture": getattr(field_state, "data_status", {}).get(
            "soil_moisture", "missing"
        ),
        "crop_knowledge": crop_statuses,
        "field_history": list(
            dict.fromkeys(metadata["history"]["data_status"].astype(str).tolist())
        )
        if not metadata["history"].empty
        else [getattr(field_state, "data_status", {}).get("history", "missing")],
        "objective_components": metadata["component_status"],
    }


def optimize_rotation(
    field_state,
    crops: Optional[pd.DataFrame] = None,
    features: Optional[Mapping[str, Any]] = None,
    field_history: Optional[Union[pd.DataFrame, str, Path]] = None,
    environmental_history: Optional[pd.DataFrame] = None,
    planning_periods: Optional[Sequence[str]] = None,
    years: int = DEFAULT_PLANNING_YEARS,
    seasons_per_year: int = DEFAULT_SEASONS_PER_YEAR,
    legume_interval_seasons: int = LEGUME_INTERVAL_SEASONS,
    profit_weight: float = 0.5,
    water_weight: float = 0.3,
    soil_weight: float = 0.2,
    national_need_weight: float = 0.0,
    solver: Optional[pulp.LpSolver] = None,
) -> dict[str, Any]:
    """Optimize a long-term rotation for the supplied periods and priorities."""
    problem, metadata = build_milp_model(
        field_state=field_state,
        crops=crops,
        features=features,
        field_history=field_history,
        environmental_history=environmental_history,
        planning_periods=planning_periods,
        years=years,
        seasons_per_year=seasons_per_year,
        legume_interval_seasons=legume_interval_seasons,
        profit_weight=profit_weight,
        water_weight=water_weight,
        soil_weight=soil_weight,
        national_need_weight=national_need_weight,
    )
    tmp_dir = None
    if solver is None:
        import tempfile
        tmp_dir = tempfile.mkdtemp(prefix="fs_cbccmd_")
        solver = pulp.PULP_CBC_CMD(msg=False, threads=1, keepFiles=False)
        solver.tmpDir = tmp_dir

    try:
        solver_status_code = problem.solve(solver)
    except (pulp.PulpSolverError, Exception) as error:
        return _empty_result(
            "solver_error",
            str(error),
            metadata,
            field_state,
        )
    finally:
        if tmp_dir and os.path.exists(tmp_dir):
            try:
                import shutil
                shutil.rmtree(tmp_dir, ignore_errors=True)
            except Exception:
                pass
    solver_status = pulp.LpStatus.get(solver_status_code, "Unknown")
    if solver_status != "Optimal":
        status = "infeasible" if solver_status == "Infeasible" else "not_solved"
        return _empty_result(status, solver_status, metadata, field_state)

    selection = {}
    for period in metadata["periods"]:
        selected = [
            crop
            for crop in metadata["crops"]["crop"]
            if pulp.value(metadata["variables"][(crop, period)]) > 0.5
        ]
        if len(selected) != 1:
            return _empty_result(
                "solver_error",
                "Optimal solver result did not contain exactly one crop per period.",
                metadata,
                field_state,
            )
        selection[period] = selected[0]

    dyn_matrix = metadata["dynamic_agronomic_matrix"]["crop_season_matrix"]
    if metadata["component_status"].get("profit") == "included":
        profit_component = float(sum(dyn_matrix[p][c]["dynamic_gross_margin_bdt_ha"] for p, c in selection.items()))
        profit_norm_sum = float(sum(dyn_matrix[p][c]["normalized_profit_score"] for p, c in selection.items()))
    else:
        profit_component = None
        profit_norm_sum = None

    if metadata["component_status"].get("water") == "included":
        water_component = float(sum(dyn_matrix[p][c]["normalized_water_score"] for p, c in selection.items()))
    else:
        water_component = None

    if metadata["component_status"].get("soil") == "included":
        soil_component = float(sum(dyn_matrix[p][c]["normalized_soil_score"] for p, c in selection.items()))
    else:
        soil_component = None

    constraints = {
        "one_crop_per_period": len(metadata["periods"]),
        "family_transition_constraints": metadata[
            "family_transition_constraint_count"
        ],
        "previous_family_exclusions": metadata["first_period_blocked"],
        "static_compatibility_exclusions": metadata["excluded_static"],
        "season_suitability_exclusions": metadata.get("season_suitability_exclusions", {}),
        "legume_interval_seasons": metadata["legume_interval_seasons"],
        "legume_windows": metadata["legume_window_count"],
        "binary_decision_variables": len(metadata["variables"]),
        "unknown_compatibility_allowed": True,
    }
    crop_rule_statuses = {
        crop: {
            name: result["rules"][name]["status"]
            for name in result["rules"]
        }
        for crop, result in metadata["rule_results"].items()
    }
    data_status = _result_data_status(field_state, metadata)
    return {
        "status": "optimal",
        "solver_status": solver_status,
        "planning_periods": metadata["periods"],
        "selected_crop_by_period": selection,
        "objective_value": float(pulp.value(metadata["objective_expression"])),
        "profit_component": profit_component,
        "water_component": water_component,
        "soil_component": soil_component,
        "normalized_components": {
            "profit": profit_norm_sum,
            "water": water_component,
            "soil": soil_component,
        },
        "dynamic_agronomic_matrix": metadata["dynamic_agronomic_matrix"],
        "seasonal_environments": metadata["seasonal_environments"],
        "environment_basis": metadata["dynamic_agronomic_matrix"].get("environment_basis", "default_no_history"),
        "environment_basis": metadata["dynamic_agronomic_matrix"].get("environment_basis", "default_no_history"),
        "weights": {
            "requested": metadata["weights"],
            "effective": metadata["effective_weights"],
        },
        "constraint_summary": constraints,
        "data_status": data_status,
        "compatibility_status_by_crop": crop_rule_statuses,
        "compatibility_by_crop": metadata["rule_results"],
        "provenance": _result_provenance(
            field_state, metadata["crops"], metadata["history"]
        ),
        "objective_label": "optimized rotation under supplied priorities and constraints",
        "monetary_component_status": (
            "illustrative/demo"
            if metadata["component_status"]["profit"] == "included"
            and _result_provenance(field_state, metadata["crops"], metadata["history"])[
                "crop_knowledge"
            ]["economic_values_are_illustrative"]
            else metadata["component_status"]["profit"]
        ),
    }


def _empty_result(
    status: str,
    solver_status: str,
    metadata: Mapping[str, Any],
    field_state,
) -> dict[str, Any]:
    history = metadata["history"]
    return {
        "status": status,
        "solver_status": solver_status,
        "planning_periods": list(metadata["periods"]),
        "selected_crop_by_period": None,
        "objective_value": None,
        "profit_component": None,
        "water_component": None,
        "soil_component": None,
        "normalized_components": None,
        "weights": {
            "requested": metadata["weights"],
            "effective": metadata["effective_weights"],
        },
        "constraint_summary": {
            "one_crop_per_period": len(metadata["periods"]),
            "family_transition_constraints": metadata[
                "family_transition_constraint_count"
            ],
            "previous_family_exclusions": metadata["first_period_blocked"],
            "static_compatibility_exclusions": metadata["excluded_static"],
            "season_suitability_exclusions": metadata.get("season_suitability_exclusions", {}),
            "legume_interval_seasons": metadata["legume_interval_seasons"],
            "legume_windows": metadata["legume_window_count"],
            "infeasibility_note": (
                "Review candidate crop families, explicit compatibility exclusions, "
                "and the rolling legume interval constraints."
            )
            if status == "infeasible"
            else None,
        },
        "data_status": _result_data_status(field_state, metadata),
        "compatibility_by_crop": metadata["rule_results"],
        "provenance": _result_provenance(
            field_state, metadata["crops"], history
        ),
        "objective_label": "optimized rotation under supplied priorities and constraints",
    }
