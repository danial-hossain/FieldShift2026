"""Fetch NASA SMAP Level-4 SPL4SMGP Root-Zone Soil Moisture subsets via earthaccess + OPeNDAP

and extract genuine soil moisture observations for Bangladesh fields.
"""

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

RAW_DIR = Path("data/smap/raw")
PROCESSED_FILE = Path("data/smap/smap_field_moisture.json")
SHORT_NAME = "SPL4SMGP"

FIELDS = {
    "dinajpur": {"name": "Dinajpur Sadar", "lat": 25.6279, "lon": 88.6332, "row": 460, "col": 2877},
    "bogura": {"name": "Bogura demo", "lat": 24.85, "lon": 89.37, "row": 470, "col": 2885},
    "satkhira": {"name": "Satkhira coast", "lat": 22.7185, "lon": 89.0705, "row": 498, "col": 2882},
    "sunamganj": {"name": "Sunamganj haor", "lat": 25.0658, "lon": 91.3950, "row": 468, "col": 2907},
}

SAMPLE_DATES = [
    ("2023-01-15", "2023-01-16", "Winter Rabi"),
    ("2023-04-15", "2023-04-16", "Pre-monsoon Kharif-1 Dry"),
    ("2023-07-15", "2023-07-16", "Monsoon Kharif-2 Wet"),
    ("2023-10-15", "2023-10-16", "Post-monsoon Transition"),
    ("2024-01-15", "2024-01-16", "Winter Rabi 2024"),
    ("2024-04-15", "2024-04-16", "Pre-monsoon Dry 2024"),
]


def fetch_smap_subsets():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    import earthaccess
    earthaccess.login(strategy="environment")
    session = earthaccess.get_requests_https_session()

    manifest = []
    field_observations = {k: [] for k in FIELDS}

    print(f"[SMAP] Querying {len(SAMPLE_DATES)} seasonal timepoints via OPeNDAP...")

    for start_d, end_d, season_label in SAMPLE_DATES:
        try:
            results = earthaccess.search_data(
                short_name=SHORT_NAME,
                temporal=(start_d, end_d),
                count=1,
            )
            if not results:
                print(f"[SMAP] No granule found for {start_d}")
                continue

            g = results[0]
            granule_id = g["umm"]["GranuleUR"]
            # Find OPeNDAP URL
            opendap_url = None
            for u in g["umm"].get("RelatedUrls", []):
                if u.get("Subtype") == "OPENDAP DATA" or "opendap" in u.get("URL", "").lower():
                    opendap_url = u["URL"]
                    break

            if not opendap_url:
                print(f"[SMAP] No OPeNDAP URL for {granule_id}")
                continue

            # Query Bangladesh bbox: rows 448 to 530, cols 2870 to 2925
            req_url = f"{opendap_url}.csv?/Geophysical_Data/sm_rootzone[448:2:530][2870:2:2925]"
            resp = session.get(req_url, timeout=30)
            if resp.status_code != 200:
                print(f"[SMAP] OPeNDAP returned status {resp.status_code}: {resp.text[:100]}")
                continue

            raw_filename = f"{granule_id}_bd_subset.csv"
            raw_path = RAW_DIR / raw_filename
            with open(raw_path, "wb") as f:
                f.write(resp.content)

            sha256 = hashlib.sha256(resp.content).hexdigest()
            manifest.append({
                "granule_id": granule_id,
                "date": start_d,
                "season": season_label,
                "filename": raw_filename,
                "size_bytes": len(resp.content),
                "sha256": sha256,
                "url": req_url,
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
            })

            # Also query point values for the 4 fields
            for fid, finfo in FIELDS.items():
                pt_url = f"{opendap_url}.csv?/Geophysical_Data/sm_rootzone[{finfo['row']}][{finfo['col']}]"
                pt_resp = session.get(pt_url, timeout=20)
                if pt_resp.status_code == 200:
                    lines = pt_resp.text.strip().split("\n")
                    if len(lines) >= 2:
                        val_str = lines[-1].split(",")[-1].strip()
                        try:
                            val = float(val_str)
                            if val > -100:
                                field_observations[fid].append({
                                    "date": start_d,
                                    "season": season_label,
                                    "sm_rootzone_m3_m3": round(val, 4),
                                })
                        except ValueError:
                            pass

            print(f"[SMAP] Successfully downloaded subset for {start_d} ({granule_id})")

        except Exception as e:
            print(f"[SMAP] Error fetching {start_d}: {e}")

    with open(RAW_DIR / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    derived = {
        "product": "NASA SMAP Level-4 Global 9 km Surface and Root-Zone Soil Moisture (SPL4SMGP)",
        "source": "NASA NSIDC DAAC / Earthdata Cloud via OPeNDAP",
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "total_granules_subsetted": len(manifest),
        "field_observations": field_observations,
        "summary": {
            k: {
                "field_name": FIELDS[k]["name"],
                "latitude": FIELDS[k]["lat"],
                "longitude": FIELDS[k]["lon"],
                "pre_monsoon_mean_m3_m3": round(
                    sum(o["sm_rootzone_m3_m3"] for o in field_observations[k] if "Pre-monsoon" in o["season"])
                    / max(1, len([o for o in field_observations[k] if "Pre-monsoon" in o["season"]])),
                    4,
                ) if any("Pre-monsoon" in o["season"] for o in field_observations[k]) else None,
                "monsoon_mean_m3_m3": round(
                    sum(o["sm_rootzone_m3_m3"] for o in field_observations[k] if "Monsoon" in o["season"])
                    / max(1, len([o for o in field_observations[k] if "Monsoon" in o["season"]])),
                    4,
                ) if any("Monsoon" in o["season"] for o in field_observations[k]) else None,
            }
            for k in FIELDS
        },
    }

    with open(PROCESSED_FILE, "w", encoding="utf-8") as f:
        json.dump(derived, f, indent=2)

    print(f"[SMAP] Processed observations written to {PROCESSED_FILE}")


def main():
    fetch_smap_subsets()


if __name__ == "__main__":
    main()
