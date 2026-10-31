"""Fetch NASA GRACE / GRACE-FO Level-3 JPL RL06.3M Mascon CRI NetCDF via earthaccess

and extract genuine terrestrial water storage trends for Bangladesh.
"""

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
from dotenv import load_dotenv
import h5py
import numpy as np

load_dotenv()

RAW_DIR = Path("data/grace/raw")
PROCESSED_FILE = Path("data/grace/grace_bangladesh_trends.json")
SHORT_NAME = "TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4"


def fetch_raw_grace():
    """Download GRACE mascon granule via earthaccess if not already present."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    nc_files = list(RAW_DIR.glob("*.nc"))
    if nc_files:
        print(f"[GRACE] Found existing raw netCDF: {nc_files[0]}")
        raw_path = nc_files[0]
    else:
        import earthaccess
        earthaccess.login(strategy="environment")
        print("[GRACE] Searching for JPL Mascon RL06.3...")
        results = earthaccess.search_data(short_name=SHORT_NAME, count=1)
        if not results:
            raise RuntimeError(f"No granules found for {SHORT_NAME}")
        print(f"[GRACE] Downloading {results[0]['umm']['GranuleUR']} ({results[0].size:.1f} MB)...")
        downloaded = earthaccess.download(results, str(RAW_DIR))
        raw_path = Path(downloaded[0])

    # Compute sha256 manifest
    sha256 = hashlib.sha256()
    with open(raw_path, "rb") as f:
        while chunk := f.read(1024 * 1024):
            sha256.update(chunk)
    manifest = {
        "granule_id": raw_path.name,
        "local_file": str(raw_path),
        "size_bytes": raw_path.stat().st_size,
        "sha256": sha256.hexdigest(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "dataset_short_name": SHORT_NAME,
        "source": "NASA PO.DAAC Earthdata Cloud",
    }
    with open(RAW_DIR / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[GRACE] Manifest written to {RAW_DIR / 'manifest.json'}")
    return raw_path


def process_grace_data(raw_path: Path):
    """Process NetCDF using h5py and compute true regional TWS trends."""
    with h5py.File(raw_path, "r") as f:
        lat = f["lat"][:]
        lon = f["lon"][:]
        time = f["time"][:]  # Days since 2002-01-01T00:00:00Z
        lwe = f["lwe_thickness"]  # shape (time, lat, lon), cm equivalent water height

        # Convert time to calendar dates
        # Base date is 2002-01-01
        base_dt = datetime(2002, 1, 1)
        dates = []
        for t in time:
            dt = base_dt + np.timedelta64(int(round(t)), "D").astype("timedelta64[s]").item()
            dates.append(dt)

        # Regional definitions
        regions = {
            "bangladesh_all": {"lat": (20.5, 26.5), "lon": (88.0, 92.8)},
            "northwest_barind": {"lat": (24.0, 26.5), "lon": (88.0, 89.8)},
            "haor_wetland": {"lat": (24.2, 25.5), "lon": (90.8, 92.5)},
            "coastal_south": {"lat": (21.5, 23.2), "lon": (88.8, 90.5)},
        }

        trends = {}
        regional_series = {k: [] for k in regions}

        time_years = (time - time[0]) / 365.25

        for reg_name, bounds in regions.items():
            lat_min, lat_max = bounds["lat"]
            lon_min, lon_max = bounds["lon"]
            lat_idx = np.where((lat >= lat_min) & (lat <= lat_max))[0]
            lon_idx = np.where((lon >= lon_min) & (lon <= lon_max))[0]

            sub_lwe = lwe[:, lat_idx, :][:, :, lon_idx]
            reg_mean = np.nanmean(sub_lwe, axis=(1, 2))
            regional_series[reg_name] = reg_mean.tolist()

            # Linear trend in cm / year
            valid = ~np.isnan(reg_mean)
            if np.sum(valid) > 10:
                p = np.polyfit(time_years[valid], reg_mean[valid], 1)
                trends[reg_name] = round(float(p[0]), 2)
            else:
                trends[reg_name] = None

        # Build monthly records
        monthly_time_series = []
        for i, dt in enumerate(dates):
            monthly_time_series.append({
                "date": dt.strftime("%Y-%m"),
                "year": dt.year,
                "month": dt.month,
                "nw_barind_tws_cm": round(float(regional_series["northwest_barind"][i]), 2),
                "haor_wetland_tws_cm": round(float(regional_series["haor_wetland"][i]), 2),
                "coastal_south_tws_cm": round(float(regional_series["coastal_south"][i]), 2),
                "bangladesh_mean_tws_cm": round(float(regional_series["bangladesh_all"][i]), 2),
            })

    output = {
        "product": "NASA GRACE / GRACE-FO Level-3 JPL RL06.3M Mascon (0.5 CRI grid)",
        "source": "NASA PO.DAAC / JPL Earthdata Cloud",
        "raw_file": raw_path.name,
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "temporal_coverage": f"{monthly_time_series[0]['date']} to {monthly_time_series[-1]['date']}",
        "total_monthly_observations": len(monthly_time_series),
        "trends_cm_per_year": trends,
        "interpretation": {
            "northwest_barind": "Critical groundwater storage depletion due to deep tubewell Boro abstraction; high water-scarcity weight required.",
            "haor_wetland": "Hydrologically resilient surface-water basin with annual monsoon replenishment; low water-scarcity constraint.",
            "coastal_south": "Moderate decline with dry-season tidal salinity vulnerability; sweet-water conservation priority.",
        },
        "fields": {
            "Bogura demo": {
                "trend_cm_yr": trends.get("northwest_barind"),
                "status": "Severe Depletion" if (trends.get("northwest_barind") or 0) < -0.8 else "Moderate Depletion",
                "water_saving_priority": "High (Weight 1.5x)",
            },
            "Dinajpur Sadar": {
                "trend_cm_yr": trends.get("northwest_barind"),
                "status": "Severe Depletion" if (trends.get("northwest_barind") or 0) < -0.8 else "Moderate Depletion",
                "water_saving_priority": "High (Weight 1.5x)",
            },
            "Sunamganj haor": {
                "trend_cm_yr": trends.get("haor_wetland"),
                "status": "Stable Basin" if abs(trends.get("haor_wetland") or 0) < 0.5 else "Moderate Depletion",
                "water_saving_priority": "Low (Normal)",
            },
            "Satkhira coast": {
                "trend_cm_yr": trends.get("coastal_south"),
                "status": "Vulnerable / Saline",
                "water_saving_priority": "Moderate (Sweetwater buffer)",
            },
        },
        "monthly_time_series": monthly_time_series,
    }

    PROCESSED_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PROCESSED_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    print(f"[GRACE] Processed trends written to {PROCESSED_FILE} (trends: {trends})")


def main():
    raw_path = fetch_raw_grace()
    process_grace_data(raw_path)


if __name__ == "__main__":
    main()
