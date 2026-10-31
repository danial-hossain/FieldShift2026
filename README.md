# FieldShift 2026: Climate-Adaptive Crop Rotation & Planting Intelligence

**NASA International Space Apps Challenge 2026**  
**Challenge:** "Field Shift: Adapting Farms with NASA Data" (Bangladesh Event, 13–14 Nov 2026)  
**Team:** Team Azoic, Dhaka (Daniel Hossain [Lead], Md. Fazle Elahi Mahi, Nusrat Jahan Tuli, Roman Ahmed Tanmoy, Mustakim Musa, Abir Ahmed Joy)  
**License:** Apache License 2.0 (see [LICENSE](LICENSE))  
**AI Disclosure:** Documented in [docs/AI_USE.md](docs/AI_USE.md) and [docs/prompts/README.md](docs/prompts/README.md)  
**Methodology & Cross-Validation:** Documented in [docs/imerg_validation.md](docs/imerg_validation.md)  

---

## The Rotation-First Story: Adapting Bangladesh Farms with NASA Data

In the drought-prone Barind Tract of Rajshahi and floodplains across Bangladesh, smallholder farmers are locked into a high-risk **Boro–Fallow–Aman** monoculture. Pumping deep tubewell groundwater for dry-season Boro rice rapidly depletes regional aquifers, while extended fallow periods leave topsoil exposed and biological soil nitrogen depleted.

**FieldShift 2026** transforms farm decision-support from a single-season forecast into an **honest, multi-season crop rotation intelligence tool**. When a farmer enters their parcel anywhere in Bangladesh, FieldShift evaluates their **existing rotation as the baseline** and benchmarks it against **three NASA-informed alternative strategies**:

1. **Balanced Strategy:** Mathematically balances gross margin, irrigation water preservation, and soil organic matter replenishment across a 6-season (2-year) horizon.
2. **Water-Saving Strategy:** Replaces heavy dry-season rice pumping with low-water pulses, mustard, or oilseeds, preserving groundwater in depleting Barind aquifers.
3. **Soil-Building Strategy:** Maximizes biological nitrogen fixation (BNF) with leguminous pulses and living canopy cover, cutting synthetic urea costs and suppressing pest cycles.

For every strategy (including the farmer's current baseline), FieldShift generates a deterministic **5-Item Agronomic Assessment Card**:
- **১. কেন এই প্রস্তাব? (Why Suggested):** Mathematical objective drivers and binding resource constraints (irrigation limits, labor shortage, power tiller equipment).
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
- **Bangladesh Bureau of Statistics (BBS):** District and Upazila agricultural gazetteer.

---

## Transparent Scientific Disclosure: POWER vs. GPM IMERG

FieldShift prioritizes scientific honesty over convenient claims:
- **The Discrepancy:** In initial exploratory analysis with **NASA POWER 0.5° reanalysis**, cumulative anomalous accumulation indicated a potential -21.5 day shift ($p=0.0038$) in Rajshahi pre-monsoon wet onset between 2001–2012 and 2013–2024.
- **The Satellite Ground Truth:** Cross-validating with **NASA GPM IMERG 0.1° satellite precipitation** revealed that the apparent pre-monsoon shift is **not confirmed** by direct satellite radar/radiometer observations ($p \ge 0.34$ across all 6 districts; median shift in Bogura is 0.0 days, Rangpur -1.5 days). Furthermore, both datasets confirm that Kharif-2 Aman monsoon onset has **not shifted significantly** (shift +3.5 to +8.5 days, $p \ge 0.19$).
- **FieldShift's Policy:** FieldShift maintains agronomic conservatism, uses satellite-confirmed IMERG precipitation dynamics, and explicitly warns farmers not to shift planting calendars forward prematurely based on unverified reanalysis trends.

---

## 100% Offline Autonomy

Smallholder farms in rural Bangladesh frequently lack reliable cellular connectivity. FieldShift is engineered from the ground up for 100% offline autonomy:
- All 64-district NASA POWER agro-climatologies, GPM IMERG onset metrics, SMAP root-zone moisture anomalies, MODIS NDVI curves, and GRACE trends are pre-cached in deterministic local stores.
- Run offline with:
  ```powershell
  $env:OFFLINE="1"
  python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
  ```
  ```powershell
  cd frontend
  npm run dev
  ```
- All optimization solvers (PuLP CBC MILP), financial calculators, and 3D procedural visualizations execute entirely on the local machine with zero external network requests.

---

## Verification & Test Suite

FieldShift includes comprehensive automated test suites:
- **Frontend Unit Tests:** 140/140 passed (`cd frontend ; npm test`).
- **SSR Smoke Test:** 12/12 platform destinations + Research Sub-Lab passed (`cd frontend ; npm run smoke`).
- **Offline Integrity Check:** 10/10 checkpoints passed (`python scripts/demo_check.py`).
- **Field Consistency Test:** All 4 Bangladesh agro-climatic zones verified (`python scripts/field_test.py --all`).
