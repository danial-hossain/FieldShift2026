import unittest
from src.data.provenance_schema import (
    ProvenanceRecord,
    build_system_parameter_registry,
    calculate_data_reliability_metrics,
    PROVENANCE_WEIGHTS,
)

class ProvenanceSchemaTests(unittest.TestCase):
    def test_registry_contains_valid_records(self):
        records = build_system_parameter_registry()
        self.assertGreaterEqual(len(records), 10)
        for r in records:
            d = r.to_dict()
            self.assertIn("parameter_name", d)
            self.assertIn("classification", d)
            self.assertIn("badge_info", d)
            self.assertIn(r.classification, PROVENANCE_WEIGHTS)

    def test_reliability_metrics_calculation(self):
        metrics = calculate_data_reliability_metrics()
        self.assertGreater(metrics["total_parameters"], 0)
        self.assertGreater(metrics["reliability_score"], 0)
        self.assertLessEqual(metrics["reliability_score"], 100)
        self.assertIn("provenance_breakdown", metrics)
        self.assertIn("scientific_disclaimer", metrics)

    def test_formula_correctness(self):
        custom_records = [
            ProvenanceRecord("param1", 10, "mm", "observed_real_data"), # weight 1.0
            ProvenanceRecord("param2", 20, "mm", "synthetic_simulation"), # weight 0.15
        ]
        metrics = calculate_data_reliability_metrics(custom_records)
        expected = round(((1.0 * 1.0 + 1.0 * 0.15) / 2.0) * 100.0, 1)
        self.assertEqual(metrics["reliability_score"], expected)

if __name__ == "__main__":
    unittest.main()
