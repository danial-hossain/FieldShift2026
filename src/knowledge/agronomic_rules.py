"""Transparent compatibility checks based on crop metadata and field context."""

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Optional, Union

import numpy as np
import pandas as pd

from src.data.crops import CROP_COLUMNS, load_crop_knowledge
from src.data.field_history import (
    FIELD_HISTORY_COLUMNS,
    load_field_history,
    normalize_field_history,
)

LEGUME_INTERVAL_SEASONS = 3
RULE_STATUSES = ("compatible", "incompatible", "unknown")
RULE_ORDER = (
    "temperature",
    "ph",
    "water",
    "family_rotation",
    "legume_rotation",
)
OVERALL_RULES = RULE_ORDER
HISTORY_SOURCE_STATUSES = {
    "observed": "observed",
    "synthetic": "synthetic",
    "demo": "synthetic",
    "missing": "unknown",
}


@dataclass(frozen=True)
class AgronomicRuleConfig:
    """Configurable rule assumptions, not universal agronomic prescriptions."""

    legume_interval_seasons: int = LEGUME_INTERVAL_SEASONS

    def __post_init__(self) -> None:
        if (
            isinstance(self.legume_interval_seasons, bool)
            or not isinstance(self.legume_interval_seasons, int)
            or self.legume_interval_seasons < 1
        ):
            raise ValueError("legume_interval_seasons must be a positive integer.")


def _number(value: Any) -> Optional[float]:
    if value is None or value is pd.NA:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if not np.isfinite(result) or result == -999:
        return None
    return result


def _metadata(crop: Union[Mapping[str, Any], pd.Series]) -> dict[str, Any]:
    if isinstance(crop, pd.Series):
        values = crop.to_dict()
    elif isinstance(crop, Mapping):
        values = dict(crop)
    else:
        raise TypeError("crop must be a crop metadata mapping or pandas Series.")
    missing = [column for column in CROP_COLUMNS if column not in values]
    if missing:
        raise ValueError("Crop metadata is missing fields: " + ", ".join(missing))
    if not isinstance(values["crop"], str) or not values["crop"].strip():
        raise ValueError("crop metadata requires a non-empty crop name.")
    return values


def _rule(status: str, reason: str, provenance: Mapping[str, Any]) -> dict[str, Any]:
    if status not in RULE_STATUSES:
        raise ValueError(f"Invalid agronomic rule status: {status}")
    return {
        "status": status,
        "reason": reason,
        "provenance": dict(provenance),
    }


def _source_provenance(field_state, input_name: str) -> dict[str, Any]:
    status_key = {
        "temperature": "environment",
        "ph": "soil",
        "soil_moisture": "soil_moisture",
        "rainfall": "environment",
        "previous_crop_family": "history",
        "field_history": "history",
    }[input_name]
    source_name = {
        "temperature": "environment_source",
        "ph": "soil_source",
        "soil_moisture": "soil_moisture_source",
        "rainfall": "environment_source",
        "previous_crop_family": "history_source",
        "field_history": "history_source",
    }[input_name]
    statuses = getattr(field_state, "data_status", {}) or {}
    return {
        "input": input_name,
        "source": getattr(field_state, source_name, "missing"),
        "data_status": statuses.get(status_key, "missing"),
    }


def _crop_provenance(crop: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "input": "crop_knowledge",
        "source": crop.get("source", "unknown"),
        "data_status": crop.get("data_status", "unknown"),
    }


def _temperature_rule(crop: Mapping[str, Any], field_state) -> dict[str, Any]:
    provenance = {
        "field": _source_provenance(field_state, "temperature"),
        "crop": _crop_provenance(crop),
    }
    value = _number(getattr(field_state, "temperature", None))
    low = _number(crop.get("min_temperature"))
    high = _number(crop.get("max_temperature"))
    if value is None:
        return _rule("unknown", "Field temperature is unavailable.", provenance)
    if low is None or high is None or low > high:
        return _rule("unknown", "Crop temperature range is unavailable or invalid.", provenance)
    if value < low or value > high:
        return _rule(
            "incompatible",
            f"Field temperature {value:g}°C is outside the crop range {low:g}–{high:g}°C.",
            provenance,
        )
    return _rule(
        "compatible",
        f"Field temperature {value:g}°C is within the crop range {low:g}–{high:g}°C.",
        provenance,
    )


