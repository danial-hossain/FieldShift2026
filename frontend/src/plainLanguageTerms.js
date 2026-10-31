// frontend/src/plainLanguageTerms.js
// Plain-language dictionary definitions for agronomic and scientific terms (A7)

export const PLAIN_LANGUAGE_TERMS = {
  evapotranspiration: {
    key: 'evapotranspiration',
    termBn: 'বাষ্পীভবন ও প্রস্বেদন (ET0)',
    termEn: 'Evapotranspiration (ET0)',
    shortBn: 'মাটি ও গাছের মাধ্যমে পানির ক্ষয়',
    shortEn: 'Atmospheric water loss from soil & crop',
    explanationBn: 'মাটি থেকে সূর্যালোকের তাপে বাষ্পীভবন (Evaporation) এবং গাছের পাতার ছিদ্র দিয়ে প্রস্বেদন (Transpiration)-এর মাধ্যমে বাতাসে পানির মোট ক্ষয়। এটি নির্দেশ করে নির্দিষ্ট মৌসুমে একটি ফসলের বেঁচে থাকার জন্য ঠিক কত মিলিমিটার পানি প্রয়োজন।',
    explanationEn: 'The combined water loss to the atmosphere through soil evaporation and crop leaf transpiration. It determines the true physiological irrigation requirement of a crop during a given season.',
    satelliteNoteBn: 'স্যাটেলাইট পরিমাপ: NASA POWER বায়ুমণ্ডলীয় তাপমাত্রা, আর্দ্রতা ও সৌর বিকিরণের মাধ্যমে Penman-Monteith (FAO-56) পদ্ধতিতে ET0 হিসাব করে।',
    satelliteNoteEn: 'Satellite measurement: Calculated via FAO-56 Penman-Monteith using NASA POWER surface radiation, humidity, and temperature.'
  },
  soil_moisture: {
    key: 'soil_moisture',
    termBn: 'মাটির আর্দ্রতা অ্যানোমালি (SMAP)',
    termEn: 'Soil-Moisture Anomaly (SMAP)',
    shortBn: 'স্বাভাবিকের তুলনায় মাটির রস',
    shortEn: 'Root-zone moisture deviation vs climatology',
    explanationBn: 'বহুবছরের গড় স্বাভাবিক আর্দ্রতার তুলনায় বর্তমানে ফসলের শিকড়মণ্ডলে (০-১০০ সেমি গভীরতায়) আর্দ্রতার তারতম্য। ঋণাত্মক মান (যেমন -১০%) খরা বা পানির চরম ঘাটতি নির্দেশ করে, আর ধনাত্মক মান পর্যাপ্ত রস নির্দেশ করে।',
    explanationEn: 'The deviation of current root-zone soil moisture (0-100 cm depth) compared to the long-term historical baseline. Negative values signal drought or moisture deficit; positive values indicate surplus moisture.',
    satelliteNoteBn: 'স্যাটেলাইট পরিমাপ: NASA SMAP L4 (৯ কিমি) রাডার ও রেডিওমিটার ডেটা থেকে অনুমিত শিকড় অঞ্চলের আর্দ্রতা।',
    satelliteNoteEn: 'Satellite measurement: NASA SMAP L4 (9 km) geophysical root-zone soil moisture assimilation.'
  },
  ndvi: {
    key: 'ndvi',
    termBn: 'উদ্ভিদের সবুজায়ন সূচক (NDVI)',
    termEn: 'Vegetation Index (NDVI)',
    shortBn: 'ফসলের সবুজতা ও আচ্ছাদন শক্তি',
    shortEn: 'Canopy greenness & photosynthetically active biomass',
    explanationBn: 'লাল আলো এবং অবলোহিত (Near-Infrared) আলোর প্রতিফলন তুলনা করে ফসলের সতেজতা ও ঘনত্ব মাপা হয়। ০.৬ এর বেশি হলে তা ঘন সবুজ সতেজ ফসল; ০.২ এর নিচে নামলে জমি পতিত বা ফসলবিহীন ফাঁকা মাটি নির্দেশ করে।',
    explanationEn: 'Normalized Difference Vegetation Index measuring live green vegetation vigor by contrasting red and near-infrared reflectance. Values >0.6 represent dense, healthy crop cover; values <0.2 denote fallow or bare soil.',
    satelliteNoteBn: 'স্যাটেলাইট পরিমাপ: NASA MODIS (MOD13Q1, ২৫০ মিটার) ১৬-দিনের যৌগিক উপাত্ত থেকে আহরিত।',
    satelliteNoteEn: 'Satellite measurement: NASA Terra MODIS (MOD13Q1, 250 m) 16-day composited surface reflectance.'
  },
  heat_stress: {
    key: 'heat_stress',
    termBn: 'তাপপ্রবাহ ও তাপীয় ঝুঁকি (Heat Stress)',
    termEn: 'Heat Stress & Thermal Thresholds',
    shortBn: 'ফসলের সহনশীলতার অতিরিক্ত তাপমাত্রা',
    shortEn: 'Temperatures exceeding physiological thresholds',
    explanationBn: 'ফসল ফোটা বা পরাগায়নের সংবেদনশীল সময়ে অতিরিক্ত তাপমাত্রা (যেমন ধানে ৩৫°সে এর বেশি বা গমে ৩১°সে এর বেশি) হলে দানা পুষ্ট হয় না বা চিটা হয়ে যায়। স্যাটেলাইট উপাত্তের মাধ্যমে ঝুঁকিপূর্ণ দিনগুলো চিহ্নিত করে আগাম বপন বা জাত পরিবর্তনের পরামর্শ দেওয়া হয়।',
    explanationEn: 'Extreme temperatures exceeding crop thresholds during critical flowering or grain-filling stages (e.g. >35°C for rice, >31°C for wheat) cause floret sterility and severe yield loss.',
    satelliteNoteBn: 'স্যাটেলাইট পরিমাপ: NASA POWER ২-মিটার সর্বোচ্চ তাপমাত্রা (T2M_MAX) থেকে সংবেদনশীল পর্যায় নিরীক্ষা।',
    satelliteNoteEn: 'Satellite measurement: Tracked using NASA POWER daily maximum air temperature (T2M_MAX).'
  },
  water_balance: {
    key: 'water_balance',
    termBn: 'পানির ভারসাম্য (Water Balance - FAO-56)',
    termEn: 'Water Balance (FAO-56)',
    shortBn: 'বৃষ্টি, সেচ ও ক্ষয়ের মোট হিসাব',
    shortEn: 'Accounting of inflows (rain/irrigation) and ET outflows',
    explanationBn: 'জমিতে কতটুকু বৃষ্টি হলো, মাটি কতটুকু পানি ধরে রাখতে পারল এবং ফসল কতটুকু পানি টেনে বাতাসে ছেড়ে দিল (ETc) তার বিজ্ঞানসম্মত খতিয়ান। এর মাধ্যমেই নির্ধারিত হয় ঠিক কত মিলিমিটার পরিপূরক সেচ প্রয়োজন।',
    explanationEn: 'The systematic hydrological ledger of precipitation inflows, soil root-zone storage capacity, and crop evapotranspiration outflows (ETc) determining net irrigation depth needed.',
    satelliteNoteBn: 'স্যাটেলাইট পরিমাপ: NASA GPM IMERG বৃষ্টিপাত এবং NASA POWER সৌর/তাপীয় তথ্যের সমন্বয়।',
    satelliteNoteEn: 'Satellite measurement: Combined NASA GPM IMERG precipitation and NASA POWER energy balance.'
  },
  satellite_vs_ground: {
    key: 'satellite_vs_ground',
    termBn: 'উপগ্রহ বনাম ভূমি পরিমাপ (Satellite vs Ground)',
    termEn: 'Satellite vs Ground Measurements',
    shortBn: 'প্রশস্ত এলাকার গড় বনাম এক বিন্দুর পাঠ',
    shortEn: 'Area-wide gridded average vs point reading',
    explanationBn: 'স্যাটেলাইট মহাকাশ থেকে সুবিশাল অঞ্চলের (কয়েক কিমি থেকে ২৫ কিমি) গড় চিত্র তুলে ধরে, যা গোটা উপজেলার প্রবণতা বুঝতে আদর্শ। পক্ষান্তরে ভূমি পরিমাপ (যেমন স্থানীয় রেইনগেজ বা ল্যাব টেস্ট) কেবল একটি সুনির্দিষ্ট বিন্দুর সঠিক তথ্য দেয়। ফিল্ডশিফ্ট এই দুইটির মেলবন্ধন ঘটায়।',
    explanationEn: 'Satellites continuously measure spatial averages over large grid cells (hundreds of meters to kilometers) without requiring local hardware, while ground stations measure precise single-point values. FieldShift bridges both.',
    satelliteNoteBn: 'সতর্কতা: স্থানীয় জমিতে উঁচু-নিচু বা বিশেষ সেচব্যবস্থা থাকলে তা উপগ্রহ গড়ে সরাসরি দৃশ্যমান হয় না।',
    satelliteNoteEn: 'Note: Local micro-topography or specific farm trenches are averaged within satellite pixel footprints.'
  },
  reanalysis_vs_observation: {
    key: 'reanalysis_vs_observation',
    termBn: 'পুনর্বিশ্লেষণ বনাম প্রত্যক্ষ পর্যবেক্ষণ (Reanalysis vs Observation)',
    termEn: 'Reanalysis vs Direct Observation',
    shortBn: 'আবহাওয়া মডেল সমন্বয় বনাম উপগ্রহ পাঠ',
    shortEn: 'Blended numerical model grid vs instrument scan',
    explanationBn: 'প্রত্যক্ষ পর্যবেক্ষণ (যেমন NASA GPM IMERG) সরাসরি উপগ্রহের সেন্সর ও রাডার দিয়ে মেঘের বৃষ্টিপাত মাপে। পুনর্বিশ্লেষণ (যেমন NASA POWER / MERRA-2) হলো ঐতিহাসিক উপগ্রহ তথ্য ও বায়ুমণ্ডলীয় পদার্থবিদ্যা মডেলের সমন্বয়ে তৈরি গ্রিডেড হিসাব।',
    explanationEn: 'Direct observations (e.g. GPM IMERG) measure physical sensor reflectance/radiance directly. Reanalysis datasets (e.g. NASA POWER / MERRA-2) synthesize satellite data into physics-based atmospheric numerical models.',
    satelliteNoteBn: 'ফিল্ডশিফ্ট বৃষ্টিপাতের পূর্বাভাসের ক্ষেত্রে উপগ্রহ-যাচাইকৃত প্রত্যক্ষ GPM IMERG উপাত্তকে অগ্রাধিকার দেয়।',
    satelliteNoteEn: 'FieldShift prioritizes satellite-confirmed direct GPM IMERG data for precipitation dynamics.'
  },
  uncertainty: {
    key: 'uncertainty',
    termBn: 'অনিশ্চয়তার সীমা (Uncertainty P10–P90)',
    termEn: 'Uncertainty Bounds (P10–P90)',
    shortBn: '৮০% ঐতিহাসিক সম্ভাবনা সীমা',
    shortEn: '10th to 90th percentile probability envelope',
    explanationBn: 'ভবিষ্যতের আবহাওয়া কখনোই নিশ্চিত নয়। P10 (সবচেয়ে শুষ্ক ১০% বছর) থেকে P90 (সবচেয়ে আর্দ্র ১০% বছর) সীমা নির্দেশ করে যে ৮০% বছর এই সীমার মধ্যেই থাকবে। এটি খামারিকে চরম ঝুঁকি এড়িয়ে নিরাপদ পরিকল্পনা নিতে সাহায্য করে।',
    explanationEn: 'The range spanning the 10th percentile (driest/worst 10% of historical years) to 90th percentile (wettest/best 10%). 80% of seasons fall within this band, guiding risk-resilient decisions.',
    satelliteNoteBn: 'সিদ্ধান্ত সহায়তা: এটি কৃষকের প্রজ্ঞা প্রতিস্থাপন করে না, বরং জলবায়ু ঝুঁকি প্রশমনে বৈজ্ঞানিক প্রমাণ যোগায়।',
    satelliteNoteEn: 'Decision support: Informs rather than replaces local farmer experience and extension advice.'
  },
  monsoon_onset: {
    key: 'monsoon_onset',
    termBn: 'বর্ষার সূচনা (Monsoon Onset)',
    termEn: 'Monsoon Onset Timing',
    shortBn: 'টেকসই বর্ষা শুরুর দিন',
    shortEn: 'Sustained rainy season commencement',
    explanationBn: 'নাসার স্যাটেলাইট বৃষ্টিপাত থেকে বর্ষার প্রথম টেকসই বৃষ্টি নির্ধারণ করা হয়, যাতে বীজতলায় চারা পানির অভাবে শুকিয়ে বা অতিরিক্ত বৃষ্টিতে ভেসে না যায়। ১০ বছরের মধ্যে প্রায় ৭ বছর অনসেট সময়মত ঘটে।',
    explanationEn: 'Identified via NASA satellite anomalous accumulation, determining the exact calendar date of sustained monsoon rains to prevent seedling mortality.',
    satelliteNoteBn: 'নাসা জিপিএম আইমার্জ (GPM IMERG) ও পাওয়ার (POWER) ২৫ বছরের দৈনিক উপাত্ত থেকে গণনাকৃত।',
    satelliteNoteEn: 'Calibrated from 25 years of daily NASA GPM IMERG and POWER precipitation series.'
  },
  milp: {
    key: 'milp',
    termBn: 'বহু-উদ্দেশ্যমূলক অপ্টিমাইজেশন (MILP)',
    termEn: 'Multi-Objective Optimization (MILP)',
    shortBn: 'একসাথে লাভ ও পানি রক্ষার গাণিতিক সমাধান',
    shortEn: 'Simultaneous mathematical solver for profit and water',
    explanationBn: 'একটি উন্নত গাণিতিক কম্পিউটার মডেল যা একই সাথে কৃষকের সর্বোচ্চ লাভ, সর্বনিম্ন সেচ পানির অপচয় এবং মাটির নাইট্রোজেন বৃদ্ধি নিশ্চিত করে সেরা ফসল পর্যায়ক্রম খুঁজে বের করে।',
    explanationEn: 'Mixed-Integer Linear Programming mathematical model that simultaneously optimizes profit, groundwater conservation, and legume biological nitrogen fixation across multiple seasons.',
    satelliteNoteBn: 'PuLP CBC সলভার ব্যবহার করে তৈরি, যাতে কোনো অনুমান নির্ভরতা নেই।',
    satelliteNoteEn: 'Solved deterministically via the open-source PuLP CBC solver.'
  }
};

export const SAAO_ADVISORY_NOTICE_BN = 'এটি সিদ্ধান্তে সহায়তার জন্য; স্থানীয় কৃষি কর্মকর্তার (SAAO) সাথে যাচাই করুন।';
export const SAAO_ADVISORY_NOTICE_EN = 'This is for decision support; please verify with your local Sub-Assistant Agriculture Officer (SAAO).';
