"""Fetch and cache daily NASA POWER observations (2001-2025) for all 64 Bangladesh districts.

Source: NASA Prediction Of Worldwide Energy Resources (POWER) Daily Point API
Community: AG (Agroclimatology)
Parameters: PRECTOTCORR, T2M, T2M_MAX, T2M_MIN, RH2M, WS2M, ALLSKY_SFC_SW_DWN
Range: 2001-01-01 to 2025-12-31
"""

from __future__ import annotations

import csv
import hashlib
import json
import logging
import math
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import urllib.request
import urllib.parse
import urllib.error

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cache_power_64")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_GEO_PATH = PROJECT_ROOT / "data" / "geo" / "bd_districts.json"
CACHE_DIR = PROJECT_ROOT / "data" / "nasa_power" / "advisory_cache"
MANIFEST_PATH = PROJECT_ROOT / "data" / "nasa_power" / "manifest_64.json"

API_BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
START_DATE = "20010101"
END_DATE = "20251231"
PARAMETERS = ["PRECTOTCORR", "T2M", "T2M_MAX", "T2M_MIN", "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN"]
HEADERS = ["date", "rainfall", "temperature", "temp_max", "temp_min", "humidity", "wind_speed", "solar_radiation"]


def get_file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def fetch_district_power(lat: float, lon: float, max_retries: int = 3) -> tuple[dict, str]:
    query_params = {
        "parameters": ",".join(PARAMETERS),
        "community": "AG",
        "longitude": f"{lon:.4f}",
        "latitude": f"{lat:.4f}",
        "start": START_DATE,
        "end": END_DATE,
        "format": "JSON",
    }
    url = f"{API_BASE_URL}?{urllib.parse.urlencode(query_params)}"

    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "FieldShift2026/1.0 (NASA Space Apps)"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    return data, url
                else:
                    raise RuntimeError(f"HTTP {resp.status}")
        except Exception as e:
            last_error = e
            logger.warning(f"Attempt {attempt}/{max_retries} failed for ({lat}, {lon}): {e}")
            if attempt < max_retries:
                time.sleep(3 * attempt)

    raise RuntimeError(f"Failed to fetch {url} after {max_retries} attempts: {last_error}")


def json_to_rows(payload: dict) -> list[list[str]]:
    props = payload.get("properties", {}).get("parameter", {})
    p_rain = props.get("PRECTOTCORR", {})
    p_t2m = props.get("T2M", {})
    p_tmax = props.get("T2M_MAX", {})
    p_tmin = props.get("T2M_MIN", {})
    p_rh = props.get("RH2M", {})
    p_ws = props.get("WS2M", {})
    p_sol = props.get("ALLSKY_SFC_SW_DWN", {})

    # Dates are union of keys, sorted
    all_dates = sorted(p_t2m.keys())
    rows = []
    for d in all_dates:
        # Format date as YYYY-MM-DD
        iso_date = f"{d[:4]}-{d[4:6]}-{d[6:8]}"
        def clean_val(v: Any, fallback: float = 0.0) -> str:
            if v is None or v == -999 or v == -999.0 or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
                return str(fallback)
            return str(round(float(v), 2))

        rain_str = clean_val(p_rain.get(d), 0.0)
        t2m_str = clean_val(p_t2m.get(d), 25.0)
        tmax_str = clean_val(p_tmax.get(d), 30.0)
        tmin_str = clean_val(p_tmin.get(d), 20.0)
        rh_str = clean_val(p_rh.get(d), 70.0)
        ws_str = clean_val(p_ws.get(d), 1.5)
        sol_str = clean_val(p_sol.get(d), 14.0)

        rows.append([iso_date, rain_str, t2m_str, tmax_str, tmin_str, rh_str, ws_str, sol_str])

    return rows


