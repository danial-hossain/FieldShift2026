# Field Test Report: Bogura demo

- **Field Name**: Bogura demo
- **Coordinates**: 24.8500° N, 89.3700° E
- **Field Area**: 10.00 ha (74.7 Bigha)
- **Nearest Agricultural District**: **Bogura** (বগুড়া)
- **Distance to Centroid**: 0.86 km
- **NASA POWER Grid Cell**: `power_cell_25.0_89.5` (Centroid: 25.0° N, 89.5° E)
- **Climatology Source**: nearest district data (2001–2025 verified cache)

---

## 1. Soil Properties (ISRIC SoilGrids 250 m)

- **USDA Texture Class**: **Clay Loam** (Source: `ISRIC SoilGrids 250 m`)
- **Soil pH (0-30 cm)**: **6.23** (Source: `ISRIC SoilGrids 250 m`)
- **Organic Matter (OM)**: **2.59%** (Source: `ISRIC SoilGrids 250 m`)
- **Texture Breakdown**: Clay **34.5%**, Sand **23.9%**, Silt **41.6%**

### Depth Profile (0–30 cm root zone):
| Depth Layer | pH | Organic Carbon (%) | Organic Matter (%) | Clay (%) | Sand (%) | Silt (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 0-5cm | 6.2 | 2.19 | 3.78 | 33.5 | 24.2 | 42.3 |
| 5-15cm | 6.2 | 1.5 | 2.59 | 34.1 | 23.9 | 42.0 |
| 15-30cm | 6.3 | 0.81 | 1.4 | 36.0 | 23.7 | 40.3 |

---

## 2. NASA Planting Advisories

### Aman Rice Season Advisory:
- **Status**: `ok`
- **Median Historical Shift**: +1.5 days (Period 1 2001–2012 vs Period 2 2013–2025)
- **Mann-Whitney p-value**: 0.4904
- **Statistically Significant**: False
- **Censored Fraction**: 36.0%
- **Suggested Sowing Window**: ১৫ জুন – ৩০ জুন
- **Suggested Transplanting Window**: ১৫ জুলাই – ৫ আগস্ট
- **Bangla Headline**: গত ২৪ বছরে বর্ষা শুরুর তারিখ সাধারণত ২ জুন–৭ জুন এর মধ্যে; ২০ জুনের পরে বর্ষা শুরু হওয়ার ঘটনা বিরল। তাই দুই কিস্তিতে বীজতলা ফেলুন: প্রথম কিস্তি ২০-২৫ মে, দ্বিতীয় কিস্তি ৫-১০ জুন।
- **English Headline**: Over the last 24 years, monsoon onset typically begins between 02 June and 07 June; monsoon onset past 20 June is rare. Sow nursery seedbeds in two batches: May 20-25 and June 5-10.
- **Bangla SMS (<160 chars)**: `বগুড়া আমন: বর্ষা সাধারণত ২ জুন–৭ জুন এ শুরু হয় (দেরিতে আসার ঝুঁকি কম)। দুই কিস্তিতে বীজতলা ফেলুন (২০-২৫ মে ও ৫-১০ জুন)।`

### Aus Rice Season Advisory:
- **Status**: `ok`
- **Median Historical Shift**: -5.5 days
- **Mann-Whitney p-value**: 0.9783
- **Statistically Significant**: False
- **Bangla Headline**: বগুড়া আউশ: প্রাক-বর্ষায় (মার্চ-মে) মধ্যমা বৃষ্টিপাত ৩৫৮ মিমি, তবে ২৯% বছর এপ্রিলে বৃষ্টি ৫০ মিমির কম থাকে। বপনের সময় না এগিয়ে সম্পূরক সেচের প্রস্তুতি রাখুন।
- **Bangla SMS (<160 chars)**: `বগুড়া আউশ: প্রাক-বর্ষার বৃষ্টি ৩৫৮ মিমি, এপ্রিলে ২৯% বছর খরা (<৫০ মিমি) থাকে। তারিখ না পিছিয়ে সম্পূরক সেচ প্রস্তুত রাখুন।`

---

## 3. Multi-Season Crop Planning (MILP Solves)

Tested 4 optimization priorities for 6 periods (2 years × seasonal cropping cycles):

### Priority: `PROFIT`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 2.6002
- **Rotation**: Y1_S1: **Tomato** → Y1_S2: **Soybean** → Y1_S3: **Rice** → Y2_S1: **Lentil** → Y2_S2: **Sesame** → Y2_S3: **Rice**
- **Profit Component**: 329,639 BDT
- **Water Index Component**: 4.3224
- **Soil Health Component**: 2.4444

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Tomato** | 10.00 | Profit |
| Y1_S2 | **Soybean** | 10.00 | Profit |
| Y1_S3 | **Rice** | 10.00 | Profit |
| Y2_S1 | **Lentil** | 10.00 | Profit |
| Y2_S2 | **Sesame** | 10.00 | Profit |
| Y2_S3 | **Rice** | 10.00 | Profit |

### Priority: `WATER`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 6.0000
- **Rotation**: Y1_S1: **Fallow** → Y1_S2: **Soybean** → Y1_S3: **Fallow** → Y2_S1: **Fallow** → Y2_S2: **Mungbean** → Y2_S3: **Fallow**
- **Profit Component**: 122,935 BDT
- **Water Index Component**: 6.0000
- **Soil Health Component**: 2.8888

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Fallow** | 10.00 | Water |
| Y1_S2 | **Soybean** | 10.00 | Water |
| Y1_S3 | **Fallow** | 10.00 | Water |
| Y2_S1 | **Fallow** | 10.00 | Water |
| Y2_S2 | **Mungbean** | 10.00 | Water |
| Y2_S3 | **Fallow** | 10.00 | Water |

### Priority: `SOIL`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 3.3332
- **Rotation**: Y1_S1: **Sunflower** → Y1_S2: **Soybean** → Y1_S3: **Fallow** → Y2_S1: **Soybean** → Y2_S2: **Sesame** → Y2_S3: **Fallow**
- **Profit Component**: 165,496 BDT
- **Water Index Component**: 4.9898
- **Soil Health Component**: 3.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Sunflower** | 10.00 | Soil |
| Y1_S2 | **Soybean** | 10.00 | Soil |
| Y1_S3 | **Fallow** | 10.00 | Soil |
| Y2_S1 | **Soybean** | 10.00 | Soil |
| Y2_S2 | **Sesame** | 10.00 | Soil |
| Y2_S3 | **Fallow** | 10.00 | Soil |

### Priority: `BALANCED`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 3.5010
- **Rotation**: Y1_S1: **Mustard** → Y1_S2: **Soybean** → Y1_S3: **Fallow** → Y2_S1: **Chickpea** → Y2_S2: **Sesame** → Y2_S3: **Fallow**
- **Profit Component**: 245,676 BDT
- **Water Index Component**: 5.3113
- **Soil Health Component**: 3.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Mustard** | 10.00 | Balanced |
| Y1_S2 | **Soybean** | 10.00 | Balanced |
| Y1_S3 | **Fallow** | 10.00 | Balanced |
| Y2_S1 | **Chickpea** | 10.00 | Balanced |
| Y2_S2 | **Sesame** | 10.00 | Balanced |
| Y2_S3 | **Fallow** | 10.00 | Balanced |

---

## 4. Water & Irrigation Scheduling (FAO-56 Penman-Monteith)

- **Hydraulic Properties (Saxton-Rawls)**: Field Capacity **36.4%**, Wilting Point **21.5%**, TAW **149.0 mm/m**
- **Reference Evapotranspiration ($ET_0$)**: 392.5 mm
- **Crop Water Demand ($ET_c$)**: 442.0 mm (4,420 m³)
- **Effective Precipitation ($P_{eff}$)**: 472.9 mm (out of 876.6 mm total rain)
- **Net Irrigation Requirement**: 260.3 mm (2,603 m³)
- **Irrigation Triggers**: 18 events at recommended interval of ~5 days
- **Managed Pumping Cost (2.50 BDT/m³)**: 6,508 BDT
- **Conventional Flood Comparison**: Flood Demand 4,347 m³ (10,868 BDT)
- **Water Conservation**: **1,744 m³ saved (illustrative; assumed field efficiency 45% vs 75%, FAO reference values)** saving **4,360 BDT**

---

## 5. Market & National Need Economics (Official FAOSTAT & BBS)

- **Catalogued Crops**: 17 crops with official trade balance and farmgate pricing.
- **Deficit Crop Group**: Chickpea, Soybean, Wheat, Mustard, Sunflower, Lentil (high national priority for import substitution).
- **Commercial Cash Crops**: Tomato, Potato, Sesame, Groundnut, Jute.
- **Staple Foodcrops**: Rice, Boro Rice, Aus Rice, Maize, Mungbean (domestic self-sufficiency achieved).
- **Single Source of Truth**: Market net profits align identically with MILP agronomic gross margin equations.
