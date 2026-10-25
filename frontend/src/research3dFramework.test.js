// frontend/src/research3dFramework.test.js
// Unit tests for the 3D Scientific Visualization Framework, Stress Test Suites, and Hydrological Invariants

import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgronomicSimulation } from './experimentSimulationEngine.js';
import { STRESS_TEST_CASES } from './research3d/stressTestDefinitions.js';

test('Stress Test Suite: All 9 edge-case benchmarks are defined with strict invariants', () => {
  assert.equal(STRESS_TEST_CASES.length, 9, 'Should have exactly 9 automated scientific stress tests');

  const requiredIds = [
    'case_zero_water',
    'case_prolonged_drought',
    'case_deluge_exceeding_taw',
    'case_ks_threshold',
    'case_nitrogen_zero',
    'case_micro_potential_yield',
    'case_soil_texture_sandy',
    'case_mass_conservation',
    'case_seed_reproducibility'
  ];

  requiredIds.forEach(id => {
    const found = STRESS_TEST_CASES.find(c => c.id === id);
    assert.ok(found, `Stress test case ${id} must be defined`);
    assert.ok(found.titleEn, `Case ${id} must have an English title`);
    assert.ok(found.titleBn, `Case ${id} must have a Bengali title`);
    assert.ok(found.invariant, `Case ${id} must declare its mathematical invariant`);
    assert.ok(typeof found.invariantAssertion === 'function', `Case ${id} must provide an assertion function`);
  });
});

test('Stress Test Invariant 1: Zero rainfall and zero irrigation clamps yield to floor', () => {
  const zeroWaterCase = STRESS_TEST_CASES.find(c => c.id === 'case_zero_water');
  const simRes = runAgronomicSimulation(zeroWaterCase.config);

  const passes = zeroWaterCase.invariantAssertion(simRes);
  assert.equal(passes, true, 'Zero water case must pass its invariant assertion');
  assert.equal(simRes.waterBalance.totalIrrigationMm, 0, 'Total irrigation must be 0 mm');
  assert.ok(simRes.yieldOutcomes.simulatedYieldTonHa >= 0.20, 'Yield must respect the 0.20 t/ha salvage floor');
});

test('Stress Test Invariant 2: Deluge exceeding TAW drains water via deep percolation with 0.00mm residual', () => {
  const delugeCase = STRESS_TEST_CASES.find(c => c.id === 'case_deluge_exceeding_taw');
  const simRes = runAgronomicSimulation(delugeCase.config);

  const passes = delugeCase.invariantAssertion(simRes);
  assert.equal(passes, true, 'Deluge case must pass invariant assertion');
  assert.ok(simRes.waterBalance.totalDeepPercolationMm > 50, 'Deep percolation must drain excess water (> 50 mm)');
  assert.ok(Math.abs(simRes.waterBalance.massBalanceResidualMm) < 0.01, 'Hydrological mass balance residual must be 0.00 mm');
});

test('Stress Test Invariant 3: Nitrogen starvation (N=0) reduces yield below 70% potential', () => {
  const zeroNCase = STRESS_TEST_CASES.find(c => c.id === 'case_nitrogen_zero');
  const simRes = runAgronomicSimulation(zeroNCase.config);

  const passes = zeroNCase.invariantAssertion(simRes);
  assert.equal(passes, true, 'Zero nitrogen case must pass invariant assertion');
  assert.ok(simRes.yieldOutcomes.simulatedYieldTonHa <= simRes.yieldOutcomes.potentialYieldTonHa * 0.70, 'Yield should be penalized by N starvation');
});

