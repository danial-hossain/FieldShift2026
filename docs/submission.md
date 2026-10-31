# FieldShift 2026: Climate-Adaptive Crop Rotation & Planting Intelligence
## NASA International Space Apps Challenge 2026 — Official Project Submission

**Project Title:** FieldShift 2026: Climate-Adaptive Crop Rotation & Planting Intelligence  
**Challenge:** "Field Shift: Adapting Farms with NASA Data" (NASA Space Apps 2026)  
**Location Event:** Bangladesh Event (13–14 November 2026)  
**Team Name:** Team Azoic  
**Project Repository:** https://github.com/danial-hossain/FieldShift2026  
**License:** Apache License 2.0 (Open Source)  
**AI Disclosure:** Documented in [docs/AI_USE.md](AI_USE.md) and [docs/prompts/README.md](prompts/README.md)  

---

## Team Members & Roles (Team Azoic)

1. **Danial Hossain** — Project Lead & Full-Stack Architect (NASA APIs, FastAPI, React 19 architecture, end-to-end integration)
2. **Agronomy & Climate Specialist** — Agro-Meteorology & Onset Modeling (NASA POWER & GPM IMERG statistical analysis, Liebmann anomalous accumulation, Mann-Whitney tests, BRRI/BARI phenology)
3. **Operations Research Engineer** — Mathematical Programming & Optimization (PuLP Mixed-Integer Linear Programming, Saxton-Rawls soil hydraulics, FAO-56 Penman-Monteith water scheduling)
4. **Data Systems & Provenance Lead** — Geospatial Data Pipeline (ISRIC SoilGrids 250m integration, FAOSTAT national food balance sheets, SQLite persistence, offline caching)
5. **UI/UX & 3D Visualization Engineer** — Frontend & Interactive Graphics (Three.js clay farm diorama, responsive design system, bilingual English/Bengali interface)
6. **Field Validation & Impact Coordinator** — Farmer Advisory & Communication (Bangla SMS generation under 160 characters, regional field validation across Northwest, Floodplain, Coastal, and Haor zones)

---

## 1. Challenge & Problem Statement

Across Bangladesh, 35 million smallholder farming families rely on predictable monsoon rains for the Aman rice crop, which provides over 35% of the national grain supply. However, escalating climate volatility has disrupted traditional lunar and solar agrarian calendars:
- **False Onset Seedling Mortality:** Pre-monsoon convective storms (Kalbaishakhi) in April/May frequently deceive farmers into premature sowing. When followed by multi-week dry spells, fragile nursery seedbeds perish.
- **Terminal Drought & Cold Sterility:** When farmers delay planting beyond safe biological windows, standard 145-day rice varieties (e.g., BRRI dhan49) suffer flower abortion during post-monsoon October droughts and spikelet sterility during winter cold snaps.
- **Aquifer Depletion & Input Inefficiency:** Conventional continuous flood irrigation in the dry Rabi season consumes over 3,000 m³ of water per hectare, depleting groundwater tables and wasting diesel pumping fuel.

---

## 2. The FieldShift Solution

FieldShift 2026 empowers any farmer or agronomist in Bangladesh to specify any field coordinate and receive:
1. **Honest NASA-Based Planting Advice:** Empirical Aman Kharif-2 and Aus Kharif-1 monsoon onset detection derived from 25 years of NASA POWER and verified against NASA GPM IMERG 0.1° satellite observations.
2. **Realistic 6-Period Multi-Season Crop Rotation:** A 2-year × 3-season (Rabi, Kharif-1, Kharif-2) Mixed-Integer Linear Programming (PuLP MILP) schedule adhering strictly to biological nitrogen fixation (BNF) intervals, botanical family alternations, and seasonal agro-ecological suitability.
3. **Scientific Water Budgeting (FAO-56):** Daily soil-water deficit balance utilizing the FAO-56 Penman-Monteith reference evapotranspiration ($ET_0$) equation, dynamic single-crop $K_c$ curves, and ISRIC SoilGrids 250m hydraulic properties (Saxton-Rawls), evaluating net irrigation requirements against conventional unmanaged flooding based on assumed field efficiency 45% vs 75% (FAO reference values).
4. **National Need & Market Intelligence:** Crop selection grounded in official FAOSTAT Bangladesh food balance sheets (2022–2024), prioritizing national deficit crops (pulses, oilseeds, wheat) for import substitution while aligning farmgate prices with BBS/DAM benchmarks.
5. **100% Offline Autonomy:** Fully operational in low-connectivity rural settings without active internet access via local SQLite persistence and bundled fixtures.

