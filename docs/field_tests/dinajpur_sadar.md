# Field Test Report: Dinajpur Sadar

- **Field Name**: Dinajpur Sadar
- **Coordinates**: 25.6279° N, 88.6332° E
- **Field Area**: 2.00 ha (14.9 Bigha)
- **Nearest Agricultural District**: **Dinajpur** (দিনাজপুর)
- **Distance to Centroid**: 0.72 km
- **NASA POWER Grid Cell**: `power_cell_25.5_88.5` (Centroid: 25.5° N, 88.5° E)
- **Climatology Source**: nearest district data (2001–2025 verified cache)

---

## 1. Soil Properties (ISRIC SoilGrids 250 m)

- **USDA Texture Class**: **Clay Loam** (Source: `ISRIC SoilGrids 250 m`)
- **Soil pH (0-30 cm)**: **6.4** (Source: `ISRIC SoilGrids 250 m`)
- **Organic Matter (OM)**: **2.49%** (Source: `ISRIC SoilGrids 250 m`)
- **Texture Breakdown**: Clay **38.0%**, Sand **24.7%**, Silt **37.3%**

### Depth Profile (0–30 cm root zone):
| Depth Layer | pH | Organic Carbon (%) | Organic Matter (%) | Clay (%) | Sand (%) | Silt (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 0-5cm | 6.3 | 1.98 | 3.41 | 37.5 | 24.7 | 37.8 |
| 5-15cm | 6.4 | 1.47 | 2.53 | 37.3 | 25.3 | 37.4 |
| 15-30cm | 6.5 | 0.88 | 1.52 | 39.1 | 24.2 | 36.7 |

---

## 2. NASA Planting Advisories

### Aman Rice Season Advisory:
- **Status**: `ok`
- **Median Historical Shift**: +4.0 days (Period 1 2001–2012 vs Period 2 2013–2025)
- **Mann-Whitney p-value**: 0.1805
- **Statistically Significant**: False
- **Censored Fraction**: 28.0%
- **Suggested Sowing Window**: ১৫ জুন – ৩০ জুন
- **Suggested Transplanting Window**: ১৫ জুলাই – ৫ আগস্ট
- **Bangla Headline**: এই অঞ্চলে জুনের শুরুতেই সাধারণত বর্ষার বৃষ্টি শুরু হয়ে থাকে। ১৫ জুন থেকে ১৫ জুলাইয়ের মধ্যে খরা বা অনাবৃষ্টির (টানা ৭ দিন বা তার বেশি < ২ মিমি) ঝুঁকি ১৬.৭% (নাসা জিপিএম আইমার্জ স্যাটেলাইট পর্যবেক্ষণ)। তাই দুই কিস্তিতে বীজতলা ফেলুন: প্রথম কিস্তি ২০-২৫ মে, দ্বিতীয় কিস্তি ৫-১০ জুন।
- **English Headline**: Rain is usually already falling by early June in this region. The probability of a dry spell (>= 7 days with < 2 mm) between 15 June and 15 July is 16.7% based on NASA GPM IMERG satellite observations. Sow nursery seedbeds in two batches: May 20-25 and June 5-10.
- **Bangla SMS (<160 chars)**: `দিনাজপুর আমন: জুনের শুরুতেই বৃষ্টি শুরু হয়। ১৫ জুন-১৫ জুলাই খরার ঝুঁকি ১৬.৭%। দুই কিস্তিতে বীজতলা ফেলুন (২০-২৫ মে, ৫-১০ জুন)।`

### Aus Rice Season Advisory:
- **Status**: `ok`
- **Median Historical Shift**: -18.5 days
- **Mann-Whitney p-value**: 0.4961
- **Statistically Significant**: False
- **Bangla Headline**: দিনাজপুর আউশ: প্রাক-বর্ষায় (মার্চ-মে) মধ্যমা বৃষ্টিপাত ৩১৭ মিমি, তবে ৩৩% বছর এপ্রিলে বৃষ্টি ৫০ মিমির কম থাকে। বপনের সময় না এগিয়ে সম্পূরক সেচের প্রস্তুতি রাখুন।
- **Bangla SMS (<160 chars)**: `দিনাজপুর আউশ: প্রাক-বর্ষার বৃষ্টি ৩১৭ মিমি, এপ্রিলে ৩৩% বছর খরা (<৫০ মিমি) থাকে। তারিখ না পিছিয়ে সম্পূরক সেচ প্রস্তুত রাখুন।`

---

## 3. Multi-Season Crop Planning (MILP Solves)

Tested 4 optimization priorities for 6 periods (2 years × seasonal cropping cycles):

### Priority: `PROFIT`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 2.1337
- **Rotation**: Y1_S1: **Mustard** → Y1_S2: **Soybean** → Y1_S3: **Rice** → Y2_S1: **Lentil** → Y2_S2: **Sesame** → Y2_S3: **Rice**
- **Profit Component**: 315,043 BDT
- **Water Index Component**: 4.7523
- **Soil Health Component**: 2.8888

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Mustard** | 2.00 | Profit |
| Y1_S2 | **Soybean** | 2.00 | Profit |
| Y1_S3 | **Rice** | 2.00 | Profit |
| Y2_S1 | **Lentil** | 2.00 | Profit |
| Y2_S2 | **Sesame** | 2.00 | Profit |
| Y2_S3 | **Rice** | 2.00 | Profit |

### Priority: `WATER`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 4.7759
- **Rotation**: Y1_S1: **Mustard** → Y1_S2: **Soybean** → Y1_S3: **Rice** → Y2_S1: **Chickpea** → Y2_S2: **Sesame** → Y2_S3: **Rice**
- **Profit Component**: 300,105 BDT
- **Water Index Component**: 4.7759
- **Soil Health Component**: 2.8888

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Mustard** | 2.00 | Water |
| Y1_S2 | **Soybean** | 2.00 | Water |
| Y1_S3 | **Rice** | 2.00 | Water |
| Y2_S1 | **Chickpea** | 2.00 | Water |
| Y2_S2 | **Sesame** | 2.00 | Water |
| Y2_S3 | **Rice** | 2.00 | Water |

### Priority: `SOIL`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 2.8888
- **Rotation**: Y1_S1: **Wheat** → Y1_S2: **Soybean** → Y1_S3: **Rice** → Y2_S1: **Sunflower** → Y2_S2: **Mungbean** → Y2_S3: **Rice**
- **Profit Component**: 225,542 BDT
- **Water Index Component**: 4.4921
- **Soil Health Component**: 2.8888

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Wheat** | 2.00 | Soil |
| Y1_S2 | **Soybean** | 2.00 | Soil |
| Y1_S3 | **Rice** | 2.00 | Soil |
| Y2_S1 | **Sunflower** | 2.00 | Soil |
| Y2_S2 | **Mungbean** | 2.00 | Soil |
| Y2_S3 | **Rice** | 2.00 | Soil |

### Priority: `BALANCED`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 3.1368
- **Rotation**: Y1_S1: **Sunflower** → Y1_S2: **Soybean** → Y1_S3: **Rice** → Y2_S1: **Chickpea** → Y2_S2: **Sesame** → Y2_S3: **Rice**
- **Profit Component**: 274,386 BDT
- **Water Index Component**: 4.6931
- **Soil Health Component**: 2.8888

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Sunflower** | 2.00 | Balanced |
| Y1_S2 | **Soybean** | 2.00 | Balanced |
| Y1_S3 | **Rice** | 2.00 | Balanced |
| Y2_S1 | **Chickpea** | 2.00 | Balanced |
| Y2_S2 | **Sesame** | 2.00 | Balanced |
| Y2_S3 | **Rice** | 2.00 | Balanced |

---

## 4. Water & Irrigation Scheduling (FAO-56 Penman-Monteith)

- **Hydraulic Properties (Saxton-Rawls)**: Field Capacity **37.5%**, Wilting Point **23.3%**, TAW **141.8 mm/m**
- **Reference Evapotranspiration ($ET_0$)**: 405.0 mm
- **Crop Water Demand ($ET_c$)**: 457.0 mm (4,570 m³)
- **Effective Precipitation ($P_{eff}$)**: 429.0 mm (out of 752.8 mm total rain)
- **Net Irrigation Requirement**: 309.1 mm (3,091 m³)
- **Irrigation Triggers**: 21 events at recommended interval of ~4 days
- **Managed Pumping Cost (2.50 BDT/m³)**: 7,728 BDT
- **Conventional Flood Comparison**: Flood Demand 5,152 m³ (12,879 BDT) based on assumed field efficiency 45% vs 75% (FAO reference values)
- **Illustrative Water Savings**: **2,061 m³** (pumping cost reduction: **5,151 BDT**; source: FAO Irrigation and Drainage Paper 24/56)

---

## 5. Market & National Need Economics (Official FAOSTAT & BBS)

- **Catalogued Crops**: 17 crops with official trade balance and farmgate pricing.
- **Deficit Crop Group**: Chickpea, Soybean, Wheat, Mustard, Sunflower, Lentil (high national priority for import substitution).
- **Commercial Cash Crops**: Tomato, Potato, Sesame, Groundnut, Jute.
- **Staple Foodcrops**: Rice, Boro Rice, Aus Rice, Maize, Mungbean (domestic self-sufficiency achieved).
- **Single Source of Truth**: Market net profits align identically with MILP agronomic gross margin equations.
