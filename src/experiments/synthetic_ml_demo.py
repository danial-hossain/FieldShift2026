"""Crop-conditioned synthetic-only ML demonstration for FieldShift.

This module intentionally does not claim real agronomic validity. It trains a
deterministic linear model on synthetic crop/season rules only and stores the
model artifact under ``models/ml_demo``. The output is for reproducible software
integration checks and research-boundary documentation, not for real-world crop
yield forecasting.
"""

from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import Any, Mapping, Optional, Union

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = PROJECT_ROOT / "models" / "ml_demo"
MODEL_PATH = MODEL_DIR / "synthetic_yield_demo_model.pkl"
METADATA_PATH = MODEL_DIR / "synthetic_yield_demo_model.json"
TARGET_NAME = "synthetic_yield_t_ha"
SYNTHETIC_CROP_LEVELS = (
    "Rice",
    "Boro Rice",
    "Aus Rice",
    "Wheat",
    "Maize",
    "Lentil",
    "Mungbean",
    "Mustard",
    "Potato",
    "Chickpea",
    "Soybean",
    "Sesame",
    "Groundnut",
    "Sunflower",
    "Tomato",
    "Jute",
)
CROP_FEATURE_COLUMNS = tuple(
    f"crop_is_{crop.lower()}" for crop in SYNTHETIC_CROP_LEVELS
)
BASE_FEATURE_COLUMNS = (
    "temperature",
    "rainfall",
    "soil_moisture",
    "nitrogen",
    "phosphorus",
    "potassium",
    "ph",
    "organic_matter",
    "previous_yield",
    "available_water_mm",
    "temperature_range",
    "heat_stress_indicator",
    "water_stress_indicator",
)
FEATURE_COLUMNS = (*BASE_FEATURE_COLUMNS, "season_is_wet", *CROP_FEATURE_COLUMNS)


def _safe_float(value: Any, default: float = float("nan")) -> float:
    if value is None or value is pd.NA:
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if not np.isfinite(number) or number == -999:
        return default
    return number