def _ph_rule(crop: Mapping[str, Any], field_state) -> dict[str, Any]:
    provenance = {
        "field": _source_provenance(field_state, "ph"),
        "crop": _crop_provenance(crop),
    }
    value = _number(getattr(field_state, "ph", None))
    low = _number(crop.get("min_ph"))
    high = _number(crop.get("max_ph"))
    if value is None:
        return _rule("unknown", "Soil pH is unavailable.", provenance)
    if low is None or high is None or low > high:
        return _rule("unknown", "Crop pH range is unavailable or invalid.", provenance)
    if value < low or value > high:
        return _rule(
            "incompatible",
            f"Soil pH {value:g} is outside the crop range {low:g}–{high:g}.",
            provenance,
        )
    return _rule(
        "compatible",
        f"Soil pH {value:g} is within the crop range {low:g}–{high:g}.",
        provenance,
    )


def _water_rule(
    crop: Mapping[str, Any], field_state, features: Optional[Mapping[str, Any]]
) -> dict[str, Any]:
    features = features or {}
    provenance = {
        "crop": _crop_provenance(crop),
        "field_inputs": [
            _source_provenance(field_state, "soil_moisture"),
            _source_provenance(field_state, "rainfall"),
        ],
    }
    required = _number(crop.get("water_requirement"))
    available = _number(features.get("available_water_mm"))
    if required is None:
        return _rule("unknown", "Crop seasonal water requirement is unavailable.", provenance)
    if available is not None:
        provenance["available_water_source"] = features.get(
            "available_water_source", "caller_supplied"
        )
        if available < 0:
            return _rule(
                "unknown",
                "Available seasonal water cannot be negative.",
                provenance,
            )
        if available < required:
            return _rule(
                "incompatible",
                f"Available seasonal water {available:g} mm is below crop requirement {required:g} mm.",
                provenance,
            )
        return _rule(
            "compatible",
            f"Available seasonal water {available:g} mm meets crop requirement {required:g} mm.",
            provenance,
        )

    moisture = _number(getattr(field_state, "soil_moisture", None))
    rainfall = _number(getattr(field_state, "rainfall", None))
    stress = features.get("water_stress_indicator")
    context = []
    if moisture is not None:
        context.append(f"soil moisture is {moisture:g} m³/m³")
    if rainfall is not None:
        context.append(f"observed daily rainfall is {rainfall:g} mm")
    if stress is not None and _number(stress) is not None:
        context.append(f"water_stress_indicator is {int(_number(stress))}")
    observed_context = "; ".join(context) if context else "water observations are unavailable"
    return _rule(
        "unknown",
        "Seasonal water availability cannot be compared with the crop requirement "
        f"({required:g} mm); {observed_context} is insufficient to establish seasonal supply.",
        provenance,
    )


def _family_rotation_rule(crop: Mapping[str, Any], field_state) -> dict[str, Any]:
    provenance = {
        "candidate_crop": _crop_provenance(crop),
        "previous_crop": _source_provenance(field_state, "previous_crop_family"),
    }
    previous_family = getattr(field_state, "previous_crop_family", None)
    candidate_family = crop.get("family")
    candidate_crop_name = str(crop.get("crop", "")).strip().lower()
    if candidate_crop_name == "fallow" or str(candidate_family).strip().lower() in ("none", "fallow", "neutral"):
        return _rule("compatible", "Fallow is always compatible with crop rotation.", provenance)
    if not isinstance(previous_family, str) or not previous_family.strip() or previous_family.strip().lower() in ("none", "fallow", "neutral"):
        return _rule("unknown", "Previous crop family is unavailable or fallow.", provenance)
    if not isinstance(previous_family, str) or not previous_family.strip():
        return _rule(
            "unknown",
            "Previous crop family is unavailable.",
            provenance,
        )
    if not isinstance(candidate_family, str) or not candidate_family.strip():
        return _rule("unknown", "Candidate crop family is unavailable.", provenance)
    if previous_family.strip().casefold() == candidate_family.strip().casefold():
        return _rule(
            "incompatible",
            "Candidate crop family matches the previous crop family.",
            provenance,
        )
    return _rule(
        "compatible",
        "Candidate crop family differs from the previous crop family.",
        provenance,
    )


