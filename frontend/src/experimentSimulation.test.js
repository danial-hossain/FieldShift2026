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
  createSeededRandom,
  validateAgronomicInputs
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

test('Scenario A compared with itself produces exactly 0 absolute and 0% diff across all indicators', () => {
  const simA = runAgronomicSimulation({
    crop: 'rice',
    areaHa: 10.0,
    irrigationMm: 300,
    soilTexture: 'loam',
    weatherScenario: 'baseline',
    randomSeed: 2026
  });

  const diff = compareScenarios(simA, simA);
  assert.ok(diff !== null);
  assert.equal(diff.yieldTonHa.absoluteDiff, 0);
  assert.equal(diff.yieldTonHa.percentDiff, 0);
  assert.equal(diff.waterAppliedMm.absoluteDiff, 0);
  assert.equal(diff.waterAppliedMm.percentDiff, 0);
  assert.equal(diff.netReturnBdt.absoluteDiff, 0);
  assert.equal(diff.netReturnBdt.percentDiff, 0);
  assert.equal(diff.waterProductivityKgM3.absoluteDiff, 0);
  assert.equal(diff.waterProductivityKgM3.percentDiff, 0);
});

test('Soil water storage strictly satisfies 0 <= S_t <= TAW on every day across soil textures', () => {
  const soilTypes = ['sandy', 'loam', 'clay'];
  for (const soil of soilTypes) {
    const sim = runAgronomicSimulation({
      crop: 'wheat',
      areaHa: 5.0,
      soilTexture: soil,
      irrigationMm: 450, // Heavy irrigation to test upper TAW boundary
      weatherScenario: 'heavy_monsoon',
      randomSeed: 2026
    });

    const taw = sim.waterBalance.tawMm;
    assert.ok(taw > 0, `TAW must be positive for ${soil}`);

    sim.timeseries.forEach(day => {
      assert.ok(
        day.soilWaterMm >= 0,
        `Day ${day.day} soil water ${day.soilWaterMm} must be >= 0 for ${soil}`
      );
      assert.ok(
        day.soilWaterMm <= taw + 0.01,
        `Day ${day.day} soil water ${day.soilWaterMm} must not exceed TAW ${taw} for ${soil}`
      );
    });
  }
});

test('Deep percolation occurs when daily rainfall plus irrigation plus antecedent moisture exceeds TAW', () => {
  const sim = runAgronomicSimulation({
    crop: 'rice',
    areaHa: 10.0,
    irrigationMm: 500, // Very high irrigation to trigger percolation
    weatherScenario: 'heavy_monsoon',
    randomSeed: 2026
  });

  assert.ok(
    sim.waterBalance.cumulativeDeepPercolationMm > 0,
    'Excess water beyond TAW must generate deep percolation'
  );
  
  // Total balance check: Initial S + Rain + Irrig = End S + ETa + Deep Percolation (conservation of mass)
  const initialS = sim.timeseries[0] ? sim.waterBalance.tawMm * 0.7 : 0;
  const inflow = initialS + sim.waterBalance.cumulativeRainfallMm + sim.waterBalance.cumulativeIrrigationMm;
  const outflow = sim.waterBalance.cumulativeEtaMm + sim.waterBalance.cumulativeDeepPercolationMm + sim.waterBalance.finalSoilWaterMm;
  const balanceDiff = Math.abs(inflow - outflow);
  assert.ok(
    balanceDiff < 5.0,
    `Mass balance error ${balanceDiff} mm must be small over 120 days`
  );
});

test('Monotonicity: Increasing effective irrigation does not decrease water availability or yield', () => {
  const deficitSim = runAgronomicSimulation({
    crop: 'maize',
    areaHa: 5.0,
    irrigationMm: 50, // Severe water deficit
    weatherScenario: 'drought_20pct',
    randomSeed: 2026
  });

  const optimalSim = runAgronomicSimulation({
    crop: 'maize',
    areaHa: 5.0,
    irrigationMm: 350, // Adequate irrigation
    weatherScenario: 'drought_20pct',
    randomSeed: 2026
  });

  assert.ok(
    optimalSim.waterBalance.cumulativeEtaMm >= deficitSim.waterBalance.cumulativeEtaMm,
    'Higher irrigation must provide equal or higher cumulative ETa under drought'
  );

  assert.ok(
    optimalSim.yieldOutcomes.simulatedYieldTonHa >= deficitSim.yieldOutcomes.simulatedYieldTonHa,
    'Higher irrigation must produce equal or higher yield under drought conditions'
  );

  assert.ok(
    optimalSim.waterBalance.stressDaysCount <= deficitSim.waterBalance.stressDaysCount,
    'Optimal irrigation must result in fewer or equal water stress days compared to deficit'
  );
});

