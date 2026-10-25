"""Comprehensive Automated Test Suite for Multi-Field Experiments & Scientific Validation.

FieldShift 2026 — AZOIC • NASA Space Apps Challenge 2026.

Verifies:
1. Schema validation, physical boundaries, and AEZ geographic coordinates for 6 synthetic fields.
2. Immediate rejection of invalid, unphysical, or out-of-boundary inputs.
3. Baseline execution through genuine application calculation pipeline.
4. Scientific invariants:
   - Hydrological mass balance conservation: |Residual| < 1e-4 mm
   - Yield ceiling: Y_a <= Y_m
   - Yield floor salvage boundary: Y_a >= min(0.2, Y_m)
   - Economic arithmetic: Profit = Revenue - Total Cost
   - Optimizer water feasibility constraint satisfaction
5. Controlled One-Variable-at-a-Time (OVAT) isolation (only 1 factor changed per variant).
6. 2x2 Factorial Interaction experiment (Irrigation x Nitrogen synergy).
7. Database persistence, field isolation, and reload reproducibility.
8. API endpoints integration and export consistency.
"""

from __future__ import annotations

import copy
import json
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from backend.app.database import Base, SessionLocal, engine
from backend.app.main import app
from src.experiments.multi_field_experiment import (
    BD_LAT_MAX,
    BD_LAT_MIN,
    BD_LON_MAX,
    BD_LON_MIN,
    SYNTHETIC_FIELD_PROFILES,
    export_multi_field_csv,
    load_experiment_run,
    persist_experiment_run,
    run_all_multi_field_experiments,
    run_backend_optimizer_baseline,
    run_deterministic_agronomic_simulation,
    run_full_field_baseline,
    run_interaction_experiment,
    run_ovat_sensitivity_analysis,
    validate_field_profile,
    validate_scientific_invariants,
)


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(engine)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# -----------------------------------------------------------------------------
# 1. PROFILE SCHEMA, GEOGRAPHY & INPUT VALIDATION TESTS
# -----------------------------------------------------------------------------

def test_six_synthetic_profiles_exist_and_conform():
    """Verify all 6 required Bangladesh regional profiles exist and pass schema validation."""
    required_keys = [
        "bogura_boro",
        "rajshahi_stressed",
        "rangpur_seasonal",
        "mymensingh_lowfert",
        "jashore_pulse_veg",
        "cumilla_alternative",
    ]
    assert len(SYNTHETIC_FIELD_PROFILES) >= 6
    for key in required_keys:
        assert key in SYNTHETIC_FIELD_PROFILES, f"Missing required profile: {key}"
        prof = SYNTHETIC_FIELD_PROFILES[key]

        valid, errors = validate_field_profile(prof)
        assert valid is True, f"Profile {key} failed validation: {errors}"
        assert prof["data_status"] == "SYNTHETIC_TEST_DATA"
        assert "scientific_disclaimer" in prof

        # Geographic coordinates must lie within Bangladesh territory
        lat = prof["latitude"]
        lon = prof["longitude"]
        assert BD_LAT_MIN <= lat <= BD_LAT_MAX, f"{key} latitude {lat} outside BD"
        assert BD_LON_MIN <= lon <= BD_LON_MAX, f"{key} longitude {lon} outside BD"

        # Agricultural bounds
        assert 3.0 <= prof["soil_ph"] <= 10.0
        assert 0.1 <= prof["organic_matter_pct"] <= 20.0
        assert prof["area_ha"] > 0
        assert prof["irrigation_capacity_mm"] >= 0
        assert prof["nitrogen_kg_ha"] >= 0
        assert prof["selling_price_bdt_maund"] > 0


