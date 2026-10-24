"""Tests for Master Feature Expansion FastAPI Endpoints.

Tests:
1. POST /api/lab/compare
2. POST /api/scenarios/crop-failure-recovery
3. POST /api/workflow/replan
4. POST /api/scenarios/weather-uncertainty
5. GET /api/crops/catalog
6. GET /api/satellite/readiness
7. POST /api/outcomes/record and GET /api/outcomes/{field_id}
"""

import unittest
from fastapi.testclient import TestClient

from backend.app.main import app


class ExpansionApiEndpointsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_get_crops_catalog(self):
        res = self.client.get("/api/crops/catalog")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["total_crops"], 15)
        self.assertGreaterEqual(len(data["sources"]), 4)
        self.assertIn("disclaimer", data)

    def test_get_satellite_readiness(self):
        res = self.client.get("/api/satellite/readiness?lat=23.8103&lon=90.4125")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertGreaterEqual(len(data["sensors"]), 3)
        sensor_names = [s["sensor_name"] for s in data["sensors"]]
        self.assertTrue(any("NASA POWER" in n for n in sensor_names))
        self.assertTrue(any("SMAP" in n for n in sensor_names))
        self.assertTrue(any("Sentinel-2" in n for n in sensor_names))

    def test_post_lab_compare(self):
        payload = {
            "field_id": "test_parcel_1",
            "latitude": 23.8103,
            "longitude": 90.4125,
            "field_size_ha": 1.5,
            "soil_ph": 6.5,
            "organic_matter": 2.1,
            "irrigation_capacity_mm": 450,
            "priority": "balanced",
        }
        res = self.client.post("/api/lab/compare", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(len(data["methods"]), 3)
        self.assertIn("trade_off_analysis", data)
        self.assertIn("export_csv", data)

    def test_post_crop_failure_recovery(self):
        payload = {
            "field_id": "demo",
            "failure_type": "drought_shock",
            "failure_season": 1,
            "severity": "severe",
            "field_state": {
                "latitude": 23.8103,
                "longitude": 90.4125,
                "field_size_ha": 2.0,
                "soil_ph": 6.4,
                "organic_matter": 1.8,
            },
        }
        res = self.client.post("/api/scenarios/crop-failure-recovery", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("financial_summary", data)
        self.assertIn("binding_constraints", data)
        self.assertEqual(len(data["recovery_plan"]), 6)

    def test_post_workflow_replan(self):
        payload = {
            "field_id": "demo",
            "completed_seasons_history": [
                {
                    "season_idx": 0,
                    "crop_planted": "Potato",
                    "yield_kg_ha": 24000,
                    "water_applied_mm": 450,
                }
            ],
            "updated_conditions": {
                "soil_ph": 6.2,
                "organic_matter": 1.9,
                "irrigation_capacity_mm": 380,
            },
            "remaining_seasons": 5,
            "priority": "balanced",
        }
        res = self.client.post("/api/workflow/replan", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["completed_seasons_count"], 1)
        self.assertIn("replanned_schedule", data)
        self.assertIn("financial_projection", data)

    def test_post_weather_uncertainty(self):
        payload = {
            "field_id": "demo",
            "latitude": 23.8103,
            "longitude": 90.4125,
            "field_state": {"field_size_ha": 1.0, "soil_ph": 6.5},
        }
        res = self.client.post("/api/scenarios/weather-uncertainty", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(len(data["scenarios"]), 5)
        self.assertIn("robustness_analysis", data)

    def test_outcomes_record_and_get(self):
        record_payload = {
            "field_id": "field_api_test",
            "season_name": "Year 1 - Rabi / Dry",
            "crop_planted": "Wheat",
            "actual_yield_kg_ha": 3100.0,
            "actual_revenue_bdt": 93000.0,
            "actual_cost_bdt": 48000.0,
            "actual_water_mm": 340.0,
            "predicted_yield_kg_ha": 3000.0,
            "predicted_revenue_bdt": 90000.0,
            "predicted_cost_bdt": 50000.0,
            "predicted_water_mm": 360.0,
            "notes": "FastAPI client end-to-end verification",
        }
        post_res = self.client.post("/api/outcomes/record", json=record_payload)
        self.assertEqual(post_res.status_code, 200)
        post_data = post_res.json()
        self.assertEqual(post_data["status"], "ok")
        self.assertGreater(post_data["outcome"]["yield_variance_pct"], 0)

        get_res = self.client.get("/api/outcomes/field_api_test")
        self.assertEqual(get_res.status_code, 200)
        get_data = get_res.json()
        self.assertEqual(get_data["status"], "ok")
        self.assertGreaterEqual(len(get_data["outcomes"]), 1)
        self.assertGreaterEqual(get_data["summary"]["total_recorded_seasons"], 1)


if __name__ == "__main__":
    unittest.main()
