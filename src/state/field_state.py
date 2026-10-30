"""Build a date-specific, provenance-aware representation of one field."""

from dataclasses import dataclass, field, fields
from datetime import date, datetime
from pathlib import Path
from typing import Any, Mapping, Optional, Union

import numpy as np
import pandas as pd

from src.data.crops import CROP_COLUMNS, load_crop_knowledge
from src.data.field_history import FIELD_HISTORY_COLUMNS, load_field_history
from src.data.smap import SMAP_COLUMNS, load_smap_data
from src.data.soil import SOIL_COLUMNS, load_soil_data

NASA_POWER_COLUMNS = [
    "date",
    "temperature",
    "temp_max",
    "temp_min",
    "rainfall",
    "humidity",
    "wind_speed",
    "solar_radiation",
]
STATUS_NAMES = ("observed", "synthetic", "demo", "missing")
STATE_STATUS_KEYS = (
    "environment",
    "soil_moisture",
    "soil",
    "crop",
    "history",
)
DateInput = Union[str, date, datetime, pd.Timestamp]
FrameInput = Optional[Union[pd.DataFrame, str, Path]]


def _date_value(value: DateInput, name: str) -> pd.Timestamp:
    try:
        result = pd.Timestamp(value).normalize()
    except (TypeError, ValueError, OverflowError) as error:
        raise ValueError(f"{name} must be a valid date.") from error
    if pd.isna(result):
        raise ValueError(f"{name} must be a valid date.")
    return result


def _optional_number(value: Any, name: str) -> float:
    if value is None or value is pd.NA or pd.isna(value):
        return float("nan")
    try:
        result = float(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"{name} must be numeric or missing.") from error
    if not np.isfinite(result) or result == -999:
        return float("nan")
    return result


def _optional_text(value: Any) -> Optional[str]:
    if value is None or value is pd.NA or pd.isna(value):
        return None
    text = str(value).strip()
    return text or None


def _validate_status_mapping(statuses: Mapping[str, str]) -> dict[str, str]:
    unknown_keys = set(statuses) - set(STATE_STATUS_KEYS)
    if unknown_keys:
        raise ValueError("data_status contains unknown keys: " + ", ".join(sorted(unknown_keys)))
    normalized = {
        name: str(statuses.get(name, "missing")).strip().lower()
        for name in STATE_STATUS_KEYS
    }
    invalid = [status for status in normalized.values() if status not in STATUS_NAMES]
    if invalid:
        raise ValueError(
            "data_status values must be observed, synthetic, demo, or missing."
        )
    return normalized


