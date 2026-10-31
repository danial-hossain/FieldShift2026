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
- **Bangla Headline**: এই অঞ্চলে জুনের শুরুতেই সাধারণত বর্ষার বৃষ্টি শুরু হয়ে থাকে। ১৫ জুন থেকে ১৫ জুলাইয়ের মধ্যে খরা বা অনাবৃষ্টির (টানা ৭ দিন বা তার বেশি < ২ মিমি) ঝুঁকি ০.০% (নাসা জিপিএম আইমার্জ স্যাটেলাইট পর্যবেক্ষণ)। তাই দুই কিস্তিতে বীজতলা ফেলুন: প্রথম কিস্তি ২০-২৫ মে, দ্বিতীয় কিস্তি ৫-১০ জুন।
- **English Headline**: Rain is usually already falling by early June in this region. The probability of a dry spell (>= 7 days with < 2 mm) between 15 June and 15 July is 0.0% based on NASA GPM IMERG satellite observations. Sow nursery seedbeds in two batches: May 20-25 and June 5-10.
- **Bangla SMS (<160 chars)**: `সুনামগঞ্জ আমন: জুনের শুরুতেই বৃষ্টি শুরু হয়। ১৫ জুন-১৫ জুলাই খরার ঝুঁকি ০.০%। দুই কিস্তিতে বীজতলা ফেলুন (২০-২৫ মে, ৫-১০ জুন)।`

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
- **Objective Value**: -2.8866
- **Rotation**: Y1_S1: **Boro Rice** → Y1_S2: **Fallow** → Y1_S3: **Fallow** → Y2_S1: **Boro Rice** → Y2_S2: **Mungbean** → Y2_S3: **Fallow**
- **Profit Component**: -9,255 BDT
- **Water Index Component**: 1.0000
- **Soil Health Component**: 1.0000

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Boro Rice** | 1.00 | Profit |
| Y1_S2 | **Fallow** | 1.00 | Profit |
| Y1_S3 | **Fallow** | 1.00 | Profit |
| Y2_S1 | **Boro Rice** | 1.00 | Profit |
| Y2_S2 | **Mungbean** | 1.00 | Profit |
| Y2_S3 | **Fallow** | 1.00 | Profit |

### Priority: `WATER`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: -2.5000
- **Rotation**: Y1_S1: **Boro Rice** → Y1_S2: **Fallow** → Y1_S3: **Fallow** → Y2_S1: **Boro Rice** → Y2_S2: **Mungbean** → Y2_S3: **Fallow**
- **Profit Component**: -9,255 BDT
- **Water Index Component**: 1.0000
- **Soil Health Component**: 1.0000

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Boro Rice** | 1.00 | Water |
| Y1_S2 | **Fallow** | 1.00 | Water |
| Y1_S3 | **Fallow** | 1.00 | Water |
| Y2_S1 | **Boro Rice** | 1.00 | Water |
| Y2_S2 | **Mungbean** | 1.00 | Water |
| Y2_S3 | **Fallow** | 1.00 | Water |

### Priority: `SOIL`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: -2.5000
- **Rotation**: Y1_S1: **Boro Rice** → Y1_S2: **Fallow** → Y1_S3: **Fallow** → Y2_S1: **Boro Rice** → Y2_S2: **Mungbean** → Y2_S3: **Fallow**
- **Profit Component**: -9,255 BDT
- **Water Index Component**: 1.0000
- **Soil Health Component**: 1.0000

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Boro Rice** | 1.00 | Soil |
| Y1_S2 | **Fallow** | 1.00 | Soil |
| Y1_S3 | **Fallow** | 1.00 | Soil |
| Y2_S1 | **Boro Rice** | 1.00 | Soil |
| Y2_S2 | **Mungbean** | 1.00 | Soil |
| Y2_S3 | **Fallow** | 1.00 | Soil |

### Priority: `BALANCED`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: -2.8190
- **Rotation**: Y1_S1: **Boro Rice** → Y1_S2: **Fallow** → Y1_S3: **Fallow** → Y2_S1: **Boro Rice** → Y2_S2: **Mungbean** → Y2_S3: **Fallow**
- **Profit Component**: -9,255 BDT
- **Water Index Component**: 1.0000
- **Soil Health Component**: 1.0000

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Boro Rice** | 1.00 | Balanced |
| Y1_S2 | **Fallow** | 1.00 | Balanced |
| Y1_S3 | **Fallow** | 1.00 | Balanced |
| Y2_S1 | **Boro Rice** | 1.00 | Balanced |
| Y2_S2 | **Mungbean** | 1.00 | Balanced |
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
- **Conventional Flood Comparison**: Flood Demand 2,697 m³ (6,742 BDT) based on assumed field efficiency 45% vs 75% (FAO reference values)
- **Illustrative Water Savings**: **1,079 m³** (pumping cost reduction: **2,697 BDT**; source: FAO Irrigation and Drainage Paper 24/56)

---

## 5. Market & National Need Economics (Official FAOSTAT & BBS)

- **Catalogued Crops**: 17 crops with official trade balance and farmgate pricing.
- **Deficit Crop Group**: Chickpea, Soybean, Wheat, Mustard, Sunflower, Lentil (high national priority for import substitution).
- **Commercial Cash Crops**: Tomato, Potato, Sesame, Groundnut, Jute.
- **Staple Foodcrops**: Rice, Boro Rice, Aus Rice, Maize, Mungbean (domestic self-sufficiency achieved).
- **Single Source of Truth**: Market net profits align identically with MILP agronomic gross margin equations.
