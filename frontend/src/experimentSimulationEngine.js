// frontend/src/experimentSimulationEngine.js
// Scientific, deterministic crop & irrigation scenario simulation engine for FieldShift Research Lab
//
// Hydrological & Agronomic Formulations:
// 1. Root Zone Total Available Water:
//    TAW = 1000 * (theta_FC - theta_WP) * Z_r = soilAWC * Z_r (mm)
// 2. Readily Available Water:
//    RAW = p * TAW (mm), where p is crop-specific depletion fraction without stress.
// 3. Stress Threshold in Remaining Available Water:
//    S_threshold = TAW - RAW = (1 - p) * TAW (mm).
// 4. Daily Hydrological Balance (FAO-56 Chapter 8):
//    Infiltrated = min(TAW, S_{t-1} + Rainfall_t + Irrigation_t)
//    Deep Percolation = max(0, S_{t-1} + Rainfall_t + Irrigation_t - TAW)
//    If Infiltrated >= S_threshold: K_s = 1.0 (No moisture stress)
//    If Infiltrated < S_threshold:  K_s = max(0.05, Infiltrated / S_threshold)
//    ET_a = K_s * ET_c = K_s * (K_c * ET_0)
//    S_t = max(0, Infiltrated - ET_a)
// 5. FAO-33 Stewart Yield Reduction Model:
//    (1 - Y_a / Y_m) = K_y * max(0, 1 - sum(ET_a) / sum(ET_c))
// 6. Agricultural Economics:
//    Gross Revenue = Yield (t/ha) * 25 maunds/t * Selling Price (BDT/maund)
//    Total Cost = Seed + Fertilizer + Irrigation + Labor + Machinery
//    Net Return = Gross Revenue - Total Cost
//    Break-even Price/kg = Total Cost / (Yield * 1000 kg)
//    Water Productivity = Yield (kg) / Total Water Received (m^3)

export const CROP_AGRONOMIC_MODELS = {
  rice: {
    id: 'rice',
    nameEn: 'Aman / Boro Rice',
    nameBn: 'আমন / বোরো ধান',
    potentialYieldTonHa: 5.5,
    ky: 1.10, // FAO-33 Table 24 yield response factor
    kcIni: 0.50,
    kcMid: 1.15,
    kcEnd: 0.70,
    depletionFractionP: 0.25, // Shallow roots, high sensitivity (FAO-56 Table 22)
    rootDepthM: 0.50, // Effective rooting depth in meters
    optimalWaterMm: 450,
    seedCostPerHa: 4500,
    baseLaborCostPerHa: 28000,
    baseFertilizerCostPerHa: 14500,
    defaultPricePerMaund: 1250, // BDT/maund (40 kg)
    provenance: 'BRRI / FAO-33 / FAO-56 calibrated benchmark (Illustrative agronomic model)'
  },
  wheat: {
    id: 'wheat',
    nameEn: 'Wheat (BARI Gom-33)',
    nameBn: 'গম (বারি গম-৩৩)',
    potentialYieldTonHa: 4.2,
    ky: 1.05, // FAO-33 Table 24
    kcIni: 0.40,
    kcMid: 1.15,
    kcEnd: 0.35,
    depletionFractionP: 0.55,
    rootDepthM: 1.00,
    optimalWaterMm: 280,
    seedCostPerHa: 5200,
    baseLaborCostPerHa: 18000,
    baseFertilizerCostPerHa: 12000,
    defaultPricePerMaund: 1450,
    provenance: 'BARI / FAO-33 / FAO-56 calibrated benchmark (Illustrative agronomic model)'
  },
  maize: {
    id: 'maize',
    nameEn: 'Hybrid Maize',
    nameBn: 'হাইব্রিড ভুট্টা',
    potentialYieldTonHa: 10.5,
    ky: 1.25, // High water sensitivity during silking/tasseling (FAO-33)
    kcIni: 0.40,
    kcMid: 1.20,
    kcEnd: 0.50,
    depletionFractionP: 0.55,
    rootDepthM: 1.20,
    optimalWaterMm: 400,
    seedCostPerHa: 8500,
    baseLaborCostPerHa: 22000,
    baseFertilizerCostPerHa: 19500,
    defaultPricePerMaund: 1100,
    provenance: 'DAE / BARI / FAO-33 calibrated benchmark (Illustrative agronomic model)'
  },
  mustard: {
    id: 'mustard',
    nameEn: 'Mustard (BARI Sarisha-14)',
    nameBn: 'সরিষা (বারি সরিষা-১৪)',
    potentialYieldTonHa: 1.8,
    ky: 0.95, // Oilseed moderate response factor
    kcIni: 0.35,
    kcMid: 1.10,
    kcEnd: 0.35,
    depletionFractionP: 0.60, // Taproot with moderate drought tolerance
    rootDepthM: 1.00,
    optimalWaterMm: 180,
    seedCostPerHa: 3000,
    baseLaborCostPerHa: 12000,
    baseFertilizerCostPerHa: 8500,
    defaultPricePerMaund: 3200,
    provenance: 'BARI Oilseed Research / FAO-33 calibrated benchmark'
  },
  potato: {
    id: 'potato',
    nameEn: 'Potato (Diamant)',
    nameBn: 'গোল আলু (ডায়মন্ট)',
    potentialYieldTonHa: 25.0,
    ky: 1.10, // Sensitive to water deficit during tuber bulking
    kcIni: 0.50,
    kcMid: 1.15,
    kcEnd: 0.75,
    depletionFractionP: 0.35, // Shallow roots, high moisture requirement
    rootDepthM: 0.50,
    optimalWaterMm: 350,
    seedCostPerHa: 38000,
    baseLaborCostPerHa: 26000,
    baseFertilizerCostPerHa: 24000,
    defaultPricePerMaund: 900,
    provenance: 'BARI Tuber Crops Research / FAO-33 benchmark'
  },
  lentil: {
    id: 'lentil',
    nameEn: 'Lentil (BARI Masur-8)',
    nameBn: 'মসুর ডাল (বারি মসুর-৮)',
    potentialYieldTonHa: 1.6,
    ky: 0.85, // Low water sensitivity, hardy pulse
    kcIni: 0.40,
    kcMid: 1.05,
    kcEnd: 0.40,
    depletionFractionP: 0.60,
    rootDepthM: 0.80,
    optimalWaterMm: 160,
    seedCostPerHa: 4200,
    baseLaborCostPerHa: 13000,
    baseFertilizerCostPerHa: 7500,
    defaultPricePerMaund: 4000,
    provenance: 'BARI Pulses Research / FAO-33 benchmark'
  }
};