@dataclass
class FieldState:
    """Known field conditions and context at one explicit decision date.

    Soil moisture is volumetric fraction (m³/m³). Soil N/P/K are mg/kg,
    organic matter is percent, pH is unitless, and prior yield is t/ha.
    Missing numeric information remains NaN; no fields are imputed.
    """

    field_id: str
    as_of_date: pd.Timestamp
    latitude: float
    longitude: float
    field_size_ha: float = float("nan")

    @property
    def area_ha(self) -> float:
        return self.field_size_ha

    @area_ha.setter
    def area_ha(self, value: float) -> None:
        self.field_size_ha = float(value)
    temperature: float = float("nan")
    temp_max: float = float("nan")
    temp_min: float = float("nan")
    rainfall: float = float("nan")
    humidity: float = float("nan")
    wind_speed: float = float("nan")
    solar_radiation: float = float("nan")
    soil_moisture: float = float("nan")
    nitrogen: float = float("nan")
    phosphorus: float = float("nan")
    potassium: float = float("nan")
    ph: float = float("nan")
    organic_matter: float = float("nan")
    texture: Optional[str] = None
    previous_crop: Optional[str] = None
    previous_crop_family: Optional[str] = None
    previous_crop_is_legume: Optional[bool] = None
    previous_yield: float = float("nan")
    previous_irrigation: Optional[str] = None
    environment_observation_date: Optional[pd.Timestamp] = None
    soil_moisture_observation_date: Optional[pd.Timestamp] = None
    soil_as_of_date: Optional[pd.Timestamp] = None
    previous_crop_year: Optional[int] = None
    previous_crop_season: Optional[str] = None
    environment_source: str = "NASA_POWER"
    soil_moisture_source: str = "missing"
    soil_source: str = "missing"
    crop_source: str = "missing"
    history_source: str = "missing"
    data_status: dict[str, str] = field(
        default_factory=lambda: {name: "missing" for name in STATE_STATUS_KEYS}
    )

    def __post_init__(self) -> None:
        self.field_id = str(self.field_id).strip()
        if not self.field_id:
            raise ValueError("field_id is required.")
        self.as_of_date = _date_value(self.as_of_date, "as_of_date")
        self.latitude = _optional_number(self.latitude, "latitude")
        self.longitude = _optional_number(self.longitude, "longitude")
        if not np.isfinite(self.latitude) or not -90 <= self.latitude <= 90:
            raise ValueError("latitude must be between -90 and 90.")
        if not np.isfinite(self.longitude) or not -180 <= self.longitude <= 180:
            raise ValueError("longitude must be between -180 and 180.")

        numeric_fields = (
            "field_size_ha",
            "temperature",
            "temp_max",
            "temp_min",
            "rainfall",
            "humidity",
            "wind_speed",
            "solar_radiation",
            "soil_moisture",
            "nitrogen",
            "phosphorus",
            "potassium",
            "ph",
            "organic_matter",
            "previous_yield",
        )
        for name in numeric_fields:
            setattr(self, name, _optional_number(getattr(self, name), name))
        if np.isfinite(self.field_size_ha) and self.field_size_ha <= 0:
            raise ValueError("field_size_ha must be positive.")
        if np.isfinite(self.rainfall) and self.rainfall < 0:
            raise ValueError("rainfall cannot be negative.")
        if np.isfinite(self.soil_moisture) and not 0 <= self.soil_moisture <= 1:
            raise ValueError("soil_moisture must be between 0 and 1 m³/m³.")
        if np.isfinite(self.ph) and not 0 <= self.ph <= 14:
            raise ValueError("soil pH must be between 0 and 14.")
        if np.isfinite(self.organic_matter) and not 0 <= self.organic_matter <= 100:
            raise ValueError("organic_matter must be between 0 and 100 percent.")
        if self.previous_crop_is_legume is not None and not isinstance(
            self.previous_crop_is_legume, (bool, np.bool_)
        ):
            raise ValueError("previous_crop_is_legume must be boolean or missing.")
        if self.previous_crop_is_legume is not None:
            self.previous_crop_is_legume = bool(self.previous_crop_is_legume)

        for name in ("environment_observation_date", "soil_moisture_observation_date", "soil_as_of_date"):
            value = getattr(self, name)
            if value is not None:
                parsed = _date_value(value, name)
                if parsed > self.as_of_date:
                    raise ValueError(f"{name} cannot be later than as_of_date.")
                setattr(self, name, parsed)
        if self.previous_crop_year is not None:
            if isinstance(self.previous_crop_year, bool) or not isinstance(
                self.previous_crop_year, (int, np.integer)
            ):
                raise ValueError("previous_crop_year must be an integer or missing.")
            if self.previous_crop_year >= self.as_of_date.year:
                raise ValueError("previous_crop_year must be before as_of_date year.")

        for name in (
            "texture",
            "previous_crop",
            "previous_crop_family",
            "previous_irrigation",
            "previous_crop_season",
        ):
            setattr(self, name, _optional_text(getattr(self, name)))
        for name in (
            "environment_source",
            "soil_moisture_source",
            "soil_source",
            "crop_source",
            "history_source",
        ):
            source = _optional_text(getattr(self, name))
            if source is None:
                raise ValueError(f"{name} must be a non-empty provenance label.")
            setattr(self, name, source)
        if not isinstance(self.data_status, Mapping):
            raise ValueError("data_status must be a mapping of input source to status.")
        self.data_status = _validate_status_mapping(self.data_status)

    def to_dict(self) -> dict[str, Any]:
        """Serialize fields in dataclass declaration order."""
        result = {}
        for item in fields(self):
            value = getattr(self, item.name)
            if isinstance(value, pd.Timestamp):
                value = value.date().isoformat()
            elif isinstance(value, dict):
                value = {key: value[key] for key in STATE_STATUS_KEYS}
            result[item.name] = value
        return result

    @classmethod
    def from_dict(cls, values: Mapping[str, Any]) -> "FieldState":
        """Reconstruct a state from a dictionary produced by :meth:`to_dict`."""
        allowed = {item.name for item in fields(cls)}
        extra = set(values) - allowed
        if extra:
            raise ValueError("Unknown FieldState fields: " + ", ".join(sorted(extra)))
        return cls(**dict(values))


def _read_frame(data: FrameInput, default_loader, *loader_args, **loader_kwargs):
    if data is None:
        return default_loader(*loader_args, **loader_kwargs)
    if isinstance(data, pd.DataFrame):
        return data.copy()
    if isinstance(data, (str, Path)):
        return default_loader(*loader_args, csv_path=data, **loader_kwargs)
    raise TypeError("Data inputs must be pandas DataFrames, CSV paths, or None.")


def _checked_frame(data: pd.DataFrame, required: list[str], name: str) -> pd.DataFrame:
    missing = [column for column in required if column not in data.columns]
    if missing:
        raise ValueError(f"{name} data is missing required columns: " + ", ".join(missing))
    return data.copy()


