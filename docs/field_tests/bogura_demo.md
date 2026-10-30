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
- **Median Historical Shift**: -0.5 days (Period 1 2001–2012 vs Period 2 2013–2025)
- **Mann-Whitney p-value**: 0.8463
- **Statistically Significant**: False
- **Censored Fraction**: 48.0%
- **Suggested Sowing Window**: ১৫ জুন – ৩০ জুন
- **Suggested Transplanting Window**: ১৫ জুলাই – ৫ আগস্ট
- **Bangla Headline**: বগুড়া অঞ্চলে আমন রোপণ সময় অপরিবর্তিত (জুলাইয়ের মাঝামাঝি থেকে আগস্টের প্রথম সপ্তাহ); প্রচলিত বিআরআরআই ক্যালেন্ডার অনুসরণ করুন।
- **English Headline**: Aman planting window for Bogura remains unchanged (mid-July to early August); follow standard BRRI crop calendar.
- **Bangla SMS (<160 chars)**: `বগুড়া আমন: রোপণের সময় অপরিবর্তিত। বীজতলা জুনের শেষ সপ্তাহে ও রোপণ জুলাইতে করুন। বিআরআরআই নির্দেশিকা মেনে চলুন।`

### Aus Rice Season Advisory:
- **Status**: `ok`
- **Median Historical Shift**: +7.0 days
- **Mann-Whitney p-value**: 0.8918
- **Statistically Significant**: False
- **Bangla Headline**: বগুড়া অঞ্চলে প্রাক-বর্ষার বৃষ্টি এখন আগে শুরু হচ্ছে: আউশ রোপণ ও জমি প্রস্তুতি আগে করা যায়।
- **Bangla SMS (<160 chars)**: `বগুড়া আউশ: প্রাক-বর্ষার বৃষ্টি এখন আগে শুরু হচ্ছে: আউশ রোপণ ও জমি প্রস্তুতি আগে করা যায়।`

---

## 3. Multi-Season Crop Planning (MILP Solves)

Tested 4 optimization priorities for 6 periods (2 years × seasonal cropping cycles):

### Priority: `PROFIT`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 4.7232
- **Rotation**: Y1_S1: **Tomato** → Y1_S2: **Groundnut** → Y2_S1: **Tomato** → Y2_S2: **Groundnut** → Y3_S1: **Tomato** → Y3_S2: **Groundnut**
- **Profit Component**: 905,205 BDT
- **Water Index Component**: 4.4895
- **Soil Health Component**: 3.0000

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Tomato** | 10.00 | Profit |
| Y1_S2 | **Groundnut** | 10.00 | Profit |
| Y2_S1 | **Tomato** | 10.00 | Profit |
| Y2_S2 | **Groundnut** | 10.00 | Profit |
| Y3_S1 | **Tomato** | 10.00 | Profit |
| Y3_S2 | **Groundnut** | 10.00 | Profit |

### Priority: `WATER`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 5.4831
- **Rotation**: Y1_S1: **Chickpea** → Y1_S2: **Sesame** → Y2_S1: **Chickpea** → Y2_S2: **Sesame** → Y3_S1: **Chickpea** → Y3_S2: **Sesame**
- **Profit Component**: 377,850 BDT
- **Water Index Component**: 5.4831
- **Soil Health Component**: 4.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Chickpea** | 10.00 | Water |
| Y1_S2 | **Sesame** | 10.00 | Water |
| Y2_S1 | **Chickpea** | 10.00 | Water |
| Y2_S2 | **Sesame** | 10.00 | Water |
| Y3_S1 | **Chickpea** | 10.00 | Water |
| Y3_S2 | **Sesame** | 10.00 | Water |

### Priority: `SOIL`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 4.3332
- **Rotation**: Y1_S1: **Chickpea** → Y1_S2: **Sesame** → Y2_S1: **Chickpea** → Y2_S2: **Sesame** → Y3_S1: **Mustard** → Y3_S2: **Mungbean**
- **Profit Component**: 331,575 BDT
- **Water Index Component**: 5.3973
- **Soil Health Component**: 4.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Chickpea** | 10.00 | Soil |
| Y1_S2 | **Sesame** | 10.00 | Soil |
| Y2_S1 | **Chickpea** | 10.00 | Soil |
| Y2_S2 | **Sesame** | 10.00 | Soil |
| Y3_S1 | **Mustard** | 10.00 | Soil |
| Y3_S2 | **Mungbean** | 10.00 | Soil |

### Priority: `BALANCED`
- **Solver Status**: `optimal` (CBC Branch-and-Bound)
- **Objective Value**: 4.1162
- **Rotation**: Y1_S1: **Chickpea** → Y1_S2: **Jute** → Y2_S1: **Chickpea** → Y2_S2: **Jute** → Y3_S1: **Chickpea** → Y3_S2: **Jute**
- **Profit Component**: 384,066 BDT
- **Water Index Component**: 5.4831
- **Soil Health Component**: 4.3332

| Period | Scheduled Crop | Field Area (ha) | Priority Strategy |
| :--- | :--- | :---: | :--- |
| Y1_S1 | **Chickpea** | 10.00 | Balanced |
| Y1_S2 | **Jute** | 10.00 | Balanced |
| Y2_S1 | **Chickpea** | 10.00 | Balanced |
| Y2_S2 | **Jute** | 10.00 | Balanced |
| Y3_S1 | **Chickpea** | 10.00 | Balanced |
| Y3_S2 | **Jute** | 10.00 | Balanced |

---

## 4. Market & Economics Overview

- **Available Crops Catalogued**: 15 crops with illustrative demo crop economics.
- **Single Source of Truth**: Market costs, prices, and yields align identically with the MILP agronomic model parameters (labelled as illustrative demo values).
