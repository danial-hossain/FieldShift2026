"""scripts/fetch_imerg_bd.py
Downloads GPM_3IMERGDF v07 daily precipitation for Bangladesh (lat 20.5-26.7, lon 88.0-92.7)
spanning 2001-01-01 to 2024-12-31 (n=8,766 days).
Stores compact grid data/imerg/bd_imerg_daily.npz and extracts 64 district CSVs.
"""

from __future__ import annotations

import concurrent.futures
import json
import os
import struct
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Load .env without printing credentials
env_file = ROOT / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip('"').strip("'")

import earthaccess

DATA_DIR = ROOT / "data" / "imerg"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Grid parameters
LON_MIN_IDX = 2680  # 88.05 E
LON_MAX_IDX = 2727  # 92.75 E
LAT_MIN_IDX = 1105  # 20.55 N
LAT_MAX_IDX = 1167  # 26.75 N
N_LON = LON_MAX_IDX - LON_MIN_IDX + 1  # 48
N_LAT = LAT_MAX_IDX - LAT_MIN_IDX + 1  # 63
TOTAL_PIXELS = N_LON * N_LAT          # 3024
PAYLOAD_BYTES = TOTAL_PIXELS * 4      # 12096 bytes

START_DATE = "2001-01-01"
END_DATE = "2024-12-31"

LONS = np.array([-179.95 + i * 0.1 for i in range(LON_MIN_IDX, LON_MAX_IDX + 1)], dtype=np.float32)
LATS = np.array([-89.95 + j * 0.1 for j in range(LAT_MIN_IDX, LAT_MAX_IDX + 1)], dtype=np.float32)

RAW_MEMMAP_PATH = DATA_DIR / "bd_imerg_raw_8766x63x48.dat"
MASK_PATH = DATA_DIR / "bd_imerg_mask.npy"
FINAL_NPZ_PATH = DATA_DIR / "bd_imerg_daily.npz"


def run_download(max_workers: int = 35):
    all_dates = pd.date_range(START_DATE, END_DATE, freq="D").strftime("%Y-%m-%d").tolist()
    n_days = len(all_dates)
    date_to_idx = {d: i for i, d in enumerate(all_dates)}

    print(f"Total dates to cover: {n_days} ({START_DATE} to {END_DATE})", flush=True)
    print(f"BBox Grid: Lat [{LATS[0]:.2f}..{LATS[-1]:.2f}] ({N_LAT} cells), Lon [{LONS[0]:.2f}..{LONS[-1]:.2f}] ({N_LON} cells)", flush=True)

    # Initialize or open memmap
    shape = (n_days, N_LAT, N_LON)
    if not RAW_MEMMAP_PATH.exists():
        mm = np.memmap(RAW_MEMMAP_PATH, dtype=np.float32, mode="w+", shape=shape)
        mm[:] = 0.0
        mm.flush()
        mask = np.zeros(n_days, dtype=bool)
        np.save(MASK_PATH, mask)
    else:
        mm = np.memmap(RAW_MEMMAP_PATH, dtype=np.float32, mode="r+", shape=shape)
        mask = np.load(MASK_PATH) if MASK_PATH.exists() else np.zeros(n_days, dtype=bool)

    missing_indices = [i for i in range(n_days) if not mask[i]]
    print(f"Already downloaded: {int(mask.sum())}/{n_days}. Remaining: {len(missing_indices)}", flush=True)

    if missing_indices:
        print("Authenticating with NASA Earthdata...", flush=True)
        auth = earthaccess.login(strategy="environment")
        if not auth.authenticated:
            raise RuntimeError("Earthdata login failed. Ensure EARTHDATA_TOKEN or credentials in .env.")
        session = earthaccess.get_requests_https_session()

        def fetch_day(day_idx: int) -> Tuple[int, np.ndarray | None]:
            d_str = all_dates[day_idx]
            clean_date = d_str.replace("-", "")
            granule = f"GPM_3IMERGDF.07%3A3B-DAY.MS.MRG.3IMERG.{clean_date}-S000000-E235959.V07B.nc4"
            url = (
                f"https://opendap.earthdata.nasa.gov/collections/C2723754864-GES_DISC/granules/{granule}"
                f".dap?dap4.ce=/precipitation%5B0:1:0%5D%5B{LON_MIN_IDX}:1:{LON_MAX_IDX}%5D%5B{LAT_MIN_IDX}:1:{LAT_MAX_IDX}%5D"
            )
            for attempt in range(3):
                try:
                    r = session.get(url, timeout=20)
                    if r.status_code == 200:
                        idx = r.content.find(b"</Dataset>")
                        if idx != -1:
                            raw = r.content[idx + len(b"</Dataset>"):].lstrip(b"\r\n")
                            cursor = 0
                            data_chunks = []
                            while cursor < len(raw):
                                chunk_hdr = raw[cursor:cursor + 4]
                                if len(chunk_hdr) < 4:
                                    break
                                chunk_type = chunk_hdr[0]
                                chunk_len = int.from_bytes(chunk_hdr[1:4], "big")
                                chunk_data = raw[cursor + 4:cursor + 4 + chunk_len]
                                if chunk_type in [0x00, 0x04]:
                                    data_chunks.append(chunk_data)
                                cursor += 4 + chunk_len

                            all_data = b"".join(data_chunks)
                            if len(all_data) >= PAYLOAD_BYTES:
                                floats = struct.unpack(f"<{TOTAL_PIXELS}f", all_data[:PAYLOAD_BYTES])
                                arr_lon_lat = np.array(floats, dtype=np.float32).reshape((N_LON, N_LAT))
                                arr_lat_lon = arr_lon_lat.T.copy()
                                arr_lat_lon[arr_lat_lon < 0] = 0.0
                                return day_idx, arr_lat_lon
                    elif r.status_code == 404:
                        print(f"Warning: {d_str} returned 404 on server. Treating as 0.0.", flush=True)
                        return day_idx, np.zeros((N_LAT, N_LON), dtype=np.float32)
                    time.sleep(0.5 * (attempt + 1))
                except Exception:
                    time.sleep(0.5 * (attempt + 1))
            return day_idx, None

        chunk_size = 500
        for c_start in range(0, len(missing_indices), chunk_size):
            chunk = missing_indices[c_start:c_start + chunk_size]
            t0 = time.time()
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                results = list(executor.map(fetch_day, chunk))
            t1 = time.time()

            success_cnt = 0
            for day_idx, arr in results:
                if arr is not None:
                    mm[day_idx] = arr
                    mask[day_idx] = True
                    success_cnt += 1

            mm.flush()
            np.save(MASK_PATH, mask)
            print(f"Chunk {c_start//chunk_size + 1}/{(len(missing_indices)+chunk_size-1)//chunk_size}: "
                  f"processed {len(chunk)} days in {t1 - t0:.1f}s ({success_cnt} succeeded, total downloaded: {int(mask.sum())}/{n_days})", flush=True)

    # Save final compressed .npz archive
    print(f"Saving final compressed dataset to {FINAL_NPZ_PATH} ...", flush=True)
    full_precip = np.array(mm, dtype=np.float32)
    np.savez_compressed(
        FINAL_NPZ_PATH,
        precipitation=full_precip,
        dates=np.array(all_dates),
        lats=LATS,
        lons=LONS,
    )
    file_size_mb = FINAL_NPZ_PATH.stat().st_size / (1024 * 1024)
    print(f"Saved {FINAL_NPZ_PATH} ({file_size_mb:.2f} MB)", flush=True)

    # Derive CSV series for all 64 districts
    derive_all_districts(all_dates, full_precip)


