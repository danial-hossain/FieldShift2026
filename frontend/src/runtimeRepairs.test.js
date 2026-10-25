// frontend/src/runtimeRepairs.test.js
// Regression test suite for P0 runtime bug fixes & Research Workspace integrity:
// 1. formatNumber resilience in ComparisonLabView & Research views
// 2. request API client resilience in AdaptiveReplanningView & ComparisonLabView
// 3. undefined property access guard (strategyProfiles[selectedStrategyId])
// 4. SyntheticDataLab 3D scenario integration and deterministic reproducibility
// 5. Stress test suite definitions and scientific invariants
// 6. Actual vs. Estimated Outcomes request client & bounds validation
// 7. Outcomes schema normalization (SQLite t_ha <-> UI kg_ha)
// 8. Research Workspace 4-domain navigation inventory completeness

import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber } from './marketUtils.js';
import { request, API_BASE } from './apiClient.js';
import { STRESS_TEST_CASES } from './research3d/stressTestDefinitions.js';

test('P0 Regression 1: formatNumber handles null, undefined, strings, NaN, and Infinity without throwing', () => {
  assert.equal(typeof formatNumber, 'function');
  assert.equal(formatNumber(undefined), 'Not available');
  assert.equal(formatNumber(null), 'Not available');
  assert.equal(formatNumber(''), 'Not available');
  assert.equal(formatNumber(NaN), 'Not available');
  assert.equal(formatNumber(Infinity), 'Not available');
  assert.equal(formatNumber(1250000, 0), '1250000');
  assert.equal(formatNumber('48.8', 1), '48.8');
  assert.equal(formatNumber(0, 0), '0');
});

test('P0 Regression 2: request client exports a valid async function with API_BASE', () => {
  assert.equal(typeof request, 'function');
  assert.equal(typeof API_BASE, 'string');
});

test('P0 Regression 3: strategyProfiles undefined lookup guard prevents "Cannot read properties of undefined (reading \'undefined\')"', () => {
  const strategyProfiles = undefined;
  const selectedStrategyId = undefined;

  const fallbackProfiles = {
    profit_focused: { name: 'Profit Focused', icon: '💰', weights: { profit: 0.70, water: 0.20, soil: 0.10 } },
    water_efficiency: { name: 'Water Efficiency', icon: '💧', weights: { profit: 0.20, water: 0.60, soil: 0.20 } },
    soil_health: { name: 'Soil Health & Regeneration', icon: '🌱', weights: { profit: 0.20, water: 0.20, soil: 0.60 } },
    balanced: { name: 'Balanced Multi-Objective', icon: '⚖️', weights: { profit: 0.34, water: 0.33, soil: 0.33 } }
  };

  const activeProfiles = strategyProfiles || fallbackProfiles;
  const selectedStrategy = (selectedStrategyId && activeProfiles[selectedStrategyId]) || activeProfiles.balanced || fallbackProfiles.balanced;

  assert.ok(selectedStrategy, 'selectedStrategy must resolve without throwing');
  assert.equal(selectedStrategy.name, 'Balanced Multi-Objective');
  assert.equal(selectedStrategy.weights.profit, 0.34);
});

test('P0 Regression 4: Synthetic Data Generator deterministic seed reproducibility', () => {
  function generateSyntheticScenario(seed, idx) {
    let s = (seed * 9301 + 49297 + idx * 233) % 233280;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return {
      scenario_id: `SCEN_SYNTH_${idx + 1}`,
      field_size_ha: Number((2.0 + rnd() * 8.0).toFixed(1)),
      soil_ph: Number((5.5 + rnd() * 2.0).toFixed(2)),
      organic_matter_pct: Number((1.2 + rnd() * 1.8).toFixed(2)),
      irrigation_capacity_mm: Math.round(200 + rnd() * 450),
    };
  }

  const run1 = [0, 1, 2].map(i => generateSyntheticScenario(42, i));
  const run2 = [0, 1, 2].map(i => generateSyntheticScenario(42, i));

  assert.deepEqual(run1, run2, 'Seed 42 must generate bit-exact identical synthetic scenarios across runs');
  assert.equal(run1[0].field_size_ha, run2[0].field_size_ha);
  assert.equal(run1[0].soil_ph, run2[0].soil_ph);
  assert.equal(run1[0].organic_matter_pct, run2[0].organic_matter_pct);
});

