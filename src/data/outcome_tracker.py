"""Actual vs Estimated Seasonal Outcome Tracking and Variance Analysis.

Allows farmers to record empirical seasonal harvest results:
- Crop planted
- Planting and harvest dates
- Actual yield (t/ha and total field tons)
- Actual revenue and production costs (BDT)
- Actual water consumption (mm)
- Management notes (weather events, pest pressure, irrigation adjustments)

Computes transparent variance metrics against prior FieldShift estimates:
- Yield Variance (Absolute delta t/ha and %)
- Gross Margin Variance (Absolute delta BDT and %)
- Water Footprint Variance (Absolute delta mm and %)

Distinguishes observed actuals from prior model estimates throughout.
"""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path
from typing import Any, Mapping
import numpy as np

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "fieldshift.db"


def init_outcomes_db(conn: sqlite3.Connection | None = None) -> None:
    should_close = False
    if conn is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        should_close = True

    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS farm_outcomes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                field_id INTEGER NOT NULL,
                user_id INTEGER,
                period TEXT,
                season TEXT,
                year INTEGER,
                crop TEXT NOT NULL,
                planting_date TEXT,
                harvest_date TEXT,
                actual_yield_t_ha REAL,
                actual_revenue_bdt REAL,
                actual_cost_bdt REAL,
                actual_water_mm REAL,
                estimated_yield_t_ha REAL,
                estimated_revenue_bdt REAL,
                estimated_water_mm REAL,
                yield_variance_pct REAL,
                revenue_variance_pct REAL,
                water_variance_pct REAL,
                management_notes TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        if should_close:
            conn.close()


def safe_float(val: Any) -> float | None:
    if val is None or isinstance(val, bool):
        return None
    try:
        f = float(val)
        return f if np.isfinite(f) else None
    except (TypeError, ValueError):
        return None


def calculate_variance(actual: float | None, estimated: float | None) -> dict[str, Any]:
    if actual is None or estimated is None:
        return {
            "delta_absolute": None,
            "delta_percent": None,
            "status": "incomplete_data",
        }
    delta = actual - estimated
    pct = (delta / estimated * 100.0) if estimated > 0 else (0.0 if delta == 0 else None)
    return {
        "delta_absolute": round(delta, 2),
        "delta_percent": round(pct, 1) if pct is not None else None,
        "direction": "favorable" if delta >= 0 else "unfavorable",
    }


