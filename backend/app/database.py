from __future__ import annotations

import os
from pathlib import Path
import socket
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if type(dbapi_connection).__module__ == "sqlite3":
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SQLITE_PATH = PROJECT_ROOT / "data" / "fieldshift.db"
DEFAULT_SQLITE_URL = f"sqlite:///{SQLITE_PATH.as_posix()}"


def _is_pg_available(host: str = "localhost", port: int = 5433) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except OSError:
        return False


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
        # PgBouncer transaction pooling does not support named prepared statements
        connect_args["prepare_threshold"] = None

    # Use render_as_string to ensure password is not masked with asterisks
    return parsed.render_as_string(hide_password=False), connect_args


raw_env_url = os.getenv("DATABASE_URL") or os.getenv("FIELDSHIFT_DATABASE_URL")
engine_kwargs: dict = {"pool_pre_ping": True}
connect_args: dict = {}

if raw_env_url:
    if "sqlite" in raw_env_url:
        DATABASE_URL = raw_env_url
        connect_args = {"check_same_thread": False}
    else:
        DATABASE_URL, connect_args = normalize_database_url(raw_env_url)
        engine_kwargs.update({
            "pool_recycle": 300,
            "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
            "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
        })
elif _is_pg_available("localhost", 5433):
    DATABASE_URL = "postgresql+psycopg://fieldshift:fieldshift@localhost:5433/fieldshift"
    connect_args = {"connect_timeout": 3}
    engine_kwargs.update({"pool_recycle": 300, "pool_size": 5, "max_overflow": 10})
elif _is_pg_available("localhost", 5432):
    DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/fieldshift"
    connect_args = {"connect_timeout": 3}
    engine_kwargs.update({"pool_recycle": 300, "pool_size": 5, "max_overflow": 10})
else:
    DATABASE_URL = DEFAULT_SQLITE_URL
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def is_postgres() -> bool:
    """Return True if engine connects to PostgreSQL."""
    return "postgresql" in engine.dialect.name or "psycopg" in engine.dialect.name


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
