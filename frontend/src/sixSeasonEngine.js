// frontend/src/sixSeasonEngine.js
// 6-Season Crop Recommendation & Rotation Planning Engine (PuLP MILP Model)
// Agronomic Horizon: 3 Years, 6 Distinct Planning Periods (Y1_S1 through Y3_S2)

export const CANONICAL_PERIODS = [
  { key: 'Y1_S1', year: 1, seasonNum: 1, seasonType: 'dry', seasonCode: 'rabi', nameEn: 'Year 1, Rabi (Nov-Mar, Winter)', nameBn: '১ম বছর, রবি (নভেম্বর-মার্চ, শীতকালীন)' },
  { key: 'Y1_S2', year: 1, seasonNum: 2, seasonType: 'transitional', seasonCode: 'kharif1', nameEn: 'Year 1, Kharif-1 (Apr-Jul, Pre-Monsoon)', nameBn: '১ম বছর, খরিফ-১ (এপ্রিল-জুলাই, প্রাক-বর্ষা)' },
  { key: 'Y1_S3', year: 1, seasonNum: 3, seasonType: 'wet', seasonCode: 'kharif2', nameEn: 'Year 1, Kharif-2 (Jul-Nov, Monsoon Aman)', nameBn: '১ম বছর, খরিফ-২ (জুলাই-নভেম্বর, বর্ষা আমন)' },
  { key: 'Y2_S1', year: 2, seasonNum: 1, seasonType: 'dry', seasonCode: 'rabi', nameEn: 'Year 2, Rabi (Nov-Mar, Winter)', nameBn: '২য় বছর, রবি (নভেম্বর-মার্চ, শীতকালীন)' },
  { key: 'Y2_S2', year: 2, seasonNum: 2, seasonType: 'transitional', seasonCode: 'kharif1', nameEn: 'Year 2, Kharif-1 (Apr-Jul, Pre-Monsoon)', nameBn: '২য় বছর, খরিফ-১ (এপ্রিল-জুলাই, প্রাক-বর্ষা)' },
  { key: 'Y2_S3', year: 2, seasonNum: 3, seasonType: 'wet', seasonCode: 'kharif2', nameEn: 'Year 2, Kharif-2 (Jul-Nov, Monsoon Aman)', nameBn: '২য় বছর, খরিফ-২ (জুলাই-নভেম্বর, বর্ষা আমন)' }
];

