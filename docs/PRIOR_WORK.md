# FieldShift 2026 — Prior Work Disclosure & Git History Audit
## NASA International Space Apps Challenge 2026 — Team Azoic (Dhaka, Bangladesh)
**Challenge Track:** "Field Shift: Adapting Farms with NASA Data"  
**Event Dates:** November 13–14, 2026  
**Repository:** [https://github.com/danial-hossain/FieldShift2026](https://github.com/danial-hossain/FieldShift2026)  
**Authors:** Daniel Hossain (Lead), Md. Fazle Elahi Mahi, Nusrat Jahan Tuli, Roman Ahmed Tanmoy, Mustakim Musa, Abir Ahmed Joy  

---

### 1. Statement of Intellectual Honesty

In strict accordance with the rules of the NASA International Space Apps Challenge, Team Azoic submits this full, transparent disclosure of all repository commits and work executed prior to the official Bangladesh hackathon event on November 13–14, 2026.

Space Apps guidelines encourage teams to create novel solutions during the hackathon sprint while allowing pre-existing open-source libraries, frameworks, and foundational code provided they are openly disclosed. We believe transparency is the foundation of scientific integrity.

---

### 2. Chronological Git Audit & Development Timeline

#### Phase 1: Pre-Hackathon Exploration & Generic Framework Setup (October 1 – October 26, 2026)
- **Commits:** `3d5b922` to `c9a782a`
- **What Existed:**
  - Standard project directory boilerplate (FastAPI backend structure and Vite React frontend template).
  - Exploratory API client connecting to NASA POWER daily meteorology point endpoints.
  - Generic database schema experiments (Supabase PostgreSQL migrations for field parcels).
  - Basic Three.js canvas setup for exploratory 3D diorama rendering.
  - Initial synthetic benchmark experiments and generic mock UI layouts.
- **What Was Lacking:**
  - The project lacked any rotation-level agronomic optimization.
  - Precipitation was unvalidated, relying on unverified single-season assumptions.
  - No NASA GPM IMERG, SMAP, MODIS, GRACE, or SRTM data were ingested.
  - No offline autonomy existed; the app failed without live internet.

#### Phase 2: Complete Scientific & Architectural Overhaul (October 30 – October 31, 2026)
- **Commits:** `b81dded` to `master`
- **What Was Conceived, Engineered, and Implemented:**
  1. **Transformation to Rotation-First Problem Solving:** Completely pivoted the platform from a speculative single-season forecast to an authentic multi-season (6-season / 2-year) crop rotation optimizer addressing Bangladesh's Boro–Fallow–Aman monoculture.
  2. **NASA GPM IMERG Satellite Cross-Validation:** Downloaded 24 years (2001–2024) of NASA GPM IMERG v07 daily satellite precipitation and cross-validated against NASA POWER 0.5° reanalysis. Discovered and transparently disclosed that POWER's apparent pre-monsoon shift was unconfirmed by satellite precipitation ($p=0.34$), establishing an honest, satellite-confirmed baseline.
  3. **NASA Earth Observation Suite Ingestion:** Downloaded and ingested real empirical datasets:
     - NASA SMAP L4 root-zone soil moisture (`SPL4SMGP`) 9 km anomalies.
     - NASA MODIS 250m NDVI (`MOD13Q1`) greenness trajectories and bare-ground fallow quantification.
     - NASA GRACE-FO Level-3 mascon groundwater decline trend (-1.48 cm/yr in Barind).
     - NASA SRTM 30m digital elevation for slope and waterlogging vulnerability.
  4. **Exact PuLP CBC MILP Mathematical Solver:** Formulated and implemented multi-objective Mixed Integer Linear Programming incorporating biological nitrogen fixation (BNF) legume breaks, food security cereal constraints, and haor wetland flooding protections.
  5. **Deterministic 5-Item Agronomic Card & SAAO Field Notice:** Created deterministic five-item assessment cards for all strategies with mandatory field notices directing farmers to local extension officers (SAAO).
  6. **Plain-Language Bilingual Explanations:** Authored 8 plain-language agronomic explanation popovers ("এর মানে কী?") in Bengali.
  7. **100% Offline Autonomy:** Built complete local caching engines and socket guards ensuring 100% offline standalone execution in remote Bangladeshi villages.

#### Phase 3: Planned Work for the Official Event (November 13–14, 2026)
- Field testing and interviews with local Sub-Assistant Agriculture Officers (SAAO) and smallholder farmers in Godagari (Rajshahi) and Sherpur (Bogura).
- Live presentation, interactive jury demonstration, and fine-tuning village haat price sensitivity models.

---

### 3. Summary Paragraph for NASA Space Apps Project Submission Page

> *"Prior Work Disclosure: Team Azoic began exploratory architectural scaffolding and generic framework setup in October 2026. During the intensive Space Apps sprint leading to the November 2026 event, the entire project was fundamentally overhauled: we pivoted to a rotation-first adaptation framework, downloaded and cross-validated 24 years of NASA GPM IMERG satellite precipitation against NASA POWER, ingested SMAP, MODIS, GRACE, and SRTM observations, formulated the exact PuLP MILP optimization solver, built 100% offline local autonomy, and developed bilingual Bengali farmer tools with mandatory SAAO extension notices. All git history is publicly documented in docs/PRIOR_WORK.md under Apache-2.0."*