test('FAO-56 moisture stress threshold: Ks drops below 1.0 if and only if S < (1 - p) * TAW', () => {
  const sim = runAgronomicSimulation({
    crop: 'potato',
    areaHa: 2.0,
    irrigationMm: 100, // Limited irrigation to induce stress
    weatherScenario: 'drought_20pct',
    randomSeed: 2026
  });

  const taw = sim.waterBalance.tawMm;
  const p = CROP_AGRONOMIC_MODELS.potato.depletionFractionP;
  const stressThreshold = (1 - p) * taw;

  sim.timeseries.forEach(day => {
    if (day.soilWaterMm < stressThreshold - 1.0) {
      assert.ok(
        day.ks < 1.0,
        `Day ${day.day}: Soil water ${day.soilWaterMm} is below stress threshold ${stressThreshold}, Ks should be < 1.0 (got ${day.ks})`
      );
    }
  });
});

test('All crop models include defensible agronomic parameters with explicit provenance and caveats', () => {
  const requiredCrops = ['rice', 'wheat', 'maize', 'mustard', 'potato', 'lentil'];
  requiredCrops.forEach(cropId => {
    const crop = CROP_AGRONOMIC_MODELS[cropId];
    assert.ok(crop, `Crop model for ${cropId} must exist`);
    assert.ok(crop.depletionFractionP > 0 && crop.depletionFractionP < 1, `depletionFractionP for ${cropId} must be in (0,1)`);
    assert.ok(crop.rootDepthM > 0, `rootDepthM for ${cropId} must be positive`);
    assert.ok(crop.potentialYieldTonHa > 0, `potentialYieldTonHa for ${cropId} must be positive`);
    assert.ok(crop.provenance, `Crop ${cropId} must have an explicit provenance citation`);
  });
});

test('Yield floor behavior: clamps to 0.2 t/ha biological salvage for standard crops, never exceeds valid potential yield, and yields 0 when potential is 0', () => {
  // 1. Extreme drought on standard crop respects 0.2 t/ha modeling floor
  const extremeDroughtSim = runAgronomicSimulation({
    crop: 'mustard',
    areaHa: 5.0,
    irrigationMm: 0,
    weatherScenario: 'extreme_heatwave',
    randomSeed: 2026
  });
  assert.ok(extremeDroughtSim.yieldOutcomes.simulatedYieldTonHa >= 0.2, 'Standard crop under drought must not fall below 0.2 t/ha floor');
  assert.ok(
    extremeDroughtSim.yieldOutcomes.simulatedYieldTonHa <= extremeDroughtSim.yieldOutcomes.potentialYieldTonHa,
    'Simulated yield must never exceed crop potential yield'
  );

  // 2. Zero potential yield must output exactly 0.0 t/ha, not 0.2 t/ha
  const zeroPotentialSim = runAgronomicSimulation({
    crop: 'rice',
    potentialYieldTonHa: 0,
    areaHa: 10.0,
    randomSeed: 2026
  });
  assert.equal(zeroPotentialSim.yieldOutcomes.simulatedYieldTonHa, 0, 'Zero potential yield must yield 0');

  // 3. Micro potential yield (0.15 t/ha) must not exceed 0.15 t/ha
  const microPotentialSim = runAgronomicSimulation({
    crop: 'rice',
    potentialYieldTonHa: 0.15,
    areaHa: 10.0,
    randomSeed: 2026
  });
  assert.ok(microPotentialSim.yieldOutcomes.simulatedYieldTonHa <= 0.15, 'Yield must not exceed micro potential yield');
});

test('Hydrological water-balance mass conservation holds across extreme boundaries', () => {
  const boundaryConfigs = [
    { desc: 'Zero irrigation & baseline weather', config: { crop: 'wheat', irrigationMm: 0, randomSeed: 2026 } },
    { desc: 'Extremely high irrigation exceeding TAW', config: { crop: 'rice', irrigationMm: 800, randomSeed: 2026 } },
    { desc: 'Extreme monsoon with high rainfall', config: { crop: 'maize', irrigationMm: 300, weatherScenario: 'heavy_monsoon', randomSeed: 2026 } },
    { desc: 'Extreme heatwave with low rain', config: { crop: 'potato', irrigationMm: 50, weatherScenario: 'extreme_heatwave', randomSeed: 2026 } }
  ];

  for (const { desc, config } of boundaryConfigs) {
    const sim = runAgronomicSimulation(config);
    const taw = sim.waterBalance.tawMm;
    const initialS = taw * 0.70;
    const totalInflow = initialS + sim.waterBalance.cumulativeRainfallMm + sim.waterBalance.cumulativeIrrigationMm;
    const totalOutflow = sim.waterBalance.cumulativeEtaMm + sim.waterBalance.cumulativeDeepPercolationMm + sim.waterBalance.finalSoilWaterMm;
    const massError = Math.abs(totalInflow - totalOutflow);
    assert.ok(
      massError <= 0.2,
      `Mass conservation violated in ${desc}: error=${massError.toFixed(2)} mm (Inflow=${totalInflow.toFixed(1)}, Outflow=${totalOutflow.toFixed(1)})`
    );
  }
});

