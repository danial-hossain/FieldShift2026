"""Unit and integration tests for FAO-56 Penman-Monteith ET0, SoilGrids hydraulics, and water planning."""

import math
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from src.compute.water_service import (
    fao56_penman_monteith_et0,
    saxton_rawls_hydraulic_properties,
    generate_crop_kc_series,
    compute_water_plan,
)


def test_penman_monteith_et0_range():
    """Verify FAO-56 PM ET0 outputs realistic physical range for Bangladesh climate."""
    # Rabi winter day (mild temp, moderate solar, low wind)
    et0_rabi = fao56_penman_monteith_et0(
        t_mean=18.0, t_min=12.0, t_max=24.0, rh=65.0, u2=1.2, rs=14.0, lat=24.8, doy=15
    )
    assert 2.0 <= et0_rabi <= 4.0, f"Rabi ET0 {et0_rabi} outside expected [2.0, 4.0] mm/day"

    # Pre-monsoon hot summer day (high temp, high solar, higher wind)
    et0_summer = fao56_penman_monteith_et0(
        t_mean=32.0, t_min=26.0, t_max=38.0, rh=55.0, u2=2.5, rs=22.0, lat=24.8, doy=120
    )
    assert 4.5 <= et0_summer <= 7.5, f"Summer ET0 {et0_summer} outside expected [4.5, 7.5] mm/day"


def test_saxton_rawls_hydraulic_properties():
    """Verify Saxton & Rawls (2006) pedotransfer formulas produce valid water retention bounds."""
    # Clay loam (typical Barind / Tista meander floodplain)
    cl = saxton_rawls_hydraulic_properties(sand_pct=25.0, clay_pct=35.0, om_pct=2.5)
    assert 0.15 <= cl["wilting_point"] <= 0.25
    assert 0.30 <= cl["field_capacity"] <= 0.42
    assert cl["field_capacity"] > cl["wilting_point"]
    assert 110.0 <= cl["taw_mm_per_m"] <= 180.0

    # Sandy loam (coastal or char land)
    sl = saxton_rawls_hydraulic_properties(sand_pct=65.0, clay_pct=15.0, om_pct=1.2)
    assert sl["wilting_point"] < cl["wilting_point"]
    assert sl["field_capacity"] < cl["field_capacity"]


def test_crop_kc_stages():
    """Verify single-crop Kc curve progression across development stages."""
    kc_series, zr_series = generate_crop_kc_series("Wheat", total_days=115)
    assert len(kc_series) == 115
    assert len(zr_series) == 115

    # Initial stage Kc should be ~0.35
    assert 0.30 <= kc_series[0] <= 0.40
    # Mid-season peak Kc should reach ~1.15
    mid_idx = int(115 * 0.60)
    assert 1.10 <= kc_series[mid_idx] <= 1.20
    # Late-season senescence Kc should drop back down
    assert kc_series[-1] < 0.60
    # Root depth should expand from 0.3m to 1.0m
    assert zr_series[0] == 0.30
    assert zr_series[-1] == 1.00


def test_compute_water_plan_structure():
    """Verify compute_water_plan returns complete daily series, economics, and provenance."""
    plan = compute_water_plan(district="bogura", crop="Mustard", area_ha=1.0)
    assert plan["status"] == "ok"
    assert plan["crop"] == "Mustard"
    assert plan["area_ha"] == 1.0
    assert "daily_plan" in plan
    assert len(plan["daily_plan"]) == 95  # 95-day Mustard duration

    # Water balance integrity
    wb = plan["water_balance_summary"]
    assert wb["total_reference_et0_mm"] > 0
    assert wb["total_crop_water_demand_etc_mm"] > 0
    assert wb["net_irrigation_requirement_mm"] >= 0
    assert wb["net_irrigation_requirement_mm"] <= wb["total_crop_water_demand_etc_mm"]

    # Economics & Conservation
    econ = plan["economic_and_conservation"]
    assert econ["managed_pumping_cost_bdt"] >= 0
    assert econ["water_savings_m3"] >= 0
    assert econ["cost_savings_bdt"] >= 0
    assert econ["water_reduction_pct"] > 0

    # Provenance
    prov = plan["provenance"]
    assert "FAO-56 Penman-Monteith" in prov["physical_basis"]
    assert "ISRIC SoilGrids" in prov["physical_basis"]


def test_api_water_plan_endpoint():
    """Test GET /api/water/plan endpoint responses for valid and query parameters."""
    client = TestClient(app)
    
    # Standard request
    resp = client.get("/api/water/plan?district=bogura&crop=Rice&area_ha=2.5&lat=24.85&lon=89.37")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["district"] == "bogura"
    assert data["area_ha"] == 2.5
    assert data["water_balance_summary"]["irrigation_events_count"] >= 0
    assert len(data["daily_plan"]) > 50

    # Fallback to defaults when parameters omitted
    resp_default = client.get("/api/water/plan")
    assert resp_default.status_code == 200
    assert resp_default.json()["status"] == "ok"
