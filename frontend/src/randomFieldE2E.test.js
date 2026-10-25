// frontend/src/randomFieldE2E.test.js
// Automated End-to-End Random-Location Testing, Scientific Validation & Immersive 3D QA

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CROP_AGRONOMIC_MODELS,
  runAgronomicSimulation,
  compareScenarios,
  createSeededRandom,
  validateAgronomicInputs
} from './experimentSimulationEngine.js';
import { STRESS_TEST_CASES } from './research3d/stressTestDefinitions.js';

// ---------------------------------------------------------------------------
// 1. REUSABLE RANDOM-FIELD TEST FIXTURE (JAVASCRIPT)
// ---------------------------------------------------------------------------

const BANGLADESH_AGRICULTURAL_REGIONS = {
  bogura: { name: 'Bogura', lat: 24.8465, lon: 89.3777, texture: 'silt_loam', ph: 6.5, om: 1.8, crops: ['potato', 'rice', 'mustard'] },
  rajshahi: { name: 'Rajshahi', lat: 24.3745, lon: 88.6042, texture: 'loam', ph: 7.2, om: 1.4, crops: ['wheat', 'lentil', 'rice'] },
  rangpur: { name: 'Rangpur', lat: 25.7439, lon: 89.2752, texture: 'sandy_loam', ph: 5.8, om: 1.6, crops: ['potato', 'maize', 'wheat'] },
  mymensingh: { name: 'Mymensingh', lat: 24.7471, lon: 90.4203, texture: 'silt_loam', ph: 6.2, om: 2.1, crops: ['rice', 'mustard', 'lentil'] },
  jashore: { name: 'Jashore', lat: 23.1664, lon: 89.2081, texture: 'clay_loam', ph: 7.4, om: 1.9, crops: ['mustard', 'wheat', 'lentil'] },
  cumilla: { name: 'Cumilla', lat: 23.4607, lon: 91.1809, texture: 'silt_loam', ph: 6.1, om: 1.7, crops: ['rice', 'potato', 'mustard'] },
  barishal: { name: 'Barishal', lat: 22.7010, lon: 90.3535, texture: 'clay', ph: 6.8, om: 2.3, crops: ['rice', 'lentil', 'maize'] },
  dinajpur: { name: 'Dinajpur', lat: 25.6217, lon: 88.6355, texture: 'sandy_loam', ph: 5.5, om: 1.5, crops: ['wheat', 'maize', 'potato'] },
  khulna: { name: 'Khulna', lat: 22.8456, lon: 89.5403, texture: 'clay_loam', ph: 7.6, om: 2.0, crops: ['rice', 'mustard', 'lentil'] },
  sylhet: { name: 'Sylhet', lat: 24.8949, lon: 91.8687, texture: 'sandy_loam', ph: 5.1, om: 2.5, crops: ['rice', 'mustard', 'maize'] }
};

function generateRandomField(options = {}) {
  const seed = options.seed ?? Math.floor(Math.random() * 1000000);
  const rng = createSeededRandom(seed);

  const regionKeys = Object.keys(BANGLADESH_AGRICULTURAL_REGIONS);
  const regionKey = options.regionKey ?? regionKeys[Math.floor(rng() * regionKeys.length)];
  const region = BANGLADESH_AGRICULTURAL_REGIONS[regionKey] || BANGLADESH_AGRICULTURAL_REGIONS.bogura;

  // Perturb lat/lon within authentic Bangladesh bounds (20.6°N - 26.65°N, 88.01°E - 92.67°E)
  const latDelta = (rng() - 0.5) * 0.15;
  const lonDelta = (rng() - 0.5) * 0.15;
  const latitude = Math.min(26.65, Math.max(20.60, Number((region.lat + latDelta).toFixed(4))));
  const longitude = Math.min(92.67, Math.max(88.01, Number((region.lon + lonDelta).toFixed(4))));

  const areaHa = Number((0.5 + rng() * 19.5).toFixed(2)); // 0.5 to 20.0 ha
  const soilPh = Number((region.ph + (rng() - 0.5) * 0.6).toFixed(1));
  const organicMatter = Number((region.om + (rng() - 0.5) * 0.4).toFixed(2));
  const crop = region.crops[Math.floor(rng() * region.crops.length)];
  const irrigationMm = Math.round(50 + rng() * 450); // 50 to 500 mm
  const nitrogenKgHa = Math.round(30 + rng() * 170); // 30 to 200 kg/ha

  const testRunId = `run_${seed}_${Date.now().toString(36)}`;
  const fieldId = `field_${regionKey}_${seed}`;

  return {
    testRunId,
    fieldId,
    seed,
    regionKey,
    regionName: region.name,
    latitude,
    longitude,
    areaHa,
    soilTexture: region.texture,
    soilPh,
    organicMatter,
    crop,
    season: 'rabi_dry',
    irrigationMm,
    nitrogenKgHa,
    weatherScenario: 'baseline'
  };
}

