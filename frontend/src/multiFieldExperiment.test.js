// frontend/src/multiFieldExperiment.test.js
// Automated test suite for Multi-Field Experiments & Scientific Invariants

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SYNTHETIC_FIELD_PROFILES,
  validateFieldProfile,
  runProfileBaseline,
  generateOvatVariants,
  generateInteractionExperiment,
  validateScientificInvariants,
  generateClientExperimentCsv
} from './multiFieldExperimentData.js';

test('contains at least 6 distinct synthetic Bangladesh AEZ field profiles', () => {
  const keys = Object.keys(SYNTHETIC_FIELD_PROFILES);
  assert.ok(keys.length >= 6, 'Must contain at least 6 field profiles');
  assert.ok(keys.includes('bogura_boro'), 'Must include Bogura Boro rice');
  assert.ok(keys.includes('rajshahi_stressed'), 'Must include Rajshahi water-stressed field');
  assert.ok(keys.includes('rangpur_seasonal'), 'Must include Rangpur seasonal field');
  assert.ok(keys.includes('mymensingh_lowfert'), 'Must include Mymensingh low fertility field');
  assert.ok(keys.includes('jashore_pulse_veg'), 'Must include Jashore pulse/vegetable field');
  assert.ok(keys.includes('cumilla_alternative'), 'Must include Cumilla alternative field');
});

test('validates that all 6 profiles lie strictly within Bangladesh agricultural bounds', () => {
  Object.entries(SYNTHETIC_FIELD_PROFILES).forEach(([key, prof]) => {
    const val = validateFieldProfile(prof);
    assert.equal(val.isValid, true, `Profile ${key} must be valid: ${val.errors}`);
    assert.equal(val.errors.length, 0);

    // Coordinates
    assert.ok(prof.latitude >= 20.60 && prof.latitude <= 26.65, `${key} lat ${prof.latitude} in BD`);
    assert.ok(prof.longitude >= 88.01 && prof.longitude <= 92.67, `${key} lon ${prof.longitude} in BD`);

    // Soil & Agronomics
    assert.ok(prof.soilPh >= 3.0 && prof.soilPh <= 10.0, 'Plausible pH');
    assert.ok(prof.organicMatterPct >= 0.1 && prof.organicMatterPct <= 20.0, 'Plausible OM');
    assert.ok(prof.areaHa > 0, 'Positive area');
    assert.equal(prof.dataStatus, 'SYNTHETIC_TEST_DATA', 'Explicit synthetic badge');
  });
});

test('rejects unphysical coordinates and values without silent fallback to defaults', () => {
  const invalidProfile = {
    ...SYNTHETIC_FIELD_PROFILES.bogura_boro,
    latitude: 48.8566, // Paris, France
    areaHa: -2.0,
    soilPh: 14.5
  };
  const val = validateFieldProfile(invalidProfile);
  assert.equal(val.isValid, false, 'Must reject invalid inputs');
  assert.ok(val.errors.length >= 3, 'Must report all errors');
});

test('executes baseline analysis and strictly conserves hydrological water mass balance', () => {
  Object.values(SYNTHETIC_FIELD_PROFILES).forEach(prof => {
    const base = runProfileBaseline(prof);

    // Water mass conservation: Initial + Rain + Irrig = Final + ETa + Percolation
    assert.equal(base.massBalanceConserved, true, 'Water mass must be conserved');
    assert.ok(Math.abs(base.massBalanceResidualMm) < 0.05, `Residual ${base.massBalanceResidualMm} < 0.05mm`);

    // Yield boundary: Y_a <= Y_m
    assert.ok(base.simulatedYieldTonHa <= base.potentialYieldTonHa + 0.01, 'Yield <= Potential');

    // Yield floor: Y_a >= min(0.2, Y_m)
    const expectedFloor = Math.min(0.20, base.potentialYieldTonHa);
    assert.ok(base.simulatedYieldTonHa >= expectedFloor - 0.01, 'Yield >= Floor');

    // Economic reconciliation: Profit = Revenue - Cost
    const calcProfit = base.grossRevenueBdt - base.totalCostBdt;
    assert.ok(Math.abs(calcProfit - base.netReturnBdt) <= 1, 'Profit matches Revenue - Cost');

    // Uncalculated metrics disclosure
    assert.ok(base.micronutrientsStatus.includes('NOT IMPLEMENTED'), 'Discloses unmodeled micronutrients');
    assert.ok(base.inSituLabSoilStatus.includes('NOT IMPLEMENTED'), 'Discloses zero real in-situ lab records');
  });
});