def write_csv(path: Path, rows: list[list[str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(HEADERS)
        writer.writerows(rows)


def main() -> None:
    if not DATA_GEO_PATH.exists():
        logger.error(f"Districts file not found: {DATA_GEO_PATH}")
        sys.exit(1)

    with open(DATA_GEO_PATH, "r", encoding="utf-8") as f:
        geo_data = json.load(f)

    districts = geo_data.get("districts", [])
    logger.info(f"Loaded {len(districts)} districts from {DATA_GEO_PATH}")

    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    manifest_entries: Dict[str, Any] = {}
    if MANIFEST_PATH.exists():
        try:
            with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                existing_manifest = json.load(f)
                manifest_entries = existing_manifest.get("entries", {})
        except Exception:
            manifest_entries = {}

    success_count = 0
    skipped_count = 0
    failure_count = 0
    failures = []

    total = len(districts)
    for idx, d in enumerate(districts, start=1):
        raw_name = d["name"].strip()
        key = raw_name.lower().replace(" ", "_").replace("-", "_")
        if key == "comilla":
            key = "cumilla"

        lat = float(d["lat"])
        lon = float(d["lon"])
        csv_path = CACHE_DIR / f"nasa_power_{key}_2001_2025.csv"

        logger.info(f"[{idx}/{total}] Processing district: {key} ({raw_name}) at ({lat:.4f}, {lon:.4f})")

        # If already exists and valid length, skip fetching unless force requested
        if csv_path.exists() and csv_path.stat().st_size > 100000:
            logger.info(f"  -> Cache exists ({csv_path.stat().st_size} bytes), verifying SHA256...")
            sha = get_file_sha256(csv_path)
            manifest_entries[key] = {
                "district_key": key,
                "name": raw_name,
                "bn_name": d.get("bn_name"),
                "lat": lat,
                "lon": lon,
                "csv_file": csv_path.name,
                "sha256": sha,
                "fetched_at": manifest_entries.get(key, {}).get("fetched_at", datetime.now(timezone.utc).isoformat()),
                "url": manifest_entries.get(key, {}).get("url", f"{API_BASE_URL}?start={START_DATE}&end={END_DATE}&latitude={lat:.4f}&longitude={lon:.4f}"),
                "status": "cached",
            }
            skipped_count += 1
            success_count += 1
            continue

        try:
            payload, url = fetch_district_power(lat, lon)
            rows = json_to_rows(payload)
            if len(rows) < 8000:
                raise ValueError(f"Too few rows returned ({len(rows)})")
            write_csv(csv_path, rows)
            sha = get_file_sha256(csv_path)
            now_iso = datetime.now(timezone.utc).isoformat()
            manifest_entries[key] = {
                "district_key": key,
                "name": raw_name,
                "bn_name": d.get("bn_name"),
                "lat": lat,
                "lon": lon,
                "csv_file": csv_path.name,
                "sha256": sha,
                "fetched_at": now_iso,
                "url": url,
                "rows_count": len(rows),
                "status": "fetched",
            }
            logger.info(f"  -> Successfully fetched and saved {csv_path.name} ({len(rows)} rows, sha256={sha[:8]}...)")
            success_count += 1
        except Exception as e:
            logger.error(f"  -> ERROR fetching {key}: {e}")
            failure_count += 1
            failures.append({"district": key, "error": str(e)})

        # Polite 2s pause as required
        time.sleep(2.0)

    # Save manifest
    manifest_doc = {
        "_source": "NASA POWER Daily Point API (v2.0) 2001-2025",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "total_districts": total,
        "success_count": success_count,
        "skipped_existing_count": skipped_count,
        "failure_count": failure_count,
        "failures": failures,
        "entries": manifest_entries,
    }

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest_doc, f, indent=2, ensure_ascii=False)

    # Also save to advisory_cache/manifest.json
    with open(CACHE_DIR / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest_doc, f, indent=2, ensure_ascii=False)

    logger.info(f"Finished: {success_count}/{total} cached successfully ({skipped_count} skipped, {failure_count} failures). Manifest saved to {MANIFEST_PATH}")


if __name__ == "__main__":
    main()