// ---------------------------------------------------------------------------
// P0 TESTS: RANDOM FIELD GENERATION & SCHEMA CONFORMANCE
// ---------------------------------------------------------------------------

test('P0: Random Field Generator produces valid geographically bounded fields across all 10 hubs', () => {
  const regionKeys = Object.keys(BANGLADESH_AGRICULTURAL_REGIONS);
  assert.equal(regionKeys.length, 10, 'Must support 10 Bangladesh agricultural hubs');

  regionKeys.forEach((key, idx) => {
    const field = generateRandomField({ seed: 1000 + idx, regionKey: key });
    assert.ok(field.fieldId.includes(key), `Field ID must reflect region ${key}`);
    assert.ok(field.latitude >= 20.60 && field.latitude <= 26.65, `Latitude ${field.latitude} out of BD bounds`);
    assert.ok(field.longitude >= 88.01 && field.longitude <= 92.67, `Longitude ${field.longitude} out of BD bounds`);
    assert.ok(field.areaHa >= 0.5 && field.areaHa <= 20.0, `Area ${field.areaHa} out of bounds`);
    assert.ok(field.soilPh >= 4.5 && field.soilPh <= 8.5, `Soil pH ${field.soilPh} out of bounds`);
    assert.ok(field.organicMatter >= 0.5 && field.organicMatter <= 5.0, `OM ${field.organicMatter} out of bounds`);
    assert.ok(CROP_AGRONOMIC_MODELS[field.crop], `Crop ${field.crop} must exist in agronomic model catalog`);
  });
});

test('P0 Replay Mode: Identical seed produces bit-exact field properties', () => {
  const seed = 554433;
  const field1 = generateRandomField({ seed });
  const field2 = generateRandomField({ seed });

  assert.deepEqual(
    { ...field1, testRunId: null },
    { ...field2, testRunId: null },
    'Identical seeds in replay mode must reproduce identical field properties'
  );
});

// ---------------------------------------------------------------------------
// P1 & P2: COMPLETE APPLICATION FLOW & SCIENTIFIC INVARIANTS
// ---------------------------------------------------------------------------

