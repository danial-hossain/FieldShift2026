// FieldShift Canonical Agricultural and Scientific Glossary (Bengali + English)
// Eliminates Banglish, provides consistent terms, handles Bengali digit conversion,
// and ensures jargon (MILP, Pareto, CBC, telemetry) is replaced with farmer-accessible terms on farmer views.

export const GLOSSARY = {
  // Navigation & Core Concepts
  home: { bn: 'হোম', en: 'Home', desc: 'আজকের সারসংক্ষেপ ও প্রধান সিদ্ধান্ত' },
  my_fields: { bn: 'আমার জমি', en: 'My Fields', desc: 'প্লট তালিকা, স্যাটেলাইট ম্যাপ ও মাটির তথ্য' },
  rotation_planner: { bn: 'আবর্তন পরিকল্পনা', en: 'Rotation Planner', desc: 'ঐতিহ্যবাহী বনাম লাভ ও পানির অনুকূল আবর্তন' },
  climate_risk: { bn: 'আবহাওয়া ও ঝুঁকি', en: 'Climate & Risk', desc: 'নাসা বৃষ্টিপাত, অনসেট পরিবর্তন ও তাপপ্রবাহ' },
  water_irrigation: { bn: 'পানি ও সেচ', en: 'Water & Irrigation', desc: 'সেচ ক্যালেন্ডার ও মাটির পানির হিসাব' },
  market: { bn: 'বাজার ও লাভ', en: 'Market & Profit', desc: 'বাজারদর, মোট লাভ ও জাতীয় পুষ্টি চাহিদা' },
  farm_3d: { bn: '৩ডি খামার', en: '3D Farm', desc: 'বাস্তবসম্মত ত্রিমাত্রিক শস্য আবর্তন মডেল' },
  evidence_method: { bn: 'প্রমাণ ও পদ্ধতি', en: 'Evidence & Method', desc: 'নাসা উপগ্রহ তথ্যসূত্র, হিসাবরীতি ও বৈজ্ঞানিক পদ্ধতি' },

  // Seasons (বাংলা ছয় ঋতু ও কৃষি মৌসুম)
  kharif_1: { bn: 'খরিফ-১ (আউশ/গ্রীষ্মকালীন)', en: 'Kharif-I (Early Monsoon)' },
  kharif_2: { bn: 'খরিফ-২ (আমন/বর্ষাকালীন)', en: 'Kharif-II (Monsoon / Aman)' },
  rabi: { bn: 'রবি (শীতকালীন)', en: 'Rabi (Winter)' },
  pre_monsoon: { bn: 'প্রাক-বর্ষা', en: 'Pre-Monsoon' },
  monsoon: { bn: 'বর্ষাকাল', en: 'Monsoon' },
  post_monsoon: { bn: 'শরৎ-হেমন্ত', en: 'Post-Monsoon' },
  winter: { bn: 'শীতকাল', en: 'Winter' },

  // Scientific & Advisory Terms (Farmer accessible vs Science)
  monsoon_onset: {
    bn: 'বর্ষার সূচনা (অনসেট)',
    en: 'Monsoon Onset',
    farmer_desc: 'যেদিন টানা বৃষ্টি শুরু হয়ে ধান রোপণের পর্যাপ্ত জো বা রস তৈরি হয়',
    science_desc: 'NASA GPM IMERG ও POWER ২০ মিমি ৩ দিনের সামগ্রিক বৃষ্টিপাত থ্রেশহোল্ড'
  },
  water_demand: {
    bn: 'ফসলের পানির চাহিদা',
    en: 'Crop Water Requirement',
    farmer_desc: 'গাছের বৃদ্ধি ও বাষ্পীভবনে পুরো মৌসুমে মোট কতটুকু পানি লাগে',
    science_desc: 'FAO-56 পেনম্যান-মন্টিথ সম্ভাব্য বাষ্পীভবন (ETc)'
  },
  groundwater_trend: {
    bn: 'ভূগর্ভস্থ পানির স্তর পরিবর্তন',
    en: 'Groundwater Storage Trend',
    farmer_desc: 'নাসার গ্রেস (GRACE) উপগ্রহ অনুযায়ী বরেন্দ্র বা উপকূলের মাটির নিচের পানির ওঠা-নামা',
    science_desc: 'NASA GRACE-FO Terrestrial Water Storage Anomaly (cm/year)'
  },
  soil_texture: {
    bn: 'মাটির ধরন ও গঠন',
    en: 'Soil Texture',
    farmer_desc: 'মাটিতে বালি, পলি ও এঁটেলের অনুপাত এবং রস ধারণক্ষমতা',
    science_desc: 'ISRIC SoilGrids 250m USDA Soil Texture Class'
  },
  salinity: {
    bn: 'লবণাক্ততা',
    en: 'Soil / Water Salinity',
    farmer_desc: 'উপকূলীয় জোয়ারের লোনা পানির প্রভাব ও ফসল সহনশীলতা',
    science_desc: 'Electrical Conductivity (dS/m) dry-season threshold'
  },

  // Units
  units: {
    bdt_per_ha: { bn: '৳/হেক্টর', en: 'BDT/ha' },
    bdt_per_bigha: { bn: '৳/বিঘা', en: 'BDT/bigha' },
    mm: { bn: 'মিমি', en: 'mm' },
    cm: { bn: 'সেমি', en: 'cm' },
    kg_per_ha: { bn: 'কেজি/হেক্টর', en: 'kg/ha' },
    ton_per_ha: { bn: 'টন/হেক্টর', en: 'ton/ha' },
    celsius: { bn: '°সে', en: '°C' },
    days: { bn: 'দিন', en: 'days' },
    bigha: { bn: 'বিঘা', en: 'bigha' },
    hectare: { bn: 'হেক্টর', en: 'ha' },
  }
};