def derive_all_districts(dates: List[str], precip: np.ndarray):
    """Extract 0.1° nearest grid-point daily rainfall series for all 64 districts."""
    manifest_path = ROOT / "data" / "nasa_power" / "manifest_64.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    entries = manifest.get("entries", {})
    print(f"Extracting IMERG timeseries for {len(entries)} districts...", flush=True)

    for dist_id, meta in entries.items():
        lat = meta["lat"]
        lon = meta["lon"]

        lat_idx = int(np.argmin(np.abs(LATS - lat)))
        lon_idx = int(np.argmin(np.abs(LONS - lon)))

        series = precip[:, lat_idx, lon_idx]
        df = pd.DataFrame({
            "date": dates,
            "rainfall": np.round(series, 2),
        })

        out_csv = DATA_DIR / f"imerg_{dist_id}_2001_2024.csv"
        df.to_csv(out_csv, index=False)

    print(f"Successfully generated 64 district CSVs in {DATA_DIR}", flush=True)


_IMERG_CACHE = None

def get_field_imerg_series(lat: float, lon: float) -> pd.DataFrame:
    """Return daily rainfall time series (2001-2024) for any Bangladesh (lat, lon) from bd_imerg_daily.npz."""
    global _IMERG_CACHE
    if _IMERG_CACHE is None:
        if not FINAL_NPZ_PATH.exists():
            raise FileNotFoundError(f"IMERG daily archive not found at {FINAL_NPZ_PATH}")
        _IMERG_CACHE = np.load(FINAL_NPZ_PATH)

    lats = _IMERG_CACHE["lats"]
    lons = _IMERG_CACHE["lons"]
    dates = _IMERG_CACHE["dates"]
    precip = _IMERG_CACHE["precipitation"]

    lat_idx = int(np.argmin(np.abs(lats - lat)))
    lon_idx = int(np.argmin(np.abs(lons - lon)))

    series = precip[:, lat_idx, lon_idx]
    return pd.DataFrame({
        "date": dates,
        "rainfall": np.round(series, 2),
    })


if __name__ == "__main__":
    run_download(max_workers=35)
