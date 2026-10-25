"""
tests/test_supabase_postgres_integration.py
Comprehensive test suite for Supabase PostgreSQL migration and integration in FieldShift 2026.

Verifies:
1. Database URL normalization and driver adaptation (psycopg3, PgBouncer pooler).
2. Schema migrations runner and idempotence.
3. Field CRUD operations against PostgreSQL.
4. Harvest outcome recording and variance calculations.
5. Adaptive replanning integration with recorded field and harvest data.
6. Database error handling and transaction rollback.
7. Referential integrity and field association.
"""

from __future__ import annotations

import os
import unittest
from datetime import datetime, timezone
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session as DbSession

from backend.app.database import (
    DEFAULT_SQLITE_URL,
    Base,
    engine,
    get_db,
    is_postgres,
    normalize_database_url,
)
from backend.app.models import Analysis, Farm, Field as FarmField, FieldHistory, FarmOutcome, User
from backend.run_migrations import run_migrations
from src.data.outcome_tracker import list_actual_outcomes, record_actual_outcome
from src.optimizer.adaptive_replan import run_adaptive_replan
from src.state.field_state import build_field_state
from src.data.crops import load_crop_knowledge
from src.preprocessing.features import build_features
from src.experiments.integrated_research_demo import DEFAULT_NASA_PATH
import pandas as pd


class DatabaseUrlNormalizationTest(unittest.TestCase):
    """Verify safe PostgreSQL and PgBouncer URL transformations."""

    def test_standard_postgresql_scheme_adapted_to_psycopg(self):
        url = "postgresql://user:secret@db.example.supabase.co:5432/postgres"
        norm, args = normalize_database_url(url)
        self.assertTrue(norm.startswith("postgresql+psycopg://"))
        self.assertIn("user:secret", norm)
        self.assertNotIn("***", norm)

    def test_legacy_postgres_scheme_adapted_to_psycopg(self):
        url = "postgres://user:pass123@aws-0.pooler.supabase.com:5432/postgres"
        norm, args = normalize_database_url(url)
        self.assertTrue(norm.startswith("postgresql+psycopg://"))
        self.assertIn("user:pass123", norm)

    def test_transaction_pooler_disables_prepared_statements(self):
        # PgBouncer on port 6543
        url = "postgresql://postgres.proj:secret@aws-0.pooler.supabase.com:6543/postgres?pgbouncer=true"
        norm, args = normalize_database_url(url)
        self.assertIn("prepare_threshold", args)
        self.assertIsNone(args["prepare_threshold"])


