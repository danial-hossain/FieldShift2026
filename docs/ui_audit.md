# FieldShift UI Architecture Audit & Consolidation Blueprint
**Event**: NASA International Space Apps Challenge 2026 — Bangladesh Event (13–14 Nov 2026)  
**Challenge**: "Field Shift: Adapting Farms with NASA Data"  
**Audit Date**: November 1, 2026  
**Status**: Comprehensive Baseline Audit & Roadmap for Stages P1–P8  

---

## 1. Executive Summary

A comprehensive audit of all 12 platform destinations, 34 sub-tabs, and 5 distinct 3D WebGL scenes was conducted to eliminate visual clutter, cognitive overload, and duplicated components. The primary objective is to transform FieldShift from a sprawling research prototype into an instantly intuitive, farmer-first decision support tool that any farmer, agricultural extension officer (SAAO), or Space Apps judge can understand within 5 seconds.

---

## 2. Comprehensive Page & Tab Audit

| # | Current Destination | Sub-Tabs / Views | Primary Purpose (One Line) | 5-Second First-Time User Impression | Duplicated Content & Redundancies | 3D Scenes & WebGL Overhead | Visual & UX Problems |
|---|---------------------|------------------|----------------------------|-------------------------------------|-----------------------------------|----------------------------|----------------------|
| **01** | `FarmerHomeView` (`dashboard`) | Single view | Today's operational summary and quick decision triage for the selected field. | Shows field location, today's weather/risk snapshot, and CTA buttons to plan or irrigate. | Weather cards duplicate NASA Weather; soil tile duplicates My Farm; rotation snippet duplicates Farm Planning. | Mini farm overview canvas (repeats diorama). | High information density without a single, bold "answer-first" synthesis sentence. |
| **02** | `MyFarmWorkspaceView` (`field`) | `overview`, `parcels`, `map`, `soil`, `history` | Field boundary definition, satellite GPS coordinates, SoilGrids properties, and cropping history. | Google Maps satellite view with boundary polygon and basic soil texture chips. | Soil physical properties duplicate Data Evidence; parcel table duplicates Account Cockpit. | None (2D satellite map). | Sub-tabs reset unsaved form inputs; SoilGrids chemistry values lack plain Bengali analogies. |
| **03** | `NasaPlantingAdvisoryView` (`crop_advice`) | `advisory`, `advice`, `catalog` | NASA POWER & IMERG monsoon onset timing and safe transplanting window advisory. | Clear planting window dates (e.g., 15–25 July for Aman) with historical shift indicator. | District selection chips duplicate global field selector; basic advice rules repeat agronomic knowledge. | `RealFarmCanvas3D` (paddy with water sheet). | 64 district chips overwhelm mobile screens; needs auto-binding to active field with answer-first header. |
| **04** | `NasaWeatherStation3D` (`weather`) | `station_3d`, `uncertainty`, `satellites` | 30-day NASA POWER (temp, solar, wind, humidity) and IMERG daily rainfall telemetry. | Animated 3D spinning globe and interactive 30-day time series charts. | Uncertainty sub-tab duplicates Research Workspace; satellite list duplicates Data Evidence. | 3D Earth Globe with MERRA-2 particle clouds. | Globe uses heavy WebGL resources without aiding field-level decision; previously used bundled fixture. |
| **05** | `FarmPlanningView` (`farm_planning`) | `milp`, `replan`, `comparison`, `workbench` | **THE HERO PAGE**: 6-season multi-year rotation planner solving Profit, Water, and Soil via PuLP MILP. | Multi-season crop schedule with gross margin in BDT, irrigation depth in mm, and soil score. | `replan` and `comparison` repeat MILP outputs; `workbench` is an experimental sandbox. | `ExperimentSimulator3DView` (colored procedural blocks). | 4 parallel tabs confuse farmers on which plan to execute; lacks side-by-side Before/After comparison. |
| **06** | `WaterIrrigationView` (`water_irrigation`) | `balance`, `optimization`, `profile`, `stress` | Field water balance (FAO-56 ETc, effective rainfall, irrigation needs) and scheduling. | Total irrigation depth in mm and water savings vs conventional continuous flooding. | Water requirement values duplicate Farm Planning water metrics; drought stress repeats Weather view. | Soil-water cutaway column (FAO-56 root zone). | 4 sub-tabs fragment the water story; needs unified irrigation calendar and clear pumping cost in BDT. |
| **07** | `MarketIntelligenceView` (`harvest_profit`) | Single view | District crop market prices, transport margins, and national import-substitution priorities. | Market prices per kg/mound and projected gross revenue per crop. | Crop financial margins duplicate MILP objective components. | None. | National demand weights need plain context so farmers understand why oilseeds/legumes are rewarded. |
| **08** | `DigitalTwin3DView` (`digital_twin`) | `farm`, `growth`, `climate`, `compare` | 3D visual simulation of farm beds, phenological crop growth, and environmental stress. | Realistic 3D isometric farm cutaway showing crop rows and water channels. | Substantially duplicates the 3D Farm viewer in Farm Planning and Home; colored overlays repeat charts. | Isometric farm diorama with instanced plants. | Duplicates 3D scenes elsewhere; heavy GPU load without independent agronomic value. |
| **09** | `ResearchWorkspaceView` (`research`) | 5 Core Labs + 7 Archive Labs | Evaluator & agronomist verification: Onset Science, Weather Uncertainty, FAO-56 Hydrology, Provenance. | Scientific deep-dive for evaluators, researchers, and technical judges. | Archive labs duplicate Farm Planning and Crop Catalog; Onset Science duplicates Advisory methodology. | FAO-56 3D soil-water column. | Sprawling layout with 12+ tabs; technical terminology (MILP, Pareto, CBC) confuses farmers if exposed on main views. |
| **10** | `AiAssistantView` (`assistant`) | Single view | Conversational voice and text agronomic copilot explaining decisions in Bengali & English. | Interactive chat interface with quick suggestion chips. | Explanations repeat advice computed in Advisory, Planning, and Water views. | None. | Needs direct context binding to active field so questions automatically reference the field's data. |
| **11** | `DataEvidenceView` (`data_evidence`) | `sources`, `provenance`, `reports`, `methodology`, `limitations` | 4-Tier Data Provenance Registry, NASA sensor documentation, validation reports, and disclaimers. | Transparent proof of NASA data sources, spatial resolutions, peer-reviewed methods, and limits. | Provenance tab duplicates Research Workspace; validation reports duplicate offline documentation. | None. | Dense text layout; needs prominent sensor badges and clear judge evaluation mapping. |
| **12** | `AccountCockpitView` (`account`) | Single view | Evaluator login, account settings, parcel backup/export, and demo configuration. | Operator settings and system state. | Parcel list duplicates My Farm. | None. | Administrative chrome that distracts farmers from decision workflows. |