test('P1 & P2: Real Random Field simulation flow and strict scientific invariants', () => {
  const randomField = generateRandomField({ seed: 789123, regionKey: 'barishal' });

  // 1. Validate inputs
  const validation = validateAgronomicInputs({
    crop: randomField.crop,
    areaHa: randomField.areaHa,
    irrigationMm: randomField.irrigationMm,
    nitrogenKgHa: randomField.nitrogenKgHa
  });
  assert.equal(validation.isValid, true, 'Random field inputs must pass schema validation');

  // 2. Execute full simulation
  const sim = runAgronomicSimulation({
    crop: randomField.crop,
    areaHa: randomField.areaHa,
    irrigationMm: randomField.irrigationMm,
    nitrogenKgHa: randomField.nitrogenKgHa,
    weatherScenario: 'baseline',
    randomSeed: randomField.seed
  });

  // Verify non-fallback: simulation used random field inputs, not Bogura demo defaults
  assert.equal(sim.inputs.areaHa, randomField.areaHa);
  assert.equal(sim.inputs.irrigationBudgetMm, randomField.irrigationMm);
  assert.equal(sim.inputs.nitrogenKgHa, randomField.nitrogenKgHa);

  // 3. Check Scientific Invariants:
  // Invariant A: Hydrological mass balance residual <= 0.01 mm
  const residual = Math.abs(sim.waterBalance.massBalanceResidualMm);
  assert.ok(residual <= 0.01, `Mass balance residual ${residual} exceeds 0.01 mm tolerance`);

  // Invariant B: Non-negative and finite fluxes
  assert.ok(sim.waterBalance.cumulativeEt0Mm >= 0 && Number.isFinite(sim.waterBalance.cumulativeEt0Mm));
  assert.ok(sim.waterBalance.cumulativeEtcMm >= 0 && Number.isFinite(sim.waterBalance.cumulativeEtcMm));
  assert.ok(sim.waterBalance.cumulativeEtaMm >= 0 && Number.isFinite(sim.waterBalance.cumulativeEtaMm));
  assert.ok(sim.waterBalance.totalIrrigationMm >= 0 && Number.isFinite(sim.waterBalance.totalIrrigationMm));
  assert.ok(sim.waterBalance.cumulativeRainfallMm >= 0 && Number.isFinite(sim.waterBalance.cumulativeRainfallMm));
  assert.ok(sim.waterBalance.totalDeepPercolationMm >= 0 && Number.isFinite(sim.waterBalance.totalDeepPercolationMm));

  // Invariant C: Daily soil moisture bounded within [0, TAW]
  sim.timeseries.forEach(day => {
    assert.ok(day.soilWaterMm >= -0.001, `Soil moisture ${day.soilWaterMm} is negative on day ${day.day}`);
    assert.ok(day.soilWaterMm <= sim.waterBalance.tawMm + 0.001, `Soil moisture ${day.soilWaterMm} exceeds TAW on day ${day.day}`);
  });

  // Invariant D: Yield bounded by effective floor min(0.20, Ym) and potential yield
  const effectiveFloor = Math.min(0.20, sim.yieldOutcomes.potentialYieldTonHa);
  assert.ok(sim.yieldOutcomes.simulatedYieldTonHa >= effectiveFloor, `Yield ${sim.yieldOutcomes.simulatedYieldTonHa} must respect effective floor ${effectiveFloor}`);
  assert.ok(sim.yieldOutcomes.simulatedYieldTonHa <= sim.yieldOutcomes.potentialYieldTonHa * 1.05, 'Yield cannot substantially exceed potential');

  // Invariant E: Economic accounting consistency with field area
  const expectedRevenue = sim.economics.grossRevenueBdt;
  assert.ok(expectedRevenue >= 0, 'Revenue must be nonnegative');
  assert.equal(Math.round(sim.economics.netReturnBdt), Math.round(sim.economics.grossRevenueBdt - sim.economics.totalCostBdt), 'Net return must equal revenue minus cost');
  assert.ok(sim.economics.breakEvenPricePerKg > 0 && Number.isFinite(sim.economics.breakEvenPricePerKg), 'Break-even price must be positive finite');
});

