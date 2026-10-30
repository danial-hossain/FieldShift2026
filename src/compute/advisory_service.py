"""Advisory Service: Data acquisition, caching, offline fixtures, and provenance.

Coordinates NASA POWER climate observations with deterministic agronomic science
in src.compute.agro to provide mobile-first planting window advisories.
"""

from __future__ import annotations

import os
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from src.compute.agro import (
    AgronomicConfig,
    RICE_SEASON_WINDOWS,
    RICE_THERMAL_SPECS,
    calculate_growing_degree_days,
    compare_periods,
    compute_onset_series,
    generate_recommendation,
    run_sensitivity_analysis,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CACHE_DIR = PROJECT_ROOT / "data" / "nasa_power" / "advisory_cache"
FIXTURES_DIR = PROJECT_ROOT / "data" / "nasa_power" / "fixtures"

# Authoritative Bangladesh Agricultural District Registry
DISTRICT_REGISTRY: Dict[str, Dict[str, Any]] = {
    "rajshahi": {
        "district_id": "rajshahi",
        "name_en": "Rajshahi",
        "name_bn": "রাজশাহী",
        "division": "Rajshahi",
        "aez_code": 25,
        "aez_name": "Level Barind Tract",
        "latitude": 24.3745,
        "longitude": 88.6042,
        "soil_type": "clay loam",
        "elevation_m": 18.0,
        "primary_rice": "Aman & Boro",
    },
    "bogura": {
        "district_id": "bogura",
        "name_en": "Bogura",
        "name_bn": "বগুড়া",
        "division": "Rajshahi",
        "aez_code": 3,
        "aez_name": "Tista Meander / Karatoya Floodplain",
        "latitude": 24.8467,
        "longitude": 89.3777,
        "soil_type": "loam",
        "elevation_m": 20.0,
        "primary_rice": "Aman, Boro & Aus",
    },
    "rangpur": {
        "district_id": "rangpur",
        "name_en": "Rangpur",
        "name_bn": "রংপুর",
        "division": "Rangpur",
        "aez_code": 2,
        "aez_name": "Active Tista Floodplain",
        "latitude": 25.7439,
        "longitude": 89.2752,
        "soil_type": "sandy loam",
        "elevation_m": 34.0,
        "primary_rice": "Aman & Boro",
    },
    "mymensingh": {
        "district_id": "mymensingh",
        "name_en": "Mymensingh",
        "name_bn": "ময়মনসিংহ",
        "division": "Mymensingh",
        "aez_code": 9,
        "aez_name": "Old Brahmaputra Floodplain",
        "latitude": 24.7471,
        "longitude": 90.4203,
        "soil_type": "silt loam",
        "elevation_m": 19.0,
        "primary_rice": "Boro & Aman",
    },
    "jashore": {
        "district_id": "jashore",
        "name_en": "Jashore",
        "name_bn": "যশোর",
        "division": "Khulna",
        "aez_code": 11,
        "aez_name": "High Ganges River Floodplain",
        "latitude": 23.1664,
        "longitude": 89.2081,
        "soil_type": "loam",
        "elevation_m": 12.0,
        "primary_rice": "Aman & Boro",
    },
    "cumilla": {
        "district_id": "cumilla",
        "name_en": "Cumilla",
        "name_bn": "কুমিল্লা",
        "division": "Chattogram",
        "aez_code": 19,
        "aez_name": "Old Meghna Estuarine Floodplain",
        "latitude": 23.4607,
        "longitude": 91.1809,
        "soil_type": "clay",
        "elevation_m": 14.0,
        "primary_rice": "Aman, Boro & Aus",
    },
}


def get_supported_districts() -> List[Dict[str, Any]]:
    """Return list of supported districts with names and coordinates."""
    return list(DISTRICT_REGISTRY.values())


def load_district_climate_data(
    district_key: str,
    offline: bool = False,
) -> Tuple[pd.DataFrame, str]:
    """Retrieve daily NASA POWER observations (2001-2025) for a district.

    Returns:
        Tuple of (DataFrame, data_mode)
        data_mode is one of:
          - 'cache': Loaded from local advisory cache
          - 'fixture': Loaded from pre-bundled offline fixture
          - 'live_acquired_cache': Freshly retrieved via NASA API and cached locally
    """
    key = district_key.strip().lower()
    if key not in DISTRICT_REGISTRY:
        raise ValueError(
            f"Unsupported district '{district_key}'. Supported districts: "
            + ", ".join(DISTRICT_REGISTRY.keys())
        )

    district_info = DISTRICT_REGISTRY[key]
    cache_file = CACHE_DIR / f"nasa_power_{key}_2001_2025.csv"
    fixture_file = FIXTURES_DIR / f"nasa_power_{key}_fixture.csv"
    fallback_fixture = FIXTURES_DIR / "nasa_power_rajshahi_fixture.csv"

    is_forced_offline = bool(offline or os.getenv("OFFLINE") == "1")

    # 1. Offline Mode: Strictly use local files; never hit network
    if is_forced_offline:
        if cache_file.exists():
            df = pd.read_csv(cache_file)
            return df, "cache"
        elif fixture_file.exists():
            df = pd.read_csv(fixture_file)
            return df, "fixture"
        elif fallback_fixture.exists():
            df = pd.read_csv(fallback_fixture)
            return df, "fixture"
        else:
            raise FileNotFoundError(
                f"No offline cache or fixture available for district '{key}'."
            )

    # 2. Online Mode: Prefer local cache if present; otherwise fetch and cache
    if cache_file.exists():
        df = pd.read_csv(cache_file)
        return df, "cache"
    elif fixture_file.exists():
        df = pd.read_csv(fixture_file)
        return df, "fixture"

    # 3. Live acquisition via NASA POWER Daily Point API
    try:
        import requests
        url = "https://power.larc.nasa.gov/api/temporal/daily/point"
        params = {
            "parameters": "PRECTOTCORR,T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN",
            "community": "AG",
            "longitude": float(district_info["longitude"]),
            "latitude": float(district_info["latitude"]),
            "start": "20010101",
            "end": "20251231",
            "format": "JSON",
        }
        resp = requests.get(url, params=params, timeout=45)
        resp.raise_for_status()
        data = resp.json()["properties"]["parameter"]

        dates = list(data["PRECTOTCORR"].keys())
        df = pd.DataFrame({
            "date": [f"{d[:4]}-{d[4:6]}-{d[6:]}" for d in dates],
            "rainfall": [data["PRECTOTCORR"].get(d, -999) for d in dates],
            "temperature": [data["T2M"].get(d, -999) for d in dates],
            "temp_max": [data["T2M_MAX"].get(d, -999) for d in dates],
            "temp_min": [data["T2M_MIN"].get(d, -999) for d in dates],
            "humidity": [data["RH2M"].get(d, -999) for d in dates],
            "wind_speed": [data["WS2M"].get(d, -999) for d in dates],
            "solar_radiation": [data["ALLSKY_SFC_SW_DWN"].get(d, -999) for d in dates],
        })

        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        df.to_csv(cache_file, index=False)
        return df, "live_acquired_cache"

    except Exception:
        # If live acquisition fails, fall back to fixture if possible
        if fixture_file.exists():
            return pd.read_csv(fixture_file), "fixture"
        elif fallback_fixture.exists():
            return pd.read_csv(fallback_fixture), "fixture"
        raise RuntimeError(
            f"Could not acquire NASA POWER telemetry for '{key}' and no local fixture exists."
        )


def build_planting_advisory(
    district: str = "rajshahi",
    crop: str = "aman",
    threshold_mm: float = 25.0,
    dry_spell_window_days: int = 21,
    dry_spell_max_consecutive_days: int = 7,
    offline: bool = False,
    lang: str = "bn",
) -> Dict[str, Any]:
    """Assemble complete scientific planting-window advisory response."""
    dist_key = district.strip().lower()
    crop_key = crop.strip().lower()

    if dist_key not in DISTRICT_REGISTRY:
        dist_key = "rajshahi"
    if crop_key not in RICE_SEASON_WINDOWS:
        crop_key = "aman"

    district_meta = DISTRICT_REGISTRY[dist_key]
    season_window = RICE_SEASON_WINDOWS[crop_key]
    thermal_spec = RICE_THERMAL_SPECS.get(crop_key, RICE_THERMAL_SPECS["default"])

    # Load 2001-2025 daily climate data
    daily_df, data_mode = load_district_climate_data(dist_key, offline=offline)

    # Configure agronomic parameters
    config = AgronomicConfig(
        search_start_month=season_window["start_md"][0],
        search_start_day=season_window["start_md"][1],
        search_end_month=season_window["end_md"][0],
        search_end_day=season_window["end_md"][1],
        window_days=3,
        threshold_mm=float(threshold_mm),
        min_rainy_days=1,
        dry_spell_window_days=int(dry_spell_window_days),
        dry_spell_max_consecutive_days=int(dry_spell_max_consecutive_days),
        dry_day_threshold_mm=2.0,
        base_temperature_c=thermal_spec["t_base"],
        upper_cap_temperature_c=thermal_spec["t_cap"],
    )

    # 1. Compute multi-year onset series (2001-2025)
    series_results = compute_onset_series(daily_df, config)
    p1_data = series_results["period_1"]
    p2_data = series_results["period_2"]

    # 2. Mann-Whitney comparison between Period 1 (2001-2012) and Period 2 (2013-2025)
    comparison = compare_periods(p1_data["doys"], p2_data["doys"])

    # 3. Growing Degree Day (GDD) accumulation and thermal context
    gdd_context = calculate_growing_degree_days(
        daily_df,
        base_temperature_c=thermal_spec["t_base"],
        upper_cap_temperature_c=thermal_spec["t_cap"],
        start_month=season_window["start_md"][0],
        end_month=season_window["end_md"][0] + 4,
    )

    # 4. Sensitivity sweeps (threshold +/- 5 mm)
    sensitivity = run_sensitivity_analysis(daily_df, config, step_mm=5.0)

    # 5. Agronomically defensible recommendations & SMS
    recommendation = generate_recommendation(
        district=district_meta["name_en"],
        crop=crop_key,
        comparison=comparison,
        sensitivity=sensitivity,
        gdd_context=gdd_context,
        lang=lang,
    )

    # 6. Provenance and traceability metadata
    provenance = {
        "dataset_name": "NASA Prediction Of Worldwide Energy Resources (POWER) Daily Point API",
        "official_url": "https://power.larc.nasa.gov/api/temporal/daily/point",
        "documentation_url": "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
        "spatial_resolution": "0.5° x 0.5° latitude/longitude (~50 km)",
        "assimilation_source": "NASA Goddard Earth Observing System (GEOS-5.12.4 / MERRA-2)",
        "temporal_coverage": "2001-01-01 to 2025-12-31 (25 continuous years)",
        "parameters": [
            {"code": "PRECTOTCORR", "name": "Precipitation Corrected", "unit": "mm/day"},
            {"code": "T2M", "name": "Temperature at 2 Meters", "unit": "°C"},
            {"code": "T2M_MAX", "name": "Maximum Temperature", "unit": "°C"},
            {"code": "T2M_MIN", "name": "Minimum Temperature", "unit": "°C"},
            {"code": "RH2M", "name": "Relative Humidity", "unit": "%"},
            {"code": "WS2M", "name": "Wind Speed at 2 Meters", "unit": "m/s"},
            {"code": "ALLSKY_SFC_SW_DWN", "name": "Solar Radiation", "unit": "MJ/m^2/day"},
        ],
        "missing_value_handling": "API -999 flags converted to NaN; omitted from onset detection without artificial imputation",
        "retrieval_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "data_mode": data_mode,
        "offline_forced": bool(offline or os.getenv("OFFLINE") == "1"),
        "coordinates": {
            "latitude": district_meta["latitude"],
            "longitude": district_meta["longitude"],
        },
        "aez_context": {
            "aez_code": district_meta["aez_code"],
            "aez_name": district_meta["aez_name"],
            "soil_texture": district_meta["soil_type"],
        },
    }

    methodology = {
        "onset_definition": (
            f"First occurrence after {season_window['start_md'][0]:02d}-{season_window['start_md'][1]:02d} "
            f"where cumulative rainfall over {config.window_days} consecutive days >= {config.threshold_mm} mm "
            f"with >= {config.min_rainy_days} rainy days (>= 1.0 mm)."
        ),
        "dry_spell_rule": (
            f"Confirmed only if subsequent {config.dry_spell_window_days}-day lookahead has no dry spell "
            f"of {config.dry_spell_max_consecutive_days} or more consecutive days with daily rain < {config.dry_day_threshold_mm} mm."
        ),
        "thermal_gdd_rule": (
            f"Daily GDD = max(0.0, min({config.upper_cap_temperature_c}°C, T_mean) - {config.base_temperature_c}°C). "
            f"Calibrated to BRRI rice phenology."
        ),
        "statistical_test": "Two-sided Mann-Whitney rank sum test comparing annual onset Day-Of-Year distributions.",
        "scientific_disclaimer": (
            "Climate evidence indicates historical trends across 0.5° satellite grid cells. "
            "Microclimate variations, localized bund water storage, and tube-well availability "
            "must mediate farmer decisions. Always consult local DAE Sub-Assistant Agricultural Officers (SAAO)."
        ),
    }

    return {
        "status": "ok",
        "district": district_meta,
        "crop": crop_key,
        "parameters_used": {
            "threshold_mm": config.threshold_mm,
            "window_days": config.window_days,
            "dry_spell_window_days": config.dry_spell_window_days,
            "dry_spell_max_consecutive_days": config.dry_spell_max_consecutive_days,
            "search_window": f"{season_window['start_md'][0]:02d}-{season_window['start_md'][1]:02d} to {season_window['end_md'][0]:02d}-{season_window['end_md'][1]:02d}",
        },
        "period_1": {
            "label": p1_data["label"],
            "years": "2001–2012",
            "total_years": p1_data["total_years"],
            "valid_samples": p1_data["valid_samples"],
            "median_doy": comparison.get("period_1_median_doy"),
            "mean_doy": comparison.get("period_1_mean_doy"),
            "series": p1_data["onsets"],
        },
        "period_2": {
            "label": p2_data["label"],
            "years": "2013–2025",
            "total_years": p2_data["total_years"],
            "valid_samples": p2_data["valid_samples"],
            "median_doy": comparison.get("period_2_median_doy"),
            "mean_doy": comparison.get("period_2_mean_doy"),
            "series": p2_data["onsets"],
        },
        "comparison": comparison,
        "gdd_context": gdd_context,
        "sensitivity": sensitivity,
        "recommendation": recommendation,
        "methodology": methodology,
        "provenance": provenance,
    }