// Convert standard Arabic numerals (0-9) to Bengali numerals (০-৯)
export function toBengaliDigits(input) {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[0-9]/g, digit => bnDigits[parseInt(digit, 10)]);
}

// Format numbers according to active language and decimals
export function formatNumberLocalized(num, decimals = 1, lang = 'bn') {
  if (num === null || num === undefined || isNaN(Number(num))) {
    return lang === 'bn' ? 'তথ্য নেই' : 'No data';
  }
  const val = Number(num);
  const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString('en-US');
  if (lang === 'bn') {
    return toBengaliDigits(formatted);
  }
  return formatted;
}

// Format currency with sign
export function formatCurrencyLocalized(amount, lang = 'bn', perUnit = '/হেক্টর') {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return lang === 'bn' ? 'তথ্য নেই' : 'No data';
  }
  const val = Math.round(Number(amount));
  const sign = val > 0 ? '+' : (val < 0 ? '-' : '');
  const absFormatted = Math.abs(val).toLocaleString('en-US');
  if (lang === 'bn') {
    return `${sign}৳ ${toBengaliDigits(absFormatted)}${perUnit ? ' ' + perUnit : ''}`;
  }
  return `${sign}৳ ${absFormatted}${perUnit ? ' ' + (perUnit === '/হেক্টর' ? '/ha' : perUnit) : ''}`;
}

// Remove mathematical optimization jargon from farmer-facing copy
const JARGON_REPLACEMENTS = [
  { pattern: /\bMILP\b/gi, replacementBn: 'অনুকূল আবর্তন মডেল', replacementEn: 'Crop Optimization Model' },
  { pattern: /\bCBC\b/gi, replacementBn: 'সমাধান ইঞ্জিন', replacementEn: 'Solver Engine' },
  { pattern: /\bPareto\b/gi, replacementBn: 'লাভ ও পানির ভারসাম্য', replacementEn: 'Balanced Trade-off' },
  { pattern: /\btelemetry\b/gi, replacementBn: 'উপগ্রহ পরিমাপ', replacementEn: 'Satellite Measurements' },
  { pattern: /\bheuristic\b/gi, replacementBn: 'অভিজ্ঞতালব্ধ নিয়ম', replacementEn: 'Rule-based' },
  { pattern: /\bcounterfactual\b/gi, replacementBn: 'বিকল্প পরিস্থিতি', replacementEn: 'Alternative Scenario' },
];

export function sanitizeFarmerCopy(text, lang = 'bn', isFarmerView = true) {
  if (!text || !isFarmerView) return text;
  let result = String(text);
  for (const { pattern, replacementBn, replacementEn } of JARGON_REPLACEMENTS) {
    result = result.replace(pattern, lang === 'bn' ? replacementBn : replacementEn);
  }
  return result;
}

export default GLOSSARY;
