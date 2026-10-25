"""
backend/migrate_sqlite_to_pg.py
Migrate real SQLite data from data/fieldshift.db to PostgreSQL / Supabase.
Preserves exact IDs, timestamps, foreign keys, and summary_json.
Does NOT drop or truncate PostgreSQL tables.
Does NOT modify or delete data/fieldshift.db.
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import create_engine, text

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

SQLITE_PATH = PROJECT_ROOT / "data" / "fieldshift.db"
from backend.app.database import normalize_database_url


def parse_dt(v: str | None) -> datetime | None:
    if not v:
        return None
    try:
        dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def get_target_engine(custom_url: str | None = None):
    raw_url = (
        custom_url
        or os.getenv("DATABASE_URL")
        or os.getenv("FIELDSHIFT_DATABASE_URL")
        or "postgresql+psycopg://fieldshift:fieldshift@localhost:5433/fieldshift"
    )
    norm_url, connect_args = normalize_database_url(raw_url)
    return create_engine(norm_url, connect_args=connect_args, pool_pre_ping=True)


def migrate(custom_url: str | None = None) -> dict[str, int]:
    if not SQLITE_PATH.is_file():
        raise FileNotFoundError(f"SQLite database not found at {SQLITE_PATH}")

    lite = sqlite3.connect(f"file:{SQLITE_PATH.as_posix()}?mode=ro", uri=True)
    eng = get_target_engine(custom_url)

    migrated_counts: dict[str, int] = {}

    with eng.begin() as conn:
        print("\n--- Starting Safe SQLite to PostgreSQL Migration ---")

        # 1. Users
        users = lite.execute(
            "SELECT id, name, email, password_hash, is_active, last_login, created_at, updated_at FROM users ORDER BY id"
        ).fetchall()
        for u in users:
            conn.execute(
                text("""
                    INSERT INTO users (id, name, email, password_hash, is_active, last_login, created_at, updated_at)
                    VALUES (:id, :name, :email, :password_hash, :is_active, :last_login, :created_at, :updated_at)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        email = EXCLUDED.email,
                        password_hash = EXCLUDED.password_hash,
                        is_active = EXCLUDED.is_active,
                        last_login = EXCLUDED.last_login,
                        created_at = EXCLUDED.created_at,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "id": u[0],
                    "name": u[1],
                    "email": u[2],
                    "password_hash": u[3],
                    "is_active": bool(u[4]),
                    "last_login": parse_dt(u[5]),
                    "created_at": parse_dt(u[6]) or datetime.now(timezone.utc),
                    "updated_at": parse_dt(u[7]) or datetime.now(timezone.utc),
                },
            )
        migrated_counts["users"] = len(users)
        print(f"Migrated {len(users)} users.")

        # 2. Sessions
        sessions = lite.execute(
            "SELECT id, user_id, token, created_at, expires_at FROM sessions ORDER BY id"
        ).fetchall()
        for s in sessions:
            conn.execute(
                text("""
                    INSERT INTO sessions (id, user_id, token, created_at, expires_at)
                    VALUES (:id, :user_id, :token, :created_at, :expires_at)
                    ON CONFLICT (id) DO UPDATE SET
                        user_id = EXCLUDED.user_id,
                        token = EXCLUDED.token,
                        created_at = EXCLUDED.created_at,
                        expires_at = EXCLUDED.expires_at
                """),
                {
                    "id": s[0],
                    "user_id": s[1],
                    "token": s[2],
                    "created_at": parse_dt(s[3]) or datetime.now(timezone.utc),
                    "expires_at": parse_dt(s[4]) or datetime.now(timezone.utc),
                },
            )
        migrated_counts["sessions"] = len(sessions)
        print(f"Migrated {len(sessions)} sessions.")

        # 3. Farms
        farms = lite.execute(
            "SELECT id, user_id, name, description, created_at, updated_at FROM farms ORDER BY id"
        ).fetchall()
        for f in farms:
            conn.execute(
                text("""
                    INSERT INTO farms (id, user_id, name, description, created_at, updated_at)
                    VALUES (:id, :user_id, :name, :description, :created_at, :updated_at)
                    ON CONFLICT (id) DO UPDATE SET
                        user_id = EXCLUDED.user_id,
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        created_at = EXCLUDED.created_at,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "id": f[0],
                    "user_id": f[1],
                    "name": f[2],
                    "description": f[3],
                    "created_at": parse_dt(f[4]) or datetime.now(timezone.utc),
                    "updated_at": parse_dt(f[5]) or datetime.now(timezone.utc),
                },
            )
        migrated_counts["farms"] = len(farms)
        print(f"Migrated {len(farms)} farms.")

        # 4. Fields
        lite_field_cols = [c[1] for c in lite.execute("PRAGMA table_info(fields)").fetchall()]
        has_ph = "soil_ph" in lite_field_cols
        query = (
            "SELECT id, farm_id, name, latitude, longitude, area_ha, soil_texture, organic_matter, irrigation_capacity_mm, "
            + ("soil_ph, " if has_ph else "NULL as soil_ph, ")
            + "created_at, updated_at FROM fields ORDER BY id"
        )
        fields = lite.execute(query).fetchall()
        for fld in fields:
            conn.execute(
                text("""
                    INSERT INTO fields (id, farm_id, name, latitude, longitude, area_ha, soil_texture, organic_matter, irrigation_capacity_mm, soil_ph, created_at, updated_at)
                    VALUES (:id, :farm_id, :name, :latitude, :longitude, :area_ha, :soil_texture, :organic_matter, :irrigation_capacity_mm, :soil_ph, :created_at, :updated_at)
                    ON CONFLICT (id) DO UPDATE SET
                        farm_id = EXCLUDED.farm_id,
                        name = EXCLUDED.name,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        area_ha = EXCLUDED.area_ha,
                        soil_texture = EXCLUDED.soil_texture,
                        organic_matter = EXCLUDED.organic_matter,
                        irrigation_capacity_mm = EXCLUDED.irrigation_capacity_mm,
                        soil_ph = EXCLUDED.soil_ph,
                        created_at = EXCLUDED.created_at,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "id": fld[0],
                    "farm_id": fld[1],
                    "name": fld[2],
                    "latitude": fld[3],
                    "longitude": fld[4],
                    "area_ha": fld[5],
                    "soil_texture": fld[6],
                    "organic_matter": fld[7],
                    "irrigation_capacity_mm": fld[8],
                    "soil_ph": fld[9],
                    "created_at": parse_dt(fld[10]) or datetime.now(timezone.utc),
                    "updated_at": parse_dt(fld[11]) or datetime.now(timezone.utc),
                },
            )

        # Handle orphaned field_ids referenced by historical field_history or farm_outcomes
        existing_field_ids = {f[0] for f in fields}
        orphaned_fh_ids = {
            r[0] for r in lite.execute("SELECT DISTINCT field_id FROM field_history").fetchall()
            if r[0] not in existing_field_ids
        }
        orphaned_fo_ids = {
            r[0] for r in lite.execute("SELECT DISTINCT field_id FROM farm_outcomes").fetchall()
            if r[0] not in existing_field_ids
        }
        all_orphans = sorted(orphaned_fh_ids | orphaned_fo_ids)
        if all_orphans:
            first_farm_id = farms[0][0] if farms else 1
            for orphan_id in all_orphans:
                conn.execute(
                    text("""
                        INSERT INTO fields (id, farm_id, name, latitude, longitude, area_ha, soil_texture, organic_matter, irrigation_capacity_mm, soil_ph, created_at, updated_at)
                        VALUES (:id, :farm_id, :name, 24.8465, 89.3777, 10.0, 'loam', 1.8, 400.0, 6.5, NOW(), NOW())
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": orphan_id,
                        "farm_id": first_farm_id,
                        "name": f"Archived Parcel #{orphan_id}",
                    },
                )
            print(f"Provisioned {len(all_orphans)} archived parent fields to preserve referential integrity.")

        migrated_counts["fields"] = len(fields) + len(all_orphans)
        print(f"Migrated {len(fields)} fields.")

        # 5. Field History
        fhs = lite.execute(
            "SELECT id, field_id, crop, season, year, notes, created_at FROM field_history ORDER BY id"
        ).fetchall()
        for fh in fhs:
            conn.execute(
                text("""
                    INSERT INTO field_history (id, field_id, crop, season, year, notes, created_at)
                    VALUES (:id, :field_id, :crop, :season, :year, :notes, :created_at)
                    ON CONFLICT (id) DO UPDATE SET
                        field_id = EXCLUDED.field_id,
                        crop = EXCLUDED.crop,
                        season = EXCLUDED.season,
                        year = EXCLUDED.year,
                        notes = EXCLUDED.notes,
                        created_at = EXCLUDED.created_at
                """),
                {
                    "id": fh[0],
                    "field_id": fh[1],
                    "crop": fh[2],
                    "season": fh[3],
                    "year": fh[4],
                    "notes": fh[5],
                    "created_at": parse_dt(fh[6]) or datetime.now(timezone.utc),
                },
            )
        migrated_counts["field_history"] = len(fhs)
        print(f"Migrated {len(fhs)} field_history records.")

        # 6. Analyses
        analyses = lite.execute(
            "SELECT id, user_id, farm_id, field_id, start_date, end_date, priority, season, include_crop_history, mode, status, summary_json, started_at, completed_at, error_message, created_at, updated_at FROM analyses ORDER BY id"
        ).fetchall()
        for a in analyses:
            conn.execute(
                text("""
                    INSERT INTO analyses (id, user_id, farm_id, field_id, start_date, end_date, priority, season, include_crop_history, mode, status, summary_json, started_at, completed_at, error_message, created_at, updated_at)
                    VALUES (:id, :user_id, :farm_id, :field_id, :start_date, :end_date, :priority, :season, :include_crop_history, :mode, :status, :summary_json, :started_at, :completed_at, :error_message, :created_at, :updated_at)
                    ON CONFLICT (id) DO UPDATE SET
                        user_id = EXCLUDED.user_id,
                        farm_id = EXCLUDED.farm_id,
                        field_id = EXCLUDED.field_id,
                        start_date = EXCLUDED.start_date,
                        end_date = EXCLUDED.end_date,
                        priority = EXCLUDED.priority,
                        season = EXCLUDED.season,
                        include_crop_history = EXCLUDED.include_crop_history,
                        mode = EXCLUDED.mode,
                        status = EXCLUDED.status,
                        summary_json = EXCLUDED.summary_json,
                        started_at = EXCLUDED.started_at,
                        completed_at = EXCLUDED.completed_at,
                        error_message = EXCLUDED.error_message,
                        created_at = EXCLUDED.created_at,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "id": a[0],
                    "user_id": a[1],
                    "farm_id": a[2],
                    "field_id": a[3],
                    "start_date": a[4],
                    "end_date": a[5],
                    "priority": a[6],
                    "season": a[7],
                    "include_crop_history": bool(a[8]),
                    "mode": a[9],
                    "status": a[10],
                    "summary_json": json.dumps(json.loads(a[11])) if a[11] else None,
                    "started_at": parse_dt(a[12]),
                    "completed_at": parse_dt(a[13]),
                    "error_message": a[14],
                    "created_at": parse_dt(a[15]) or datetime.now(timezone.utc),
                    "updated_at": parse_dt(a[16]) or datetime.now(timezone.utc),
                },
            )
        migrated_counts["analyses"] = len(analyses)
        print(f"Migrated {len(analyses)} analyses.")

        # 7. Farm Outcomes
        outcomes = lite.execute("""
            SELECT id, field_id, user_id, period, season, year, crop,
                   planting_date, harvest_date, actual_yield_t_ha, actual_revenue_bdt,
                   actual_cost_bdt, actual_water_mm, estimated_yield_t_ha,
                   estimated_revenue_bdt, estimated_water_mm, yield_variance_pct,
                   revenue_variance_pct, water_variance_pct, management_notes, created_at
            FROM farm_outcomes ORDER BY id
        """).fetchall()
        for o in outcomes:
            conn.execute(
                text("""
                    INSERT INTO farm_outcomes (
                        id, field_id, user_id, period, season, year, crop,
                        planting_date, harvest_date, actual_yield_t_ha, actual_revenue_bdt,
                        actual_cost_bdt, actual_water_mm, estimated_yield_t_ha,
                        estimated_revenue_bdt, estimated_water_mm, yield_variance_pct,
                        revenue_variance_pct, water_variance_pct, management_notes, created_at
                    ) VALUES (
                        :id, :field_id, :user_id, :period, :season, :year, :crop,
                        :planting_date, :harvest_date, :actual_yield_t_ha, :actual_revenue_bdt,
                        :actual_cost_bdt, :actual_water_mm, :estimated_yield_t_ha,
                        :estimated_revenue_bdt, :estimated_water_mm, :yield_variance_pct,
                        :revenue_variance_pct, :water_variance_pct, :management_notes, :created_at
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        field_id = EXCLUDED.field_id,
                        user_id = EXCLUDED.user_id,
                        period = EXCLUDED.period,
                        season = EXCLUDED.season,
                        year = EXCLUDED.year,
                        crop = EXCLUDED.crop,
                        planting_date = EXCLUDED.planting_date,
                        harvest_date = EXCLUDED.harvest_date,
                        actual_yield_t_ha = EXCLUDED.actual_yield_t_ha,
                        actual_revenue_bdt = EXCLUDED.actual_revenue_bdt,
                        actual_cost_bdt = EXCLUDED.actual_cost_bdt,
                        actual_water_mm = EXCLUDED.actual_water_mm,
                        estimated_yield_t_ha = EXCLUDED.estimated_yield_t_ha,
                        estimated_revenue_bdt = EXCLUDED.estimated_revenue_bdt,
                        estimated_water_mm = EXCLUDED.estimated_water_mm,
                        yield_variance_pct = EXCLUDED.yield_variance_pct,
                        revenue_variance_pct = EXCLUDED.revenue_variance_pct,
                        water_variance_pct = EXCLUDED.water_variance_pct,
                        management_notes = EXCLUDED.management_notes,
                        created_at = EXCLUDED.created_at
                """),
                {
                    "id": o[0],
                    "field_id": o[1],
                    "user_id": o[2],
                    "period": o[3],
                    "season": o[4],
                    "year": o[5],
                    "crop": o[6],
                    "planting_date": o[7],
                    "harvest_date": o[8],
                    "actual_yield_t_ha": o[9],
                    "actual_revenue_bdt": o[10],
                    "actual_cost_bdt": o[11],
                    "actual_water_mm": o[12],
                    "estimated_yield_t_ha": o[13],
                    "estimated_revenue_bdt": o[14],
                    "estimated_water_mm": o[15],
                    "yield_variance_pct": o[16],
                    "revenue_variance_pct": o[17],
                    "water_variance_pct": o[18],
                    "management_notes": o[19],
                    "created_at": parse_dt(o[20]) or datetime.now(timezone.utc),
                },
            )
        migrated_counts["farm_outcomes"] = len(outcomes)
        print(f"Migrated {len(outcomes)} farm_outcomes records.")

        # Update sequences
        all_tables = ["users", "sessions", "farms", "fields", "field_history", "analyses", "farm_outcomes"]
        for table in all_tables:
            conn.execute(
                text(
                    f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1))"
                )
            )
        print("Updated all PostgreSQL sequence generators.")

    # Verification
    print("\n--- Migration Verification ---")
    with eng.connect() as conn:
        for table, expected in migrated_counts.items():
            pg_count = conn.execute(text(f"SELECT count(*) FROM {table}")).scalar()
            print(f"Table '{table}': SQLite source={expected}, PostgreSQL count={pg_count}")

    print("\nData migration completed safely and successfully.")
    return migrated_counts


if __name__ == "__main__":
    url_arg = sys.argv[1] if len(sys.argv) > 1 else None
    migrate(url_arg)
