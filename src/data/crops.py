"""Structured crop knowledge with explicit source/status and stable field order."""

from pathlib import Path
from typing import Optional, Union

import numpy as np
import pandas as pd

CROP_COLUMNS = [
    "crop",
    "family",
    "is_legume",
    "water_requirement",
    "duration_days",
    "min_temperature",
    "max_temperature",
    "min_ph",
    "max_ph",
    "expected_yield",
    "production_cost",
    "market_price",
    "nutrient_effect",
    "soil_impact",
    "source",
    "data_status",
    "allowed_seasons",
]
DEFAULT_CROPS_CSV = (
    Path(__file__).resolve().parents[2] / "data" / "crops" / "crop_knowledge.csv"
)
REQUIRED_CROPS = (
    "Rice",
    "Wheat",
    "Maize",
    "Lentil",
    "Mungbean",
    "Mustard",
    "Potato",
)
NUMERIC_COLUMNS = [
    "water_requirement",
    "duration_days",
    "min_temperature",
    "max_temperature",
    "min_ph",
    "max_ph",
    "expected_yield",
    "production_cost",
    "market_price",
]


def _parse_boolean(value) -> bool:
    if isinstance(value, (bool, np.bool_)):
        return bool(value)
    text = str(value).strip().lower()
    if text in {"true", "1", "yes"}:
        return True
    if text in {"false", "0", "no"}:
        return False
    raise ValueError("is_legume must be a boolean value.")


def validate_crop_knowledge(records: pd.DataFrame) -> pd.DataFrame:
    """Validate crop entries, units, required names, and deterministic schema."""
    records = records.copy()
    if "allowed_seasons" not in records.columns:
        records["allowed_seasons"] = "rabi|kharif"
    else:
        records["allowed_seasons"] = records["allowed_seasons"].replace("", "rabi|kharif").fillna("rabi|kharif")
    missing = [column for column in CROP_COLUMNS if column not in records]
    if missing:
        raise ValueError("Crop data is missing required columns: " + ", ".join(missing))

    data = records[CROP_COLUMNS].copy()
    for column in ("crop", "family", "nutrient_effect", "soil_impact", "source", "data_status", "allowed_seasons"):
        data[column] = data[column].astype("string").str.strip()
        if data[column].isna().any() or data[column].eq("").any():
            raise ValueError(f"Crop {column} must be provided for every record.")
    if data["crop"].duplicated().any():
        raise ValueError("Crop names must be unique.")

    try:
        data["is_legume"] = data["is_legume"].map(_parse_boolean).astype(bool)
    except ValueError as error:
        raise ValueError(str(error)) from error
    for column in NUMERIC_COLUMNS:
        text = data[column].astype("string").str.strip()
        missing_value = text.isna() | text.str.lower().isin(
            {"", "nan", "na", "null", "none"}
        )
        numeric = pd.to_numeric(data[column], errors="coerce")
        if ((~missing_value) & numeric.isna()).any():
            raise ValueError(f"Crop {column} must be numeric or blank.")
        data[column] = numeric.astype(float)

    if data["duration_days"].isna().any() or (data["duration_days"] < 0).any():
        raise ValueError("Crop duration_days cannot be negative.")
    if (data["duration_days"] % 1 != 0).any():
        raise ValueError("Crop duration_days must be a whole number of days.")
    for column in ("min_temperature", "max_temperature", "min_ph", "max_ph"):
        if data[column].isna().any():
            raise ValueError(f"Crop {column} is required.")
    invalid_temperature = data["min_temperature"] > data["max_temperature"]
    invalid_ph = data["min_ph"] > data["max_ph"]
    if invalid_temperature.any():
        raise ValueError("Crop min_temperature must not exceed max_temperature.")
    if invalid_ph.any():
        raise ValueError("Crop min_ph must not exceed max_ph.")
    if data["water_requirement"].isna().any() or (
        data["water_requirement"] < 0
    ).any():
        raise ValueError("Crop water_requirement must be a non-negative value in mm.")
    for column in ("expected_yield", "production_cost", "market_price"):
        if (data[column].dropna() < 0).any():
            raise ValueError(f"Crop {column} cannot be negative.")

    absent = [crop for crop in REQUIRED_CROPS if crop not in set(data["crop"])]
    if absent:
        raise ValueError("Crop data is missing required crops: " + ", ".join(absent))
    return data[CROP_COLUMNS].reset_index(drop=True)


def load_crop_knowledge(
    csv_path: Optional[Union[str, Path]] = None,
) -> pd.DataFrame:
    """Load validated crop metadata from the bundled or supplied CSV.

    Water requirement is mm per growing season, expected yield is t/ha,
    production_cost is illustrative BDT/ha, and market_price is illustrative
    BDT/t. Bundled estimates are demo values, not sourced statistics.
    """
    path = Path(csv_path) if csv_path is not None else DEFAULT_CROPS_CSV
    if not path.is_file():
        raise FileNotFoundError(f"Crop knowledge CSV was not found: {path}")
    try:
        records = pd.read_csv(path, keep_default_na=False)

        if "allowed_seasons" not in records.columns:

            records["allowed_seasons"] = "rabi|kharif"
        if "allowed_seasons" not in records.columns:
            records["allowed_seasons"] = "rabi|kharif"
    except (OSError, pd.errors.ParserError) as error:
        raise ValueError(f"Could not read crop knowledge CSV '{path}': {error}") from error
    return validate_crop_knowledge(records)


def get_crop(
    crop_name: str,
    csv_path: Optional[Union[str, Path]] = None,
) -> pd.Series:
    """Return one crop record by its exact crop name."""
    crops = load_crop_knowledge(csv_path)
    matches = crops.loc[crops["crop"].str.casefold() == crop_name.casefold()]
    if matches.empty:
        raise ValueError(f"Unknown crop: {crop_name}")
    return matches.iloc[0]
