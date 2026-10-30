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
- **Median Historical Shift**: -4.5 days (Period 1 2001–2012 vs Period 2 2013–2025)
- **Mann-Whitney p-value**: 0.2474
- **Statistically Significant**: False
- **Censored Fraction**: 40.0%
- **Suggested Sowing Window**: ১৫ জুন – ৩০ জুন
- **Suggested Transplanting Window**: ১৫ জুলাই – ৫ আগস্ট
- **Bangla Headline**: সাতক্ষীরা অঞ্চলে আমন রোপণ সময় অপরিবর্তিত (জুলাইয়ের মাঝামাঝি থেকে আগস্টের প্রথম সপ্তাহ); প্রচলিত বিআরআরআই ক্যালেন্ডার অনুসরণ করুন।
- **English Headline**: Aman planting window for Satkhira remains unchanged (mid-July to early August); follow standard BRRI crop calendar.
- **Bangla SMS (<160 chars)**: `সাতক্ষীরা আমন: রোপণের সময় অপরিবর্তিত। বীজতলা জুনের শেষ সপ্তাহে ও রোপণ জুলাইতে করুন। বিআরআরআই নির্দেশিকা মেনে চলুন।`

### Aus Rice Season Advisory:
- **Status**: `ok`
- **Median Historical Shift**: -8.0 days
- **Mann-Whitney p-value**: 0.1087
- **Statistically Significant**: False
- **Bangla Headline**: সাতক্ষীরা অঞ্চলে প্রাক-বর্ষার বৃষ্টি এখন আগে শুরু হচ্ছে: আউশ রোপণ ও জমি প্রস্তুতি আগে করা যায়।
- **Bangla SMS (<160 chars)**: `সাতক্ষীরা আউশ: প্রাক-বর্ষার বৃষ্টি এখন আগে শুরু হচ্ছে: আউশ রোপণ ও জমি প্রস্তুতি আগে করা যায়।`

---

## 3. Multi-Season Crop Planning (MILP Solves)

Tested 4 optimization priorities for 6 periods (2 years × seasonal cropping cycles):

### Priority: `PROFIT`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 4.5543
- **Rotation**: Y1_S1: **Tomato** → Y1_S2: **Groundnut** → Y2_S1: **Tomato** → Y2_S2: **Groundnut** → Y3_S1: **Tomato** → Y3_S2: **Groundnut**
- **Profit Component**: 974,760 BDT
- **Water Index Component**: 4.4757
- **Soil Health Component**: 3.0000

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Tomato** | 1.50 | Profit |
| Y1_S2 | **Groundnut** | 1.50 | Profit |
| Y2_S1 | **Tomato** | 1.50 | Profit |
| Y2_S2 | **Groundnut** | 1.50 | Profit |
| Y3_S1 | **Tomato** | 1.50 | Profit |
| Y3_S2 | **Groundnut** | 1.50 | Profit |

### Priority: `WATER`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 5.4828
- **Rotation**: Y1_S1: **Chickpea** → Y1_S2: **Sesame** → Y2_S1: **Chickpea** → Y2_S2: **Sesame** → Y3_S1: **Chickpea** → Y3_S2: **Sesame**
- **Profit Component**: 369,156 BDT
- **Water Index Component**: 5.4828
- **Soil Health Component**: 4.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Chickpea** | 1.50 | Water |
| Y1_S2 | **Sesame** | 1.50 | Water |
| Y2_S1 | **Chickpea** | 1.50 | Water |
| Y2_S2 | **Sesame** | 1.50 | Water |
| Y3_S1 | **Chickpea** | 1.50 | Water |
| Y3_S2 | **Sesame** | 1.50 | Water |

### Priority: `SOIL`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 4.3332
- **Rotation**: Y1_S1: **Chickpea** → Y1_S2: **Sesame** → Y2_S1: **Chickpea** → Y2_S2: **Sesame** → Y3_S1: **Mustard** → Y3_S2: **Mungbean**
- **Profit Component**: 313,834 BDT
- **Water Index Component**: 5.3958
- **Soil Health Component**: 4.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Chickpea** | 1.50 | Soil |
| Y1_S2 | **Sesame** | 1.50 | Soil |
| Y2_S1 | **Chickpea** | 1.50 | Soil |
| Y2_S2 | **Sesame** | 1.50 | Soil |
| Y3_S1 | **Mustard** | 1.50 | Soil |
| Y3_S2 | **Mungbean** | 1.50 | Soil |

### Priority: `BALANCED`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 4.0154
- **Rotation**: Y1_S1: **Tomato** → Y1_S2: **Groundnut** → Y2_S1: **Tomato** → Y2_S2: **Groundnut** → Y3_S1: **Tomato** → Y3_S2: **Groundnut**
- **Profit Component**: 974,760 BDT
- **Water Index Component**: 4.4757
- **Soil Health Component**: 3.0000

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Tomato** | 1.50 | Balanced |
| Y1_S2 | **Groundnut** | 1.50 | Balanced |
| Y2_S1 | **Tomato** | 1.50 | Balanced |
| Y2_S2 | **Groundnut** | 1.50 | Balanced |
| Y3_S1 | **Tomato** | 1.50 | Balanced |
| Y3_S2 | **Groundnut** | 1.50 | Balanced |

---

## 4. Market & Economics Overview

- **Available Crops Catalogued**: 15 crops with illustrative demo crop economics.
- **Single Source of Truth**: Market costs, prices, and yields align identically with the MILP agronomic model parameters (labelled as illustrative demo values).