test('isolates single variables in OVAT sensitivity analysis and enforces price monotonicity', () => {
  const prof = SYNTHETIC_FIELD_PROFILES.bogura_boro;
  const variants = generateOvatVariants(prof);
  assert.ok(variants.length >= 10, 'Must have at least 10 OVAT variants');

  variants.forEach(v => {
    assert.ok(v.baselineValue !== undefined);
    assert.ok(v.testedValue !== undefined);
    assert.ok(Number.isFinite(v.deltaYieldPct), 'Yield pct delta must be finite');
    assert.ok(Number.isFinite(v.deltaProfitPct), 'Profit pct delta must be finite');
  });

  // Check crop price monotonicity: Higher price MUST increase profit holding yield and costs constant
  const priceVariants = variants.filter(v => v.factorKey === 'sellingPriceMaund');
  const higherPrice = priceVariants.find(v => v.testedValue > v.baselineValue);
  const lowerPrice = priceVariants.find(v => v.testedValue < v.baselineValue);
  assert.ok(higherPrice.deltaProfitBdt > 0, 'Higher price must increase profit');
  assert.ok(lowerPrice.deltaProfitBdt < 0, 'Lower price must decrease profit');
});

test('computes 2x2 Factorial Interaction experiment and correctly calculates synergy delta', () => {
  const prof = SYNTHETIC_FIELD_PROFILES.rajshahi_stressed;
  const interaction = generateInteractionExperiment(prof);

  assert.ok(interaction.grid.lowIrrigLowN, 'Must have low-low combo');
  assert.ok(interaction.grid.highIrrigHighN, 'Must have high-high combo');

  // Synergy delta verification: Combined - (IrrigAlone + NAlone)
  const indiv = interaction.individualEffects;
  const comb = interaction.combinedEffect;
  const expectedSynergy = comb.bothHighProfitDeltaBdt - (
    indiv.highIrrigAloneProfitDeltaBdt + indiv.highNAloneProfitDeltaBdt
  );
  assert.equal(interaction.synergy.synergyProfitBdt, expectedSynergy, 'Synergy formula matches exactly');

  // Classic 2x2 Factorial Interaction identity: P(1,1) - P(1,0) - P(0,1) + P(0,0)
  const p00 = interaction.grid.lowIrrigLowN.netReturnBdt;
  const p10 = interaction.grid.highIrrigLowN.netReturnBdt;
  const p01 = interaction.grid.lowIrrigHighN.netReturnBdt;
  const p11 = interaction.grid.highIrrigHighN.netReturnBdt;
  const expectedClassicSynergy = Math.round(p11 - p10 - p01 + p00);
  assert.equal(interaction.synergy.classic2x2SynergyProfitBdt, expectedClassicSynergy, 'Classic 2x2 synergy identity strictly holds');

  // Deltas relative to Low/Low control
  assert.equal(interaction.grid.lowIrrigLowN.deltaFromControlProfitBdt, 0);
  assert.equal(interaction.grid.highIrrigLowN.deltaFromControlProfitBdt, Math.round(p10 - p00));
  assert.equal(interaction.grid.lowIrrigHighN.deltaFromControlProfitBdt, Math.round(p01 - p00));
  assert.equal(interaction.grid.highIrrigHighN.deltaFromControlProfitBdt, Math.round(p11 - p00));
});

test('verifies scientific invariant suite and includes all required classifications', () => {
  const prof = SYNTHETIC_FIELD_PROFILES.bogura_boro;
  const invariants = validateScientificInvariants(prof);

  assert.ok(invariants.length >= 7, 'Must have at least 7 invariant checks');
  const categories = new Set(invariants.map(i => i.category));
  assert.ok(categories.has('INVARIANT'), 'Includes INVARIANT');
  assert.ok(categories.has('EXPECTED_TREND'), 'Includes EXPECTED_TREND');
  assert.ok(categories.has('EMPIRICAL_VALIDATION_REQUIRED'), 'Includes EMPIRICAL_VALIDATION_REQUIRED');
  assert.ok(categories.has('MODEL_LIMITATION'), 'Includes MODEL_LIMITATION');

  invariants.forEach(inv => {
    assert.equal(inv.status, 'PASS', `${inv.checkNameEn} must pass`);
    assert.ok(inv.evidence, 'Evidence must be recorded');
  });
});

test('generates compliant downloadable CSV report labeled with SYNTHETIC_TEST_DATA', () => {
  const csv = generateClientExperimentCsv(SYNTHETIC_FIELD_PROFILES);
  assert.ok(csv.includes('Profile_ID,Field_Name,District'));
  assert.ok(csv.includes('SYN-BOG-01'));
  assert.ok(csv.includes('SYNTHETIC_TEST_DATA'));
  assert.ok(csv.includes('OVAT_SENSITIVITY'));
});
