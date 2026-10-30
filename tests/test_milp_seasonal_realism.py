"""Unit and integration tests for MILP seasonal realism and climatological multi-year grounding (Phase 5)."""

import os
from pathlib import Path
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from src.compute.advisory_service import load_district_climate_data
from src.data.crops import load_crop_knowledge
from src.optimizer.dynamic_agronomy import (
    SeasonalEnvironment,
    partition_seasonal_environments,
    compute_dynamic_crop_season_metrics,
)
from src.optimizer.milp import optimize_rotation
from src.state.field_state import build_field_state


RAJSHAHI_CACHE_PATH = Path("data/nasa_power/advisory_cache/nasa_power_rajshahi_2001_2025.csv")
SINGLE_WINDOW_PATH = Path("data/nasa_power/nasa_power_lat23.8103_lon90.4125_20260831_20260929.csv")


@pytest.fixture(scope="module")
def rajshahi_data():
    df = pd.read_csv(RAJSHAHI_CACHE_PATH)
    df["date"] = pd.to_datetime(df["date"])
    return df


@pytest.fixture(scope="module")
def seasonal_envs_rajshahi(rajshahi_data):
    class MockField:
        temperature = 26.0
        rainfall = 500.0

    return partition_seasonal_environments(
        field_state=MockField(),
        environmental_history=rajshahi_data,
        planning_periods=("Y1_S1", "Y1_S2"),
    )


def test_01_kharif_rainfall(seasonal_envs_rajshahi):
    """Test 1: Kharif rainfall between 800 and 2000 mm."""
    kharif_env = seasonal_envs_rajshahi["Y1_S2"]
    assert 800.0 <= kharif_env.rainfall_mm <= 2000.0, (
        f"Kharif rainfall {kharif_env.rainfall_mm} mm is outside [800, 2000] mm"
    )


def test_02_rabi_rainfall(seasonal_envs_rajshahi):
    """Test 2: Rabi rainfall between 40 and 400 mm."""
    rabi_env = seasonal_envs_rajshahi["Y1_S1"]
    assert 40.0 <= rabi_env.rainfall_mm <= 400.0, (
        f"Rabi rainfall {rabi_env.rainfall_mm} mm is outside [40, 400] mm"
    )


def test_03_seasonal_mean_temperatures(seasonal_envs_rajshahi):
    """Test 3: Kharif mean temp 27-31 C; Rabi mean temp 20-25 C."""
    kharif_env = seasonal_envs_rajshahi["Y1_S2"]
    rabi_env = seasonal_envs_rajshahi["Y1_S1"]

    assert 27.0 <= kharif_env.mean_temperature_c <= 31.0, (
        f"Kharif mean temp {kharif_env.mean_temperature_c} C is outside [27, 31] C"
    )
    assert 20.0 <= rabi_env.mean_temperature_c <= 25.0, (
        f"Rabi mean temp {rabi_env.mean_temperature_c} C is outside [20, 25] C"
    )


def test_04_environment_basis_climatology(seasonal_envs_rajshahi):
    """Test 4: environment_basis == 'nasa_power_climatology_25_years' for both seasons."""
    rabi_env = seasonal_envs_rajshahi["Y1_S1"]
    kharif_env = seasonal_envs_rajshahi["Y1_S2"]

    assert rabi_env.environment_basis == "nasa_power_climatology_25_years"
    assert kharif_env.environment_basis == "nasa_power_climatology_25_years"


def test_05_single_window_extrapolated():
    """Test 5: with only single-window CSV, Rabi environment_basis == 'single_window_extrapolated'."""
    single_df = pd.read_csv(SINGLE_WINDOW_PATH)
    single_df["date"] = pd.to_datetime(single_df["date"])

    class MockField:
        temperature = 26.0
        rainfall = 500.0

    envs = partition_seasonal_environments(
        field_state=MockField(),
        environmental_history=single_df,
        planning_periods=("Y1_S1", "Y1_S2"),
    )

    rabi_env = envs["Y1_S1"]
    assert rabi_env.environment_basis == "single_window_extrapolated"