def generate_synthetic_yield_dataset(
    *,
    n_samples: int = 512,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate a crop- and season-conditioned synthetic benchmark dataset."""
    if isinstance(n_samples, bool) or not isinstance(n_samples, int) or n_samples < 10:
        raise ValueError("n_samples must be an integer >= 10.")
    from src.data.crops import load_crop_knowledge

    crop_frame = load_crop_knowledge()
    crop_yields = {
        str(row["crop"]): float(row["expected_yield"])
        for _, row in crop_frame.iterrows()
        if str(row["crop"]) in SYNTHETIC_CROP_LEVELS
        and pd.notna(row["expected_yield"])
    }
    missing_crops = set(SYNTHETIC_CROP_LEVELS) - set(crop_yields)
    if missing_crops:
        raise ValueError(
            "Crop catalog is missing synthetic yield baselines: "
            + ", ".join(sorted(missing_crops))
        )
    rng = np.random.default_rng(seed)
    rows = []
    for _ in range(n_samples):
        crop = str(rng.choice(SYNTHETIC_CROP_LEVELS))
        season_is_wet = int(rng.integers(0, 2))
        temperature = float(rng.uniform(18.0, 34.0))
        rainfall = float(rng.uniform(200.0, 1400.0))
        soil_moisture = float(rng.uniform(0.12, 0.50))
        nitrogen = float(rng.uniform(15.0, 110.0))
        phosphorus = float(rng.uniform(5.0, 60.0))
        potassium = float(rng.uniform(25.0, 180.0))
        ph = float(rng.uniform(5.2, 7.8))
        organic_matter = float(rng.uniform(1.0, 6.0))
        previous_yield = float(rng.uniform(1.5, 7.5))
        available_water_mm = float(rng.uniform(350.0, 1800.0))
        temperature_range = float(rng.uniform(3.0, 18.0))
        heat_stress_indicator = 1.0 if temperature > 30.0 else 0.0
        water_stress_indicator = 1.0 if soil_moisture < 0.25 else 0.0
        environment_adjustment = (
            0.0008 * (available_water_mm - 1075.0)
            + 0.8 * (soil_moisture - 0.31)
            + 0.008 * (nitrogen - 62.5)
            + 0.004 * (previous_yield - 4.5)
            + 0.025 * (organic_matter - 3.5)
            - 0.04 * max(0.0, temperature - 30.0)
            - 0.35 * water_stress_indicator
            - 0.08 * max(0.0, 7.5 - ph)
            + 0.08 * season_is_wet
        )
        row = {
            "temperature": temperature,
            "rainfall": rainfall,
            "soil_moisture": soil_moisture,
            "nitrogen": nitrogen,
            "phosphorus": phosphorus,
            "potassium": potassium,
            "ph": ph,
            "organic_matter": organic_matter,
            "previous_yield": previous_yield,
            "available_water_mm": available_water_mm,
            "temperature_range": temperature_range,
            "heat_stress_indicator": heat_stress_indicator,
            "water_stress_indicator": water_stress_indicator,
            "season_is_wet": season_is_wet,
            TARGET_NAME: float(max(0.05, crop_yields[crop] + environment_adjustment)),
        }
        row.update({
            feature: float(crop == crop_name)
            for feature, crop_name in zip(CROP_FEATURE_COLUMNS, SYNTHETIC_CROP_LEVELS)
        })
        rows.append(row)
    return pd.DataFrame(rows, columns=[*FEATURE_COLUMNS, TARGET_NAME])


def _fit_standardizer(values: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    mean = values.mean(axis=0)
    std = values.std(axis=0)
    std[std == 0] = 1.0
    return mean, std


def train_synthetic_yield_model(
    *,
    dataset: Optional[pd.DataFrame] = None,
    seed: int = 42,
    output_dir: Optional[Path] = None,
) -> dict[str, Any]:
    """Train a small synthetic-only yield model and persist its artifact."""
    generated_dataset = dataset is None
    if dataset is None:
        dataset = generate_synthetic_yield_dataset(seed=seed)
    frame = dataset.copy()
    missing = [column for column in [*FEATURE_COLUMNS, TARGET_NAME] if column not in frame.columns]
    if missing:
        raise ValueError("Dataset is missing required synthetic-model columns: " + ", ".join(missing))

    rng = np.random.default_rng(seed)
    index = np.arange(len(frame))
    rng.shuffle(index)
    train_count = max(1, int(len(frame) * 0.8))
    train_idx = index[:train_count]
    test_idx = index[train_count:]

    X_train = frame.iloc[train_idx][list(FEATURE_COLUMNS)].to_numpy(dtype=float)
    X_test = frame.iloc[test_idx][list(FEATURE_COLUMNS)].to_numpy(dtype=float)
    y_train = frame.iloc[train_idx][TARGET_NAME].to_numpy(dtype=float)
    y_test = frame.iloc[test_idx][TARGET_NAME].to_numpy(dtype=float)

    mean, std = _fit_standardizer(X_train)
    X_train_scaled = (X_train - mean) / std
    X_test_scaled = (X_test - mean) / std

    lhs = np.column_stack([np.ones(len(X_train_scaled)), X_train_scaled])
    weights, _, _, _ = np.linalg.lstsq(lhs, y_train, rcond=None)
    intercept = float(weights[0])
    coefficients = weights[1:]

    train_predictions = intercept + X_train_scaled @ coefficients
    test_predictions = intercept + X_test_scaled @ coefficients

    def _mae(actual: np.ndarray, predicted: np.ndarray) -> float:
        return float(np.mean(np.abs(actual - predicted)))

    def _rmse(actual: np.ndarray, predicted: np.ndarray) -> float:
        return float(np.sqrt(np.mean((actual - predicted) ** 2)))

    def _r2(actual: np.ndarray, predicted: np.ndarray) -> float:
        residual = np.sum((actual - predicted) ** 2)
        total = np.sum((actual - actual.mean()) ** 2)
        if total == 0.0:
            return 0.0
        return float(1.0 - residual / total)

    model = {
        "model_name": "synthetic_yield_demo_model",
        "model_version": 2,
        "model_kind": "linear_regression",
        "feature_names": list(FEATURE_COLUMNS),
        "target_name": TARGET_NAME,
        "seed": int(seed),
        "dataset_seed": int(seed) if generated_dataset else None,
        "dataset_rows": int(len(frame)),
        "feature_count": len(FEATURE_COLUMNS),
        "train_rows": int(len(train_idx)),
        "test_rows": int(len(test_idx)),
        "evaluation_protocol": (
            "Seeded random 80/20 holdout; normalization fitted on training rows only."
        ),
        "cross_validation": "not performed",
        "intercept": float(intercept),
        "coefficients": coefficients.astype(float).tolist(),
        "normalization_mean": mean.astype(float).tolist(),
        "normalization_std": std.astype(float).tolist(),
        "data_boundary": "synthetic_demo_only",
        "generation_rule": "Synthetic crop-catalog baselines plus explicit environmental and season rules; not field-validated agronomic evidence.",
        "metrics": {
            "train_mae_t_ha": _mae(y_train, train_predictions),
            "test_mae_t_ha": _mae(y_test, test_predictions),
            "train_rmse_t_ha": _rmse(y_train, train_predictions),
            "test_rmse_t_ha": _rmse(y_test, test_predictions),
            "train_r2": _r2(y_train, train_predictions),
            "test_r2": _r2(y_test, test_predictions),
        },
        "feature_provenance": {
            "temperature": "synthetic demo feature",
            "rainfall": "synthetic demo feature",
            "soil_moisture": "synthetic demo feature",
            "nitrogen": "synthetic demo feature",
            "phosphorus": "synthetic demo feature",
            "potassium": "synthetic demo feature",
            "ph": "synthetic demo feature",
            "organic_matter": "synthetic demo feature",
            "previous_yield": "synthetic demo feature",
            "available_water_mm": "synthetic demo feature",
            "temperature_range": "synthetic demo feature",
            "heat_stress_indicator": "synthetic demo feature",
            "water_stress_indicator": "synthetic demo feature",
            "season_is_wet": "synthetic dry/wet season indicator",
            **{
                feature: "synthetic crop identity derived from the crop catalog"
                for feature in CROP_FEATURE_COLUMNS
            },
        },
    }

    target_dir = Path(output_dir) if output_dir is not None else MODEL_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    with (target_dir / MODEL_PATH.name).open("wb") as handle:
        pickle.dump(model, handle)
    (target_dir / METADATA_PATH.name).write_text(
        json.dumps(
            {
                "model_name": model["model_name"],
                "model_version": model["model_version"],
                "model_kind": model["model_kind"],
                "feature_names": model["feature_names"],
                "target_name": model["target_name"],
                "seed": model["seed"],
                "dataset_seed": model["dataset_seed"],
                "dataset_rows": model["dataset_rows"],
                "feature_count": model["feature_count"],
                "train_rows": model["train_rows"],
                "test_rows": model["test_rows"],
                "evaluation_protocol": model["evaluation_protocol"],
                "cross_validation": model["cross_validation"],
                "metrics": model["metrics"],
                "data_boundary": model["data_boundary"],
                "generation_rule": model["generation_rule"],
                "artifact_path": str((target_dir / MODEL_PATH.name).resolve()),
                "metadata_path": str((target_dir / METADATA_PATH.name).resolve()),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return model


def load_synthetic_yield_model(path: Optional[Union[str, Path]] = None) -> dict[str, Any]:
    artifact_path = Path(path) if path is not None else MODEL_PATH
    if not artifact_path.exists():
        if path is not None and artifact_path != MODEL_PATH:
            raise FileNotFoundError(f"Synthetic model artifact not found: {artifact_path}")
        train_synthetic_yield_model(output_dir=MODEL_DIR)
    with artifact_path.open("rb") as handle:
        model = pickle.load(handle)
    if model.get("model_version") != 2 or model.get("feature_names") != list(FEATURE_COLUMNS):
        if path is not None and artifact_path.resolve() != MODEL_PATH.resolve():
            raise ValueError(
                "Synthetic model artifact uses an incompatible feature schema; retrain it before loading."
            )
        model = train_synthetic_yield_model(output_dir=MODEL_DIR)
    return model


def estimate_prediction_uncertainty(
    field_state: Any,
    *,
    prediction: Optional[float] = None,
    model: Optional[Mapping[str, Any]] = None,
) -> dict[str, Any]:
    """Return a simple synthetic benchmark uncertainty estimate.

    The bound is derived from the held-out RMSE of the synthetic model, not from
    any real-world field measurement error. This is an explicit software bound for
    the synthetic benchmark and does not claim real-world confidence.
    """
    if model is None:
        if not MODEL_PATH.exists():
            train_synthetic_yield_model(output_dir=MODEL_DIR)
        model = load_synthetic_yield_model(MODEL_PATH)

    metric_block = model.get("metrics", {}) or {}
    rmse = float(metric_block.get("test_rmse_t_ha", 0.0))
    if not np.isfinite(rmse) or rmse <= 0.0:
        raise ValueError(
            "Synthetic model must provide a positive held-out test RMSE for uncertainty reporting."
        )
    if prediction is None:
        prediction = predict_synthetic_yield(field_state, model=model)[
            "synthetic_demo_prediction"
        ]["predicted_value"]
    absolute = float(abs(prediction) * 0.05) if np.isfinite(prediction) else rmse
    uncertainty = max(rmse, absolute)
    return {
        "value_t_ha": uncertainty,
        "interval_t_ha": {
            "lower": float(prediction - uncertainty),
            "upper": float(prediction + uncertainty),
        },
        "units": "t/ha",
        "source": "synthetic benchmark held-out RMSE",
        "data_boundary": "synthetic_demo_only",
        "note": "Synthetic benchmark uncertainty estimate; not real-world prediction confidence.",
        "not_real_world_confidence": True,
    }


def _feature_map_from_field_state(
    field_state: Any,
    extra_features: Optional[Mapping[str, Any]] = None,
) -> dict[str, float]:
    if extra_features is None:
        extra_features = {}
    temperature = _safe_float(getattr(field_state, "temperature", np.nan))
    rainfall = _safe_float(getattr(field_state, "rainfall", np.nan))
    soil_moisture = _safe_float(getattr(field_state, "soil_moisture", np.nan))
    nitrogen = _safe_float(getattr(field_state, "nitrogen", np.nan))
    phosphorus = _safe_float(getattr(field_state, "phosphorus", np.nan))
    potassium = _safe_float(getattr(field_state, "potassium", np.nan))
    ph = _safe_float(getattr(field_state, "ph", np.nan))
    organic_matter = _safe_float(getattr(field_state, "organic_matter", np.nan))
    previous_yield = _safe_float(getattr(field_state, "previous_yield", np.nan))
    temp_max = _safe_float(getattr(field_state, "temp_max", np.nan))
    temp_min = _safe_float(getattr(field_state, "temp_min", np.nan))

    if not np.isfinite(temperature):
        temperature = 28.0
    if not np.isfinite(rainfall):
        rainfall = 900.0
    if not np.isfinite(soil_moisture):
        soil_moisture = 0.28
    if not np.isfinite(nitrogen):
        nitrogen = 55.0
    if not np.isfinite(phosphorus):
        phosphorus = 22.0
    if not np.isfinite(potassium):
        potassium = 80.0
    if not np.isfinite(ph):
        ph = 6.5
    if not np.isfinite(organic_matter):
        organic_matter = 2.5
    if not np.isfinite(previous_yield):
        previous_yield = 3.2

    available_water_mm = _safe_float(extra_features.get("available_water_mm"), default=np.nan)
    if not np.isfinite(available_water_mm):
        available_water_mm = rainfall * 0.35 if np.isfinite(rainfall) else 900.0
    temperature_range = _safe_float(
        extra_features.get(
            "temperature_range",
            temp_max - temp_min if np.isfinite(temp_max) and np.isfinite(temp_min) else max(temperature * 0.15, 6.0),
        )
    )
    if not np.isfinite(temperature_range):
        temperature_range = 8.0 if np.isfinite(temperature) else 8.0
    features = {
        "temperature": temperature,
        "rainfall": rainfall,
        "soil_moisture": soil_moisture,
        "nitrogen": nitrogen,
        "phosphorus": phosphorus,
        "potassium": potassium,
        "ph": ph,
        "organic_matter": organic_matter,
        "previous_yield": previous_yield,
        "available_water_mm": available_water_mm,
        "temperature_range": temperature_range,
        "heat_stress_indicator": 1.0 if temperature > 30.0 else 0.0,
        "water_stress_indicator": 1.0 if soil_moisture < 0.25 else 0.0,
        "season_is_wet": 0.0,
        **{feature: 0.0 for feature in CROP_FEATURE_COLUMNS},
    }
    for key, value in extra_features.items():
        if key in features:
            features[key] = _safe_float(value, default=features[key])
    crop = extra_features.get("crop")
    if crop is not None:
        crop_clean = str(crop).strip().lower()
        crop_key = f"crop_is_{crop_clean}"
        if crop_key not in CROP_FEATURE_COLUMNS:
            raise ValueError(f"Unsupported synthetic ML crop: {crop}")
        for feature in CROP_FEATURE_COLUMNS:
            features[feature] = float(feature == crop_key)
    season = str(extra_features.get("season_type", "")).strip().lower()
    if season:
        if season not in {"dry", "rabi", "wet", "kharif"}:
            raise ValueError("season_type must be dry/rabi or wet/kharif.")
        features["season_is_wet"] = float(season in {"wet", "kharif"})
    return features


def predict_synthetic_crop_yield(
    field_state: Any,
    *,
    crop: str,
    season_type: str,
    extra_features: Optional[Mapping[str, Any]] = None,
    model: Optional[Mapping[str, Any]] = None,
) -> dict[str, Any]:
    """Return a synthetic ML prediction conditioned on a selected crop and season."""
    features = dict(extra_features or {})
    features.update({"crop": crop, "season_type": season_type})
    return predict_synthetic_yield(
        field_state,
        extra_features=features,
        model=model,
    )


def predict_synthetic_yield(
    field_state: Any,
    *,
    extra_features: Optional[Mapping[str, Any]] = None,
    model: Optional[Mapping[str, Any]] = None,
) -> dict[str, Any]:
    """Predict a synthetic yield estimate for one field state.

    The estimate is intentionally labeled as synthetic-only and is not used to
    change real optimizer constraints, weights, or agronomic rules.
    """
    if model is None:
        if not MODEL_PATH.exists():
            train_synthetic_yield_model(output_dir=MODEL_DIR)
        model = load_synthetic_yield_model(MODEL_PATH)

    values = _feature_map_from_field_state(field_state, extra_features)
    ordered = [values[name] for name in model["feature_names"]]
    x = np.asarray(ordered, dtype=float)
    mean = np.asarray(model["normalization_mean"], dtype=float)
    std = np.asarray(model["normalization_std"], dtype=float)
    scaled = (x - mean) / std
    prediction = float(model["intercept"] + scaled.dot(np.asarray(model["coefficients"], dtype=float)))
    uncertainty = estimate_prediction_uncertainty(
        field_state,
        prediction=prediction,
        model=model,
    )
    context = {
        "field_id": getattr(field_state, "field_id", "unknown_field"),
        "as_of_date": getattr(field_state, "as_of_date", None).date().isoformat() if hasattr(getattr(field_state, "as_of_date", None), "date") else None,
        "synthetic_demo_prediction": {
            "target_name": TARGET_NAME,
            "predicted_value": prediction,
            "units": "t/ha",
            "source": "synthetic_yield_demo_model",
            "data_boundary": "synthetic_demo_only",
            "uncertainty_t_ha": uncertainty["value_t_ha"],
            "uncertainty_interval_t_ha": uncertainty["interval_t_ha"],
            "uncertainty_note": uncertainty["note"],
            "not_field_validated": True,
            "not_real_world_confidence": True,
        },
        "features_used": values,
        "planning_context": {
            "estimated_yield_t_ha": prediction,
            "estimate_source": "synthetic_yield_demo_model",
            "constraints_unmodified": True,
            "data_boundary": "synthetic_demo_only",
            "uncertainty_t_ha": uncertainty["value_t_ha"],
        },
    }
    return context


def integrate_prediction_into_field_state(field_state: Any, *, extra_features: Optional[Mapping[str, Any]] = None) -> dict[str, Any]:
    """Attach a synthetic-only prediction to a FieldState-style payload without mutating the core optimizer rules."""
    prediction = predict_synthetic_yield(field_state, extra_features=extra_features)
    state_payload = field_state.to_dict()
    state_payload["synthetic_ml_prediction"] = prediction["synthetic_demo_prediction"]
    state_payload["synthetic_ml_status"] = "synthetic_demo_only"
    state_payload["planning_context"] = prediction["planning_context"]
    state_payload["uncertainty_metadata"] = {
        "uncertainty_t_ha": prediction["synthetic_demo_prediction"]["uncertainty_t_ha"],
        "uncertainty_note": prediction["synthetic_demo_prediction"]["uncertainty_note"],
        "data_boundary": "synthetic_demo_only",
    }
    return state_payload


def _demo_field_state() -> Any:
    import pandas as pd

    from src.data.crops import load_crop_knowledge
    from src.data.field_history import load_field_history
    from src.data.smap import load_smap_data
    from src.data.soil import load_soil_data
    from src.state.field_state import build_field_state

    power = pd.read_csv(PROJECT_ROOT / "data" / "nasa_power" / "nasa_power_lat23.8103_lon90.4125_20260831_20260929.csv")
    smap = load_smap_data(23.8103, 90.4125, "2026-09-25", "2026-09-29")
    soil = load_soil_data()
    history = load_field_history()
    crops = load_crop_knowledge()
    return build_field_state(
        "field_demo",
        23.8103,
        90.4125,
        "2026-09-29",
        power,
        smap_data=smap,
        soil_data=soil,
        field_history_data=history,
        crop_knowledge=crops,
    )


def main() -> int:
    state = _demo_field_state()
    model = train_synthetic_yield_model(output_dir=MODEL_DIR)
    prediction = predict_synthetic_yield(state, model=model)
    integrated = integrate_prediction_into_field_state(state)
    summary = {
        "model_name": model["model_name"],
        "data_boundary": model["data_boundary"],
        "metrics": model["metrics"],
        "field_id": state.field_id,
        "as_of_date": state.as_of_date.date().isoformat(),
        "predicted_yield_t_ha": prediction["synthetic_demo_prediction"]["predicted_value"],
        "planning_context": prediction["planning_context"],
        "model_path": str(MODEL_PATH.resolve()),
        "metadata_path": str(METADATA_PATH.resolve()),
        "field_state_prediction_included": bool(integrated.get("synthetic_ml_prediction")),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