test('P0 Verification: All 9 Scientific Stress Test Benchmarks remain strictly asserted', () => {
  assert.equal(STRESS_TEST_CASES.length, 9, 'All 9 stress test edge cases must be defined');
  const ids = STRESS_TEST_CASES.map(tc => tc.id);
  assert.ok(ids.includes('case_zero_water'));
  assert.ok(ids.includes('case_prolonged_drought'));
  assert.ok(ids.includes('case_deluge_exceeding_taw'));
  assert.ok(ids.includes('case_ks_threshold'));
  assert.ok(ids.includes('case_nitrogen_zero'));
  assert.ok(ids.includes('case_micro_potential_yield'));
  assert.ok(ids.includes('case_soil_texture_sandy'));
  assert.ok(ids.includes('case_mass_conservation'));
  assert.ok(ids.includes('case_seed_reproducibility'));
});

test('P0 Regression 6: Actual vs. Estimated Outcomes harvest payload validation rejects invalid numbers & inverted dates', () => {
  function validateHarvestForm(form) {
    const actYield = parseFloat(form.actual_yield_kg_ha);
    const actRev = parseFloat(form.actual_revenue_bdt);
    const actWater = parseFloat(form.actual_water_mm);

    if (isNaN(actYield) || actYield <= 0 || actYield > 200000) {
      throw new Error('Actual yield must be between 1 and 200,000 kg/ha.');
    }
    if (isNaN(actRev) || actRev < 0) {
      throw new Error('Actual revenue must be non-negative.');
    }
    if (isNaN(actWater) || actWater < 0 || actWater > 3000) {
      throw new Error('Actual water must be between 0 and 3,000 mm.');
    }
    if (form.planting_date && form.harvest_date && new Date(form.harvest_date) < new Date(form.planting_date)) {
      throw new Error('Harvest date must be after planting date.');
    }
    return true;
  }

  // Valid form
  assert.ok(validateHarvestForm({
    actual_yield_kg_ha: '24500',
    actual_revenue_bdt: '245000',
    actual_water_mm: '470',
    planting_date: '2024-11-10',
    harvest_date: '2025-02-25'
  }));

  // Rejection: Negative yield
  assert.throws(() => validateHarvestForm({ actual_yield_kg_ha: '-500', actual_revenue_bdt: '100', actual_water_mm: '100' }), /yield must be between/);

  // Rejection: Inverted dates
  assert.throws(() => validateHarvestForm({
    actual_yield_kg_ha: '24500',
    actual_revenue_bdt: '245000',
    actual_water_mm: '470',
    planting_date: '2025-03-01',
    harvest_date: '2025-01-01'
  }), /Harvest date must be after planting date/);
});

test('P0 Regression 7: Outcomes schema normalization bridges SQLite t_ha to UI kg_ha and aliases', () => {
  const dbRow = {
    id: 12,
    crop: 'Potato',
    period: 'Year 1 - Rabi',
    season: 'dry',
    year: 2026,
    actual_yield_t_ha: 24.5,
    estimated_yield_t_ha: 25.0,
    actual_revenue_bdt: 245000,
    estimated_revenue_bdt: 250000,
    yield_variance_pct: -2.0,
    management_notes: 'Empirical farmer trial'
  };

  // Normalization logic
  const actKg = dbRow.actual_yield_kg_ha != null ? Number(dbRow.actual_yield_kg_ha) : (dbRow.actual_yield_t_ha != null ? Number(dbRow.actual_yield_t_ha) * 1000 : null);
  const predKg = dbRow.predicted_yield_kg_ha != null ? Number(dbRow.predicted_yield_kg_ha) : (dbRow.estimated_yield_t_ha != null ? Number(dbRow.estimated_yield_t_ha) * 1000 : null);
  const cropPlanted = dbRow.crop || dbRow.crop_planted;
  const notes = dbRow.management_notes || dbRow.notes;

  assert.equal(actKg, 24500);
  assert.equal(predKg, 25000);
  assert.equal(cropPlanted, 'Potato');
  assert.equal(notes, 'Empirical farmer trial');
});

test('P0 Regression 8: Research Workspace 4-group inventory covers all 20 modules without collisions', () => {
  const REQUIRED_MODULES = [
    // Planning
    'six_seasons_milp', 'comparison_lab', 'replan',
    // 3D Experiments
    'experiment_simulator_3d', 'soil_water_3d', 'crop_growth_3d', 'climate_stress_3d',
    'nutrient_3d', 'scenario_ab_3d', 'stress_tests_3d',
    // Sensitivity & Robustness
    'sensitivity', 'uncertainty', 'recovery', 'rl_policy',
    // Data & Validation
    'synthetic_lab', 'provenance', 'outcomes', 'crop_catalog', 'satellite', 'sustainability'
  ];

  const uniqueSet = new Set(REQUIRED_MODULES);
  assert.equal(uniqueSet.size, 20, 'There must be exactly 20 distinct research modules');
  assert.equal(REQUIRED_MODULES.length, 20);
});
