"""scripts/demo_check.py
Offline verification of FieldShift core APIs.
Simulates end-to-end user flows without external network access.
Exits 0 on all checks passing; exits 1 if any check fails.
"""

import sys
import os
import time

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
    has_failure = False

    print("================================================================")
    print("FIELDSHIFT OFFLINE DEMO INTEGRITY CHECK")
    print("================================================================")

    # 1. Health check
    t0 = time.time()
    try:
        res = client.get("/api/health")
        dt = (time.time() - t0) * 1000
        if res.status_code == 200:
            data = res.json()
            print(f"[PASS] 1. GET /api/health -> status={res.status_code} ({dt:.1f}ms)")
            results.append(("Health Check", True, f"{dt:.1f}ms"))
        else:
            print(f"[FAIL] 1. GET /api/health -> status={res.status_code}")
            has_failure = True
            results.append(("Health Check", False, f"status {res.status_code}"))
    except Exception as e:
        print(f"[FAIL] 1. GET /api/health -> {e}")
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
            print(f"[PASS] 2. GET /api/crops -> count={len(crops)} crops ({dt:.1f}ms)")
            results.append(("Crops Catalog", True, f"{len(crops)} crops"))
        else:
            print(f"[FAIL] 2. GET /api/crops -> status={res.status_code}, count={len(crops)}")
            has_failure = True
            results.append(("Crops Catalog", False, f"status {res.status_code}"))
    except Exception as e:
        print(f"[FAIL] 2. GET /api/crops -> {e}")
        has_failure = True
        results.append(("Crops Catalog", False, str(e)))

    # 3. Planting Advisory (Rajshahi Aman)
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
        if (res.status_code == 200 and 
            p1.get("median_doy") is not None and 
            p2.get("median_doy") is not None and 
            p_val is not None):
            print(f"[PASS] 3. GET /api/advisory (Rajshahi Aman) -> P1={p1['median_doy']}, P2={p2['median_doy']}, Shift={shift:+0.1f}d, p={p_val:.4f} ({dt:.1f}ms)")
            results.append(("Planting Advisory", True, f"Shift {shift:+0.1f}d, p={p_val:.4f}"))
        else:
            print(f"[FAIL] 3. GET /api/advisory -> status={res.status_code}, body={data}")
            has_failure = True
            results.append(("Planting Advisory", False, f"status {res.status_code}"))
    except Exception as e:
        print(f"[FAIL] 3. GET /api/advisory -> {e}")
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
            print(f"[PASS] 4. GET /api/advisory/districts -> {len(districts)} districts ({dt:.1f}ms)")
            results.append(("Districts List", True, f"{len(districts)} districts"))
        else:
            print(f"[FAIL] 4. GET /api/advisory/districts -> status={res.status_code}, count={len(districts)}")
            has_failure = True
            results.append(("Districts List", False, f"status {res.status_code}"))
    except Exception as e:
        print(f"[FAIL] 4. GET /api/advisory/districts -> {e}")
        has_failure = True
        results.append(("Districts List", False, str(e)))

    # 5. Planning Optimization (6 Seasons MILP)
    t0 = time.time()
    try:
        res = client.post("/api/planning", json={"district": "rajshahi", "priority": "profit"})
        dt = (time.time() - t0) * 1000
        data = res.json() if res.status_code == 200 else {}
        strat = data.get("summary", {}).get("planning", {}).get("selected_strategy_result", {})
        crops = strat.get("selected_crop_by_period", {})
        if res.status_code == 200 and strat.get("status") == "optimal" and len(crops) == 6:
            print(f"[PASS] 5. POST /api/planning (Rajshahi Profit) -> status=optimal, 6 seasons resolved ({dt:.1f}ms)")
            results.append(("Planning Optimization", True, f"optimal, 6 periods ({dt:.1f}ms)"))
        else:
            print(f"[FAIL] 5. POST /api/planning -> status={res.status_code}, strat={strat.get('status')}")
            has_failure = True
            results.append(("Planning Optimization", False, f"status {res.status_code}"))
    except Exception as e:
        print(f"[FAIL] 5. POST /api/planning -> {e}")
        has_failure = True
        results.append(("Planning Optimization", False, str(e)))

    # 6. Location Weather
    t0 = time.time()
    try:
        res = client.post("/api/location/weather", json={"latitude": 24.85, "longitude": 89.37})
        dt = (time.time() - t0) * 1000
        if res.status_code == 200:
            print(f"[PASS] 6. POST /api/location/weather -> status=200 ({dt:.1f}ms)")
            results.append(("Location Weather", True, f"{dt:.1f}ms"))
        else:
            print(f"[FAIL] 6. POST /api/location/weather -> status={res.status_code}")
            has_failure = True
            results.append(("Location Weather", False, f"status {res.status_code}"))
    except Exception as e:
        print(f"[FAIL] 6. POST /api/location/weather -> {e}")
        has_failure = True
        results.append(("Location Weather", False, str(e)))

    print("================================================================")
    print(f"SUMMARY: {len([r for r in results if r[1]])}/{len(results)} CHECKS PASSED")
    print("================================================================")

    if has_failure:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    run_checks()
