import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_provenance_summary_api():
    response = client.get("/api/provenance/summary")
    assert response.status_code == 200
    data = response.json()
    assert "reliability_score" in data
    assert "provenance_breakdown" in data
    assert "reliability_formula" in data
    assert data["total_parameters"] > 0

def test_provenance_registry_api():
    response = client.get("/api/provenance/registry")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] > 0
    assert len(data["parameters"]) > 0
    assert "classification" in data["parameters"][0]

def test_synthetic_data_generate_api():
    payload = {
        "seed": 77,
        "num_scenarios": 4,
        "area_min_ha": 1.0,
        "area_max_ha": 5.0,
        "assumption_profile": "standard",
    }
    response = client.post("/api/synthetic-data/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["seed"] == 77
    assert len(data["scenarios"]) == 4
    assert data["scenarios"][0]["provenance_classification"] == "synthetic_simulation"
    assert data["scenarios"][0]["is_farmer_observation"] is False

def test_synthetic_data_export_api():
    payload = {"seed": 42, "num_scenarios": 2}
    response = client.post("/api/synthetic-data/export", json=payload)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "synthetic_simulation" in response.text
    assert "scenario_id" in response.text

def test_market_overview_api():
    response = client.get("/api/market/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["crops_count"] >= 15
    assert data["metadata"]["demand_signal"]["status"] == "unavailable"
    assert "Demand data unavailable" in data["metadata"]["demand_signal"]["message"]
    # Check specific crop
    crops = {c["crop"]: c for c in data["crops"]}
    assert "Rice" in crops
    assert "Lentil" in crops
    assert crops["Rice"]["farmgate_bdt_kg"] < crops["Rice"]["retail_bdt_kg"]

def test_market_profitability_api():
    payload = {
        "crop": "Rice",
        "area_ha": 2.0,
        "expected_yield_t_ha": 4.0,
        "farmgate_price_bdt_t": 26000.0,
        "production_cost_bdt_ha": 80000.0,
        "irrigation_cost_bdt_ha": 4000.0,
        "marketing_cost_bdt_ha": 1000.0,
    }
    response = client.post("/api/market/profitability", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["crop"] == "Rice"
    assert data["results"]["gross_revenue_bdt"] == 208000.0
    assert data["results"]["cost_breakdown"]["total_cost_bdt"] == 170000.0
    assert data["results"]["estimated_net_return_bdt"] == 38000.0
    assert "scenarios" in data
    assert "baseline" in data["scenarios"]
    assert "optimistic" in data["scenarios"]
    assert "downside" in data["scenarios"]

def test_market_export_api():
    response = client.get("/api/market/export")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "Rice" in response.text

def test_sensitivity_api():
    payload = {
        "field_id": "demo",
        "irrigation_capacity_mm": 500.0,
        "rainfall_seasonal_mm": 400.0,
        "perturbation_steps": [-10.0, 10.0],
    }
    response = client.post("/api/scenarios/sensitivity", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["baseline_preserved"] is True
    assert "sweeps" in data
    assert len(data["sweeps"]) > 0
    assert "parameter_elasticity_ranking" in data
