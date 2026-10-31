# Field Variation & Climate Differentiation Verification Report

**NASA Space Apps Challenge 2026**: Field Shift (Adapting Farms with NASA Data)  
**Verification Date**: 2026-11-01  
**Milestone**: Stage P-1 — Items X3 & X4  

---

## 1. Executive Summary & Problem Resolution

Previously, the MILP rotation model suffered from two verified issues:
1. **Lack of Regional Crop Divergence (X3)**: Dinajpur, Bogura, and Satkhira received identical rotations (`Sunflower → Soybean → Rice / Chickpea → Sesame → Rice`) due to crop-agnostic soil texture multipliers (1.0 vs 0.98 for all crops) and lack of dry-season coastal salinity constraints.
2. **Negative Haor Boro Profit (X4)**: Sunamganj haor generated a negative profit (-9,255 BDT/ha) because an artificial 400 mm tubewell irrigation capacity cap was applied to a wetland basin where winter Boro rice relies on abundant surface water (beels/rivers) with low-lift pumping (LLP), starving the forced Boro crop into a 0.54 water stress factor.

### Architectural Fixes Applied:
- **Crop-Specific Soil Texture Suitability**: Integrated a differentiated matrix where paddy rice thrives in heavy clay/clay loam (1.08–1.14), wheat/maize/potato thrive in well-aerated silt loam (1.10–1.18), and legumes/pulses suffer in heavy clay.
- **Coastal Soil Salinity Constraint**: Active coastal saline districts (`satkhira`, `khulna`, `bagerhat`, etc.) enforce dry-season Rabi salinity constraints, eliminating salt-sensitive legumes (Chickpea, Lentil) while rewarding salt-tolerant oilseeds (Sunflower, Mustard).
- **Haor Wetland Water Access**: Seasonally flooded haor lands (`seasonally_flooded=True`) are allocated 1200 mm surface-water irrigation capacity during winter Rabi at surface pumping rates (8 BDT/mm), eliminating artificial water stress and restoring genuine haor Boro rice profitability (+82,501 BDT/ha).

---

## 2. Canonical Field Comparative Analysis (Live MILP Output)

Evaluated under `POST /api/planning` with `priority="balanced"` (weights: Profit 25%, Water 25%, Soil 25%, National Demand 25%):

| Field Name | District | Coordinates | Soil Texture & pH | Seasonally Flooded / Coastal | 2-Year Crop Rotation (Y1: S1-S3 / Y2: S1-S3) | Profit (BDT/ha) | Water Score | Objective Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dinajpur Sadar** | `dinajpur` | 25.6279° N, 88.6332° E | Silt loam (pH 5.8) | Normal (Cool North) | **Wheat** → Soybean → Rice / Chickpea → Sesame → Rice | 174,216 | 4.66 | **2.935** |
| **Bogura Demo** | `bogura` | 24.8500° N, 89.3700° E | Loam (pH 6.8) | Normal (Alluvial) | **Sunflower** → Soybean → Rice / Chickpea → Sesame → Rice | 276,694 | 4.50 | **3.352** |
| **Satkhira Coast** | `satkhira` | 22.7185° N, 89.0705° E | Clay loam (pH 7.4) | Coastal Saline | Sunflower → Soybean → Rice / **Soybean** → Sesame → Rice | 132,396 | 4.51 | **3.662** |
| **Sunamganj Haor** | `sunamganj` | 25.0658° N, 91.3950° E | Clay (pH 5.4) | Haor Wetland | **Boro Rice** → Fallow → Fallow / **Boro Rice** → Mungbean → Fallow | 82,501 | 1.00 | **-2.282** |

---

## 3. Pairwise Agronomic Explanations

### Dinajpur vs. Bogura
- **Observed Difference**: Dinajpur selects **Wheat** in Year 1 Rabi instead of Sunflower (`Wheat → Soybean → Rice` vs `Sunflower → Soybean → Rice`).
- **Explaining Input**: 
  1. Soil texture: Dinajpur's `silty_loam` grants a 1.14 suitability multiplier for Wheat compared to 1.05 in Bogura's `loam`.
  2. Thermal profile: NASA POWER shows Dinajpur winter minimum temperatures average 11.8°C (ideal for wheat vernalization and grain filling) versus 13.9°C in Bogura.

### Bogura vs. Satkhira
- **Observed Difference**: Satkhira replaces Chickpea with **Soybean** in Year 2 Rabi (`Sunflower → Soybean → Rice / Soybean → Sesame → Rice`).
- **Explaining Input**:
  1. Coastal salinity constraint: Satkhira is in the southwest coastal saline zone where dry-season soil salinity reaches EC 4–12 dS/m. Salt-sensitive Chickpea suffers severe nodulation failure and osmotic burn, rendering it agronomically infeasible.
  2. Soil texture: Satkhira's heavy `clay_loam` penalizes Chickpea root respiration (0.72 factor) while favoring Soybean (1.10 factor).

### Sunamganj Haor vs. All Other Fields
- **Observed Difference**: Completely distinct mono-dominant rotation centered on winter **Boro Rice** with mandatory Kharif-2 monsoon flood fallowing (`Boro Rice → Fallow → Fallow / Boro Rice → Mungbean → Fallow`).
- **Explaining Input & X4 Resolution**:
  1. Hydrological inundation: Haor basins are submerged under 2–4 meters of water from June to October, making Kharif-2 crop cultivation physically impossible (forced fallow).
  2. Surface irrigation access: Receding monsoon waters in beels and rivers provide 1200 mm surface water capacity for winter Boro at low-lift pumping rates (8 BDT/mm). Boro Rice achieves full 5.15 t/ha yield with water stress factor 1.00, turning the previous -9,255 BDT deficit into a verified positive profit of **+82,501 BDT/ha**.
