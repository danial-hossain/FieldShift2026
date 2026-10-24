from __future__ import annotations

import os
from pathlib import Path
import socket
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SQLITE_PATH = PROJECT_ROOT / "data" / "fieldshift.db"
DEFAULT_SQLITE_URL = f"sqlite:///{SQLITE_PATH.as_posix()}"

def _is_pg_available(host: str = "localhost", port: int = 5433) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except OSError:
        return False

env_url = os.getenv("FIELDSHIFT_DATABASE_URL")
if env_url:
    DATABASE_URL = env_url
elif _is_pg_available("localhost", 5433):
    DATABASE_URL = "postgresql+psycopg://fieldshift:fieldshift@localhost:5433/fieldshift"
else:
    DATABASE_URL = DEFAULT_SQLITE_URL

connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
elif "psycopg" in DATABASE_URL or "postgresql" in DATABASE_URL:
    connect_args = {"connect_timeout": 3}

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
