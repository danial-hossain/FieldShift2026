// frontend/src/experimentSimulation.test.js
// Unit tests for scientific experiment simulation engine, FAO-33 water-yield response,
// agricultural economics, and scenario comparison logic.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CROP_AGRONOMIC_MODELS,
  WEATHER_SCENARIO_MODIFIERS,
  runAgronomicSimulation,
  compareScenarios,
  createSeededRandom
} from './experimentSimulationEngine.js';

test('createSeededRandom generates deterministic and reproducible sequences', () => {
  const rng1 = createSeededRandom(2026);
  const rng2 = createSeededRandom(2026);
  const seq1 = [rng1(), rng1(), rng1(), rng1()];
  const seq2 = [rng2(), rng2(), rng2(), rng2()];
  assert.deepEqual(seq1, seq2, 'Identical seeds must produce identical random sequences');

  const rngDifferent = createSeededRandom(9999);
  const seqDiff = [rngDifferent(), rngDifferent(), rngDifferent()];
  assert.notDeepEqual(seq1.slice(0, 3), seqDiff, 'Different seeds should produce different sequences');
});

test('runAgronomicSimulation produces deterministic simulation results', () => {
  const config = {
    crop: 'rice',
    areaHa: 10.0,
    irrigationMm: 300,
    nitrogenKgHa: 120,
    weatherScenario: 'baseline',
    randomSeed: 2026
  };

  const sim1 = runAgronomicSimulation(config);
  const sim2 = runAgronomicSimulation(config);

  assert.equal(sim1.yieldOutcomes.simulatedYieldTonHa, sim2.yieldOutcomes.simulatedYieldTonHa);
  assert.equal(sim1.economics.totalCostBdt, sim2.economics.totalCostBdt);
  assert.equal(sim1.economics.grossRevenueBdt, sim2.economics.grossRevenueBdt);
  assert.equal(sim1.economics.netReturnBdt, sim2.economics.netReturnBdt);
  assert.equal(sim1.waterBalance.cumulativeEt0Mm, sim2.waterBalance.cumulativeEt0Mm);
});

test('FAO-33 water stress penalizes yield when drought scenario is applied', () => {
  const baselineConfig = {
    crop: 'rice',
    areaHa: 10.0,
    irrigationMm: 150, // Low irrigation to highlight water stress
    weatherScenario: 'baseline',
    randomSeed: 2026
  };

  const droughtConfig = {
    crop: 'rice',
    areaHa: 10.0,
    irrigationMm: 150,
    weatherScenario: 'drought_20pct',
    randomSeed: 2026
  };

  const baselineSim = runAgronomicSimulation(baselineConfig);
  const droughtSim = runAgronomicSimulation(droughtConfig);

  assert.ok(
    droughtSim.waterBalance.cumulativeRainfallMm < baselineSim.waterBalance.cumulativeRainfallMm,
    'Drought scenario must reduce cumulative rainfall'
  );

  assert.ok(
    droughtSim.yieldOutcomes.simulatedYieldTonHa <= baselineSim.yieldOutcomes.simulatedYieldTonHa,
    'Drought with water deficit must result in equal or lower yield'
  );

  assert.ok(
    droughtSim.yieldOutcomes.simulatedYieldTonHa >= 0.2,
    'Simulated yield must remain above the biological minimum threshold'
  );
});

test('Agricultural economics: Gross Revenue, Net Return, and Break-even price formulas are mathematically rigorous', () => {
  const config = {
    crop: 'rice',
    areaHa: 10.0,
    irrigationMm: 350,
    sellingPriceMaund: 1250, // BDT per maund (40 kg)
    randomSeed: 2026
  };

  const sim = runAgronomicSimulation(config);

  // 1 tonne = 25 maunds = 1,000 kg
  const expectedTotalTonnes = sim.yieldOutcomes.simulatedYieldTonHa * 10.0;
  const expectedMaunds = expectedTotalTonnes * 25;
  const expectedGrossRevenue = expectedMaunds * 1250;
  assert.equal(sim.economics.grossRevenueBdt, Math.round(expectedGrossRevenue));

  // Net Return = Gross Revenue - Total Cost
  const expectedNetReturn = sim.economics.grossRevenueBdt - sim.economics.totalCostBdt;
  assert.equal(sim.economics.netReturnBdt, Math.round(expectedNetReturn));

  // Break-even price per kg = Total Cost / Total Yield in kg
  const expectedBreakEvenKg = sim.economics.totalCostBdt / (expectedTotalTonnes * 1000);
  assert.equal(sim.economics.breakEvenPricePerKg, Number(expectedBreakEvenKg.toFixed(2)));

  // Break-even price per maund = Break-even per kg * 40 kg
  assert.equal(sim.economics.breakEvenPricePerMaund, Number((expectedBreakEvenKg * 40).toFixed(2)));
});

test('Hectare to Bigha conversions align with Bangladesh agricultural standard (1 ha ≈ 7.47 bigha)', () => {
  const config = {
    crop: 'wheat',
    areaHa: 5.0,
    randomSeed: 2026
  };

  const sim = runAgronomicSimulation(config);

  assert.equal(sim.inputs.areaBigha, Number((5.0 * 7.47).toFixed(1)));

  // Yield in maund/bigha = (Yield in t/ha * 25) / 7.47
  const expectedMaundBigha = (sim.yieldOutcomes.simulatedYieldTonHa * 25) / 7.47;
  assert.equal(sim.yieldOutcomes.yieldMaundPerBigha, Number(expectedMaundBigha.toFixed(1)));
});

test('compareScenarios accurately calculates absolute and percentage differences between Scenario A and B', () => {
  const simA = runAgronomicSimulation({
    crop: 'rice',
    areaHa: 10.0,
    irrigationMm: 350,
    sellingPriceMaund: 1250,
    randomSeed: 2026
  });

  const simB = runAgronomicSimulation({
    crop: 'rice',
    areaHa: 10.0,
    irrigationMm: 250, // 100 mm less irrigation
    sellingPriceMaund: 1300,
    randomSeed: 2026
  });

  const comparison = compareScenarios(simA, simB);

  assert.ok(comparison !== null, 'Comparison must not be null');
  assert.equal(comparison.yieldTonHa.scenarioA, simA.yieldOutcomes.simulatedYieldTonHa);
  assert.equal(comparison.yieldTonHa.scenarioB, simB.yieldOutcomes.simulatedYieldTonHa);

  const expectedDiff = simB.yieldOutcomes.simulatedYieldTonHa - simA.yieldOutcomes.simulatedYieldTonHa;
  assert.equal(comparison.yieldTonHa.absoluteDiff, Number(expectedDiff.toFixed(2)));

  // Water applied difference
  const expectedWaterDiff = simB.waterBalance.totalWaterAppliedMm - simA.waterBalance.totalWaterAppliedMm;
  assert.equal(comparison.waterAppliedMm.absoluteDiff, Number(expectedWaterDiff.toFixed(2)));
});

test('compareScenarios handles null inputs gracefully without throwing exceptions', () => {
  const compNull = compareScenarios(null, null);
  assert.equal(compNull, null);
});
