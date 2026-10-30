import pytest
from pathlib import Path
import pandas as pd

from src.data.crops import load_crop_knowledge
from src.state.field_state import build_field_state
from src.optimizer.milp import optimize_rotation

RAJSHAHI_CACHE_PATH = Path("data/nasa_power/advisory_cache/nasa_power_rajshahi_2001_2025.csv")


@pytest.fixture
def rajshahi_data():
    assert RAJSHAHI_CACHE_PATH.exists(), f"Missing cache: {RAJSHAHI_CACHE_PATH}"
    df = pd.read_csv(RAJSHAHI_CACHE_PATH)
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"])
    return df


def test_milp_season_suitability_rajshahi_climatology(rajshahi_data):
    """Test all 4 priorities for Rajshahi climatology with seasonal suitability constraints:

    - Chickpea, Wheat, Mustard NEVER appear in Kharif (S2, S4, S6)
    - Jute, Mungbean NEVER appear in Rabi (S1, S3, S5)
    - Print 4 rotations and objective components
    """
    crops = load_crop_knowledge()
    field_state = build_field_state(
        field_id="rajshahi_season_test_field",
        latitude=24.3745,
        longitude=88.6042,
        decision_date=pd.to_datetime("2025-12-31"),
        nasa_power_data=rajshahi_data.tail(60),
        crop_knowledge=crops,
    )

    priorities = ["profit", "water", "soil", "balanced"]
    rotations = {}

    print("\n" + "=" * 70)
    print("MILP SEASON SUITABILITY TEST - RAJSHAHI CLIMATOLOGY (4 PRIORITIES)")
    print("=" * 70)

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
        rotations[priority] = rot

        print(f"\n--- Strategy: {priority.upper()} ---")
        print(f"  Objective value: {result.get('objective_value'):.4f}")
        print(f"  Profit component: {result.get('profit_component')}")
        print(f"  Water component:  {result.get('water_component')}")
        print(f"  Soil component:   {result.get('soil_component')}")
        print("  Selected Rotation:")

        rabi_periods = [p for p in rot if p.endswith("_S1") or p.endswith("_S3") or p.endswith("_S5") or p in ("S1", "S3", "S5")]
        kharif_periods = [p for p in rot if p.endswith("_S2") or p.endswith("_S4") or p.endswith("_S6") or p in ("S2", "S4", "S6")]

        # In case period names are Y1_S1, Y1_S2 etc.
        if not rabi_periods and not kharif_periods:
            for idx, p in enumerate(rot.keys()):
                if idx % 2 == 0:
                    rabi_periods.append(p)
                else:
                    kharif_periods.append(p)

        for period, crop_name in rot.items():
            season_tag = "Rabi" if period in rabi_periods else "Kharif"
            print(f"    [{period}] ({season_tag}): {crop_name}")

        # Assertions for Kharif (S2, S4, S6)
        for p in kharif_periods:
            crop_in_kharif = rot[p]
            assert crop_in_kharif not in ("Chickpea", "Wheat", "Mustard"), (
                f"Agronomically impossible crop {crop_in_kharif} selected in Kharif period {p} under priority {priority}"
            )

        # Assertions for Rabi (S1, S3, S5)
        for p in rabi_periods:
            crop_in_rabi = rot[p]
            assert crop_in_rabi not in ("Jute", "Mungbean"), (
                f"Agronomically impossible crop {crop_in_rabi} selected in Rabi period {p} under priority {priority}"
            )

        # Assert season_suitability_exclusions recorded in constraint_summary
        assert "season_suitability_exclusions" in result["constraint_summary"]
        exclusions = result["constraint_summary"]["season_suitability_exclusions"]
        for p in kharif_periods:
            assert "Chickpea" in exclusions[p]
            assert "Wheat" in exclusions[p]
            assert "Mustard" in exclusions[p]
        for p in rabi_periods:
            assert "Jute" in exclusions[p]
            assert "Mungbean" in exclusions[p]

    print("\n" + "=" * 70)
    print("ALL 4 PRIORITIES PASSED SEASON SUITABILITY CONSTRAINTS")
    print("=" * 70 + "\n")
