from __future__ import annotations

import hashlib, importlib.util, math, os, secrets, sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession
from .database import Base, engine, get_db, is_postgres
from .models import Analysis, Farm, Field as FarmField, FieldHistory, Session as LoginSession, User

cors_origins_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
]
if cors_origins_env:
    for origin in cors_origins_env.split(","):
        trimmed = origin.strip()
        if trimmed and trimmed not in allowed_origins:
            allowed_origins.append(trimmed)

cors_origin_regex = os.getenv("CORS_ORIGIN_REGEX", r"^https:\/\/.*\.onrender\.com$")
is_render = bool(os.getenv("RENDER"))
is_prod = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod") or is_render
cookie_samesite = os.getenv("COOKIE_SAMESITE", "none" if is_prod else "lax")
cookie_secure = os.getenv("COOKIE_SECURE", "true" if is_prod else "false").lower() in ("true", "1", "yes")

app = FastAPI(title="FieldShift API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_origin_regex=cors_origin_regex if "*" not in allowed_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        "fieldshift_session",
        token,
        httponly=True,
        samesite=cookie_samesite,
        secure=cookie_secure,
        max_age=604800,
    )

def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        "fieldshift_session",
        samesite=cookie_samesite,
        secure=cookie_secure,
    )

@app.get("/api/health")
@app.get("/healthz")
def health_check():
    return {
        "status": "healthy",
        "service": "fieldshift-backend",
        "database": "postgresql" if is_postgres() else "sqlite",
        "environment": "production" if is_prod else "development",
    }

class Payload(BaseModel):
    model_config = ConfigDict(extra="allow")

class Credentials(BaseModel):
    name: str | None = None
    email: str
    password: str

def now() -> datetime: return datetime.now(timezone.utc)
def public_user(u: User) -> dict[str, Any]: return {"id":u.id,"name":u.name,"email":u.email,"is_active":u.is_active,"created_at":u.created_at,"updated_at":u.updated_at}
def password_hash(password: str) -> str:
    salt=secrets.token_bytes(16); digest=hashlib.pbkdf2_hmac("sha256",password.encode(),salt,310000)
    return f"pbkdf2_sha256$310000${salt.hex()}${digest.hex()}"
def verify_password(password: str, stored: str) -> bool:
    try:
        if stored.startswith("pbkdf2_sha256$"):
            _, rounds, salt, digest=stored.split("$",3)
            candidate=hashlib.pbkdf2_hmac("sha256",password.encode(),bytes.fromhex(salt),int(rounds)).hex()
            return secrets.compare_digest(candidate,digest)
    except (TypeError, ValueError): return False
    return secrets.compare_digest(hashlib.sha256(password.encode()).hexdigest(),stored)
def require_user(fieldshift_session: str | None = Cookie(None), db: DbSession = Depends(get_db)) -> User:
    item = db.scalar(select(LoginSession).where(LoginSession.token == fieldshift_session, LoginSession.expires_at > now())) if fieldshift_session else None
    user = db.get(User, item.user_id) if item else None
    if user is None or not user.is_active:
        raise HTTPException(401, "Sign in is required.")
    return user
def owned_farm(db: DbSession, farm_id: int, user: User) -> Farm:
    farm=db.get(Farm,farm_id)
    if not farm or farm.user_id != user.id: raise HTTPException(404,"Farm not found or not owned by this user.")
    return farm
def owned_field(db: DbSession, field_id: int, user: User) -> FarmField:
    field=db.get(FarmField,field_id)
    if not field: raise HTTPException(404,"Field not found or not owned by this user.")
    owned_farm(db,field.farm_id,user); return field
def row(value: Any) -> dict[str, Any]:
    return {c.name:getattr(value,c.name) for c in value.__table__.columns}

