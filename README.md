# FieldShift 2026: Climate-Adaptive Crop Rotation & Planting Intelligence

**NASA International Space Apps Challenge 2026**  
**Challenge:** "Field Shift: Adapting Farms with NASA Data" (Bangladesh Event, 13–14 Nov 2026)  
**Team:** Team Azoic, Dhaka (Daniel Hossain [Lead], Md. Fazle Elahi Mahi, Nusrat Jahan Tuli, Roman Ahmed Tanmoy, Mustakim Musa, Abir Ahmed Joy)  
**License:** Apache License 2.0 (see [LICENSE](LICENSE))  
**Prior Work Disclosure:** Documented in [docs/PRIOR_WORK.md](docs/PRIOR_WORK.md)  
**AI Disclosure:** Documented in [docs/AI_USE.md](docs/AI_USE.md)  
**Methodology & Cross-Validation:** Documented in [docs/imerg_validation.md](docs/imerg_validation.md)  

---

## What FieldShift Does: The Rotation-First Story

In the drought-prone Barind Tract of Rajshahi and riverine floodplains across Bangladesh, smallholder farmers are locked into a high-risk **Boro–Fallow–Aman** monoculture. Pumping deep tubewell groundwater for dry-season Boro rice rapidly depletes regional aquifers, while extended 75-day pre-monsoon fallows leave topsoil exposed to erosion and strip soil organic matter.

**FieldShift 2026** transforms agricultural decision-support from a single-season forecast into an **honest, multi-season crop rotation intelligence tool**. When a farmer registers their parcel anywhere in Bangladesh, FieldShift evaluates their **existing rotation as the baseline** and benchmarks it against **three NASA-informed alternative strategies**:

1. **Balanced Strategy:** Mathematically balances gross margin, irrigation water preservation, and soil organic matter replenishment across a 6-season (2-year) planning horizon.
2. **Water-Saving Strategy:** Replaces heavy dry-season rice pumping with low-water pulses, mustard, or oilseeds, reducing aquifer drawdown in depleting Barind regions.
3. **Soil-Building Strategy:** Maximizes biological nitrogen fixation (BNF) with leguminous pulses and living canopy cover, cutting synthetic urea costs and breaking pest cycles.