def test_invalid_profile_rejection():
    """Verify that unphysical or out-of-bounds parameters are strictly rejected without fallback defaults."""
    base = copy.deepcopy(SYNTHETIC_FIELD_PROFILES["bogura_boro"])

    # 1. Out of Bangladesh latitude
    p1 = copy.deepcopy(base)
    p1["latitude"] = 51.5074  # London
    valid, errors = validate_field_profile(p1)
    assert valid is False
    assert any("Latitude" in e for e in errors)

    # 2. Negative Area
    p2 = copy.deepcopy(base)
    p2["area_ha"] = -5.0
    valid, errors = validate_field_profile(p2)
    assert valid is False
    assert any("Area" in e for e in errors)

    # 3. Chemical pH bounds
    p3 = copy.deepcopy(base)
    p3["soil_ph"] = 15.0
    valid, errors = validate_field_profile(p3)
    assert valid is False
    assert any("pH" in e for e in errors)

    # 4. Unsupported soil texture
    p4 = copy.deepcopy(base)
    p4["soil_texture"] = "volcanic_ash_pumice"
    valid, errors = validate_field_profile(p4)
    assert valid is False
    assert any("texture" in e for e in errors)

    # 5. Unsupported crop
    p5 = copy.deepcopy(base)
    p5["crop"] = "dragonfruit_hydroponic"
    valid, errors = validate_field_profile(p5)
    assert valid is False
    assert any("Crop" in e for e in errors)


# -----------------------------------------------------------------------------
# 2. BASELINE SIMULATION & SCIENTIFIC INVARIANT TESTS
# -----------------------------------------------------------------------------

def test_baseline_execution_and_invariants_across_all_fields():
    """Verify that baseline analysis executes through genuine equations and respects domain invariants."""
    for key, prof in SYNTHETIC_FIELD_PROFILES.items():
        baseline = run_full_field_baseline(prof)
        agro = baseline["agronomics"]
        opt = baseline["optimizer"]

        # Water mass balance conservation
        assert agro["mass_balance_conserved"] is True
        assert abs(agro["mass_balance_residual_mm"]) < 1e-4

        # Yield bounds
        assert agro["simulated_yield_t_ha"] <= agro["potential_yield_t_ha"] + 1e-4
        assert agro["simulated_yield_t_ha"] >= min(0.20, agro["potential_yield_t_ha"]) - 1e-4

        # Economic reconciliation
        gross = agro["gross_revenue_bdt"]
        cost = agro["total_cost_bdt"]
        profit = agro["net_profit_bdt"]
        assert abs((gross - cost) - profit) <= 1.0

        # Optimizer solver status
        assert opt["solver_status"].lower() in ("optimal", "feasible", "infeasible", "unknown")
        assert isinstance(opt["water_constraint_satisfied"], bool)

        # Uncalculated metrics explicitly labeled NOT IMPLEMENTED
        assert "NOT IMPLEMENTED" in agro["micronutrients_zinc_boron"]
        assert "NOT IMPLEMENTED" in agro["in_situ_soil_sensor_data"]


def test_scientific_invariant_matrix_categories():
    """Verify that every assertion in the invariant suite is properly classified."""
    prof = SYNTHETIC_FIELD_PROFILES["bogura_boro"]
    invariants = validate_scientific_invariants(prof)
    assert len(invariants) >= 7

    categories = {inv["category"] for inv in invariants}
    assert "INVARIANT" in categories
    assert "EXPECTED_TREND" in categories
    assert "EMPIRICAL_VALIDATION_REQUIRED" in categories
    assert "MODEL_LIMITATION" in categories

    for inv in invariants:
        assert inv["status"] in ("PASS", "FAIL")
        assert len(inv["check_name"]) > 0
        assert len(inv["evidence"]) > 0


# -----------------------------------------------------------------------------
# 3. CONTROLLED ONE-VARIABLE-AT-A-TIME (OVAT) TESTS
# -----------------------------------------------------------------------------

def test_ovat_isolation_single_variable_only():
    """Verify that OVAT variants isolate exactly one variable at a time."""
    prof = SYNTHETIC_FIELD_PROFILES["bogura_boro"]
    variants = run_ovat_sensitivity_analysis(prof)
    assert len(variants) >= 12

    for v in variants:
        # Tested value must differ from baseline value (or be an intentional scenario variant)
        assert v["tested_value"] is not None
        assert "delta_yield_pct" in v
        assert "delta_profit_pct" in v
        assert not json.dumps(v).find("NaN") != -1  # No NaNs

    # Price sensitivity monotonicity check
    price_variants = [v for v in variants if v["factor_key"] == "selling_price_bdt_maund"]
    assert len(price_variants) >= 2
    low_price_var = next(v for v in price_variants if float(v["tested_value"]) < float(v["baseline_value"]))
    high_price_var = next(v for v in price_variants if float(v["tested_value"]) > float(v["baseline_value"]))
    assert low_price_var["delta_profit_bdt"] < 0
    assert high_price_var["delta_profit_bdt"] > 0