class SupabasePostgresIntegrationTest(unittest.TestCase):
    """Integration test suite executed against active database engine."""

    @classmethod
    def setUpClass(cls):
        cls.is_pg = is_postgres()
        cls.test_user_id = None
        cls.test_farm_id = None
        cls.created_field_ids = []

        # Create test user and farm fixtures
        with DbSession(engine) as session:
            test_user = session.scalar(
                select(User).where(User.email == "supabase-test-runner@fieldshift.internal")
            )
            if not test_user:
                test_user = User(
                    name="Supabase Test Runner",
                    email="supabase-test-runner@fieldshift.internal",
                    password_hash="pbkdf2_sha256$test$hash",
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                session.add(test_user)
                session.commit()
                session.refresh(test_user)
            cls.test_user_id = test_user.id

            test_farm = session.scalar(
                select(Farm).where(Farm.user_id == cls.test_user_id)
            )
            if not test_farm:
                test_farm = Farm(
                    user_id=cls.test_user_id,
                    name="Supabase Test Station (Bogura)",
                    description="Automated CI test parcel for Supabase migration",
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                session.add(test_farm)
                session.commit()
                session.refresh(test_farm)
            cls.test_farm_id = test_farm.id

    @classmethod
    def tearDownClass(cls):
        """Clean up test fixtures created during the test run."""
        try:
            with DbSession(engine) as session:
                for fid in cls.created_field_ids:
                    # Clean up child records referencing fid first
                    session.query(FarmOutcome).filter(FarmOutcome.field_id == fid).delete(synchronize_session=False)
                    session.query(FieldHistory).filter(FieldHistory.field_id == fid).delete(synchronize_session=False)
                    session.query(Analysis).filter(Analysis.field_id == fid).delete(synchronize_session=False)
                    fld = session.get(FarmField, fid)
                    if fld:
                        session.delete(fld)
                session.commit()
        except Exception:
            pass

    def test_01_migrations_idempotence(self):
        """Verify that running migrations repeatedly is safe and idempotent."""
        if not self.is_pg:
            self.skipTest("Migrations test requires PostgreSQL target.")
        applied = run_migrations()
        self.assertEqual(len(applied), 0, "Idempotent migration run must apply 0 new migrations.")

    def test_02_field_crud_lifecycle(self):
        """Create, read, update, and list field in database."""
        with DbSession(engine) as session:
            # Create
            field = FarmField(
                farm_id=self.test_farm_id,
                name="Supabase Verification Parcel #1",
                latitude=24.8465,
                longitude=89.3777,
                area_ha=12.5,
                soil_texture="silt_loam",
                organic_matter=2.1,
                irrigation_capacity_mm=380.0,
                soil_ph=6.55,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            session.add(field)
            session.commit()
            session.refresh(field)

            field_id = field.id
            self.created_field_ids.append(field_id)
            self.assertIsNotNone(field_id)

            # Read
            loaded = session.get(FarmField, field_id)
            self.assertIsNotNone(loaded)
            self.assertEqual(loaded.name, "Supabase Verification Parcel #1")
            self.assertEqual(loaded.soil_ph, 6.55)
            self.assertEqual(loaded.area_ha, 12.5)

            # Update
            loaded.soil_ph = 6.80
            loaded.irrigation_capacity_mm = 420.0
            session.commit()

            reloaded = session.get(FarmField, field_id)
            self.assertEqual(reloaded.soil_ph, 6.80)
            self.assertEqual(reloaded.irrigation_capacity_mm, 420.0)

    def test_03_harvest_outcome_persistence_and_variance(self):
        """Record seasonal harvest outcome and verify variance calculation & retrieval."""
        test_field_id = self.created_field_ids[0] if self.created_field_ids else 1

        payload = {
            "crop": "Lentil",
            "period": "Y1_S1",
            "season": "dry",
            "year": 2026,
            "actual_yield_t_ha": 1.45,
            "estimated_yield_t_ha": 1.50,
            "actual_revenue_bdt": 145000.0,
            "estimated_revenue_bdt": 150000.0,
            "actual_water_mm": 210.0,
            "estimated_water_mm": 200.0,
            "notes": "Verified Supabase outcome logging",
        }

        outcome = record_actual_outcome(test_field_id, payload, user_id=self.test_user_id)
        self.assertEqual(outcome["status"], "created")
        self.assertIsNotNone(outcome["id"])
        self.assertAlmostEqual(outcome["yield_variance_pct"], -3.3, places=1)
        self.assertAlmostEqual(outcome["water_variance_pct"], 5.0, places=1)

        # Retrieve
        outcomes = list_actual_outcomes(test_field_id)
        self.assertGreaterEqual(len(outcomes), 1)
        matched = [o for o in outcomes if o["id"] == outcome["id"]]
        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0]["crop"], "Lentil")
        self.assertAlmostEqual(matched[0]["actual_yield_t_ha"], 1.45)

    def test_04_adaptive_replanning_from_saved_records(self):
        """Execute adaptive replanning utilizing field data and observed outcome."""
        test_field_id = self.created_field_ids[0] if self.created_field_ids else 1

        power = pd.read_csv(DEFAULT_NASA_PATH)
        power["date"] = pd.to_datetime(power["date"])
        crops_df = load_crop_knowledge()
        state = build_field_state(str(test_field_id), 24.8465, 89.3777, power["date"].max(), power, crop_knowledge=crops_df)
        state.field_size_ha = 10.0
        state.area_ha = 10.0
        features = build_features(state, environmental_history=power)

        completed_seasons = [
            {
                "period": "Y1_S1",
                "season": "dry",
                "year": 2026,
                "crop": "Lentil",
                "actual_yield_t_ha": 1.45,
                "actual_revenue_bdt": 145000.0,
                "actual_water_mm": 210.0,
            }
        ]

        replan_result = run_adaptive_replan(
            state, power, completed_seasons, priority="balanced", crops=crops_df, features=features
        )
        self.assertEqual(replan_result["completed_seasons_count"], 1)
        self.assertEqual(replan_result["remaining_seasons_count"], 5)
        self.assertEqual(len(replan_result["replanned_schedule"]), 5)
        self.assertIn("rotations", replan_result)
        self.assertIn("adaptive_replan", replan_result["rotations"])

    def test_05_transaction_rollback_on_failure(self):
        """Verify transaction rollback prevents orphaned records on constraint violation."""
        with self.assertRaises(Exception):
            with DbSession(engine) as session:
                # Attempt to create farm for non-existent user ID
                bad_farm = Farm(
                    user_id=999999999,
                    name="Invalid Orphan Farm",
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                session.add(bad_farm)
                session.commit()

        # Verify no orphan farm was committed
        with DbSession(engine) as session:
            orphan = session.scalar(select(Farm).where(Farm.name == "Invalid Orphan Farm"))
            self.assertIsNone(orphan)


if __name__ == "__main__":
    unittest.main()
