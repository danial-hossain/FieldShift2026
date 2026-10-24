-- Migration: 0002_add_soil_ph.sql
-- Add soil_ph column to fields table for persistent soil chemistry observations.
ALTER TABLE fields ADD COLUMN IF NOT EXISTS soil_ph DOUBLE PRECISION;
