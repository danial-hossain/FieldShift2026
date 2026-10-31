"""scripts/fetch_faostat_bd.py
Downloads official FAOSTAT Production (QCL) and Trade (TCL) bulk datasets for Bangladesh (Area Code 16).
Caches raw downloads under data/market/raw/ and regenerates data/market/faostat_bd.csv.
"""

from __future__ import annotations

import io
import json
import logging
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("fetch_faostat_bd")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = PROJECT_ROOT / "data" / "market" / "raw"
OUTPUT_FILE = PROJECT_ROOT / "data" / "market" / "faostat_bd.csv"

QCL_URL = "https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_All_Data.zip"
TCL_URL = "https://bulks-faostat.fao.org/production/Trade_CropsLivestock_E_All_Data.zip"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

# Mapping of FieldShift catalogue crop names to FAOSTAT items and codes
CROP_MAPPINGS = [
    {"crop": "Chickpea", "item": "Chick peas, dry", "item_code": 191, "tcl_item_code": 191},
    {"crop": "Soybean", "item": "Soya beans", "item_code": 236, "tcl_item_code": 236},
    {"crop": "Wheat", "item": "Wheat", "item_code": 15, "tcl_item_code": 15},
    {"crop": "Mustard", "item": "Rape or colza seed", "item_code": 270, "tcl_item_code": 270},
    {"crop": "Sunflower", "item": "Sunflower seed", "item_code": 267, "tcl_item_code": 267},
    {"crop": "Lentil", "item": "Lentils, dry", "item_code": 201, "tcl_item_code": 201},
    {"crop": "Sesame", "item": "Sesame seed", "item_code": 289, "tcl_item_code": 289},
    {"crop": "Groundnut", "item": "Groundnuts, excluding shelled", "item_code": 242, "tcl_item_code": 242},
    {"crop": "Sorghum", "item": "Sorghum", "item_code": 83, "tcl_item_code": 83},
    {"crop": "Maize", "item": "Maize (corn)", "item_code": 56, "tcl_item_code": 56},
    {"crop": "Tomato", "item": "Tomatoes", "item_code": 388, "tcl_item_code": 388},
    {"crop": "Rice", "item": "Rice", "item_code": 27, "tcl_item_code": 31},
    {"crop": "Potato", "item": "Potatoes", "item_code": 116, "tcl_item_code": 116},
    {"crop": "Jute", "item": "Jute, raw or retted", "item_code": 780, "tcl_item_code": 780},
]


def download_and_extract_bangladesh(url: str, filename_zip: str, filename_raw_csv: str) -> pd.DataFrame:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = RAW_DIR / filename_zip
    raw_csv_path = RAW_DIR / filename_raw_csv

    if not zip_path.exists():
        logger.info(f"Downloading {url} ...")
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = resp.read()
        zip_path.write_bytes(data)
        logger.info(f"Saved {zip_path} ({len(data):,} bytes)")

    if not raw_csv_path.exists():
        logger.info(f"Extracting Bangladesh records from {zip_path} ...")
        with zipfile.ZipFile(zip_path) as z:
            csv_name = [n for n in z.namelist() if n.endswith(".csv") and "Flags" not in n][0]
            with z.open(csv_name) as f:
                df = pd.read_csv(f, encoding="latin-1", low_memory=False)
                bd = df[(df["Area Code"] == 16) | (df["Area"] == "Bangladesh")]
                bd.to_csv(raw_csv_path, index=False)
                logger.info(f"Extracted and saved {len(bd)} Bangladesh rows to {raw_csv_path}")

    return pd.read_csv(raw_csv_path, low_memory=False)


def get_value_for_year(df: pd.DataFrame, item_code: int, element_name: str, year: str) -> float:
    sub = df[(df["Item Code"] == item_code) & (df["Element"] == element_name)]
    if sub.empty:
        return 0.0
    val = sub.iloc[0].get(f"Y{year}")
    if pd.notna(val) and val != "":
        try:
            return float(val)
        except (ValueError, TypeError):
            return 0.0
    return 0.0


def generate_faostat_bd_csv(target_year: str = "2023"):
    logger.info("--- Starting FAOSTAT Bangladesh Data Ingestion ---")
    qcl = download_and_extract_bangladesh(QCL_URL, "Production_Crops_Livestock_E_All_Data.zip", "faostat_qcl_bangladesh_raw.csv")
    tcl = download_and_extract_bangladesh(TCL_URL, "Trade_CropsLivestock_E_All_Data.zip", "faostat_tcl_bangladesh_raw.csv")

    records = []
    download_ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")

    for mapping in CROP_MAPPINGS:
        crop = mapping["crop"]
        icode = mapping["item_code"]
        tcode = mapping["tcl_item_code"]
        iname = mapping["item"]

        prod = get_value_for_year(qcl, icode, "Production", target_year)
        imp = get_value_for_year(tcl, tcode, "Import quantity", target_year)
        exp = get_value_for_year(tcl, tcode, "Export quantity", target_year)

        # In case year 2023 was 0, check 2022
        if prod == 0.0 and imp == 0.0:
            prod = get_value_for_year(qcl, icode, "Production", "2022")
            imp = get_value_for_year(tcl, tcode, "Import quantity", "2022")
            exp = get_value_for_year(tcl, tcode, "Export quantity", "2022")

        domestic_supply = max(0.0, prod + imp - exp)
        self_suff = round(prod / domestic_supply, 4) if domestic_supply > 0 else 1.0000
        import_dep = round(imp / domestic_supply, 4) if domestic_supply > 0 else 0.0000

        records.append({
            "crop": crop,
            "faostat_item_code": icode,
            "faostat_item_name": iname,
            "year": target_year,
            "production_tonnes": int(round(prod)),
            "import_tonnes": int(round(imp)),
            "export_tonnes": int(round(exp)),
            "domestic_supply_tonnes": int(round(domestic_supply)),
            "self_sufficiency_ratio": self_suff,
            "import_dependency_ratio": import_dep,
            "national_deficit_rank": 0,
            "source": f"FAOSTAT Bangladesh (Area 16) QCL & TCL {target_year}",
            "download_date": download_ts,
        })

    # Sort deficit crops by import dependency descending
    records.sort(key=lambda r: r["import_dependency_ratio"], reverse=True)
    for rank, r in enumerate(records, start=1):
        r["national_deficit_rank"] = rank

    out_df = pd.DataFrame(records)
    out_df.to_csv(OUTPUT_FILE, index=False)
    logger.info(f"Successfully generated {OUTPUT_FILE} with {len(out_df)} crops from real FAOSTAT downloads.")
    print("\n--- Downloaded FAOSTAT Bangladesh Table Head ---")
    print(out_df[["crop", "faostat_item_code", "year", "production_tonnes", "import_tonnes", "export_tonnes", "self_sufficiency_ratio", "import_dependency_ratio", "national_deficit_rank"]].to_string())
    return out_df


if __name__ == "__main__":
    generate_faostat_bd_csv()