def _history_frame(
    history: Optional[Union[pd.DataFrame, str, Path]],
    field_state,
) -> pd.DataFrame:
    field_id = getattr(field_state, "field_id", None)
    as_of_date = pd.Timestamp(getattr(field_state, "as_of_date", pd.NaT))
    if pd.isna(as_of_date):
        raise ValueError("field_state must provide a valid as_of_date.")
    decision_date = as_of_date.normalize()
    if history is None:
        if not field_id:
            return pd.DataFrame(columns=FIELD_HISTORY_COLUMNS)
        frame = load_field_history(field_id=str(field_id))
    elif isinstance(history, pd.DataFrame):
        frame = normalize_field_history(history)
    elif isinstance(history, (str, Path)):
        frame = load_field_history(csv_path=history, field_id=str(field_id))
    else:
        raise TypeError("field_history must be a DataFrame, CSV path, or None.")

    if not field_id:
        return pd.DataFrame(columns=FIELD_HISTORY_COLUMNS)
    return frame.loc[
        frame["field_id"].astype(str).eq(str(field_id))
        & frame["year"].lt(decision_date.year)
    ].reset_index(drop=True)


def _legume_rotation_rule(
    crop: Mapping[str, Any],
    field_state,
    history: Optional[Union[pd.DataFrame, str, Path]],
    crop_catalog: Optional[pd.DataFrame],
    config: AgronomicRuleConfig,
) -> dict[str, Any]:
    provenance = {
        "candidate_crop": _crop_provenance(crop),
        "history": _source_provenance(field_state, "field_history"),
        "crop_knowledge": {
            "source": "crop catalog",
            "data_status": "available" if crop_catalog is not None else "unknown",
        },
    }
    if not isinstance(crop.get("is_legume"), (bool, np.bool_)):
        return _rule("unknown", "Candidate legume status is unavailable.", provenance)
    if bool(crop["is_legume"]):
        return _rule(
            "compatible",
            "Candidate is a legume and satisfies the configured interval for this season.",
            provenance,
        )

    records = _history_frame(history, field_state)
    required_prior_seasons = config.legume_interval_seasons - 1
    if required_prior_seasons == 0:
        return _rule(
            "incompatible",
            "A non-legume candidate violates the configured one-season legume interval.",
            provenance,
        )
    if records.empty:
        return _rule(
            "unknown",
            "No eligible prior field-history seasons are available to check the legume interval.",
            provenance,
        )
    if crop_catalog is None:
        crop_catalog = load_crop_knowledge()
    catalog = crop_catalog.set_index(crop_catalog["crop"].astype(str).str.casefold())
    recent = records.tail(required_prior_seasons).iloc[::-1]
    known_non_legume_seasons = 0
    for _, record in recent.iterrows():
        previous_crop = str(record["crop"]).strip().casefold()
        if previous_crop not in catalog.index:
            return _rule(
                "unknown",
                f"Crop knowledge is unavailable for historical crop '{record['crop']}'.",
                provenance,
            )
        previous_is_legume = catalog.loc[previous_crop, "is_legume"]
        if not isinstance(previous_is_legume, (bool, np.bool_)):
            return _rule(
                "unknown",
                f"Legume status is unavailable for historical crop '{record['crop']}'.",
                provenance,
            )
        if bool(previous_is_legume):
            return _rule(
                "compatible",
                "A legume occurred within the configured recent-season interval.",
                provenance,
            )
        known_non_legume_seasons += 1

    if known_non_legume_seasons == required_prior_seasons:
        return _rule(
            "incompatible",
            "No legume occurred within the configured interval of "
            f"{config.legume_interval_seasons} seasons.",
            provenance,
        )
    return _rule(
        "unknown",
        "Insufficient eligible seasons are available to verify the configured legume interval.",
        provenance,
    )


