"""src/compute/imerg.py
High-performance loader and query interface for NASA GPM IMERG Final Daily v07 (0.1°)
satellite precipitation observations across Bangladesh (2001-2024, n=8,766 days).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional, Tuple
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data" / "imerg"
NPZ_PATH = DATA_DIR / "bd_imerg_daily.npz"

_IMERG_CACHE = None


def load_imerg_archive():
    """Load the compact binary archive of Bangladesh daily IMERG precipitation."""
    global _IMERG_CACHE
    if _IMERG_CACHE is None:
        if not NPZ_PATH.exists():
            raise FileNotFoundError(f"IMERG daily archive not found at {NPZ_PATH}")
        _IMERG_CACHE = np.load(NPZ_PATH)
    return _IMERG_CACHE


def get_field_imerg_series(lat: float, lon: float) -> pd.DataFrame:
    """Return daily rainfall time series (2001-2024) for any Bangladesh (lat, lon) from bd_imerg_daily.npz."""
    archive = load_imerg_archive()
    lats = archive["lats"]
    lons = archive["lons"]
    dates = archive["dates"]
    precip = archive["precipitation"]

    lat_idx = int(np.argmin(np.abs(lats - lat)))
    lon_idx = int(np.argmin(np.abs(lons - lon)))

    series = precip[:, lat_idx, lon_idx]
    return pd.DataFrame({
        "date": dates,
        "rainfall": np.round(series, 2),
    })


def get_district_imerg_series(district_id: str) -> Optional[pd.DataFrame]:
    """Retrieve daily IMERG time series (2001-2024) for a district.
    
    Checks per-district CSV cache first, then falls back to .npz slice.
    """
    key = district_id.strip().lower()
    csv_path = DATA_DIR / f"imerg_{key}_2001_2024.csv"
    if csv_path.exists():
        return pd.read_csv(csv_path)

    # Fallback to district registry coordinates
    manifest_path = PROJECT_ROOT / "data" / "nasa_power" / "manifest_64.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            entry = manifest.get("entries", {}).get(key)
            if entry:
                return get_field_imerg_series(entry["lat"], entry["lon"])
        except Exception:
            pass

    return None
