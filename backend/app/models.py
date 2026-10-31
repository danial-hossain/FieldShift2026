from __future__ import annotations

from datetime import datetime
from typing import Any
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class Timestamped:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class User(Timestamped, Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

class Farm(Timestamped, Base):
    __tablename__ = "farms"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

class Field(Timestamped, Base):
    __tablename__ = "fields"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    area_ha: Mapped[float | None] = mapped_column(Float)
    soil_texture: Mapped[str | None] = mapped_column(String)
    organic_matter: Mapped[float | None] = mapped_column(Float)
    irrigation_capacity_mm: Mapped[float | None] = mapped_column(Float)
    soil_ph: Mapped[float | None] = mapped_column(Float)
    district: Mapped[str | None] = mapped_column(String, nullable=True)
    seasonally_flooded: Mapped[bool | None] = mapped_column(Boolean, default=False, nullable=True)
    nearest_district_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    power_cell: Mapped[str | None] = mapped_column(String, nullable=True)
    imerg_cell: Mapped[str | None] = mapped_column(String, nullable=True)
    soilgrids_soil: Mapped[str | None] = mapped_column(String, nullable=True)

class FieldHistory(Base):
    __tablename__ = "field_history"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id", ondelete="CASCADE"), nullable=False, index=True)
    crop: Mapped[str | None] = mapped_column(String)
    season: Mapped[str | None] = mapped_column(String)
    year: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class Analysis(Timestamped, Base):
    __tablename__ = "analyses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    farm_id: Mapped[int | None] = mapped_column(ForeignKey("farms.id", ondelete="SET NULL"))
    field_id: Mapped[int | None] = mapped_column(ForeignKey("fields.id", ondelete="SET NULL"))
    start_date: Mapped[str | None] = mapped_column(String)
    end_date: Mapped[str | None] = mapped_column(String)
    priority: Mapped[str | None] = mapped_column(String)
    season: Mapped[str | None] = mapped_column(String)
    include_crop_history: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mode: Mapped[str | None] = mapped_column(String, default="offline")
    status: Mapped[str] = mapped_column(String, default="pending", nullable=False)
    summary_json: Mapped[dict[str, Any] | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)

class FarmOutcome(Base):
    __tablename__ = "farm_outcomes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    period: Mapped[str | None] = mapped_column(String)
    season: Mapped[str | None] = mapped_column(String)
    year: Mapped[int | None] = mapped_column(Integer)
    crop: Mapped[str] = mapped_column(String, nullable=False)
    planting_date: Mapped[str | None] = mapped_column(String)
    harvest_date: Mapped[str | None] = mapped_column(String)
    actual_yield_t_ha: Mapped[float | None] = mapped_column(Float)
    actual_revenue_bdt: Mapped[float | None] = mapped_column(Float)
    actual_cost_bdt: Mapped[float | None] = mapped_column(Float)
    actual_water_mm: Mapped[float | None] = mapped_column(Float)
    estimated_yield_t_ha: Mapped[float | None] = mapped_column(Float)
    estimated_revenue_bdt: Mapped[float | None] = mapped_column(Float)
    estimated_water_mm: Mapped[float | None] = mapped_column(Float)
    yield_variance_pct: Mapped[float | None] = mapped_column(Float)
    revenue_variance_pct: Mapped[float | None] = mapped_column(Float)
    water_variance_pct: Mapped[float | None] = mapped_column(Float)
    management_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class WeatherSnapshot(Base):
    __tablename__ = "weather_snapshots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_run_id: Mapped[str | None] = mapped_column(String, index=True)
    source: Mapped[str | None] = mapped_column(String)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    date: Mapped[str | None] = mapped_column(String)
    temperature: Mapped[float | None] = mapped_column(Float)
    rainfall: Mapped[float | None] = mapped_column(Float)
    soil_moisture: Mapped[float | None] = mapped_column(Float)
    other_variables: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class MLResult(Base):
    __tablename__ = "ml_results"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_run_id: Mapped[str | None] = mapped_column(String, index=True)
    prediction: Mapped[float | None] = mapped_column(Float)
    model_name: Mapped[str | None] = mapped_column(String)
    model_version: Mapped[str | None] = mapped_column(String)
    metrics: Mapped[dict[str, Any] | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    features_used: Mapped[dict[str, Any] | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    research_boundary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class RotationPlan(Base):
    __tablename__ = "rotation_plans"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_run_id: Mapped[str | None] = mapped_column(String, index=True)
    optimization_status: Mapped[str | None] = mapped_column(String)
    crop_sequence: Mapped[Any | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    objective_value: Mapped[float | None] = mapped_column(Float)
    constraints_summary: Mapped[dict[str, Any] | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class AdaptiveAction(Base):
    __tablename__ = "adaptive_actions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_run_id: Mapped[str | None] = mapped_column(String, index=True)
    action: Mapped[str | None] = mapped_column(String)
    action_type: Mapped[str | None] = mapped_column(String)
    reward: Mapped[float | None] = mapped_column(Float)
    safety_status: Mapped[str | None] = mapped_column(String)
    state_before: Mapped[dict[str, Any] | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    state_after: Mapped[dict[str, Any] | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class ValidationResult(Base):
    __tablename__ = "validation_results"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_run_id: Mapped[str | None] = mapped_column(String, index=True)
    validation_type: Mapped[str | None] = mapped_column(String)
    status: Mapped[str | None] = mapped_column(String)
    message: Mapped[str | None] = mapped_column(Text)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class ProvenanceRecord(Base):
    __tablename__ = "provenance_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_run_id: Mapped[str | None] = mapped_column(String, index=True)
    source: Mapped[str | None] = mapped_column(String)
    source_type: Mapped[str | None] = mapped_column(String)
    mode: Mapped[str | None] = mapped_column(String)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON().with_variant(JSONB, "postgresql"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class ExperimentRun(Timestamped, Base):
    __tablename__ = "experiment_runs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    experiment_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    field_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String, nullable=False)
    profile_json: Mapped[dict[str, Any]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    model_version: Mapped[str] = mapped_column(String, nullable=False)
    baseline_json: Mapped[dict[str, Any]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    ovat_sensitivity_json: Mapped[list[Any]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    interaction_json: Mapped[dict[str, Any]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    invariants_json: Mapped[list[Any]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    data_status: Mapped[str] = mapped_column(String, default="SYNTHETIC_TEST_DATA", nullable=False)
