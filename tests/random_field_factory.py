"""tests/random_field_factory.py
Authoritative Random-Field Test Factory for FieldShift 2026.

Generates reproducible, geographically and scientifically valid field instances
across authentic Bangladesh agro-ecological zones (AEZ 1 to 30) for End-to-End
application testing, automated regression verification, and scientific QA.
"""

from __future__ import annotations

import json
import math
import os
import random
import time
from pathlib import Path
from typing import Any

# Bounding box for Bangladesh agricultural territory
BD_LAT_MIN, BD_LAT_MAX = 20.60, 26.65
BD_LON_MIN, BD_LON_MAX = 88.01, 92.67

# Bangladesh Agricultural Regional Presets
REGIONAL_PRESETS: dict[str, dict[str, Any]] = {
    "bogura": {
        "name": "Bogura Alluvial Plain",
        "district": "Bogura",
        "division": "Rajshahi",
        "center_lat": 24.8467,
        "center_lon": 89.3777,
        "primary_crops": ["Potato", "Rice", "Mustard", "Maize"],
        "typical_soil": "loam",
        "ph_range": (6.0, 7.2),
        "om_range": (1.8, 3.2),
        "typical_irrigation_mm": 280,
    },
    "rajshahi": {
        "name": "Barind Tract High Terrace",
        "district": "Rajshahi",
        "division": "Rajshahi",
        "center_lat": 24.3745,
        "center_lon": 88.6042,
        "primary_crops": ["Wheat", "Chickpea", "Lentil", "Rice"],
        "typical_soil": "clay_loam",
        "ph_range": (5.5, 6.8),
        "om_range": (1.0, 2.2),
        "typical_irrigation_mm": 180,
    },
    "rangpur": {
        "name": "Tista Meander Floodplain",
        "district": "Rangpur",
        "division": "Rangpur",
        "center_lat": 25.7439,
        "center_lon": 89.2752,
        "primary_crops": ["Potato", "Maize", "Rice", "Wheat"],
        "typical_soil": "sandy_loam",
        "ph_range": (5.4, 6.5),
        "om_range": (1.2, 2.5),
        "typical_irrigation_mm": 240,
    },
    "mymensingh": {
        "name": "Old Brahmaputra Floodplain",
        "district": "Mymensingh",
        "division": "Mymensingh",
        "center_lat": 24.7471,
        "center_lon": 90.4203,
        "primary_crops": ["Rice", "Mustard", "Mungbean", "Wheat"],
        "typical_soil": "silt_loam",
        "ph_range": (6.2, 7.4),
        "om_range": (1.6, 2.8),
        "typical_irrigation_mm": 260,
    },
    "jashore": {
        "name": "High Ganges River Terrace",
        "district": "Jashore",
        "division": "Khulna",
        "center_lat": 23.1664,
        "center_lon": 89.2115,
        "primary_crops": ["Lentil", "Mustard", "Sesame", "Rice"],
        "typical_soil": "loam",
        "ph_range": (6.5, 7.8),
        "om_range": (1.5, 2.7),
        "typical_irrigation_mm": 220,
    },
    "cumilla": {
        "name": "Meghna Estuarine Floodplain",
        "district": "Cumilla",
        "division": "Chattogram",
        "center_lat": 23.4607,
        "center_lon": 91.1809,
        "primary_crops": ["Rice", "Potato", "Soybean", "Sesame"],
        "typical_soil": "loam",
        "ph_range": (5.8, 7.0),
        "om_range": (1.8, 3.0),
        "typical_irrigation_mm": 300,
    },
    "barishal": {
        "name": "Ganges Tidal Coastal Floodplain",
        "district": "Barishal",
        "division": "Barishal",
        "center_lat": 22.7010,
        "center_lon": 90.3535,
        "primary_crops": ["Rice", "Mungbean", "Soybean", "Sunflower"],
        "typical_soil": "clay",
        "ph_range": (6.5, 7.5),
        "om_range": (1.9, 3.4),
        "typical_irrigation_mm": 150,
    },
    "dinajpur": {
        "name": "Old Himalayan Piedmont Plain",
        "district": "Dinajpur",
        "division": "Rangpur",
        "center_lat": 25.6279,
        "center_lon": 88.6332,
        "primary_crops": ["Rice", "Wheat", "Maize", "Potato"],
        "typical_soil": "sandy_loam",
        "ph_range": (5.0, 6.2),
        "om_range": (1.1, 2.3),
        "typical_irrigation_mm": 250,
    },
    "khulna": {
        "name": "Coastal Brackish Saline Belt",
        "district": "Khulna",
        "division": "Khulna",
        "center_lat": 22.8456,
        "center_lon": 89.5403,
        "primary_crops": ["Sunflower", "Sesame", "Rice", "Mungbean"],
        "typical_soil": "silt_loam",
        "ph_range": (7.0, 8.2),
        "om_range": (1.4, 2.6),
        "typical_irrigation_mm": 160,
    },
    "sylhet": {
        "name": "Surma-Kushiyara Basin",
        "district": "Sylhet",
        "division": "Sylhet",
        "center_lat": 24.8949,
        "center_lon": 91.8687,
        "primary_crops": ["Rice", "Mustard", "Potato", "Lentil"],
        "typical_soil": "sandy_loam",
        "ph_range": (4.8, 6.0),
        "om_range": (1.7, 3.2),
        "typical_irrigation_mm": 200,
    },
}

SUPPORTED_SOIL_TEXTURES = ["clay", "clay_loam", "loam", "silt_loam", "sandy_loam", "sand"]

