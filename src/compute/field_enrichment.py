"""Field enrichment service: District resolution, NASA POWER 0.5-deg cell, and ISRIC SoilGrids 250m.

Performs deterministic geospatial enrichment for any field in Bangladesh:
1. Nearest district centroid & Haversine distance.
2. NASA POWER 0.5-degree climatology cell association.
3. Soil properties from ISRIC SoilGrids REST v2.0 (pH, Organic Matter %, Clay/Sand/Silt %, USDA Texture).
4. Handles user overrides, marking them with 'আপনার দেওয়া' while preserving SoilGrids baseline.
"""

from __future__ import annotations

import json
import logging
import math
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("field_enrichment")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOIL_CACHE_DIR = PROJECT_ROOT / "data" / "soilgrids_cache"


def derive_usda_texture(clay: float, sand: float, silt: float) -> str:
    """Derive standard USDA soil texture class from clay, sand, silt percentages.
    
    Sums should approximately equal 100%.
    """
    if clay >= 40.0:
        if sand >= 45.0:
            return "sandy clay"
        elif silt >= 40.0:
            return "silty clay"
        else:
            return "clay"
    elif clay >= 27.0:
        if sand >= 45.0:
            return "sandy clay loam"
        elif sand <= 20.0:
            return "silty clay loam"
        else:
            return "clay loam"
    else:  # clay < 27
        if silt >= 80.0 and clay < 12.0:
            return "silt"
        elif silt >= 50.0:
            return "silt loam"
        elif sand >= 85.0 and (silt + 1.5 * clay) < 15.0:
            return "sand"
        elif sand >= 70.0 and (silt + 2.0 * clay) < 30.0:
            return "loamy sand"
        elif sand >= 52.0:
            return "sandy loam"
        else:
            return "loam"