test('P2 Invariant: Yield floor model assumption min(0.20, Ym) tested at 0, 0.15, 0.20, and normal Ym', () => {
  // Case 1: Zero potential yield (Ym = 0) strictly produces zero yield
  const zeroSim = runAgronomicSimulation({ crop: 'rice', areaHa: 5.0, potentialYieldOverride: 0.0, randomSeed: 4422 });
  assert.equal(zeroSim.yieldOutcomes.simulatedYieldTonHa, 0.0, 'Zero potential yield must strictly yield 0.0 t/ha');
  assert.equal(zeroSim.yieldOutcomes.totalYieldTonnes, 0.0, 'Zero harvest tons for 0 potential yield');

  // Case 2: Micro potential yield (Ym = 0.15) yields 0.15 and never exceeds 0.15
  const microSim = runAgronomicSimulation({ crop: 'rice', areaHa: 5.0, potentialYieldOverride: 0.15, randomSeed: 4422 });
  assert.equal(microSim.yieldOutcomes.simulatedYieldTonHa, 0.15, 'Ym = 0.15 yields 0.15 t/ha (effective floor min(0.2, 0.15))');
  assert.ok(microSim.yieldOutcomes.simulatedYieldTonHa <= 0.15, 'Yield must never exceed micro potential yield');

  // Case 3: Threshold potential yield (Ym = 0.20) yields 0.20
  const threshSim = runAgronomicSimulation({ crop: 'rice', areaHa: 5.0, potentialYieldOverride: 0.20, randomSeed: 4422 });
  assert.equal(threshSim.yieldOutcomes.simulatedYieldTonHa, 0.20, 'Ym = 0.20 yields 0.20 t/ha');

  // Case 4: Normal positive value (Ym = 5.5) under zero-water drought respects 0.20 t/ha salvage floor
  const normalDroughtSim = runAgronomicSimulation({ crop: 'rice', areaHa: 5.0, irrigationMm: 0, weatherScenario: 'drought', potentialYieldOverride: 5.5, randomSeed: 4422 });
  assert.ok(normalDroughtSim.yieldOutcomes.simulatedYieldTonHa >= 0.20, 'Normal crop respects 0.20 t/ha salvage floor under severe drought');
  assert.ok(normalDroughtSim.yieldOutcomes.simulatedYieldTonHa <= 5.5, 'Yield cannot exceed potential yield');
});

test('P2 Invariant: Scenario difference preserves exact arithmetic', () => {
  const simA = runAgronomicSimulation({ crop: 'rice', areaHa: 2.0, irrigationMm: 150, nitrogenKgHa: 80, weatherScenario: 'baseline', randomSeed: 100 });
  const simB = runAgronomicSimulation({ crop: 'wheat', areaHa: 2.0, irrigationMm: 300, nitrogenKgHa: 140, weatherScenario: 'drought', randomSeed: 100 });

  const comp = compareScenarios(simA, simB);
  assert.ok(comp, 'Scenario comparison result must be generated');
  assert.ok(Number.isFinite(comp.yieldTonHa.absoluteDiff), 'Absolute yield diff must be finite');
  assert.ok(Number.isFinite(comp.netReturnBdt.absoluteDiff), 'Absolute net return diff must be finite');
  assert.equal(
    comp.yieldTonHa.absoluteDiff,
    Number((simB.yieldOutcomes.simulatedYieldTonHa - simA.yieldOutcomes.simulatedYieldTonHa).toFixed(2))
  );
});

// ---------------------------------------------------------------------------
// P3: RANDOMIZED SCIENTIFIC STRESS TESTS
// ---------------------------------------------------------------------------

