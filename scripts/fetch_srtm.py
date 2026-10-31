"""Fetch NASA SRTMGL1 (1 arc-second 30m) DEM tiles via earthaccess

and extract genuine elevation and topographic slope for Bangladesh test fields.
"""

from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import zipfile
from dotenv import load_dotenv
import numpy as np

load_dotenv()

RAW_DIR = Path("data/srtm/raw")
PROCESSED_FILE = Path("data/srtm/field_elevations.json")
SHORT_NAME = "SRTMGL1"

FIELDS = {
    "dinajpur": {
        "field_name": "Dinajpur Sadar",
        "latitude": 25.6279,
        "longitude": 88.6332,
        "tile": "N25E088",
        "lat_origin": 25,
        "lon_origin": 88,
        "flood_exposure_hint": "Low-lying alluvial floodplain",
    },
    "bogura": {
        "field_name": "Bogura demo",
        "latitude": 24.85,
        "longitude": 89.37,
        "tile": "N24E089",
        "lat_origin": 24,
        "lon_origin": 89,
        "flood_exposure_hint": "Low-lying alluvial floodplain",
    },
    "satkhira": {
        "field_name": "Satkhira coast",
        "latitude": 22.7185,
        "longitude": 89.0705,
        "tile": "N22E089",
        "lat_origin": 22,
        "lon_origin": 89,
        "flood_exposure_hint": "High coastal flood/surge exposure",
    },
    "sunamganj": {
        "field_name": "Sunamganj haor",
        "latitude": 25.0658,
        "longitude": 91.3950,
        "tile": "N25E091",
        "lat_origin": 25,
        "lon_origin": 91,
        "flood_exposure_hint": "High monsoon basin submergence risk (haor)",
    },
}


def download_tiles():
    """Download required SRTMGL1 tiles via earthaccess if missing."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    import earthaccess
    earthaccess.login(strategy="environment")

    for key, info in FIELDS.items():
        tile_name = info["tile"]
        zip_path = RAW_DIR / f"{tile_name}.SRTMGL1.hgt.zip"
        if not zip_path.is_file():
            print(f"[SRTM] Searching tile {tile_name}...")
            res = earthaccess.search_data(short_name=SHORT_NAME, granule_name=f"{tile_name}*")
            if not res:
                raise RuntimeError(f"Could not find SRTM tile for {tile_name}")
            print(f"[SRTM] Downloading {tile_name}...")
            earthaccess.download(res, str(RAW_DIR))

        # Check hash
        sha256 = hashlib.sha256()
        with open(zip_path, "rb") as f:
            while chunk := f.read(1024 * 1024):
                sha256.update(chunk)
        manifest.append({
            "field_id": key,
            "tile": tile_name,
            "filename": zip_path.name,
            "size_bytes": zip_path.stat().st_size,
            "sha256": sha256.hexdigest(),
            "source": "NASA LP DAAC / USGS via Earthdata Cloud",
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
        })

    with open(RAW_DIR / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[SRTM] Manifest written with {len(manifest)} tiles.")


def extract_field_elevations():
    """Extract exact elevation and 3x3 slope from raw .hgt files inside the zips."""
    results = {}
    for key, info in FIELDS.items():
        tile_name = info["tile"]
        zip_path = RAW_DIR / f"{tile_name}.SRTMGL1.hgt.zip"
        lat = info["latitude"]
        lon = info["longitude"]
        lat_origin = info["lat_origin"]
        lon_origin = info["lon_origin"]

        with zipfile.ZipFile(zip_path, "r") as zf:
            hgt_bytes = zf.read(f"{tile_name}.hgt")
            # SRTMGL1 has 3601 x 3601 16-bit signed big-endian integers
            arr = np.frombuffer(hgt_bytes, dtype=">i2").reshape((3601, 3601))

        # Pixel coordinates
        # Row 0 is lat_origin + 1.0, Row 3600 is lat_origin
        # Col 0 is lon_origin, Col 3600 is lon_origin + 1.0
        row = int(round((lat_origin + 1.0 - lat) * 3600.0))
        col = int(round((lon - lon_origin) * 3600.0))

        # Clamp row and col within boundaries
        row = max(1, min(3599, row))
        col = max(1, min(3599, col))

        elev = int(arr[row, col])

        # Cell resolution in meters at this latitude
        lat_rad = math.radians(lat)
        dy_m = 111132.0 / 3600.0
        dx_m = (111412.84 * math.cos(lat_rad)) / 3600.0

        # 3x3 window slope calculation
        window = arr[row - 1 : row + 2, col - 1 : col + 2].astype(float)
        # Handle void values (-32768)
        window[window < -100] = elev

        # Sobel/Horn gradient
        dz_dx = ((window[0, 2] + 2 * window[1, 2] + window[2, 2]) -
                 (window[0, 0] + 2 * window[1, 0] + window[2, 0])) / (8 * dx_m)
        dz_dy = ((window[2, 0] + 2 * window[2, 1] + window[2, 2]) -
                 (window[0, 0] + 2 * window[0, 1] + window[0, 2])) / (8 * dy_m)

        slope_pct = round(float(math.sqrt(dz_dx**2 + dz_dy**2) * 100.0), 2)
        erosion_risk = "Low" if slope_pct < 2.0 else ("Moderate" if slope_pct < 5.0 else "High")

        results[key] = {
            "field_name": info["field_name"],
            "latitude": lat,
            "longitude": lon,
            "srtm_tile": tile_name,
            "elevation_m": elev,
            "slope_percent": slope_pct,
            "flood_exposure_hint": info["flood_exposure_hint"],
            "topographic_erosion_risk": erosion_risk,
            "dataset": "NASA SRTMGL1 (30 m resolution)",
            "derived_at": datetime.now(timezone.utc).isoformat(),
        }
        print(f"[SRTM] {info['field_name']} -> Elevation: {elev} m, Slope: {slope_pct}%")

    PROCESSED_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PROCESSED_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"[SRTM] Written {PROCESSED_FILE}")


def main():
    download_tiles()
    extract_field_elevations()


if __name__ == "__main__":
    main()
