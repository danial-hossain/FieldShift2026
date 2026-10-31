import json
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_planning_location_validation():
    # Calling planning with no district and no lat/lon must return 400
    res = client.post("/api/planning", json={"priority": "balanced"})
    assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
    assert "District or valid latitude/longitude is required" in res.json().get("detail", "")

    # Alias /api/planning/six-seasons
    res2 = client.post("/api/planning/six-seasons", json={"priority": "balanced"})
    assert res2.status_code == 400, f"Expected 400, got {res2.status_code}: {res2.text}"

def test_four_fields_variation():
    cases = [
        {"name": "Dinajpur Sadar", "district": "dinajpur", "latitude": 25.6279, "longitude": 88.6332, "area_ha": 5.0},
        {"name": "Bogura demo", "district": "bogura", "latitude": 24.8500, "longitude": 89.3700, "area_ha": 10.0},
        {"name": "Satkhira coast", "district": "satkhira", "latitude": 22.7185, "longitude": 89.0705, "area_ha": 3.5},
        {"name": "Sunamganj haor", "district": "sunamganj", "latitude": 25.0715, "longitude": 91.3992, "area_ha": 4.0, "seasonally_flooded": True},
    ]

    results = []
    for c in cases:
        resp = client.post("/api/planning", json=c)
        assert resp.status_code == 200, f"Failed for {c['name']}: {resp.text}"
        data = resp.json()
        sol = data.get("solver_result") or data.get("summary", {}).get("planning", {}).get("selected_strategy_result", {})
        results.append({
            "name": c["name"],
            "district": data.get("climate_source", {}).get("district"),
            "data_mode": data.get("mode"),
            "rotation": sol.get("selected_crop_by_period"),
            "objective_value": sol.get("objective_value"),
            "water_component": sol.get("water_component"),
            "profit_component": sol.get("profit_component"),
        })

    # Assert that all 4 fields have distinct climate source or objective values
    obj_values = [r["objective_value"] for r in results]
    assert len(set(obj_values)) == 4, f"Expected 4 distinct objective values, got: {obj_values}"

    # Sunamganj haor must have Fallow during flooded periods and Boro Rice in Rabi
    sunamganj_rot = results[3]["rotation"]
    assert sunamganj_rot["Y1_S1"] == "Boro Rice"
    assert sunamganj_rot["Y1_S3"] == "Fallow"