---

## 3. NASA Earth Observations & Datasets Used

| NASA Dataset | Resolution | Parameters Ingested | Specific Application in FieldShift |
| :--- | :--- | :--- | :--- |
| **NASA POWER Daily Point API** | 0.5° × 0.5° (~50 km); Daily 2001–2025 | `PRECTOTCORR`, `T2M`, `T2M_MAX`, `T2M_MIN`, `RH2M`, `WS2M`, `ALLSKY_SFC_SW_DWN` | Empirical monsoon onset detection, Growing Degree Days (GDD), daily FAO-56 Penman-Monteith $ET_0$ calculation, 25-year climatology baseline. |
| **NASA GPM IMERG Final Daily v07** (`GPM_3IMERGDF`) | 0.1° × 0.1° (~10 km); Daily 2001–2024 | Daily calibrated satellite precipitation (`precipitationCal`) | High-resolution cross-validation of onset trends; independent ground-truth check preventing premature planting claims. |
| **NASA GIBS / VIIRS** | 250 m true-color; daily overpass | Corrected Surface Reflectance RGB | Geospatial surface context and parcel orientation across Bangladesh agricultural zones. |
| **ISRIC SoilGrids 250m REST v2.0** | 250 m grid at 6 depth intervals | Sand %, Clay %, Silt %, pH ($H_2O$), Soil Organic Carbon (SOC) | Derivation of USDA texture class, Saxton-Rawls water retention curves (Field Capacity, Wilting Point, TAW). |
| **FAOSTAT Bangladesh Food Balance** | National annual trade & production (2022–2024) | Production, Imports, Exports, Domestic Supply | Crop categorisation into National Deficit Crops (import substitution), Commercial Cash Crops, and Domestic Staples. |

---

## 4. Scientific Rigor & Cross-Validation

### Dual-Source Validation: NASA POWER vs. NASA GPM IMERG
To avoid relying solely on reanalysis precipitation, FieldShift performed independent cross-validation between NASA POWER (0.5°) and NASA GPM IMERG (0.1°) across 24 historical years (2001–2024, 8,766 daily timesteps per cell):
- **Finding:** While NASA POWER reanalysis suggested a pre-monsoon wetting trend in northwest Bangladesh, NASA GPM IMERG satellite observations showed **no statistically significant shift** in wet-season anomalous accumulation onset ($p \ge 0.34$).
- **Agronomic Integrity:** FieldShift refuses to mislead farmers. Because satellite observations do not confirm an earlier onset, the advisory explicitly preserves traditional sowing windows (mid-June seedbeds, mid-July transplanting) and recommends drought-escaping varieties (BRRI dhan75/87) to manage year-to-year volatility.

### Benjamini-Hochberg False Discovery Rate (FDR) Control
Onset shifts across all 64 districts are evaluated by clustering districts into their 39 unique NASA POWER 0.5° grid cells. Benjamini-Hochberg FDR correction ($\alpha = 0.05$) is applied exclusively over the independent grid cells, eliminating spatial autocorrelation artifacts.

---

## 5. End-to-End Field Validation Across 4 Diverse Agro-Ecological Zones

The platform was verified via `python scripts/field_test.py --all` across four distinct agro-ecological regions in Bangladesh:
1. **Dinajpur Sadar (25.6279° N, 88.6332° E, 2.0 ha):** Northwest Barind rice-wheat belt.
2. **Bogura Demo (24.8500° N, 89.3700° E, 10.0 ha):** Intensive commercial alluvial floodplain.
3. **Satkhira Coast (22.7185° N, 89.0705° E, 1.5 ha):** Southern coastal salinity-affected delta.
4. **Sunamganj Haor (25.0658° N, 91.3950° E, 1.0 ha):** Northeast seasonal haor wetland rice basin.

Detailed markdown verification reports for all four regions are published under `docs/field_tests/`.

---

## 6. How Judges Can Verify & Run FieldShift

```bash
# 1. Run 10-point offline system integrity check (exits 0)
python scripts/demo_check.py

# 2. Run end-to-end field test across all 4 regions
python scripts/field_test.py --all

# 3. Run full backend pytest suite
python -m pytest tests/test_milp_bangladesh_realism.py tests/test_water_fao56.py tests/test_market_faostat_integration.py

# 4. Run frontend tests and SSR smoke test
cd frontend
npm test
npm run smoke
```