def finite_json_value(value: Any) -> Any:
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if isinstance(value, dict):
        return {key: finite_json_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [finite_json_value(item) for item in value]
    return value

def workflow_result(data: dict[str, Any], user: dict[str, Any] | None = None) -> dict[str, Any]:
    """Transport adapter: invoke the retained workflow without reimplementing it."""
    _demo_summary = legacy_workflow_module()._demo_summary
    try:
        return _demo_summary(data, user=user)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(502, str(e)) from e

def legacy_workflow_module():
    """Load the pre-migration workflow without confusing it with backend.app."""
    module_name = "fieldshift_legacy_server"
    module = sys.modules.get(module_name)
    if module is not None:
        return module
    server_path = Path(__file__).resolve().parents[2] / "app" / "server.py"
    spec = importlib.util.spec_from_file_location(module_name, server_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load retained FieldShift workflow from {server_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

def use_field_record(data: dict[str, Any], field: FarmField, db: DbSession) -> dict[str, Any]:
    """Build workflow field inputs from the selected PostgreSQL row."""
    data = dict(data)
    data.update({
        "field_id": field.id,
        "field_size_ha": field.area_ha,
        "area_ha": field.area_ha,
        "latitude": field.latitude,
        "longitude": field.longitude,
        "soil_texture": field.soil_texture or "unknown",
        "organic_matter": field.organic_matter,
        "irrigation_capacity_mm": field.irrigation_capacity_mm,
        "soil_ph": getattr(field, "soil_ph", None),
    })
    histories = list(db.scalars(
        select(FieldHistory)
        .where(FieldHistory.field_id == field.id)
        .order_by(FieldHistory.year.desc(), FieldHistory.id.desc())
    ))
    include_history = data.get("include_history", True)
    if isinstance(include_history, str):
        include_history = include_history.strip().lower() in {"true", "1", "yes", "on"}
    if include_history and histories:
        data["previous_crop"] = histories[0].crop or ""
        data["previous_crop_year"] = histories[0].year or ""
        data["season"] = histories[0].season or data.get("season", "dry")
    else:
        data["previous_crop"] = ""
        data["previous_crop_year"] = ""
    return data

def authorize_rl_field(field_id: Any, fieldshift_session: str | None, db: DbSession) -> tuple[FarmField | None, User | None]:
    if str(field_id) == "demo":
        return None, None
    try:
        numeric_field_id = int(field_id)
    except (TypeError, ValueError) as error:
        raise HTTPException(400, "field_id must identify the selected registered field or explicit demo field.") from error
    user = require_user(fieldshift_session, db)
    return owned_field(db, numeric_field_id, user), user

def rl_weights(strategy_id: Any) -> dict[str, float]:
    from src.optimizer.strategies import DEFAULT_PRIORITY_PROFILES

    profiles = {
        "profit_focused": DEFAULT_PRIORITY_PROFILES["profit_focused"],
        "water_efficiency": DEFAULT_PRIORITY_PROFILES["water_focused"],
        "soil_health": DEFAULT_PRIORITY_PROFILES["soil_focused"],
        "balanced": DEFAULT_PRIORITY_PROFILES["balanced"],
    }
    key = str(strategy_id or "")
    if key not in profiles:
        raise HTTPException(400, "strategy_id must be one of the four canonical MILP strategies.")
    return profiles[key]

def run_rl_step_payload(data: dict[str, Any], *, baseline_crop: str | None = None) -> dict[str, Any]:
    from src.data.crops import load_crop_knowledge
    from src.rl.crop_rotation_rl import run_sequential_policy_step

    try:
        result = run_sequential_policy_step(
            data.get("state"),
            load_crop_knowledge(),
            weights=rl_weights(data.get("strategy_id")),
            season_index=data.get("season_index"),
            field_area_ha=data.get("field_area_ha"),
            applied_crop=data.get("applied_crop"),
            baseline_crop=baseline_crop,
        )
    except (TypeError, ValueError, FileNotFoundError) as error:
        raise HTTPException(422, str(error)) from error
    return result

def run_milp_baseline_step_payload(data: dict[str, Any], crop: str) -> dict[str, Any]:
    return run_rl_step_payload(data, baseline_crop=crop)

def validate_rl_decision_context(data: dict[str, Any]) -> dict[str, Any]:
    season_index = data.get("season_index")
    if isinstance(season_index, bool) or not isinstance(season_index, int) or not 0 <= season_index < 6:
        raise HTTPException(422, "season_index must be an integer from 0 through 5.")
    initial_state = data.get("initial_state")
    state = data.get("state")
    history = data.get("completed_seasons")
    reference_rotation = data.get("milp_reference_rotation")
    if not isinstance(initial_state, dict) or not isinstance(state, dict):
        raise HTTPException(422, "initial_state and current state must be objects.")
    try:
        initial_temperature = float(initial_state["temperature_c"])
        initial_water = float(initial_state["available_water_mm"])
        initial_soil_health = float(initial_state["soil_health_score"])
        initial_ph = float(initial_state["soil_ph"]) if initial_state.get("soil_ph") is not None else None
    except (KeyError, TypeError, ValueError) as error:
        raise HTTPException(422, "Initial temperature, available water, and soil-health proxy must be valid numbers.") from error
    if (
        not all(math.isfinite(value) for value in (initial_temperature, initial_water, initial_soil_health))
        or not -10 <= initial_temperature <= 60
        or not 0 <= initial_water <= 100000
        or not 0 <= initial_soil_health <= 100
        or (initial_ph is not None and (not math.isfinite(initial_ph) or not 0 <= initial_ph <= 14))
    ):
        raise HTTPException(422, "Initial simulation values are outside the supported temperature, water, soil-health, or pH range.")
    if not isinstance(history, list) or len(history) != season_index:
        raise HTTPException(422, "completed_seasons must contain exactly the prior completed seasons.")
    if not isinstance(reference_rotation, list) or len(reference_rotation) != 6:
        raise HTTPException(422, "milp_reference_rotation must contain the six-season reference plan.")
    season_ids = ["Y1_S1", "Y1_S2", "Y2_S1", "Y2_S2", "Y3_S1", "Y3_S2"]
    strategy_id = str(data.get("strategy_id") or "")
    for index, season in enumerate(history):
        if not isinstance(season, dict) or season.get("season_id") != season_ids[index]:
            raise HTTPException(422, f"completed_seasons entry {index + 1} is missing or out of order.")
        before = season.get("state_before")
        after = season.get("state_after")
        after_crop = season.get("state_after_crop")
        outcome = season.get("outcome")
        applied_crop = season.get("applied_action")
        if (
            season.get("status") != "completed"
            or not isinstance(before, dict)
            or not isinstance(after, dict)
            or not isinstance(after_crop, dict)
            or not isinstance(outcome, dict)
            or not applied_crop
            or outcome.get("crop") != applied_crop
            or after.get("previous_crop") != applied_crop
            or season.get("stress_intervention") is None
        ):
            raise HTTPException(422, f"{season_ids[index]} is not a valid completed state transition.")
        if index == 0 and before != initial_state:
            raise HTTPException(422, "Y1_S1 state_before must match the selected field/MILP context.")
        if index and before != history[index - 1].get("state_after"):
            raise HTTPException(422, f"State continuity failed before {season_ids[index]}.")
        if season.get("milp_reference_crop") != reference_rotation[index]:
            raise HTTPException(422, f"{season_ids[index]} does not match the initial MILP reference rotation.")
        decision_source = season.get("decision_source")
        if index == 0:
            if (
                decision_source != "milp_baseline"
                or season.get("rl_proposed_action") is not None
                or applied_crop != reference_rotation[0]
            ):
                raise HTTPException(422, "Y1_S1 must be the selected MILP baseline action, not an RL decision.")
            reproduced = run_milp_baseline_step_payload({
                "state": before,
                "season_index": index,
                "strategy_id": strategy_id,
                "field_area_ha": before.get("field_area_ha", data.get("field_area_ha")),
            }, reference_rotation[0])
        else:
            if decision_source not in {"rl_policy", "user_override"}:
                raise HTTPException(422, f"{season_ids[index]} has an invalid decision source.")
            reproduced = run_rl_step_payload({
                "state": before,
                "season_index": index,
                "strategy_id": strategy_id,
                "field_area_ha": before.get("field_area_ha", data.get("field_area_ha")),
                "applied_crop": applied_crop if decision_source == "user_override" else None,
            })
        if (
            reproduced["rl_proposed_action"] != season.get("rl_proposed_action")
            or reproduced["applied_action"] != applied_crop
            or reproduced["decision_source"] != decision_source
            or reproduced["outcome"] != outcome
        ):
            raise HTTPException(422, f"{season_ids[index]} history does not match its backend decision/outcome.")
        next_season_id = season_ids[index + 1] if index + 1 < len(season_ids) else None
        reproduced_after_crop = reproduced["state_after_crop"]
        reproduced_after_crop["season_id"] = next_season_id
        if reproduced_after_crop != after_crop:
            raise HTTPException(422, f"{season_ids[index]} history has an inconsistent post-crop state.")
        reproduced_after, reproduced_intervention = apply_rl_intervention(
            reproduced_after_crop,
            season.get("stress_intervention"),
        )
        reproduced_after["season_id"] = next_season_id
        if reproduced_after != after or reproduced_intervention != season.get("stress_intervention"):
            raise HTTPException(422, f"{season_ids[index]} history has an inconsistent intervention/state.")
    expected_state = history[-1]["state_after"] if history else initial_state
    if state != expected_state:
        raise HTTPException(409, "Current state must equal the field-context starting state or latest completed season state.")
    if state.get("season_id") != season_ids[season_index]:
        raise HTTPException(422, f"Current state must be the state entering {season_ids[season_index]}.")
    return {
        "season_index": season_index,
        "initial_state": initial_state,
        "current_state": state,
        "completed_seasons": history,
        "milp_reference_rotation": reference_rotation,
        "interventions": [season.get("stress_intervention") for season in history],
    }

def apply_rl_intervention(state: dict[str, Any], raw: Any) -> tuple[dict[str, Any], dict[str, Any]]:
    if raw is None:
        raw = {}
    if not isinstance(raw, dict):
        raise HTTPException(422, "intervention must be an object.")
    allowed = {
        "water_reduction_pct",
        "temperature_delta_c",
        "available_water_override_mm",
        "temperature_override_c",
    }
    unknown = set(raw) - allowed
    if unknown:
        raise HTTPException(422, "Unsupported intervention fields: " + ", ".join(sorted(unknown)))
    next_state = dict(state)
    applied = {
        "water_reduction_pct": 0.0,
        "temperature_delta_c": 0.0,
        "available_water_override_mm": None,
        "temperature_override_c": None,
    }
    try:
        water_reduction = float(raw.get("water_reduction_pct", 0))
        temperature_delta = float(raw.get("temperature_delta_c", 0))
        if water_reduction not in (0.0, 0.2, 0.4, 0.6):
            raise ValueError("water_reduction_pct must be 0, 0.2, 0.4, or 0.6.")
        if temperature_delta not in (0.0, 1.0, 3.0, 5.0):
            raise ValueError("temperature_delta_c must be 0, 1, 3, or 5.")
        next_state["available_water_mm"] = max(
            0.0, float(next_state["available_water_mm"]) * (1.0 - water_reduction)
        )
        next_state["temperature_c"] = float(next_state["temperature_c"]) + temperature_delta
        if water_reduction > 0:
            next_state["available_water_source"] = "simulation-derived from crop transition and user-selected water stress"
        if temperature_delta > 0:
            next_state["temperature_source"] = "simulation-derived from prior temperature and user-selected heat stress"
        applied["water_reduction_pct"] = water_reduction
        applied["temperature_delta_c"] = temperature_delta
        for key, minimum, maximum in (
            ("available_water_override_mm", 0.0, 100000.0),
            ("temperature_override_c", -10.0, 60.0),
        ):
            if raw.get(key) not in (None, ""):
                value = float(raw[key])
                if not math.isfinite(value) or not minimum <= value <= maximum:
                    raise ValueError(f"{key} must be between {minimum:g} and {maximum:g}.")
                state_key = "available_water_mm" if key == "available_water_override_mm" else "temperature_c"
                next_state[state_key] = value
                source_key = "available_water_source" if key == "available_water_override_mm" else "temperature_source"
                next_state[source_key] = "user-supplied simulation assumption (post-season intervention)"
                applied[key] = value
    except (KeyError, TypeError, ValueError) as error:
        raise HTTPException(422, str(error)) from error
    return next_state, applied

def validate_rl_trajectory(raw: Any, final_state: dict[str, Any], strategy_id: str) -> list[dict[str, Any]]:
    season_ids = ["Y1_S1", "Y1_S2", "Y2_S1", "Y2_S2", "Y3_S1", "Y3_S2"]
    if not isinstance(raw, list) or len(raw) != len(season_ids):
        raise HTTPException(422, "rl_trajectory must contain all six completed seasons.")
    trajectory: list[dict[str, Any]] = []
    for index, (season_id, item) in enumerate(zip(season_ids, raw)):
        if not isinstance(item, dict) or item.get("season_id") != season_id:
            raise HTTPException(422, f"rl_trajectory season {index + 1} is missing or out of order.")
        before = item.get("state_before")
        after_crop = item.get("state_after_crop")
        after = item.get("state_after")
        outcome = item.get("outcome")
        proposed = item.get("rl_proposed_action")
        applied = item.get("applied_action")
        source = item.get("decision_source")
        if item.get("status") != "completed" or not all(isinstance(value, dict) for value in (before, after_crop, after, outcome)):
            raise HTTPException(422, f"rl_trajectory {season_id} is not a completed state transition.")
        if not applied or outcome.get("crop") != applied:
            raise HTTPException(422, f"rl_trajectory {season_id} action and outcome do not match.")
        if index == 0:
            if source != "milp_baseline" or proposed is not None or applied != item.get("milp_reference_crop"):
                raise HTTPException(422, "rl_trajectory Y1_S1 must be the MILP baseline action without an RL proposal.")
        else:
            if not proposed or source not in {"rl_policy", "user_override"}:
                raise HTTPException(422, f"rl_trajectory {season_id} has an invalid RL decision source.")
            if source == "rl_policy" and proposed != applied:
                raise HTTPException(422, f"rl_trajectory {season_id} changes the RL action without a user override.")
        if after.get("previous_crop") != applied:
            raise HTTPException(422, f"rl_trajectory {season_id} state does not record its applied crop.")
        if index and before != trajectory[index - 1]["state_after"]:
            raise HTTPException(422, f"rl_trajectory state continuity failed before {season_id}.")
        if index == 0:
            reproduced = run_milp_baseline_step_payload({
                "state": before,
                "season_index": index,
                "strategy_id": strategy_id,
                "field_area_ha": before.get("field_area_ha"),
            }, applied)
        else:
            reproduced = run_rl_step_payload({
                "state": before,
                "season_index": index,
                "strategy_id": strategy_id,
                "field_area_ha": before.get("field_area_ha"),
                "applied_crop": applied if source == "user_override" else None,
            })
        if (
            reproduced["rl_proposed_action"] != proposed
            or reproduced["applied_action"] != applied
            or reproduced["decision_source"] != source
            or reproduced["outcome"] != outcome
        ):
            raise HTTPException(422, f"rl_trajectory {season_id} does not match its backend policy/outcome.")
        reproduced_after_crop = reproduced["state_after_crop"]
        reproduced_after_crop["season_id"] = season_ids[index + 1] if index < 5 else None
        if reproduced_after_crop != after_crop:
            raise HTTPException(422, f"rl_trajectory {season_id} does not match its backend crop transition.")
        reproduced_after, reproduced_intervention = apply_rl_intervention(
            reproduced_after_crop,
            item.get("stress_intervention"),
        )
        reproduced_after["season_id"] = season_ids[index + 1] if index < 5 else None
        if reproduced_after != after or reproduced_intervention != item.get("stress_intervention"):
            raise HTTPException(422, f"rl_trajectory {season_id} does not match its recorded intervention/state.")
        trajectory.append(item)
    if trajectory[-1]["state_after"] != final_state:
        raise HTTPException(422, "final_state must equal the Season 6 state_after in rl_trajectory.")
    return trajectory

@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(engine)  # deployment should use Alembic migration below

@app.get("/api/health")
def health(db: DbSession = Depends(get_db)):
    db_status = "ok"
    dialect = engine.dialect.name
    try:
        db.execute(select(1)).scalar()
    except Exception as exc:
        db_status = f"unhealthy: {type(exc).__name__}"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": {
            "status": db_status,
            "dialect": dialect,
            "is_postgres": is_postgres(),
        },
        "project": "FieldShift",
        "mode": "offline_demo",
        "synthetic_boundary": True,
        "uses_repository_modules": True,
        "dashboard": "available",
        "notes": [
            "Live NASA POWER retrieval is available only when explicitly selected.",
            "Offline mode uses bundled data and the existing FieldShift pipeline."
        ]
    }

@app.post("/api/workflow")
def workflow(payload: Payload, fieldshift_session: str | None = Cookie(None), db: DbSession = Depends(get_db)):
    data = payload.model_dump()
    user = None
    if fieldshift_session:
        try:
            user = require_user(fieldshift_session, db)
        except HTTPException:
            user = None

    requested_field_id = data.get("field_id")
    if requested_field_id not in (None, "", "demo"):
        if user is None:
            raise HTTPException(401, "Sign in to analyze a registered field.")
        try:
            fid = int(requested_field_id)
        except (ValueError, TypeError) as error:
            raise HTTPException(400, "field_id must identify a registered PostgreSQL field.") from error
        field_record = owned_field(db, fid, user)
        data = use_field_record(data, field_record, db)
    elif "area_ha" in data and ("field_size_ha" not in data or data["field_size_ha"] in (None, "")):
        data["field_size_ha"] = data["area_ha"]

    user_dict = public_user(user) if user else None
    return workflow_result(data, user=user_dict)

@app.post("/api/counterfactual/reoptimize")
def counterfactual_reoptimize(
    payload: Payload,
    fieldshift_session: str | None = Cookie(None),
    db: DbSession = Depends(get_db),
):
    data = payload.model_dump()
    user = None
    if fieldshift_session:
        try:
            user = require_user(fieldshift_session, db)
        except HTTPException:
            user = None

    requested_field_id = data.get("field_id")
    if requested_field_id not in (None, "", "demo"):
        if user is None:
            raise HTTPException(401, "Sign in to analyze a registered field.")
        try:
            field_id = int(requested_field_id)
        except (ValueError, TypeError) as error:
            raise HTTPException(
                400, "field_id must identify a registered PostgreSQL field."
            ) from error
        data = use_field_record(data, owned_field(db, field_id, user), db)
    elif "area_ha" in data and data.get("field_size_ha") in (None, ""):
        data["field_size_ha"] = data["area_ha"]
    data["counterfactual_only"] = True

    try:
        body = workflow_result(data, user=public_user(user) if user else None)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            502, f"PuLP/CBC re-optimization failed: {error}"
        ) from error

    result = (body.get("summary") or {}).get("counterfactual_milp")
    if not isinstance(result, dict):
        raise HTTPException(
            502, "Counterfactual workflow returned no MILP result."
        )
    return finite_json_value(jsonable_encoder(result))

