import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatNumber,
  toCanonicalStrategyKey,
  convertPrice,
  calculateProfitability,
  KG_PER_MAUND,
  KG_PER_TON,
} from './marketUtils.js';

test('toCanonicalStrategyKey maps aliases correctly', () => {
  assert.equal(toCanonicalStrategyKey('profit'), 'profit_focused');
  assert.equal(toCanonicalStrategyKey('water'), 'water_efficiency');
  assert.equal(toCanonicalStrategyKey('water_focused'), 'water_efficiency');
  assert.equal(toCanonicalStrategyKey('soil'), 'soil_health');
  assert.equal(toCanonicalStrategyKey('soil_focused'), 'soil_health');
  assert.equal(toCanonicalStrategyKey('balanced'), 'balanced');
  assert.equal(toCanonicalStrategyKey('balanced_multi_objective'), 'balanced');
});

test('formatNumber handles numeric and fallback cases safely', () => {
  assert.equal(formatNumber(12.3456, 2), '12.35');
  assert.equal(formatNumber(0, 1), '0.0');
  assert.equal(formatNumber(null, 2, 'N/A'), 'N/A');
  assert.equal(formatNumber(undefined, 2, 'N/A'), 'N/A');
  assert.equal(formatNumber(NaN, 2, 'N/A'), 'N/A');
  assert.equal(formatNumber(Infinity, 2, 'N/A'), 'N/A');
});

test('profitability math calculates gross revenue, net returns, and breakeven correctly', () => {
  const result = calculateProfitability({
    areaHa: 2.5,
    expectedYieldTHa: 4.0,
    farmgatePriceBdtT: 26000.0,
    productionCostBdtHa: 80000.0,
    irrigationCostBdtHa: 5000.0,
    marketingCostBdtHa: 2000.0,
  });

  assert.equal(result.totalYieldTons, 10.0);
  assert.equal(result.grossRevenue, 260000.0);
  assert.equal(result.totalCost, 217500.0);
  assert.equal(result.netReturn, 42500.0);
  assert.equal(result.breakevenPriceBdtT, 21750.0);
  assert.equal(result.breakevenPriceBdtKg, 21.75);
});

test('market unit conversion factors align with Bangladesh agricultural trade', () => {
  assert.equal(convertPrice(25.0, 'bdt_kg', 'bdt_maund'), 1000.0);
  assert.equal(convertPrice(1000.0, 'bdt_maund', 'bdt_ton'), 25000.0);
  assert.equal(convertPrice(25000.0, 'bdt_ton', 'bdt_kg'), 25.0);
});

test('demand status transparency verifies unavailable state without fabrication', () => {
  const demandSignal = {
    status: 'unavailable',
    message: 'Demand data unavailable.',
  };

  assert.equal(demandSignal.status, 'unavailable');
  assert.match(demandSignal.message, /Demand data unavailable/);
  // Ensure no fabricated score exists
  assert.equal(demandSignal.score, undefined);
  assert.equal(demandSignal.buyer_count, undefined);
});