test('Stress Test Invariant 4: Yield floor model assumption min(0.20, Ym) across 0, 0.15, 0.20 and normal Ym', () => {
  const microCase = STRESS_TEST_CASES.find(c => c.id === 'case_micro_potential_yield');
  const simRes = runAgronomicSimulation(microCase.config);

  const passes = microCase.invariantAssertion(simRes);
  assert.equal(passes, true, 'Micro yield test must pass');
  // Case 1: Ym = 0.15 t/ha -> yield must be <= 0.15 and never exceed potential
  assert.equal(simRes.yieldOutcomes.simulatedYieldTonHa, 0.15, 'Ym = 0.15 must yield exactly 0.15 t/ha (effective floor min(0.2, 0.15))');
  assert.ok(simRes.yieldOutcomes.simulatedYieldTonHa <= 0.15, 'Final yield must never exceed potential yield');

  // Case 2: Ym = 0.00 t/ha -> yield must be strictly 0.00
  const zeroRes = runAgronomicSimulation({ ...microCase.config, potentialYieldOverride: 0.0 });
  assert.equal(zeroRes.yieldOutcomes.simulatedYieldTonHa, 0.0, 'Ym = 0 must strictly yield 0.0 t/ha');

  // Case 3: Ym = 0.20 t/ha -> yield must be strictly 0.20
  const floorRes = runAgronomicSimulation({ ...microCase.config, potentialYieldOverride: 0.20 });
  assert.equal(floorRes.yieldOutcomes.simulatedYieldTonHa, 0.20, 'Ym = 0.20 must yield 0.20 t/ha');

  // Case 4: Normal positive value (Ym = 5.5 t/ha) -> under severe drought, respects 0.20 t/ha floor
  const normalDroughtRes = runAgronomicSimulation({ ...microCase.config, irrigationMm: 0, weatherScenario: 'drought', potentialYieldOverride: 5.5 });
  assert.ok(normalDroughtRes.yieldOutcomes.simulatedYieldTonHa >= 0.20, 'Standard crop under severe drought respects 0.20 t/ha modeling floor');
  assert.ok(normalDroughtRes.yieldOutcomes.simulatedYieldTonHa <= 5.5, 'Standard crop yield cannot exceed potential yield');
});

test('Stress Test Invariant 5: Agronomic engine produces bit-exact deterministic outputs under same seed', () => {
  const cfg = {
    crop: 'rice',
    areaHa: 10.0,
    soilTexture: 'loam',
    weatherScenario: 'baseline',
    irrigationMm: 450,
    nitrogenKgHa: 120,
    phosphorusKgHa: 60,
    potassiumKgHa: 60,
    sellingPriceMaund: 1250,
    randomSeed: 2026
  };

  const run1 = runAgronomicSimulation(cfg);
  const run2 = runAgronomicSimulation(cfg);

  assert.equal(run1.yieldOutcomes.simulatedYieldTonHa, run2.yieldOutcomes.simulatedYieldTonHa, 'Yields must match bit-for-bit');
  assert.equal(run1.waterBalance.totalEtaMm, run2.waterBalance.totalEtaMm, 'ETa must match bit-for-bit');
  assert.equal(run1.economics.netReturnPerHaBdt, run2.economics.netReturnPerHaBdt, 'Net return must match bit-for-bit');
});

test('Hydrological Mass Balance Conservation Invariant across all supported soil textures', () => {
  const textures = ['sand', 'loamy_sand', 'sandy_loam', 'loam', 'silt_loam', 'clay_loam', 'clay'];

  textures.forEach(texture => {
    const res = runAgronomicSimulation({
      crop: 'wheat',
      areaHa: 5.0,
      soilTexture: texture,
      weatherScenario: 'baseline',
      irrigationMm: 300,
      nitrogenKgHa: 100,
      phosphorusKgHa: 50,
      potassiumKgHa: 50,
      sellingPriceMaund: 1100,
      randomSeed: 42
    });

    const residual = Math.abs(res.waterBalance.massBalanceResidualMm);
    assert.ok(residual < 0.05, `Soil texture ${texture} must conserve water mass: residual ${residual} mm < 0.05 mm`);
  });
});

test('Scenario Difference B minus A preserves exact arithmetic', () => {
  const simA = runAgronomicSimulation({ crop: 'rice', irrigationMm: 400, nitrogenKgHa: 100 });
  const simB = runAgronomicSimulation({ crop: 'rice', irrigationMm: 550, nitrogenKgHa: 130 });

  const diffYield = Number((simB.yieldOutcomes.simulatedYieldTonHa - simA.yieldOutcomes.simulatedYieldTonHa).toFixed(2));
  const diffWater = Number((simB.waterBalance.totalWaterAppliedMm - simA.waterBalance.totalWaterAppliedMm).toFixed(1));
  const diffProfit = Number((simB.economics.netReturnPerHaBdt - simA.economics.netReturnPerHaBdt).toFixed(0));

  assert.ok(Number.isFinite(diffYield), 'Diff yield must be a finite number');
  assert.ok(Number.isFinite(diffWater), 'Diff water must be a finite number');
  assert.ok(Number.isFinite(diffProfit), 'Diff profit must be a finite number');
  assert.equal(diffWater, 150.0, 'Diff water applied should exactly equal 550 - 400 = 150 mm');
});
