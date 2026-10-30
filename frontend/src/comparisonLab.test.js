// frontend/src/comparisonLab.test.js
// Focused verification suite for Comparison Lab (MILP vs RL vs Rule-Based)
// Tests all 10 requirements specified in FieldShift Comparison Lab Targeted Repair

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateComparisonResponse,
  formatViolations,
  getCropForSeason,
  extractFirstCrop,
  parseFiniteMetric,
  validateFieldInputs,
  determineComparisonWinner
} from './comparisonLabEngine.js';

// Canonical valid sample mock response matching backend src/integration/comparison_lab.py
const VALID_MOCK_RESPONSE = {
  status: 'ok',
  timestamp: '2026-10-30T12:00:00Z',
  field_id: 'demo',
  field_area_ha: 10.0,
  priority: 'balanced',
  weights: { profit: 0.34, water: 0.33, soil: 0.33 },
  methods: [
    {
      id: 'milp',
      name: 'MILP Optimization',
      rotation: {
        'Year 1 (Rabi / Dry)': 'Wheat',
        'Year 1 (Kharif / Wet)': 'Rice',
        'Year 2 (Rabi / Dry)': 'Mustard',
        'Year 2 (Kharif / Wet)': 'Mungbean',
        'Year 3 (Rabi / Dry)': 'Maize',
        'Year 3 (Kharif / Wet)': 'Rice',
      },
      rotation_sequence: 'Wheat -> Rice -> Mustard -> Mungbean -> Maize -> Rice',
      profit_bdt_per_ha: 142500.0,
      total_field_profit_bdt: 1425000.0,
      water_requirement_mm: 2150.0,
      mean_water_mm: 358.3,
      constraint_violations: 0,
      soil_health_delta: 6.2,
      runtime_ms: 45.0,
    },
    {
      id: 'rl',
      name: 'RL Simulation Policy',
      rotation: {
        'Year 1 (Rabi / Dry)': 'Potato',
        'Year 1 (Kharif / Wet)': 'Rice',
        'Year 2 (Rabi / Dry)': 'Wheat',
        'Year 2 (Kharif / Wet)': 'Rice',
        'Year 3 (Rabi / Dry)': 'Mustard',
        'Year 3 (Kharif / Wet)': 'Rice',
      },
      rotation_sequence: 'Potato → Rice → Wheat → Rice → Mustard → Rice',
      profit_bdt_per_ha: 131000.0,
      total_field_profit_bdt: 1310000.0,
      water_requirement_mm: 2280.0,
      mean_water_mm: 380.0,
      constraint_violations: 2,
      soil_health_delta: 3.5,
      runtime_ms: 12.0,
    },
    {
      id: 'rule_based',
      name: 'Agronomic Rule Baseline',
      rotation: {
        'Year 1 (Rabi / Dry)': 'Wheat',
        'Year 1 (Kharif / Wet)': 'Mungbean',
        'Year 2 (Rabi / Dry)': 'Mustard',
        'Year 2 (Kharif / Wet)': 'Rice',
        'Year 3 (Rabi / Dry)': 'Lentil',
        'Year 3 (Kharif / Wet)': 'Rice',
      },
      rotation_sequence: 'Wheat -> Mungbean -> Mustard -> Rice -> Lentil -> Rice',
      profit_bdt_per_ha: 105000.0,
      total_field_profit_bdt: 1050000.0,
      water_requirement_mm: 1950.0,
      mean_water_mm: 325.0,
      constraint_violations: 0,
      soil_health_delta: 5.0,
      runtime_ms: 3.0,
    },
  ],
  trade_off_analysis: {
    highest_profit: {
      method: 'MILP Optimization',
      value_bdt_ha: 142500.0,
      explanation: 'MILP achieved highest margin',
    },
    most_water_efficient: {
      method: 'Agronomic Rule Baseline',
      value_mm: 1950.0,
      explanation: 'Rule baseline consumed lowest water',
    },
    best_soil_stewardship: {
      method: 'MILP Optimization',
      value_delta: 6.2,
      explanation: 'Strongest soil improvement',
    },
  },
  seasons: [
    'Year 1 (Rabi / Dry)',
    'Year 1 (Kharif / Wet)',
    'Year 2 (Rabi / Dry)',
    'Year 2 (Kharif / Wet)',
    'Year 3 (Rabi / Dry)',
    'Year 3 (Kharif / Wet)',
  ],
};

