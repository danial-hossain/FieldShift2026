"""
Migrate real SQLite data from data/fieldshift.db to PostgreSQL.
Preserves exact IDs, timestamps, foreign keys, and summary_json.
Does NOT drop or truncate PostgreSQL tables.
Does NOT modify or delete data/fieldshift.db.
"""
import sqlite3
import json
from datetime import datetime
from sqlalchemy import create_engine, text

def parse_dt(v):
    if not v:
        return None
    try:
        return datetime.fromisoformat(v)
    except Exception:
        return None

def migrate():
    lite = sqlite3.connect("file:data/fieldshift.db?mode=ro", uri=True)
    eng = create_engine("postgresql+psycopg://fieldshift:fieldshift@localhost:5433/fieldshift")

    with eng.begin() as conn:
        # Check existing test rows
        pg_users = conn.execute(text("SELECT id, email FROM users")).fetchall()
        print(f"Current PG users count before migration: {len(pg_users)}")
        
        # Delete only temporary verification test rows
        conn.execute(text("DELETE FROM analyses WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'recovery-verification%')"))
        conn.execute(text("""DELETE FROM field_history WHERE field_id IN (SELECT id FROM fields WHERE farm_id IN (SELECT id FROM farms WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'recovery-verification%')))"""))
        conn.execute(text("DELETE FROM fields WHERE farm_id IN (SELECT id FROM farms WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'recovery-verification%'))"))
        conn.execute(text("DELETE FROM farms WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'recovery-verification%')"))
        conn.execute(text("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'recovery-verification%')"))
        conn.execute(text("DELETE FROM users WHERE email LIKE 'recovery-verification%'"))

        # 1. Users
        users = lite.execute("SELECT id, name, email, password_hash, is_active, last_login, created_at, updated_at FROM users ORDER BY id").fetchall()
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
                    "created_at": parse_dt(u[6]) or datetime.utcnow(),
                    "updated_at": parse_dt(u[7]) or datetime.utcnow()
                }
            )
        print(f"Migrated {len(users)} users.")

        # 2. Sessions
        sessions = lite.execute("SELECT id, user_id, token, created_at, expires_at FROM sessions ORDER BY id").fetchall()
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
                    "created_at": parse_dt(s[3]) or datetime.utcnow(),
                    "expires_at": parse_dt(s[4]) or datetime.utcnow()
                }
            )
        print(f"Migrated {len(sessions)} sessions.")

        # 3. Farms
        farms = lite.execute("SELECT id, user_id, name, description, created_at, updated_at FROM farms ORDER BY id").fetchall()
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
                    "created_at": parse_dt(f[4]) or datetime.utcnow(),
                    "updated_at": parse_dt(f[5]) or datetime.utcnow()
                }
            )
        print(f"Migrated {len(farms)} farms.")

        # 4. Fields
        lite_field_cols = [c[1] for c in lite.execute("PRAGMA table_info(fields)").fetchall()]
        has_ph = "soil_ph" in lite_field_cols
        query = "SELECT id, farm_id, name, latitude, longitude, area_ha, soil_texture, organic_matter, irrigation_capacity_mm, " + ("soil_ph, " if has_ph else "NULL as soil_ph, ") + "created_at, updated_at FROM fields ORDER BY id"
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
                    "created_at": parse_dt(fld[10]) or datetime.utcnow(),
                    "updated_at": parse_dt(fld[11]) or datetime.utcnow()
                }
            )
        print(f"Migrated {len(fields)} fields.")

        # 5. Field History
        fhs = lite.execute("SELECT id, field_id, crop, season, year, notes, created_at FROM field_history ORDER BY id").fetchall()
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
                    "created_at": parse_dt(fh[6]) or datetime.utcnow()
                }
            )
        print(f"Migrated {len(fhs)} field_history records.")

        # 6. Analyses
        analyses = lite.execute("SELECT id, user_id, farm_id, field_id, start_date, end_date, priority, season, include_crop_history, mode, status, summary_json, started_at, completed_at, error_message, created_at, updated_at FROM analyses ORDER BY id").fetchall()
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
                    "created_at": parse_dt(a[15]) or datetime.utcnow(),
                    "updated_at": parse_dt(a[16]) or datetime.utcnow()
                }
            )
        print(f"Migrated {len(analyses)} analyses.")

        # Update sequences
        for table in ["users", "sessions", "farms", "fields", "field_history", "analyses"]:
            conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1))"))
        print("Updated all PostgreSQL sequence generators.")

    # Post-migration check
    with eng.connect() as conn:
        print("\n--- Verification post-migration ---")
        for table in ["users", "sessions", "farms", "fields", "field_history", "analyses"]:
            count = conn.execute(text(f"SELECT count(*) FROM {table}")).scalar()
            print(f"PG {table} count: {count}")
        
        # Verify user 47
        u47 = conn.execute(text("SELECT id, name, email FROM users WHERE id = 47")).fetchone()
        print(f"User 47: {u47}")
        u47_farms = conn.execute(text("SELECT id, name FROM farms WHERE user_id = 47")).fetchall()
        print(f"User 47 farms: {u47_farms}")
        u47_analyses = conn.execute(text("SELECT id, status, created_at FROM analyses WHERE user_id = 47")).fetchall()
        print(f"User 47 analyses: {len(u47_analyses)}")

if __name__ == "__main__":
    migrate()
