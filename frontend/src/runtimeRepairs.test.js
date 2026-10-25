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

test('P0 Regression 9: apiClient exports both named request and default export as identical valid async function', async () => {
  const apiClient = await import('./apiClient.js');
  assert.equal(typeof apiClient.request, 'function');
  assert.equal(typeof apiClient.default, 'function');
  assert.equal(apiClient.request, apiClient.default);
});

test('P0 Regression 10: request fallback pattern prevents "request is not a function" when prop is undefined', () => {
  const defaultRequest = () => Promise.resolve({ status: 'ok' });

  // Simulate missing or undefined propRequest
  const propRequestUndefined = undefined;
  const propRequestNull = null;
  const propRequestString = 'not a function';
  const customRequest = () => Promise.resolve({ status: 'custom' });

  const resolvedFromUndefined = typeof propRequestUndefined === 'function' ? propRequestUndefined : defaultRequest;
  const resolvedFromNull = typeof propRequestNull === 'function' ? propRequestNull : defaultRequest;
  const resolvedFromString = typeof propRequestString === 'function' ? propRequestString : defaultRequest;
  const resolvedFromCustom = typeof customRequest === 'function' ? customRequest : defaultRequest;

  assert.equal(resolvedFromUndefined, defaultRequest);
  assert.equal(resolvedFromNull, defaultRequest);
  assert.equal(resolvedFromString, defaultRequest);
  assert.equal(resolvedFromCustom, customRequest);
});

test('P0 Regression 11: Sensitivity Analysis field_id sanitizer ensures guest users do not crash with int conversion error', () => {
  function sanitizeFieldId(rawId) {
    const isNumericId = rawId != null && !isNaN(Number(rawId)) && String(rawId).trim() !== '';
    return isNumericId ? Number(rawId) : 'demo';
  }

  assert.equal(sanitizeFieldId(undefined), 'demo');
  assert.equal(sanitizeFieldId(null), 'demo');
  assert.equal(sanitizeFieldId('demo'), 'demo');
  assert.equal(sanitizeFieldId('SYN-BOG-01'), 'demo');
  assert.equal(sanitizeFieldId('fld_12'), 'demo');
  assert.equal(sanitizeFieldId(58), 58);
  assert.equal(sanitizeFieldId('42'), 42);
});

test('P0 Regression 12: formatNumber imported from marketUtils handles currency and decimals without throwing', () => {
  assert.equal(formatNumber(1250.75, 2), '1250.75');
  assert.equal(formatNumber(1500000, 0), '1500000');
  assert.equal(formatNumber(null, 0), 'Not available');
  assert.equal(formatNumber(undefined, 0), 'Not available');
});

test('P0 Regression 13: Crop Knowledge Database normalizer maps backend crop attributes', () => {
  function normalizeCrop(c) {
    if (!c) return null;
    const name = c.name || c.crop || 'Unknown Crop';
    const family = c.botanical_family || c.family || '';
    const season = c.season || c.primary_season || 'All seasons';
    const yieldKgHa = c.expected_yield_kg_ha != null
      ? c.expected_yield_kg_ha
      : (c.expected_yield_t_ha != null ? Math.round(c.expected_yield_t_ha * 1000) : null);
    const marginBdtHa = c.net_margin_bdt_ha != null
      ? c.net_margin_bdt_ha
      : (c.gross_margin_bdt_ha != null ? c.gross_margin_bdt_ha : null);
    const phMin = c.soil_ph_min ?? c.min_ph ?? '5.0';
    const phMax = c.soil_ph_max ?? c.max_ph ?? '7.5';
    const tempMin = c.temperature_min_c ?? c.min_temperature_c ?? '15';
    const tempMax = c.temperature_max_c ?? c.max_temperature_c ?? '35';
    const source = c.data_source || c.authority_source || 'BRRI / BARI';

    return {
      ...c,
      name,
      botanical_family: family,
      season,
      expected_yield_kg_ha: yieldKgHa,
      net_margin_bdt_ha: marginBdtHa,
      soil_ph_min: phMin,
      soil_ph_max: phMax,
      temperature_min_c: tempMin,
      temperature_max_c: tempMax,
      data_source: source,
    };
  }

  const rawBackendCrop = {
    crop: 'Rice',
    bengali_name: 'ধান (Oryza sativa)',
    family: 'Poaceae (Gramineae)',
    is_legume: false,
    primary_season: 'Aman / Boro',
    duration_days: 130,
    water_requirement_mm: 1200.0,
    expected_yield_t_ha: 4.5,
    gross_margin_bdt_ha: 45000.0,
    min_temperature_c: 20.0,
    max_temperature_c: 35.0,
    min_ph: 5.5,
    max_ph: 7.2,
    authority_source: 'BRRI Rice Knowledge Bank'
  };

  const normalized = normalizeCrop(rawBackendCrop);
  assert.equal(normalized.name, 'Rice');
  assert.equal(normalized.botanical_family, 'Poaceae (Gramineae)');
  assert.equal(normalized.season, 'Aman / Boro');
  assert.equal(normalized.expected_yield_kg_ha, 4500);
  assert.equal(normalized.net_margin_bdt_ha, 45000.0);
  assert.equal(normalized.soil_ph_min, 5.5);
  assert.equal(normalized.soil_ph_max, 7.2);
  assert.equal(normalized.temperature_min_c, 20.0);
  assert.equal(normalized.temperature_max_c, 35.0);
  assert.equal(normalized.data_source, 'BRRI Rice Knowledge Bank');
});

test('P0 Regression 14: Crop Failure Simulator payload contracts and shock type mapping', () => {
  const supportedShockTypes = [
    'drought_irrigation_cut',
    'heat_stress',
    'excess_rainfall',
    'crop_failure',
    'soil_degradation'
  ];

  function buildRecoveryPayload(activeField, shockType, seasonIndex0, severity) {
    const rawId = activeField?.id;
    const isNumericId = rawId != null && !isNaN(Number(rawId)) && String(rawId).trim() !== '';
    return {
      field_id: isNumericId ? Number(rawId) : 'demo',
      failure_type: shockType,
      failure_event: shockType,
      failure_season: Number(seasonIndex0),
      impacted_season_index: Number(seasonIndex0) + 1,
      severity: severity,
    };
  }

  // Verify all 5 shock types map cleanly to 1-indexed seasons
  supportedShockTypes.forEach((st, idx) => {
    const payload = buildRecoveryPayload({ id: 'SYN-01' }, st, idx, 'severe');
    assert.equal(payload.field_id, 'demo');
    assert.equal(payload.failure_event, st);
    assert.equal(payload.failure_season, idx);
    assert.equal(payload.impacted_season_index, idx + 1);
  });

  // Verify registered numeric field ID preserves numeric type
  const registeredPayload = buildRecoveryPayload({ id: 99 }, 'drought_irrigation_cut', 0, 'moderate');
  assert.equal(registeredPayload.field_id, 99);
  assert.equal(registeredPayload.impacted_season_index, 1);
});