def test_06_rice_water_score_and_irrigation(seasonal_envs_rajshahi):
    """Test 6: Rice water score Kharif > Rabi, and Rice irrigation_required_mm in Kharif < 400."""
    crops = load_crop_knowledge()
    rice = crops.loc[crops["crop"] == "Rice"].iloc[0]

    class MockField:
        ph = 6.5
        organic_matter = 2.0
        texture = "loam"
        irrigation_capacity_mm = 500.0

    field = MockField()
    rabi_env = seasonal_envs_rajshahi["Y1_S1"]
    kharif_env = seasonal_envs_rajshahi["Y1_S2"]

    metrics_rabi = compute_dynamic_crop_season_metrics(rice, rabi_env, field)
    metrics_kharif = compute_dynamic_crop_season_metrics(rice, kharif_env, field)

    water_score_rabi = metrics_rabi["normalized_water_score"]
    water_score_kharif = metrics_kharif["normalized_water_score"]
    irrig_req_kharif = metrics_kharif["water_balance"]["irrigation_required_mm"]

    assert water_score_kharif > water_score_rabi, (
        f"Kharif water score ({water_score_kharif}) should exceed Rabi ({water_score_rabi})"
    )
    assert irrig_req_kharif < 400.0, (
        f"Kharif Rice irrigation_required_mm ({irrig_req_kharif}) should be < 400 mm"
    )


def test_07_optimize_rotation_rajshahi_climatology(rajshahi_data):
    """Test 7: optimize_rotation with Rajshahi climatology for priorities profit, water, soil, balanced:

    status 'optimal'; PRINT each 6-season rotation with crop + season label.
    """
    crops = load_crop_knowledge()
    field_state = build_field_state(
        field_id="rajshahi_farm",
        latitude=24.3745,
        longitude=88.6042,
        decision_date=pd.to_datetime("2025-12-31"),
        nasa_power_data=rajshahi_data.tail(60),
        crop_knowledge=crops,
    )

    priorities = ["profit", "water", "soil", "balanced"]
    print("\n" + "=" * 60)
    print("TEST 7: RAJSHAHI CLIMATOLOGY 6-SEASON ROTATIONS")
    print("=" * 60)

    for priority in priorities:
        p_wt = 1.0 if priority == "profit" else (0.34 if priority == "balanced" else 0.0)
        w_wt = 1.0 if priority == "water" else (0.33 if priority == "balanced" else 0.0)
        s_wt = 1.0 if priority == "soil" else (0.33 if priority == "balanced" else 0.0)

        result = optimize_rotation(
            field_state=field_state,
            crops=crops,
            environmental_history=rajshahi_data,
            profit_weight=p_wt,
            water_weight=w_wt,
            soil_weight=s_wt,
        )

        assert result.get("status") == "optimal", f"Priority {priority} failed solver"

        rot = result["selected_crop_by_period"]
        envs = result["seasonal_environments"]

        print(f"\n--- Strategy: {priority.upper()} ---")
        for period, crop_name in rot.items():
            s_env = envs[period]
            print(f"  [{period}] {s_env.season_name}: {crop_name}")

    print("=" * 60 + "\n")


def test_08_planning_endpoint_unknown_district_400():
    """Test 8: planning endpoint with a truly unknown district -> HTTP 400.
    Note: 'sylhet' is now a valid district (Phase B added all 64 BD districts).
    Using a completely fictitious name to test the 400 guard.
    """
    client = TestClient(app)
    response = client.post("/api/workflow", json={"district": "unknown_xyz_not_in_registry"})
    assert response.status_code == 400, (
        f"Expected status 400 for unknown district, got {response.status_code}: {response.text}"
    )

    # Also test /api/planning alias
    resp_alias = client.post("/api/planning", json={"district": "unknown_xyz_not_in_registry"})
    assert resp_alias.status_code == 400, (
        f"Expected status 400 on /api/planning for unknown district, got {resp_alias.status_code}"
    )

