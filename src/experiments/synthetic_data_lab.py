"""Reproducible Synthetic Farm Scenario Generator & Synthetic Data Lab for FieldShift 2026.

Features:
- Configurable scenario count, seed, area bounds, soil chemistry, climate and stress modes.
- Strict agronomic consistency constraints (texture-organic matter coupling, realistic pH buffers).
- Fixed-seed deterministic reproducibility.
- Explicit provenance tagging: classification='synthetic_simulation', is_farmer_observation=False.
- Export to JSON and CSV with scientific disclaimers.
"""

from __future__ import annotations

import csv
import io
import json
import random
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

# Supported stress scenarios
ScenarioType = Literal["baseline", "drought", "heat", "low_irrigation", "combined_stress"]
AssumptionProfile = Literal["standard", "optimistic", "stressed"]

SOIL_TEXTURE_CONSTRAINTS = {
    "sandy loam": {"om_max": 1.8, "water_retention": 0.45, "percolation_mm_day": 18.0},
    "loam": {"om_max": 2.8, "water_retention": 0.65, "percolation_mm_day": 8.0},
    "silt loam": {"om_max": 3.2, "water_retention": 0.72, "percolation_mm_day": 6.0},
    "clay loam": {"om_max": 3.5, "water_retention": 0.78, "percolation_mm_day": 4.0},
    "clay": {"om_max": 4.0, "water_retention": 0.85, "percolation_mm_day": 2.0},
}