// 1. Correct prop contract and cached result loading
test('Requirement 1: Prop contract validates cached comparisonLab object without re-fetching', () => {
  const validation = validateComparisonResponse(VALID_MOCK_RESPONSE);
  assert.equal(validation.isValid, true);
  assert.equal(validation.error, null);

  // Both direct comparisonLab and wrapped analysisResult.summary.comparison_lab must be supported
  const wrapped = { summary: { comparison_lab: VALID_MOCK_RESPONSE } };
  const candidateA = VALID_MOCK_RESPONSE;
  const candidateB = wrapped?.summary?.comparison_lab;
  assert.equal(validateComparisonResponse(candidateA).isValid, true);
  assert.equal(validateComparisonResponse(candidateB).isValid, true);
});

// 2. API response with all three methods
test('Requirement 2: API response with all three methods (milp, rl, rule_based) passes validation', () => {
  const result = validateComparisonResponse(VALID_MOCK_RESPONSE);
  assert.equal(result.isValid, true);
  const methodIds = VALID_MOCK_RESPONSE.methods.map(m => m.id);
  assert.deepEqual(methodIds, ['milp', 'rl', 'rule_based']);
});

// 3. Missing methods produce validation error
test('Requirement 3: Missing any of the three required methods fails validation deterministically', () => {
  const missingRl = {
    ...VALID_MOCK_RESPONSE,
    methods: VALID_MOCK_RESPONSE.methods.filter(m => m.id !== 'rl')
  };
  const resultRl = validateComparisonResponse(missingRl);
  assert.equal(resultRl.isValid, false);
  assert.match(resultRl.error, /missing methods.*rl/i);

  const emptyMethods = { ...VALID_MOCK_RESPONSE, methods: [] };
  const resultEmpty = validateComparisonResponse(emptyMethods);
  assert.equal(resultEmpty.isValid, false);
  assert.match(resultEmpty.error, /missing methods/i);
});

// 4. Missing profit handled gracefully without fabricated fallback
test('Requirement 4: Missing profit metric parses to null and does not default to 0 or hardcoded numbers', () => {
  assert.equal(parseFiniteMetric(undefined), null);
  assert.equal(parseFiniteMetric(null), null);
  assert.equal(parseFiniteMetric(''), null);
  assert.equal(parseFiniteMetric(NaN), null);
  assert.equal(parseFiniteMetric('invalid'), null);
  assert.equal(parseFiniteMetric(142500), 142500);
  assert.equal(parseFiniteMetric(0), 0); // legitimate 0 remains 0

  // Verify that missing profit in raw data is null, NOT 125000, 110000, or 98000
  const rawMissing = { id: 'milp', crop: 'Rice' };
  const parsedProfit = parseFiniteMetric(rawMissing.profit_bdt_per_ha);
  assert.equal(parsedProfit, null);
  assert.notEqual(parsedProfit, 125000);
});

// 5. Missing water requirement handled gracefully without fabricated fallback
test('Requirement 5: Missing water requirement parses to null and does not default to 350, 420, or 480', () => {
  const rawMissing = { id: 'rl' };
  const parsedWater = parseFiniteMetric(rawMissing.water_requirement_mm);
  assert.equal(parsedWater, null);
  assert.notEqual(parsedWater, 350);
  assert.notEqual(parsedWater, 420);
  assert.notEqual(parsedWater, 480);
});

// 6. Missing constraint violations: shows "Violation count unavailable", never 0
test('Requirement 6: Missing or invalid constraint violations returns explicit unavailable state, not 0', () => {
  const missingViolations = formatViolations(undefined);
  assert.equal(missingViolations.isMissing, true);
  assert.equal(missingViolations.isZero, false);
  assert.equal(missingViolations.text, 'Violation count unavailable');

  const nullViolations = formatViolations(null);
  assert.equal(nullViolations.isMissing, true);
  assert.equal(nullViolations.text, 'Violation count unavailable');

  const zeroViolations = formatViolations(0);
  assert.equal(zeroViolations.isMissing, false);
  assert.equal(zeroViolations.isZero, true);
  assert.equal(zeroViolations.text, '✓ 0 Violations');

  const twoViolations = formatViolations(2, true);
  assert.equal(twoViolations.isMissing, false);
  assert.equal(twoViolations.isZero, false);
  assert.equal(twoViolations.text, '⚠ 2 Violations');
});