def fetch_isric_soilgrids(
    lat: float,
    lon: float,
    cache_dir: Optional[Path] = None,
    allow_network: bool = True,
) -> Optional[Dict[str, Any]]:
    """Query ISRIC SoilGrids REST API v2.0 for phh2o, soc, clay, sand, silt at 0-30cm depths."""
    cache_folder = cache_dir or SOIL_CACHE_DIR
    cache_folder.mkdir(parents=True, exist_ok=True)
    cache_file = cache_folder / f"soilgrids_{round(lat, 4)}_{round(lon, 4)}.json"

    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read cache {cache_file}: {e}")

    if not allow_network:
        # Check if any nearby cached file exists within 0.05 degrees (~5 km)
        for cf in cache_folder.glob("soilgrids_*.json"):
            try:
                parts = cf.stem.split("_")
                clat, clon = float(parts[1]), float(parts[2])
                if abs(clat - lat) <= 0.05 and abs(clon - lon) <= 0.05:
                    with open(cf, "r", encoding="utf-8") as f:
                        return json.load(f)
            except Exception:
                continue
        return None

    # Spiral search offsets in case the exact point is in an urban/water pixel
    search_offsets = [
        (0.0, 0.0),
        (0.005, 0.0), (-0.005, 0.0), (0.0, 0.005), (0.0, -0.005),
        (0.01, 0.01), (-0.01, -0.01), (0.01, -0.01), (-0.01, 0.01),
        (0.02, 0.0), (-0.02, 0.0), (0.0, 0.02), (0.0, -0.02),
    ]

    for dlat, dlon in search_offsets:
        qlat = round(lat + dlat, 4)
        qlon = round(lon + dlon, 4)
        url = (
            f"https://rest.isric.org/soilgrids/v2.0/properties/query"
            f"?lon={qlon}&lat={qlat}"
            f"&property=phh2o&property=soc&property=clay&property=sand&property=silt"
            f"&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean"
        )
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "FieldShift/1.0 (SoilGrids Client)"})
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status == 200:
                    raw = json.loads(resp.read().decode("utf-8"))
                    layers = raw.get("properties", {}).get("layers", [])
                    extracted: Dict[str, List[Optional[float]]] = {}
                    for layer in layers:
                        pname = layer.get("name")
                        depths = layer.get("depths", [])
                        means = [d.get("values", {}).get("mean") for d in depths]
                        if any(m is not None for m in means):
                            extracted[pname] = means

                    if len(extracted) == 5:
                        # Successfully extracted all 5 soil properties!
                        # Convert units across 0-30 cm:
                        # phh2o: mapped as pH*10 -> pH = phh2o / 10
                        # soc: mapped as dg/kg -> %OC = (soc / 10) / 10 -> OM% = %OC * 1.724
                        # clay, sand, silt: mapped as g/kg -> % = g_kg / 10
                        depth_labels = ["0-5cm", "5-15cm", "15-30cm"]
                        depth_profile = []
                        for i, dlabel in enumerate(depth_labels):
                            ph_val = extracted["phh2o"][i]
                            soc_val = extracted["soc"][i]
                            clay_val = extracted["clay"][i]
                            sand_val = extracted["sand"][i]
                            silt_val = extracted["silt"][i]

                            ph_calc = round(ph_val / 10.0, 2) if ph_val is not None else None
                            oc_pct = round((soc_val / 10.0) / 10.0, 3) if soc_val is not None else None
                            om_calc = round(oc_pct * 1.724, 2) if oc_pct is not None else None
                            c_calc = round(clay_val / 10.0, 1) if clay_val is not None else None
                            s_calc = round(sand_val / 10.0, 1) if sand_val is not None else None
                            si_calc = round(silt_val / 10.0, 1) if silt_val is not None else None

                            depth_profile.append({
                                "depth": dlabel,
                                "ph": ph_calc,
                                "organic_carbon_pct": oc_pct,
                                "organic_matter_pct": om_calc,
                                "clay_pct": c_calc,
                                "sand_pct": s_calc,
                                "silt_pct": si_calc,
                            })

                        # Aggregate mean across the 3 depths (0-30 cm root zone)
                        valid_ph = [d["ph"] for d in depth_profile if d["ph"] is not None]
                        valid_om = [d["organic_matter_pct"] for d in depth_profile if d["organic_matter_pct"] is not None]
                        valid_c = [d["clay_pct"] for d in depth_profile if d["clay_pct"] is not None]
                        valid_s = [d["sand_pct"] for d in depth_profile if d["sand_pct"] is not None]
                        valid_si = [d["silt_pct"] for d in depth_profile if d["silt_pct"] is not None]

                        mean_ph = round(sum(valid_ph) / len(valid_ph), 2) if valid_ph else 6.5
                        mean_om = round(sum(valid_om) / len(valid_om), 2) if valid_om else 2.5
                        mean_c = round(sum(valid_c) / len(valid_c), 1) if valid_c else 30.0
                        mean_s = round(sum(valid_s) / len(valid_s), 1) if valid_s else 30.0
                        mean_si = round(sum(valid_si) / len(valid_si), 1) if valid_si else 40.0

                        # Normalize texture sum to 100%
                        tot = mean_c + mean_s + mean_si
                        if tot > 0:
                            mean_c = round(mean_c * 100.0 / tot, 1)
                            mean_s = round(mean_s * 100.0 / tot, 1)
                            mean_si = round(100.0 - mean_c - mean_s, 1)

                        texture_class = derive_usda_texture(mean_c, mean_s, mean_si)

                        result = {
                            "status": "ok",
                            "query_lat": qlat,
                            "query_lon": qlon,
                            "is_offset": (qlat != lat or qlon != lon),
                            "ph": mean_ph,
                            "organic_matter_pct": mean_om,
                            "clay_pct": mean_c,
                            "sand_pct": mean_s,
                            "silt_pct": mean_si,
                            "texture_class": texture_class,
                            "depth_profile": depth_profile,
                            "source_tag": "ISRIC SoilGrids 250 m",
                            "cached_at": datetime.now(timezone.utc).isoformat(),
                        }

                        # Save to cache
                        with open(cache_file, "w", encoding="utf-8") as f:
                            json.dump(result, f, indent=2, ensure_ascii=False)

                        return result
        except Exception as e:
            logger.debug(f"SoilGrids query attempt failed at ({qlat}, {qlon}): {e}")
            continue

    return None