export const WEATHER_SCENARIO_MODIFIERS = {
  baseline: {
    id: 'baseline',
    nameEn: 'Historical Normal (NASA POWER 30-yr)',
    nameBn: 'স্বাভাবিক ঐতিহাসিক আবহাওয়া',
    tempDeltaC: 0.0,
    rainfallFactor: 1.0,
    et0Modifier: 1.0
  },
  warming_1_5c: {
    id: 'warming_1_5c',
    nameEn: '+1.5°C Climate Warming',
    nameBn: '+১.৫°সে বৈশ্বিক উষ্ণায়ন',
    tempDeltaC: 1.5,
    rainfallFactor: 0.95,
    et0Modifier: 1.08
  },
  drought_20pct: {
    id: 'drought_20pct',
    nameEn: 'Moderate Drought (-20% Rain, +1.0°C)',
    nameBn: 'খরা পরিস্থিতি (২০% বৃষ্টিপাত হ্রাস)',
    tempDeltaC: 1.0,
    rainfallFactor: 0.80,
    et0Modifier: 1.12
  },
  heavy_monsoon: {
    id: 'heavy_monsoon',
    nameEn: 'Excess Monsoon (+25% Rain, Low Radiation)',
    nameBn: 'অতিরিক্ত বর্ষা (২৫% অতিবৃষ্টি)',
    tempDeltaC: -0.5,
    rainfallFactor: 1.25,
    et0Modifier: 0.92
  },
  extreme_heatwave: {
    id: 'extreme_heatwave',
    nameEn: 'Extreme Heatwave (+3.0°C, Severe ET0)',
    nameBn: 'তীব্র তাপপ্রবাহ (+৩.০°সে ও উচ্চ বাষ্পীভবন)',
    tempDeltaC: 3.0,
    rainfallFactor: 0.75,
    et0Modifier: 1.22
  }
};

/**
 * Deterministic pseudo-random number generator for reproducible stochastic weather series
 */