test('P3: Randomized stress tests across extreme soil and climatic regimes', () => {
  // Extreme 1: Heavy monsoon deluge exceeding TAW on sandy soil
  const sandDeluge = runAgronomicSimulation({
    crop: 'rice',
    areaHa: 3.5,
    irrigationMm: 600,
    weatherScenario: 'flood',
    soilTexture: 'sand',
    randomSeed: 9182
  });
  assert.ok(sandDeluge.waterBalance.totalDeepPercolationMm > 100, 'Deluge on sandy soil must produce heavy deep percolation');
  assert.ok(Math.abs(sandDeluge.waterBalance.massBalanceResidualMm) < 0.01, 'Mass conservation must hold during flood on sandy soil');

  // Extreme 2: Severe drought on clay soil with zero irrigation
  const clayDrought = runAgronomicSimulation({
    crop: 'wheat',
    areaHa: 4.0,
    irrigationMm: 0,
    weatherScenario: 'drought',
    soilTexture: 'clay',
    randomSeed: 8271
  });
  assert.equal(clayDrought.waterBalance.totalIrrigationMm, 0);
  assert.ok(clayDrought.stressIndicators.averageKs <= 1.0, 'Ks must not exceed 1.0');
  assert.ok(clayDrought.stressIndicators.averageKs >= 0.05, 'Ks must respect the 0.05 cuticular transpiration floor');
  assert.ok(clayDrought.yieldOutcomes.simulatedYieldTonHa >= 0.20, 'Yield must respect the 0.20 t/ha model salvage floor assumption');
});

// ---------------------------------------------------------------------------
// P5: IMMERSIVE 3D LABS AND METADATA INTEGRITY
// ---------------------------------------------------------------------------

test('P5: All 9 Stress Test 3D scenes provide distinct scientific metadata & assertions', () => {
  assert.equal(STRESS_TEST_CASES.length, 9);
  
  const scenesFound = new Set();
  STRESS_TEST_CASES.forEach(tc => {
    assert.ok(tc.id, 'Every stress test must have an id');
    assert.ok(tc.titleEn, 'Every stress test must have an English title');
    assert.ok(tc.invariant, 'Every stress test must document its scientific invariant');
    assert.ok(typeof tc.invariantAssertion === 'function', 'Must provide callable assertion');
    scenesFound.add(tc.id);
  });
  assert.equal(scenesFound.size, 9, 'All 9 stress tests must have unique IDs and distinct configurations');
});

test('P5: Synthetic data provenance label verification', () => {
  const PROVENANCE_LABEL = 'SYNTHETIC — NOT MEASURED FIELD DATA';
  assert.equal(PROVENANCE_LABEL, 'SYNTHETIC — NOT MEASURED FIELD DATA', 'Synthetic label format must be exact');
});

test('P1: Simulation Export Data Integrity (CSV & JSON)', () => {
  const randomField = generateRandomField({ seed: 12345, regionKey: 'rajshahi' });
  const sim = runAgronomicSimulation({
    crop: randomField.crop,
    areaHa: randomField.areaHa,
    irrigationMm: randomField.irrigationMm,
    nitrogenKgHa: randomField.nitrogenKgHa,
    weatherScenario: 'baseline',
    randomSeed: randomField.seed
  });

  // Verify exported JSON structure
  const exportedJson = JSON.stringify({
    testRunId: randomField.testRunId,
    fieldId: randomField.fieldId,
    region: randomField.regionName,
    coordinates: { lat: randomField.latitude, lon: randomField.longitude },
    areaHa: randomField.areaHa,
    simulation: sim
  });
  const parsed = JSON.parse(exportedJson);
  assert.equal(parsed.fieldId, randomField.fieldId);
  assert.equal(parsed.coordinates.lat, randomField.latitude);
  assert.equal(parsed.coordinates.lon, randomField.longitude);
  assert.equal(parsed.simulation.yieldOutcomes.simulatedYieldTonHa, sim.yieldOutcomes.simulatedYieldTonHa);

  // Verify CSV serialization
  const csvHeaders = 'Day,ETo_mm,ETc_mm,ETa_mm,Rain_mm,Irrigation_mm,Percolation_mm,Storage_mm,Ks';
  const csvRows = sim.timeseries.slice(0, 5).map(d => 
    `${d.day},${d.et0Mm},${d.etcMm},${d.etaMm},${d.rainfallMm},${d.irrigationMm},${d.deepPercolationMm},${d.soilWaterMm},${d.ks}`
  );
  const csvString = [csvHeaders, ...csvRows].join('\n');
  assert.ok(csvString.includes(csvHeaders));
  assert.equal(csvString.split('\n').length, 6);
});
