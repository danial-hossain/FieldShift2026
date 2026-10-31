"""Normalize and load SMAP soil-moisture observations from CSV.

This prototype does not connect to a NASA SMAP service. Real observations can
be loaded from a CSV with the normalized columns below; the bundled fallback
is explicitly labelled demo/synthetic and is never represented as NASA data.
Soil moisture is represented as volumetric fraction (m³/m³).
"""

from pathlib import Path
from typing import Optional, Union

import numpy as np
import pandas as pd

SMAP_COLUMNS = [
    "date",
    "latitude",
    "longitude",
    "soil_moisture",
    "source",
    "data_status",
]
DEFAULT_SMAP_CSV = Path(__file__).resolve().parents[2] / "data" / "smap" / "demo_smap.csv"
MISSING_VALUES = {"", "nan", "na", "null", "none"}


def _validate_coordinates(latitude: float, longitude: float) -> tuple[float, float]:
    try:
        lat = float(latitude)
    except (TypeError, ValueError) as error:
        raise ValueError("latitude must be a number between -90 and 90.") from error
    try:
        lon = float(longitude)
    except (TypeError, ValueError) as error:
        raise ValueError("longitude must be a number between -180 and 180.") from error
    if not np.isfinite(lat) or not -90 <= lat <= 90:
        raise ValueError("latitude must be between -90 and 90.")
    if not np.isfinite(lon) or not -180 <= lon <= 180:
        raise ValueError("longitude must be between -180 and 180.")
    return lat, lon


def _parse_date(value, name: str) -> pd.Timestamp:
    try:
        result = pd.Timestamp(value).normalize()
    except (TypeError, ValueError, OverflowError) as error:
        raise ValueError(f"{name} must be a valid date.") from error
    if pd.isna(result):
        raise ValueError(f"{name} must be a valid date.")
    return result


def _numeric_column(values: pd.Series, name: str) -> pd.Series:
    text = values.astype("string").str.strip()
    missing = text.str.lower().isin(MISSING_VALUES) | text.isna()
    numeric = pd.to_numeric(values, errors="coerce")
    invalid = ~missing & numeric.isna()
    if invalid.any():
        raise ValueError(f"{name} must contain numeric values or blanks.")
    return numeric.astype(float)


def normalize_smap_observations(observations: pd.DataFrame) -> pd.DataFrame:
    """Validate provenance and return the stable normalized SMAP schema."""
    missing = [column for column in SMAP_COLUMNS if column not in observations]
    if missing:
        raise ValueError("SMAP data is missing required columns: " + ", ".join(missing))

    data = observations[SMAP_COLUMNS].copy()
    data["date"] = pd.to_datetime(data["date"], errors="coerce").dt.normalize()
    if data["date"].isna().any():
        raise ValueError("SMAP date values must be valid dates.")
    for column, lower, upper in (
        ("latitude", -90, 90),
        ("longitude", -180, 180),
    ):
        data[column] = _numeric_column(data[column], column)
        if data[column].isna().any():
            raise ValueError(f"SMAP {column} is required for each observation.")
        if (data[column].notna() & ~data[column].between(lower, upper)).any():
            raise ValueError(f"SMAP {column} values must be between {lower} and {upper}.")

    data["soil_moisture"] = _numeric_column(data["soil_moisture"], "soil_moisture")
    data["source"] = data["source"].astype("string").str.strip()
    data["data_status"] = data["data_status"].astype("string").str.strip().str.lower()
    if data["source"].isna().any() or data["source"].eq("").any():
        raise ValueError("SMAP source must be provided for every record.")
    allowed_statuses = {"observed", "synthetic", "demo", "missing"}
    invalid_status = ~data["data_status"].isin(allowed_statuses)
    if invalid_status.any():
        raise ValueError(
            "SMAP data_status must be observed, synthetic, demo, or missing."
        )
    missing_measurement = data["soil_moisture"].isna()
    data.loc[missing_measurement, "data_status"] = "missing"
    return data[SMAP_COLUMNS].sort_values("date").reset_index(drop=True)


def load_smap_data(
    latitude: float,
    longitude: float,
    start_date,
    end_date,
    csv_path: Optional[Union[str, Path]] = None,
    coordinate_tolerance: float = 0.0001,
) -> pd.DataFrame:
    """Load CSV SMAP observations for a point and date interval.

    The default CSV is a clearly labelled demo fallback. Pass a different CSV
    containing ``SMAP_COLUMNS`` to load documented observations. If no records
    match, one explicit missing row is returned for the requested start date;
    its soil moisture is ``NaN`` and its provenance is ``missing``.
    """
    lat, lon = _validate_coordinates(latitude, longitude)
    start = _parse_date(start_date, "start_date")
    end = _parse_date(end_date, "end_date")
    if start > end:
        raise ValueError("start_date must be on or before end_date.")
    if not np.isfinite(coordinate_tolerance) or coordinate_tolerance < 0:
        raise ValueError("coordinate_tolerance must be a non-negative number.")

    path = Path(csv_path) if csv_path is not None else DEFAULT_SMAP_CSV
    if not path.is_file():
        raise FileNotFoundError(f"SMAP CSV file was not found: {path}")
    try:
        raw = pd.read_csv(path, keep_default_na=False)
    except (OSError, pd.errors.ParserError) as error:
        raise ValueError(f"Could not read SMAP CSV '{path}': {error}") from error
    observations = normalize_smap_observations(raw)

    matches = observations.loc[
        observations["date"].between(start, end)
        & (observations["latitude"] - lat).abs().le(coordinate_tolerance)
        & (observations["longitude"] - lon).abs().le(coordinate_tolerance)
    ]
    if matches.empty and csv_path is None:
        real_smap_path = Path(__file__).resolve().parents[2] / "data" / "smap" / "smap_l4_monthly_4fields.csv"
        if real_smap_path.is_file():
            try:
                real_raw = pd.read_csv(real_smap_path, keep_default_na=False)
                real_obs = normalize_smap_observations(real_raw)
                real_matches = real_obs.loc[
                    real_obs["date"].between(start, end)
                    & (real_obs["latitude"] - lat).abs().le(max(coordinate_tolerance, 0.5))
                    & (real_obs["longitude"] - lon).abs().le(max(coordinate_tolerance, 0.5))
                ]
                if not real_matches.empty:
                    return real_matches.reset_index(drop=True)[SMAP_COLUMNS]
            except Exception:
                pass

    if matches.empty:
        return pd.DataFrame(
            [[start, lat, lon, np.nan, "missing", "missing"]],
            columns=SMAP_COLUMNS,
        )
    return matches.reset_index(drop=True)[SMAP_COLUMNS]