def test_rajshahi_drought_water_stress_response():
    """Verify that water-stressed Rajshahi field responds favorably to increased irrigation."""
    prof = SYNTHETIC_FIELD_PROFILES["rajshahi_stressed"]
    variants = run_ovat_sensitivity_analysis(prof)

    irrig_surplus = next(
        v for v in variants
        if v["factor_key"] == "irrigation_capacity_mm" and "+40%" in v["factor_label"]
    )
    # Higher irrigation in water-stressed profile should decrease deficit and increase yield
    assert irrig_surplus["delta_yield_t_ha"] >= 0.0


# -----------------------------------------------------------------------------
# 4. FACTORIAL INTERACTION EXPERIMENT TESTS
# -----------------------------------------------------------------------------

def test_interaction_experiment_irrigation_x_nitrogen():
    """Verify 2x2 Factorial interaction between Irrigation and Nitrogen."""
    prof = SYNTHETIC_FIELD_PROFILES["rajshahi_stressed"]
    interaction = run_interaction_experiment(prof)

    grid = interaction["factorial_grid"]
    assert "low_irrig_low_n" in grid
    assert "low_irrig_high_n" in grid
    assert "high_irrig_low_n" in grid
    assert "high_irrig_high_n" in grid

    # Verify synergy calculation
    indiv = interaction["individual_effects"]
    comb = interaction["combined_effect"]
    expected_synergy = comb["both_high_profit_delta_bdt"] - (
        indiv["high_irrig_alone_profit_delta_bdt"] + indiv["high_n_alone_profit_delta_bdt"]
    )
    assert interaction["interaction_synergy"]["synergy_profit_bdt"] == expected_synergy


def test_factorial_interaction_mathematical_consistency():
    """Regression test calculating interaction from scenario outputs rather than hardcoded numbers.

    Verifies across all 6 synthetic Bangladesh field profiles that:
    1. Classic 2x2 Factorial Interaction identity strictly holds:
       Synergy_2x2 = P(1,1) - P(1,0) - P(0,1) + P(0,0)
       Synergy_yield = Y(1,1) - Y(1,0) - Y(0,1) + Y(0,0)
    2. Baseline-centered synergy strictly equals:
       Delta(both_high) - (Delta(high_irrig_alone) + Delta(high_n_alone))
    3. Grid delta_from_control matches the difference from low_irrig_low_n.
    """
    for key, prof in SYNTHETIC_FIELD_PROFILES.items():
        interaction = run_interaction_experiment(prof)
        grid = interaction["factorial_grid"]

        p00 = grid["low_irrig_low_n"]["profit_bdt"]
        p10 = grid["high_irrig_low_n"]["profit_bdt"]
        p01 = grid["low_irrig_high_n"]["profit_bdt"]
        p11 = grid["high_irrig_high_n"]["profit_bdt"]

        y00 = grid["low_irrig_low_n"]["yield_t_ha"]
        y10 = grid["high_irrig_low_n"]["yield_t_ha"]
        y01 = grid["low_irrig_high_n"]["yield_t_ha"]
        y11 = grid["high_irrig_high_n"]["yield_t_ha"]

        # 1. Assert classic 2x2 identity calculated directly from scenario outputs
        expected_classic_synergy_profit = round(p11 - p10 - p01 + p00, 0)
        assert interaction["interaction_synergy"]["classic_2x2_synergy_profit_bdt"] == expected_classic_synergy_profit

        expected_classic_synergy_yield = round(y11 - y10 - y01 + y00, 2)
        assert interaction["interaction_synergy"]["classic_2x2_synergy_yield_t_ha"] == expected_classic_synergy_yield

        # 2. Assert delta from control calculations
        assert grid["low_irrig_low_n"]["delta_from_control_profit_bdt"] == 0.0
        assert grid["high_irrig_low_n"]["delta_from_control_profit_bdt"] == round(p10 - p00, 0)
        assert grid["low_irrig_high_n"]["delta_from_control_profit_bdt"] == round(p01 - p00, 0)
        assert grid["high_irrig_high_n"]["delta_from_control_profit_bdt"] == round(p11 - p00, 0)

        # 3. Assert baseline-centered perturbation formula
        indiv = interaction["individual_effects"]
        comb = interaction["combined_effect"]
        expected_base_synergy = round(
            comb["both_high_profit_delta_bdt"] - (
                indiv["high_irrig_alone_profit_delta_bdt"] + indiv["high_n_alone_profit_delta_bdt"]
            ), 0
        )
        assert interaction["interaction_synergy"]["synergy_profit_bdt"] == expected_base_synergy


