# FieldShift 2026 — Comprehensive Page & Controls Guide (পৃষ্ঠা ও নিয়ন্ত্রণ নির্দেশিকা)
## NASA International Space Apps Challenge 2026 — Team Azoic (Dhaka, Bangladesh)

This technical guide provides a complete, authoritative reference for every view, tab, and interactive control in FieldShift 2026. For each module, it documents its purpose, underlying datasets, behavioral changes across fields and inputs, and known scientific boundaries.

---

### ১. কৃষক হোম ড্যাশবোর্ড (Farmer Home Dashboard — `dashboard`)
- **Purpose (উদ্দেশ্য):** Primary entry point for smallholder farmers providing an immediate high-level summary of active field conditions, today's weather glance, seasonal crop advice, and quick actions.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *ডেমো রেকর্ডিং টগল (`?demo=1`):* Switches the platform into recording mode, preselecting Rajshahi, disabling animation delays, and hiding raw developer debug panels.
  - *ভাষা পরিবর্তন (Language Switcher):* Toggles interface dynamically between Bengali (বাংলা) and English.
  - *সক্রিয় জমি নির্বাচক (Active Field Dropdown):* Instantly changes active farm context across all 12 views.
  - *অ্যাকশন বাটন (Quick Action Buttons):* Direct shortcuts to Farm Planning, Weather Station, and Crop Advice.
- **Data Feeds (তথ্য উৎস):** NASA POWER Daily Point climatology (2001–2025), BBS district gazetteer.
- **Dynamic Behavior (গতিশীল আচরণ):** Displays weather, temperature, and crop recommendations specific to the selected district and parcel coordinates.
- **Known Limitations (সীমাবদ্ধতা):** Gridded NASA POWER resolution is $0.5^\circ \times 0.5^\circ$; does not capture micro-climatic shelter under local groves or tree canopies.

---

### ২. আমার জমি ও প্লট ব্যবস্থাপনা (My Farm Workspace — `field`)
- **Purpose (উদ্দেশ্য):** Farm parcel registry where farmers and extension officers create, edit, inspect, and evaluate individual land plots.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *নতুন জমি যোগ করুন (Add Field Modal):* Input fields for parcel name, latitude, longitude, area in hectares, soil texture, pH, and irrigation capacity.
  - *জমি নির্বাচন বোতাম (Select for Analysis):* Sets the parcel as the global active field and triggers geospatial enrichment.
  - *বিদ্যমান আবর্তন নির্বাচক (Existing Rotation Inputs):* Allows entering Rabi, Kharif-1, and Kharif-2 current crops to establish the baseline.
- **Data Feeds (তথ্য উৎস):** PostgreSQL/SQLite field parcel database, ISRIC SoilGrids 250m soil hydraulic properties (`/api/fields/{id}/enrich`).
- **Dynamic Behavior (গতিশীল আচরণ):** Enriches field coordinates with nearest district, distance in km, nearest NASA POWER cell, and SoilGrids clay/sand/OM percentages.
- **Known Limitations (সীমাবদ্ধতা):** SoilGrids represents machine-learning spatial models; farmers must verify nutrient levels via local laboratory soil tests.

---

### ৩. রোপণ পরামর্শ ও শস্য ক্যাটালগ (Planting Advisory & Crop Catalog — `crop_advice`)
- **Purpose (উদ্দেশ্য):** Provides scientifically honest monsoon planting window onset advisories and the official 17-crop agronomic trait catalog.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *ফসল নির্বাচন (Crop Selector: Aman / Aus):* Toggles between main monsoon Aman rice and pre-monsoon Aus rice onset detection.
  - *জেলা নির্বাচন (District Selector):* Switches between all 64 Bangladesh districts to view localized rainfall accumulation curves.
  - *ক্যাটালগ ফিল্টার (Crop Category Filter):* Filters the 17 crops by cereals, pulses/legumes, oilseeds, tubers, and vegetables.
- **Data Feeds (তথ্য উৎস):** NASA GPM IMERG 0.1° daily satellite precipitation (2001–2024), NASA POWER 0.5° reanalysis, BARI/BRRI crop knowledge bases.
- **Dynamic Behavior (গতিশীল আচরণ):** Calculates median onset Day-of-Year (DOY) for Period 1 (2001–2012) and Period 2 (2013–2025), Mann-Whitney U test p-values, and 21-day dry-spell risk.
- **Known Limitations (সীমাবদ্ধতা):** Censors onset detection when seasonal rainfall fails to meet the 3-day 25mm threshold; clearly warns when censoring exceeds 30%.

---

### ৪. নাসা আবহাওয়া পর্যবেক্ষণ কেন্দ্র ৩ডি (NASA Weather Station 3D — `weather`)
- **Purpose (উদ্দেশ্য):** Interactive 3D visualization of atmospheric climatology and agro-meteorological parameters.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *মেট্রিক ট্যাব (Metric Selector):* Switches SVG curves between Temperature, Precipitation, Relative Humidity, and Solar Radiation.
  - *ক্যামেরা অরবিট নিয়ন্ত্রণ (3D Orbit Controls):* Allows rotating, panning, and zooming the 3D atmospheric diorama.
