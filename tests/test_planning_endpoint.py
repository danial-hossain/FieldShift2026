"""API integration tests for POST /api/planning.

Tests:
1. POST /api/planning {"district":"rajshahi","priority":p} for p in ["balanced","profit","water","soil"]:
   status 200; result = summary.planning.selected_strategy_result;
   result["status"] == "optimal"; len(selected_crop_by_period) == 6;
   environment_basis == "nasa_power_climatology_25_years".
2. {"district":"sylhet"} -> 400.
3. {"district":"rajshahi","priority":"xyz"} -> 400.
4. Print (pytest -s) the 4 rotations as "priority: Y1_S1=..., ..., Y3_S2=...".
"""

import os
os.environ["OFFLINE"] = "1"

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_planning_rajshahi_four_priorities(capsys):
    priorities = ["balanced", "profit", "water", "soil"]
    for p in priorities:
        res = client.post("/api/planning", json={"district": "rajshahi", "priority": p})
        assert res.status_code == 200, f"Expected 200 for priority {p}, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["status"] == "ok"
        
        planning = data.get("summary", {}).get("planning", {})
        result = planning.get("selected_strategy_result")
        assert result is not None, f"selected_strategy_result missing for priority {p}"
        assert result["status"] == "optimal"
        
        crops = result.get("selected_crop_by_period", {})
        assert len(crops) == 6, f"Expected 6 periods, got {len(crops)}"
        
        env_basis = result.get("environment_basis")
        assert env_basis == "nasa_power_climatology_25_years", f"Unexpected env_basis: {env_basis}"
        
        crops_str = ", ".join(f"{period}={crop}" for period, crop in crops.items())
        print(f"{p}: {crops_str}")


def test_planning_unsupported_district():
    # Note: 'sylhet' is now valid (Phase B added all 64 BD districts).
    # Use a fictitious district name to test the guard.
    res = client.post("/api/planning", json={"district": "unknown_xyz_not_in_registry", "priority": "balanced"})
    assert res.status_code == 400
    assert "Unsupported district" in res.json().get("detail", "")


def test_planning_invalid_priority():
    res = client.post("/api/planning", json={"district": "rajshahi", "priority": "xyz"})
    assert res.status_code == 400
    assert "Invalid priority" in res.json().get("detail", "")