@app.post("/api/location/weather")
def location_weather(payload: Payload):
    _location_weather = legacy_workflow_module()._location_weather
    try: return _location_weather(payload.model_dump())
    except ValueError as e: raise HTTPException(400,str(e))
    except RuntimeError as e: raise HTTPException(502,str(e))

@app.get("/api/crops")
def crops():
    from src.data.crops import load_crop_knowledge
    return {"status":"ok","crops":load_crop_knowledge().to_dict(orient="records")}

@app.get("/api/crops/catalog")
def crops_catalog():
    from src.data.bangladesh_crops import get_crop_catalog_with_provenance, BANGLADESH_AGRICULTURAL_SOURCES
    catalog = get_crop_catalog_with_provenance()
    sources = [
        {
            "source_code": s.get("code", k),
            "title": s.get("title", ""),
            "year": s.get("year", 2024),
            "geographic_relevance": s.get("relevance", "Bangladesh AEZ 1-30"),
            "role": s.get("role", "Authoritative Agronomic Reference"),
        }
        for k, s in BANGLADESH_AGRICULTURAL_SOURCES.items()
    ]
    return {
        "status": "ok",
        "total_crops": len(catalog),
        "crops": catalog,
        "sources": sources,
        "disclaimer": (
            "Crop parameters are calibrated from authoritative BARI, BRRI, BBS, and DAE publications. "
            "Demo defaults are explicitly designated where plot-level sensor calibration is unavailable."
        ),
    }

@app.get("/api/satellite/readiness")
def satellite_readiness(latitude: float = 23.8103, longitude: float = 90.4125, lat: float | None = None, lon: float | None = None):
    from src.data.bangladesh_crops import get_satellite_readiness_status
    actual_lat = lat if lat is not None else latitude
    actual_lon = lon if lon is not None else longitude
    data = get_satellite_readiness_status(actual_lat, actual_lon)
    data["sensors"] = [
        {
            "sensor_id": c["sensor_id"],
            "sensor_name": c["name"],
            "status": "CONNECTED" if c["status"] == "connected_live" else ("STANDBY" if "ready" in c["status"] else "NOT CONNECTED"),
            "intended_measurement": c.get("data_assurance", c.get("agency", "")),
            "spatial_resolution": c.get("spatial_resolution", ""),
            "cadence": c.get("temporal_resolution", ""),
            "parameters": ", ".join(p["code"] for p in c.get("parameters", [])),
            "prerequisites": c.get("blocker_details", "None required; operational."),
        }
        for c in data.get("connectors", [])
    ]
    data["disclaimer"] = data.get("scientific_integrity_policy", "")
    return finite_json_value(jsonable_encoder(data))

@app.post("/api/lab/compare")
def lab_compare(payload: Payload):
    data = payload.model_dump()
    from src.experiments.integrated_research_demo import DEFAULT_NASA_PATH
    from src.state.field_state import build_field_state
    from src.data.crops import load_crop_knowledge
    from src.preprocessing.features import build_features
    from src.integration.comparison_lab import run_three_way_comparison
    import pandas as pd

    lat = float(data.get("latitude") or 23.8103)
    lon = float(data.get("longitude") or 90.4125)
    priority = str(data.get("priority") or "balanced")

    if DEFAULT_NASA_PATH.is_file():
        power = pd.read_csv(DEFAULT_NASA_PATH)
        power["date"] = pd.to_datetime(power["date"])
    else:
        from src.data.nasa_power import fetch_recent_nasa_power
        power = fetch_recent_nasa_power(lat, lon)

    crops_df = load_crop_knowledge()
    state = build_field_state(str(data.get("field_id") or "demo"), lat, lon, power["date"].max(), power, crop_knowledge=crops_df)
    state.field_size_ha = float(data.get("field_size_ha") or data.get("area_ha") or 1.0)
    state.area_ha = state.field_size_ha
    if data.get("soil_ph"): state.ph = float(data["soil_ph"])
    if data.get("organic_matter"): state.organic_matter = float(data["organic_matter"])
    if data.get("temperature_c"): state.temperature = float(data["temperature_c"])
    if data.get("irrigation_capacity_mm"): state.irrigation_capacity_mm = float(data["irrigation_capacity_mm"])
    features = build_features(state, environmental_history=power)
    if data.get("available_water_mm"): features["available_water_mm"] = float(data["available_water_mm"])

    result = run_three_way_comparison(state, power, crops=crops_df, features=features, priority=priority)
    return finite_json_value(jsonable_encoder(result))

@app.post("/api/scenarios/crop-failure-recovery")
def crop_failure_recovery(payload: Payload):
    data = payload.model_dump()
    from src.experiments.integrated_research_demo import DEFAULT_NASA_PATH
    from src.state.field_state import build_field_state
    from src.data.crops import load_crop_knowledge
    from src.preprocessing.features import build_features
    from src.scenarios.recovery_simulator import simulate_crop_failure_and_recovery
    import pandas as pd

    fs = data.get("field_state") or {}
    lat = float(data.get("latitude") or fs.get("latitude") or 23.8103)
    lon = float(data.get("longitude") or fs.get("longitude") or 90.4125)
    failure_event = str(data.get("failure_event") or data.get("failure_type") or "crop_failure")
    impacted_season_index = int(data.get("impacted_season_index") if data.get("impacted_season_index") is not None else data.get("failure_season", 0))
    severity = str(data.get("severity") or "severe")
    priority = str(data.get("priority") or "balanced")

    power = pd.read_csv(DEFAULT_NASA_PATH)
    power["date"] = pd.to_datetime(power["date"])
    crops_df = load_crop_knowledge()
    state = build_field_state(str(data.get("field_id") or "demo"), lat, lon, power["date"].max(), power, crop_knowledge=crops_df)
    state.field_size_ha = float(data.get("field_size_ha") or fs.get("field_size_ha") or data.get("area_ha") or fs.get("area_ha") or 1.0)
    state.area_ha = state.field_size_ha
    if data.get("soil_ph") or fs.get("soil_ph"): state.ph = float(data.get("soil_ph") or fs.get("soil_ph"))
    if data.get("organic_matter") or fs.get("organic_matter"): state.organic_matter = float(data.get("organic_matter") or fs.get("organic_matter"))
    if data.get("irrigation_capacity_mm") or fs.get("irrigation_capacity_mm"): state.irrigation_capacity_mm = float(data.get("irrigation_capacity_mm") or fs.get("irrigation_capacity_mm"))
    features = build_features(state, environmental_history=power)

    result = simulate_crop_failure_and_recovery(
        state, power,
        failure_event=failure_event,
        impacted_season_index=impacted_season_index,
        severity=severity,
        crops=crops_df,
        features=features,
        priority=priority,
    )
    return finite_json_value(jsonable_encoder(result))

@app.post("/api/workflow/replan")
def workflow_replan(payload: Payload):
    data = payload.model_dump()
    from src.experiments.integrated_research_demo import DEFAULT_NASA_PATH
    from src.state.field_state import build_field_state
    from src.data.crops import load_crop_knowledge
    from src.preprocessing.features import build_features
    from src.optimizer.adaptive_replan import run_adaptive_replan
    import pandas as pd

    lat = float(data.get("latitude") or 23.8103)
    lon = float(data.get("longitude") or 90.4125)
    raw_completed = data.get("completed_seasons") or data.get("completed_seasons_history") or []
    if isinstance(raw_completed, int):
        last_crop = str(data.get("last_season_crop") or "Wheat")
        completed_seasons = [{"period": f"Y{1+(i//2)}_S{1+(i%2)}", "crop": last_crop} for i in range(raw_completed)]
    elif isinstance(raw_completed, list):
        completed_seasons = raw_completed
    else:
        completed_seasons = []
    updated_field_conditions = data.get("updated_field_conditions") or data.get("updated_conditions") or {}
    priority = str(data.get("priority") or "balanced")

    power = pd.read_csv(DEFAULT_NASA_PATH)
    power["date"] = pd.to_datetime(power["date"])
    crops_df = load_crop_knowledge()
    state = build_field_state(str(data.get("field_id") or "demo"), lat, lon, power["date"].max(), power, crop_knowledge=crops_df)
    state.field_size_ha = float(data.get("field_size_ha") or data.get("area_ha") or 1.0)
    state.area_ha = state.field_size_ha
    features = build_features(state, environmental_history=power)

    result = run_adaptive_replan(
        state, power,
        completed_seasons=completed_seasons,
        updated_field_conditions=updated_field_conditions,
        crops=crops_df,
        priority=priority,
        features=features,
    )
    return finite_json_value(jsonable_encoder(result))

@app.post("/api/scenarios/weather-uncertainty")
def weather_uncertainty(payload: Payload):
    data = payload.model_dump()
    from src.experiments.integrated_research_demo import DEFAULT_NASA_PATH
    from src.state.field_state import build_field_state
    from src.data.crops import load_crop_knowledge
    from src.preprocessing.features import build_features
    from src.scenarios.robust_planning import run_weather_uncertainty_analysis
    import pandas as pd

    fs = data.get("field_state") or {}
    lat = float(data.get("latitude") or fs.get("latitude") or 23.8103)
    lon = float(data.get("longitude") or fs.get("longitude") or 90.4125)
    priority = str(data.get("priority") or "balanced")

    power = pd.read_csv(DEFAULT_NASA_PATH)
    power["date"] = pd.to_datetime(power["date"])
    crops_df = load_crop_knowledge()
    state = build_field_state(str(data.get("field_id") or "demo"), lat, lon, power["date"].max(), power, crop_knowledge=crops_df)
    state.field_size_ha = float(data.get("field_size_ha") or fs.get("field_size_ha") or data.get("area_ha") or fs.get("area_ha") or 1.0)
    state.area_ha = state.field_size_ha
    if data.get("soil_ph") or fs.get("soil_ph"): state.ph = float(data.get("soil_ph") or fs.get("soil_ph"))
    if data.get("organic_matter") or fs.get("organic_matter"): state.organic_matter = float(data.get("organic_matter") or fs.get("organic_matter"))
    features = build_features(state, environmental_history=power)

    result = run_weather_uncertainty_analysis(state, power, crops=crops_df, features=features, priority=priority)
    return finite_json_value(jsonable_encoder(result))