- **Data Feeds (তথ্য উৎস):** NASA POWER Daily Point API (`/api/location/weather`), CERES solar flux, MERRA-2 assimilation.
- **Dynamic Behavior (গতিশীল আচরণ):** Renders 25-year daily mean, minimum, and maximum curves for the active field's latitude and longitude.
- **Known Limitations (সীমাবদ্ধতা):** Atmospheric reanalysis data reflects regional grid averages; real-time wind gusts or sudden squalls are not forecasted.

---

### ৫. খামার পরিকল্পনা ও ৬-মৌসুম অপ্টিমাইজেশন (Farm Planning & 6-Season MILP — `farm_planning`)
- **Purpose (উদ্দেশ্য):** Hero view of the platform. Evaluates the farmer's existing Boro–Fallow–Aman rotation baseline and generates 3 NASA-optimized rotation alternatives.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *কৌশল নির্বাচন (Strategy Cards):* Side-by-side selection of Existing Baseline, Balanced, Water-Saving, or Soil-Building strategies.
  - *অগ্রাধিকার স্লাইডার (Priority Sliders):* Adjusts weights between profit (40%), water conservation (30%), soil health (20%), and national need (10%).
  - *সম্পদ সীমাবদ্ধতা ইনপুট (Resource Constraints):* Toggles limited irrigation cap (350 mm), rainfed-only mode, no power tiller, or labor shortage.
  - *"এর মানে কী?" পপওভার (Plain-Language Popovers):* Clickable tooltips explaining ET0, SMAP soil moisture, MODIS NDVI, heat stress, and uncertainty.
- **Data Feeds (তথ্য উৎস):** PuLP CBC MILP optimization solver (`/api/planning`), NASA POWER, SoilGrids hydraulics, FAOSTAT Bangladesh supply balance.
- **Dynamic Behavior (গতিশীল আচরণ):** Recomputes crop selection, gross margin, water volume (mm), biological nitrogen fixed (kg/ha), and bare soil days. Dynamically highlights the best-suited strategy badge.
- **Known Limitations (সীমাবদ্ধতা):** Economic figures are representative regional benchmarks; actual profit depends on local village haat volatility. Includes mandatory SAAO verification notice.

---

### ৬. পানি ব্যবস্থাপনা ও সেচ পরিকল্পনা (Water Scheduling & Irrigation — `water_irrigation`)
- **Purpose (উদ্দেশ্য):** Quantifies crop evapotranspiration ($ET_c$), reference evapotranspiration ($ET_0$), effective rainfall, and irrigation schedules.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *সেচ পদ্ধতি নির্বাচক (Irrigation Method):* Toggles between Alternate Wetting and Drying (AWD), Continuous Flooding, and Furrow/Drip irrigation.
  - *মৌসুম নির্বাচন (Season Selector):* Inspects water balance for Rabi, Kharif-1, or Kharif-2.
- **Data Feeds (তথ্য উৎস):** FAO-56 Penman-Monteith equation, single crop Kc coefficient curves, NASA POWER solar/temp/wind/humidity, SoilGrids Available Water Capacity (AWC).
- **Dynamic Behavior (গতিশীল আচরণ):** Calculates daily water depletion against Total Available Water (TAW) and Readily Available Water (RAW) thresholds.
- **Known Limitations (সীমাবদ্ধতা):** Assumes uniform application across the parcel; unlevel topography can create localized ponding or drought patches.

---

### ৭. উন্নত গবেষণা কর্মশালা (Advanced Research Workspace — `research`)
- **Purpose (উদ্দেশ্য):** Specialized workbench for agronomists, researchers, and data scientists providing 20 computational and experimental sub-laboratories.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *গ্রুপ নেভিগেশন (Group Sidebar):* Divides modules into Active Computational Labs and Collapsed Archive Labs.
  - *দ্রুত অনুসন্ধান (Quick Search):* Filters research modules in real time by keyword or badge.
  - *অনসেট বিজ্ঞান (Onset Science Lab):* Inspects dual NASA onset detection across 39 unique 0.5° grid cells.
  - *প্রোভেন্যান্স রেজিস্ট্রি (Data Provenance Registry):* Inspects 4-Tier Data Assurance classifications.
- **Data Feeds (তথ্য উৎস):** NASA GES DISC, NASA Langley, SciPy Mann-Whitney U, Benjamini-Hochberg FDR tests.
- **Dynamic Behavior (গতিশীল আচরণ):** Renders statistical distributions, p-values, FDR adjusted significance thresholds, and mathematical solver invariants.
- **Known Limitations (সীমাবদ্ধতা):** Research modules require technical agronomic background; experimental modules in Archive carry explicit non-validated disclaimer flags.

---

