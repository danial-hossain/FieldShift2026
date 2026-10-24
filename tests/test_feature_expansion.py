"""Integration and unit tests for the Master Feature Expansion.

Covers:
1. P0: Adaptive Next-Season Replanning
2. P0: MILP vs RL vs Rule-Based Comparison Lab
3. P0: Crop Failure and Recovery Simulator
4. P1: Weather Forecast Uncertainty & Robust Planning
5. P1: Soil Health & Sustainability Tracking
6. P1: Bangladesh Crop Catalog & Provenance
7. P1: Satellite Readiness Connector Interface
8. P2: Actual vs Estimated Outcome Tracking
"""

from __future__ import annotations

import unittest
from types import SimpleNamespace
import pandas as pd

from src.data.bangladesh_crops import (
    get_crop_catalog_with_provenance,
    get_satellite_readiness_status,
)
from src.data.crops import load_crop_knowledge
from src.data.outcome_tracker import list_actual_outcomes, record_actual_outcome
from src.experiments.integrated_research_demo import DEFAULT_NASA_PATH
from src.integration.comparison_lab import run_three_way_comparison
from src.optimizer.adaptive_replan import run_adaptive_replan
from src.optimizer.rule_based import run_rule_based_rotation
from src.preprocessing.features import build_features
from src.scenarios.recovery_simulator import simulate_crop_failure_and_recovery
from src.scenarios.robust_planning import run_weather_uncertainty_analysis
from src.state.field_state import build_field_state


class FeatureExpansionTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.crops = load_crop_knowledge()
        cls.power = pd.read_csv(DEFAULT_NASA_PATH)
        cls.power["date"] = pd.to_datetime(cls.power["date"])
        cls.state = build_field_state(
            "test_field",
            23.8103,
            90.4125,
            cls.power["date"].max(),
            cls.power,
            crop_knowledge=cls.crops,
        )
        cls.state.field_size_ha = 2.0
        cls.state.ph = 6.4
        cls.state.organic_matter = 1.9
        cls.features = build_features(cls.state, environmental_history=cls.power)

    def test_rule_based_rotation_baseline(self):
        result = run_rule_based_rotation(
            self.state,
            crops=self.crops,
            features=self.features,
            priority="balanced",
        )
        self.assertIn(result["status"], {"optimal", "feasible"})
        self.assertEqual(len(result["selected_crop_by_period"]), 6)
        metrics = result["metrics"]
        self.assertGreater(metrics["total_field_profit_bdt"], 0)
        self.assertGreater(metrics["total_water_requirement_mm"], 0)
        self.assertGreaterEqual(metrics["legume_season_count"], 1)
        self.assertEqual(len(result["rule_traces"]), 6)

    def test_three_way_comparison_lab(self):
        result = run_three_way_comparison(
            self.state,
            self.power,
            crops=self.crops,
            features=self.features,
            priority="balanced",
        )
        self.assertEqual(result["status"], "ok")
        self.assertEqual(len(result["methods"]), 3)
        method_ids = [m["id"] for m in result["methods"]]
        self.assertListEqual(method_ids, ["milp", "rl", "rule_based"])

        for m in result["methods"]:
            self.assertGreater(len(m["rotation_sequence"]), 0)
            self.assertGreater(m["profit_bdt_per_ha"], 0)
            self.assertGreater(m["water_requirement_mm"], 0)
            self.assertIn("initial_soil_health", m)
            self.assertIn("runtime_ms", m)

        trade_offs = result["trade_off_analysis"]
        self.assertIn("highest_profit", trade_offs)
        self.assertIn("most_water_efficient", trade_offs)
        self.assertIn("honest_evaluation_summary", trade_offs)
        self.assertTrue(result["export_csv"].startswith("Evaluation Dimension"))

    def test_crop_failure_and_recovery_simulator(self):
        result = simulate_crop_failure_and_recovery(
            self.state,
            self.power,
            failure_event="crop_failure",
            impacted_season_index=2,
            severity="severe",
            crops=self.crops,
            features=self.features,
            priority="balanced",
        )
        self.assertEqual(result["status"], "ok")
        self.assertIn("baseline", result["rotations"])
        self.assertIn("adaptive_recovery", result["rotations"])

        fin = result["financial_summary"]
        self.assertGreater(fin["baseline_profit_bdt"], 0)
        self.assertGreater(fin["direct_shock_loss_bdt"], 0)
        self.assertGreater(fin["adaptive_recovery_profit_bdt"], fin["unrecovered_shock_profit_bdt"])
        self.assertGreater(len(result["binding_constraints"]), 0)
        self.assertEqual(len(result["seasonal_comparison"]), 6)

    def test_adaptive_next_season_replanning(self):
        completed = [
            {
                "period": "Y1_S1",
                "crop": "Lentil",
                "actual_yield_t_ha": 1.4,
                "actual_water_mm": 280.0,
            }
        ]
        updated_conditions = {
            "soil_ph": 6.2,
            "organic_matter": 2.2,
            "available_water_mm": 390.0,
        }
        result = run_adaptive_replan(
            self.state,
            self.power,
            completed_seasons=completed,
            updated_field_conditions=updated_conditions,
            crops=self.crops,
            priority="balanced",
            features=self.features,
        )
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["completed_seasons_count"], 1)
        self.assertEqual(result["remaining_seasons_count"], 5)
        self.assertEqual(len(result["seasonal_comparison"]), 6)
        self.assertIn("why_changed_explanations", result)
        self.assertTrue(result["rotations"]["adaptive_replan"].startswith("Lentil"))

    def test_weather_uncertainty_and_robust_planning(self):
        result = run_weather_uncertainty_analysis(
            self.state,
            self.power,
            crops=self.crops,
            features=self.features,
            priority="balanced",
        )
        self.assertEqual(result["status"], "ok")
        self.assertEqual(len(result["scenarios"]), 5)
        scenario_ids = [s["scenario_id"] for s in result["scenarios"]]
        self.assertListEqual(
            scenario_ids,
            ["baseline", "drier", "hotter", "heat_and_drought", "low_irrigation"],
        )
        summary = result["robustness_summary"]
        self.assertGreater(summary["overall_robustness_score_pct"], 0)
        self.assertIn("worst_case_profit_bdt", summary)

    def test_bangladesh_crop_catalog_and_provenance(self):
        catalog = get_crop_catalog_with_provenance()
        self.assertEqual(len(catalog), 15)
        rice = next(c for c in catalog if c["crop"] == "Rice")
        self.assertEqual(rice["family"], "Poaceae (Gramineae)")
        self.assertIn("BRRI", rice["authority_source"])
        self.assertIn("limitations", rice)

    def test_satellite_readiness_connector(self):
        readiness = get_satellite_readiness_status(23.8103, 90.4125)
        self.assertEqual(readiness["status"], "ok")
        sensors = readiness["connectors"]
        sensor_ids = [s["sensor_id"] for s in sensors]
        self.assertIn("nasa_power", sensor_ids)
        self.assertIn("nasa_smap", sensor_ids)
        self.assertIn("sentinel_2", sensor_ids)

        power_s = next(s for s in sensors if s["sensor_id"] == "nasa_power")
        self.assertEqual(power_s["status"], "connected_live")

        sentinel_s = next(s for s in sensors if s["sensor_id"] == "sentinel_2")
        self.assertEqual(sentinel_s["status"], "interface_ready_not_connected")

    def test_actual_outcome_tracking_and_variance(self):
        payload = {
            "crop": "Mustard",
            "season": "dry",
            "year": 2026,
            "actual_yield_t_ha": 1.6,
            "estimated_yield_t_ha": 1.5,
            "actual_revenue_bdt": 104000.0,
            "estimated_revenue_bdt": 97500.0,
            "actual_water_mm": 320.0,
            "estimated_water_mm": 350.0,
            "management_notes": "Tested in expansion test suite.",
        }
        res = record_actual_outcome(99, payload, user_id=1)
        self.assertEqual(res["status"], "created")
        var = res["variance_analysis"]
        self.assertEqual(var["yield"]["direction"], "favorable")
        self.assertEqual(var["revenue"]["direction"], "favorable")
        self.assertEqual(var["water"]["direction"], "unfavorable")  # less water used is favorable/unfavorable depending on metric
        outcomes = list_actual_outcomes(99)
        self.assertGreaterEqual(len(outcomes), 1)


if __name__ == "__main__":
    unittest.main()
