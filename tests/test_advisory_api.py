"""API integration tests for GET /api/advisory and GET /api/advisory/districts.

Tests endpoint schema, parameter handling, offline mode enforcement,
data mode provenance, and district switching.
"""

import os
import unittest
from fastapi.testclient import TestClient

from backend.app.main import app


class AdvisoryApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_districts_list(self):
        """GET /api/advisory/districts returns supported Bangladesh districts."""
        res = self.client.get("/api/advisory/districts")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertIsInstance(data["districts"], list)
        district_ids = [d["district_id"] for d in data["districts"]]
        self.assertIn("rajshahi", district_ids)
        self.assertIn("bogura", district_ids)
        self.assertIn("rangpur", district_ids)

    def test_get_advisory_rajshahi_aman_default(self):
        """GET /api/advisory with Rajshahi Aman returns valid structured science."""
        res = self.client.get("/api/advisory?district=rajshahi&crop=aman&offline=true")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["district"]["district_id"], "rajshahi")
        self.assertEqual(data["crop"], "aman")

        # Period 1 and Period 2
        p1 = data["period_1"]
        p2 = data["period_2"]
        self.assertEqual(p1["total_years"], 12)
        self.assertEqual(p2["total_years"], 13)
        self.assertGreaterEqual(p1["valid_samples"], 5)
        self.assertGreaterEqual(p2["valid_samples"], 5)
        self.assertIsNotNone(p1["median_doy"])
        self.assertIsNotNone(p2["median_doy"])

        # Comparison statistics
        comp = data["comparison"]
        self.assertIn("shift_days_median", comp)
        self.assertIn("p_value", comp)
        self.assertIn("mann_whitney_u", comp)
        self.assertIn("status", comp)

        # Growing Degree Days
        gdd = data["gdd_context"]
        self.assertEqual(gdd["base_temperature_c"], 10.0)
        self.assertEqual(gdd["upper_cap_temperature_c"], 35.0)

        # Sensitivity sweeps
        sens = data["sensitivity"]
        self.assertEqual(len(sens), 3)

        # Recommendation and SMS limit
        rec = data["recommendation"]
        self.assertIn("bangla_headline", rec)
        self.assertIn("bangla_sms", rec)
        self.assertLessEqual(rec["sms_character_count"], 160)

        # Provenance and offline data mode
        prov = data["provenance"]
        self.assertIn(prov["data_mode"], ["cache", "fixture", "live_acquired_cache"])
        self.assertEqual(prov["coordinates"]["latitude"], 24.3745)
        self.assertEqual(prov["coordinates"]["longitude"], 88.6042)

    def test_offline_mode_forces_local_fixtures(self):
        """When OFFLINE=1, no live request is made; data_mode must be cache or fixture."""
        os.environ["OFFLINE"] = "1"
        try:
            res = self.client.get("/api/advisory?district=bogura&crop=aman")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            prov = data["provenance"]
            self.assertTrue(prov["offline_forced"])
            self.assertIn(prov["data_mode"], ["cache", "fixture"])
        finally:
            os.environ.pop("OFFLINE", None)

    def test_bogura_district_advisory(self):
        """Verify advisory works for Bogura district."""
        res = self.client.get("/api/advisory?district=bogura&crop=aman&offline=true")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["district"]["district_id"], "bogura")
        self.assertEqual(data["district"]["name_en"], "Bogura")

    def test_invalid_district_raises_400(self):
        """Invalid district identifier raises HTTP 400 Bad Request."""
        res = self.client.get("/api/advisory?district=nonexistent_xyz&crop=aman&offline=true")
        self.assertEqual(res.status_code, 400)

    def test_sensitivity_parameter_tuning(self):
        """Query parameter threshold_mm changes the central evaluation threshold."""
        res = self.client.get("/api/advisory?district=rajshahi&crop=aman&threshold_mm=30.0&offline=true")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["parameters_used"]["threshold_mm"], 30.0)
        thresholds = [s["threshold_mm"] for s in data["sensitivity"]]
        self.assertEqual(thresholds, [25.0, 30.0, 35.0])

    def test_advisory_response_schema_completeness(self):
        """Ensure all required agronomic keys are present in the response."""
        res = self.client.get("/api/advisory?district=rajshahi&crop=aman&offline=true")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        required_keys = [
            "status", "district", "crop", "parameters_used",
            "period_1", "period_2", "comparison", "gdd_context",
            "sensitivity", "recommendation", "methodology", "provenance"
        ]
        for key in required_keys:
            self.assertIn(key, data, f"Missing key: {key}")

    def test_unsupported_crop_raises_400(self):
        """Unsupported crop raises HTTP 400 Bad Request."""
        res = self.client.get("/api/advisory?district=rajshahi&crop=unknown_crop&offline=true")
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
