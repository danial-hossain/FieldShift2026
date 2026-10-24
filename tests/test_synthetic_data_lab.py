import unittest
from src.experiments.synthetic_data_lab import (
    SyntheticLabConfig,
    generate_synthetic_farm_scenarios,
    export_synthetic_scenarios_csv,
    SOIL_TEXTURE_CONSTRAINTS,
)

class SyntheticDataLabTests(unittest.TestCase):
    def test_reproducibility_with_fixed_seed(self):
        cfg1 = SyntheticLabConfig(seed=123, num_scenarios=5)
        cfg2 = SyntheticLabConfig(seed=123, num_scenarios=5)
        
        res1 = generate_synthetic_farm_scenarios(cfg1)
        res2 = generate_synthetic_farm_scenarios(cfg2)
        
        self.assertEqual(res1["scenarios"], res2["scenarios"])
        self.assertEqual(res1["metadata"]["seed"], 123)

    def test_divergence_with_different_seeds(self):
        cfg1 = SyntheticLabConfig(seed=100, num_scenarios=5)
        cfg2 = SyntheticLabConfig(seed=200, num_scenarios=5)
        
        res1 = generate_synthetic_farm_scenarios(cfg1)
        res2 = generate_synthetic_farm_scenarios(cfg2)
        
        self.assertNotEqual(res1["scenarios"][0]["latitude"], res2["scenarios"][0]["latitude"])

    def test_agronomic_consistency_constraints(self):
        cfg = SyntheticLabConfig(seed=42, num_scenarios=15)
        res = generate_synthetic_farm_scenarios(cfg)
        
        for sc in res["scenarios"]:
            # Check area bounds
            self.assertGreaterEqual(sc["area_ha"], cfg.area_min_ha)
            self.assertLessEqual(sc["area_ha"], cfg.area_max_ha)
            
            # Check pH bounds
            self.assertGreaterEqual(sc["soil_ph"], cfg.ph_min)
            self.assertLessEqual(sc["soil_ph"], cfg.ph_max)
            
            # Check texture constraint on organic matter
            tex = sc["soil_texture"]
            cap = SOIL_TEXTURE_CONSTRAINTS[tex]["om_max"]
            self.assertLessEqual(sc["organic_matter_pct"], cap + 0.001)
            
            # Check non-negative water
            self.assertGreaterEqual(sc["irrigation_capacity_mm"], 0)
            self.assertGreaterEqual(sc["rainfall_seasonal_mm"], 0)
            
            # Check provenance tags
            self.assertEqual(sc["provenance_classification"], "synthetic_simulation")
            self.assertFalse(sc["is_farmer_observation"])

    def test_csv_export_format(self):
        cfg = SyntheticLabConfig(seed=42, num_scenarios=3)
        res = generate_synthetic_farm_scenarios(cfg)
        csv_text = export_synthetic_scenarios_csv(res["scenarios"], cfg)
        
        self.assertIn("# FieldShift Synthetic Data Lab Export", csv_text)
        self.assertIn("synthetic_simulation", csv_text)
        self.assertIn("scenario_id,scenario_type,seed", csv_text)
        self.assertIn("SYN-0042-001", csv_text)

if __name__ == "__main__":
    unittest.main()