@app.post("/api/outcomes/record", status_code=200)
def record_outcome(payload: Payload, fieldshift_session: str | None = Cookie(None), db: DbSession = Depends(get_db)):
    data = payload.model_dump()
    from src.data.outcome_tracker import record_actual_outcome, list_actual_outcomes
    field_id = data.get("field_id", 1)
    user_id = None
    if fieldshift_session:
        try:
            user = require_user(fieldshift_session, db)
            user_id = user.id
        except HTTPException:
            pass
    try:
        rec = record_actual_outcome(field_id, data, user_id=user_id)
        outcomes = list_actual_outcomes(field_id)
        return finite_json_value(jsonable_encoder({
            "status": "ok",
            "outcome": rec.get("record", rec),
            "record": rec.get("record", rec),
            "summary": {
                "total_recorded_seasons": len(outcomes),
                "average_yield_variance_pct": round(sum(float(o.get("yield_variance_pct") or 0.0) for o in outcomes) / max(1, len(outcomes)), 1),
                "average_revenue_variance_pct": round(sum(float(o.get("revenue_variance_pct") or 0.0) for o in outcomes) / max(1, len(outcomes)), 1),
            }
        }))
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.get("/api/outcomes/{field_id}")
def get_field_outcomes(field_id: str):
    from src.data.outcome_tracker import list_actual_outcomes
    outcomes = list_actual_outcomes(field_id)
    return {
        "status": "ok",
        "field_id": field_id,
        "outcomes": outcomes,
        "summary": {
            "total_recorded_seasons": len(outcomes),
            "average_yield_variance_pct": round(sum(float(o.get("yield_variance_pct") or 0.0) for o in outcomes) / max(1, len(outcomes)), 1),
            "average_revenue_variance_pct": round(sum(float(o.get("revenue_variance_pct") or 0.0) for o in outcomes) / max(1, len(outcomes)), 1),
        }
    }

@app.get("/api/outcomes")
def get_all_outcomes():
    from src.data.outcome_tracker import list_actual_outcomes
    outcomes = list_actual_outcomes()
    return {
        "status": "ok",
        "outcomes": outcomes,
        "summary": {
            "total_recorded_seasons": len(outcomes),
            "average_yield_variance_pct": round(sum(float(o.get("yield_variance_pct") or 0.0) for o in outcomes) / max(1, len(outcomes)), 1),
            "average_revenue_variance_pct": round(sum(float(o.get("revenue_variance_pct") or 0.0) for o in outcomes) / max(1, len(outcomes)), 1),
        }
    }