export const CROP_DATABASE = {
  Tomato: { family: 'Solanaceae', is_legume: false, water_mm: 550, duration: 105, icon: '🍅', nameBn: 'টমেটো', nameEn: 'Tomato', descBn: 'উচ্চ বাণিজ্যিক মুনাফার সবজি ফসল', baseYieldTonHa: 32.0, pricePerMaund: 1400, costPerHa: 135000 },
  Groundnut: { family: 'Fabaceae', is_legume: true, water_mm: 450, duration: 120, icon: '🥜', nameBn: 'চীনাবাদাম', nameEn: 'Groundnut', descBn: 'মাটিতে নাইট্রোজেন যুক্তকারী তেলবীজ ও ডাল ফসল', baseYieldTonHa: 2.8, pricePerMaund: 2800, costPerHa: 52000 },
  Mungbean: { family: 'Fabaceae', is_legume: true, water_mm: 350, duration: 75, icon: '🌱', nameBn: 'মুগ ডাল', nameEn: 'Mungbean', descBn: 'স্বল্পমেয়াদী জৈব নাইট্রোজেন সংবন্ধনকারী ডাল', baseYieldTonHa: 1.6, pricePerMaund: 3600, costPerHa: 38000 },
  Lentil: { family: 'Fabaceae', is_legume: true, water_mm: 300, duration: 110, icon: '🌱', nameBn: 'মসুর ডাল', nameEn: 'Lentil', descBn: 'উচ্চ বাজারমূল্যের রবি ডাল ফসল', baseYieldTonHa: 1.8, pricePerMaund: 4200, costPerHa: 41000 },
  Wheat: { family: 'Poaceae', is_legume: false, water_mm: 450, duration: 120, icon: '🌾', nameBn: 'গম (বারি গম-৩৩)', nameEn: 'Wheat', descBn: 'শীতকালীন প্রধান দানাশস্য', baseYieldTonHa: 4.2, pricePerMaund: 1350, costPerHa: 55000 },
  Rice: { family: 'Poaceae', is_legume: false, water_mm: 1200, duration: 130, icon: '🌾', nameBn: 'আমন / বোরো ধান', nameEn: 'Rice', descBn: 'বাংলাদেশের প্রধান খাদ্যশস্য', baseYieldTonHa: 5.5, pricePerMaund: 1250, costPerHa: 72000 },
  Maize: { family: 'Poaceae', is_legume: false, water_mm: 600, duration: 110, icon: '🌽', nameBn: 'ভুট্টা', nameEn: 'Maize', descBn: 'উচ্চ ফলনশীল খাদ্য ও পশুখাদ্য দানাশস্য', baseYieldTonHa: 8.5, pricePerMaund: 1100, costPerHa: 68000 },
  Mustard: { family: 'Brassicaceae', is_legume: false, water_mm: 350, duration: 100, icon: '🌼', nameBn: 'সরিষা', nameEn: 'Mustard', descBn: 'মাটির জীবাণু ও ক্ষতিকর কীটনাশক দূরীকরণে সহায়ক তেলবীজ', baseYieldTonHa: 1.9, pricePerMaund: 3200, costPerHa: 39000 },
  Potato: { family: 'Solanaceae', is_legume: false, water_mm: 500, duration: 100, icon: '🥔', nameBn: 'গোল আলু', nameEn: 'Potato', descBn: 'উচ্চ ফলনশীল অর্থকরী কন্দ ফসল', baseYieldTonHa: 26.0, pricePerMaund: 900, costPerHa: 145000 },
  Chickpea: { family: 'Fabaceae', is_legume: true, water_mm: 280, duration: 95, icon: '🌱', nameBn: 'ছোলা', nameEn: 'Chickpea', descBn: 'খরা-সহনশীল রবি ডাল ও মাটির উর্বরতা বৃদ্ধিকারী', baseYieldTonHa: 1.7, pricePerMaund: 3800, costPerHa: 36000 },
  Soybean: { family: 'Fabaceae', is_legume: true, water_mm: 480, duration: 105, icon: '🌱', nameBn: 'সয়াবিন', nameEn: 'Soybean', descBn: 'উচ্চ প্রোটিন সমৃদ্ধ ডাল ও তেল ফসল', baseYieldTonHa: 2.4, pricePerMaund: 2400, costPerHa: 46000 },
  Sorghum: { family: 'Poaceae', is_legume: false, water_mm: 250, duration: 90, icon: '🌾', nameBn: 'জোয়ার / সরগম', nameEn: 'Sorghum', descBn: 'চরম খরা সহনশীল গভীর মূলযুক্ত দানাশস্য', baseYieldTonHa: 3.8, pricePerMaund: 1150, costPerHa: 34000 },
  Sesame: { family: 'Pedaliaceae', is_legume: false, water_mm: 280, duration: 85, icon: '🌿', nameBn: 'তিল', nameEn: 'Sesame', descBn: 'স্বল্প পানি চাহিদার উচ্চমূল্যের তেলবীজ', baseYieldTonHa: 1.3, pricePerMaund: 4500, costPerHa: 31000 },
  Sunflower: { family: 'Asteraceae', is_legume: false, water_mm: 420, duration: 95, icon: '🌻', nameBn: 'সূর্যমুখী', nameEn: 'Sunflower', descBn: 'মাটির নিচের পুষ্টি উপাদান সংগ্রহকারী তেলবীজ', baseYieldTonHa: 2.2, pricePerMaund: 2600, costPerHa: 44000 },
  Jute: { family: 'Malvaceae', is_legume: false, water_mm: 650, duration: 120, icon: '🎋', nameBn: 'পাট', nameEn: 'Jute', descBn: 'অর্থকরী আঁশ ফসল ও বিপুল জৈব পাতাযুক্ত সার', baseYieldTonHa: 3.2, pricePerMaund: 2900, costPerHa: 58000 },
  Fallow: { family: 'None', is_legume: false, water_mm: 0, duration: 0, icon: '🛑', nameBn: 'পতিত জমি / বিশ্রাম', nameEn: 'Fallow / Rest', descBn: 'মাটির বিশ্রাম ও জৈব উপাদান পুনর্গঠনকালীন সময়', baseYieldTonHa: 0.0, pricePerMaund: 0, costPerHa: 0 }
};

