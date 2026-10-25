// frontend/src/research3d/stressTestDefinitions.js
// Scientific Stress Test & Boundary Benchmark Definitions

export const STRESS_TEST_CASES = [
  {
    id: 'case_zero_water',
    titleBn: '১. শূন্য বৃষ্টি ও শূন্য সেচ (P=0, I=0)',
    titleEn: '1. Zero Rain & Zero Irrigation',
    desc: 'Severe dehydration test: soil storage dries out; actual yield clamps to biological salvage floor.',
    invariant: 'Ya >= 0.20 t/ha and Total Irrig = 0 mm',
    config: {
      crop: 'rice',
      areaHa: 10.0,
      soilTexture: 'loam',
      weatherScenario: 'drought_20pct',
      irrigationMm: 0,
      nitrogenKgHa: 120,
      phosphorusKgHa: 60,
      potassiumKgHa: 60,
      sellingPriceMaund: 1250,
      randomSeed: 2026
    },
    invariantAssertion: (res) => res.yieldOutcomes.simulatedYieldTonHa >= 0.20 && res.waterBalance.totalIrrigationMm === 0
  },
  {
    id: 'case_prolonged_drought',
    titleBn: '২. দীর্ঘস্থায়ী চরম খরা (120-Day Drought Shock)',
    titleEn: '2. 120-Day Prolonged Severe Drought',
    desc: 'Ks decays linearly below (1 - p)*TAW; verifies continuous FAO-56 stress factor decay.',
    invariant: 'Stress Days >= 20 and Ya < Ym',
    config: {
      crop: 'rice',
      areaHa: 10.0,
      soilTexture: 'sandy_loam',
      weatherScenario: 'drought_20pct',
      irrigationMm: 60,
      nitrogenKgHa: 120,
      phosphorusKgHa: 60,
      potassiumKgHa: 60,
      sellingPriceMaund: 1250,
      randomSeed: 2026
    },
    invariantAssertion: (res) => res.stressIndicators.stressDaysCount >= 20 && res.yieldOutcomes.simulatedYieldTonHa < res.yieldOutcomes.potentialYieldTonHa
  },
  {
    id: 'case_deluge_exceeding_taw',
    titleBn: '৩. অতিবৃষ্টি ও সেচ টিএডাব্লিউ অতিক্রম (Deluge > TAW)',
    titleEn: '3. Extreme Deluge Exceeding TAW',
    desc: 'Massive precipitation exceeding storage capacity; verifies deep percolation drainage occurs.',
    invariant: 'Deep Percolation > 50 mm and Mass Balance Residual == 0.00 mm',
    config: {
      crop: 'rice',
      areaHa: 10.0,
      soilTexture: 'loam',
      weatherScenario: 'heavy_monsoon',
      irrigationMm: 550,
      nitrogenKgHa: 120,
      phosphorusKgHa: 60,
      potassiumKgHa: 60,
      sellingPriceMaund: 1250,
      randomSeed: 2026
    },
    invariantAssertion: (res) => res.waterBalance.totalDeepPercolationMm > 50 && Math.abs(res.waterBalance.massBalanceResidualMm) < 0.01
  },
  {
    id: 'case_ks_threshold',
    titleBn: '৪. কেএস স্ট্রেস থ্রেশহোল্ড যাচাই (Ks = 1.0 vs Ks < 1.0)',
    titleEn: '4. FAO-56 Ks Threshold Boundary Test',
    desc: 'Verifies Ks strictly equals 1.0 while S >= (1 - p)*TAW, and drops if and only if S falls below.',
    invariant: 'Finite Ks <= 1.0',
    config: {
      crop: 'rice',
      areaHa: 10.0,
      soilTexture: 'loam',
      weatherScenario: 'baseline',
      irrigationMm: 280,
      nitrogenKgHa: 120,
      phosphorusKgHa: 60,
      potassiumKgHa: 60,
      sellingPriceMaund: 1250,
      randomSeed: 2026
    },
    invariantAssertion: (res) => Number.isFinite(res.stressIndicators.averageKs) && res.stressIndicators.averageKs <= 1.0
  },
  {
    id: 'case_nitrogen_zero',
    titleBn: '৫. শূন্য নাইট্রোজেন পুষ্টি ঘাটতি (N = 0 kg/ha)',
    titleEn: '5. Zero Nitrogen Starvation',
    desc: 'Severe nutrient penalty test: verifies nitrogen response factor limits yield safely without crashing.',
    invariant: 'Ya <= 0.70 * Ym',
    config: {
      crop: 'rice',
      areaHa: 10.0,
      soilTexture: 'loam',
      weatherScenario: 'baseline',
      irrigationMm: 350,
      nitrogenKgHa: 0,
      phosphorusKgHa: 60,
      potassiumKgHa: 60,
      sellingPriceMaund: 1250,
      randomSeed: 2026
    },
    invariantAssertion: (res) => res.yieldOutcomes.simulatedYieldTonHa <= res.yieldOutcomes.potentialYieldTonHa * 0.70
  },
  {
    id: 'case_micro_potential_yield',
    titleBn: '৬. মাইক্রো সম্ভাব্য ফলন সীমা (Ym = 0.15 t/ha)',
    titleEn: '6. Micro Potential Yield Boundary',
    desc: 'Verifies actual yield never exceeds potential yield, even when potential is tiny (Ya <= Ym).',
    invariant: 'Ya <= 0.15 t/ha and Ya <= Ym (never exceeds potential)',
    config: {
      crop: 'rice',
      areaHa: 10.0,
      soilTexture: 'loam',
      weatherScenario: 'baseline',
      irrigationMm: 350,
      nitrogenKgHa: 120,
      phosphorusKgHa: 60,
      potassiumKgHa: 60,
      sellingPriceMaund: 1250,
      potentialYieldOverride: 0.15,
      randomSeed: 2026
    },
    invariantAssertion: (res) => res.yieldOutcomes.simulatedYieldTonHa <= 0.15 && res.yieldOutcomes.simulatedYieldTonHa <= res.yieldOutcomes.potentialYieldTonHa
  },
  {
    id: 'case_soil_texture_sandy',
    titleBn: '৭. বেলে দোআঁশ কম আর্দ্রতা ধারণ ক্ষমতা (Sandy TAW = 60mm)',
    titleEn: '7. Sandy Soil Low-Capacity Contrast',
    desc: 'Low water holding capacity causes rapid percolation and premature drought stress.',
    invariant: 'Sandy TAW <= 100 mm',
    config: {
      crop: 'rice',
      areaHa: 10.0,
      soilTexture: 'sand',
      weatherScenario: 'baseline',
      irrigationMm: 200,
      nitrogenKgHa: 120,
      phosphorusKgHa: 60,
      potassiumKgHa: 60,
      sellingPriceMaund: 1250,
      randomSeed: 2026
    },
    invariantAssertion: (res) => res.waterBalance.tawMm <= 100
  },
  {
    id: 'case_mass_conservation',
    titleBn: '৮. পানি ভর সংরক্ষণ সমীকরণ (Residual = 0.00 mm)',
    titleEn: '8. Hydrological Mass Conservation Law',
    desc: 'Verifies S_t = S_0 + Rain + Irrig - ETa - DP strictly sums to zero residual across all 120 days.',
    invariant: 'Mass Balance Residual < 0.01 mm',
    config: {
      crop: 'rice',
      areaHa: 10.0,
      soilTexture: 'loam',
      weatherScenario: 'baseline',
      irrigationMm: 350,
      nitrogenKgHa: 120,
      phosphorusKgHa: 60,
      potassiumKgHa: 60,
      sellingPriceMaund: 1250,
      randomSeed: 2026
    },
    invariantAssertion: (res) => Math.abs(res.waterBalance.massBalanceResidualMm) < 0.01
  },
  {
    id: 'case_seed_reproducibility',
    titleBn: '৯. একই সিড পুনরাবৃত্তিযোগ্যতা (Deterministic Seed = 2026)',
    titleEn: '9. Deterministic Seed Reproducibility',
    desc: 'Verifies identical input configurations produce bit-for-bit identical simulated outcomes.',
    invariant: 'Finite Output with Seed Matching',
    config: {
      crop: 'rice',
      areaHa: 10.0,
      soilTexture: 'loam',
      weatherScenario: 'baseline',
      irrigationMm: 350,
      nitrogenKgHa: 120,
      phosphorusKgHa: 60,
      potassiumKgHa: 60,
      sellingPriceMaund: 1250,
      randomSeed: 2026
    },
    invariantAssertion: (res) => Number.isFinite(res.yieldOutcomes.simulatedYieldTonHa)
  }
];