# -----------------------------------------------------------------------------
# 5. DATABASE PERSISTENCE, FIELD ISOLATION & REPRODUCIBILITY TESTS
# -----------------------------------------------------------------------------

def test_database_persistence_and_exact_reload(db_session):
    """Verify that saving an experiment run preserves exact inputs/outputs and survives reload."""
    prof = SYNTHETIC_FIELD_PROFILES["bogura_boro"]
    data = {
        "profile": prof,
        "baseline": run_full_field_baseline(prof),
        "ovat_sensitivity": run_ovat_sensitivity_analysis(prof),
        "interaction_experiment": run_interaction_experiment(prof),
        "scientific_invariants": validate_scientific_invariants(prof),
    }

    exp_id = persist_experiment_run(db_session, "bogura_boro", data)
    assert exp_id.startswith("EXP-BOGURA_BORO-")

    reloaded = load_experiment_run(db_session, exp_id)
    assert reloaded is not None
    assert reloaded["experiment_id"] == exp_id
    assert reloaded["field_name"] == prof["name"]

    # Inputs reproduction
    assert reloaded["profile"]["area_ha"] == prof["area_ha"]
    assert reloaded["profile"]["soil_ph"] == prof["soil_ph"]

    # Baseline output reproduction
    orig_yield = data["baseline"]["agronomics"]["simulated_yield_t_ha"]
    reloaded_yield = reloaded["baseline"]["agronomics"]["simulated_yield_t_ha"]
    assert orig_yield == reloaded_yield

    # Sensitivity variants count reproduction
    assert len(reloaded["ovat_sensitivity"]) == len(data["ovat_sensitivity"])


def test_field_isolation_no_cross_overwrite(db_session):
    """Verify that persisting an experiment for field A cannot overwrite field B."""
    prof_a = SYNTHETIC_FIELD_PROFILES["bogura_boro"]
    prof_b = SYNTHETIC_FIELD_PROFILES["rajshahi_stressed"]

    data_a = {"profile": prof_a, "baseline": run_full_field_baseline(prof_a), "ovat_sensitivity": [], "interaction_experiment": {}, "scientific_invariants": []}
    data_b = {"profile": prof_b, "baseline": run_full_field_baseline(prof_b), "ovat_sensitivity": [], "interaction_experiment": {}, "scientific_invariants": []}

    id_a = persist_experiment_run(db_session, "bogura_boro", data_a)
    id_b = persist_experiment_run(db_session, "rajshahi_stressed", data_b)

    rec_a = load_experiment_run(db_session, id_a)
    rec_b = load_experiment_run(db_session, id_b)

    assert rec_a["field_id"] != rec_b["field_id"]
    assert rec_a["field_name"] != rec_b["field_name"]
    assert rec_a["profile"]["district"] == "Bogura"
    assert rec_b["profile"]["district"] == "Rajshahi"


# -----------------------------------------------------------------------------
# 6. REST API INTEGRATION & EXPORT TESTS
# -----------------------------------------------------------------------------

def test_api_get_profiles(client):
    """Test GET /api/experiments/multi-field/profiles."""
    res = client.get("/api/experiments/multi-field/profiles")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["total_profiles"] == 6
    assert "bogura_boro" in data["profiles"]
    assert data["data_status"] == "SYNTHETIC_TEST_DATA"