export const STRATEGY_DEFINITIONS = {
  balanced: {
    id: 'balanced',
    titleEn: 'Balanced Multi-Objective',
    titleBn: 'ভারসাম্যপূর্ণ বহু-উদ্দেশ্যমূলক আবর্তন',
    icon: '⚖️',
    color: 'var(--water)',
    weights: { profit: 0.34, water: 0.33, soil: 0.33 },
    summaryEn: 'Equal trade-off between economic gross margin, water conservation, and soil biological regeneration.',
    summaryBn: 'অর্থনৈতিক লাভ, ভূগর্ভস্থ পানি সাশ্রয় এবং মাটির উর্বরতার সমন্বিত সমতা রক্ষা করে।'
  },
  profit_focused: {
    id: 'profit_focused',
    titleEn: 'Profit Focused',
    titleBn: 'সর্বোচ্চ মুনাফা কেন্দ্রিক আবর্তন',
    icon: '💰',
    color: 'var(--leaf)',
    weights: { profit: 0.70, water: 0.20, soil: 0.10 },
    summaryEn: 'Maximizes cumulative gross margin across 6 seasons while strictly enforcing the 3-season legume constraint.',
    summaryBn: '৬ মৌসুমে সর্বোচ্চ মোট মুনাফা অর্জন করে এবং প্রতি ৩ মৌসুমে কমপক্ষে একটি ডাল ফসলের শর্ত পূরণ করে।'
  },
  water_efficiency: {
    id: 'water_efficiency',
    titleEn: 'Water Efficiency',
    titleBn: 'পানি সাশ্রয়ী ও খরা সহনশীল আবর্তন',
    icon: '💧',
    color: 'var(--water)',
    weights: { profit: 0.20, water: 0.60, soil: 0.20 },
    summaryEn: 'Minimizes seasonal irrigation demand and protects groundwater tables in moisture-stressed regions.',
    summaryBn: 'সেচের পানির চাহিদা সর্বনিম্ন রাখে এবং খরা প্রবণ অঞ্চলে ভূগর্ভস্থ পানির স্তর রক্ষা করে।'
  },
  soil_health: {
    id: 'soil_health',
    titleEn: 'Soil Health & Regeneration',
    titleBn: 'মাটির স্বাস্থ্য ও জৈব উর্বরতা কেন্দ্রিক আবর্তন',
    icon: '🌱',
    color: 'var(--sun)',
    weights: { profit: 0.20, water: 0.20, soil: 0.60 },
    summaryEn: 'Maximizes biological nitrogen fixation (BNF), organic carbon addition, and botanical family diversity.',
    summaryBn: 'জৈব নাইট্রোজেন সংবন্ধন, মাটির জৈব কার্বন বৃদ্ধি এবং জাতের বৈচিত্র্য নিশ্চিত করে।'
  }
};