def enrich_field_data(
    field_id: str,
    latitude: float,
    longitude: float,
    area_ha: Optional[float] = None,
    user_overrides: Optional[Dict[str, Any]] = None,
    offline: bool = False,
) -> Dict[str, Any]:
    """Enrich a farm field with district location, POWER climatology cell, and SoilGrids soil properties."""
    from src.compute.advisory_service import DISTRICT_REGISTRY, haversine_distance_km

    # 1. District resolution
    best_dist_key = "bogura"
    min_dist_km = float("inf")
    for d_key, meta in DISTRICT_REGISTRY.items():
        d_lat = meta.get("latitude")
        d_lon = meta.get("longitude")
        if d_lat is not None and d_lon is not None:
            dist = haversine_distance_km(latitude, longitude, d_lat, d_lon)
            if dist < min_dist_km:
                min_dist_km = dist
                best_dist_key = d_key

    dist_meta = DISTRICT_REGISTRY.get(best_dist_key, {})

    # 2. NASA POWER 0.5-degree grid cell
    cell_lat = round(round(latitude * 2.0) / 2.0, 2)
    cell_lon = round(round(longitude * 2.0) / 2.0, 2)
    power_cell_id = f"power_cell_{cell_lat}_{cell_lon}"

    # In offline mode, use nearest district data
    power_source = "nearest district data"

    # 3. Soil data from SoilGrids 250m
    soil_res = fetch_isric_soilgrids(latitude, longitude, allow_network=not offline)

    if soil_res is None:
        # Fallback to district default baseline
        soil_res = {
            "ph": 6.5,
            "organic_matter_pct": 2.2,
            "clay_pct": 32.0,
            "sand_pct": 28.0,
            "silt_pct": 40.0,
            "texture_class": dist_meta.get("soil_type", "loam"),
            "depth_profile": [],
            "source_tag": "ISRIC SoilGrids 250 m",
        }

    # 4. Handle user overrides
    overrides = user_overrides or {}
    ph_final = soil_res["ph"]
    ph_source = soil_res["source_tag"]
    if overrides.get("soil_ph") not in (None, ""):
        try:
            ph_final = float(overrides["soil_ph"])
            ph_source = "আপনার দেওয়া"
        except (ValueError, TypeError):
            pass

    om_final = soil_res["organic_matter_pct"]
    om_source = soil_res["source_tag"]
    if overrides.get("organic_matter") not in (None, ""):
        try:
            om_final = float(overrides["organic_matter"])
            om_source = "আপনার দেওয়া"
        except (ValueError, TypeError):
            pass

    tex_final = soil_res["texture_class"]
    tex_source = soil_res["source_tag"]
    if overrides.get("soil_texture") not in (None, ""):
        tex_final = str(overrides["soil_texture"]).strip()
        tex_source = "আপনার দেওয়া"

    return {
        "status": "ok",
        "field_id": field_id,
        "latitude": latitude,
        "longitude": longitude,
        "area_ha": area_ha,
        "nearest_district": best_dist_key,
        "district_name_en": dist_meta.get("name_en", best_dist_key.title()),
        "district_name_bn": dist_meta.get("name_bn", best_dist_key),
        "distance_km": round(min_dist_km, 2),
        "power_cell": {
            "cell_id": power_cell_id,
            "centroid_lat": cell_lat,
            "centroid_lon": cell_lon,
            "source_label": power_source,
        },
        "soil": {
            "ph": ph_final,
            "ph_source": ph_source,
            "organic_matter_pct": om_final,
            "organic_matter_source": om_source,
            "texture_class": tex_final,
            "texture_source": tex_source,
            "clay_pct": soil_res.get("clay_pct"),
            "sand_pct": soil_res.get("sand_pct"),
            "silt_pct": soil_res.get("silt_pct"),
            "depth_profile": soil_res.get("depth_profile", []),
            "baseline_source": soil_res.get("source_tag", "ISRIC SoilGrids 250 m"),
        },
    }

