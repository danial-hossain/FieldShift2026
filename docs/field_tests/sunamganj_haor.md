# Field Test Report: Sunamganj haor

- **Field Name**: Sunamganj haor
- **Coordinates**: 25.0658° N, 91.3950° E
- **Field Area**: 1.00 ha (7.5 Bigha)
- **Nearest Agricultural District**: **Sunamganj** (সুনামগঞ্জ)
- **Distance to Centroid**: 0.00 km
- **NASA POWER Grid Cell**: `power_cell_25.0_91.5` (Centroid: 25.0° N, 91.5° E)
- **Climatology Source**: nearest district data (2001–2025 verified cache)

---

## 1. Soil Properties (ISRIC SoilGrids 250 m)

- **USDA Texture Class**: **Loam** (Source: `ISRIC SoilGrids 250 m`)
- **Soil pH (0-30 cm)**: **6.5** (Source: `ISRIC SoilGrids 250 m`)
- **Organic Matter (OM)**: **2.2%** (Source: `ISRIC SoilGrids 250 m`)
- **Texture Breakdown**: Clay **32.0%**, Sand **28.0%**, Silt **40.0%**

### Depth Profile (0–30 cm root zone):
| Depth Layer | pH | Organic Carbon (%) | Organic Matter (%) | Clay (%) | Sand (%) | Silt (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 0-5 cm | 6.4 | 1.35 | 2.33 | 31.0 | 29.0 | 40.0 |
| 5-15 cm | 6.5 | 1.28 | 2.2 | 32.0 | 28.0 | 40.0 |
| 15-30 cm | 6.6 | 1.2 | 2.07 | 33.0 | 27.0 | 40.0 |

---

## 2. NASA Planting Advisories

### Aman Rice Season Advisory:
- **Status**: `ok`
- **Median Historical Shift**: +1.0 days (Period 1 2001–2012 vs Period 2 2013–2025)
- **Mann-Whitney p-value**: 0.3167
- **Statistically Significant**: False
- **Censored Fraction**: 80.0%
- **Suggested Sowing Window**: ১৫ জুন – ৩০ জুন
- **Suggested Transplanting Window**: ১৫ জুলাই – ৫ আগস্ট
- **Bangla Headline**: গত ২৪ বছরে বর্ষা শুরুর তারিখ সাধারণত ১ জুন–২ জুন এর মধ্যে; ২০ জুনের পরে বর্ষা শুরু হওয়ার ঘটনা বিরল। তাই দুই কিস্তিতে বীজতলা ফেলুন: প্রথম কিস্তি ২০-২৫ মে, দ্বিতীয় কিস্তি ৫-১০ জুন।
- **English Headline**: Over the last 24 years, monsoon onset typically begins between 01 June and 02 June; monsoon onset past 20 June is rare. Sow nursery seedbeds in two batches: May 20-25 and June 5-10.
- **Bangla SMS (<160 chars)**: `সুনামগঞ্জ আমন: বর্ষা সাধারণত ১ জুন–২ জুন এ শুরু হয় (দেরিতে আসার ঝুঁকি কম)। দুই কিস্তিতে বীজতলা ফেলুন (২০-২৫ মে ও ৫-১০ জুন)।`

### Aus Rice Season Advisory:
- **Status**: `ok`
- **Median Historical Shift**: +0.5 days
- **Mann-Whitney p-value**: 0.723
- **Statistically Significant**: False
- **Bangla Headline**: সুনামগঞ্জ আউশ: প্রাক-বর্ষায় (মার্চ-মে) মধ্যমা বৃষ্টিপাত ৮৪০ মিমি, তবে ৪% বছর এপ্রিলে বৃষ্টি ৫০ মিমির কম থাকে। বপনের সময় না এগিয়ে সম্পূরক সেচের প্রস্তুতি রাখুন।
- **Bangla SMS (<160 chars)**: `সুনামগঞ্জ আউশ: প্রাক-বর্ষার বৃষ্টি ৮৪০ মিমি, এপ্রিলে ৪% বছর খরা (<৫০ মিমি) থাকে। তারিখ না পিছিয়ে সম্পূরক সেচ প্রস্তুত রাখুন।`

---

## 3. Multi-Season Crop Planning (MILP Solves)

Tested 4 optimization priorities for 6 periods (2 years × seasonal cropping cycles):

### Priority: `PROFIT`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 2.5753
- **Rotation**: Y1_S1: **Tomato** → Y1_S2: **Soybean** → Y1_S3: **Rice** → Y2_S1: **Lentil** → Y2_S2: **Sesame** → Y2_S3: **Rice**
- **Profit Component**: 371,103 BDT
- **Water Index Component**: 5.0943
- **Soil Health Component**: 2.4444

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Tomato** | 1.00 | Profit |
| Y1_S2 | **Soybean** | 1.00 | Profit |
| Y1_S3 | **Rice** | 1.00 | Profit |
| Y2_S1 | **Lentil** | 1.00 | Profit |
| Y2_S2 | **Sesame** | 1.00 | Profit |
| Y2_S3 | **Rice** | 1.00 | Profit |

### Priority: `WATER`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 6.0000
- **Rotation**: Y1_S1: **Fallow** → Y1_S2: **Soybean** → Y1_S3: **Fallow** → Y2_S1: **Fallow** → Y2_S2: **Mungbean** → Y2_S3: **Fallow**
- **Profit Component**: 127,625 BDT
- **Water Index Component**: 6.0000
- **Soil Health Component**: 2.8888

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Fallow** | 1.00 | Water |
| Y1_S2 | **Soybean** | 1.00 | Water |
| Y1_S3 | **Fallow** | 1.00 | Water |
| Y2_S1 | **Fallow** | 1.00 | Water |
| Y2_S2 | **Mungbean** | 1.00 | Water |
| Y2_S3 | **Fallow** | 1.00 | Water |

### Priority: `SOIL`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 3.3332
- **Rotation**: Y1_S1: **Sunflower** → Y1_S2: **Soybean** → Y1_S3: **Fallow** → Y2_S1: **Soybean** → Y2_S2: **Sesame** → Y2_S3: **Fallow**
- **Profit Component**: 174,252 BDT
- **Water Index Component**: 5.0347
- **Soil Health Component**: 3.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Sunflower** | 1.00 | Soil |
| Y1_S2 | **Soybean** | 1.00 | Soil |
| Y1_S3 | **Fallow** | 1.00 | Soil |
| Y2_S1 | **Soybean** | 1.00 | Soil |
| Y2_S2 | **Sesame** | 1.00 | Soil |
| Y2_S3 | **Fallow** | 1.00 | Soil |

### Priority: `BALANCED`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 3.4772
- **Rotation**: Y1_S1: **Mustard** → Y1_S2: **Soybean** → Y1_S3: **Fallow** → Y2_S1: **Chickpea** → Y2_S2: **Sesame** → Y2_S3: **Fallow**
- **Profit Component**: 248,426 BDT
- **Water Index Component**: 5.3578
- **Soil Health Component**: 3.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Mustard** | 1.00 | Balanced |
| Y1_S2 | **Soybean** | 1.00 | Balanced |
| Y1_S3 | **Fallow** | 1.00 | Balanced |
| Y2_S1 | **Chickpea** | 1.00 | Balanced |
| Y2_S2 | **Sesame** | 1.00 | Balanced |
| Y2_S3 | **Fallow** | 1.00 | Balanced |

---

## 4. Water & Irrigation Scheduling (FAO-56 Penman-Monteith)

- **Hydraulic Properties (Saxton-Rawls)**: Field Capacity **34.7%**, Wilting Point **20.0%**, TAW **146.5 mm/m**
- **Reference Evapotranspiration ($ET_0$)**: 370.9 mm
- **Crop Water Demand ($ET_c$)**: 418.0 mm (4,180 m³)
- **Effective Precipitation ($P_{eff}$)**: 874.6 mm (out of 1529.6 mm total rain)
- **Net Irrigation Requirement**: 161.8 mm (1,618 m³)
- **Irrigation Triggers**: 10 events at recommended interval of ~7 days
- **Managed Pumping Cost (2.50 BDT/m³)**: 4,045 BDT
- **Conventional Flood Comparison**: Flood Demand 2,702 m³ (6,755 BDT)
- **Water Conservation**: **1,084 m³ saved (illustrative; assumed field efficiency 45% vs 75%, FAO reference values)** saving **2,710 BDT**

---

## 5. Market & National Need Economics (Official FAOSTAT & BBS)

- **Catalogued Crops**: 17 crops with official trade balance and farmgate pricing.
- **Deficit Crop Group**: Chickpea, Soybean, Wheat, Mustard, Sunflower, Lentil (high national priority for import substitution).
- **Commercial Cash Crops**: Tomato, Potato, Sesame, Groundnut, Jute.
- **Staple Foodcrops**: Rice, Boro Rice, Aus Rice, Maize, Mungbean (domestic self-sufficiency achieved).
- **Single Source of Truth**: Market net profits align identically with MILP agronomic gross margin equations.
