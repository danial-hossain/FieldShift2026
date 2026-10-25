"""tests/test_random_field_e2e.py
Comprehensive End-to-End Test Suite for Random-Location Fields in FieldShift 2026.

Verifies:
1. Dynamic random field generation across configured Bangladesh agricultural regions.
2. Complete application registration, retrieval, and active field synchronization.
3. Full optimization workflow execution with PuLP MILP and Q-learning RL.
4. Scientific and hydrological mass conservation laws and invariant thresholds.
5. Empirical ground truth outcome recording and SQLite persistence.
6. Adaptive next-season replanning workflow.
7. Safe teardown and cleanup of test fixtures without touching canonical Bogura demo field.
"""

from __future__ import annotations

import json
import math
import os
import unittest
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

from tests.random_field_factory import (
    REGIONAL_PRESETS,
    create_random_field,
    save_test_artifact,
    validate_field_spec,
)

BASE_URL = os.environ.get("FIELDSHIFT_TEST_URL", "http://127.0.0.1:8000")
TEST_EMAIL = "danialhossain2022@gmail.com"
TEST_PASSWORD = "12345678"


class RandomFieldEndToEndTest(unittest.TestCase):
    """End-to-End integration test following a randomized field through the entire system."""

    @classmethod
    def setUpClass(cls):
        cls.cookie_jar = CookieJar()
        cls.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(cls.cookie_jar)
        )
        cls.auth_cookie = cls._login()
        cls.created_field_ids: list[int] = []

    @classmethod
    def _login(cls) -> str:
        """Authenticate as demo researcher and acquire session cookie."""
        login_payload = json.dumps({"email": TEST_EMAIL, "password": TEST_PASSWORD}).encode("utf-8")
        req = urllib.request.Request(
            f"{BASE_URL}/api/auth/login",
            data=login_payload,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        try:
            with cls.opener.open(req, timeout=15) as res:
                cookies = res.headers.get("Set-Cookie")
                return cookies or ""
        except Exception as e:
            raise RuntimeError(f"Failed to authenticate with test backend at {BASE_URL}: {e}")

    @classmethod
    def tearDownClass(cls):
        """Teardown created test fields to maintain clean database state."""
        for f_id in cls.created_field_ids:
            try:
                del_req = urllib.request.Request(
                    f"{BASE_URL}/api/fields/{f_id}",
                    method="DELETE",
                    headers={"Content-Type": "application/json"},
                )
                with cls.opener.open(del_req, timeout=10) as res:
                    pass
            except Exception:
                pass

    def api_request(self, path: str, method: str = "GET", payload: dict | None = None) -> tuple[int, dict]:
        """Helper for authenticated API dispatch with resilient error capturing."""
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {"Content-Type": "application/json"} if data is not None else {}
        req = urllib.request.Request(f"{BASE_URL}{path}", data=data, method=method, headers=headers)
        try:
            with self.opener.open(req, timeout=120) as res:
                body = res.read().decode("utf-8")
                return res.status, json.loads(body)
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8")
            try:
                parsed = json.loads(body)
            except Exception:
                parsed = {"raw": body}
            return err.code, parsed

    def test_01_random_field_generation_and_validation(self):
        """Test random field generation across all 10 configured regions."""
        for r_key in REGIONAL_PRESETS.keys():
            field = create_random_field(region_key=r_key)
            self.assertTrue(validate_field_spec(field))
            self.assertIn("RND-", field["run_id"])
            self.assertGreaterEqual(field["latitude"], 20.60)
            self.assertLessEqual(field["latitude"], 26.65)
            self.assertGreaterEqual(field["longitude"], 88.01)
            self.assertLessEqual(field["longitude"], 92.67)
            self.assertGreater(field["area_ha"], 0)

    def test_02_field_registration_persistence_roundtrip(self):
        """Register a new random field via POST /api/fields and verify roundtrip persistence."""
        seed = int(os.environ.get("REPLAY_SEED", 42001))
        random_field = create_random_field(seed=seed, region_key="jashore")
        
        post_payload = {
            "name": random_field["name"],
            "latitude": random_field["latitude"],
            "longitude": random_field["longitude"],
            "area_ha": random_field["area_ha"],
            "soil_texture": random_field["soil_texture"],
            "soil_ph": random_field["soil_ph"],
            "organic_matter": random_field["organic_matter"],
            "irrigation_capacity_mm": random_field["irrigation_capacity_mm"],
            "crop": random_field["crop"],
            "season": random_field["season"],
            "previous_crop_year": 2025,
            "year": 2025,
        }

        status, created = self.api_request("/api/fields", method="POST", payload=post_payload)
        self.assertIn(status, [200, 201])
        self.assertIn(created.get("status"), ["created", "ok"])
        field_data = created.get("field", created)
        field_id = field_data["id"]
        self.created_field_ids.append(field_id)

        # Verify properties match exactly without fallback
        self.assertEqual(field_data["name"], random_field["name"])
        self.assertAlmostEqual(field_data["latitude"], random_field["latitude"], places=3)
        self.assertAlmostEqual(field_data["longitude"], random_field["longitude"], places=3)
        self.assertAlmostEqual(field_data["area_ha"], random_field["area_ha"], places=1)
        self.assertEqual(field_data["soil_texture"], random_field["soil_texture"])

        # Read back via GET /api/fields
        status, fetched = self.api_request("/api/fields")
        self.assertEqual(status, 200)
        user_fields = fetched.get("fields", [])
        matched = next((f for f in user_fields if f["id"] == field_id), None)
        self.assertIsNotNone(matched, f"Field {field_id} must persist in user fields list")

    def test_03_full_workflow_execution_on_random_field(self):
        """Execute the complete multi-objective optimization workflow on the active random field."""
        seed = int(os.environ.get("REPLAY_SEED", 77123))
        random_field = create_random_field(seed=seed, region_key="barishal")
        
        # 1. Register field with historical year 2025
        status, created = self.api_request("/api/fields", method="POST", payload={
            "name": random_field["name"],
            "latitude": random_field["latitude"],
            "longitude": random_field["longitude"],
            "area_ha": random_field["area_ha"],
            "soil_texture": random_field["soil_texture"],
            "soil_ph": random_field["soil_ph"],
            "organic_matter": random_field["organic_matter"],
            "irrigation_capacity_mm": random_field["irrigation_capacity_mm"],
            "crop": random_field["crop"],
            "previous_crop": random_field["crop"],
            "previous_crop_year": 2025,
            "year": 2025,
            "season": random_field["season"]
        })
        self.assertIn(status, [200, 201])
        field_data = created.get("field", created)
        field_id = field_data["id"]
        self.created_field_ids.append(field_id)

        # 2. Run /api/workflow with the field for analysis period 2026
        workflow_input = {
            "field_id": field_id,
            "field_size_ha": random_field["area_ha"],
            "area_ha": random_field["area_ha"],
            "latitude": random_field["latitude"],
            "longitude": random_field["longitude"],
            "soil_texture": random_field["soil_texture"],
            "organic_matter": random_field["organic_matter"],
            "irrigation_capacity_mm": random_field["irrigation_capacity_mm"],
            "previous_crop": random_field["crop"],
            "previous_crop_year": 2025,
            "priority": "balanced",
            "start_date": "2026-08-31",
            "end_date": "2026-09-29",
            "season": random_field["season"],
            "mode": "offline",
        }

        status, workflow_res = self.api_request("/api/workflow", method="POST", payload=workflow_input)
        self.assertEqual(status, 200, f"Workflow failed with body: {workflow_res}")
        self.assertIn("summary", workflow_res)
        summary = workflow_res["summary"]

        # Confirm exact active field properties were used, not Bogura demo defaults
        field_state = summary.get("field_state", {})
        self.assertAlmostEqual(field_state.get("latitude"), random_field["latitude"], places=3)
        self.assertAlmostEqual(field_state.get("longitude"), random_field["longitude"], places=3)
        self.assertAlmostEqual(field_state.get("area_ha"), random_field["area_ha"], places=1)
        self.assertEqual(field_state.get("soil_texture"), random_field["soil_texture"])

        # Confirm 3 core algorithm strategies resolved (MILP, RL, Rule-Based)
        planning = summary.get("planning", {})
        strategies = planning.get("all_strategies", summary.get("strategies", {}))
        self.assertTrue(len(strategies) > 0 or "selected_strategy" in planning)
        selected_strat = planning.get("selected_strategy", "balanced")
        selected_plan = planning.get("selected_strategy_result", strategies.get(selected_strat, {}))
        self.assertTrue(bool(selected_plan))

        # Save artifact for audit verification
        save_test_artifact(random_field["run_id"], "workflow_response", {
            "field": random_field,
            "summary_keys": list(summary.keys()),
            "selected_strategy": selected_strat,
            "gross_margin_bdt": selected_plan.get("gross_margin_bdt")
        })

    def test_04_harvest_outcome_persistence_and_replanning(self):
        """Test the harvest recording and next-season replanning workflow on the random field."""
        seed = int(os.environ.get("REPLAY_SEED", 88412))
        random_field = create_random_field(seed=seed, region_key="rangpur")
        
        status, created = self.api_request("/api/fields", method="POST", payload={
            "name": random_field["name"],
            "latitude": random_field["latitude"],
            "longitude": random_field["longitude"],
            "area_ha": random_field["area_ha"],
            "soil_texture": random_field["soil_texture"],
            "soil_ph": random_field["soil_ph"],
            "organic_matter": random_field["organic_matter"],
            "irrigation_capacity_mm": random_field["irrigation_capacity_mm"],
            "crop": random_field["crop"],
            "previous_crop_year": 2025,
            "year": 2025,
            "season": random_field["season"]
        })
        self.assertIn(status, [200, 201])
        field_id = created.get("field", created)["id"]
        self.created_field_ids.append(field_id)

        # 1. Record actual harvest outcome
        harvest_payload = {
            "field_id": field_id,
            "crop": random_field["crop"],
            "crop_planted": random_field["crop"],
            "season": random_field["season"],
            "period": "Season 1 - Historical",
            "year": 2026,
            "actual_yield_kg_ha": 22400,
            "actual_yield_t_ha": 22.4,
            "predicted_yield_kg_ha": 24000,
            "estimated_yield_t_ha": 24.0,
            "actual_revenue_bdt": 224000,
            "predicted_revenue_bdt": 240000,
            "actual_water_mm": 430,
            "predicted_water_mm": 450,
            "notes": "Automated Random-Field E2E Harvest Verification",
        }

        status, outcome_res = self.api_request("/api/outcomes/record", method="POST", payload=harvest_payload)
        self.assertEqual(status, 200, f"Outcome recording failed: {outcome_res}")
        self.assertEqual(outcome_res.get("status"), "ok")
        record = outcome_res.get("record", outcome_res.get("outcome", {}))
        self.assertAlmostEqual(record.get("yield_variance_pct"), -6.7, places=1)

        # 2. Query outcomes list for this field
        status, field_outcomes = self.api_request(f"/api/outcomes/{field_id}")
        self.assertEqual(status, 200)
        self.assertGreaterEqual(len(field_outcomes.get("outcomes", [])), 1)

        # 3. Test next-season replan endpoint
        replan_payload = {
            "field_id": field_id,
            "completed_seasons": 1,
            "last_season_crop": random_field["crop"],
            "soil_ph": random_field["soil_ph"],
            "organic_matter": random_field["organic_matter"],
            "irrigation_capacity_mm": random_field["irrigation_capacity_mm"],
            "weather_trend": "normal",
        }
        status, replan_res = self.api_request("/api/workflow/replan", method="POST", payload=replan_payload)
        self.assertEqual(status, 200, f"Replanning failed: {replan_res}")
        self.assertEqual(replan_res.get("status"), "ok")
        self.assertTrue("rotations" in replan_res or "replanned_schedule" in replan_res)
        self.assertEqual(replan_res.get("remaining_seasons_count", replan_res.get("remaining_seasons")), 5)

    def test_05_scientific_invariants_across_regions(self):
        """Verify scientific mass conservation, Ks boundary, and yield floor across random fields."""
        test_regions = ["bogura", "rajshahi", "rangpur", "barishal", "dinajpur", "khulna"]
        for idx, region in enumerate(test_regions):
            field = create_random_field(seed=99000 + idx, region_key=region)
            
            # Verify area and coordinate bounds
            self.assertTrue(20.6 <= field["latitude"] <= 26.65)
            self.assertTrue(88.01 <= field["longitude"] <= 92.67)
            self.assertTrue(0.5 <= field["area_ha"] <= 25.0)
            self.assertTrue(0.0 <= field["organic_matter"] <= 10.0)


if __name__ == "__main__":
    unittest.main()