export function createSeededRandom(seed = 42) {
  let s = Math.abs(seed) % 2147483647;
  if (s <= 0) s = 1;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Validates agronomic and experiment simulation inputs.
 * Returns { isValid: boolean, errors: string[], warnings: string[] }
 */
export function validateAgronomicInputs(config = {}) {
  const errors = [];
  const warnings = [];

  const checkFiniteNonNegative = (val, fieldName, allowZero = true) => {
    if (val === undefined || val === null) return;
    const num = Number(val);
    if (!Number.isFinite(num)) {
      errors.push(`${fieldName} must be a finite number (received: ${val})`);
    } else if (allowZero ? num < 0 : num <= 0) {
      errors.push(`${fieldName} must be ${allowZero ? '>= 0' : '> 0'} (received: ${num})`);
    }
  };

  // Farmer / Plot Inputs
  checkFiniteNonNegative(config.areaHa, 'areaHa', false);
  checkFiniteNonNegative(config.irrigationMm, 'irrigationMm', true);
  checkFiniteNonNegative(config.nitrogenKgHa, 'nitrogenKgHa', true);
  checkFiniteNonNegative(config.phosphorusKgHa, 'phosphorusKgHa', true);
  checkFiniteNonNegative(config.potassiumKgHa, 'potassiumKgHa', true);
  checkFiniteNonNegative(config.sellingPriceMaund, 'sellingPriceMaund', false);
  checkFiniteNonNegative(config.potentialYieldTonHa, 'potentialYieldTonHa', true);

  if (config.randomSeed !== undefined && config.randomSeed !== null) {
    if (!Number.isFinite(Number(config.randomSeed))) {
      errors.push(`randomSeed must be a finite number (received: ${config.randomSeed})`);
    }
  }

  // Crop Agronomic Overrides (if passed via config or custom crop model)
  const rootDepth = config.rootDepthM ?? config.cropModel?.rootDepthM;
  if (rootDepth !== undefined && rootDepth !== null) {
    checkFiniteNonNegative(rootDepth, 'rootDepthM', false);
  }

  const p = config.depletionFractionP ?? config.cropModel?.depletionFractionP;
  if (p !== undefined && p !== null) {
    const numP = Number(p);
    if (!Number.isFinite(numP) || numP <= 0 || numP >= 1) {
      errors.push(`depletionFractionP must be strictly between 0 and 1 (received: ${p})`);
    }
  }

  const ky = config.ky ?? config.cropModel?.ky;
  if (ky !== undefined && ky !== null) {
    checkFiniteNonNegative(ky, 'ky', true);
  }

  const kcIni = config.kcIni ?? config.cropModel?.kcIni;
  if (kcIni !== undefined && kcIni !== null) {
    checkFiniteNonNegative(kcIni, 'kcIni', false);
  }
  const kcMid = config.kcMid ?? config.cropModel?.kcMid;
  if (kcMid !== undefined && kcMid !== null) {
    checkFiniteNonNegative(kcMid, 'kcMid', false);
  }
  const kcEnd = config.kcEnd ?? config.cropModel?.kcEnd;
  if (kcEnd !== undefined && kcEnd !== null) {
    checkFiniteNonNegative(kcEnd, 'kcEnd', false);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Runs a 120-day daily agronomic simulation.
 * @param {Object} config Experiment configuration
 * @returns {Object} Complete reproducible experiment result
 */
export function runAgronomicSimulation(config = {}) {
  const validation = validateAgronomicInputs(config);

  const cropKey = (config.crop || 'rice').toLowerCase();
  const baseCropModel = CROP_AGRONOMIC_MODELS[cropKey] || CROP_AGRONOMIC_MODELS.rice;

  // Potential Yield handling:
  // If explicitly specified: must be finite and >= 0.
  // If invalid, NaN, Infinity, -Infinity, or negative, fallback to 0.0 (defensible boundary: invalid potential yield produces 0 yield)
  let potentialYieldTonHa = baseCropModel.potentialYieldTonHa;
  if (config.potentialYieldTonHa !== undefined && config.potentialYieldTonHa !== null) {
    const rawPy = Number(config.potentialYieldTonHa);
    if (Number.isFinite(rawPy) && rawPy >= 0) {
      potentialYieldTonHa = rawPy;
    } else {
      potentialYieldTonHa = 0.0;
    }
  }

  // Root depth & Depletion fraction overrides with safe fallbacks:
  let rootDepthM = Number(config.rootDepthM ?? baseCropModel.rootDepthM);
  if (!Number.isFinite(rootDepthM) || rootDepthM <= 0) {
    rootDepthM = baseCropModel.rootDepthM || 0.8;
  }

  let p = Number(config.depletionFractionP ?? baseCropModel.depletionFractionP);
  if (!Number.isFinite(p) || p <= 0 || p >= 1) {
    p = baseCropModel.depletionFractionP || 0.50;
  }

  let kcIni = Number(config.kcIni ?? baseCropModel.kcIni);
  if (!Number.isFinite(kcIni) || kcIni <= 0) kcIni = baseCropModel.kcIni || 0.5;
  let kcMid = Number(config.kcMid ?? baseCropModel.kcMid);
  if (!Number.isFinite(kcMid) || kcMid <= 0) kcMid = baseCropModel.kcMid || 1.15;
  let kcEnd = Number(config.kcEnd ?? baseCropModel.kcEnd);
  if (!Number.isFinite(kcEnd) || kcEnd <= 0) kcEnd = baseCropModel.kcEnd || 0.65;
  let ky = Number(config.ky ?? baseCropModel.ky);
  if (!Number.isFinite(ky) || ky < 0) ky = baseCropModel.ky || 1.0;

  const cropModel = {
    ...baseCropModel,
    potentialYieldTonHa,
    rootDepthM,
    depletionFractionP: p,
    kcIni,
    kcMid,
    kcEnd,
    ky
  };

  const weatherKey = config.weatherScenario || 'baseline';
  const weatherMod = WEATHER_SCENARIO_MODIFIERS[weatherKey] || WEATHER_SCENARIO_MODIFIERS.baseline;

  // Area:
  let areaHa = 10.0;
  if (config.areaHa !== undefined && config.areaHa !== null) {
    const rawArea = Number(config.areaHa);
    if (Number.isFinite(rawArea) && rawArea > 0) {
      areaHa = rawArea;
    } else {
      areaHa = 0.0;
    }
  }

  // Irrigation budget:
  let irrigationBudgetMm = 300.0;
  if (config.irrigationMm !== undefined && config.irrigationMm !== null) {
    const rawIrrig = Number(config.irrigationMm);
    if (Number.isFinite(rawIrrig) && rawIrrig >= 0) {
      irrigationBudgetMm = rawIrrig;
    } else {
      irrigationBudgetMm = 0.0;
    }
  }

  // Nitrogen (finite & non-negative; when <= 0, falls back to 0.0 unfertilized baseline, NOT 120):
  let nitrogenKgHa = 120.0;
  if (config.nitrogenKgHa !== undefined && config.nitrogenKgHa !== null) {
    const rawN = Number(config.nitrogenKgHa);
    if (Number.isFinite(rawN) && rawN >= 0) {
      nitrogenKgHa = rawN;
    } else {
      nitrogenKgHa = 0.0;
    }
  }

  let phosphorusKgHa = 60.0;
  if (config.phosphorusKgHa !== undefined && config.phosphorusKgHa !== null) {
    const rawP = Number(config.phosphorusKgHa);
    if (Number.isFinite(rawP) && rawP >= 0) phosphorusKgHa = rawP;
    else phosphorusKgHa = 0.0;
  }

  let potassiumKgHa = 60.0;
  if (config.potassiumKgHa !== undefined && config.potassiumKgHa !== null) {
    const rawK = Number(config.potassiumKgHa);
    if (Number.isFinite(rawK) && rawK >= 0) potassiumKgHa = rawK;
    else potassiumKgHa = 0.0;
  }

  let pricePerMaund = cropModel.defaultPricePerMaund;
  if (config.sellingPriceMaund !== undefined && config.sellingPriceMaund !== null) {
    const rawPrice = Number(config.sellingPriceMaund);
    if (Number.isFinite(rawPrice) && rawPrice > 0) pricePerMaund = rawPrice;
    else pricePerMaund = 0.0;
  }

  const rawSeed = Number(config.randomSeed);
  const seed = Number.isFinite(rawSeed) ? rawSeed : 2026;

  const rng = createSeededRandom(seed);
  const totalDays = 120;

  // Soil Available Water Capacity per meter depth (mm/m)
  const soilTexture = (config.soilTexture || 'loam').toLowerCase();
  let soilAwcPerMeter = 140; // Default Medium Loam (theta_FC ≈ 0.28, theta_WP ≈ 0.14)
  if (soilTexture.includes('clay')) soilAwcPerMeter = 170; // Clay Loam (theta_FC ≈ 0.35, theta_WP ≈ 0.18)
  else if (soilTexture.includes('silt')) soilAwcPerMeter = 150; // Silt Loam
  else if (soilTexture === 'sand') soilAwcPerMeter = 70; // Coarse Sand
  else if (soilTexture.includes('sand')) soilAwcPerMeter = 100; // Sandy Loam (theta_FC ≈ 0.20, theta_WP ≈ 0.10)

  // Total Available Water in Root Zone: TAW = soilAwcPerMeter * rootDepthM
  const tawMm = Number((soilAwcPerMeter * rootDepthM).toFixed(1));

  // Readily Available Water (RAW) and Stress Threshold:
  // Stress starts when depletion exceeds RAW = p * TAW, which means remaining water S < (1 - p) * TAW
  const rawMm = Number((p * tawMm).toFixed(1));
  const sThresholdMm = Number(((1 - p) * tawMm).toFixed(1));

  // Initial root zone water content (70% of TAW at planting)
  const initialSoilWaterMm = Number((tawMm * 0.70).toFixed(1));
  let currentSoilWaterMm = initialSoilWaterMm;

  // Simulation accumulators
  let cumulativeRainfallMm = 0;
  let cumulativeIrrigationMm = 0;
  let cumulativeDeepPercolationMm = 0;
  let cumulativeEt0Mm = 0;
  let cumulativeEtcMm = 0;
  let cumulativeEtaMm = 0;
  let stressDaysCount = 0;

  const dailyRecords = [];
  // 5 scheduled irrigation dates across the 120-day cycle: Days 15, 35, 55, 75, 95
  const scheduledIrrigationDays = new Set([15, 35, 55, 75, 95]);
  const irrigationPerApplication = scheduledIrrigationDays.size > 0 ? irrigationBudgetMm / scheduledIrrigationDays.size : 0;

  for (let day = 1; day <= totalDays; day++) {
    // 1. Dual Stage Crop Coefficient (Kc) progression (FAO-56)
    let kc = cropModel.kcIni;
    let growthStageName = 'Germination / Seedling';
    let growthStageBn = 'অঙ্কুরোদগম ও চারা';

    if (day <= 25) {
      kc = cropModel.kcIni;
      growthStageName = 'Initial Stage (Days 1-25)';
      growthStageBn = 'প্রারম্ভিক পর্যায় (১-২৫ দিন)';
    } else if (day <= 55) {
      // Linear ramp from kcIni to kcMid
      const frac = (day - 25) / 30;
      kc = cropModel.kcIni + frac * (cropModel.kcMid - cropModel.kcIni);
      growthStageName = 'Vegetative Tillering (Days 26-55)';
      growthStageBn = 'কুশি গজানো ও বাড়ন্ত পর্যায় (২৬-৫৫ দিন)';
    } else if (day <= 90) {
      kc = cropModel.kcMid;
      growthStageName = 'Reproductive & Heading (Days 56-90)';
      growthStageBn = 'ফুল ও দানাধারণ পর্যায় (৫৬-৯০ দিন)';
    } else {
      // Linear decrease from kcMid to kcEnd
      const frac = (day - 90) / 30;
      kc = cropModel.kcMid - frac * (cropModel.kcMid - cropModel.kcEnd);
      growthStageName = 'Ripening & Maturation (Days 91-120)';
      growthStageBn = 'পাকা ও ফসল কাটার পর্যায় (৯১-১২০ দিন)';
    }

    // 2. Reference Evapotranspiration (ET0) with seasonal wave + scenario modifier
    const seasonalBaseEt0 = 3.2 + 1.2 * Math.sin(((day + 30) / 120) * Math.PI);
    const et0 = Math.max(1.0, (seasonalBaseEt0 + (rng() - 0.5) * 0.4) * weatherMod.et0Modifier);
    const etc = et0 * kc;

    // 3. Rainfall with seasonal frequency
    let dailyRain = 0;
    const isRainDay = rng() < (day > 40 && day < 100 ? 0.32 : 0.15);
    if (isRainDay) {
      dailyRain = Math.max(0, (rng() * 18 + 2) * weatherMod.rainfallFactor);
    }

    // 4. Irrigation application on scheduled days
    let dailyIrrigation = 0;
    if (scheduledIrrigationDays.has(day)) {
      dailyIrrigation = irrigationPerApplication;
    }

    // 5. Hydrological Water Infiltration & Drainage (FAO-56 Chapter 8)
    // Water entering root zone today
    const waterInput = dailyRain + dailyIrrigation;
    const waterBeforeDrainage = currentSoilWaterMm + waterInput;

    // Excess water above field capacity (TAW) drains as deep percolation / runoff
    let dailyDeepPercolation = 0;
    let infiltratedStorage = waterBeforeDrainage;
    if (waterBeforeDrainage > tawMm) {
      dailyDeepPercolation = waterBeforeDrainage - tawMm;
      infiltratedStorage = tawMm;
    }

    // 6. Water Stress Coefficient (Ks) evaluated based on available infiltrated moisture
    let ks = 1.0;
    if (infiltratedStorage < sThresholdMm) {
      ks = Math.max(0.05, infiltratedStorage / sThresholdMm);
      stressDaysCount++;
    }

    // Actual Evapotranspiration (strictly bounded by available infiltrated root-zone water)
    const eta = Math.min(infiltratedStorage, etc * ks);

    // End-of-day remaining available root zone water
    currentSoilWaterMm = infiltratedStorage - eta;

    // Accumulate metrics
    cumulativeRainfallMm += dailyRain;
    cumulativeIrrigationMm += dailyIrrigation;
    cumulativeDeepPercolationMm += dailyDeepPercolation;
    cumulativeEt0Mm += et0;
    cumulativeEtcMm += etc;
    cumulativeEtaMm += eta;

    // Daily record for timeseries graphs and 120-day export
    dailyRecords.push({
      day,
      growthStageName,
      growthStageBn,
      kc: Number(kc.toFixed(2)),
      et0Mm: Number(et0.toFixed(2)),
      etcMm: Number(etc.toFixed(2)),
      etaMm: Number(eta.toFixed(2)),
      soilWaterMm: Number(currentSoilWaterMm.toFixed(1)),
      ks: Number(ks.toFixed(2)),
      rainfallMm: Number(dailyRain.toFixed(1)),
      irrigationMm: Number(dailyIrrigation.toFixed(1)),
      deepPercolationMm: Number(dailyDeepPercolation.toFixed(1))
    });
  }

  // 7. FAO-33 Stewart Yield Reduction Calculation
  const waterDeficitRatio = cumulativeEtcMm > 0 ? Math.max(0, 1 - (cumulativeEtaMm / cumulativeEtcMm)) : 0;
  const relativeYieldReduction = Math.min(0.85, cropModel.ky * waterDeficitRatio);

  // Nutrient limitation factor if Nitrogen or Phosphorus is below recommended benchmark
  const optimalNitrogen = 135;
  const nitrogenFactor = Math.min(1.0, 0.65 + 0.35 * (nitrogenKgHa / optimalNitrogen));

  // Yield floor: 0.2 t/ha engineering model assumption (representing minimal salvageable
  // stover/forage biomass under severe water deficit for standard positive-potential crops),
  // NOT a universal biological law.
  // For zero potential yield (Y_m = 0), yield is strictly 0.
  // For micro potential yield (e.g. Y_m = 0.15), effectiveFloor = min(0.2, Y_m) = 0.15,
  // guaranteeing that final yield never exceeds potential yield.
  const potentialYield = Math.max(0, Number(config.potentialYieldOverride ?? cropModel.potentialYieldTonHa) || 0);
  const calculatedYield = potentialYield * (1 - relativeYieldReduction) * nitrogenFactor;
  const effectiveFloor = potentialYield > 0 ? Math.min(0.2, potentialYield) : 0;
  const rawYield = Math.min(potentialYield, Math.max(effectiveFloor, calculatedYield));
  const finalYieldTonHa = Number(rawYield.toFixed(2));

  // 8. Unit Conversions & Financial Math
  // 1 ha = 7.47 bigha; 1 tonne = 25 maunds = 1,000 kg
  const haToBigha = 7.47;
  const maundsPerTonne = 25;
  const kgPerMaund = 40;

  const totalYieldTonnes = Number((finalYieldTonHa * areaHa).toFixed(2));
  const totalYieldMaunds = Number((totalYieldTonnes * maundsPerTonne).toFixed(2));
  const totalYieldKg = totalYieldTonnes * 1000;
  const yieldMaundPerBigha = (finalYieldTonHa * maundsPerTonne) / haToBigha;

  // Cost Structure
  const seedTotal = cropModel.seedCostPerHa * areaHa;
  const fertilizerTotal = (cropModel.baseFertilizerCostPerHa + (nitrogenKgHa * 28) + (phosphorusKgHa * 36) + (potassiumKgHa * 24)) * areaHa * 0.5;
  const irrigationTotal = (cumulativeIrrigationMm * 38) * areaHa; // ~38 BDT per mm of irrigation per ha
  const laborTotal = cropModel.baseLaborCostPerHa * areaHa;
  const machineryTotal = 8500 * areaHa;

  const totalCostBdt = seedTotal + fertilizerTotal + irrigationTotal + laborTotal + machineryTotal;
  const costPerHaBdt = areaHa > 0 ? totalCostBdt / areaHa : 0;

  // Revenue & Profit
  const grossRevenueBdt = totalYieldMaunds * pricePerMaund;
  const netReturnBdt = grossRevenueBdt - totalCostBdt;
  const netReturnPerHaBdt = areaHa > 0 ? netReturnBdt / areaHa : 0;
  const netReturnPerBighaBdt = areaHa > 0 ? netReturnPerHaBdt / haToBigha : 0;

  // Break-even price per kg
  const breakEvenPricePerKg = totalYieldKg > 0 ? totalCostBdt / totalYieldKg : 0;
  const breakEvenPricePerMaund = breakEvenPricePerKg * kgPerMaund;

  // Water Productivity (kg of yield per m3 of water)
  // 1 mm water over 1 ha = 10 m3 water
  const totalWaterAppliedMm = cumulativeRainfallMm + cumulativeIrrigationMm;
  const totalWaterVolumeM3 = totalWaterAppliedMm * 10 * areaHa;
  const waterProductivityKgM3 = totalWaterVolumeM3 > 0 ? totalYieldKg / totalWaterVolumeM3 : 0;

  return {
    metadata: {
      experimentId: `EXP-${Date.now().toString(36).toUpperCase()}`,
      modelName: 'FieldShift AgroSim Deterministic v2.5 (FAO-33/FAO-56 Hydrology)',
      timestamp: new Date().toISOString(),
      randomSeed: seed,
      cropProvenance: cropModel.provenance,
      ksModelDescription: 'Modified FAO-56 bilinear water stress model with 0.05 minimum cuticular/numerical clamp (engineering assumption; classical FAO-56 Eq. 84 decreases to 0.0 at permanent wilting point)',
      yieldFloorAssumption: '0.2 t/ha modeling floor (residual stover/forage salvage assumption for positive-potential crops; not a universal FAO-predicted biological minimum)',
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      },
      disclaimerBn: 'অনুসন্ধানমূলক বৈজ্ঞানিক সিমুলেশন (FAO-33 ওয়াটার ব্যালেন্স ও FAO-56 হাইড্রোলজি) — মাঠপর্যায়ের ইন-সিটু মাটির টেস্ট ছাড়া এটি চূড়ান্ত গ্যারান্টি নয়।',
      disclaimerEn: 'Exploratory agro-climatic simulation based on FAO-33 Stewart yield response and FAO-56 dual stage evapotranspiration. Not a field-validated guarantee.'
    },
    inputs: {
      cropKey,
      cropNameEn: cropModel.nameEn,
      cropNameBn: cropModel.nameBn,
      weatherScenario: weatherKey,
      weatherNameEn: weatherMod.nameEn,
      weatherNameBn: weatherMod.nameBn,
      areaHa,
      areaBigha: Number((areaHa * haToBigha).toFixed(1)),
      soilTexture,
      rootDepthM,
      tawMm,
      rawMm,
      sThresholdMm,
      depletionFractionP: p,
      irrigationBudgetMm,
      nitrogenKgHa,
      phosphorusKgHa,
      potassiumKgHa,
      sellingPriceMaund: pricePerMaund,
      sellingPriceKg: Number((pricePerMaund / kgPerMaund).toFixed(2))
    },
    waterBalance: {
      totalDays,
      tawMm,
      rawMm,
      sThresholdMm,
      initialSoilWaterMm,
      finalSoilWaterMm: Number(currentSoilWaterMm.toFixed(1)),
      cumulativeRainfallMm: Number(cumulativeRainfallMm.toFixed(1)),
      cumulativeIrrigationMm: Number(cumulativeIrrigationMm.toFixed(1)),
      totalIrrigationMm: Number(cumulativeIrrigationMm.toFixed(1)),
      totalWaterAppliedMm: Number(totalWaterAppliedMm.toFixed(1)),
      cumulativeDeepPercolationMm: Number(cumulativeDeepPercolationMm.toFixed(1)),
      totalDeepPercolationMm: Number(cumulativeDeepPercolationMm.toFixed(1)),
      cumulativeEt0Mm: Number(cumulativeEt0Mm.toFixed(1)),
      cumulativeEtcMm: Number(cumulativeEtcMm.toFixed(1)),
      cumulativeEtaMm: Number(cumulativeEtaMm.toFixed(1)),
      totalEtaMm: Number(cumulativeEtaMm.toFixed(1)),
      massBalanceResidualMm: Number(((initialSoilWaterMm + cumulativeRainfallMm + cumulativeIrrigationMm) - (currentSoilWaterMm + cumulativeDeepPercolationMm + cumulativeEtaMm)).toFixed(2)),
      waterDeficitRatio: Number((waterDeficitRatio * 100).toFixed(1)),
      stressDaysCount,
      waterStressDays: stressDaysCount,
      waterProductivityKgM3: Number(waterProductivityKgM3.toFixed(2))
    },
    stressIndicators: {
      averageKs: Number((dailyRecords.reduce((sum, r) => sum + r.ks, 0) / (dailyRecords.length || 1)).toFixed(2)),
      stressDaysCount,
      nitrogenStressFactor: Number(nitrogenFactor.toFixed(2)),
      waterStressDeficitRatio: Number(waterDeficitRatio.toFixed(2))
    },
    yieldOutcomes: {
      potentialYieldTonHa: cropModel.potentialYieldTonHa,
      simulatedYieldTonHa: finalYieldTonHa,
      yieldMaundPerBigha: Number(yieldMaundPerBigha.toFixed(1)),
      totalYieldTonnes: Number(totalYieldTonnes.toFixed(1)),
      totalYieldMaunds: Number(totalYieldMaunds.toFixed(1)),
      totalYieldKg: Math.round(totalYieldKg),
      relativeYieldReductionPct: Number((relativeYieldReduction * 100).toFixed(1))
    },
    economics: {
      grossRevenueBdt: Math.round(grossRevenueBdt),
      totalCostBdt: Math.round(totalCostBdt),
      netReturnBdt: Math.round(netReturnBdt),
      netReturnPerHaBdt: Math.round(netReturnPerHaBdt),
      netReturnPerBighaBdt: Math.round(netReturnPerBighaBdt),
      costPerHaBdt: Math.round(costPerHaBdt),
      breakEvenPricePerKg: Number(breakEvenPricePerKg.toFixed(2)),
      breakEvenPricePerMaund: Number(breakEvenPricePerMaund.toFixed(2)),
      benefitCostRatio: totalCostBdt > 0 ? Number((grossRevenueBdt / totalCostBdt).toFixed(2)) : 0,
      costBreakdown: {
        seed: Math.round(seedTotal),
        fertilizer: Math.round(fertilizerTotal),
        irrigation: Math.round(irrigationTotal),
        labor: Math.round(laborTotal),
        machinery: Math.round(machineryTotal)
      }
    },
    timeseries: dailyRecords
  };
}

/**
 * Computes side-by-side comparison between Scenario A and Scenario B.
 */
export function compareScenarios(simA, simB) {
  if (!simA || !simB) return null;

  const diff = (valB, valA) => {
    const diffVal = valB - valA;
    const pct = valA !== 0 ? (diffVal / Math.abs(valA)) * 100 : 0;
    return {
      scenarioA: valA,
      scenarioB: valB,
      absoluteDiff: Number(diffVal.toFixed(2)),
      percentageDiff: Number(pct.toFixed(1)),
      percentDiff: Number(pct.toFixed(1))
    };
  };

  const wpDiff = diff(simB.waterBalance.waterProductivityKgM3, simA.waterBalance.waterProductivityKgM3);

  return {
    yieldTonHa: diff(simB.yieldOutcomes.simulatedYieldTonHa, simA.yieldOutcomes.simulatedYieldTonHa),
    yieldMaundBigha: diff(simB.yieldOutcomes.yieldMaundPerBigha, simA.yieldOutcomes.yieldMaundPerBigha),
    totalCostBdt: diff(simB.economics.totalCostBdt, simA.economics.totalCostBdt),
    grossRevenueBdt: diff(simB.economics.grossRevenueBdt, simA.economics.grossRevenueBdt),
    netReturnBdt: diff(simB.economics.netReturnBdt, simA.economics.netReturnBdt),
    breakEvenPerKg: diff(simB.economics.breakEvenPricePerKg, simA.economics.breakEvenPricePerKg),
    waterAppliedMm: diff(simB.waterBalance.totalWaterAppliedMm, simA.waterBalance.totalWaterAppliedMm),
    waterProductivity: wpDiff,
    waterProductivityKgM3: wpDiff,
    stressDays: diff(simB.waterBalance.stressDaysCount, simA.waterBalance.stressDaysCount)
  };
}
