import unittest
from src.scenarios.sensitivity_analysis import run_system_sensitivity_analysis

class SensitivityAnalysisTests(unittest.TestCase):
    def test_baseline_immutability(self):
        inputs = {
            "irrigation_capacity_mm": 500.0,
            "rainfall_seasonal_mm": 400.0,
            "field_size_ha": 2.5,
            "weights": {"profit": 0.5, "water": 0.3, "soil": 0.2},
        }
        original_copy = dict(inputs)
        
        result = run_system_sensitivity_analysis(inputs, perturbation_steps=[-10.0, 10.0])
        
        # Verify baseline was not mutated
        self.assertEqual(inputs, original_copy)
        self.assertTrue(result["metadata"]["baseline_preserved"])

    def test_sweeps_and_elasticity_ranking(self):
        inputs = {
            "irrigation_capacity_mm": 600.0,
            "rainfall_seasonal_mm": 400.0,
            "weights": {"profit": 0.5, "water": 0.3, "soil": 0.2},
        }
        result = run_system_sensitivity_analysis(inputs, perturbation_steps=[-15.0, 15.0])
        
        self.assertIn("metadata", result)
        self.assertIn("sweeps", result)
        self.assertGreater(len(result["sweeps"]), 0)
        
        ranking = result["parameter_elasticity_ranking"]
        self.assertGreaterEqual(len(ranking), 3)
        # Verify descending sort by mean_elasticity
        for i in range(len(ranking) - 1):
            self.assertGreaterEqual(ranking[i]["mean_elasticity"], ranking[i+1]["mean_elasticity"])

        for item in result["sweeps"]:
            self.assertIn("parameter", item)
            self.assertIn("solver_status", item)
            self.assertIn("elasticity", item)
            self.assertIn("scientific_disclaimer", item)

if __name__ == "__main__":
    unittest.main()
