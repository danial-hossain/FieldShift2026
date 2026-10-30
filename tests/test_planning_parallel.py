"""tests/test_planning_parallel.py
Verifies that concurrent POST /api/planning requests execute in parallel without
temporary file collisions or race conditions on Windows.
"""

import os
os.environ["OFFLINE"] = "1"

import concurrent.futures
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_planning_parallel_four_priorities_bogura():
    """Verify 4 simultaneous requests for Bogura with area_ha=10 all return HTTP 200 and optimal plans."""
    priorities = ["balanced", "profit", "water", "soil"]
    payloads = [
        {"district": "bogura", "priority": p, "area_ha": 10.0, "field_size_ha": 10.0}
        for p in priorities
    ]

    def _call(payload):
        # Dedicated client per thread or shared TestClient
        res = client.post("/api/planning", json=payload)
        return res.status_code, res.json()

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(_call, payloads))

    for status_code, body in results:
        assert status_code == 200, f"Expected 200, got {status_code}: {body}"
        assert body.get("status") == "ok"
        summary = body.get("summary", {}).get("planning", {})
        result = summary.get("selected_strategy_result", {})
        assert result.get("status") == "optimal", f"Expected optimal, got {result.get('status')}"
        crops = result.get("selected_crop_by_period", {})
        assert len(crops) == 6, f"Expected 6 periods, got {len(crops)}"


def test_planning_parallel_four_priorities_rajshahi():
    """Verify 4 simultaneous requests for Rajshahi with area_ha=10 all return HTTP 200."""
    priorities = ["balanced", "profit", "water", "soil"]
    payloads = [
        {"district": "rajshahi", "priority": p, "area_ha": 10.0, "field_size_ha": 10.0}
        for p in priorities
    ]

    def _call(payload):
        res = client.post("/api/planning", json=payload)
        return res.status_code, res.json()

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(_call, payloads))

    for status_code, body in results:
        assert status_code == 200, f"Expected 200, got {status_code}: {body}"
        assert body.get("status") == "ok"
        summary = body.get("summary", {}).get("planning", {})
        result = summary.get("selected_strategy_result", {})
        assert result.get("status") == "optimal"
        assert len(result.get("selected_crop_by_period", {})) == 6
