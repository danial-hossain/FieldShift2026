"""Unit tests for Phase 4: Market and national need rooted in official FAOSTAT & BBS."""

import pytest
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient

from backend.app.main import app
from src.data.market_intelligence import get_market_overview, calculate_crop_profitability
from src.data.crops import load_crop_knowledge
from src.compute.advisory_service import load_district_climate_data
from src.state.field_state import build_field_state
from src.optimizer.dynamic_agronomy import partition_seasonal_environments, compute_dynamic_crop_season_metrics


def test_faostat_trade_balance_integrity():
    """Verify FAOSTAT Bangladesh data reflects true national food balance realities."""
    fpath = Path("data/market/faostat_bd.csv")
    assert fpath.is_file(), "faostat_bd.csv is missing"
    
    df = pd.read_csv(fpath)
    crops = df.set_index("crop")
    
    # Wheat: Bangladesh produces ~1.1M t, imports ~3.0M t (dependency > 70%)
    wheat = crops.loc["Wheat"]
    assert wheat["import_dependency_ratio"] > 0.70
    assert wheat["import_tonnes"] > 2500000
    
    # Mustard: Edible oil/rapeseed deficit > 35%
    mustard = crops.loc["Mustard"]
    assert mustard["import_dependency_ratio"] > 0.35
    assert mustard["import_tonnes"] > 300000
    
    # Pulses (Chickpea, Lentil): High import dependency
    chickpea = crops.loc["Chickpea"]
    assert chickpea["import_dependency_ratio"] > 0.90
    lentil = crops.loc["Lentil"]
    assert lentil["import_dependency_ratio"] > 0.60
    
    # Rice: Staple grain self-sufficiency > 95%
    rice = crops.loc["Rice"]
    assert rice["self_sufficiency_ratio"] >= 0.95
    
    # Potato: Surplus production, self-sufficiency >= 99%
    potato = crops.loc["Potato"]
    assert potato["self_sufficiency_ratio"] >= 0.99


def test_market_overview_groupings_and_national_need():
    """Verify /api/market/overview returns honest groupings and FAOSTAT metrics."""
    client = TestClient(app)
    resp = client.get("/api/market/overview")
    assert resp.status_code == 200
    data = resp.json()
    
    meta = data["metadata"]
    assert "FAOSTAT" in meta["national_demand_source"]
    groupings = meta["groupings"]
    assert "Wheat" in groupings["deficit_crops"]
    assert "Mustard" in groupings["deficit_crops"]
    assert "Chickpea" in groupings["deficit_crops"]
    assert "Rice" in groupings["staple_crops"]
    
    # Check individual crop national need data
    mustard = next(c for c in data["crops"] if c["crop"] == "Mustard")
    nn = mustard["national_need"]
    assert nn["import_dependency_pct"] >= 35.0
    assert nn["domestic_deficit_tonnes"] > 300000
    assert "FAOSTAT" in nn["source"]


def test_profit_calculator_unification_with_dynamic_agronomy():
    """Verify net profit on Market Intelligence matches dynamic agronomy exactly for the same field."""
    client = TestClient(app)
    resp = client.get("/api/market/overview?district=bogura&area_ha=1.0")
    assert resp.status_code == 200
    market_data = resp.json()
    
    mustard_market = next(c for c in market_data["crops"] if c["crop"] == "Mustard")
    market_net_profit = mustard_market["field_profitability"]["net_profit_bdt_per_ha"]
    market_yield = mustard_market["field_profitability"]["dynamic_yield_t_ha"]
    
    # Directly calculate dynamic agronomy metrics for Bogura field
    crops_df = load_crop_knowledge()
    power_df, _ = load_district_climate_data("bogura", offline=True)
    power_df["date"] = pd.to_datetime(power_df["date"])
    f_state = build_field_state(
        field_id="bogura_test",
        latitude=24.8465,
        longitude=89.3777,
        decision_date=pd.to_datetime("2024-12-31"),
        nasa_power_data=power_df.tail(60),
        crop_knowledge=crops_df,
    )
    envs = partition_seasonal_environments(f_state, power_df, planning_periods=["Y1_S1", "Y1_S2", "Y1_S3"])
    mustard_row = crops_df[crops_df["crop"] == "Mustard"].iloc[0].to_dict()
    agro_metrics = compute_dynamic_crop_season_metrics(mustard_row, envs["Y1_S1"], f_state)
    
    # Yield and profit must match exactly
    assert round(market_yield, 3) == round(agro_metrics["dynamic_yield_t_ha"], 3)
    assert round(market_net_profit, 1) == round(agro_metrics["dynamic_gross_margin_bdt_ha"], 1)


def test_crop_profitability_scenarios():
    """Verify 3-point scenarios (baseline, optimistic, downside) scale logically."""
    res = calculate_crop_profitability(crop_name="Wheat", area_ha=2.0)
    scenarios = res["scenarios"]
    base_net = scenarios["baseline"]["net_return_bdt"]
    opt_net = scenarios["optimistic"]["net_return_bdt"]
    down_net = scenarios["downside"]["net_return_bdt"]
    
    assert opt_net > base_net > down_net