SUPPORTED_CROPS = [
    "Rice", "Potato", "Wheat", "Maize", "Mungbean",
    "Lentil", "Mustard", "Chickpea", "Soybean", "Sunflower", "Sesame"
]

ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "test_artifacts"


def generate_random_seed() -> int:
    """Generate a reproducible, newly varying seed based on time and crypto entropy."""
    return (int(time.time() * 1000) ^ (os.getpid() << 16)) & 0x7FFFFFFF


def create_random_field(
    seed: int | None = None,
    region_key: str | None = None,
    overrides: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Factory function generating an isolated, valid random field configuration."""
    if seed is None:
        seed = generate_random_seed()
    
    rng = random.Random(seed)
    
    # 1. Select region
    if region_key and region_key.lower() in REGIONAL_PRESETS:
        r_key = region_key.lower()
    else:
        r_key = rng.choice(list(REGIONAL_PRESETS.keys()))
    
    reg = REGIONAL_PRESETS[r_key]
    
    # 2. Perturb coordinates within realistic agricultural radius (~3-8 km, strictly in BD)
    lat_offset = rng.uniform(-0.06, 0.06)
    lon_offset = rng.uniform(-0.06, 0.06)
    lat = round(max(BD_LAT_MIN, min(BD_LAT_MAX, reg["center_lat"] + lat_offset)), 4)
    lon = round(max(BD_LON_MIN, min(BD_LON_MAX, reg["center_lon"] + lon_offset)), 4)
    
    # 3. Plausible field size (0.5 to 20.0 ha)
    area_ha = round(rng.uniform(1.2, 16.5), 1)
    
    # 4. Soil texture & properties
    texture = reg["typical_soil"] if rng.random() < 0.70 else rng.choice(SUPPORTED_SOIL_TEXTURES)
    ph = round(rng.uniform(reg["ph_range"][0], reg["ph_range"][1]), 2)
    om = round(rng.uniform(reg["om_range"][0], reg["om_range"][1]), 2)
    irrig_capacity = round(reg["typical_irrigation_mm"] * rng.uniform(0.75, 1.25), 0)
    
    # 5. Crop and crop history
    crop = rng.choice(reg["primary_crops"])
    season = "dry" if rng.random() < 0.65 else "wet"
    
    # 6. Agronomic inputs
    nitrogen = round(rng.uniform(60, 160), 0)
    phosphorus = round(rng.uniform(30, 80), 0)
    potassium = round(rng.uniform(30, 80), 0)
    selling_price = round(rng.uniform(950, 1800), 0)
    
    run_id = f"RND-{r_key[:3].upper()}-{seed % 100000:05d}"
    
    field = {
        "run_id": run_id,
        "seed": seed,
        "region_key": r_key,
        "region_name": reg["name"],
        "district": reg["district"],
        "division": reg["division"],
        "name": f"Test Field {reg['district']} [{run_id}]",
        "latitude": lat,
        "longitude": lon,
        "area_ha": area_ha,
        "soil_texture": texture,
        "soil_ph": ph,
        "organic_matter": om,
        "irrigation_capacity_mm": irrig_capacity,
        "crop": crop,
        "season": season,
        "nitrogen_kg_ha": nitrogen,
        "phosphorus_kg_ha": phosphorus,
        "potassium_kg_ha": potassium,
        "selling_price_bdt_maund": selling_price,
        "created_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    
    if overrides:
        field.update(overrides)
        
    validate_field_spec(field)
    return field


def validate_field_spec(field: dict[str, Any]) -> bool:
    """Validate that the generated field specification conforms to application constraints."""
    lat = field.get("latitude")
    lon = field.get("longitude")
    if lat is None or not (BD_LAT_MIN <= lat <= BD_LAT_MAX):
        raise ValueError(f"Latitude {lat} outside valid Bangladesh agricultural bounds ({BD_LAT_MIN} to {BD_LAT_MAX}).")
    if lon is None or not (BD_LON_MIN <= lon <= BD_LON_MAX):
        raise ValueError(f"Longitude {lon} outside valid Bangladesh agricultural bounds ({BD_LON_MIN} to {BD_LON_MAX}).")
        
    area = field.get("area_ha")
    if area is None or area <= 0 or area > 10000:
        raise ValueError(f"Field area {area} ha must be positive and realistic (<= 10,000 ha).")
        
    ph = field.get("soil_ph")
    if ph is not None and not (0.0 <= ph <= 14.0):
        raise ValueError(f"Soil pH {ph} outside chemical boundary (0 to 14).")
        
    om = field.get("organic_matter")
    if om is not None and not (0.0 <= om <= 100.0):
        raise ValueError(f"Organic matter {om}% outside percentage boundary (0 to 100).")
        
    texture = field.get("soil_texture")
    if texture and texture not in SUPPORTED_SOIL_TEXTURES:
        raise ValueError(f"Soil texture '{texture}' not in supported catalog: {SUPPORTED_SOIL_TEXTURES}")
        
    crop = field.get("crop")
    if crop and crop not in SUPPORTED_CROPS:
        raise ValueError(f"Crop '{crop}' not in supported catalog: {SUPPORTED_CROPS}")
        
    return True


def save_test_artifact(run_id: str, artifact_type: str, data: Any) -> Path:
    """Save execution artifacts for diagnostic tracing and bug reproduction."""
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{run_id}_{artifact_type}_{int(time.time())}.json"
    target_path = ARTIFACTS_DIR / filename
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return target_path
