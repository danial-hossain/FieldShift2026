import json
import math
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from unittest.mock import Mock, patch

from app.server import _sanitize_json_value, get_server


class AppServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = get_server("127.0.0.1", 8767)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.5)

    def setUp(self):
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(CookieJar())
        )

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def fetch(self, path, method="GET", payload=None):
        data = None
        headers = {}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(
            f"http://127.0.0.1:8767{path}",
            data=data,
            method=method,
            headers=headers,
        )
        with self.opener.open(request, timeout=120) as response:
            response_body = response.read().decode("utf-8")
            return response.status, json.loads(response_body)

    def fetch_error(self, path, method="GET", payload=None):
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(
            f"http://127.0.0.1:8767{path}",
            data=data,
            method=method,
            headers={"Content-Type": "application/json"} if data is not None else {},
        )
        with self.assertRaises(urllib.error.HTTPError) as raised:
            self.opener.open(request, timeout=20)
        body = raised.exception.read().decode("utf-8")
        return raised.exception.code, json.loads(body)

    def test_health_endpoint(self):
        status, payload = self.fetch("/api/health")
        self.assertEqual(status, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertTrue(payload["synthetic_boundary"])

    def test_location_weather_endpoint_returns_resolved_area_and_observed_temperature(self):
        import pandas as pd

        geocode_response = Mock()
        geocode_response.json.return_value = {
            "address": {
                "city": "Dhaka",
                "state": "Dhaka Division",
                "country": "Bangladesh",
            }
        }
        observations = pd.DataFrame(
            [
                {
                    "date": pd.Timestamp("2026-09-29"),
                    "temperature": 29.5,
                    "temp_min": 25.0,
                    "temp_max": 33.0,
                }
            ]
        )
        with (
            patch("app.server.requests.get", return_value=geocode_response),
            patch(
                "src.data.nasa_power.fetch_recent_nasa_power",
                return_value=observations,
            ) as fetch_weather,
        ):
            status, payload = self.fetch(
                "/api/location/weather",
                method="POST",
                payload={"latitude": 23.8103, "longitude": 90.4125},
            )

        self.assertEqual(status, 200)
        self.assertEqual(payload["location_name"], "Dhaka, Dhaka Division, Bangladesh")
        self.assertEqual(payload["weather"]["temperature_c"], 29.5)
        self.assertEqual(payload["weather"]["temp_min_c"], 25.0)
        self.assertEqual(payload["weather"]["temp_max_c"], 33.0)
        self.assertEqual(payload["weather"]["observation_date"], "2026-09-29")
        self.assertIn("not real-time", payload["weather_note"])
        self.assertIn("weather_requested_through", payload)
        fetch_weather.assert_called_once_with(
            23.8103,
            90.4125,
            days=14,
            processing_lag_days=0,
            save=False,
        )

    def test_location_weather_endpoint_rejects_invalid_coordinates(self):
        status, payload = self.fetch_error(
            "/api/location/weather",
            method="POST",
            payload={"latitude": 91, "longitude": 90.4125},
        )
        self.assertEqual(status, 400)
        self.assertIn("latitude must be between", payload["message"])

    def test_demo_endpoint(self):
        status, payload = self.fetch("/api/demo", method="POST", payload={"mode": "offline"})
        self.assertEqual(status, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["mode"], "offline")
        self.assertEqual(payload["summary"]["research_boundary"], "synthetic_demo_only")

    def test_json_sanitization_handles_nan_and_infinity(self):
        payload = {
            "finite": 1.25,
            "nan_value": float("nan"),
            "pos_inf": float("inf"),
            "neg_inf": float("-inf"),
            "nested": [{"value": float("nan")}, {"value": 3.5}],
        }
        safe = _sanitize_json_value(payload)
        self.assertEqual(safe["finite"], 1.25)
        self.assertIsNone(safe["nan_value"])
        self.assertIsNone(safe["pos_inf"])
        self.assertIsNone(safe["neg_inf"])
        self.assertIsNone(safe["nested"][0]["value"])
        self.assertEqual(safe["nested"][1]["value"], 3.5)

        json_text = json.dumps(safe)
        self.assertNotIn("NaN", json_text)
        self.assertNotIn("Infinity", json_text)
        self.assertNotIn("-Infinity", json_text)
        self.assertIn('"nan_value": null', json_text)
        self.assertEqual(
            json.dumps(_sanitize_json_value(payload), allow_nan=False),
            json.dumps(safe, allow_nan=False),
        )

    def test_demo_response_contains_valid_json_without_nan_tokens(self):
        request = urllib.request.Request(
            "http://127.0.0.1:8767/api/demo",
            data=json.dumps({"mode": "offline"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read().decode("utf-8")
        self.assertEqual(response.status, 200)
        self.assertNotIn("NaN", body)
        self.assertNotIn("Infinity", body)
        self.assertNotIn("-Infinity", body)
        self.assertIn('"status": "ok"', body)
        parsed = json.loads(body)
        self.assertEqual(parsed["mode"], "offline")

    def test_user_and_farm_endpoints_create_records(self):
        email = f"demo_user_{time.time_ns()}@example.com"
        user_response = self.fetch(
            "/api/auth/register",
            method="POST",
            payload={"name": "Demo Farmer", "email": email, "password": "secret123"},
        )
        self.assertEqual(user_response[0], 201)
        self.assertEqual(user_response[1]["status"], "created")
        user = user_response[1]["user"]
        user_id = user["id"]

        farm_response = self.fetch(
            "/api/farms",
            method="POST",
            payload={"name": "Demo farm", "description": "Test field"},
        )
        self.assertEqual(farm_response[0], 201)
        self.assertEqual(farm_response[1]["status"], "created")
        self.assertEqual(farm_response[1]["farm"]["name"], "Demo farm")

        farms_response = self.fetch("/api/farms")
        self.assertEqual(farms_response[0], 200)
        self.assertGreaterEqual(len(farms_response[1]["farms"]), 1)

        field_response = self.fetch(
            "/api/fields",
            method="POST",
            payload={
                "farm_id": farm_response[1]["farm"]["id"],
                "name": "North field",
                "latitude": 23.8103,
                "longitude": 90.4125,
                "area_ha": 2.5,
            },
        )
        self.assertEqual(field_response[0], 201)
        field_id = field_response[1]["field"]["id"]
        fields = self.fetch(f"/api/fields?farm_id={farm_response[1]['farm']['id']}")
        self.assertEqual(fields[1]["fields"][0]["id"], field_id)

        history_response = self.fetch(
            f"/api/fields/{field_id}/history",
            method="POST",
            payload={"crop": "Mungbean", "season": "wet", "year": 2025},
        )
        self.assertEqual(history_response[0], 201)
        self.assertEqual(history_response[1]["history"]["crop"], "Mungbean")

        analysis_response = self.fetch(
            "/api/analyses",
            method="POST",
            payload={
                "field_id": field_id,
                "farm_id": farm_response[1]["farm"]["id"],
                "latitude": 23.8103,
                "longitude": 90.4125,
                "start_date": "2026-08-31",
                "end_date": "2026-09-29",
                "field_size_ha": 2.5,
                "organic_matter": 2.5,
                "irrigation_capacity_mm": 90,
                "soil_texture": "loam",
                "priority": "profit",
                "season": "dry",
                "mode": "offline",
                "include_history": True,
            },
        )
        analysis_id = analysis_response[1]["analysis"]["id"]
        run_response = self.fetch(f"/api/analyses/{analysis_id}/run", method="POST", payload={})
        self.assertEqual(run_response[1]["analysis"]["status"], "completed")
        self.assertEqual(run_response[1]["summary"]["status"], "ok")

        history = self.fetch("/api/analyses")
        self.assertEqual(history[1]["analyses"][0]["id"], analysis_id)

        self.fetch("/api/auth/logout", method="POST", payload={})
        status, error = self.fetch_error("/api/analyses")
        self.assertEqual(status, 401)
        self.assertEqual(error["status"], "error")

    def test_custom_offline_workflow_uses_validated_inputs_and_strict_json(self):
        status, payload = self.fetch(
            "/api/workflow",
            method="POST",
            payload={
                "mode": "offline",
                "latitude": 23.8103,
                "longitude": 90.4125,
                "start_date": "2026-08-31",
                "end_date": "2026-09-29",
                "field_size_ha": 12.5,
                "soil_texture": "loam",
                "organic_matter": 2.5,
                "irrigation_capacity_mm": 90,
                "priority": "water_efficiency",
                "season": "dry",
                "include_history": True,
            },
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["status"], "ok")
        summary = payload["summary"]
        self.assertEqual(summary["mode"], "offline")
        self.assertEqual(summary["nasa_power"]["data_status"], "demo")
        self.assertEqual(
            summary["field_state"]["temperature_source"],
            "bundled NASA POWER demo (synthetic)",
        )
        self.assertEqual(summary["field_state"]["available_water_source"], "unavailable")
        self.assertEqual(summary["planning"]["selected_priority"], "water_efficiency")
        self.assertEqual(summary["field_state"]["organic_matter_percent"], 2.5)
        self.assertIn("water_focused", summary["planning"]["all_strategies"])
        ml_analysis = summary["ml"]["strategy_yield_analysis"]
        self.assertEqual(
            set(ml_analysis),
            {"profit_focused", "water_focused", "soil_focused", "balanced"},
        )
        for strategy_analysis in ml_analysis.values():
            self.assertEqual(len(strategy_analysis["seasons"]), 6)
            for season_prediction in strategy_analysis["seasons"]:
                self.assertEqual(
                    season_prediction["features_used"][
                        f"crop_is_{season_prediction['crop'].lower()}"
                    ],
                    1.0,
                )
                self.assertGreaterEqual(season_prediction["uncertainty_t_ha"], 0.0)
        strategy_rotations = summary["planning"]["all_strategies"]
        for left_name, left_plan in strategy_rotations.items():
            for right_name, right_plan in strategy_rotations.items():
                if left_plan["selected_crop_by_period"] == right_plan["selected_crop_by_period"]:
                    left_predictions = ml_analysis[left_name]["seasons"]
                    right_predictions = ml_analysis[right_name]["seasons"]
                    self.assertEqual(
                        [item["predicted_yield_t_ha"] for item in left_predictions],
                        [item["predicted_yield_t_ha"] for item in right_predictions],
                    )
        self.assertEqual(
            set(summary["stress_test"]["scenarios"]),
            {"normal", "drought", "heat", "low_water"},
        )
        self.assertEqual(summary["rl"]["policy_type"], "DeterministicBaselinePolicy")
        self.assertIsNone(summary["rl"]["transition_reward"])
        self.assertTrue(
            any("not a learned policy" in item for item in summary["limitations"])
        )
        json.dumps(payload, allow_nan=False)
        self.assertIsNotNone(summary["final_plan"]["rotation"])

    def test_counterfactual_endpoint_runs_milp_and_propagates_rainfall_and_history_inputs(self):
        status, result = self.fetch(
            "/api/counterfactual/reoptimize",
            method="POST",
            payload={
                "field_id": "demo",
                "mode": "offline",
                "latitude": 23.8103,
                "longitude": 90.4125,
                "field_size_ha": 10.0,
                "soil_texture": "loam",
                "organic_matter": 2.5,
                "irrigation_capacity_mm": 90.0,
                "priority": "balanced",
                "start_date": "2026-08-31",
                "end_date": "2026-09-29",
                "counterfactual_rainfall_delta_mm": -10.0,
                "include_history": False,
                "include_previous_crop_history": False,
            },
        )
        self.assertEqual(status, 200)
        self.assertEqual(result["scenario"], "Custom Counterfactual")
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["solver"], "PuLP/CBC")
        self.assertEqual(result["counterfactual_inputs"]["rainfall_delta_mm"], -10.0)
        self.assertAlmostEqual(
            result["counterfactual_inputs"]["rainfall_window_mm"],
            result["baseline_inputs"]["rainfall_window_mm"] - 10.0,
        )
        self.assertAlmostEqual(
            result["solver_inputs"]["environmental_history_rainfall_total_mm"],
            result["counterfactual_inputs"]["rainfall_window_mm"],
        )
        self.assertEqual(
            result["solver_inputs"]["irrigation_capacity_mm"],
            result["baseline_inputs"]["irrigation_capacity_mm"],
        )
        self.assertTrue(result["provenance"]["irrigation_capacity_is_separate_from_rainfall"])
        self.assertFalse(result["provenance"]["include_previous_crop_history"])
        self.assertEqual(result["solver_inputs"]["previous_crop_history_rows"], 0)
        self.assertEqual(len(result["baseline_rotation"]), 6)
        self.assertEqual(len(result["counterfactual_rotation"]), 6)
        self.assertEqual(result["provenance"]["validation"], "not field validated")

    def test_counterfactual_zero_delta_preserves_rainfall_and_history_toggle(self):
        status, result = self.fetch(
            "/api/counterfactual/reoptimize",
            method="POST",
            payload={
                "field_id": "demo",
                "mode": "offline",
                "latitude": 23.8103,
                "longitude": 90.4125,
                "field_size_ha": 10.0,
                "soil_texture": "loam",
                "organic_matter": 2.5,
                "irrigation_capacity_mm": 90.0,
                "priority": "balanced",
                "start_date": "2026-08-31",
                "end_date": "2026-09-29",
                "counterfactual_rainfall_delta_mm": 0,
                "include_history": True,
                "include_previous_crop_history": True,
                "previous_crop": "Lentil",
                "previous_crop_year": 2024,
            },
        )
        self.assertEqual(status, 200)
        self.assertEqual(result["counterfactual_inputs"]["rainfall_delta_mm"], 0.0)
        self.assertEqual(
            result["counterfactual_inputs"]["rainfall_window_mm"],
            result["baseline_inputs"]["rainfall_window_mm"],
        )
        self.assertEqual(
            result["solver_inputs"]["environmental_history_rainfall_total_mm"],
            result["baseline_inputs"]["rainfall_window_mm"],
        )
        self.assertTrue(result["provenance"]["include_previous_crop_history"])
        self.assertGreaterEqual(result["solver_inputs"]["previous_crop_history_rows"], 1)

    def test_invalid_offline_location_returns_json_error_not_demo_fallback(self):
        status, payload = self.fetch_error(
            "/api/workflow",
            method="POST",
            payload={
                "mode": "offline",
                "latitude": 40,
                "longitude": -70,
                "start_date": "2026-08-31",
                "end_date": "2026-09-29",
            },
        )
        self.assertEqual(status, 400)
        self.assertIn("Choose NASA POWER mode", payload["message"])

    def test_live_mode_uses_nasa_power_loader_without_offline_substitution(self):
        import pandas as pd

        from src.experiments.integrated_research_demo import DEFAULT_NASA_PATH

        live_observations = pd.read_csv(DEFAULT_NASA_PATH)
        with patch("src.data.nasa_power.fetch_nasa_power", return_value=live_observations) as fetch:
            status, payload = self.fetch(
                "/api/workflow",
                method="POST",
                payload={
                    "mode": "live",
                    "latitude": 40,
                    "longitude": -70,
                    "start_date": "2026-08-31",
                    "end_date": "2026-09-29",
                    "priority": "balanced",
                    "include_history": False,
                },
            )
        self.assertEqual(status, 200)
        self.assertEqual(payload["mode"], "live")
        self.assertEqual(payload["summary"]["nasa_power"]["data_status"], "observed")
        self.assertEqual(payload["summary"]["nasa_power"]["source"], "NASA_POWER_Daily_Point_API")
        self.assertEqual(
            payload["summary"]["field_state"]["temperature_source"],
            "NASA POWER observed input",
        )
        fetch.assert_called_once()

    def test_login_required_for_persistence_and_authentication_round_trip(self):
        email = f"login_{time.time_ns()}@example.com"
        self.fetch(
            "/api/auth/register",
            method="POST",
            payload={"name": "Farmer", "email": email, "password": "password123"},
        )
        self.fetch("/api/auth/logout", method="POST", payload={})
        status, error = self.fetch_error("/api/farms")
        self.assertEqual(status, 401)
        self.assertEqual(error["status"], "error")

        login = self.fetch(
            "/api/auth/login",
            method="POST",
            payload={"email": email, "password": "password123"},
        )
        self.assertEqual(login[1]["user"]["email"], email)
        self.assertEqual(self.fetch("/api/auth/me")[1]["user"]["email"], email)

    def test_create_field_with_optional_values_missing(self):
        email = f"field_test_{time.time_ns()}@example.com"
        self.fetch(
            "/api/auth/register",
            method="POST",
            payload={"name": "Test User", "email": email, "password": "password123"},
        )
        # Create field with missing optional values and no farm_id specified
        status, res = self.fetch(
            "/api/fields",
            method="POST",
            payload={
                "name": "Minimalist Parcel",
                "latitude": 23.8103,
                "longitude": 90.4125,
            },
        )
        self.assertEqual(status, 201)
        self.assertEqual(res["status"], "created")
        field = res["field"]
        self.assertEqual(field["name"], "Minimalist Parcel")
        self.assertIn("history", field)
        self.assertIn("previous_crop", field)
        self.assertIn("last_analysis_date", field)

        # Listing fields without farm_id query param
        l_status, l_res = self.fetch("/api/fields")
        self.assertEqual(l_status, 200)
        self.assertEqual(l_res["status"], "ok")
        self.assertTrue(any(f["id"] == field["id"] for f in l_res["fields"]))


if __name__ == "__main__":
    unittest.main()