def _latest_power_row(data: pd.DataFrame, decision_date: pd.Timestamp) -> Optional[pd.Series]:
    frame = _checked_frame(data, NASA_POWER_COLUMNS, "NASA POWER")
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce").dt.normalize()
    if frame["date"].isna().any():
        raise ValueError("NASA POWER data contains invalid dates.")
    frame = frame.loc[frame["date"] <= decision_date].copy()
    for column in NASA_POWER_COLUMNS[1:]:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
        frame[column] = frame[column].mask(frame[column] == -999)
    frame = frame.loc[frame[NASA_POWER_COLUMNS[1:]].notna().any(axis=1)]
    if frame.empty:
        return None
    return frame.sort_values("date", kind="stable").iloc[-1]


def _latest_smap_row(
    data: pd.DataFrame,
    latitude: float,
    longitude: float,
    decision_date: pd.Timestamp,
    coordinate_tolerance: float,
) -> Optional[pd.Series]:
    frame = _checked_frame(data, SMAP_COLUMNS, "SMAP")
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce").dt.normalize()
    if frame["date"].isna().any():
        raise ValueError("SMAP data contains invalid dates.")
    for column in ("latitude", "longitude", "soil_moisture"):
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    frame["soil_moisture"] = frame["soil_moisture"].mask(
        frame["soil_moisture"] == -999
    )
    matches = frame.loc[
        frame["date"].le(decision_date)
        & frame["latitude"].sub(latitude).abs().le(coordinate_tolerance)
        & frame["longitude"].sub(longitude).abs().le(coordinate_tolerance)
    ].copy()
    valid = matches.loc[matches["soil_moisture"].notna()]
    if not valid.empty:
        return valid.sort_values("date", kind="stable").iloc[-1]
    if not matches.empty:
        return matches.sort_values("date", kind="stable").iloc[-1]
    return None


def _latest_soil_row(
    data: pd.DataFrame, field_id: str, decision_date: pd.Timestamp
) -> Optional[pd.Series]:
    frame = _checked_frame(data, SOIL_COLUMNS, "Soil")
    frame["as_of_date"] = pd.to_datetime(frame["as_of_date"], errors="coerce").dt.normalize()
    if frame["as_of_date"].isna().any():
        raise ValueError("Soil data contains invalid as_of_date values.")
    frame = frame.loc[
        frame["field_id"].astype(str).eq(field_id)
        & frame["as_of_date"].le(decision_date)
    ]
    if frame.empty:
        return None
    return frame.sort_values("as_of_date", kind="stable").iloc[-1]


def _latest_history_row(
    data: pd.DataFrame, field_id: str, decision_date: pd.Timestamp
) -> Optional[pd.Series]:
    frame = _checked_frame(data, FIELD_HISTORY_COLUMNS, "Field history")
    frame["year"] = pd.to_numeric(frame["year"], errors="coerce")
    if frame["year"].isna().any():
        raise ValueError("Field history contains an invalid year.")
    frame = frame.loc[
        frame["field_id"].astype(str).eq(field_id)
        & frame["year"].lt(decision_date.year)
    ].copy()
    if frame.empty:
        return None
    frame["_input_order"] = np.arange(len(frame))
    return frame.sort_values(["year", "_input_order"], kind="stable").iloc[-1]


def _crop_record(data: pd.DataFrame, crop_name: Optional[str]) -> Optional[pd.Series]:
    if crop_name is None:
        return None
    frame = _checked_frame(data, CROP_COLUMNS, "Crop knowledge")
    matches = frame.loc[frame["crop"].astype(str).str.casefold() == crop_name.casefold()]
    return None if matches.empty else matches.iloc[0]