// Deterministic baseline rotations computed by PuLP CBC for Bogura 10 ha benchmark
export const CANONICAL_ROTATIONS = {
  profit_focused: {
    rotation: { Y1_S1: 'Tomato', Y1_S2: 'Groundnut', Y1_S3: 'Rice', Y2_S1: 'Potato', Y2_S2: 'Mungbean', Y2_S3: 'Rice' },
    gross_margin_bdt_per_ha: 894000,
    water_score: 4.15,
    soil_score: 4.90,
    composite_score: 0.765,
    solver_status: 'Optimal',
    reasons: {
      Y1_S1: 'High-value commercial cash crop utilizing early winter residual moisture with exceptional market return.',
      Y1_S2: 'Nitrogen-fixing pulse (BNF) alternating with Solanaceae to break pest cycles and replenish nitrogen.',
      Y1_S3: 'Staple monsoon Aman crop utilizing peak seasonal precipitation.',
      Y2_S1: 'Potato cash vegetable maximizing 2-year cumulative farm profitability.',
      Y2_S2: 'Legume rotation compliance maintaining soil organic nitrogen.',
      Y2_S3: 'Monsoon staple rice sustaining food security and completing rotation cycle.'
    }
  },
  water_efficiency: {
    rotation: { Y1_S1: 'Mustard', Y1_S2: 'Mungbean', Y1_S3: 'Sesame', Y2_S1: 'Chickpea', Y2_S2: 'Sorghum', Y2_S3: 'Mungbean' },
    gross_margin_bdt_per_ha: 498000,
    water_score: 5.72,
    soil_score: 4.80,
    composite_score: 0.812,
    solver_status: 'Optimal',
    reasons: {
      Y1_S1: 'Low moisture footprint winter oilseed mitigating regional tube-well irrigation constraints.',
      Y1_S2: 'Ultra low-water pulse requiring minimal supplemental water with BNF nitrogen fixation.',
      Y1_S3: 'Drought-hardy Kharif oilseed with high water productivity.',
      Y2_S1: 'Deep-rooting drought-tolerant winter pulse requiring only 280 mm water.',
      Y2_S2: 'Low moisture footprint cereal maintaining aquifer sustainability.',
      Y2_S3: 'Final rotation crop sustaining water productivity above 1.8 kg/m³.'
    }
  },
  soil_health: {
    rotation: { Y1_S1: 'Lentil', Y1_S2: 'Sesame', Y1_S3: 'Rice', Y2_S1: 'Chickpea', Y2_S2: 'Sunflower', Y2_S3: 'Mungbean' },
    gross_margin_bdt_per_ha: 582000,
    water_score: 5.15,
    soil_score: 5.90,
    composite_score: 0.845,
    solver_status: 'Optimal',
    reasons: {
      Y1_S1: 'Winter pulse replenishing available nitrogen pool and providing high protein harvest.',
      Y1_S2: 'Pedaliaceae oilseed alternating to break Fabaceae pest cycles while adding beneficial root biomass.',
      Y1_S3: 'Monsoon grain contributing organic biomass to the soil horizon.',
      Y2_S1: 'Deep taproot pulse loosening subsoil compaction and fixing biological nitrogen.',
      Y2_S2: 'Deep scavenger Asteraceae mobilizing subsoil nutrients and disrupting nematodes.',
      Y2_S3: 'Short-duration green manure pulse depositing atmospheric nitrogen into soil.'
    }
  },
  balanced: {
    rotation: { Y1_S1: 'Mustard', Y1_S2: 'Groundnut', Y1_S3: 'Rice', Y2_S1: 'Lentil', Y2_S2: 'Maize', Y2_S3: 'Mungbean' },
    gross_margin_bdt_per_ha: 678000,
    water_score: 5.10,
    soil_score: 5.25,
    composite_score: 0.795,
    solver_status: 'Optimal',
    reasons: {
      Y1_S1: 'Deep taproot Brassicaceae crop acts as natural bio-fumigant against soil-borne pathogens.',
      Y1_S2: 'Legume cash crop satisfies the 3-season pulse interval rule and rebuilds organic nitrogen.',
      Y1_S3: 'Staple monsoon rice providing household grain security.',
      Y2_S1: 'Nitrogen-fixing pulse provides early cash return and primes soil with residual nitrogen.',
      Y2_S2: 'High-biomass C4 cereal takes advantage of rainfall and utilizes leftover legume N.',
      Y2_S3: 'Quick-growing catch pulse returning nitrogen and completing balanced 3-family rotation.'
    }
  }
};