---

## 3. WebGL & 3D Scene Rationalization

### Former Sprawl (5 Scenes)
1. **Scene A**: `FarmerFarm3D` (mini canvas on Home) — redundant preview.
2. **Scene B**: `NasaWeatherStation3D` (spinning Earth globe) — high GPU cost, non-actionable.
3. **Scene C**: `RealFarmCanvas3D` (paddy with water sheet in Advisory) — single-crop display.
4. **Scene D**: `DigitalTwin3DView` (farm diorama with beds and foliage) — duplicated across 3 tabs.
5. **Scene E**: `ExperimentSimulator3DView` (colored procedural boxes in Planning Workbench) — abstract blocks.

### Consolidated Target Architecture (Strictly Max 3 Distinct Scenes)

| Scene # | Name & Destination | Technical Purpose | Agronomic Data Binding | Fallback Behavior |
|---------|---------------------|-------------------|-------------------------|-------------------|
| **Scene 1** | **3D Farm Plan Diorama** (`৩ডি খামার`) | Canonical isometric farm diorama cut out of the ground with layered soil strata, canal/pond, and plant rows. | **PuLP MILP 6-Season Rotation Plan**: Selected season determines crop models per bed (Paddy, Wheat, Mustard, Lentil, Potato, Maize); SoilGrids drives soil color; water balance drives canal height. | Pre-rendered SVG/Canvas isometric 2D illustration showing identical bed layout. |
| **Scene 2** | **Soil-Water Hydrology Column** (`পানি ও সেচ`) | Physical vertical cutaway block of the root zone showing soil layers, water table, infiltration, and root depth. | **FAO-56 Dual Crop Coefficient Water Balance**: Root zone depth ($Z_r$), depletion ($D_r$), capillary rise, and rainfall wetting front. | High-contrast 2D depth gauge diagram with numeric mm indicators. |
| **Scene 3** | **Regional Climate & Risk Map** (`আবহাওয়া ও ঝুঁকি`) | Interactive 2D/3D geographic overlay of Bangladesh AEZs and NASA 0.5° POWER / 0.1° IMERG grid cells. | **NASA GPM IMERG & POWER Observations**: Grid cell rainfall anomalies, onset dates, and Barind/Coastal aquifer depletion rates. | High-contrast 2D SVG district map with Choropleth risk coloring. |