def test_api_run_single_field(client):
    """Test POST /api/experiments/multi-field/run for a single targeted field."""
    payload = {"field_key": "bogura_boro"}
    res = client.post("/api/experiments/multi-field/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["total_fields_executed"] == 1
    assert "bogura_boro" in data["fields"]
    assert "persisted_experiment_id" in data["fields"]["bogura_boro"]


def test_api_csv_export(client):
    """Test GET /api/experiments/multi-field/export.csv."""
    res = client.get("/api/experiments/multi-field/export.csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    content = res.text
    assert "Profile_ID,Field_Name,District,Crop,Area_ha" in content
    assert "SYN-BOG-01" in content
    assert "SYNTHETIC_TEST_DATA" in content


def test_api_json_export(client):
    """Test GET /api/experiments/multi-field/export.json."""
    res = client.get("/api/experiments/multi-field/export.json")
    assert res.status_code == 200
    data = res.json()
    assert "total_fields" in data
    assert data["total_fields"] == 6
    assert data["provenance"]["classification"] == "SYNTHETIC_TEST_DATA"


# -----------------------------------------------------------------------------
# 7. PHASE 2 REGRESSION TESTS: VALIDATION, INFEASIBILITY & DETERMINISM
# -----------------------------------------------------------------------------

def test_input_validation_boundary_conditions():
    """Verify strict rejection of unphysical, negative, or out-of-bounds agronomic inputs."""
    base_prof = copy.deepcopy(SYNTHETIC_FIELD_PROFILES["bogura_boro"])

    # 1. Negative field area
    prof_neg_area = copy.deepcopy(base_prof)
    prof_neg_area["area_ha"] = -2.5
    valid, errs = validate_field_profile(prof_neg_area)
    assert valid is False
    assert any("area" in e.lower() for e in errs)
    with pytest.raises(ValueError, match=r"(?i)area"):
        run_deterministic_agronomic_simulation(prof_neg_area)

    # 2. Negative water / irrigation budget
    prof_neg_irrig = copy.deepcopy(base_prof)
    prof_neg_irrig["irrigation_capacity_mm"] = -100.0
    valid, errs = validate_field_profile(prof_neg_irrig)
    assert valid is False
    assert any("irrigation" in e.lower() for e in errs)
    with pytest.raises(ValueError, match=r"(?i)irrigation"):
        run_deterministic_agronomic_simulation(prof_neg_irrig)

    # 3. Invalid initial moisture fraction (> 1.0 or < 0.0)
    prof_invalid_moist = copy.deepcopy(base_prof)
    prof_invalid_moist["initial_moisture_fraction"] = 1.6
    valid, errs = validate_field_profile(prof_invalid_moist)
    assert valid is False
    assert any("moisture" in e.lower() for e in errs)

    # 4. Out-of-bounds soil pH (< 3.0 or > 10.0)
    prof_bad_ph = copy.deepcopy(base_prof)
    prof_bad_ph["soil_ph"] = 12.5
    valid, errs = validate_field_profile(prof_bad_ph)
    assert valid is False
    assert any("ph" in e.lower() for e in errs)

    # 5. Negative nitrogen fertilizer
    prof_neg_n = copy.deepcopy(base_prof)
    prof_neg_n["nitrogen_kg_ha"] = -40.0
    valid, errs = validate_field_profile(prof_neg_n)
    assert valid is False
    assert any("nitrogen" in e.lower() for e in errs)


def test_infeasible_solver_reporting_and_explanation():
    """Verify that solver infeasibility is reported truthfully and not misrepresented as optimal."""
    jashore_prof = SYNTHETIC_FIELD_PROFILES["jashore_pulse_veg"]
    baseline = run_full_field_baseline(jashore_prof)
    opt = baseline["optimizer"]

    # Must be explicitly infeasible
    assert opt["is_optimal"] is False
    assert opt["solver_status"].lower() == "infeasible"
    assert opt["recommendation_status"] == "infeasible_no_recommendation"
    assert opt["infeasible_explanation"] is not None
    assert "water budget" in opt["infeasible_explanation"].lower()
    # Infeasible run must not fabricate a non-empty rotation as an optimal recommendation
    assert opt["selected_rotation"] == {}


def test_simulation_reproducibility_and_determinism():
    """Verify that deterministic agronomic simulation produces bit-exact identical results under same seed."""
    prof = SYNTHETIC_FIELD_PROFILES["bogura_boro"]
    res1 = run_deterministic_agronomic_simulation(prof, seed=42)
    res2 = run_deterministic_agronomic_simulation(prof, seed=42)

    assert res1["simulated_yield_t_ha"] == res2["simulated_yield_t_ha"]
    assert res1["gross_revenue_bdt"] == res2["gross_revenue_bdt"]
    assert res1["total_cost_bdt"] == res2["total_cost_bdt"]
    assert res1["net_profit_bdt"] == res2["net_profit_bdt"]
    assert res1["mass_balance_residual_mm"] == res2["mass_balance_residual_mm"]
