"""Tests for Phase 2: Bangladesh 3-season crop calendar, FAOSTAT national demand, and rotation robustness."""

import pytest
import pandas as pd
from fastapi.testclient import TestClient

from backend.app.main import app
from src.data.crops import load_crop_knowledge
from src.state.field_state import build_field_state
from src.compute.advisory_service import load_district_climate_data
from src.optimizer.milp import optimize_rotation
from src.optimizer.robustness import evaluate_rotation_robustness


@pytest.fixture(scope="module")
def crops():
    return load_crop_knowledge()


@pytest.fixture(scope="module")
def bogura_field(crops):
    power_df, _ = load_district_climate_data("bogura", offline=True)
    power_df["date"] = pd.to_datetime(power_df["date"])
    f_state = build_field_state(
        field_id="bogura_test_field",
        latitude=24.8465,
        longitude=89.3777,
        decision_date=pd.to_datetime("2024-12-31"),
        nasa_power_data=power_df.tail(60),
        crop_knowledge=crops,
    )
    f_state.field_size_ha = 1.0
    f_state.area_ha = 1.0
    return f_state, power_df


def test_allowed_seasons_catalog(crops):
    """Verify crops are restricted to agronomically valid Bangladesh seasons."""
    crop_map = {row["crop"]: row["allowed_seasons"].split("|") for _, row in crops.iterrows()}
    
    # Rabi only
    assert "rabi" in crop_map["Mustard"] and "kharif1" not in crop_map["Mustard"] and "kharif2" not in crop_map["Mustard"]
    assert "rabi" in crop_map["Potato"] and "kharif1" not in crop_map["Potato"] and "kharif2" not in crop_map["Potato"]
    assert "rabi" in crop_map["Wheat"] and "kharif1" not in crop_map["Wheat"] and "kharif2" not in crop_map["Wheat"]
    assert "rabi" in crop_map["Boro Rice"] and "kharif1" not in crop_map["Boro Rice"] and "kharif2" not in crop_map["Boro Rice"]
    
    # Kharif-1 only
    assert "kharif1" in crop_map["Aus Rice"] and "rabi" not in crop_map["Aus Rice"] and "kharif2" not in crop_map["Aus Rice"]
    assert "kharif1" in crop_map["Jute"] and "rabi" not in crop_map["Jute"] and "kharif2" not in crop_map["Jute"]
    
    # Kharif-2 only
    assert "kharif2" in crop_map["Rice"] and "rabi" not in crop_map["Rice"] and "kharif1" not in crop_map["Rice"]
    
    # Multi-season and Fallow
    assert "rabi" in crop_map["Maize"] and "kharif1" in crop_map["Maize"]
    assert "rabi" in crop_map["Fallow"] and "kharif1" in crop_map["Fallow"] and "kharif2" in crop_map["Fallow"]


def test_six_period_rotation_seasonal_compliance(bogura_field, crops):
    """Verify 6-period optimization respects seasonal placement for all periods."""
    f_state, climate_df = bogura_field
    res = optimize_rotation(
        field_state=f_state,
        crops=crops,
        environmental_history=climate_df,
        profit_weight=0.34,
        water_weight=0.33,
        soil_weight=0.33,
    )
    assert res["status"] == "optimal"
    plan = res["selected_crop_by_period"]
    assert len(plan) == 6
    
    # Season 1 (Rabi) in Y1 and Y2
    rabi_allowed = {"Boro Rice", "Mustard", "Potato", "Wheat", "Lentil", "Chickpea", "Tomato", "Sunflower", "Maize", "Groundnut", "Soybean", "Fallow"}
    assert plan["Y1_S1"] in rabi_allowed
    assert plan["Y2_S1"] in rabi_allowed
    
    # Season 2 (Kharif-1) in Y1 and Y2
    k1_allowed = {"Aus Rice", "Jute", "Mungbean", "Sesame", "Maize", "Groundnut", "Soybean", "Fallow"}
    assert plan["Y1_S2"] in k1_allowed
    assert plan["Y2_S2"] in k1_allowed
    
    # Season 3 (Kharif-2) in Y1 and Y2
    k2_allowed = {"Rice", "Fallow"}
    assert plan["Y1_S3"] in k2_allowed
    assert plan["Y2_S3"] in k2_allowed