def _overall_compatibility(rules: Mapping[str, Mapping[str, Any]]) -> tuple[str, str]:
    statuses = [rules[name]["status"] for name in OVERALL_RULES]
    if "incompatible" in statuses:
        failed = [name for name in OVERALL_RULES if rules[name]["status"] == "incompatible"]
        return "incompatible", "One or more explicit compatibility rules are violated: " + ", ".join(failed) + "."
    if all(status == "compatible" for status in statuses):
        return "compatible", "All evaluated compatibility rules are satisfied."
    return "unknown", "One or more required compatibility rules are unknown."


def evaluate_crop_compatibility(
    crop: Union[Mapping[str, Any], pd.Series],
    field_state,
    features: Optional[Mapping[str, Any]] = None,
    field_history: Optional[Union[pd.DataFrame, str, Path]] = None,
    crop_catalog: Optional[pd.DataFrame] = None,
    config: Optional[AgronomicRuleConfig] = None,
) -> dict[str, Any]:
    """Evaluate per-crop rules without scores, recommendations, or ranking.

    A seasonal water compatibility result is only conclusive when callers
    explicitly provide ``features['available_water_mm']`` in the same
    per-growing-season mm unit as crop knowledge. Daily rainfall and generic
    soil-moisture indicators alone do not establish seasonal water supply.
    """
    crop_data = _metadata(crop)
    if config is None:
        config = AgronomicRuleConfig()
    if crop_catalog is not None:
        missing = [column for column in CROP_COLUMNS if column not in crop_catalog]
        if missing:
            raise ValueError("Crop catalog is missing fields: " + ", ".join(missing))

    rules = {
        "temperature": _temperature_rule(crop_data, field_state),
        "ph": _ph_rule(crop_data, field_state),
        "water": _water_rule(crop_data, field_state, features),
        "family_rotation": _family_rotation_rule(crop_data, field_state),
        "legume_rotation": _legume_rotation_rule(
            crop_data, field_state, field_history, crop_catalog, config
        ),
    }
    overall, overall_reason = _overall_compatibility(rules)
    return {
        "crop": crop_data["crop"],
        "rules": rules,
        "overall_compatibility": overall,
        "overall_reason": overall_reason,
        "crop_context": {
            "family": crop_data["family"],
            "is_legume": crop_data["is_legume"],
            "duration_days": crop_data["duration_days"],
            "water_requirement": crop_data["water_requirement"],
            "nutrient_effect": crop_data["nutrient_effect"],
            "soil_impact": crop_data["soil_impact"],
            "nutrients": {
                name: getattr(field_state, name, float("nan"))
                for name in ("nitrogen", "phosphorus", "potassium")
            },
            "source": crop_data["source"],
            "data_status": crop_data["data_status"],
        },
    }


def evaluate_all_crops(
    crops: Optional[Union[pd.DataFrame, list[Mapping[str, Any]]]],
    field_state,
    features: Optional[Mapping[str, Any]] = None,
    field_history: Optional[Union[pd.DataFrame, str, Path]] = None,
    config: Optional[AgronomicRuleConfig] = None,
) -> list[dict[str, Any]]:
    """Evaluate each supplied crop independently, preserving source order."""
    if crops is None:
        crop_records = load_crop_knowledge()
    elif isinstance(crops, pd.DataFrame):
        crop_records = crops
    elif isinstance(crops, list):
        crop_records = pd.DataFrame(crops)
    else:
        raise TypeError("crops must be a DataFrame, a list of crop mappings, or None.")
    missing = [column for column in CROP_COLUMNS if column not in crop_records]
    if missing:
        raise ValueError("Crop catalog is missing fields: " + ", ".join(missing))

    results = []
    for _, crop in crop_records.iterrows():
        results.append(
            evaluate_crop_compatibility(
                crop,
                field_state,
                features=features,
                field_history=field_history,
                crop_catalog=crop_records,
                config=config,
            )
        )
    return results