For every strategy (including the farmer's current baseline), FieldShift generates a deterministic **5-Item Agronomic Assessment Card**:
- **১. কেন এই প্রস্তাব? (Why Suggested):** Objective drivers and binding resource constraints (irrigation limits, labor shortage, power tiller equipment availability).
- **২. উপাত্তভিত্তিক প্রমাণ (Scientific Evidence):** Exact parameters linked to verified NASA Earth observation datasets and soil properties.
- **৩. বিদ্যমান অভ্যাসের তুলনায় সুবিধা (Benefits vs Baseline):** Quantified delta in water saved (mm), biological N fixed (kg/ha), soil organic carbon gain, bare-ground reduction, and net gross margin.
- **৪. তথ্যের ঘাটতি (Information Gaps):** Transparent disclosure of gridded satellite footprint limits ($0.5^\circ$ vs micro-drainage), illustrative market prices, and lack of local laboratory soil tests.
- **৫. ঝুঁকি ও মাঠপর্যায়ে স্থানীয় যাচাইকরণ (Risks Needing Local Review):** Certified seed germination, pest monitoring, and drainage inspection.

Every strategy card concludes with the mandatory field notice:  
**"এটি সিদ্ধান্তে সহায়তার জন্য; স্থানীয় কৃষি কর্মকর্তার (SAAO) সাথে যাচাই করুন।"** *(This is for decision support; please verify with your local Sub-Assistant Agriculture Officer).*

---

## NASA Earth Observation Datasets Actually Used

FieldShift relies exclusively on real, validated satellite observations and physical assimilations. Zero numbers are fabricated:

| NASA Dataset | Product / Collection | Resolution & Span | How It Is Used in FieldShift |
| :--- | :--- | :--- | :--- |
| **NASA GPM IMERG** | `GPM_3IMERGDF` v07 (Final Daily) | 0.1° × 0.1° (~10 km); 2001–2024 (24 yrs) | Satellite-calibrated daily precipitation; rainfall reliability, dry-spell risk, and monsoon onset cross-validation. |
| **NASA POWER** | Daily Point Meteorology (v2.0) | 0.5° × 0.5° (~50 km); 2001–2025 (25 yrs) | Surface solar radiation (`ALLSKY_SFC_SW_DWN`), daily air temperature (`T2M`, `T2M_MAX`, `T2M_MIN`), humidity (`RH2M`), wind speed (`WS2M`), Growing Degree Days (GDD), and reference evapotranspiration ($ET_0$). |
| **NASA SMAP** | L4 Global Surface & Root Zone Soil Moisture (`SPL4SMGP`) | 9 km grid; 2015–2024 monthly climatology & anomalies | 0–100 cm root-zone soil moisture anomalies indicating pre-monsoon and post-monsoon crop water stress. |
| **NASA MODIS** | Terra MODIS Vegetation Indices (`MOD13Q1.061`) | 250 m, 16-day composite; 2001–2024 | NDVI canopy greenness trajectory and bare-ground fallow cycle identification (bare soil threshold NDVI < 0.20). |
| **NASA GRACE / GRACE-FO** | Level-3 JPL RL06.3M Mascon Water Storage | 0.5° equivalent grid; 2002–2024 (267 monthly records) | Terrestrial groundwater storage anomalies showing a long-term Barind tract aquifer decline of **-1.48 cm/year**, used as scarcity weighting in the water-saving rotation. |
| **NASA SRTM** | SRTMGL1 1 Arc-Second Global Elevation | 30 m spatial resolution | Field slope percentage and elevation for waterlogging/drainage vulnerability and soil erosion risk. |

### Supplementary Open Datasets
- **ISRIC SoilGrids 250m:** Soil texture class, clay/sand fractions, bulk density, and available water capacity (AWC).
- **FAOSTAT:** Bangladesh national average crop yields and producer prices.
- **Bangladesh Bureau of Statistics (BBS) & DAE:** District and Upazila agricultural gazetteer and crop calendars.

---

## Transparent Scientific Disclosure: POWER vs. GPM IMERG

FieldShift prioritizes scientific honesty over convenient claims:
- **The Discrepancy:** In initial exploratory analysis with **NASA POWER 0.5° reanalysis**, cumulative anomalous accumulation indicated a potential -21.5 day shift ($p=0.0038$) in Rajshahi pre-monsoon wet onset between 2001–2012 and 2013–2024.
- **The Satellite Ground Truth:** Cross-validating with **NASA GPM IMERG 0.1° satellite precipitation** revealed that the apparent pre-monsoon shift is **not confirmed** by direct satellite radar/radiometer observations ($p \ge 0.34$ across all 6 districts; median shift in Bogura is 0.0 days, Rangpur -1.5 days). Both datasets confirm that Kharif-2 Aman monsoon onset has **not shifted significantly** (shift +3.5 to +8.5 days, $p \ge 0.19$).
- **FieldShift's Policy:** FieldShift maintains agronomic conservatism, uses satellite-confirmed IMERG precipitation dynamics, and explicitly warns farmers not to shift planting calendars forward prematurely based on unverified reanalysis trends.

---

## Known Limitations

Judges, researchers, and farmers should note the following boundaries of the model:
1. **Satellite Spatial Resolution:** NASA POWER is gridded at $0.5^\circ \times 0.5^\circ$ (~50 km) and GPM IMERG at $0.1^\circ \times 0.1^\circ$ (~10 km). While suitable for macro-climatology, micro-relief, local embankment shelter, and field-level drainage cannot be resolved from orbit alone.
2. **Dataset Time Span:** NASA GPM IMERG Final Daily observations extend through December 31, 2024. Current season data relies on NASA POWER near-real-time assimilations.
3. **Illustrative Crop Economics:** Crop farmgate prices, input costs, and yields represent regional statistical averages compiled from BBS, DAE, and FAOSTAT. They serve as representative economic benchmarks, not guaranteed spot-market quotes.
4. **Hydrologic Edge Cases:** Low-lying seasonal wetlands (haors in Sunamganj) and coastal salinity surges (Satkhira) are enforced via agronomic seasonal constraints rather than continuous dynamic hydrodynamic simulation.
5. **No Synthetic Soil Substitution:** Orbiting satellites cannot measure subsoil nitrogen, phosphorus, or potassium. FieldShift does not fabricate soil laboratory scores and directs the farmer to local SAAO extension soil sampling.

---

## 100% Offline Autonomy

FieldShift is engineered from the ground up for 100% offline autonomy in remote rural villages:
- All 64-district NASA POWER agro-climatologies, GPM IMERG onset metrics, SMAP root-zone moisture anomalies, MODIS NDVI curves, and GRACE trends are pre-cached in deterministic local stores.
- Start offline with:
  ```powershell
  # Terminal 1: Backend
  $env:OFFLINE="1"
  python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
  ```
  ```powershell
  # Terminal 2: Frontend
  cd frontend
  npm run dev
  ```
- Access demo mode at `http://127.0.0.1:5173/?demo=1`.
- All optimization solvers (PuLP CBC MILP), financial calculators, and 3D procedural visualizations execute entirely on the local machine with zero external network requests.

---

## Team Azoic (Dhaka, Bangladesh)

- **Daniel Hossain** — Team Lead, Agronomic MILP Optimization & Backend Engineering
- **Md. Fazle Elahi Mahi** — NASA Earth Observation Data Engineering & IMERG Validation
- **Nusrat Jahan Tuli** — Geospatial Analysis, Satellite Ingestion & GIS Mapping
- **Roman Ahmed Tanmoy** — Frontend Architecture & 3D WebGL Digital Twin
- **Mustakim Musa** — Scientific Research, Agricultural Extension & Statistical Verification
- **Abir Ahmed Joy** — UX Design, Bilingual Bengali Localization & Video Production

---

## Verification & Test Suite

FieldShift includes comprehensive automated test suites:
- **Frontend Unit Tests:** 146/146 passed (`cd frontend ; npm test`).
- **SSR Smoke Test:** 12/12 platform destinations + Research Sub-Lab passed (`cd frontend ; npm run smoke`).
- **Offline Integrity Check:** 10/10 checkpoints passed (`python scripts/demo_check.py`).
- **Field Consistency Test:** All 4 Bangladesh agro-climatic zones verified (`python scripts/field_test.py --all`).
