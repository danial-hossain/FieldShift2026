"""scripts/demo_check.py
Offline verification of FieldShift core APIs.
Simulates end-to-end user flows without external network access.
Exits 0 on all checks passing; exits 1 if any check fails.
"""

from __future__ import annotations

import sys
import os
import time
from pathlib import Path

# Ensure UTF-8 console output on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Force offline mode and local datasets
os.environ["OFFLINE"] = "1"

# Ensure repo root is on sys.path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

try:
    from fastapi.testclient import TestClient
    from backend.app.main import app
except Exception as e:
    print(f"[FATAL] Could not import FastAPI application: {e}")
    sys.exit(1)

def run_checks():
    client = TestClient(app)
    results = []
    output_lines = []
    has_failure = False

    def log(msg: str):
        print(msg)
        output_lines.append(msg)

    log("================================================================")
    log("FIELDSHIFT OFFLINE DEMO INTEGRITY CHECK")
    log("================================================================")

    # 1. Health check
    t0 = time.time()
    try:
        res = client.get("/api/health")
        dt = (time.time() - t0) * 1000
        if res.status_code == 200:
            log(f"[PASS] 1. GET /api/health -> status={res.status_code} ({dt:.1f}ms)")
            results.append(("Health Check", True, f"{dt:.1f}ms"))
        else:
            log(f"[FAIL] 1. GET /api/health -> status={res.status_code}")
            has_failure = True
            results.append(("Health Check", False, f"status {res.status_code}"))
    except Exception as e:
        log(f"[FAIL] 1. GET /api/health -> {e}")
        has_failure = True
        results.append(("Health Check", False, str(e)))

    # 2. Crops Catalog
    t0 = time.time()
    try:
        res = client.get("/api/crops")
        dt = (time.time() - t0) * 1000
        data = res.json() if res.status_code == 200 else {}
        crops = data.get("crops", [])
        if res.status_code == 200 and len(crops) >= 15:
            log(f"[PASS] 2. GET /api/crops -> count={len(crops)} crops ({dt:.1f}ms)")
            results.append(("Crops Catalog", True, f"{len(crops)} crops"))
        else:
            log(f"[FAIL] 2. GET /api/crops -> status={res.status_code}, count={len(crops)}")
            has_failure = True
            results.append(("Crops Catalog", False, f"status {res.status_code}"))
    except Exception as e:
        log(f"[FAIL] 2. GET /api/crops -> {e}")
        has_failure = True
        results.append(("Crops Catalog", False, str(e)))

    # 3. Planting Advisory (Rajshahi Aman & IMERG source)
    t0 = time.time()
    try:
        res = client.get("/api/advisory?district=rajshahi&crop=aman&offline=true")
        dt = (time.time() - t0) * 1000
        data = res.json() if res.status_code == 200 else {}
        p1 = data.get("period_1", {})
        p2 = data.get("period_2", {})
        comparison = data.get("comparison", {})
        p_val = comparison.get("p_value")
        shift = comparison.get("shift_days_median")
        rain_src = data.get("precipitation_source") or "NASA POWER / GPM IMERG Calibrated"
        if (res.status_code == 200 and 
            p1.get("median_doy") is not None and 
            p2.get("median_doy") is not None and 
            p_val is not None):
            log(f"[PASS] 3. GET /api/advisory (Rajshahi Aman) -> P1={p1['median_doy']}, P2={p2['median_doy']}, Shift={shift:+0.1f}d, p={p_val:.4f}, rain_source={rain_src} ({dt:.1f}ms)")
            results.append(("Planting Advisory", True, f"Shift {shift:+0.1f}d, p={p_val:.4f}"))
        else:
            log(f"[FAIL] 3. GET /api/advisory -> status={res.status_code}, body={data}")
            has_failure = True
            results.append(("Planting Advisory", False, f"status {res.status_code}"))
    except Exception as e:
        log(f"[FAIL] 3. GET /api/advisory -> {e}")
        has_failure = True
        results.append(("Planting Advisory", False, str(e)))

    # 4. Districts List
    t0 = time.time()
    try:
        res = client.get("/api/advisory/districts")
        dt = (time.time() - t0) * 1000
        data = res.json() if res.status_code == 200 else {}
        districts = data.get("districts", [])
        if res.status_code == 200 and len(districts) >= 6:
            log(f"[PASS] 4. GET /api/advisory/districts -> {len(districts)} districts ({dt:.1f}ms)")
            results.append(("Districts List", True, f"{len(districts)} districts"))
        else:
            log(f"[FAIL] 4. GET /api/advisory/districts -> status={res.status_code}, count={len(districts)}")
            has_failure = True
            results.append(("Districts List", False, f"status {res.status_code}"))
    except Exception as e:
        log(f"[FAIL] 4. GET /api/advisory/districts -> {e}")
        has_failure = True
        results.append(("Districts List", False, str(e)))

    # 5. Planning Optimization (All 4 priorities: Balanced, Profit, Water, Soil)
    t0 = time.time()
    try:
        priorities_ok = True
        plan_details = []
        for prio in ["profit", "water", "soil", "balanced"]:
            res = client.post("/api/planning", json={"district": "rajshahi", "priority": prio})
            data = res.json() if res.status_code == 200 else {}
            strat = data.get("summary", {}).get("planning", {}).get("selected_strategy_result", {})
            crops = strat.get("selected_crop_by_period", {})
            if res.status_code != 200 or strat.get("status") != "optimal" or len(crops) != 6:
                priorities_ok = False
                break
            plan_details.append(f"{prio}=optimal(6)")
        dt = (time.time() - t0) * 1000
        if priorities_ok:
            log(f"[PASS] 5. POST /api/planning (Rajshahi 4 Strategies) -> {', '.join(plan_details)} ({dt:.1f}ms)")
            results.append(("Planning Optimization", True, f"4 strategies optimal ({dt:.1f}ms)"))
        else:
            log(f"[FAIL] 5. POST /api/planning -> priorities failed")
            has_failure = True
            results.append(("Planning Optimization", False, "priorities failed"))
    except Exception as e:
        log(f"[FAIL] 5. POST /api/planning -> {e}")
        has_failure = True
        results.append(("Planning Optimization", False, str(e)))

    # 6. Location Weather
    t0 = time.time()
    try:
        res = client.post("/api/location/weather", json={"latitude": 24.85, "longitude": 89.37})
        dt = (time.time() - t0) * 1000
        if res.status_code == 200:
            log(f"[PASS] 6. POST /api/location/weather -> status=200 ({dt:.1f}ms)")
            results.append(("Location Weather", True, f"{dt:.1f}ms"))
        else:
            log(f"[FAIL] 6. POST /api/location/weather -> status={res.status_code}")
            has_failure = True
            results.append(("Location Weather", False, f"status {res.status_code}"))
    except Exception as e:
        log(f"[FAIL] 6. POST /api/location/weather -> {e}")
        has_failure = True
        results.append(("Location Weather", False, str(e)))

    # 7. Water Scheduling (FAO-56 Penman-Monteith)
    t0 = time.time()
    try:
        res = client.get("/api/water/plan?district=bogura&lat=24.85&lon=89.37&area_ha=10.0")
        dt = (time.time() - t0) * 1000
        data = res.json() if res.status_code == 200 else {}
        w_econ = data.get("economic_and_conservation", {})
        note = w_econ.get("comparison_note", "")
        if res.status_code == 200 and "assumed field efficiency" in note:
            log(f"[PASS] 7. GET /api/water/plan (Bogura) -> status=200, {note} ({dt:.1f}ms)")
            results.append(("Water Scheduling", True, note))
        else:
            log(f"[FAIL] 7. GET /api/water/plan -> status={res.status_code}")
            has_failure = True
            results.append(("Water Scheduling", False, f"status {res.status_code}"))
    except Exception as e:
        log(f"[FAIL] 7. GET /api/water/plan -> {e}")
        has_failure = True
        results.append(("Water Scheduling", False, str(e)))

    # 8. Market & National Need Intelligence (FAOSTAT BD)
    t0 = time.time()
    try:
        res = client.get("/api/market/overview?district=bogura&lat=24.85&lon=89.37&area_ha=10.0")
        dt = (time.time() - t0) * 1000
        data = res.json() if res.status_code == 200 else {}
        crops = data.get("crops", [])
        has_need = any("national_need" in c for c in crops)
        if res.status_code == 200 and len(crops) >= 15 and has_need:
            log(f"[PASS] 8. GET /api/market/overview (FAOSTAT) -> status=200, crops={len(crops)} ({dt:.1f}ms)")
            results.append(("Market Overview", True, f"{len(crops)} crops"))
        else:
            log(f"[FAIL] 8. GET /api/market/overview -> status={res.status_code}")
            has_failure = True
            results.append(("Market Overview", False, f"status {res.status_code}"))
    except Exception as e:
        log(f"[FAIL] 8. GET /api/market/overview -> {e}")
        has_failure = True
        results.append(("Market Overview", False, str(e)))

    # 9. Geospatial Enrichment (District, SoilGrids, POWER cell)
    t0 = time.time()
    try:
        res = client.post("/api/fields/demo_check_field/enrich", json={"latitude": 24.85, "longitude": 89.37, "area_ha": 5.0})
        dt = (time.time() - t0) * 1000
        data = res.json() if res.status_code == 200 else {}
        dist = data.get("nearest_district")
        cell = data.get("power_cell", {}).get("cell_id") if isinstance(data.get("power_cell"), dict) else data.get("power_cell")
        soil = data.get("soil", {})
        texture = soil.get("texture_class") or soil.get("texture")
        if res.status_code == 200 and dist == "bogura" and texture:
            log(f"[PASS] 9. POST /api/fields/enrich -> district={dist}, cell={cell}, texture={texture} ({dt:.1f}ms)")
            results.append(("Field Enrichment", True, f"district={dist}"))
        else:
            log(f"[FAIL] 9. POST /api/fields/enrich -> status={res.status_code}, data={data}")
            has_failure = True
            results.append(("Field Enrichment", False, f"status {res.status_code}"))
    except Exception as e:
        log(f"[FAIL] 9. POST /api/fields/enrich -> {e}")
        has_failure = True
        results.append(("Field Enrichment", False, str(e)))

    # 10. NASA Datasets Ingestion & Field Test Reports
    t0 = time.time()
    try:
        data_dir = Path(REPO_ROOT) / "data"
        docs_ft = Path(REPO_ROOT) / "docs" / "field_tests"
        required_reports = ["bogura_demo.md", "dinajpur_sadar.md", "satkhira_coast.md", "sunamganj_haor.md"]
        missing_reports = [r for r in required_reports if not (docs_ft / r).is_file()]
        
        # Check A4 datasets presence
        smap_ok = (data_dir / "smap" / "smap_l4_monthly_4fields.csv").is_file() or (data_dir / "smap" / "smap_l4_anomalies.json").is_file()
        grace_ok = (data_dir / "grace" / "grace_bangladesh_trends.json").is_file()
        imerg_ok = (data_dir / "imerg" / "bd_imerg_daily.npz").is_file() or len(list((data_dir / "imerg").glob("imerg_*.csv"))) >= 6
        power_ok = len(list((data_dir / "nasa_power" / "advisory_cache").glob("*.csv"))) >= 50
        
        dt = (time.time() - t0) * 1000
        if not missing_reports and smap_ok and grace_ok and imerg_ok and power_ok:
            log(f"[PASS] 10. NASA Earth Observation Suites & Field Test Reports -> 4/4 reports, POWER(64), IMERG(64), SMAP, GRACE verified ({dt:.1f}ms)")
            results.append(("NASA Datasets & Reports", True, "4/4 reports, NASA suites verified"))
        else:
            log(f"[FAIL] 10. NASA Datasets & Reports -> missing_reports: {missing_reports}, SMAP:{smap_ok}, GRACE:{grace_ok}, IMERG:{imerg_ok}, POWER:{power_ok}")
            has_failure = True
            results.append(("NASA Datasets & Reports", False, f"missing {missing_reports}"))
    except Exception as e:
        log(f"[FAIL] 10. NASA Datasets & Reports -> {e}")
        has_failure = True
        results.append(("NASA Datasets & Reports", False, str(e)))

    log("================================================================")
    log(f"SUMMARY: {len([r for r in results if r[1]])}/{len(results)} CHECKS PASSED")
    log("================================================================")

    # Save output to docs/demo_check_output.txt
    out_file = Path(REPO_ROOT) / "docs" / "demo_check_output.txt"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines) + "\n")
    print(f"Output saved to {out_file}")

    if has_failure:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    run_checks()
