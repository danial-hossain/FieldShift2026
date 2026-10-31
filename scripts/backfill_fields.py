"""Backfill fields in SQLite database with geospatial enrichment.

Assigns:
1. district (from lat/lon or name)
2. seasonally_flooded
3. nearest_district_distance_km
4. power_cell
5. imerg_cell
6. soilgrids_soil
"""

import math
from pathlib import Path
from sqlalchemy import create_engine, text, select
from backend.app.database import engine
from backend.app.models import Base, Field
from src.compute.advisory_service import DISTRICT_REGISTRY, haversine_distance_km, nearest_district


def backfill_all_fields():
    # 1. Ensure table schema has all new columns
    with engine.begin() as conn:
        cols_query = conn.execute(text("PRAGMA table_info(fields)")).fetchall()
        existing_cols = {row[1] for row in cols_query}

        if "district" not in existing_cols:
            conn.execute(text("ALTER TABLE fields ADD COLUMN district VARCHAR"))
        if "seasonally_flooded" not in existing_cols:
            conn.execute(text("ALTER TABLE fields ADD COLUMN seasonally_flooded BOOLEAN DEFAULT 0"))
        if "nearest_district_distance_km" not in existing_cols:
            conn.execute(text("ALTER TABLE fields ADD COLUMN nearest_district_distance_km FLOAT"))
        if "power_cell" not in existing_cols:
            conn.execute(text("ALTER TABLE fields ADD COLUMN power_cell VARCHAR"))
        if "imerg_cell" not in existing_cols:
            conn.execute(text("ALTER TABLE fields ADD COLUMN imerg_cell VARCHAR"))
        if "soilgrids_soil" not in existing_cols:
            conn.execute(text("ALTER TABLE fields ADD COLUMN soilgrids_soil VARCHAR"))

    # 2. Fetch all fields
    with engine.begin() as conn:
        fields = conn.execute(select(Field.id, Field.name, Field.latitude, Field.longitude, Field.district, Field.soil_texture)).fetchall()
        print(f"Total fields to inspect/backfill: {len(fields)}")

        updated_count = 0
        haor_districts = {"sunamganj", "netrokona", "kishoreganj", "habiganj", "moulvibazar"}

        for fld in fields:
            fid, name, lat, lon, current_dist, current_soil = fld
            
            # Determine district
            target_dist = current_dist
            if not target_dist and lat is not None and lon is not None:
                try:
                    target_dist = nearest_district(float(lat), float(lon))
                except Exception:
                    target_dist = None

            if not target_dist:
                # Infer from name
                low_name = (name or "").lower()
                for d_k in DISTRICT_REGISTRY.keys():
                    if d_k in low_name:
                        target_dist = d_k
                        break

            if not target_dist:
                target_dist = "dhaka" if (lat and abs(lat - 23.8) < 0.5) else "bogura"

            # Compute distance, cells, soil
            dist_km = 0.0
            power_cell = None
            imerg_cell = None
            soilgrids_soil = None

            if lat is not None and lon is not None:
                power_cell = f"{round(float(lat) * 2.0) / 2.0:.1f},{round(float(lon) * 2.0) / 2.0:.1f}"
                imerg_cell = f"{round(float(lat) * 10.0) / 10.0:.1f},{round(float(lon) * 10.0) / 10.0:.1f}"

                d_meta = DISTRICT_REGISTRY.get(target_dist, {})
                d_lat = d_meta.get("latitude")
                d_lon = d_meta.get("longitude")
                if d_lat is not None and d_lon is not None:
                    dist_km = round(haversine_distance_km(float(lat), float(lon), float(d_lat), float(d_lon)), 1)
                soilgrids_soil = d_meta.get("soil_type", "loam")

            is_haor = bool(target_dist and target_dist.lower() in haor_districts)

            # Update row
            conn.execute(
                text("""
                    UPDATE fields
                    SET district = :district,
                        seasonally_flooded = :flooded,
                        nearest_district_distance_km = :dist_km,
                        power_cell = :p_cell,
                        imerg_cell = :i_cell,
                        soilgrids_soil = :soil
                    WHERE id = :fid
                """),
                {
                    "district": target_dist,
                    "flooded": 1 if is_haor else 0,
                    "dist_km": dist_km,
                    "p_cell": power_cell,
                    "i_cell": imerg_cell,
                    "soil": soilgrids_soil,
                    "fid": fid
                }
            )
            updated_count += 1

        print(f"Successfully backfilled {updated_count} fields.")


if __name__ == "__main__":
    backfill_all_fields()