### ৮. ডিজিটাল টুইন ৩ডি খামার দৃশ্য (Digital Twin 3D Farm Diorama — `digital_twin`)
- **Purpose (উদ্দেশ্য):** 3D procedural twin of the field parcel reflecting planned crop growth, soil conditions, and farm topography.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *মৌসুম স্লাইডার (Season Scrubber 1..6):* Scrubs through the 6 planning periods; updates crop models on beds in real time.
  - *ওভারলে টগল (Overlay Modes):* Switches plot textures between Normal Growth, Moisture Stress, and Thermal Index.
  - *ক্যামেরা ভিউ নির্বাচক (Camera Presets):* Toggles between Isometric Overview, Top-Down Plan, and Low-Angle Soil Horizon.
- **Data Feeds (তথ্য উৎস):** Procedural Three.js geometry, procedural CanvasTextures, live draw calls reporting (`renderer.info.render.calls`).
- **Dynamic Behavior (গতিশীল আচরণ):** Fallow periods render as authentic bare furrowed soil; active crops render procedural instanced foliage. Natural grass saturation `#6b9c44`.
- **Known Limitations (সীমাবদ্ধতা):** Visual rendering is an illustrative procedural representation, not live sub-meter satellite optical imagery.

---

### ৯. বাজারদর ও ফসল হিসাব (Market Intelligence & Profit — `harvest_profit`)
- **Purpose (উদ্দেশ্য):** Bridges national food security import balances, producer prices, and crop gross margin sensitivity.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *দর পরিবর্তন ইনপুট (Market Price Sensitivity):* Allows typing custom farmgate selling prices (BDT/maund) to recalculate revenue and net profit.
  - *উৎপাদন ব্যয় সমন্বয় (Cost Adjustment):* Simulates fertilizer and labor price spikes.
- **Data Feeds (তথ্য উৎস):** FAOSTAT Bangladesh commodity production and import dependency data, BBS agricultural statistics, DAE benchmarks.
- **Dynamic Behavior (গতিশীল আচরণ):** Automatically ranks crops by national import dependency (prioritizing edible oilseeds and pulses like Mustard and Lentil).
- **Known Limitations (সীমাবদ্ধতা):** Prices reflect historical national trends; transport logistics and middleman syndicates at local village haats may cause local variations.

---

### ১০. কৃষি বিষয়ক এআই সহকারী (Agronomic AI Assistant — `assistant`)
- **Purpose (উদ্দেশ্য):** Conversational decision-support interface answering farmer agronomic queries in natural Bengali and English.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *প্রশ্ন টাইপ বক্স (Chat Input & Quick Prompts):* Pre-configured agronomic prompts regarding AWD irrigation, legume BNF, and pest management.
  - *কথোপকথন মুছুন (Clear History):* Resets conversation context.
- **Data Feeds (তথ্য উৎস):** Offline deterministic agronomic knowledge base, bounded Google Gemini API (`gemini-2.5-flash`), NASA POWER/IMERG telemetry feeds.
- **Dynamic Behavior (গতিশীল আচরণ):** Ingests active parcel coordinates, soil texture, and selected crop strategy into conversation context.
- **Known Limitations (সীমাবদ্ধতা):** Bounded by strict anti-hallucination rules; never prescribes unverified chemical doses and always directs to SAAO extension officers.

---

### ১১. উপাত্ত ও প্রমাণ ল্যাব (Data Provenance & Evidence — `data_evidence`)
- **Purpose (উদ্দেশ্য):** Transparent scientific disclosure displaying empirical evidence cards, satellite citations, and cross-validation studies.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *ট্যাব নির্বাচক (Evidence Tabs):* Toggles between NASA Satellite Telemetry, IMERG Cross-Validation, and Agronomic Limitations.
  - *ডাউনলোড বোতাম (Export Provenance JSON):* Exports full reproducible data manifest.
- **Data Feeds (তথ্য উৎস):** NASA GRACE JPL RL06.3M (-1.48 cm/yr Barind trend), NASA MODIS MOD13Q1 NDVI, NASA GPM IMERG v07 daily.
- **Dynamic Behavior (গতিশীল আচরণ):** Displays the exact POWER vs IMERG onset discrepancy table ($p=0.34$, shift=0 days) proving scientific conservatism.
- **Known Limitations (সীমাবদ্ধতা):** Documents satellite revisit intervals (16-day MODIS, monthly GRACE) and spatial grid bounds.

---

### ১২. অপারেটর ককপিট ও সেটিংস (Operator Cockpit & Settings — `account`)
- **Purpose (উদ্দেশ্য):** Operator identity management, database synchronization state, and system credentials.
- **Interactive Controls (নিয়ন্ত্রণসমূহ):**
  - *প্রোফাইল সম্পাদন (Edit Profile):* Update operator name, email, and agricultural role.
  - *থিম সুইচ (Theme Toggle):* Switch between Dark Observatory and Clean Daytime light themes.
- **Data Feeds (তথ্য উৎস):** Local SQLite session store, PostgreSQL database connection status.
- **Dynamic Behavior (গতিশীল আচরণ):** Indicates whether session is authenticated or operating in offline guest/demo mode.
- **Known Limitations (সীমাবদ্ধতা):** Offline guest mode does not persist data across distinct machines without database synchronization.
