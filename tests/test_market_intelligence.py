import unittest
from src.data.market_intelligence import (
    BENCHMARK_MARKET_PRICES,
    convert_price,
    get_market_overview,
    calculate_crop_profitability,
    export_market_catalog_csv,
    KG_PER_MAUND,
    KG_PER_TON,
)

class MarketIntelligenceTests(unittest.TestCase):
    def test_price_unit_conversions(self):
        # 1 kg = 30 BDT -> 40 kg (1 maund) = 1200 BDT
        self.assertEqual(convert_price(30.0, "bdt_kg", "bdt_maund"), 1200.0)
        # 1 maund = 1200 BDT -> 1 ton (25 maunds) = 30000 BDT
        self.assertEqual(convert_price(1200.0, "bdt_maund", "bdt_ton"), 30000.0)
        # 1 ton = 30000 BDT -> 1 kg = 30 BDT
        self.assertEqual(convert_price(30000.0, "bdt_ton", "bdt_kg"), 30.0)

    def test_market_overview_integrity_and_demand_honesty(self):
        overview = get_market_overview()
        self.assertGreaterEqual(overview["metadata"]["crops_count"], 15)
        # Verify demand signal honesty
        demand = overview["metadata"]["demand_signal"]
        self.assertEqual(demand["status"], "unavailable")
        self.assertIn("Demand data unavailable", demand["message"])
        self.assertNotIn("100% high demand", demand["message"])

        # Check crops have distinct wholesale, retail, farmgate
        for c in overview["crops"]:
            self.assertIn("farmgate_bdt_kg", c)
            self.assertIn("wholesale_bdt_kg", c)
            self.assertIn("retail_bdt_kg", c)
            self.assertIn("name_bn", c)
            self.assertIn("primary_source", c)

    def test_crop_profitability_calculations(self):
        # 2 ha of Rice, yield 4 t/ha, farmgate price 26 BDT/kg = 26000 BDT/t
        # Gross revenue = 2 ha * 4 t/ha * 26000 BDT/t = 208,000 BDT
        # Costs: prod 80000/ha + irrig 5000/ha + mktg 2000/ha = 87,000/ha * 2 ha = 174,000 BDT
        # Net return = 208,000 - 174,000 = 34,000 BDT
        # Breakeven price = 87,000 / 4 = 21,750 BDT/t
        res = calculate_crop_profitability(
            crop_name="Rice",
            area_ha=2.0,
            expected_yield_t_ha=4.0,
            farmgate_price_bdt_t=26000.0,
            production_cost_bdt_ha=80000.0,
            irrigation_cost_bdt_ha=5000.0,
            marketing_cost_bdt_ha=2000.0,
        )

        inputs = res["inputs"]
        results = res["results"]
        scenarios = res["scenarios"]

        self.assertEqual(results["gross_revenue_bdt"], 208000.0)
        self.assertEqual(results["cost_breakdown"]["total_cost_bdt"], 174000.0)
        self.assertEqual(results["estimated_net_return_bdt"], 34000.0)
        self.assertEqual(results["net_return_per_ha"], 17000.0)
        self.assertEqual(results["breakeven_selling_price_bdt_t"], 21750.0)

        # Scenarios check
        self.assertGreater(scenarios["optimistic"]["net_return_bdt"], results["estimated_net_return_bdt"])
        self.assertLess(scenarios["downside"]["net_return_bdt"], results["estimated_net_return_bdt"])

    def test_csv_export_format(self):
        csv_text = export_market_catalog_csv()
        self.assertIn("# FieldShift Market Intelligence", csv_text)
        self.assertIn("Rice", csv_text)
        self.assertIn("farmgate_bdt_kg", csv_text)

if __name__ == "__main__":
    unittest.main()
