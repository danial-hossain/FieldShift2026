export function formatNumber(val, digits = 2, fallback = 'Not available') {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return n.toFixed(digits);
}

export function toCanonicalStrategyKey(key) {
  if (!key) return 'balanced';
  const k = String(key).toLowerCase().trim();
  if (k === 'profit' || k === 'profit_focused') return 'profit_focused';
  if (k === 'water' || k === 'water_focused' || k === 'water_efficiency') return 'water_efficiency';
  if (k === 'soil' || k === 'soil_focused' || k === 'soil_health') return 'soil_health';
  if (k === 'balanced' || k === 'balanced_multi_objective') return 'balanced';
  return k;
}

export const KG_PER_MAUND = 40.0;
export const KG_PER_TON = 1000.0;
export const MAUND_PER_TON = 25.0;

export function convertPrice(val, fromUnit, toUnit) {
  if (fromUnit === toUnit) return val;
  let pricePerKg = val;
  if (fromUnit === 'bdt_maund') pricePerKg = val / KG_PER_MAUND;
  else if (fromUnit === 'bdt_ton') pricePerKg = val / KG_PER_TON;

  if (toUnit === 'bdt_kg') return Math.round(pricePerKg * 100) / 100;
  if (toUnit === 'bdt_maund') return Math.round(pricePerKg * KG_PER_MAUND * 100) / 100;
  if (toUnit === 'bdt_ton') return Math.round(pricePerKg * KG_PER_TON * 100) / 100;
  return pricePerKg;
}

export function calculateProfitability({
  areaHa = 1.0,
  expectedYieldTHa = 4.0,
  farmgatePriceBdtT = 26000.0,
  productionCostBdtHa = 80000.0,
  irrigationCostBdtHa = 0.0,
  marketingCostBdtHa = 0.0,
}) {
  const totalYieldTons = areaHa * expectedYieldTHa;
  const grossRevenue = totalYieldTons * farmgatePriceBdtT;
  const costPerHa = productionCostBdtHa + irrigationCostBdtHa + marketingCostBdtHa;
  const totalCost = costPerHa * areaHa;
  const netReturn = grossRevenue - totalCost;
  const breakevenPriceBdtT = expectedYieldTHa > 0 ? costPerHa / expectedYieldTHa : null;

  return {
    totalYieldTons,
    grossRevenue,
    grossRevenuePerHa: grossRevenue / areaHa,
    totalCost,
    totalCostPerHa: costPerHa,
    netReturn,
    netReturnPerHa: netReturn / areaHa,
    breakevenPriceBdtT,
    breakevenPriceBdtKg: breakevenPriceBdtT ? breakevenPriceBdtT / KG_PER_TON : null,
  };
}