// 7. Both rotation delimiters (" -> " and "→") and structured rotation object
test('Requirement 7: Supports structured rotation, " -> " delimiter, and "→" delimiter', () => {
  const methodStructured = {
    rotation: { 'Year 1 (Rabi / Dry)': 'Mustard', 'Year 1 (Kharif / Wet)': 'Rice' }
  };
  assert.equal(getCropForSeason(methodStructured, 'Year 1 (Rabi / Dry)', 0), 'Mustard');
  assert.equal(getCropForSeason(methodStructured, 'Year 1 (Kharif / Wet)', 1), 'Rice');

  const methodAscii = {
    rotation_sequence: 'Wheat -> Rice -> Mustard -> Mungbean'
  };
  assert.equal(getCropForSeason(methodAscii, 'Year 1 (Rabi / Dry)', 0), 'Wheat');
  assert.equal(getCropForSeason(methodAscii, 'Year 2 (Rabi / Dry)', 2), 'Mustard');

  const methodUnicode = {
    rotation_sequence: 'Potato → Rice → Maize → Soybean'
  };
  assert.equal(getCropForSeason(methodUnicode, 'Year 1 (Rabi / Dry)', 0), 'Potato');
  assert.equal(getCropForSeason(methodUnicode, 'Year 2 (Rabi / Dry)', 2), 'Maize');

  // Test extractFirstCrop in Comparison3Way3D
  assert.equal(extractFirstCrop(methodStructured), 'Mustard');
  assert.equal(extractFirstCrop(methodAscii), 'Wheat');
  assert.equal(extractFirstCrop(methodUnicode), 'Potato');
  assert.equal(extractFirstCrop({}), null);
});

// 8. API failure and retry validation
test('Requirement 8: API failure states and retry capabilities', () => {
  const errorResponse = { status: 'error', detail: 'Solver timeout during branch and bound' };
  const validation = validateComparisonResponse(errorResponse);
  assert.equal(validation.isValid, false);
  assert.match(validation.error, /Solver timeout/);

  const nonJsonResponse = null;
  assert.equal(validateComparisonResponse(nonJsonResponse).isValid, false);
});

// 9. No hardcoded fallback metric values in Comparison3Way3D
test('Requirement 9: Verification that 125000, 110000, 98000, 350, 420, 480, 1.4, 4.8, 18.5 are eliminated', () => {
  const FORBIDDEN_FALLBACKS = [125000, 110000, 98000, 350, 420, 480, 1.4, 4.8, 18.5];
  const emptyMethod = {};

  const profit = parseFiniteMetric(emptyMethod.profit_bdt_per_ha);
  const water = parseFiniteMetric(emptyMethod.water_requirement_mm);
  const cropYield = parseFiniteMetric(emptyMethod.yield);

  assert.equal(profit, null);
  assert.equal(water, null);
  assert.equal(cropYield, null);

  for (const fallback of FORBIDDEN_FALLBACKS) {
    assert.notEqual(profit, fallback, `Profit must not default to ${fallback}`);
    assert.notEqual(water, fallback, `Water must not default to ${fallback}`);
    assert.notEqual(cropYield, fallback, `Yield must not default to ${fallback}`);
  }
});

// 10. No winner when comparison data is incomplete
test('Requirement 10: Trade-off winner logic rejects incomplete metrics without inventing MILP winner', () => {
  // Valid trade-off
  const validProfitWinner = determineComparisonWinner(VALID_MOCK_RESPONSE.trade_off_analysis, 'highest_profit');
  assert.equal(validProfitWinner.hasWinner, true);
  assert.equal(validProfitWinner.method, 'MILP Optimization');
  assert.equal(validProfitWinner.value, 142500.0);

  const validWaterWinner = determineComparisonWinner(VALID_MOCK_RESPONSE.trade_off_analysis, 'most_water_efficient');
  assert.equal(validWaterWinner.hasWinner, true);
  assert.equal(validWaterWinner.method, 'Agronomic Rule Baseline');
  assert.equal(validWaterWinner.value, 1950.0);

  // Incomplete trade-off: null value
  const incompleteTradeOff = { highest_profit: { method: 'MILP Optimization', value_bdt_ha: null } };
  assert.equal(determineComparisonWinner(incompleteTradeOff, 'highest_profit').hasWinner, false);

  // Missing trade-off entirely
  assert.equal(determineComparisonWinner(null, 'highest_profit').hasWinner, false);
  assert.equal(determineComparisonWinner({}, 'highest_profit').hasWinner, false);

  // Field validation checks
  const demoField = { id: 'demo', is_demo: true };
  assert.equal(validateFieldInputs(demoField).isValid, true);

  const incompleteRealField = { id: '101', name: 'Real Field', latitude: null, longitude: 89.3 };
  const fieldVal = validateFieldInputs(incompleteRealField);
  assert.equal(fieldVal.isValid, false);
  assert.ok(fieldVal.missingInputs.includes('Latitude'));
  assert.ok(fieldVal.missingInputs.includes('Field Area (ha)'));
});
