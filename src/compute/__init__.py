"""Deterministic Agro-climatic Computation Engine for FieldShift 2026.

Provides planting-window advisories, onset detection, dry-spell lookaheads,
Growing Degree Day (GDD) accumulations, and non-parametric statistical tests.
"""

from src.compute.agro import (
    AgronomicConfig,
    compare_periods,
    detect_rainfall_onset,
    compute_onset_series,
    calculate_growing_degree_days,
    run_sensitivity_analysis,
    generate_recommendation,
)

__all__ = [
    "AgronomicConfig",
    "compare_periods",
    "detect_rainfall_onset",
    "compute_onset_series",
    "calculate_growing_degree_days",
    "run_sensitivity_analysis",
    "generate_recommendation",
]
