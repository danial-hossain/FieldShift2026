"""
backend/run_migrations.py
Versioned, idempotent PostgreSQL migration runner for FieldShift 2026.
Applies SQL migrations from backend/alembic/versions/ in chronological order
and tracks applied versions in a schema_migrations table.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Sequence
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

PROJECT_ROOT = Path(__file__).resolve().parents[1]
VERSIONS_DIR = PROJECT_ROOT / "backend" / "alembic" / "versions"


def normalize_database_url(raw_url: str) -> tuple[str, dict]:
    """
    Ensure compatibility with psycopg v3 and Supabase PgBouncer poolers.
    - Trims whitespace and newlines from raw URL and database name
    - Converts postgres:// and postgresql:// to postgresql+psycopg://
    - Configures prepare_threshold=None for PgBouncer transaction mode (port 6543)
    """
    cleaned = raw_url.strip()
    parsed = make_url(cleaned)
    if parsed.database:
        parsed = parsed.set(database=parsed.database.strip())
    drivername = parsed.drivername
    if drivername in ("postgresql", "postgres"):
        parsed = parsed.set(drivername="postgresql+psycopg")

    connect_args: dict = {"connect_timeout": 10}
    is_tx_pooler = (
        parsed.port == 6543
        or "pgbouncer=true" in str(cleaned).lower()
        or (parsed.query and parsed.query.get("pgbouncer") == "true")
    )
    if is_tx_pooler:
        # Transaction pooling requires disabling named prepared statements
        connect_args["prepare_threshold"] = None

    return parsed.render_as_string(hide_password=False), connect_args


def get_migration_engine(custom_url: str | None = None):
    raw_url = custom_url or os.getenv("DATABASE_URL") or os.getenv("FIELDSHIFT_DATABASE_URL")
    if not raw_url:
        print("[migrations] WARNING: DATABASE_URL is not set. Skipping migrations runner.", file=sys.stderr)
        return None

    norm_url, connect_args = normalize_database_url(raw_url)
    return create_engine(
        norm_url,
        connect_args=connect_args,
        pool_pre_ping=True,
    )


def run_migrations(custom_url: str | None = None) -> list[str]:
    """
    Execute all unapplied migrations from backend/alembic/versions/ in order.
    Returns list of applied migration filenames.
    """
    engine = get_migration_engine(custom_url)
    if engine is None:
        return []
    applied_in_this_run: list[str] = []

    with engine.begin() as conn:
        # Create schema_migrations tracker table
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(255) PRIMARY KEY,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
        )

        # Query already applied migrations
        rows = conn.execute(text("SELECT version FROM schema_migrations ORDER BY version")).fetchall()
        applied_versions = {r[0] for r in rows}

        # Find migration files
        if not VERSIONS_DIR.is_dir():
            raise FileNotFoundError(f"Migrations directory not found: {VERSIONS_DIR}")

        sql_files = sorted(VERSIONS_DIR.glob("*.sql"), key=lambda p: p.name)
        if not sql_files:
            print(f"No SQL migration files found in {VERSIONS_DIR}")
            return []

        for sql_file in sql_files:
            ver = sql_file.name
            if ver in applied_versions:
                print(f"[migrations] Skipped (already applied): {ver}")
                continue

            print(f"[migrations] Applying {ver}...")
            content = sql_file.read_text(encoding="utf-8")

            import re

            # Strip all SQL comments before splitting by semicolon
            clean_content = re.sub(r"--.*?$", "", content, flags=re.MULTILINE)
            statements = [s.strip() for s in clean_content.split(";") if s.strip()]
            for clean_stmt in statements:
                conn.execute(text(clean_stmt))

            conn.execute(
                text("INSERT INTO schema_migrations (version, applied_at) VALUES (:ver, NOW())"),
                {"ver": ver},
            )
            applied_in_this_run.append(ver)
            print(f"[migrations] Successfully applied: {ver}")

    return applied_in_this_run


if __name__ == "__main__":
    url_arg = sys.argv[1] if len(sys.argv) > 1 else None
    try:
        applied = run_migrations(url_arg)
        print(f"\nMigration complete. Applied {len(applied)} new migrations.")
    except Exception as exc:
        print(f"\nMigration failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)