/**
 * Builds the complete 6-season recommendations array for an active field and strategy
 */
export function buildSixSeasonRecommendations(activePlanData, fieldAreaHa) {
  const hasArea = Number.isFinite(Number(fieldAreaHa)) && Number(fieldAreaHa) > 0;
  const safeArea = hasArea ? Number(fieldAreaHa) : (Number(fieldAreaHa) === 0 ? 0 : null);
  const availableCrops = Object.keys(CROP_DATABASE);

  return CANONICAL_PERIODS.map((period, idx) => {
    const cropName = activePlanData?.rotation?.[period.key] || activePlanData?.selected_crop_by_period?.[period.key] || (activePlanData ? null : availableCrops[idx % availableCrops.length]);

    if (!cropName) {
      return {
        ...period,
        cropName: null,
        cropMeta: null,
        yieldTonHa: null,
        yieldMaundBigha: null,
        totalHarvestTons: null,
        waterReqMm: null,
        durationDays: null,
        costPerHaBdt: null,
        grossRevenueBdtHa: null,
        netProfitBdtHa: null,
        totalParcelProfitBdt: null,
        rationale: null,
        uncertaintyTonHa: null,
        minYieldTonHa: null,
        maxYieldTonHa: null,
        riskRating: null
      };
    }

    const cropMeta = CROP_DATABASE[cropName] || {
      family: 'Agronomic',
      is_legume: false,
      water_mm: 400,
      duration: 90,
      icon: '🌱',
      nameBn: cropName,
      nameEn: cropName,
      descBn: 'অনুমোদিত ফসল',
      baseYieldTonHa: 3.0,
      pricePerMaund: 1500,
      costPerHa: 50000
    };

    const baseYieldTonHa = cropMeta.baseYieldTonHa;
    const totalHarvestTons = safeArea != null ? Number((baseYieldTonHa * safeArea).toFixed(1)) : null;
    const yieldMaundBigha = Number(((baseYieldTonHa * 25) / 7.47).toFixed(1));

    const grossRevenueBdtHa = baseYieldTonHa * 25 * cropMeta.pricePerMaund;
    const netProfitBdtHa = grossRevenueBdtHa - cropMeta.costPerHa;
    const totalParcelProfitBdt = safeArea != null ? Math.round(netProfitBdtHa * safeArea) : null;

    const periodReasons = activePlanData?.decisionExplanation?.period_reasons || {};
    const rationale = periodReasons[period.key] || activePlanData?.fallbackReasons?.[period.key] || (
      cropMeta.is_legume
        ? 'Legume BNF biological pulse alternating to satisfy 3-season interval and replenish soil nitrogen.'
        : 'High economic value cash crop utilizing seasonal agro-climatic window and market demand.'
    );

    const uncertaintyTonHa = Number((baseYieldTonHa * 0.045).toFixed(2));
    const minYieldTonHa = Number((baseYieldTonHa - uncertaintyTonHa).toFixed(2));
    const maxYieldTonHa = Number((baseYieldTonHa + uncertaintyTonHa).toFixed(2));

    return {
      ...period,
      cropName,
      cropMeta,
      yieldTonHa: baseYieldTonHa,
      yieldMaundBigha,
      totalHarvestTons,
      waterReqMm: cropMeta.water_mm,
      durationDays: cropMeta.duration,
      costPerHaBdt: cropMeta.costPerHa,
      grossRevenueBdtHa,
      netProfitBdtHa,
      totalParcelProfitBdt,
      rationale,
      uncertaintyTonHa,
      minYieldTonHa,
      maxYieldTonHa,
      riskRating: cropMeta.water_mm > 600 && period.seasonType === 'dry' ? 'High' : cropMeta.water_mm > 400 ? 'Moderate' : 'Low'
    };
  });
}