def build_field_state(
    field_id: str,
    latitude: float,
    longitude: float,
    decision_date: DateInput,
    nasa_power_data: Union[pd.DataFrame, str, Path],
    smap_data: FrameInput = None,
    soil_data: FrameInput = None,
    field_history_data: FrameInput = None,
    crop_knowledge: FrameInput = None,
    coordinate_tolerance: float = 0.0001,
    field_size_ha: float = float("nan"),
) -> FieldState:
    """Combine normalized source tables into the field state known by a date.

    NASA POWER input must be a normalized DataFrame or CSV exported by the
    Phase 2 loader. Other inputs may be normalized DataFrames/CSV paths; when
    omitted, the existing Phase 3 local CSV loaders are used.
    """
    if not isinstance(field_id, str) or not field_id.strip():
        raise ValueError("field_id is required.")
    field_id = field_id.strip()
    decision = _date_value(decision_date, "decision_date")
    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError) as error:
        raise ValueError("latitude and longitude must be numeric.") from error
    if not np.isfinite(latitude) or not -90 <= latitude <= 90:
        raise ValueError("latitude must be between -90 and 90.")
    if not np.isfinite(longitude) or not -180 <= longitude <= 180:
        raise ValueError("longitude must be between -180 and 180.")
    if not np.isfinite(coordinate_tolerance) or coordinate_tolerance < 0:
        raise ValueError("coordinate_tolerance must be a non-negative number.")

    if isinstance(nasa_power_data, pd.DataFrame):
        power = nasa_power_data.copy()
    elif isinstance(nasa_power_data, (str, Path)):
        power = pd.read_csv(nasa_power_data)
    else:
        raise TypeError("nasa_power_data must be a normalized DataFrame or CSV path.")
    power_row = _latest_power_row(power, decision)

    smap = _read_frame(
        smap_data,
        load_smap_data,
        latitude,
        longitude,
        "1900-01-01",
        decision,
    )
    smap_row = _latest_smap_row(
        smap, latitude, longitude, decision, coordinate_tolerance
    )

    soil = _read_frame(
        soil_data,
        load_soil_data,
        field_id=field_id,
        as_of_date=decision,
    )
    soil_row = _latest_soil_row(soil, field_id, decision)

    history = _read_frame(
        field_history_data,
        load_field_history,
        field_id=field_id,
        as_of_date=decision,
    )
    history_row = _latest_history_row(history, field_id, decision)

    crops = _read_frame(crop_knowledge, load_crop_knowledge)
    previous_crop = _optional_text(history_row["crop"]) if history_row is not None else None
    crop_row = _crop_record(crops, previous_crop)

    environment_values = {
        name: _optional_number(power_row[name], name) if power_row is not None else float("nan")
        for name in NASA_POWER_COLUMNS[1:]
    }
    if smap_row is not None and pd.notna(smap_row["soil_moisture"]):
        soil_moisture = _optional_number(smap_row["soil_moisture"], "soil_moisture")
        smap_source = _optional_text(smap_row["source"]) or "missing"
        smap_status = _optional_text(smap_row["data_status"]) or "missing"
    else:
        soil_moisture = float("nan")
        smap_source = (
            _optional_text(smap_row["source"]) or "missing"
            if smap_row is not None
            else "missing"
        )
        smap_status = "missing"

    soil_fields = ("nitrogen", "phosphorus", "potassium", "ph", "organic_matter")
    soil_values = {
        name: _optional_number(soil_row[name], name) if soil_row is not None else float("nan")
        for name in soil_fields
    }
    history_status = (
        _optional_text(history_row["data_status"]) or "missing"
        if history_row is not None
        else "missing"
    )
    crop_status = (
        _optional_text(crop_row["data_status"]) or "missing"
        if crop_row is not None
        else "missing"
    )
    environment_status = "observed" if power_row is not None else "missing"
    soil_moisture_status = (
        smap_status if np.isfinite(soil_moisture) else "missing"
    )

    return FieldState(
        field_id=field_id,
        as_of_date=decision,
        latitude=latitude,
        longitude=longitude,
        field_size_ha=_optional_number(field_size_ha, "field_size_ha"),
        **environment_values,
        soil_moisture=soil_moisture,
        **soil_values,
        texture=_optional_text(soil_row["texture"]) if soil_row is not None else None,
        previous_crop=previous_crop,
        previous_crop_family=(
            _optional_text(crop_row["family"]) if crop_row is not None else None
        ),
        previous_crop_is_legume=(
            bool(crop_row["is_legume"]) if crop_row is not None else None
        ),
        previous_yield=(
            _optional_number(history_row["yield"], "previous_yield")
            if history_row is not None
            else float("nan")
        ),
        previous_irrigation=(
            _optional_text(history_row["irrigation"])
            if history_row is not None
            else None
        ),
        environment_observation_date=(
            power_row["date"] if power_row is not None else None
        ),
        soil_moisture_observation_date=(
            smap_row["date"]
            if smap_row is not None and np.isfinite(soil_moisture)
            else None
        ),
        soil_as_of_date=soil_row["as_of_date"] if soil_row is not None else None,
        previous_crop_year=(
            int(history_row["year"]) if history_row is not None else None
        ),
        previous_crop_season=(
            _optional_text(history_row["season"]) if history_row is not None else None
        ),
        environment_source="NASA_POWER",
        soil_moisture_source=smap_source,
        soil_source=_optional_text(soil_row["source"]) if soil_row is not None else "missing",
        crop_source=_optional_text(crop_row["source"]) if crop_row is not None else "missing",
        history_source=(
            _optional_text(history_row["source"]) if history_row is not None else "missing"
        ),
        data_status={
            "environment": environment_status,
            "soil_moisture": soil_moisture_status,
            "soil": (
                _optional_text(soil_row["data_status"]) or "missing"
                if soil_row is not None
                else "missing"
            ),
            "crop": crop_status,
            "history": history_status,
        },
    )
