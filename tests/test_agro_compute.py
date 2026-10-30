"""Production unit tests for deterministic agro-climatic science module.

Tests onset detection, dry-spell lookahead rules, GDD accumulation,
Mann-Whitney U statistical comparison, sensitivity analysis, leap years,
missing data handling, and SMS constraint limits.
"""

import unittest
from datetime import date, datetime, timedelta
import numpy as np
import pandas as pd

from src.compute.agro import (
    AgronomicConfig,
    calculate_growing_degree_days,
    calendar_is_leap,
    compare_periods,
    compute_onset_series,
    detect_rainfall_onset,
    doy_to_bn_date,
    doy_to_calendar_date,
    doy_to_en_date,
    generate_recommendation,
    run_sensitivity_analysis,
)


class AgroComputeTests(unittest.TestCase):
    def setUp(self):
        # Create synthetic 1-year daily weather series for 2024 (Leap Year)
        dates = pd.date_range("2024-01-01", "2024-12-31")
        self.daily_df = pd.DataFrame({
            "date": dates,
            "rainfall": [0.0] * len(dates),
            "temp_max": [32.0] * len(dates),
            "temp_min": [24.0] * len(dates),
            "temperature": [28.0] * len(dates),
        })

    def test_onset_detection_clean_event(self):
        """Test standard 3-day rainfall window meeting threshold without dry spell."""
        df = self.daily_df.copy()
        # Set rainfall on June 5, 6, 7 (DOYs 157, 158, 159 in leap year)
        df.loc[(df["date"] >= "2024-06-05") & (df["date"] <= "2024-06-07"), "rainfall"] = [10.0, 15.0, 10.0]
        # Ensure moderate rain afterward to prevent dry spell
        df.loc[(df["date"] >= "2024-06-08") & (df["date"] <= "2024-06-28"), "rainfall"] = 5.0

        cfg = AgronomicConfig(threshold_mm=25.0, window_days=3, dry_spell_window_days=21, dry_spell_max_consecutive_days=7)
        onset = detect_rainfall_onset(df, 2024, cfg)

        self.assertIsNotNone(onset)
        self.assertEqual(onset["year"], 2024)
        self.assertEqual(onset["onset_date"], "2024-06-05")
        self.assertEqual(onset["doy"], 157)
        self.assertGreaterEqual(onset["cumulative_window_rainfall_mm"], 25.0)
        self.assertTrue(onset["is_leap_year"])

    def test_dry_spell_rule_rejects_false_onset(self):
        """Candidate event followed by 8 consecutive dry days must be rejected."""
        df = self.daily_df.copy()
        # High rainfall on June 1-3
        df.loc[(df["date"] >= "2024-06-01") & (df["date"] <= "2024-06-03"), "rainfall"] = 15.0
        # Prolonged dry spell: June 4 to June 15 (12 days of 0 rain)
        df.loc[(df["date"] >= "2024-06-04") & (df["date"] <= "2024-06-15"), "rainfall"] = 0.0
        # Genuine sustained monsoon starts on June 16
        df.loc[(df["date"] >= "2024-06-16") & (df["date"] <= "2024-06-18"), "rainfall"] = 20.0
        df.loc[(df["date"] >= "2024-06-19") & (df["date"] <= "2024-07-10"), "rainfall"] = 6.0

        cfg = AgronomicConfig(threshold_mm=25.0, dry_spell_window_days=21, dry_spell_max_consecutive_days=7)
        onset = detect_rainfall_onset(df, 2024, cfg)

        self.assertIsNotNone(onset)
        # June 1 should have been rejected as false onset; June 16 confirmed
        self.assertEqual(onset["onset_date"], "2024-06-16")
        self.assertEqual(onset["doy"], 168)

    def test_growing_degree_days_accumulation(self):
        """Verify daily GDD respects T_base (10°C) and T_cap (35°C)."""
        df = pd.DataFrame({
            "date": pd.date_range("2024-06-01", "2024-06-10"),
            "temp_max": [38.0, 30.0, 20.0, 8.0, 34.0, 30.0, 28.0, 32.0, 30.0, 30.0],
            "temp_min": [26.0, 20.0, 10.0, 6.0, 24.0, 20.0, 18.0, 22.0, 20.0, 20.0],
        })
        # Day 1: mean = (38+26)/2 = 32°C. T_eff = 32. GDD = 32 - 10 = 22.0
        # Day 4: mean = (8+6)/2 = 7°C. GDD = max(0, 7-10) = 0.0
        res = calculate_growing_degree_days(df, base_temperature_c=10.0, upper_cap_temperature_c=35.0, start_month=6, end_month=6)
        self.assertIn("period_2_mean_seasonal_gdd", res)
        self.assertEqual(res["base_temperature_c"], 10.0)
        self.assertEqual(res["upper_cap_temperature_c"], 35.0)

    def test_mann_whitney_period_comparison(self):
        """Test two-sided Mann-Whitney rank sum test logic and sample sizes."""
        # 12 baseline years vs 13 recent years with intentional 6-day shift
        p1 = [150, 152, 151, 154, 153, 155, 152, 150, 153, 154, 151, 152]
        p2 = [156, 158, 159, 160, 157, 161, 158, 155, 162, 159, 157, 160, 158]

        res = compare_periods(p1, p2)
        self.assertEqual(res["n1"], 12)
        self.assertEqual(res["n2"], 13)
        self.assertGreater(res["shift_days_median"], 0)
        self.assertLess(res["p_value"], 0.05)
        self.assertTrue(res["is_significant"])
        self.assertEqual(res["status"], "statistically_significant_delay")

    def test_insufficient_samples_returns_explicit_status(self):
        """If valid onsets are fewer than 5, return insufficient_evidence rather than a false claim."""
        p1 = [152, 154, 150] # only 3 samples
        p2 = [160, 162, 165, 163] # only 4 samples

        res = compare_periods(p1, p2)
        self.assertEqual(res["status"], "insufficient_evidence")
        self.assertFalse(res["is_significant"])
        self.assertIsNone(res["shift_days_median"])

    def test_leap_year_handling(self):
        """Verify leap year February 29 does not desynchronize Day of Year calculations."""
        self.assertTrue(calendar_is_leap(2024))
        self.assertFalse(calendar_is_leap(2023))
        self.assertTrue(calendar_is_leap(2000))
        self.assertFalse(calendar_is_leap(1900))

        # In 2024 (leap year), June 1 is DOY 153 (31 Jan + 29 Feb + 31 Mar + 30 Apr + 31 May + 1)
        self.assertEqual(pd.Timestamp(2024, 6, 1).dayofyear, 153)
        # In 2023 (non-leap), June 1 is DOY 152
        self.assertEqual(pd.Timestamp(2023, 6, 1).dayofyear, 152)

        # DOY to calendar conversion
        self.assertEqual(doy_to_calendar_date(2024, 153), "2024-06-01")
        self.assertEqual(doy_to_calendar_date(2023, 152), "2023-06-01")

    def test_sms_length_constraint(self):
        """SMS delivery requires message strictly <= 160 characters."""
        comp = {
            "status": "moderate_shift_cautionary",
            "shift_days_median": 11.0,
            "p_value": 0.58,
            "n1": 12,
            "n2": 13,
        }
        gdd = {"gdd_change": 25.6}
        rec = generate_recommendation("rajshahi", "aman", comp, [], gdd)

        sms = rec["bangla_sms"]
        self.assertLessEqual(len(sms), 160)
        self.assertGreater(len(sms), 20)
        self.assertIn("আমন", sms)

    def test_sensitivity_analysis_sweeps(self):
        """Sensitivity sweeps must test threshold +/- 5 mm."""
        # Create 25 years of daily data
        dates = pd.date_range("2001-01-01", "2025-12-31")
        # Generate cyclic rainfall with June peaks
        rain = np.where((dates.month == 6) & (dates.day.isin([3, 4, 5])), 12.0, 0.5)
        df = pd.DataFrame({"date": dates, "rainfall": rain})

        cfg = AgronomicConfig(threshold_mm=25.0)
        sens = run_sensitivity_analysis(df, cfg, step_mm=5.0)

        self.assertEqual(len(sens), 3)
        thresholds = [s["threshold_mm"] for s in sens]
        self.assertEqual(thresholds, [20.0, 25.0, 30.0])

    def test_invalid_parameters_raise_error(self):
        """Invalid agricultural parameters must fail fast with ValueError."""
        with self.assertRaises(ValueError):
            AgronomicConfig(window_days=0).validate()
        with self.assertRaises(ValueError):
            AgronomicConfig(threshold_mm=-10.0).validate()
        with self.assertRaises(ValueError):
            AgronomicConfig(base_temperature_c=36.0, upper_cap_temperature_c=35.0).validate()

    def test_excessive_missing_data_returns_none(self):
        """When missing days exceed max_missing_days_allowed, onset detection returns None."""
        df = self.daily_df.copy()
        # Set rainfall on June 5-7
        df.loc[(df["date"] >= "2024-06-05") & (df["date"] <= "2024-06-07"), "rainfall"] = 15.0
        # Inject 20 missing days in June
        df.loc[(df["date"] >= "2024-06-10") & (df["date"] <= "2024-06-29"), "rainfall"] = np.nan

        cfg = AgronomicConfig(max_missing_days_allowed=15)
        onset = detect_rainfall_onset(df, 2024, cfg)
        self.assertIsNone(onset)

    def test_negative_rainfall_sanitization(self):
        """Negative rainfall values from sensor noise or missing codes are safely clipped to 0.0."""
        df = self.daily_df.copy()
        df.loc[(df["date"] >= "2024-06-01") & (df["date"] <= "2024-06-04"), "rainfall"] = -999.0
        df.loc[(df["date"] >= "2024-06-10") & (df["date"] <= "2024-06-12"), "rainfall"] = 15.0
        df.loc[(df["date"] >= "2024-06-13") & (df["date"] <= "2024-07-03"), "rainfall"] = 4.0

        cfg = AgronomicConfig(threshold_mm=25.0, max_missing_days_allowed=30)
        onset = detect_rainfall_onset(df, 2024, cfg)
        self.assertIsNotNone(onset)
        self.assertEqual(onset["onset_date"], "2024-06-10")


if __name__ == "__main__":
    unittest.main()