def get_gemini_api_key() -> str:
    import os
    if "GEMINI_API_KEY" in os.environ:
        return os.environ["GEMINI_API_KEY"]
    env_file = ROOT_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("GEMINI_API_KEY=") and not line.startswith("#"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""

def call_gemini_chat(message: str = "", history: list | None = None, context: dict | None = None, language: str | None = None, prompt: str | None = None) -> dict[str, Any]:
    import os, json, urllib.request, urllib.error
    message = (message or prompt or "").strip()
    api_key = get_gemini_api_key()
    context = context or {}
    if language and "language" not in context:
        context["language"] = language
    field_info = context.get("field") or {}
    weather_info = context.get("weather") or {}
    plan_info = context.get("plan") or {}
    comparison_info = context.get("comparison") or {}
    scenarios_info = context.get("scenarios") or {}
    outcomes_info = context.get("outcomes") or {}
    market_info = context.get("market") or {}
    provenance_info = context.get("provenance") or {}
    lang = str(context.get("language") or "en").lower()

    # Build rich field lines
    field_lines = []
    if field_info.get("name"): field_lines.append(f"Field Name: {field_info['name']}")
    if field_info.get("latitude") and field_info.get("longitude"): field_lines.append(f"Coordinates: {field_info['latitude']}°N, {field_info['longitude']}°E")
    if field_info.get("field_size_ha"): field_lines.append(f"Area: {field_info['field_size_ha']} ha")
    if field_info.get("soil_texture"): field_lines.append(f"Soil Texture: {field_info['soil_texture']}")
    if field_info.get("soil_ph") is not None: field_lines.append(f"Soil pH: {field_info['soil_ph']} (Measured / User test)")
    if field_info.get("organic_matter_pct") is not None: field_lines.append(f"Soil Organic Matter: {field_info['organic_matter_pct']}%")
    if field_info.get("irrigation_capacity_mm") is not None: field_lines.append(f"Seasonal Irrigation Capacity: {field_info['irrigation_capacity_mm']} mm")
    if field_info.get("previous_crop"): field_lines.append(f"Previous Crop: {field_info['previous_crop']}")

    weather_lines = []
    if weather_info.get("temperature_c") is not None: weather_lines.append(f"Observed Temp: {weather_info['temperature_c']}°C")
    if weather_info.get("humidity_pct") is not None: weather_lines.append(f"Relative Humidity: {weather_info['humidity_pct']}%")
    if weather_info.get("precipitation_mm") is not None: weather_lines.append(f"Daily Precipitation: {weather_info['precipitation_mm']} mm/day")
    if weather_info.get("wind_speed_ms") is not None: weather_lines.append(f"Wind Speed: {weather_info['wind_speed_ms']} m/s")
    if weather_info.get("source"): weather_lines.append(f"Weather Source: {weather_info['source']}")

    plan_lines = []
    if plan_info.get("rotation_str"): plan_lines.append(f"Planned Multi-Season Rotation: {plan_info['rotation_str']}")
    if plan_info.get("yield_tons"): plan_lines.append(f"Projected Yield: {plan_info['yield_tons']} tons")
    if plan_info.get("gross_margin_bdt"): plan_lines.append(f"Projected Gross Margin: {plan_info['gross_margin_bdt']:,} BDT")
    if plan_info.get("water_mm"): plan_lines.append(f"Estimated Water Demand: {plan_info['water_mm']} mm")
    if plan_info.get("solver_status"): plan_lines.append(f"Mathematical Solver Status: {plan_info['solver_status']}")

    extra_lines = []
    if comparison_info.get("summary"): extra_lines.append(f"Method Benchmark: {comparison_info['summary']}")
    if scenarios_info.get("robustness_score"): extra_lines.append(f"Climate Robustness Score: {scenarios_info['robustness_score']}%")
    if outcomes_info.get("recorded_seasons"): extra_lines.append(f"Empirical Harvests Logged: {outcomes_info['recorded_seasons']} seasons")
    if market_info.get("crop"): extra_lines.append(f"Market Crop: {market_info['crop']} | Farmgate: {market_info.get('farmgate_price_bdt_t', 'N/A')} BDT/t | Net Return: {market_info.get('estimated_net_return_bdt', 'N/A')} BDT")
    if market_info.get("demand_note"): extra_lines.append(f"Demand Status: {market_info['demand_note']}")
    if provenance_info.get("reliability_score"): extra_lines.append(f"System Reliability Score: {provenance_info['reliability_score']}% ({provenance_info.get('source_backed_pct', 'N/A')}% source-backed)")

    sys_text = (
        "You are the FieldShift Agronomic AI Assistant (NASA Space Apps Challenge 2026 | Team AZOIC), an expert scientific decision-support advisor for adaptive crop rotation, precision irrigation, and soil sustainability in Bangladesh.\n\n"
        "TELEMETRY & CONTEXT FOR ACTIVE FIELD:\n"
        + ("\n".join(f"- {l}" for l in field_lines) + "\n" if field_lines else "- No specific field selected; providing general agronomic guidance.\n")
        + ("\n".join(f"- {l}" for l in weather_lines) + "\n" if weather_lines else "")
        + ("\n".join(f"- {l}" for l in plan_lines) + "\n" if plan_lines else "")
        + ("\n".join(f"- {l}" for l in extra_lines) + "\n" if extra_lines else "")
        + "\nRESPONSE GUIDELINES:\n"
        "1. STRUCTURE: Whenever advising on crop choices, trade-offs, or field decisions, use this clear 6-part structure:\n"
        "   - **1. Short Answer**: Concise summary directly answering the user.\n"
        "   - **2. Evidence from this Field**: Reference actual field numbers (soil pH, OM %, irrigation mm, NASA weather, market prices).\n"
        "   - **3. Recommended Next Step**: Actionable agronomic plan.\n"
        "   - **4. Trade-offs & Risks**: Diseases, moisture deficits, market price drops or temperature risks.\n"
        "   - **5. Data Limitations**: Disclose whether values are measured lab tests, NASA reanalysis, DAM benchmarks, or simulation estimates. Clarify that open demand data is unavailable.\n"
        "   - **6. Suggested Follow-up Action**: Next tool or verification to execute.\n"
        "2. LANGUAGE: Support both English and Bengali (বাংলা). If the user writes in Bengali or Banglish or requested language is 'bn', respond in natural, polite Bengali (বাংলা), keeping scientific crop names (e.g. Boro, Aman, Aus, Lentil/Masur, Mustard/Tori) and units (pH, mm, kg/ha, BDT) intact.\n"
        "3. INTEGRITY: Never invent sensor readings or claim to have field-level satellite cameras. Remind that simulations provide decision support, not certified crop insurance assessments. Never fabricate buyer demand curves.\n"
        "4. CLARITY: Keep simple questions concise. Explain technical terms (MILP, RL, BNF, AEZ, Farmgate vs Retail) clearly."
    )

    # Detect action intent from user message
    action_intent = None
    msg_low = message.lower()
    if any(w in msg_low for w in ["market", "price", "profit", "profitability", "bazar", "দাম", "বাজারদর", "লাভ", "dam", "tcb", "sadai"]):
        action_intent = {"action": "navigate_tab", "tab": "market", "label": "Open Market Intelligence", "description": "Inspect verified crop market benchmarks, DAM/TCB pricing, and calculate net returns"}
    elif any(w in msg_low for w in ["synthetic", "synthetic data", "data lab", "scenario generator", "reproducible", "কৃত্রিম উপাত্ত"]):
        action_intent = {"action": "navigate_tab", "tab": "synthetic_lab", "label": "Open Synthetic Data Lab", "description": "Generate reproducible counterfactual farm datasets under agronomic constraints"}
    elif any(w in msg_low for w in ["sensitivity", "elasticity", "perturbation", "price change", "yield drop", "স্থিতিস্থাপকতা"]):
        action_intent = {"action": "navigate_tab", "tab": "sensitivity", "label": "Open Scientific Sensitivity Analysis", "description": "Evaluate model elasticity and rotation changes under yield, price, and water sweeps"}
    elif any(w in msg_low for w in ["harvest", "actual yield", "record outcome", "recorded harvest", "outcomes"]):
        action_intent = {"action": "navigate_tab", "tab": "outcomes", "label": "Open Actual Outcomes Tracker", "description": "Record empirical harvest yield and evaluate variance vs optimizer estimates"}
    elif any(w in msg_low for w in ["drought", "crop failure", "shock", "recover", "stress scenario"]):
        action_intent = {"action": "navigate_tab", "tab": "failure", "label": "Open Failure & Recovery Simulator", "description": "Simulate drought, heat, or waterlogging shocks and inspect recovery efficiency"}
    elif any(w in msg_low for w in ["compare", "comparison", "milp vs rl", "rule-based", "benchmark"]):
        action_intent = {"action": "navigate_tab", "tab": "lab", "label": "Open 3-Way Comparison Lab", "description": "Benchmark MILP vs RL Simulation vs Deterministic Rule baseline"}
    elif any(w in msg_low for w in ["replan", "next season", "updated soil", "soil ph drop"]):
        action_intent = {"action": "navigate_tab", "tab": "replan", "label": "Open Next-Season Replanning", "description": "Adapt remaining seasons based on updated soil tests and harvest history"}
    elif any(w in msg_low for w in ["uncertainty", "climate stress", "weather forecast", "hotter", "drier"]):
        action_intent = {"action": "navigate_tab", "tab": "uncertainty", "label": "Open Weather Uncertainty", "description": "Evaluate crop plan feasibility across 5 parametric climate stress scenarios"}
    elif any(w in msg_low for w in ["sustainability", "soil health", "organic matter trend", "bnf"]):
        action_intent = {"action": "navigate_tab", "tab": "sustainability", "label": "Open Sustainability Tracker", "description": "View multi-season soil health proxy progression and legume frequency"}
    elif any(w in msg_low for w in ["crop catalog", "crop database", "bari", "brri"]):
        action_intent = {"action": "navigate_tab", "tab": "crops", "label": "Open Bangladesh Crop Database", "description": "Inspect 15 verified Bangladeshi crops with BARI/BRRI agronomic metadata"}
    elif any(w in msg_low for w in ["parcel", "field map", "create field", "edit field"]):
        action_intent = {"action": "navigate_tab", "tab": "field", "label": "Open Field Parcel Manager", "description": "View and manage registered farm parcels"}

    contents = []
    contents.append({"role": "user", "parts": [{"text": f"System Context & Rules:\n{sys_text}\n\nAcknowledge your role in 1 concise sentence."}]})
    contents.append({"role": "model", "parts": [{"text": "Understood. I am FieldShift Agronomic AI Assistant, ready to advise on your crop rotation, soil health, and weather telemetry with full scientific transparency."}]})

    if history:
        for item in history[-6:]:
            role = "user" if item.get("role") in ["user", "human"] else "model"
            txt = (item.get("text") or item.get("content") or "").strip()
            if txt:
                contents.append({"role": role, "parts": [{"text": txt}]})

    contents.append({"role": "user", "parts": [{"text": message}]})

    candidate_models = [
        "models/gemini-flash-lite-latest",
        "models/gemini-3.1-flash-lite",
        "models/gemma-4-26b-a4b-it",
        "models/gemini-3.5-flash",
    ]

    if api_key:
        for model in candidate_models:
            for ver in ["v1beta", "v1"]:
                url = f"https://generativelanguage.googleapis.com/{ver}/{model}:generateContent?key={api_key}"
                payload = {"contents": contents}
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                try:
                    with urllib.request.urlopen(req, timeout=18) as resp:
                        resp_json = json.loads(resp.read().decode("utf-8"))
                        candidates = resp_json.get("candidates", [])
                        if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                            reply = candidates[0]["content"]["parts"][0].get("text", "")
                            if reply:
                                clean_model_name = model.replace("models/", "")
                                res_dict = {
                                    "status": "ok",
                                    "reply": reply,
                                    "response": reply,
                                    "model": clean_model_name,
                                    "model_used": clean_model_name,
                                    "is_fallback": False,
                                    "gemini_enabled": True,
                                }
                                if action_intent:
                                    res_dict["action_intent"] = action_intent
                                return res_dict
                except urllib.error.HTTPError:
                    continue
                except Exception:
                    continue

    # Deterministic rule-based offline fallback tailored to the 6-part structure
    fname = field_info.get("name") or "Selected Field"
    texture = field_info.get("soil_texture") or "loam"
    ph = field_info.get("soil_ph", 6.5)
    om = field_info.get("organic_matter") or field_info.get("organic_matter_pct", 2.0)
    irrig = field_info.get("irrigation_capacity_mm", 400)
    temp = weather_info.get("temperature") or weather_info.get("temperature_c", 26.0)

    if lang == "bn" or any(w in msg_low for w in ["bangla", "banglae", "বাংলা"]):
        fallback_reply = (
            f"**[অফলাইন কৃষি পরামর্শ — নিয়ম-ভিত্তিক সিদ্ধান্ত সমর্থন]**\n\n"
            f"### ১. সংক্ষিপ্ত উত্তর (SHORT ANSWER)\n"
            f"আপনার **{fname}** জমির জন্য ({texture} মাটি, pH {ph}, জৈব পদার্থ {om}%), রবি মৌসুমে ডাল বা তৈলবীজ (যেমন মসুর/সরিষা) এবং খরিফ মৌসুমে ধানের পর্যায়ক্রমিক ফসল আবর্তন সবচেয়ে কার্যকর।\n\n"
            f"### ২. এই জমির প্রমাণাদি (EVIDENCE FROM THIS FIELD)\n"
            f"- মাটির গঠন: **{texture}**, পরিমাপকৃত pH: **{ph}** (অনুকূল পরিসীমা: ৬.০-৭.৫)।\n"
            f"- সেচ সক্ষমতা: **{irrig} মিমি**, নাসা পাওয়ার পর্যবেক্ষিত তাপমাত্রা: **{temp}°C**।\n\n"
            f"### ৩. প্রস্তাবিত পরবর্তী পদক্ষেপ (RECOMMENDED NEXT STEP)\n"
            f"পরপর দুই মৌসুম একই গোত্রের ফসল চাষ পরিহার করুন। লিগিউম জাতীয় ফসল (যেমন মুগ বা মসুর) অন্তর্ভুক্ত করে প্রাকৃতিক নাইট্রোজেন সংবন্ধন বাড়ান।\n\n"
            f"### ৪. আপস ও ঝুঁকি (TRADE-OFFS & RISKS)\n"
            f"রবি মৌসুমে আগাম তাপপ্রবাহে দানাদার ফসলের পরাগায়ন ব্যাহত হতে পারে। সেচ ঘাটতি থাকলে খরা-সহনশীল ডাল নির্বাচন করুন।\n\n"
            f"### ৫. উপাত্তের সীমাবদ্ধতা (DATA LIMITATIONS)\n"
            f"এটি একটি স্থানীয় সিমুলেশন মডেল; কোনো পরীক্ষাগার রাসায়নিক সার পরীক্ষার সরাসরি বিকল্প নয়।\n\n"
            f"### ৬. প্রস্তাবিত করণীয় (SUGGESTED FOLLOW-UP ACTION)\n"
            f"পরবর্তী মৌসুমের জন্য 'Adaptive Replanning' মডিউলে মাটির সাম্প্রতিক পরীক্ষার মান আপডেট করুন।"
        )
    else:
        fallback_reply = (
            f"**[Offline Agronomic Guidance — Rule-Based Decision Support]**\n\n"
            f"### 1. SHORT ANSWER\n"
            f"For **{fname}** with **{texture}** soil, measured pH **{ph}**, and **{om}% organic matter**, an alternating Rabi pulse/oilseed (Lentil, Mustard) followed by Kharif cereal (Aus, Aman Rice) provides the strongest balance of revenue and soil preservation.\n\n"
            f"### 2. EVIDENCE FROM THIS FIELD\n"
            f"- Soil Profile: **{texture}** with **{om}% OM**; measured pH **{ph}** is suitable for legumes and cereals.\n"
            f"- Hydrology: Seasonal irrigation capacity is **{irrig} mm**; NASA POWER ambient temp is **{temp}°C**.\n\n"
            f"### 3. RECOMMENDED NEXT STEP\n"
            f"Maintain strict botanical family alternation (Poaceae -> Fabaceae -> Brassicaceae) to break root-zone pathogen cycles and fix biological nitrogen.\n\n"
            f"### 4. TRADE-OFFS & RISKS\n"
            f"Under irrigation curtailment below {irrig} mm, substitute high-water Boro Rice with drought-hardy Wheat or Maize, or incorporate short-duration Mungbean.\n\n"
            f"### 5. DATA LIMITATIONS\n"
            f"This guidance is derived from the deterministic Bangladesh crop rules database (BARI/BRRI parameters). It serves as decision support, not an on-site laboratory soil test.\n\n"
            f"### 6. SUGGESTED FOLLOW-UP ACTION\n"
            f"Run the **3-Way Comparison Lab** or **Crop Failure Simulator** to stress-test your rotation under climate deficits."
        )

    res_dict = {
        "status": "ok",
        "reply": fallback_reply,
        "response": fallback_reply,
        "model": "offline-rule-based-guidance",
        "model_used": "deterministic_offline_agronomist",
        "is_fallback": True,
        "gemini_enabled": False,
    }
    if action_intent:
        res_dict["action_intent"] = action_intent
    return res_dict

@app.post("/api/assistant/chat")
def assistant_chat(payload: Payload):
    data = payload.model_dump()
    message = (data.get("message") or data.get("prompt") or "").strip()
    if not message:
        raise HTTPException(400, "Message cannot be empty.")
    history = data.get("history") or []
    context = data.get("context") or {}
    if "language" in data and "language" not in context:
        context["language"] = data["language"]
    return call_gemini_chat(message, history, context)

@app.post("/api/rl/decision")
def rl_decision(payload: Payload, fieldshift_session: str | None = Cookie(None), db: DbSession = Depends(get_db)):
    data = payload.model_dump()
    authorize_rl_field(data.get("field_id"), fieldshift_session, db)
    if data.get("season_index") == 0:
        raise HTTPException(422, "S1 is the MILP baseline; RL adaptive decisions begin at S2 after S1 completes.")
    experiment_context = validate_rl_decision_context(data)
    result = run_rl_step_payload(data)
    return finite_json_value(jsonable_encoder({
        "status": "ready",
        "decision": {
            "season_number": experiment_context["season_index"] + 1,
            "current_state": experiment_context["current_state"],
            "rl_proposed_action": result["rl_proposed_action"],
            "rl_policy_score": result["rl_policy_score"],
            "decision_reason": result["decision_reason"],
            "candidate_actions": result["candidate_actions"],
            "policy_label": result["policy_label"],
            "evidence_class": result["evidence_class"],
            "reward_configuration": result["reward_configuration"],
            "experiment_context": {
                "completed_season_count": len(experiment_context["completed_seasons"]),
                "prior_applied_crops": [
                    season["applied_action"] for season in experiment_context["completed_seasons"]
                ],
                "prior_outcomes": [
                    {
                        "season_id": season["season_id"],
                        "outcome": season["outcome"],
                    }
                    for season in experiment_context["completed_seasons"]
                ],
                "prior_interventions": experiment_context["interventions"],
                "milp_reference_crop": experiment_context["milp_reference_rotation"][experiment_context["season_index"]],
            },
            "provenance": {
                "temperature_source": experiment_context["current_state"].get("temperature_source", "unavailable"),
                "available_water_source": experiment_context["current_state"].get("available_water_source", "unavailable"),
                "soil_health_score_source": experiment_context["current_state"].get("soil_health_score_source", "unavailable"),
                "evidence_class": result["evidence_class"],
                "data_status": result["data_status"],
            },
        },
    }))

@app.post("/api/rl/baseline-execute")
def rl_baseline_execute(payload: Payload, fieldshift_session: str | None = Cookie(None), db: DbSession = Depends(get_db)):
    data = payload.model_dump()
    authorize_rl_field(data.get("field_id"), fieldshift_session, db)
    if data.get("season_index") != 0:
        raise HTTPException(422, "The MILP baseline can only execute as Season 1.")
    if data.get("completed_seasons") not in (None, []):
        raise HTTPException(422, "Season 1 cannot have prior experiment seasons.")
    rotation = data.get("milp_reference_rotation")
    if not isinstance(rotation, list) or len(rotation) != 6 or not isinstance(rotation[0], str) or not rotation[0]:
        raise HTTPException(422, "The selected MILP baseline must provide a six-season reference rotation.")
    validate_rl_decision_context(data)
    result = run_milp_baseline_step_payload(data, rotation[0])
    result["state_after_crop"]["season_id"] = "Y1_S2"
    result["season_id"] = "Y1_S1"
    result["season_number"] = 1
    result["state_after"] = None
    result["intervention"] = None
    return finite_json_value(jsonable_encoder({"status": "completed", "season": result}))

@app.post("/api/rl/execute")
def rl_execute(payload: Payload, fieldshift_session: str | None = Cookie(None), db: DbSession = Depends(get_db)):
    data = payload.model_dump()
    authorize_rl_field(data.get("field_id"), fieldshift_session, db)
    if data.get("season_index") == 0:
        raise HTTPException(422, "S1 must execute through the MILP baseline endpoint, not the RL policy.")
    validate_rl_decision_context(data)
    result = run_rl_step_payload(data)
    expected_action = data.get("expected_proposed_action")
    if expected_action and expected_action != result["rl_proposed_action"]:
        raise HTTPException(409, "The RL proposal changed; request a fresh decision before executing this season.")
    season_index = int(data.get("season_index"))
    next_season_id = (
        f"Y{(season_index + 1) // 2 + 1}_S{(season_index + 1) % 2 + 1}"
        if season_index < 5 else None
    )
    result["state_after_crop"]["season_id"] = next_season_id
    result["season_id"] = ["Y1_S1", "Y1_S2", "Y2_S1", "Y2_S2", "Y3_S1", "Y3_S2"][season_index]
    result["season_number"] = season_index + 1
    result["outcome"]["crop"] = result["applied_action"]
    result["state_after"] = None
    result["intervention"] = None
    return finite_json_value(jsonable_encoder({"status": "completed", "season": result}))

@app.post("/api/rl/intervene")
def rl_intervene(payload: Payload, fieldshift_session: str | None = Cookie(None), db: DbSession = Depends(get_db)):
    data = payload.model_dump()
    authorize_rl_field(data.get("field_id"), fieldshift_session, db)
    state = data.get("state")
    if not isinstance(state, dict):
        raise HTTPException(422, "state must be an object.")
    season_index = data.get("season_index")
    if isinstance(season_index, bool) or not isinstance(season_index, int) or not 0 <= season_index < 6:
        raise HTTPException(422, "season_index must be an integer from 0 through 5.")
    state_after, intervention = apply_rl_intervention(state, data.get("intervention"))
    state_after["season_id"] = (
        f"Y{(season_index + 1) // 2 + 1}_S{(season_index + 1) % 2 + 1}"
        if season_index < 5 else None
    )
    return finite_json_value(jsonable_encoder({
        "status": "updated",
        "state_after": state_after,
        "intervention": intervention,
    }))

@app.post("/api/rl/reoptimize")
def rl_reoptimize(payload: Payload, fieldshift_session: str | None = Cookie(None), db: DbSession = Depends(get_db)):
    data = payload.model_dump()
    final_state = data.get("final_state")
    if not isinstance(final_state, dict):
        raise HTTPException(422, "final_state must be an object.")
    field_id = data.get("field_id")
    field_record, user = authorize_rl_field(field_id, fieldshift_session, db)
    strategy_id = str(data.get("strategy_id") or "")
    rl_weights(strategy_id)
    trajectory = validate_rl_trajectory(data.get("rl_trajectory"), final_state, strategy_id)
    benchmark_id = data.get("benchmark_id")
    if benchmark_id is not None:
        strategy_key = {
            "profit_focused": "profit_focused",
            "water_efficiency": "water_focused",
            "soil_health": "soil_focused",
            "balanced": "balanced",
        }[strategy_id]
        try:
            from src.scenarios.benchmark_scenarios import run_benchmark_scenario

            benchmark_result = run_benchmark_scenario(
                str(benchmark_id),
                strategy_id=strategy_key,
                state_overrides={
                    "temperature_c": final_state.get("temperature_c"),
                    "soil_ph": final_state.get("soil_ph"),
                    "available_water_mm": final_state.get("available_water_mm"),
                    "previous_crop": final_state.get("previous_crop"),
                },
            )
        except ValueError as error:
            raise HTTPException(422, str(error)) from error
        except Exception as error:
            raise HTTPException(502, f"PuLP/CBC benchmark re-optimization failed: {error}") from error
        selected_plan = benchmark_result.get("strategies", {}).get(strategy_key)
        if not isinstance(selected_plan, dict):
            raise HTTPException(502, "PuLP/CBC benchmark re-optimization returned no selected strategy.")
        return finite_json_value(jsonable_encoder({
            "status": "ok",
            "summary": {
                "planning": {
                    "selected_strategy_result": selected_plan,
                },
            },
            "benchmark": benchmark_result,
            "rl_trajectory": trajectory,
            "reoptimization_handoff": {
                "final_state": final_state,
                "solver_inputs": [
                    "temperature_c",
                    "available_water_mm",
                    "soil_ph",
                    "previous_crop",
                ],
                "soil_health_proxy_consumed_as_constraint": False,
            },
        }))
    workflow_data = data.get("workflow_payload")
    if not isinstance(workflow_data, dict):
        raise HTTPException(422, "workflow_payload must be an object.")
    workflow_data = dict(workflow_data)
    if str(workflow_data.get("field_id")) != str(field_id):
        raise HTTPException(400, "workflow_payload field_id must match the authorized experiment field.")
    workflow_data["priority"] = {
        "profit_focused": "profit",
        "water_efficiency": "water_efficiency",
        "soil_health": "soil_health",
        "balanced": "balanced",
    }[strategy_id]
    for key, state_key in (
        ("temperature_c", "temperature_c"),
        ("available_water_mm", "available_water_mm"),
        ("soil_ph", "soil_ph"),
    ):
        value = final_state.get(state_key)
        if value is not None:
            workflow_data[key] = value
    if final_state.get("previous_crop"):
        workflow_data["simulation_previous_crop"] = final_state["previous_crop"]
    if field_record is not None:
        workflow_data = use_field_record(workflow_data, field_record, db)
    try:
        result = workflow_result(workflow_data, public_user(user) if user else None)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(502, f"PuLP/CBC re-optimization failed: {error}") from error
    result["rl_trajectory"] = trajectory
    result["reoptimization_handoff"] = {
        "final_state": final_state,
        "solver_inputs": [
            "temperature_c",
            "available_water_mm",
            "soil_ph",
            "previous_crop",
        ],
        "soil_health_proxy_consumed_as_constraint": False,
    }
    return finite_json_value(jsonable_encoder(result))

@app.get("/api/scenarios/benchmarks")
def benchmark_scenarios():
    from src.scenarios.benchmark_scenarios import get_benchmark_scenario_list
    return {"status": "ok", "scenarios": get_benchmark_scenario_list()}

@app.post("/api/scenarios/benchmark/run")
def run_benchmark(payload: Payload):
    from src.scenarios.benchmark_scenarios import run_benchmark_scenario, run_all_benchmark_scenarios
    data = payload.model_dump()
    scenario_id = data.get("scenario_id")
    if not scenario_id or str(scenario_id).lower() == "all":
        response = {"status": "ok", "results": run_all_benchmark_scenarios()}
    else:
        response = {"status": "ok", "result": run_benchmark_scenario(str(scenario_id).upper())}
    return finite_json_value(jsonable_encoder(response))

@app.get("/api/auth/me")
def me(response: Response, fieldshift_session: str | None = Cookie(None), db: DbSession = Depends(get_db)):
    try:
        user = require_user(fieldshift_session, db)
        if not fieldshift_session:
            token = secrets.token_urlsafe(32)
            stamp = now()
            db.add(LoginSession(user_id=user.id, token=token, created_at=stamp, expires_at=stamp + timedelta(days=7)))
            db.commit()
            set_auth_cookie(response, token)
        return {"status": "ok", "user": public_user(user)}
    except HTTPException:
        return {"status": "unauthenticated"}

@app.post("/api/auth/register", status_code=201)
def register(credentials: Credentials, response: Response, db: DbSession = Depends(get_db)):
    if not credentials.name or "@" not in credentials.email or len(credentials.password)<8: raise HTTPException(400,"name, valid email, and password of at least 8 characters are required.")
    stamp=now(); user=User(name=credentials.name.strip(),email=credentials.email.strip().lower(),password_hash=password_hash(credentials.password),is_active=True,created_at=stamp,updated_at=stamp)
    db.add(user)
    try: db.commit()
    except IntegrityError: db.rollback(); raise HTTPException(400,f"email already registered: {user.email}")
    db.refresh(user); token=secrets.token_urlsafe(32); db.add(LoginSession(user_id=user.id,token=token,created_at=stamp,expires_at=stamp+timedelta(days=7))); db.commit()
    set_auth_cookie(response, token)
    return {"status":"created","user":public_user(user)}

@app.post("/api/auth/login")
def login(credentials: Credentials, response: Response, db: DbSession = Depends(get_db)):
    user=db.scalar(select(User).where(User.email==credentials.email.strip().lower()))
    if not user or not user.is_active or not verify_password(credentials.password,user.password_hash): raise HTTPException(401,"Email or password is incorrect.")
    stamp=now(); user.last_login=stamp; user.updated_at=stamp; token=secrets.token_urlsafe(32); db.add(LoginSession(user_id=user.id,token=token,created_at=stamp,expires_at=stamp+timedelta(days=7))); db.commit()
    set_auth_cookie(response, token)
    return {"status":"ok","user":{"id":user.id,"name":user.name,"email":user.email}}

@app.post("/api/auth/logout")
def logout(response: Response, fieldshift_session: str | None = Cookie(None), db: DbSession = Depends(get_db)):
    item=db.scalar(select(LoginSession).where(LoginSession.token==fieldshift_session)) if fieldshift_session else None
    if item: db.delete(item); db.commit()
    clear_auth_cookie(response); return {"status":"ok"}

@app.put("/api/auth/profile")
def update_profile(payload: Payload, user: User = Depends(require_user), db: DbSession = Depends(get_db)):
    data = payload.model_dump()
    name = str(data.get("name", "")).strip()
    if name:
        user.name = name
    stamp = now()
    user.updated_at = stamp
    db.commit()
    db.refresh(user)
    return {"status": "ok", "user": public_user(user)}

@app.get("/api/farms")
def farms(user: User=Depends(require_user), db: DbSession=Depends(get_db)): return {"status":"ok","farms":[row(x) for x in db.scalars(select(Farm).where(Farm.user_id==user.id).order_by(Farm.id.desc()))]}
@app.post("/api/farms",status_code=201)
def create_farm(payload: Payload,user: User=Depends(require_user),db: DbSession=Depends(get_db)):
    name=str(payload.model_dump().get("name","")).strip()
    if not name: raise HTTPException(400,"name is required.")
    stamp=now(); farm=Farm(user_id=user.id,name=name,description=payload.model_dump().get("description") or None,created_at=stamp,updated_at=stamp);db.add(farm);db.commit();db.refresh(farm);return {"status":"created","farm":row(farm)}

@app.put("/api/farms/{farm_id}")
def update_farm(farm_id: int, payload: Payload, user: User = Depends(require_user), db: DbSession = Depends(get_db)):
    farm = owned_farm(db, farm_id, user)
    data = payload.model_dump()
    name = str(data.get("name", "")).strip()
    if name:
        farm.name = name
    if "description" in data:
        farm.description = str(data["description"]) if data["description"] else None
    stamp = now()
    farm.updated_at = stamp
    db.commit()
    db.refresh(farm)
    return {"status": "updated", "farm": row(farm)}
@app.get("/api/fields")
def fields(farm_id: int | None = None, user: User = Depends(require_user), db: DbSession = Depends(get_db)):
    if farm_id is not None:
        owned_farm(db, farm_id, user)
        items = list(db.scalars(select(FarmField).where(FarmField.farm_id == farm_id).order_by(FarmField.id.desc())))
    else:
        user_farm_ids = [f.id for f in db.scalars(select(Farm).where(Farm.user_id == user.id))]
        items = list(db.scalars(select(FarmField).where(FarmField.farm_id.in_(user_farm_ids)).order_by(FarmField.id.desc()))) if user_farm_ids else []
    
    result = []
    for fld in items:
        f_dict = row(fld)
        hist = [row(h) for h in db.scalars(select(FieldHistory).where(FieldHistory.field_id == fld.id).order_by(FieldHistory.year.desc(), FieldHistory.id.desc()))]
        f_dict["history"] = hist
        if hist:
            f_dict["previous_crop"] = hist[0].get("crop")
            f_dict["previous_crop_year"] = hist[0].get("year")
            f_dict["current_crop"] = hist[0].get("crop")
        last_anal = db.scalar(select(Analysis.created_at).where(Analysis.field_id == fld.id).order_by(Analysis.id.desc()))
        f_dict["last_analysis_date"] = last_anal.isoformat() if last_anal else None
        result.append(f_dict)
    return {"status": "ok", "fields": result}

@app.post("/api/fields", status_code=201)
def create_field(payload: Payload, user: User = Depends(require_user), db: DbSession = Depends(get_db)):
    data = payload.model_dump()
    farm_id = data.get("farm_id")
    if farm_id is None:
        first_farm = db.scalar(select(Farm).where(Farm.user_id == user.id).order_by(Farm.id.asc()))
        if not first_farm:
            stamp = now()
            first_farm = Farm(user_id=user.id, name="My Farm", description="Default user farm", created_at=stamp, updated_at=stamp)
            db.add(first_farm)
            db.commit()
            db.refresh(first_farm)
        farm_id = first_farm.id
    name = str(data.get("name", "")).strip()
    if not name: raise HTTPException(400, "name is required.")
    owned_farm(db, int(farm_id), user)
    lat = float(data["latitude"]) if data.get("latitude") not in (None, "") else None
    lon = float(data["longitude"]) if data.get("longitude") not in (None, "") else None
    if lat is not None and not (-90.0 <= lat <= 90.0):
        raise HTTPException(400, "Latitude must be between -90 and 90 degrees.")
    if lon is not None and not (-180.0 <= lon <= 180.0):
        raise HTTPException(400, "Longitude must be between -180 and 180 degrees.")
    area_ha = float(data["area_ha"]) if data.get("area_ha") not in (None, "") else None
    if area_ha is not None and area_ha <= 0:
        raise HTTPException(400, "Field area must be a positive number of hectares.")
    om = float(data["organic_matter"]) if data.get("organic_matter") not in (None, "") else None
    if om is not None and not (0.0 <= om <= 100.0):
        raise HTTPException(400, "Organic matter must be between 0 and 100 percent.")
    irrig = float(data["irrigation_capacity_mm"]) if data.get("irrigation_capacity_mm") not in (None, "") else None
    if irrig is not None and irrig < 0:
        raise HTTPException(400, "Irrigation capacity cannot be negative.")
    soil_ph_val = None
    raw_ph = data.get("soil_ph") if data.get("soil_ph") is not None else data.get("ph")
    if raw_ph not in (None, ""):
        soil_ph_val = float(raw_ph)
        if not (0.0 <= soil_ph_val <= 14.0):
            raise HTTPException(400, "Soil pH must be between 0 and 14.")
    stamp = now()
    field = FarmField(
        farm_id=int(farm_id),
        name=name,
        latitude=lat,
        longitude=lon,
        area_ha=area_ha,
        soil_texture=str(data["soil_texture"]) if data.get("soil_texture") else None,
        organic_matter=om,
        irrigation_capacity_mm=irrig,
        soil_ph=soil_ph_val,
        created_at=stamp,
        updated_at=stamp
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    crop = data.get("crop") or data.get("previous_crop") or data.get("current_crop")
    hist_list = []
    if crop:
        try: hist_year = int(data.get("previous_crop_year") or data.get("year") or 2025)
        except (ValueError, TypeError): hist_year = 2025
        hist = FieldHistory(field_id=field.id, crop=str(crop).strip(), season=data.get("season", "dry"), year=hist_year, notes=data.get("notes"), created_at=stamp)
        db.add(hist)
        db.commit()
        db.refresh(hist)
        hist_list = [row(hist)]
    f_dict = row(field)
    f_dict["history"] = hist_list
    if hist_list:
        f_dict["previous_crop"] = hist_list[0].get("crop")
        f_dict["previous_crop_year"] = hist_list[0].get("year")
        f_dict["current_crop"] = hist_list[0].get("crop")
    else:
        f_dict["previous_crop"] = None
        f_dict["previous_crop_year"] = None
        f_dict["current_crop"] = None
    f_dict["last_analysis_date"] = None
    return {"status": "created", "field": f_dict}

@app.put("/api/fields/{field_id}")
def update_field(field_id: int, payload: Payload, user: User = Depends(require_user), db: DbSession = Depends(get_db)):
    field = owned_field(db, field_id, user)
    data = payload.model_dump()
    if "name" in data and str(data["name"]).strip():
        field.name = str(data["name"]).strip()
    if "latitude" in data:
        if data["latitude"] not in (None, ""):
            lat = float(data["latitude"])
            if not (-90.0 <= lat <= 90.0):
                raise HTTPException(400, "Latitude must be between -90 and 90 degrees.")
            field.latitude = lat
        else:
            field.latitude = None
    if "longitude" in data:
        if data["longitude"] not in (None, ""):
            lon = float(data["longitude"])
            if not (-180.0 <= lon <= 180.0):
                raise HTTPException(400, "Longitude must be between -180 and 180 degrees.")
            field.longitude = lon
        else:
            field.longitude = None
    if "area_ha" in data:
        if data["area_ha"] not in (None, ""):
            area_ha = float(data["area_ha"])
            if area_ha <= 0:
                raise HTTPException(400, "Field area must be a positive number of hectares.")
            field.area_ha = area_ha
        else:
            field.area_ha = None
    if "soil_texture" in data:
        field.soil_texture = str(data["soil_texture"]) if data["soil_texture"] else None
    if "organic_matter" in data:
        if data["organic_matter"] not in (None, ""):
            om = float(data["organic_matter"])
            if not (0.0 <= om <= 100.0):
                raise HTTPException(400, "Organic matter must be between 0 and 100 percent.")
            field.organic_matter = om
        else:
            field.organic_matter = None
    if "irrigation_capacity_mm" in data:
        if data["irrigation_capacity_mm"] not in (None, ""):
            irrig = float(data["irrigation_capacity_mm"])
            if irrig < 0:
                raise HTTPException(400, "Irrigation capacity cannot be negative.")
            field.irrigation_capacity_mm = irrig
        else:
            field.irrigation_capacity_mm = None
    if "soil_ph" in data or "ph" in data:
        raw_ph = data.get("soil_ph") if "soil_ph" in data else data.get("ph")
        if raw_ph not in (None, ""):
            ph_val = float(raw_ph)
            if not (0.0 <= ph_val <= 14.0):
                raise HTTPException(400, "Soil pH must be between 0 and 14.")
            field.soil_ph = ph_val
        else:
            field.soil_ph = None
    stamp = now()
    field.updated_at = stamp
    crop = data.get("crop") or data.get("previous_crop") or data.get("current_crop")
    if crop:
        try: hist_year = int(data.get("previous_crop_year") or data.get("year") or 2025)
        except (ValueError, TypeError): hist_year = 2025
        existing_hist = db.scalar(select(FieldHistory).where(FieldHistory.field_id == field.id).order_by(FieldHistory.id.desc()))
        if existing_hist:
            existing_hist.crop = str(crop).strip()
            existing_hist.year = hist_year
            if data.get("season"): existing_hist.season = str(data["season"])
        else:
            db.add(FieldHistory(field_id=field.id, crop=str(crop).strip(), season=data.get("season", "dry"), year=hist_year, notes=data.get("notes"), created_at=stamp))
    db.commit()
    db.refresh(field)
    return {"status": "updated", "field": row(field)}

@app.delete("/api/fields/{field_id}")
def delete_field(field_id: int, user: User = Depends(require_user), db: DbSession = Depends(get_db)):
    field = owned_field(db, field_id, user)
    db.delete(field)
    db.commit()
    return {"status": "deleted", "id": field_id}

@app.get("/api/fields/{field_id}/history")
def field_history(field_id:int,user:User=Depends(require_user),db:DbSession=Depends(get_db)):
    owned_field(db,field_id,user)
    return {"status":"ok","history":[row(x) for x in db.scalars(select(FieldHistory).where(FieldHistory.field_id==field_id).order_by(FieldHistory.year,FieldHistory.id))]}

@app.post("/api/fields/{field_id}/history",status_code=201)
def create_field_history(field_id:int,payload:Payload,user:User=Depends(require_user),db:DbSession=Depends(get_db)):
    owned_field(db,field_id,user); data=payload.model_dump(); stamp=now()
    item=FieldHistory(field_id=field_id,crop=data.get("crop"),season=data.get("season"),year=data.get("year"),notes=data.get("notes"),created_at=stamp)
    db.add(item); db.commit(); db.refresh(item); return {"status":"created","history":row(item)}

@app.post("/api/analyses",status_code=201)
def create_analysis(payload:Payload,user:User=Depends(require_user),db:DbSession=Depends(get_db)):
    data=payload.model_dump(); field_id=data.get("field_id"); farm_id=data.get("farm_id")
    if field_id is not None:
        field=owned_field(db,int(field_id),user)
        if farm_id is None: farm_id=field.farm_id
    if farm_id is not None: owned_farm(db,int(farm_id),user)
    stamp=now(); item=Analysis(user_id=user.id,farm_id=farm_id,field_id=field_id,start_date=data.get("start_date"),end_date=data.get("end_date"),priority=data.get("priority"),season=data.get("season"),include_crop_history=bool(data.get("include_history",False)),mode=data.get("mode","offline"),status="pending",summary_json={"workflow_payload":data},created_at=stamp,updated_at=stamp)
    db.add(item); db.commit(); db.refresh(item); return {"status":"created","analysis":row(item)}

@app.post("/api/analyses/{analysis_id}/run")
def run_analysis(analysis_id:int,user:User=Depends(require_user),db:DbSession=Depends(get_db)):
    item=db.get(Analysis,analysis_id)
    if not item or item.user_id!=user.id: raise HTTPException(404,"Analysis not found or not owned by this user.")
    data=dict((item.summary_json or {}).get("workflow_payload") or {})
    if item.field_id is not None:
        field = owned_field(db, item.field_id, user)
        data = use_field_record(data, field, db)
    item.status="running"; item.started_at=now(); item.updated_at=now(); db.commit()
    try:
        result=workflow_result(data, {"id": user.id})
    except HTTPException as error:
        item.status="failed"; item.error_message=str(error.detail); item.completed_at=now(); item.updated_at=now(); db.commit(); raise
    item.status="completed"; item.summary_json={"workflow_payload":data,"result":result}; item.completed_at=now(); item.updated_at=now(); db.commit(); db.refresh(item)
    return {"status":"ok","analysis":row(item),"summary":result}

@app.get("/api/analyses")
def analyses(user:User=Depends(require_user),db:DbSession=Depends(get_db)):
    return {"status":"ok","analyses":[row(x) for x in db.scalars(select(Analysis).where(Analysis.user_id==user.id).order_by(Analysis.id.desc()))]}

# -----------------------------------------------------------------------------
# PHASE 4: PROVENANCE & RELIABILITY ENDPOINTS
# -----------------------------------------------------------------------------

@app.get("/api/provenance/summary")
def provenance_summary():
    """Returns system-wide data reliability score, provenance breakdown, and scientific disclaimer."""
    from src.data.provenance_schema import calculate_data_reliability_metrics
    return calculate_data_reliability_metrics()

@app.get("/api/provenance/registry")
def provenance_registry():
    """Returns comprehensive parameter provenance catalog across weather, crops, soil, and market."""
    from src.data.provenance_schema import build_system_parameter_registry
    records = build_system_parameter_registry()
    return {
        "count": len(records),
        "parameters": [r.to_dict() for r in records],
    }

# -----------------------------------------------------------------------------
# PHASE 4: SYNTHETIC DATA LAB ENDPOINTS
# -----------------------------------------------------------------------------

@app.post("/api/synthetic-data/generate")
def synthetic_data_generate(payload: Payload):
    """Deterministically generate synthetic farm scenarios based on seed and agronomic constraints."""
    from src.experiments.synthetic_data_lab import SyntheticLabConfig, generate_synthetic_farm_scenarios
    data = payload.model_dump()
    cfg = SyntheticLabConfig(
        seed=int(data.get("seed", 42)),
        num_scenarios=int(data.get("num_scenarios", 8)),
        area_min_ha=float(data.get("area_min_ha", 0.5)),
        area_max_ha=float(data.get("area_max_ha", 12.0)),
        ph_min=float(data.get("ph_min", 5.2)),
        ph_max=float(data.get("ph_max", 7.6)),
        om_min=float(data.get("om_min", 1.0)),
        om_max=float(data.get("om_max", 3.0)),
        irrigation_min_mm=float(data.get("irrigation_min_mm", 100.0)),
        irrigation_max_mm=float(data.get("irrigation_max_mm", 800.0)),
        assumption_profile=str(data.get("assumption_profile", "standard")),
        include_stress_scenarios=bool(data.get("include_stress_scenarios", True)),
    )
    return generate_synthetic_farm_scenarios(cfg)

@app.post("/api/synthetic-data/export")
def synthetic_data_export(payload: Payload):
    """Export generated synthetic scenarios as a downloadable CSV with full metadata headers."""
    from src.experiments.synthetic_data_lab import SyntheticLabConfig, generate_synthetic_farm_scenarios, export_synthetic_scenarios_csv
    data = payload.model_dump()
    cfg = SyntheticLabConfig(
        seed=int(data.get("seed", 42)),
        num_scenarios=int(data.get("num_scenarios", 8)),
        area_min_ha=float(data.get("area_min_ha", 0.5)),
        area_max_ha=float(data.get("area_max_ha", 12.0)),
        assumption_profile=str(data.get("assumption_profile", "standard")),
    )
    gen = generate_synthetic_farm_scenarios(cfg)
    csv_content = export_synthetic_scenarios_csv(gen["scenarios"], cfg)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=fieldshift_synthetic_scenarios_seed{cfg.seed}.csv"}
    )

# -----------------------------------------------------------------------------
# PHASE 6: MARKET INTELLIGENCE & PROFITABILITY ENDPOINTS
# -----------------------------------------------------------------------------

@app.get("/api/market/overview")
def market_overview(q: str | None = None):
    """Returns verified Bangladesh crop pricing catalog, official source links, and honest demand status."""
    from src.data.market_intelligence import get_market_overview
    return get_market_overview(crop_query=q)

@app.post("/api/market/profitability")
def market_profitability(payload: Payload):
    """Calculates crop profitability, cost breakdown, net returns, break-even price, and 3-point scenarios."""
    from src.data.market_intelligence import calculate_crop_profitability
    data = payload.model_dump()
    crop_name = data.get("crop") or data.get("crop_name") or "Rice"
    area_ha = float(data.get("area_ha") or data.get("field_size_ha") or 1.0)
    expected_yield = data.get("expected_yield_t_ha")
    if expected_yield is not None:
        expected_yield = float(expected_yield)
    farmgate_price = data.get("farmgate_price_bdt_t")
    if farmgate_price is not None:
        farmgate_price = float(farmgate_price)
    prod_cost = data.get("production_cost_bdt_ha")
    if prod_cost is not None:
        prod_cost = float(prod_cost)
    irrig_cost = float(data.get("irrigation_cost_bdt_ha", 0.0) or 0.0)
    mktg_cost = float(data.get("marketing_cost_bdt_ha", 0.0) or 0.0)
    price_type = str(data.get("price_type", "farmgate"))

    try:
        return calculate_crop_profitability(
            crop_name=crop_name,
            area_ha=area_ha,
            expected_yield_t_ha=expected_yield,
            farmgate_price_bdt_t=farmgate_price,
            production_cost_bdt_ha=prod_cost,
            irrigation_cost_bdt_ha=irrig_cost,
            marketing_cost_bdt_ha=mktg_cost,
            price_type=price_type,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e

@app.get("/api/market/export")
def market_export():
    """Export Bangladesh benchmark prices to CSV with citations and disclaimers."""
    from src.data.market_intelligence import export_market_catalog_csv
    csv_content = export_market_catalog_csv()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=fieldshift_market_benchmarks.csv"}
    )

# -----------------------------------------------------------------------------
# PHASE 5: REPEATABLE SENSITIVITY ANALYSIS ENDPOINT
# -----------------------------------------------------------------------------

@app.post("/api/scenarios/sensitivity")
def scenarios_sensitivity(payload: Payload, fieldshift_session: str | None = Cookie(None), db: DbSession = Depends(get_db)):
    """Run controlled multi-variable sensitivity sweeps on MILP optimization without mutating baseline field."""
    from src.scenarios.sensitivity_analysis import run_system_sensitivity_analysis
    data = payload.model_dump()
    requested_field_id = data.get("field_id")
    user = None
    if fieldshift_session:
        try:
            user = require_user(fieldshift_session, db)
        except HTTPException:
            user = None

    if requested_field_id not in (None, "", "demo"):
        if user is None:
            raise HTTPException(401, "Sign in to run sensitivity analysis on a registered field.")
        fid = int(requested_field_id)
        field_record = owned_field(db, fid, user)
        data = use_field_record(data, field_record, db)

    steps = data.get("perturbation_steps")
    if steps and isinstance(steps, list):
        steps = [float(s) for s in steps]
    else:
        steps = [-20.0, -10.0, 10.0, 20.0]

    return run_system_sensitivity_analysis(data, perturbation_steps=steps)


# -----------------------------------------------------------------------------
# FRONTEND SPA STATIC MOUNT & CATCH-ALL ROUTE (ALL-IN-ONE SINGLE URL)
# -----------------------------------------------------------------------------

FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    def serve_frontend_root():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend_spa(full_path: str):
        # Allow API endpoints, Swagger, and OpenAPI docs through
        if (
            full_path == "api"
            or full_path.startswith("api/")
            or full_path in ("docs", "redoc", "openapi.json")
            or full_path.startswith("docs/")
            or full_path.startswith("redoc/")
        ):
            raise HTTPException(404, "Endpoint not found")
        file_path = FRONTEND_DIST / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")




