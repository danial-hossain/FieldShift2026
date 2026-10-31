# FieldShift 2026: Climate-Adaptive Crop Rotation & Planting Intelligence
## NASA International Space Apps Challenge 2026 — Official Project Submission

**Project Title:** FieldShift 2026: Climate-Adaptive Crop Rotation & Planting Intelligence  
**Challenge:** "Field Shift: Adapting Farms with NASA Data" (Bangladesh Event, 13–14 Nov 2026)  
**Team Name:** Team Azoic, Dhaka  
**Team Members:** Daniel Hossain (Lead), Md. Fazle Elahi Mahi, Nusrat Jahan Tuli, Roman Ahmed Tanmoy, Mustakim Musa, Abir Ahmed Joy  
**Repository:** [GitHub Link: https://github.com/danial-hossain/FieldShift2026]  
**License:** Apache License 2.0 (Open Source)  
**Long Video (240s):** [240s video link]  
**Global Pitch Video (30s):** [30s video link]  

---

## 1. High-Level Summary (<= 150 words)

Smallholder farmers across Bangladesh are trapped in a fragile Boro–Fallow–Aman monoculture, depleting Barind tract groundwater by -1.48 cm/year and degrading soils during bare fallow months. **FieldShift 2026** is a rotation-first decision-support tool that bridges 25 years of NASA Earth observations directly to smallholder farmers. 

A farmer enters their field anywhere in Bangladesh and evaluates their existing rotation against three NASA-informed alternatives (Balanced, Water-Saving, Soil-Building) using exact mathematical optimization (PuLP MILP). Each strategy features a deterministic 5-item card detailing why it was chosen, scientific evidence from NASA GPM IMERG, POWER, SMAP, MODIS, GRACE, and SRTM, benefits versus baseline, data gaps, and risks. 

With plain-language popovers ("এর মানে কী?"), 100% offline functionality, and mandatory local SAAO verification notices, FieldShift empowers farmers to adapt crop rotations with scientific conservatism and zero fabricated numbers.

---

## 2. Project Demo & Video Links
- **30-Second Global Pitch Video:** [30s video link]
- **240-Second In-Depth Demonstration & Technical Walkthrough:** [240s video link]
- **Interactive Open Source Repository:** [GitHub Link: https://github.com/danial-hossain/FieldShift2026]

---

## 3. Project Details

### Why: The Smallholder Rotation Crisis in Bangladesh
In the drought-prone Barind Tract (Rajshahi, Bogura) and floodplains of Bangladesh, millions of smallholder farmers face severe ecological and financial risks. Pumping deep tubewell groundwater for dry-season Boro rice consumes unsustainable electrical energy and causes severe aquifer drawdown. Simultaneously, extended fallow periods leave topsoil exposed to rainstorm erosion, exhausting biological soil organic matter.

Traditional agrarian planting calendars cannot adapt to modern climate volatility. However, a single-season planting advisory is not enough: farmers require a comprehensive, multi-season **crop rotation strategy** that builds soil health, cuts water demand, and breaks pest cycles while safeguarding household cash income.

### What: A Rotation-First Decision Support Platform
FieldShift models an agronomic horizon of **6 distinct agricultural seasons across 2 years** (Rabi dry season, Kharif-1 pre-monsoon, Kharif-2 monsoon). 

1. **Existing Rotation Baseline:** The farmer registers their current practice (e.g. Boro–Fallow–Aman) in "My Farm". FieldShift models this baseline under identical agro-meteorological constraints.
2. **Three NASA-Informed Alternative Strategies:**
   - **Balanced Strategy:** Solves for a multi-objective trade-off between profit, water conservation, and soil health.
   - **Water-Saving Strategy:** Replaces heavy dry-season rice with low-water pulses and oilseeds, weighted by GRACE groundwater depletion rates.
   - **Soil-Building Strategy:** Mandates biological nitrogen-fixing (BNF) legumes and continuous living soil canopy, cutting synthetic urea costs.
3. **Deterministic 5-Item Strategy Assessment Card:**
   - *১. কেন এই প্রস্তাব? (Why Suggested):* Derived deterministically from objective components and binding farmer constraints.
   - *২. উপাত্তভিত্তিক প্রমাণ (Scientific Evidence):* Calibrated with NASA POWER 25-year climatology, GPM IMERG rainfall, SMAP root moisture, and SoilGrids hydraulic properties.
   - *৩. বিদ্যমান অভ্যাসের তুলনায় সুবিধা (Benefits vs Baseline):* Clear delta in water saved (mm), BNF nitrogen fixed (+70 kg N/ha), soil organic carbon gain, bare days reduced, and net gross margin.
   - *৪. তথ্যের ঘাটতি (Information Gaps):* Discloses satellite resolution limitations ($0.5^\circ$ vs micro-drainage) and lack of local laboratory soil tests.
   - *৫. ঝুঁকি ও মাঠপর্যায়ে স্থানীয় যাচাইকরণ (Risks Needing Local Review):* Advises seed germination checks and field drainage inspections.
4. **Mandatory Extension Verification Notice:** Every strategy output concludes with:
   > *"এটি সিদ্ধান্তে সহায়তার জন্য; স্থানীয় কৃষি কর্মকর্তার (SAAO) সাথে যাচাই করুন।"*  
   > *(This is for decision support; please verify with your local Sub-Assistant Agriculture Officer).*
5. **Plain-Language Explanations ("এর মানে কী?"):** Interactive popovers translate technical agronomic terms into intuitive farmer language: evapotranspiration ($ET_0$), SMAP soil moisture anomalies, MODIS NDVI canopy greenness, heat stress thresholds, FAO-56 water balance, satellite versus ground measurements, reanalysis versus direct observation, and uncertainty bounds (P10–P90).
6. **Scenario Perturbation & 64-District Choropleth:** Interactive climate sliders allow farmers and extension officers to simulate rainfall ($\pm 20\%$) and temperature ($+0..+2^\circ\text{C}$) perturbations, observing real-time strategy resilience across all 64 districts.

### How: Honest Science & Discrepancy Disclosure
FieldShift does not invent data or gloss over scientific contradictions:
- **POWER vs. GPM IMERG Discrepancy:** While NASA POWER $0.5^\circ$ reanalysis suggested an earlier pre-monsoon onset in western Bangladesh (-21.5 days in Rajshahi, $p=0.0038$), high-resolution NASA GPM IMERG $0.1^\circ$ direct satellite precipitation does **not** confirm this shift ($p \ge 0.34$, median shift 0.0 days in Bogura). Both datasets confirm that the main monsoon Aman onset has remained stable ($p \ge 0.19$).
- FieldShift adheres to satellite-confirmed IMERG observations and prevents premature planting advisories.

---

## 4. NASA Earth Observation Data Sources Used

1. **NASA GPM IMERG Final Daily (`GPM_3IMERGDF` v07):** 0.1° × 0.1° resolution daily precipitation (2001–2024, 24 years) via GES DISC. Used for rainfall reliability, dry-spell risk, and monsoon onset cross-validation.
2. **NASA POWER Daily Point API (v2.0):** 0.5° × 0.5° spatial grid (2001–2025, 25 years). Used for surface solar radiation, daily max/min temperatures, reference evapotranspiration ($ET_0$ via FAO-56 Penman-Monteith), and Growing Degree Days.
3. **NASA SMAP L4 Global Root Zone Soil Moisture (`SPL4SMGP`):** 9 km spatial resolution (2015–2024). Used for 0–100 cm root-zone soil moisture anomalies indicating pre-monsoon and post-monsoon drought stress.
4. **NASA Terra MODIS (`MOD13Q1.061`):** 250 m 16-day NDVI vegetation index (2001–2024). Used for vegetative canopy cycles and identifying bare-ground fallow periods (NDVI < 0.20).
5. **NASA GRACE / GRACE-FO Level-3 Mascon:** JPL RL06.3M (2002–2024, 267 months). Identifies long-term Barind tract aquifer decline (-1.48 cm/year) to dynamically weight water conservation.
6. **NASA SRTM 30m (`SRTMGL1`):** 1 arc-second global digital elevation model. Ingested for field-specific slope percentage and drainage/flood exposure assessment.

---

## 5. Tools, Frameworks & Community Involvement

- **Algorithmic Solvers:** PuLP CBC Branch-and-Bound Mixed Integer Linear Programming (MILP), Gymnasium Reinforcement Learning environment for sequential decision comparisons, SciPy for statistical rank-sum tests.
- **Frontend & Visualization:** React 19, Vite, Three.js (procedural 3D clay farm diorama with natural grass tones `#5f8f3c..#7aa84d` and on-demand rendering), SVG choropleth mapping.
- **Offline Infrastructure:** FastAPI, SQLite, full fixture caching for 100% offline standalone execution in remote rural areas.
- **Community & Extension:** Designed in consultation with sub-district agrarian practices in Rajshahi and Bogura, aligning recommendations with Bangladesh Agricultural Research Institute (BARI) and Bangladesh Rice Research Institute (BRRI) certified cropping systems.

---

## 6. Use of AI Disclosure
Documented comprehensively in [docs/AI_USE.md](docs/AI_USE.md):
- **Development & Coding Assistance:** Google Antigravity with Gemini models used for test-driven code implementation, refactoring, and automated validation scripts.
- **Scientific Verification:** ChatGPT and Claude models used for independent code review, mathematical sanity checks of FAO-56 Penman-Monteith equations, and cross-validation verification.
- **In-App Assistant:** Deterministic rule-based and pre-computed prompt routing; does not fabricate crop advice.
- **Human Decision-Making:** All architectural decisions, agronomic thresholds, and statistical validations were designed and verified by Team Azoic.

---

## 7. References
1. Allen, R. G., et al. (1998). *Crop evapotranspiration - Guidelines for computing crop water requirements*. FAO Irrigation and drainage paper 56.
2. Huffman, G. J., et al. (2020). *GPM IMERG Final Precipitation L3 1 day 0.1 degree x 0.1 degree V07*. NASA Goddard Earth Sciences Data and Information Services Center (GES DISC).
3. NASA POWER Project. (2025). *Prediction Of Worldwide Energy Resources Daily Point API*. NASA Langley Research Center.
4. Reichle, R., et al. (2022). *SMAP L4 Global 9 km EASE-Grid Surface and Root Zone Soil Moisture Analysis Update*. NASA NSIDC.
5. Save, H., et al. (2016). *High-resolution CSR GRACE RL05 mascons*. Journal of Geophysical Research: Solid Earth.
6. Bangladesh Rice Research Institute (BRRI). (2024). *Modern Rice Cultivation Guidelines (Bangla)*. Joydebpur, Gazipur.