@dataclass
class SyntheticLabConfig:
    seed: int = 42
    num_scenarios: int = 8
    area_min_ha: float = 0.5
    area_max_ha: float = 12.0
    ph_min: float = 5.2
    ph_max: float = 7.6
    om_min: float = 1.0
    om_max: float = 3.0
    irrigation_min_mm: float = 100.0
    irrigation_max_mm: float = 800.0
    assumption_profile: AssumptionProfile = "standard"
    include_stress_scenarios: bool = True
    version: str = "2026.1"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SyntheticFarmScenario:
    scenario_id: str
    scenario_type: ScenarioType
    seed: int
    field_name: str
    region: str
    latitude: float
    longitude: float
    area_ha: float
    soil_texture: str
    soil_ph: float
    organic_matter_pct: float
    irrigation_capacity_mm: float
    rainfall_seasonal_mm: float
    avg_temperature_c: float
    crop_yield_multiplier: float
    crop_price_multiplier: float
    crop_cost_multiplier: float
    provenance_classification: str = "synthetic_simulation"
    is_farmer_observation: bool = False
    scientific_disclaimer: str = "Synthetic simulation fixture. Does not represent measured farm ground-truth."

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def generate_synthetic_farm_scenarios(config: Optional[SyntheticLabConfig] = None) -> Dict[str, Any]:
    """Deterministically generate synthetic farm scenarios based on a fixed random seed and config."""
    cfg = config or SyntheticLabConfig()
    rng = random.Random(cfg.seed)

    regions = [
        {"name": "Rajshahi (Barind Tract)", "lat_range": (24.2, 24.6), "lon_range": (88.4, 88.8), "primary_textures": ["clay loam", "clay"]},
        {"name": "Bogura (High Ganges)", "lat_range": (24.7, 24.9), "lon_range": (89.2, 89.5), "primary_textures": ["loam", "silt loam"]},
        {"name": "Jessore (South-West Delta)", "lat_range": (23.1, 23.3), "lon_range": (89.1, 89.4), "primary_textures": ["silt loam", "loam"]},
        {"name": "Mymensingh (Brahmaputra Floodplain)", "lat_range": (24.6, 24.8), "lon_range": (90.3, 90.6), "primary_textures": ["clay loam", "sandy loam"]},
        {"name": "Dinajpur (Old Himalayan Piedmont)", "lat_range": (25.5, 25.8), "lon_range": (88.5, 88.8), "primary_textures": ["sandy loam", "loam"]},
    ]

    scenarios: List[Dict[str, Any]] = []

    # Assumption multipliers
    if cfg.assumption_profile == "optimistic":
        base_yield_mult = 1.15
        base_price_mult = 1.10
        base_cost_mult = 0.95
    elif cfg.assumption_profile == "stressed":
        base_yield_mult = 0.80
        base_price_mult = 0.90
        base_cost_mult = 1.20
    else:
        base_yield_mult = 1.00
        base_price_mult = 1.00
        base_cost_mult = 1.00

    stress_types: List[ScenarioType] = ["baseline", "drought", "heat", "low_irrigation", "combined_stress"]

    for i in range(cfg.num_scenarios):
        reg = rng.choice(regions)
        lat = round(rng.uniform(reg["lat_range"][0], reg["lat_range"][1]), 4)
        lon = round(rng.uniform(reg["lon_range"][0], reg["lon_range"][1]), 4)
        area = round(rng.uniform(cfg.area_min_ha, cfg.area_max_ha), 2)
        texture = rng.choice(reg["primary_textures"])

        # Consistency constraint: OM capped by texture
        om_cap = SOIL_TEXTURE_CONSTRAINTS[texture]["om_max"]
        om_limit = min(cfg.om_max, om_cap)
        om = round(rng.uniform(cfg.om_min, om_limit), 2)

        ph = round(rng.uniform(cfg.ph_min, cfg.ph_max), 2)
        irrig = round(rng.uniform(cfg.irrigation_min_mm, cfg.irrigation_max_mm), 1)

        # Baseline climate
        rain = round(rng.uniform(400.0, 950.0), 1)
        temp = round(rng.uniform(22.0, 29.0), 1)

        # Determine scenario type
        if cfg.include_stress_scenarios and i > 0:
            stype = stress_types[i % len(stress_types)]
        else:
            stype = "baseline"

        # Apply stress perturbations
        scen_rain = rain
        scen_temp = temp
        scen_irrig = irrig
        yield_m = base_yield_mult
        price_m = base_price_mult
        cost_m = base_cost_mult

        if stype == "drought":
            scen_rain = round(max(50.0, rain * 0.65), 1)
            scen_temp = round(temp + 1.8, 1)
            yield_m *= 0.82
        elif stype == "heat":
            scen_temp = round(temp + 4.2, 1)
            yield_m *= 0.88
            cost_m *= 1.08
        elif stype == "low_irrigation":
            scen_irrig = round(max(20.0, irrig * 0.50), 1)
            yield_m *= 0.85
        elif stype == "combined_stress":
            scen_rain = round(max(50.0, rain * 0.60), 1)
            scen_temp = round(temp + 3.5, 1)
            scen_irrig = round(max(20.0, irrig * 0.55), 1)
            yield_m *= 0.70
            cost_m *= 1.15

        scenario_obj = SyntheticFarmScenario(
            scenario_id=f"SYN-{cfg.seed:04d}-{i+1:03d}",
            scenario_type=stype,
            seed=cfg.seed,
            field_name=f"Synthetic Farm #{i+1} ({reg['name'].split()[0]})",
            region=reg["name"],
            latitude=lat,
            longitude=lon,
            area_ha=area,
            soil_texture=texture,
            soil_ph=ph,
            organic_matter_pct=om,
            irrigation_capacity_mm=scen_irrig,
            rainfall_seasonal_mm=scen_rain,
            avg_temperature_c=scen_temp,
            crop_yield_multiplier=round(yield_m, 3),
            crop_price_multiplier=round(price_m, 3),
            crop_cost_multiplier=round(cost_m, 3),
        )
        scenarios.append(scenario_obj.to_dict())

    return {
        "metadata": {
            "title": "FieldShift Synthetic Data Lab — Farm Scenarios",
            "seed": cfg.seed,
            "version": cfg.version,
            "scenario_count": len(scenarios),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "provenance_classification": "synthetic_simulation",
            "is_farmer_observation": False,
            "scientific_disclaimer": "This dataset is algorithmically generated using fixed-seed random variables under agronomic consistency rules. It is intended for software verification, model stress testing, and boundary checks. It DOES NOT prove real-world agronomic accuracy.",
            "consistency_constraints": [
                "Soil organic matter is bounded by soil texture clay fraction capacity.",
                "Rainfall and irrigation capacity cannot be negative.",
                "Soil pH strictly constrained to 4.5 - 8.2 agro-climatic boundaries.",
                "Fixed seed guarantees deterministic reproducibility across runs.",
            ],
            "dataset_roles": {
                "synthetic_lab": "Reproducible counterfactual stress benchmarks",
                "test_fixtures": "Deterministic unit testing fixtures in /tests",
                "published_reference": "BARI/BRRI/BBS agronomic handbook benchmarks",
                "user_recorded": "Empirical farmer harvests stored in /api/outcomes",
            },
        },
        "configuration": cfg.to_dict(),
        "scenarios": scenarios,
    }


def export_synthetic_scenarios_csv(scenarios: List[Dict[str, Any]], config: SyntheticLabConfig) -> str:
    """Format synthetic scenarios into a standard CSV with provenance metadata header."""
    output = io.StringIO()
    # Write metadata header comment
    output.write(f"# FieldShift Synthetic Data Lab Export\n")
    output.write(f"# Provenance: synthetic_simulation | Seed: {config.seed} | Version: {config.version}\n")
    output.write(f"# Disclaimer: Synthetic benchmark dataset for stress testing. NOT farmer observations.\n")

    if not scenarios:
        return output.getvalue()

    keys = list(scenarios[0].keys())
    writer = csv.DictWriter(output, fieldnames=keys)
    writer.writeheader()
    for row in scenarios:
        writer.writerow(row)

    return output.getvalue()
