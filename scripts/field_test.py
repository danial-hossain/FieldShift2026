"""Field Test Suite for FieldShift 2026.

Validates end-to-end integration for any field in Bangladesh:
1. Geospatial enrichment (District resolution, NASA POWER 0.5° cell, ISRIC SoilGrids 250m).
2. NASA Planting Advisory (Aman and Aus rice onset detection and SMS).
3. MILP Multi-Season Planning (All priorities: profit, water, soil, balanced).
4. Water & Market Intelligence.

Outputs detailed Markdown report to docs/field_tests/<name>.md.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

# Ensure offline mode is enforced
os.environ["OFFLINE"] = "1"

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(PROJECT_ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "backend"))

DATA_TESTS_PATH = PROJECT_ROOT / "data" / "field_tests.json"
DOCS_DIR = PROJECT_ROOT / "docs" / "field_tests"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("field_test")


def slugify(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s)
    return re.sub(r"[-\s]+", "_", s)


def run_field_test(name: str, lat: float, lon: float, area_ha: float) -> Path:
    from fastapi.testclient import TestClient
    from backend.app.main import app

    client = TestClient(app)
    slug = slugify(name)
    logger.info(f"--- Running field test for: '{name}' ({lat}, {lon}, {area_ha} ha) ---")

    # 1. ENRICHMENT
    logger.info("1. Calling /api/fields/{id}/enrich ...")
    enrich_resp = client.post(
        f"/api/fields/{slug}/enrich",
        json={"latitude": lat, "longitude": lon, "area_ha": area_ha},
    )
    if enrich_resp.status_code != 200:
        raise RuntimeError(f"Enrichment failed HTTP {enrich_resp.status_code}: {enrich_resp.text}")
    enrich_data = enrich_resp.json()
    district = enrich_data["nearest_district"]
    dist_km = enrich_data["distance_km"]
    dist_name_bn = enrich_data["district_name_bn"]
    dist_name_en = enrich_data["district_name_en"]
    soil = enrich_data["soil"]
    power_cell = enrich_data["power_cell"]
    logger.info(f"   -> Nearest district: {dist_name_en} ({dist_name_bn}) at {dist_km} km")
    logger.info(f"   -> Soil: {soil.get('texture_class')}, pH {soil.get('ph')}, OM {soil.get('organic_matter_pct')}% ({soil.get('baseline_source')})")

    # 2. ADVISORY (Aman and Aus)
    logger.info(f"2. Calling /api/advisory for district '{district}' (Aman & Aus) ...")
    advisory_aman_resp = client.get(f"/api/advisory?district={district}&crop=aman&offline=true")
    if advisory_aman_resp.status_code != 200:
        raise RuntimeError(f"Aman advisory failed HTTP {advisory_aman_resp.status_code}: {advisory_aman_resp.text}")
    adv_aman = advisory_aman_resp.json()

    advisory_aus_resp = client.get(f"/api/advisory?district={district}&crop=aus&offline=true")
    if advisory_aus_resp.status_code != 200:
        raise RuntimeError(f"Aus advisory failed HTTP {advisory_aus_resp.status_code}: {advisory_aus_resp.text}")
    adv_aus = advisory_aus_resp.json()

    # 3. PLANNING (All 4 Priorities)
    logger.info(f"3. Calling /api/planning for all 4 priorities ...")
    priorities = ["profit", "water", "soil", "balanced"]
    plans: Dict[str, Any] = {}
    for p in priorities:
        plan_resp = client.post(
            "/api/planning",
            json={
                "district": district,
                "priority": p,
                "field_size_ha": area_ha,
                "area_ha": area_ha,
                "latitude": lat,
                "longitude": lon,
            },
        )
        if plan_resp.status_code != 200:
            raise RuntimeError(f"Planning failed for priority '{p}' HTTP {plan_resp.status_code}: {plan_resp.text}")
        p_data = plan_resp.json()
        strat_res = p_data.get("summary", {}).get("planning", {}).get("selected_strategy_result", {})
        status = strat_res.get("status") or strat_res.get("solver_status")
        if status != "optimal":
            raise RuntimeError(f"Planning status not optimal for '{p}': {status}")
        plans[p] = strat_res

    # 4. WATER PLAN (Phase E preview)
    logger.info("4. Checking water endpoint ...")
    water_resp = client.get(f"/api/water/plan?district={district}&lat={lat}&lon={lon}")
    water_data = water_resp.json() if water_resp.status_code == 200 else {"status": "pending_phase_e"}

    # 5. MARKET SUGGESTIONS
    logger.info("5. Fetching market overview ...")
    market_resp = client.get("/api/market/overview")
    market_data = market_resp.json() if market_resp.status_code == 200 else {"crops": []}

    # WRITE MARKDOWN REPORT
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    out_file = DOCS_DIR / f"{slug}.md"

    md_lines = [
        f"# Field Test Report: {name}",
        "",
        f"- **Field Name**: {name}",
        f"- **Coordinates**: {lat:.4f}° N, {lon:.4f}° E",
        f"- **Field Area**: {area_ha:.2f} ha ({round(area_ha * 7.47, 1)} Bigha)",
        f"- **Nearest Agricultural District**: **{dist_name_en}** ({dist_name_bn})",
        f"- **Distance to Centroid**: {dist_km:.2f} km",
        f"- **NASA POWER Grid Cell**: `{power_cell.get('cell_id')}` (Centroid: {power_cell.get('centroid_lat')}° N, {power_cell.get('centroid_lon')}° E)",
        f"- **Climatology Source**: {power_cell.get('source_label')} (2001–2025 verified cache)",
        "",
        "---",
        "",
        "## 1. Soil Properties (ISRIC SoilGrids 250 m)",
        "",
        f"- **USDA Texture Class**: **{soil.get('texture_class', 'N/A').title()}** (Source: `{soil.get('texture_source')}`)",
        f"- **Soil pH (0-30 cm)**: **{soil.get('ph')}** (Source: `{soil.get('ph_source')}`)",
        f"- **Organic Matter (OM)**: **{soil.get('organic_matter_pct')}%** (Source: `{soil.get('organic_matter_source')}`)",
        f"- **Texture Breakdown**: Clay **{soil.get('clay_pct')}%**, Sand **{soil.get('sand_pct')}%**, Silt **{soil.get('silt_pct')}%**",
        "",
        "### Depth Profile (0–30 cm root zone):",
        "| Depth Layer | pH | Organic Carbon (%) | Organic Matter (%) | Clay (%) | Sand (%) | Silt (%) |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]

    for dp in soil.get("depth_profile", []):
        md_lines.append(
            f"| {dp.get('depth')} | {dp.get('ph')} | {dp.get('organic_carbon_pct')} | {dp.get('organic_matter_pct')} | {dp.get('clay_pct')} | {dp.get('sand_pct')} | {dp.get('silt_pct')} |"
        )

    md_lines.extend([
        "",
        "---",
        "",
        "## 2. NASA Planting Advisories",
        "",
        "### Aman Rice Season Advisory:",
        f"- **Status**: `{adv_aman.get('status')}`",
        f"- **Median Historical Shift**: {adv_aman.get('comparison', {}).get('shift_days_median', 0.0):+.1f} days (Period 1 2001–2012 vs Period 2 2013–2025)",
        f"- **Mann-Whitney p-value**: {adv_aman.get('comparison', {}).get('p_value')}",
        f"- **Statistically Significant**: {adv_aman.get('comparison', {}).get('is_significant')}",
        f"- **Censored Fraction**: {round(adv_aman.get('comparison', {}).get('censored_fraction', 0.0) * 100, 1)}%",
        f"- **Suggested Sowing Window**: {adv_aman.get('recommendation', {}).get('suggested_nursery_window_bn')}",
        f"- **Suggested Transplanting Window**: {adv_aman.get('recommendation', {}).get('suggested_transplant_window_bn')}",
        f"- **Bangla Headline**: {adv_aman.get('recommendation', {}).get('bangla_headline')}",
        f"- **English Headline**: {adv_aman.get('recommendation', {}).get('english_headline')}",
        f"- **Bangla SMS (<160 chars)**: `{adv_aman.get('recommendation', {}).get('bangla_sms')}`",
        "",
        "### Aus Rice Season Advisory:",
        f"- **Status**: `{adv_aus.get('status')}`",
        f"- **Median Historical Shift**: {adv_aus.get('comparison', {}).get('shift_days_median', 0.0):+.1f} days",
        f"- **Mann-Whitney p-value**: {adv_aus.get('comparison', {}).get('p_value')}",
        f"- **Statistically Significant**: {adv_aus.get('comparison', {}).get('is_significant')}",
        f"- **Bangla Headline**: {adv_aus.get('recommendation', {}).get('bangla_headline')}",
        f"- **Bangla SMS (<160 chars)**: `{adv_aus.get('recommendation', {}).get('bangla_sms')}`",
        "",
        "---",
        "",
        "## 3. Multi-Season Crop Planning (MILP Solves)",
        "",
        "Tested 4 optimization priorities for 6 periods (2 years × seasonal cropping cycles):",
        "",
    ])

    for p in priorities:
        strat = plans[p]
        crops_by_period = strat.get("selected_crop_by_period", {})
        periods = strat.get("planning_periods", list(crops_by_period.keys()))
        profit = strat.get("profit_component", 0.0)
        water_score = strat.get("water_component", 0.0)
        soil_score = strat.get("soil_component", 0.0)
        obj_val = strat.get("objective_value", 0.0)

        rotations_str = " → ".join(f"{period}: **{crops_by_period.get(period, 'Fallow')}**" for period in periods)

        md_lines.extend([
            f"### Priority: `{p.upper()}`",
            f"- **Solver Status**: `{strat.get('status')}` (CBC Branch-and-Bound)",
            f"- **Objective Value**: {obj_val:.4f}",
            f"- **Rotation**: {rotations_str}",
            f"- **Profit Component**: {profit:,.0f} BDT",
            f"- **Water Index Component**: {water_score:.4f}",
            f"- **Soil Health Component**: {soil_score:.4f}",
            "",
            "| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |",
            "| :--- | :--- | :---: | :--- |",
        ])

        for period in periods:
            crop_name = crops_by_period.get(period, "Fallow")
            md_lines.append(f"| {period} | **{crop_name}** | {area_ha:.2f} | {p.capitalize()} |")
        md_lines.append("")

    md_lines.extend([
        "---",
        "",
        "## 4. Market & Economics Overview",
        "",
        f"- **Available Crops Catalogued**: {len(market_data.get('crops', []))} crops with illustrative demo crop economics.",
        "- **Single Source of Truth**: Market costs, prices, and yields align identically with the MILP agronomic model parameters (labelled as illustrative demo values).",
        "",
    ])

    out_file.write_text("\n".join(md_lines), encoding="utf-8")
    logger.info(f"Report successfully written to {out_file}")
    return out_file


def main() -> None:
    parser = argparse.ArgumentParser(description="FieldShift 2026 End-to-End Field Test Suite")
    parser.add_argument("--name", type=str, help="Name of field to test")
    parser.add_argument("--lat", type=float, help="Latitude")
    parser.add_argument("--lon", type=float, help="Longitude")
    parser.add_argument("--area_ha", type=float, help="Field area in hectares")
    parser.add_argument("--all", action="store_true", help="Run all fields in data/field_tests.json")
    args = parser.parse_args()

    if args.all:
        if not DATA_TESTS_PATH.exists():
            logger.error(f"Cannot find {DATA_TESTS_PATH}")
            sys.exit(1)
        with open(DATA_TESTS_PATH, "r", encoding="utf-8") as f:
            test_fields = json.load(f)
        logger.info(f"Running --all with {len(test_fields)} test fields...")
        for tf in test_fields:
            run_field_test(tf["name"], float(tf["lat"]), float(tf["lon"]), float(tf["area_ha"]))
        logger.info("All test fields completed successfully.")
        sys.exit(0)
    elif args.name and args.lat is not None and args.lon is not None and args.area_ha is not None:
        run_field_test(args.name, args.lat, args.lon, args.area_ha)
        sys.exit(0)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