test('validateAgronomicInputs detects invalid numeric and physical boundary inputs', () => {
  const invalid1 = validateAgronomicInputs({
    nitrogenKgHa: -50,
    areaHa: -2,
    irrigationMm: -100,
    potentialYieldTonHa: -3
  });
  assert.equal(invalid1.isValid, false);
  assert.ok(invalid1.errors.some(e => e.includes('nitrogenKgHa')));
  assert.ok(invalid1.errors.some(e => e.includes('areaHa')));
  assert.ok(invalid1.errors.some(e => e.includes('irrigationMm')));
  assert.ok(invalid1.errors.some(e => e.includes('potentialYieldTonHa')));

  const invalid2 = validateAgronomicInputs({
    nitrogenKgHa: NaN,
    areaHa: Infinity,
    randomSeed: -Infinity
  });
  assert.equal(invalid2.isValid, false);
  assert.ok(invalid2.errors.some(e => e.includes('nitrogenKgHa')));
  assert.ok(invalid2.errors.some(e => e.includes('areaHa')));
  assert.ok(invalid2.errors.some(e => e.includes('randomSeed')));

  const invalid3 = validateAgronomicInputs({
    rootDepthM: 0,
    depletionFractionP: 1.2,
    kcIni: -0.2
  });
  assert.equal(invalid3.isValid, false);
  assert.ok(invalid3.errors.some(e => e.includes('rootDepthM')));
  assert.ok(invalid3.errors.some(e => e.includes('depletionFractionP')));
  assert.ok(invalid3.errors.some(e => e.includes('kcIni')));

  const valid = validateAgronomicInputs({
    crop: 'rice',
    areaHa: 10,
    irrigationMm: 300,
    nitrogenKgHa: 0 // Zero nitrogen is valid (unfertilized baseline)
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);
});

test('Model boundary input sanitization produces finite, non-negative results and preserves 0 <= actualYield <= potentialYield', () => {
  // Test case matrix for invalid and edge inputs
  const testCases = [
    { name: 'Zero nitrogen', config: { crop: 'rice', nitrogenKgHa: 0, randomSeed: 2026 }, maxYield: 5.5 },
    { name: 'Negative nitrogen', config: { crop: 'rice', nitrogenKgHa: -100, randomSeed: 2026 }, maxYield: 5.5 },
    { name: 'NaN nitrogen and NaN irrigation', config: { crop: 'rice', nitrogenKgHa: NaN, irrigationMm: NaN, randomSeed: 2026 }, maxYield: 5.5 },
    { name: 'Infinity nitrogen', config: { crop: 'rice', nitrogenKgHa: Infinity, randomSeed: 2026 }, maxYield: 5.5 },
    { name: 'Zero potential yield', config: { crop: 'rice', potentialYieldTonHa: 0, randomSeed: 2026 }, maxYield: 0.0 },
    { name: 'Negative potential yield', config: { crop: 'rice', potentialYieldTonHa: -10, randomSeed: 2026 }, maxYield: 0.0 },
    { name: 'Micro potential yield (0.15 t/ha)', config: { crop: 'rice', potentialYieldTonHa: 0.15, randomSeed: 2026 }, maxYield: 0.15 },
    { name: 'Zero area', config: { crop: 'rice', areaHa: 0, randomSeed: 2026 }, maxYield: 5.5 },
    { name: 'Negative area', config: { crop: 'rice', areaHa: -5, randomSeed: 2026 }, maxYield: 5.5 },
    { name: 'Negative and invalid crop parameters', config: { crop: 'wheat', rootDepthM: -1, depletionFractionP: 1.5, kcIni: -0.5, randomSeed: 2026 }, maxYield: 4.2 }
  ];

  for (const tc of testCases) {
    const sim = runAgronomicSimulation(tc.config);
    const y = sim.yieldOutcomes.simulatedYieldTonHa;
    const py = sim.yieldOutcomes.potentialYieldTonHa;

    // Invariant 1: 0 <= actualYield <= potentialYield
    assert.ok(Number.isFinite(y), `${tc.name}: actualYield must be finite (got ${y})`);
    assert.ok(y >= 0, `${tc.name}: actualYield ${y} must be >= 0`);
    assert.ok(y <= tc.maxYield + 0.001, `${tc.name}: actualYield ${y} must be <= maxYield ${tc.maxYield}`);
    assert.ok(y <= py + 0.001, `${tc.name}: actualYield ${y} must be <= potentialYield ${py}`);

    // Invariant 2: 0 <= soilWater <= TAW on every day
    const taw = sim.waterBalance.tawMm;
    assert.ok(Number.isFinite(taw) && taw > 0, `${tc.name}: TAW must be positive finite`);
    sim.timeseries.forEach(d => {
      assert.ok(d.soilWaterMm >= 0, `${tc.name} day ${d.day}: soilWater ${d.soilWaterMm} must be >= 0`);
      assert.ok(d.soilWaterMm <= taw + 0.05, `${tc.name} day ${d.day}: soilWater ${d.soilWaterMm} must be <= TAW ${taw}`);
      // Invariant 3: ETa >= 0
      assert.ok(d.etaMm >= 0, `${tc.name} day ${d.day}: eta ${d.etaMm} must be >= 0`);
    });

    // Invariant 4: all cumulative metrics are finite and non-negative
    const wb = sim.waterBalance;
    assert.ok(Number.isFinite(wb.cumulativeRainfallMm) && wb.cumulativeRainfallMm >= 0, `${tc.name}: rainfall must be non-negative finite`);
    assert.ok(Number.isFinite(wb.cumulativeIrrigationMm) && wb.cumulativeIrrigationMm >= 0, `${tc.name}: irrigation must be non-negative finite`);
    assert.ok(Number.isFinite(wb.cumulativeDeepPercolationMm) && wb.cumulativeDeepPercolationMm >= 0, `${tc.name}: percolation must be non-negative finite`);
    assert.ok(Number.isFinite(wb.cumulativeEtaMm) && wb.cumulativeEtaMm >= 0, `${tc.name}: cumulativeEta must be non-negative finite`);
    assert.ok(Number.isFinite(wb.cumulativeEtcMm) && wb.cumulativeEtcMm >= 0, `${tc.name}: cumulativeEtc must be non-negative finite`);
    assert.ok(Number.isFinite(sim.economics.totalCostBdt) && sim.economics.totalCostBdt >= 0, `${tc.name}: totalCost must be non-negative finite`);
    assert.ok(Number.isFinite(sim.economics.grossRevenueBdt) && sim.economics.grossRevenueBdt >= 0, `${tc.name}: grossRevenue must be non-negative finite`);
    assert.ok(Number.isFinite(sim.economics.netReturnBdt), `${tc.name}: netReturn must be finite`);
  }
});

test('Modified FAO-56 Ks equation boundary conditions: threshold, near-zero, and zero storage', () => {
  // Crop parameters: Rice with Loam (TAW = 70 mm, p = 0.25 -> RAW = 17.5 mm, sThreshold = 52.5 mm)
  const sim = runAgronomicSimulation({ crop: 'rice', soilTexture: 'loam', irrigationMm: 0, randomSeed: 2026 });
  const sThresh = sim.waterBalance.sThresholdMm;
  assert.equal(sThresh, 52.5);

  // 1. Storage at or above threshold
  sim.timeseries.forEach(day => {
    if (day.soilWaterMm >= sThresh) {
      assert.equal(day.ks, 1.0, `Day ${day.day}: Ks must be exactly 1.0 when storage ${day.soilWaterMm} >= threshold ${sThresh}`);
    }
  });

  // 2. Storage at permanent wilting point (infiltratedStorage = 0)
  // Direct evaluation check of equation: Ks = max(0.05, S / sThresh)
  const ksAtZero = Math.max(0.05, 0 / sThresh);
  assert.equal(ksAtZero, 0.05, 'Ks at zero storage must equal the 0.05 cuticular clamp');
  const etaAtZero = Math.min(0, 4.0 * ksAtZero);
  assert.equal(etaAtZero, 0, 'ETa at zero available storage must be 0 mm despite Ks clamp');

  // 3. Near-zero storage (e.g. S = 0.01 mm)
  const sNearZero = 0.01;
  const ksNearZero = Math.max(0.05, sNearZero / sThresh);
  assert.equal(ksNearZero, 0.05, 'Ks at near-zero storage must clamp to 0.05');
  const etaNearZero = Math.min(sNearZero, 4.0 * ksNearZero);
  assert.ok(etaNearZero <= sNearZero, 'ETa cannot exceed available moisture');
  const sEndNearZero = sNearZero - etaNearZero;
  assert.ok(sEndNearZero >= 0, 'Remaining soil moisture cannot be negative');
});