def test_consecutive_year_diversity_constraint(bogura_field, crops):
    """Same crop cannot repeat in the same season across Y1 and Y2 unless Rice in Kharif-2 or Fallow."""
    f_state, climate_df = bogura_field
    res = optimize_rotation(
        field_state=f_state,
        crops=crops,
        environmental_history=climate_df,
        profit_weight=0.34,
        water_weight=0.33,
        soil_weight=0.33,
    )
    plan = res["selected_crop_by_period"]
    
    # Rabi (S1) must differ across years unless Fallow
    if plan["Y1_S1"] != "Fallow" and plan["Y2_S1"] != "Fallow":
        assert plan["Y1_S1"] != plan["Y2_S1"]
        
    # Kharif-1 (S2) must differ across years unless Fallow
    if plan["Y1_S2"] != "Fallow" and plan["Y2_S2"] != "Fallow":
        assert plan["Y1_S2"] != plan["Y2_S2"]


def test_national_need_priority_selects_deficit_crops(bogura_field, crops):
    """National need priority must elevate import-dependent crops (Mustard, Lentil, Chickpea, Wheat)."""
    f_state, climate_df = bogura_field
    res = optimize_rotation(
        field_state=f_state,
        crops=crops,
        environmental_history=climate_df,
        profit_weight=0.20,
        water_weight=0.15,
        soil_weight=0.15,
        national_need_weight=0.50,
    )
    assert res["status"] == "optimal"
    plan = res["selected_crop_by_period"]
    selected = set(plan.values())
    
    # Must contain at least one heavy import deficit crop
    deficit_crops = {"Mustard", "Wheat", "Lentil", "Chickpea", "Soybean"}
    assert bool(selected.intersection(deficit_crops)), f"No deficit crops selected in {selected}"


def test_robustness_evaluator_24_years():
    """Verify 24 historical years (2001-2024) evaluation produces realistic statistical variance."""
    rot = {
        "Y1_S1": "Mustard",
        "Y1_S2": "Aus Rice",
        "Y1_S3": "Rice",
        "Y2_S1": "Wheat",
        "Y2_S2": "Mungbean",
        "Y2_S3": "Rice",
    }
    res = evaluate_rotation_robustness(rot, district="bogura", area_ha=1.0)
    assert res["status"] == "ok"
    assert res["years_evaluated"] == 24
    assert len(res["yearly_records"]) == 24
    
    dist = res["annual_profit_distribution"]
    assert dist["mean"] > 0
    assert dist["min"] <= dist["p10"] <= dist["median"] <= dist["p90"] <= dist["max"]
    assert dist["std"] > 0  # Real climate variance over 24 years


def test_api_planning_robustness_endpoint():
    """Test POST /api/planning and POST /api/planning/robustness via FastAPI client."""
    client = TestClient(app)
    
    # 1. Generate plan with national_need priority
    plan_resp = client.post("/api/planning", json={
        "district": "bogura",
        "area_ha": 1.0,
        "priority": "national_need",
    })
    assert plan_resp.status_code == 200
    plan_body = plan_resp.json()
    milp = plan_body["summary"]["planning"]["milp_status"]
    selected_crops = milp["selected_crop_by_period"]
    assert len(selected_crops) == 6
    
    # 2. Feed selected rotation to robustness endpoint
    rob_resp = client.post("/api/planning/robustness", json={
        "district": "bogura",
        "area_ha": 1.0,
        "rotation": selected_crops,
    })
    assert rob_resp.status_code == 200
    rob_body = rob_resp.json()
    assert rob_body["years_evaluated"] == 24
    dist = rob_body["annual_profit_distribution"]
    assert dist["mean"] > 50000
    assert dist["min"] <= dist["max"]
