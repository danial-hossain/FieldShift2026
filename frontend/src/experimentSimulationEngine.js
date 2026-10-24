// frontend/src/experimentSimulationEngine.js
// Scientific, deterministic crop & irrigation scenario simulation engine for FieldShift Research Lab
// Formulations:
// 1. Soil Water Balance: S_t = min(TAW, max(0, S_{t-1} + Rainfall_t + Irrigation_t - ET_a,t - Runoff_t))
// 2. Crop Evapotranspiration: ET_c = K_c * ET_0 (FAO-56 dual stage progression)
// 3. Water Stress & Actual ET: ET_a = K_s * ET_c where K_s = S_t / (RAW)
// 4. Yield Response to Water: (1 - Y_a/Y_m) = K_y * (1 - sum(ET_a) / sum(ET_c)) [FAO-33 Stewart Model]
// 5. Agricultural Economics: Gross Revenue, Total Production Cost, Net Return, Break-even price/kg

export const CROP_AGRONOMIC_MODELS = {
  rice: {
    id: 'rice',
    nameEn: 'Aman / Boro Rice',
    nameBn: 'আমন / বোরো ধান',
    potentialYieldTonHa: 5.5,
    ky: 1.10, // FAO-33 yield response factor
    kcIni: 0.50,
    kcMid: 1.15,
    kcEnd: 0.70,
    optimalWaterMm: 450,
    seedCostPerHa: 4500,
    baseLaborCostPerHa: 28000,
    baseFertilizerCostPerHa: 14500,
    defaultPricePerMaund: 1250, // BDT/maund (40 kg)
  },
  wheat: {
    id: 'wheat',
    nameEn: 'Wheat (BARI Gom-33)',
    nameBn: 'গম (বারি গম-৩৩)',
    potentialYieldTonHa: 4.2,
    ky: 1.05,
    kcIni: 0.45,
    kcMid: 1.10,
    kcEnd: 0.40,
    optimalWaterMm: 280,
    seedCostPerHa: 5200,
    baseLaborCostPerHa: 18000,
    baseFertilizerCostPerHa: 12000,
    defaultPricePerMaund: 1450,
  },
  maize: {
    id: 'maize',
    nameEn: 'Hybrid Maize',
    nameBn: 'হাইব্রিড ভুট্টা',
    potentialYieldTonHa: 10.5,
    ky: 1.25,
    kcIni: 0.40,
    kcMid: 1.20,
    kcEnd: 0.60,
    optimalWaterMm: 400,
    seedCostPerHa: 8500,
    baseLaborCostPerHa: 22000,
    baseFertilizerCostPerHa: 19500,
    defaultPricePerMaund: 1100,
  },
  mustard: {
    id: 'mustard',
    nameEn: 'Mustard (BARI Sarisha-14)',
    nameBn: 'সরিষা (বারি সরিষা-১৪)',
    potentialYieldTonHa: 1.8,
    ky: 0.95,
    kcIni: 0.35,
    kcMid: 1.05,
    kcEnd: 0.35,
    optimalWaterMm: 180,
    seedCostPerHa: 3000,
    baseLaborCostPerHa: 12000,
    baseFertilizerCostPerHa: 8500,
    defaultPricePerMaund: 3200,
  },
  potato: {
    id: 'potato',
    nameEn: 'Potato (Diamant)',
    nameBn: 'গোল আলু (ডায়মন্ট)',
    potentialYieldTonHa: 25.0,
    ky: 1.10,
    kcIni: 0.50,
    kcMid: 1.15,
    kcEnd: 0.75,
    optimalWaterMm: 350,
    seedCostPerHa: 38000,
    baseLaborCostPerHa: 26000,
    baseFertilizerCostPerHa: 24000,
    defaultPricePerMaund: 900,
  },
  lentil: {
    id: 'lentil',
    nameEn: 'Lentil (BARI Masur-8)',
    nameBn: 'মসুর ডাল (বারি মসুর-৮)',
    potentialYieldTonHa: 1.6,
    ky: 0.85,
    kcIni: 0.40,
    kcMid: 1.00,
    kcEnd: 0.40,
    optimalWaterMm: 160,
    seedCostPerHa: 4200,
    baseLaborCostPerHa: 13000,
    baseFertilizerCostPerHa: 7500,
    defaultPricePerMaund: 4000,
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
 * Runs a 120-day daily agronomic simulation.
 * @param {Object} config Experiment configuration
 * @returns {Object} Complete reproducible experiment result
 */
export function runAgronomicSimulation(config = {}) {
  const cropKey = (config.crop || 'rice').toLowerCase();
  const cropModel = CROP_AGRONOMIC_MODELS[cropKey] || CROP_AGRONOMIC_MODELS.rice;
  const weatherKey = config.weatherScenario || 'baseline';
  const weatherMod = WEATHER_SCENARIO_MODIFIERS[weatherKey] || WEATHER_SCENARIO_MODIFIERS.baseline;

  const areaHa = Number(config.areaHa) > 0 ? Number(config.areaHa) : 10.0;
  const irrigationBudgetMm = Number(config.irrigationMm) >= 0 ? Number(config.irrigationMm) : 300.0;
  const nitrogenKgHa = Number(config.nitrogenKgHa) >= 0 ? Number(config.nitrogenKgHa) : 120.0;
  const phosphorusKgHa = Number(config.phosphorusKgHa) >= 0 ? Number(config.phosphorusKgHa) : 60.0;
  const potassiumKgHa = Number(config.potassiumKgHa) >= 0 ? Number(config.potassiumKgHa) : 60.0;
  const pricePerMaund = Number(config.sellingPriceMaund) > 0 ? Number(config.sellingPriceMaund) : cropModel.defaultPricePerMaund;
  const seed = Number.isFinite(config.randomSeed) ? config.randomSeed : 2026;

  const rng = createSeededRandom(seed);
  const totalDays = 120;

  // Soil Available Water Capacity (TAW) based on soil texture
  const soilTexture = (config.soilTexture || 'loam').toLowerCase();
  let tawMm = 140; // Default Medium Loam
  if (soilTexture.includes('clay')) tawMm = 175;
  else if (soilTexture.includes('sandy')) tawMm = 95;

  // Initial root zone water content (65% of TAW)
  let currentSoilWaterMm = tawMm * 0.65;
  const rawThreshold = tawMm * 0.50; // Readily available water fraction (p = 0.5)

  // Simulation accumulators
  let cumulativeRainfallMm = 0;
  let cumulativeIrrigationMm = 0;
  let cumulativeEt0Mm = 0;
  let cumulativeEtcMm = 0;
  let cumulativeEtaMm = 0;
  let stressDaysCount = 0;

  const dailyRecords = [];
  const scheduledIrrigationDays = new Set([15, 35, 55, 75, 95]);
  const irrigationPerApplication = scheduledIrrigationDays.size > 0 ? irrigationBudgetMm / scheduledIrrigationDays.size : 0;

  for (let day = 1; day <= totalDays; day++) {
    // 1. Dual Stage Crop Coefficient (Kc) progression
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

    // 5. Water Stress Coefficient (Ks)
    let ks = 1.0;
    if (currentSoilWaterMm < rawThreshold) {
      ks = Math.max(0.1, currentSoilWaterMm / rawThreshold);
      stressDaysCount++;
    }

    const eta = etc * ks;

    // 6. Water Balance Update
    currentSoilWaterMm = Math.min(tawMm, Math.max(0, currentSoilWaterMm + dailyRain + dailyIrrigation - eta));

    // Accumulate
    cumulativeRainfallMm += dailyRain;
    cumulativeIrrigationMm += dailyIrrigation;
    cumulativeEt0Mm += et0;
    cumulativeEtcMm += etc;
    cumulativeEtaMm += eta;

    // Daily record for timeseries graphs
    if (day % 5 === 0 || day === totalDays) {
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
        irrigationMm: Number(dailyIrrigation.toFixed(1))
      });
    }
  }

  // 7. FAO-33 Yield Reduction Calculation
  const waterDeficitRatio = cumulativeEtcMm > 0 ? Math.max(0, 1 - (cumulativeEtaMm / cumulativeEtcMm)) : 0;
  const relativeYieldReduction = Math.min(0.85, cropModel.ky * waterDeficitRatio);

  // Nutrient limitation penalty if Nitrogen or Phosphorus is below recommended benchmark
  const optimalNitrogen = 135;
  const nitrogenFactor = Math.min(1.0, 0.65 + 0.35 * (nitrogenKgHa / optimalNitrogen));
  const rawYield = Math.max(0.2, cropModel.potentialYieldTonHa * (1 - relativeYieldReduction) * nitrogenFactor);
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
  const costPerHaBdt = totalCostBdt / areaHa;

  // Revenue & Profit
  const grossRevenueBdt = totalYieldMaunds * pricePerMaund;
  const netReturnBdt = grossRevenueBdt - totalCostBdt;
  const netReturnPerHaBdt = netReturnBdt / areaHa;
  const netReturnPerBighaBdt = netReturnPerHaBdt / haToBigha;

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
      modelName: 'FieldShift AgroSim Deterministic v2.4 (FAO-33/56)',
      timestamp: new Date().toISOString(),
      randomSeed: seed,
      disclaimerBn: 'অনুসন্ধানমূলক বৈজ্ঞানিক সিমুলেশন (FAO-33 ওয়াটার ব্যালেন্স) — মাঠপর্যায়ের ইন-সিটু মাটির টেস্ট ছাড়া এটি চূড়ান্ত নির্দেশিকা নয়।',
      disclaimerEn: 'Exploratory scientific simulation based on FAO-33 water-yield response. Not a field-validated yield guarantee.'
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
      irrigationBudgetMm,
      nitrogenKgHa,
      phosphorusKgHa,
      potassiumKgHa,
      sellingPriceMaund: pricePerMaund,
      sellingPriceKg: Number((pricePerMaund / kgPerMaund).toFixed(2))
    },
    waterBalance: {
      totalDays,
      cumulativeRainfallMm: Number(cumulativeRainfallMm.toFixed(1)),
      cumulativeIrrigationMm: Number(cumulativeIrrigationMm.toFixed(1)),
      totalWaterAppliedMm: Number(totalWaterAppliedMm.toFixed(1)),
      cumulativeEt0Mm: Number(cumulativeEt0Mm.toFixed(1)),
      cumulativeEtcMm: Number(cumulativeEtcMm.toFixed(1)),
      cumulativeEtaMm: Number(cumulativeEtaMm.toFixed(1)),
      waterDeficitRatio: Number((waterDeficitRatio * 100).toFixed(1)),
      stressDaysCount,
      waterProductivityKgM3: Number(waterProductivityKgM3.toFixed(2))
    },
    yieldOutcomes: {
      potentialYieldTonHa: cropModel.potentialYieldTonHa,
      simulatedYieldTonHa: Number(finalYieldTonHa.toFixed(2)),
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
      percentageDiff: Number(pct.toFixed(1))
    };
  };

  return {
    yieldTonHa: diff(simB.yieldOutcomes.simulatedYieldTonHa, simA.yieldOutcomes.simulatedYieldTonHa),
    yieldMaundBigha: diff(simB.yieldOutcomes.yieldMaundPerBigha, simA.yieldOutcomes.yieldMaundPerBigha),
    totalCostBdt: diff(simB.economics.totalCostBdt, simA.economics.totalCostBdt),
    grossRevenueBdt: diff(simB.economics.grossRevenueBdt, simA.economics.grossRevenueBdt),
    netReturnBdt: diff(simB.economics.netReturnBdt, simA.economics.netReturnBdt),
    breakEvenPerKg: diff(simB.economics.breakEvenPricePerKg, simA.economics.breakEvenPricePerKg),
    waterAppliedMm: diff(simB.waterBalance.totalWaterAppliedMm, simA.waterBalance.totalWaterAppliedMm),
    waterProductivity: diff(simB.waterBalance.waterProductivityKgM3, simA.waterBalance.waterProductivityKgM3),
    stressDays: diff(simB.waterBalance.stressDaysCount, simA.waterBalance.stressDaysCount)
  };
}