def record_actual_outcome(
    field_id: int | str,
    payload: Mapping[str, Any],
    user_id: int | None = None,
) -> dict[str, Any]:
    """Record an empirical season harvest outcome and calculate variance vs estimate."""
    init_outcomes_db()

    crop = str(payload.get("crop") or payload.get("crop_planted") or "").strip()
    if not crop:
        raise ValueError("crop is required to record a seasonal outcome.")

    period = str(payload.get("period") or "").strip() or None
    season = str(payload.get("season") or "dry").strip().lower()
    year = int(payload.get("year") or time.gmtime().tm_year)

    actual_yield = safe_float(payload.get("actual_yield_t_ha"))
    if actual_yield is None and payload.get("actual_yield_kg_ha") is not None:
        v_kg = safe_float(payload.get("actual_yield_kg_ha"))
        if v_kg is not None:
            actual_yield = round(v_kg / 1000.0, 4)

    actual_revenue = safe_float(payload.get("actual_revenue_bdt"))
    actual_cost = safe_float(payload.get("actual_cost_bdt"))
    actual_water = safe_float(payload.get("actual_water_mm"))

    estimated_yield = safe_float(payload.get("estimated_yield_t_ha"))
    if estimated_yield is None:
        if payload.get("predicted_yield_t_ha") is not None:
            estimated_yield = safe_float(payload.get("predicted_yield_t_ha"))
        elif payload.get("predicted_yield_kg_ha") is not None:
            v_pkg = safe_float(payload.get("predicted_yield_kg_ha"))
            if v_pkg is not None:
                estimated_yield = round(v_pkg / 1000.0, 4)
        elif payload.get("estimated_yield_kg_ha") is not None:
            v_ekg = safe_float(payload.get("estimated_yield_kg_ha"))
            if v_ekg is not None:
                estimated_yield = round(v_ekg / 1000.0, 4)

    estimated_revenue = safe_float(payload.get("estimated_revenue_bdt")) or safe_float(payload.get("predicted_revenue_bdt"))
    estimated_water = safe_float(payload.get("estimated_water_mm")) or safe_float(payload.get("predicted_water_mm"))

    yield_var = calculate_variance(actual_yield, estimated_yield)
    rev_var = calculate_variance(actual_revenue, estimated_revenue)
    water_var = calculate_variance(actual_water, estimated_water)

    notes = str(payload.get("management_notes") or payload.get("notes") or "").strip()
    planting_date = str(payload.get("planting_date") or "").strip() or None
    harvest_date = str(payload.get("harvest_date") or "").strip() or None
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    numeric_field_id = int(field_id) if str(field_id).isdigit() else 1

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.execute(
            """
            INSERT INTO farm_outcomes (
                field_id, user_id, period, season, year, crop,
                planting_date, harvest_date,
                actual_yield_t_ha, actual_revenue_bdt, actual_cost_bdt, actual_water_mm,
                estimated_yield_t_ha, estimated_revenue_bdt, estimated_water_mm,
                yield_variance_pct, revenue_variance_pct, water_variance_pct,
                management_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                numeric_field_id,
                user_id,
                period,
                season,
                year,
                crop,
                planting_date,
                harvest_date,
                actual_yield,
                actual_revenue,
                actual_cost,
                actual_water,
                estimated_yield,
                estimated_revenue,
                estimated_water,
                yield_var.get("delta_percent"),
                rev_var.get("delta_percent"),
                water_var.get("delta_percent"),
                notes,
                now_iso,
            ),
        )
        conn.commit()
        record_id = cur.lastrowid

        # Also sync to field_history so future replanning automatically knows this past crop
        try:
            conn.execute(
                """
                INSERT INTO field_history (field_id, crop, season, year, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (numeric_field_id, crop, season, year, f"Actual harvest: {notes}", now_iso),
            )
            conn.commit()
        except Exception:
            pass

    return {
        "status": "created",
        "id": record_id,
        "field_id": field_id,
        "period": period,
        "season": season,
        "year": year,
        "crop": crop,
        "planting_date": planting_date,
        "harvest_date": harvest_date,
        "yield_variance_pct": yield_var.get("delta_percent"),
        "revenue_variance_pct": rev_var.get("delta_percent"),
        "water_variance_pct": water_var.get("delta_percent"),
        "observations": {
            "actual_yield_t_ha": actual_yield,
            "actual_yield_kg_ha": round(actual_yield * 1000.0, 1) if actual_yield is not None else None,
            "actual_revenue_bdt": actual_revenue,
            "actual_cost_bdt": actual_cost,
            "actual_water_mm": actual_water,
        },
        "prior_estimates": {
            "estimated_yield_t_ha": estimated_yield,
            "predicted_yield_kg_ha": round(estimated_yield * 1000.0, 1) if estimated_yield is not None else None,
            "estimated_revenue_bdt": estimated_revenue,
            "estimated_water_mm": estimated_water,
        },
        "variance_analysis": {
            "yield": yield_var,
            "revenue": rev_var,
            "water": water_var,
        },
        "management_notes": notes,
        "provenance": {
            "data_class": "farmer_observed_ground_truth",
            "validation": "user_entered_actuals",
            "created_at": now_iso,
        },
    }


def list_actual_outcomes(field_id: int | str | None = None) -> list[dict[str, Any]]:
    """Retrieve recorded seasonal outcomes for a field or all fields."""
    init_outcomes_db()
    results = []

    if not DB_PATH.is_file():
        return results

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        if field_id is not None:
            str_id = str(field_id)
            num_id = int(str_id) if str_id.isdigit() else -999999
            rows = conn.execute(
                "SELECT * FROM farm_outcomes WHERE field_id = ? OR CAST(field_id AS TEXT) = ? ORDER BY year DESC, id DESC",
                (num_id, str_id),
            ).fetchall()
            if not rows and not str_id.isdigit():
                rows = conn.execute(
                    "SELECT * FROM farm_outcomes ORDER BY year DESC, id DESC LIMIT 50"
                ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM farm_outcomes ORDER BY year DESC, id DESC LIMIT 50"
            ).fetchall()

        for r in rows:
            results.append({
                "id": r["id"],
                "field_id": r["field_id"],
                "period": r["period"],
                "season": r["season"],
                "year": r["year"],
                "crop": r["crop"],
                "planting_date": r["planting_date"],
                "harvest_date": r["harvest_date"],
                "actual_yield_t_ha": r["actual_yield_t_ha"],
                "actual_revenue_bdt": r["actual_revenue_bdt"],
                "actual_cost_bdt": r["actual_cost_bdt"],
                "actual_water_mm": r["actual_water_mm"],
                "estimated_yield_t_ha": r["estimated_yield_t_ha"],
                "estimated_revenue_bdt": r["estimated_revenue_bdt"],
                "estimated_water_mm": r["estimated_water_mm"],
                "yield_variance_pct": r["yield_variance_pct"],
                "revenue_variance_pct": r["revenue_variance_pct"],
                "water_variance_pct": r["water_variance_pct"],
                "management_notes": r["management_notes"],
                "created_at": r["created_at"],
            })

    return results
