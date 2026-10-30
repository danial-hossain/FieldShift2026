"""tests/test_compare_and_replan.py
Comprehensive verification of Comparison Lab (MILP vs RL vs Rule-Based) and Adaptive Replan APIs.
"""

import os
os.environ["OFFLINE"] = "1"

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_comparison_lab_all_three_methods():
    """Verify Comparison Lab evaluates MILP, RL, and Rule-Based simultaneously."""
    res = client.post("/api/lab/compare", json={
        "latitude": 24.37,
        "longitude": 88.60,
        "field_id": "test_rajshahi",
        "priority": "balanced",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("ok", "success", "optimal")
    
    # Must contain all three methods
    methods_list = data.get("methods", [])
    method_by_id = {m["id"]: m for m in methods_list}
    assert "milp" in method_by_id, "MILP method missing from comparison"
    assert "rl" in method_by_id, "RL method missing from comparison"
    assert "rule_based" in method_by_id, "Rule-based method missing from comparison"
    
    # Verify each method contains honest metrics
    for m_key in ("milp", "rl", "rule_based"):
        m_data = method_by_id[m_key]
        assert "total_field_profit_bdt" in m_data or "profit_bdt_per_ha" in m_data
        assert "water_requirement_mm" in m_data or "mean_water_mm" in m_data
        assert "rotation" in m_data or "rotation_sequence" in m_data
        assert m_data.get("runtime_ms") is not None

    # Trade-off analysis
    trade_off = data.get("trade_off_analysis", {})
    assert trade_off is not None
    assert "highest_profit" in trade_off
    assert "most_water_efficient" in trade_off
    assert "fastest_computation" in trade_off

def test_comparison_lab_priorities():
    """Verify Comparison Lab accommodates different farmer priorities."""
    for priority in ("profit", "water", "soil"):
        res = client.post("/api/lab/compare", json={
            "latitude": 24.85,
            "longitude": 89.37,
            "priority": priority,
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("priority") == priority
        methods = data.get("methods", {})
        assert len(methods) >= 3

def test_workflow_replan_mid_cycle_adaptation():
    """Verify Adaptive Replan adjusts remaining seasons upon mid-cycle shock."""
    completed = [
        {"period": "Y1_S1", "crop": "Aman Rice", "profit_bdt": 45000.0, "water_mm": 520.0},
        {"period": "Y1_S2", "crop": "Wheat", "profit_bdt": 38000.0, "water_mm": 210.0},
    ]
    updated_conditions = {
        "water_availability_ratio": 0.65, # Severe drought scenario
        "soil_ph": 6.8,
    }
    
    res = client.post("/api/workflow/replan", json={
        "latitude": 24.37,
        "longitude": 88.60,
        "field_id": "demo_field_replan",
        "completed_seasons": completed,
        "updated_field_conditions": updated_conditions,
        "priority": "water",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("ok", "success", "optimal")
    
    # Verify season accounting
    completed_count = data.get("completed_seasons_count")
    remaining_count = data.get("remaining_seasons_count")
    assert completed_count == 2
    assert remaining_count == 4
    assert completed_count + remaining_count == 6
    
    # Verify replanned schedule exists
    replanned = data.get("replanned_schedule", [])
    assert len(replanned) == 4, f"Expected 4 remaining periods, got {len(replanned)}"
    
    # Verify explanations are provided
    explanations = data.get("why_changed_explanations")
    assert explanations is not None
    assert isinstance(explanations, list)

def test_workflow_replan_empty_completed():
    """Verify Adaptive Replan starts from full horizon when 0 seasons completed."""
    res = client.post("/api/workflow/replan", json={
        "latitude": 24.37,
        "longitude": 88.60,
        "completed_seasons": [],
        "updated_field_conditions": {},
        "priority": "balanced",
    })
    assert res.status_code == 200
    data = res.json()
    assert data.get("completed_seasons_count") == 0
    assert data.get("remaining_seasons_count") == 6
