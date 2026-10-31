# Field Test Report: Satkhira coast

- **Field Name**: Satkhira coast
- **Coordinates**: 22.7185° N, 89.0705° E
- **Field Area**: 1.50 ha (11.2 Bigha)
- **Nearest Agricultural District**: **Satkhira** (সাতক্ষীরা)
- **Distance to Centroid**: 0.19 km
- **NASA POWER Grid Cell**: `power_cell_22.5_89.0` (Centroid: 22.5° N, 89.0° E)
- **Climatology Source**: nearest district data (2001–2025 verified cache)

---

## 1. Soil Properties (ISRIC SoilGrids 250 m)

- **USDA Texture Class**: **Silty Clay Loam** (Source: `ISRIC SoilGrids 250 m`)
- **Soil pH (0-30 cm)**: **6.03** (Source: `ISRIC SoilGrids 250 m`)
- **Organic Matter (OM)**: **4.24%** (Source: `ISRIC SoilGrids 250 m`)
- **Texture Breakdown**: Clay **37.5%**, Sand **13.5%**, Silt **49.0%**

### Depth Profile (0–30 cm root zone):
| Depth Layer | pH | Organic Carbon (%) | Organic Matter (%) | Clay (%) | Sand (%) | Silt (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 0-5cm | 6.0 | 3.0 | 5.17 | 36.9 | 13.7 | 49.4 |
| 5-15cm | 6.0 | 2.66 | 4.59 | 38.0 | 13.3 | 48.6 |
| 15-30cm | 6.1 | 1.71 | 2.95 | 37.5 | 13.6 | 48.9 |

---

## 2. NASA Planting Advisories

### Aman Rice Season Advisory:
- **Status**: `ok`
- **Median Historical Shift**: -3.5 days (Period 1 2001–2012 vs Period 2 2013–2025)
- **Mann-Whitney p-value**: 0.3672
- **Statistically Significant**: False
- **Censored Fraction**: 20.0%
- **Suggested Sowing Window**: ১৫ জুন – ৩০ জুন
- **Suggested Transplanting Window**: ১৫ জুলাই – ৫ আগস্ট
- **Bangla Headline**: গত ২৪ বছরে বর্ষা শুরুর তারিখ সাধারণত ২ জুন–১২ জুন এর মধ্যে; ২০ জুনের পরে বর্ষা শুরু হওয়ার ঘটনা বিরল। তাই দুই কিস্তিতে বীজতলা ফেলুন: প্রথম কিস্তি ২০-২৫ মে, দ্বিতীয় কিস্তি ৫-১০ জুন।
- **English Headline**: Over the last 24 years, monsoon onset typically begins between 02 June and 12 June; monsoon onset past 20 June is rare. Sow nursery seedbeds in two batches: May 20-25 and June 5-10.
- **Bangla SMS (<160 chars)**: `সাতক্ষীরা আমন: বর্ষা সাধারণত ২ জুন–১২ জুন এ শুরু হয় (দেরিতে আসার ঝুঁকি কম)। দুই কিস্তিতে বীজতলা ফেলুন (২০-২৫ মে ও ৫-১০ জুন)।`

### Aus Rice Season Advisory:
- **Status**: `ok`
- **Median Historical Shift**: -11.0 days
- **Mann-Whitney p-value**: 0.1867
- **Statistically Significant**: False
- **Bangla Headline**: সাতক্ষীরা আউশ: প্রাক-বর্ষায় (মার্চ-মে) মধ্যমা বৃষ্টিপাত ২৬০ মিমি, তবে ৪২% বছর এপ্রিলে বৃষ্টি ৫০ মিমির কম থাকে। বপনের সময় না এগিয়ে সম্পূরক সেচের প্রস্তুতি রাখুন।
- **Bangla SMS (<160 chars)**: `সাতক্ষীরা আউশ: প্রাক-বর্ষার বৃষ্টি ২৬০ মিমি, এপ্রিলে ৪২% বছর খরা (<৫০ মিমি) থাকে। তারিখ না পিছিয়ে সম্পূরক সেচ প্রস্তুত রাখুন।`

---

## 3. Multi-Season Crop Planning (MILP Solves)

Tested 4 optimization priorities for 6 periods (2 years × seasonal cropping cycles):

### Priority: `PROFIT`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 2.6311
- **Rotation**: Y1_S1: **Tomato** → Y1_S2: **Soybean** → Y1_S3: **Rice** → Y2_S1: **Lentil** → Y2_S2: **Sesame** → Y2_S3: **Rice**
- **Profit Component**: 387,408 BDT
- **Water Index Component**: 4.5721
- **Soil Health Component**: 2.4444

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Tomato** | 1.50 | Profit |
| Y1_S2 | **Soybean** | 1.50 | Profit |
| Y1_S3 | **Rice** | 1.50 | Profit |
| Y2_S1 | **Lentil** | 1.50 | Profit |
| Y2_S2 | **Sesame** | 1.50 | Profit |
| Y2_S3 | **Rice** | 1.50 | Profit |

### Priority: `WATER`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 5.9819
- **Rotation**: Y1_S1: **Fallow** → Y1_S2: **Mungbean** → Y1_S3: **Fallow** → Y2_S1: **Fallow** → Y2_S2: **Groundnut** → Y2_S3: **Fallow**
- **Profit Component**: 138,045 BDT
- **Water Index Component**: 5.9819
- **Soil Health Component**: 2.8888

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Fallow** | 1.50 | Water |
| Y1_S2 | **Mungbean** | 1.50 | Water |
| Y1_S3 | **Fallow** | 1.50 | Water |
| Y2_S1 | **Fallow** | 1.50 | Water |
| Y2_S2 | **Groundnut** | 1.50 | Water |
| Y2_S3 | **Fallow** | 1.50 | Water |

### Priority: `SOIL`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 3.3332
- **Rotation**: Y1_S1: **Sunflower** → Y1_S2: **Soybean** → Y1_S3: **Fallow** → Y2_S1: **Soybean** → Y2_S2: **Sesame** → Y2_S3: **Fallow**
- **Profit Component**: 186,788 BDT
- **Water Index Component**: 4.9881
- **Soil Health Component**: 3.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Sunflower** | 1.50 | Soil |
| Y1_S2 | **Soybean** | 1.50 | Soil |
| Y1_S3 | **Fallow** | 1.50 | Soil |
| Y2_S1 | **Soybean** | 1.50 | Soil |
| Y2_S2 | **Sesame** | 1.50 | Soil |
| Y2_S3 | **Fallow** | 1.50 | Soil |

### Priority: `BALANCED`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 3.4477
- **Rotation**: Y1_S1: **Mustard** → Y1_S2: **Soybean** → Y1_S3: **Fallow** → Y2_S1: **Chickpea** → Y2_S2: **Sesame** → Y2_S3: **Fallow**
- **Profit Component**: 237,520 BDT
- **Water Index Component**: 5.3141
- **Soil Health Component**: 3.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Mustard** | 1.50 | Balanced |
| Y1_S2 | **Soybean** | 1.50 | Balanced |
| Y1_S3 | **Fallow** | 1.50 | Balanced |
| Y2_S1 | **Chickpea** | 1.50 | Balanced |
| Y2_S2 | **Sesame** | 1.50 | Balanced |
| Y2_S3 | **Fallow** | 1.50 | Balanced |

---

## 4. Market & Economics Overview

- **Available Crops Catalogued**: 15 crops with illustrative demo crop economics.
- **Single Source of Truth**: Market costs, prices, and yields align identically with the MILP agronomic model parameters (labelled as illustrative demo values).
