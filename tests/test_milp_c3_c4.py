import pandas as pd
import pytest
from src.state.field_state import build_field_state
from src.compute.advisory_service import load_district_climate_data
from src.data.crops import load_crop_knowledge
from src.optimizer.milp import build_milp_model, optimize_rotation, HAOR_DISTRICTS

crops_df = load_crop_knowledge()

def test_c3_no_degenerate_fallow_plans():
    """Verify Dinajpur water and soil priorities do not produce degenerate 4-fallow rotations."""
    power_df, _ = load_district_climate_data("dinajpur", offline=True)
    power_df["date"] = pd.to_datetime(power_df["date"])
    f_state = build_field_state(
        field_id="dinajpur_test",
        latitude=25.6279,
        longitude=88.6332,
        decision_date=pd.to_datetime("2024-12-31"),
        nasa_power_data=power_df.tail(60),
        crop_knowledge=crops_df,
    )
    res_water = optimize_rotation(
        field_state=f_state,
        crops=crops_df,
        environmental_history=power_df,
        profit_weight=0.2,
        water_weight=0.6,
        soil_weight=0.2,
        allow_kharif2_fallow=False,
    )
    crops_w = res_water["selected_crop_by_period"]
    fallow_count = sum(1 for c in crops_w.values() if c.lower() == "fallow")
    assert fallow_count <= 1, f"Expected at most 1 fallow season, got {fallow_count}: {crops_w}"
    assert crops_w["Y1_S3"] == "Rice"
    assert crops_w["Y2_S3"] == "Rice"


def test_c3_minimum_cereal_constraint():
    """Verify at least one cereal staple is present per year."""
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
    res = optimize_rotation(
        field_state=f_state,
        crops=crops_df,
        environmental_history=power_df,
        profit_weight=0.1,
        water_weight=0.8,
        soil_weight=0.1,
        min_cereals_per_year=1,
    )
    crops = res["selected_crop_by_period"]
    cereals = {"rice", "boro rice", "aus rice", "wheat", "maize", "sorghum"}
    y1_cereals = [crops[f"Y1_S{s}"] for s in (1, 2, 3) if crops[f"Y1_S{s}"].lower() in cereals]
    y2_cereals = [crops[f"Y2_S{s}"] for s in (1, 2, 3) if crops[f"Y2_S{s}"].lower() in cereals]
    assert len(y1_cereals) >= 1, "Year 1 must contain at least one cereal"
    assert len(y2_cereals) >= 1, "Year 2 must contain at least one cereal"


def test_c4_haor_seasonally_flooded_constraints():
    """Verify Sunamganj haor land forces Kharif-2 fallow and Boro rice in winter."""
    power_df, _ = load_district_climate_data("sunamganj", offline=True)
    power_df["date"] = pd.to_datetime(power_df["date"])
    f_state = build_field_state(
        field_id="sunamganj_haor_test",
        latitude=25.0658,
        longitude=91.3950,
        decision_date=pd.to_datetime("2024-12-31"),
        nasa_power_data=power_df.tail(60),
        crop_knowledge=crops_df,
    )
    f_state.district = "sunamganj"
    res = optimize_rotation(
        field_state=f_state,
        crops=crops_df,
        environmental_history=power_df,
        seasonally_flooded=True,
    )
    rot = res["selected_crop_by_period"]
    assert rot["Y1_S1"] == "Boro Rice"
    assert rot["Y2_S1"] == "Boro Rice"
    assert rot["Y1_S3"] == "Fallow", "Kharif-2 must be flooded / uncropped fallow in haor"
    assert rot["Y2_S3"] == "Fallow", "Kharif-2 must be flooded / uncropped fallow in haor"
    assert rot["Y1_S2"] in {"Fallow", "Mungbean"}, "Kharif-1 only allows short crops or fallow"
    assert rot["Y2_S2"] in {"Fallow", "Mungbean"}, "Kharif-1 only allows short crops or fallow"