*All other decorative or duplicative 3D scenes are archived under `Evidence & Method > Archive`.*

---

## 4. Eight-Item Farmer-First Navigation Consolidation Plan (P1 Blueprint)

To eliminate fragmentation, the platform navigation is restructured into **exactly 8 canonical destinations**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FIELDSHIFT 2026 — CANONICAL 8-ITEM NAVIGATION ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. হোম (Overview)                      → Today's answer for selected field  │
│ 2. আমার জমি (My Fields)                → Add/edit parcels, soil, history    │
│ 3. আবর্তন পরিকল্পনা (Rotation Planner)   → THE HERO: Existing vs 3 Strategies│
│ 4. আবহাওয়া ও ঝুঁকি (Climate & Risk)       → NASA IMERG rain, onset, SMAP/GRACE │
│ 5. পানি ও সেচ (Water & Irrigation)       → Irrigation calendar & soil column  │
│ 6. বাজার ও লাভ (Market & Profit)        → Crop prices, margins, national need│
│ 7. ৩ডি খামার (3D Farm)                  → Canonical 3D plan diorama viewer   │
│ 8. প্রমাণ ও পদ্ধতি (Evidence & Method)   → Datasets, provenance, judge rubric│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Destination Mapping Matrix

| New Canonical Item (P1) | Former Pages & Modules Mapped Into It | Primary Contents & User Journey |
|-------------------------|--------------------------------------|----------------------------------|
| **1. হোম (Overview)** | `dashboard` | Answer-first synthesis, 3 large key metric tiles, today's agronomic alert, guided demo launcher (`ডেমো দেখুন`). |
| **2. আমার জমি (My Fields)** | `field`, `account` (parcels) | Google Maps parcel boundary drawing, SoilGrids physical & chemical texture, past crop records. |
| **3. আবর্তন পরিকল্পনা (Rotation Planner)** | `farm_planning`, `crop_advice` (advisory) | **THE HERO VIEW**: Existing baseline vs 3 PuLP MILP strategies (Balanced, Water-Saver, Soil-Restorer), 12-month calendar strip, Before/After delta cards, 1-page farmer PDF card, SMS text copy. |
| **4. আবহাওয়া ও ঝুঁকি (Climate & Risk)** | `weather`, `research` (`onset_science`, `uncertainty`) | NASA GPM IMERG daily rain, POWER heat/ET0, monsoon onset shift (39 unique cells), SMAP moisture, GRACE Barind groundwater trend. |
| **5. পানি ও সেচ (Water & Irrigation)** | `water_irrigation`, `research` (`soil_water_3d`) | FAO-56 irrigation schedule from chosen plan, soil-water cutaway column, pumping costs in BDT, canal/groundwater source. |
| **6. বাজার ও লাভ (Market & Profit)** | `harvest_profit`, `research` (`crop_catalog`) | BBS/DAM district market prices, farmer price overrides, gross profit margin per bigha/ha, FAOSTAT import-substitution ranking. |
| **7. ৩ডি খামার (3D Farm)** | `digital_twin`, `farm_planning` (`workbench`) | Canonical realistic isometric farm diorama, InstancedMesh crop rows, season scrubber, strategy toggle, bed metadata tags. |
| **8. প্রমাণ ও পদ্ধতি (Evidence & Method)** | `data_evidence`, `research` (`provenance`, archives), `assistant` | 4-Tier Provenance Registry, NASA Earth Observation manifests, validation reports, limitations, Judge Rubric Checklist, archived labs, AI Agronomist dialog. |

---

## 5. Verification & Architectural Constraints

1. **Answer-First Requirement**: Every single view must lead with a bold, data-backed synthesis sentence in plain Bengali (with English toggle), stating the concrete takeaway for the active field.
2. **Context Persistence**: The selected field must never be dropped across route transitions or browser reloads (`localStorage` synchronization).
3. **Honest Data Provenance**: No numbers may be hardcoded or fabricated. All numbers trace directly to NASA POWER, GPM IMERG, ISRIC SoilGrids, FAOSTAT, or BBS.
4. **Accessibility & Responsive Standards**: Minimum contrast ratio of 4.5:1 across both Dark and Light themes; mobile-first viewport support down to 390×844 px with touch targets $\ge 44$ px.
