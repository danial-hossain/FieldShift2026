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
- **Bangla Headline**: গত ২৪ বছরে বর্ষা শুরুর তারিখ সাধারণত ২ জুন–১০ জুন এর মধ্যে; ২০ জুনের পরে বর্ষা শুরু হওয়ার ঘটনা বিরল। তাই দুই কিস্তিতে বীজতলা ফেলুন: প্রথম কিস্তি ২০-২৫ মে, দ্বিতীয় কিস্তি ৫-১০ জুন।
- **English Headline**: Over the last 24 years, monsoon onset typically begins between 02 June and 10 June; monsoon onset past 20 June is rare. Sow nursery seedbeds in two batches: May 20-25 and June 5-10.
- **Bangla SMS (<160 chars)**: `দিনাজপুর আমন: বর্ষা সাধারণত ২ জুন–১০ জুন এ শুরু হয় (দেরিতে আসার ঝুঁকি কম)। দুই কিস্তিতে বীজতলা ফেলুন (২০-২৫ মে ও ৫-১০ জুন)।`

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
- **Objective Value**: 6.0000
- **Rotation**: Y1_S1: **Fallow** → Y1_S2: **Soybean** → Y1_S3: **Fallow** → Y2_S1: **Fallow** → Y2_S2: **Mungbean** → Y2_S3: **Fallow**
- **Profit Component**: 122,200 BDT
- **Water Index Component**: 6.0000
- **Soil Health Component**: 2.8888

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Fallow** | 2.00 | Water |
| Y1_S2 | **Soybean** | 2.00 | Water |
| Y1_S3 | **Fallow** | 2.00 | Water |
| Y2_S1 | **Fallow** | 2.00 | Water |
| Y2_S2 | **Mungbean** | 2.00 | Water |
| Y2_S3 | **Fallow** | 2.00 | Water |

### Priority: `SOIL`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 3.3332
- **Rotation**: Y1_S1: **Sunflower** → Y1_S2: **Groundnut** → Y1_S3: **Fallow** → Y2_S1: **Chickpea** → Y2_S2: **Sesame** → Y2_S3: **Fallow**
- **Profit Component**: 239,870 BDT
- **Water Index Component**: 5.2147
- **Soil Health Component**: 3.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Sunflower** | 2.00 | Soil |
| Y1_S2 | **Groundnut** | 2.00 | Soil |
| Y1_S3 | **Fallow** | 2.00 | Soil |
| Y2_S1 | **Chickpea** | 2.00 | Soil |
| Y2_S2 | **Sesame** | 2.00 | Soil |
| Y2_S3 | **Fallow** | 2.00 | Soil |

### Priority: `BALANCED`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 3.3887
- **Rotation**: Y1_S1: **Mustard** → Y1_S2: **Soybean** → Y1_S3: **Fallow** → Y2_S1: **Chickpea** → Y2_S2: **Sesame** → Y2_S3: **Fallow**
- **Profit Component**: 245,309 BDT
- **Water Index Component**: 5.2975
- **Soil Health Component**: 3.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Mustard** | 2.00 | Balanced |
| Y1_S2 | **Soybean** | 2.00 | Balanced |
| Y1_S3 | **Fallow** | 2.00 | Balanced |
| Y2_S1 | **Chickpea** | 2.00 | Balanced |
| Y2_S2 | **Sesame** | 2.00 | Balanced |
| Y2_S3 | **Fallow** | 2.00 | Balanced |

---

## 4. Market & Economics Overview

- **Available Crops Catalogued**: 15 crops with illustrative demo crop economics.
- **Single Source of Truth**: Market costs, prices, and yields align identically with the MILP agronomic model parameters (labelled as illustrative demo values).
