# FieldShift 2026: Climate-Adaptive Crop Rotation & Planting Intelligence
## NASA International Space Apps Challenge 2026 — Official Project Submission

**Project Title:** FieldShift 2026: Climate-Adaptive Crop Rotation & Planting Intelligence  
**Challenge Track:** Climate-Resilient Agriculture & Earth Observation Intelligence  
**Team Name:** Team Azoic  
**Lead Contacts:** Team Azoic  
**Project Repository:** https://github.com/danial-hossain/FieldShift2026  
**License:** Apache License 2.0 (Open Source)  

---

## 1. Short Project Description (Elevator Pitch)

Across Bangladesh, erratic monsoon onsets and climate volatility threaten 35 million smallholder rice farmers with devastating false-onset seedling mortality and terminal drought. **FieldShift 2026** bridges a quarter-century of NASA satellite climatology (NASA POWER & VIIRS) directly into actionable, mobile-first farm management. By pairing 25 years of daily observations with deterministic agro-meteorology, exact mathematical optimization (PuLP MILP), and sequential reinforcement learning, FieldShift generates statistically honest planting advisories, SMS broadcasts under 160 characters in Bengali, and sustainable 6-season crop rotations—operating with 100% offline autonomy.

---

## 2. Detailed Project Overview

Smallholder farmers in the drought-prone Barind Tract (Rajshahi, Bogura) and major floodplains of Bangladesh operate on razor-thin margins. Traditional lunar/solar agrarian calendars no longer match the changing onset dynamics of the South Asian summer monsoon.

When farmers transplant too early based on convective pre-monsoon showers (Kalbaishakhi), long dry spells destroy unprotected nurseries. When they delay planting beyond safe biological thresholds, standard 145-day rice varieties (such as BRRI dhan49) suffer flower abortion during October droughts and severe sterility during early winter cold.

**FieldShift 2026** addresses this critical vulnerability through a multi-tiered, Earth-observation-powered platform:
1. **Long-Term Climatological Analytics:** Ingests daily NASA POWER observations from 2001 to 2025 (9,131 days) across 6 representative agro-ecological divisions.
2. **Deterministic Usable Onset Detection:** Evaluates cumulative 3-day rainfall ($\ge 25.0\text{ mm}$) combined with a rigorous 21-day dry-spell lookahead rule ($\le 7$ consecutive dry days) to distinguish true monsoon arrival from transient convective storms.
3. **Statistical Honesty & Uncertainty Quantification:** Uses the two-sided Mann-Whitney rank sum test to compare the Baseline Era (2001–2012) against the Recent Era (2013–2025). The platform transparently communicates that while median onset in Rajshahi has shifted by $+3.5\text{ days}$, high interannual variance ($p = 0.934$) necessitates cautious agronomic adaptation rather than knee-jerk calendar abandonment.
4. **Actionable Mobile Advisory & SMS Broadcast:** Delivers concise, culturally contextualized Bengali recommendations and SMS messages ($\le 160$ characters) advising farmers on nursery buffer windows (June 25 – July 10) and promoting drought-escaping varieties like **BRRI dhan75** (115 days) and **BRRI dhan71**.
5. **Exact 6-Season MILP Rotation Engine:** Employs Mixed-Integer Linear Programming to compute multi-year rotations balancing profit, water conservation, and soil organic matter stewardship under strict seasonal suitability constraints.
6. **Adaptive Three-Way Comparison Lab:** Benchmarks exact MILP optimization against sequential Reinforcement Learning (Gymnasium) and heuristic domain baselines.
7. **Stylized 3D Farm Diorama:** Renders a responsive, procedural Three.js clay diorama farm with procedural CanvasTextures (no external stock models or textures) and instant 2D schematic fallback for low-bandwidth devices.

---

## 3. NASA Earth Observation Resources Used

| NASA Dataset / Service | Spatial & Temporal Resolution | Parameters Ingested | How It Was Used in FieldShift |
|:---|:---|:---|:---|
| **NASA POWER Daily Point API**<br>([power.larc.nasa.gov](https://power.larc.nasa.gov/)) | 0.5° × 0.5° latitude/longitude (~50 km);<br>Daily observations: 2001-01-01 to 2025-12-31 (25 continuous years) | `PRECTOTCORR` (corrected precipitation), `T2M` (mean temp at 2m), `T2M_MAX`, `T2M_MIN`, `RH2M` (humidity), `WS2M` (wind speed), `ALLSKY_SFC_SW_DWN` (solar radiation) | Primary climate backbone: drives empirical monsoon onset detection, Growing Degree Day (GDD) tracking, seasonal evapotranspiration estimation, and 6-season rotation climatology. |
| **NASA GEOS / MERRA-2 Assimilation Model** | Synoptic global atmospheric assimilation | Integrated through NASA POWER meteorological processing | Provides consistent, gap-free historical atmospheric reanalysis calibrated across Bangladesh coordinates. |
| **NASA Global Imagery Browse Services (GIBS) / VIIRS**<br>([gibs.earthdata.nasa.gov](https://gibs.earthdata.nasa.gov/)) | 250m true-color surface reflectance;<br>Daily overpass (Suomi-NPP / NOAA-20) | Corrected surface reflectance RGB (`VIIRS_NOAA20_CorrectedReflectance_TrueColor`) | Authentic satellite true-color aerial imagery for spatial parcel visualization across the Barind Tract. |

---

## 4. Technical Architecture & Implementation

- **Backend:** Python 3.10+, FastAPI, NumPy, pandas, SciPy (Mann-Whitney U), PuLP (CBC Branch-and-Bound solver), Gymnasium RL environment, SQLite database.
- **Frontend:** React 19, Vite, Three.js, OrbitControls, modern CSS custom properties (design tokens).
- **Offline Autonomy:** Set `$env:OFFLINE="1"` to execute entirely against local SQLite stores and bundled JSON/CSV fixtures with zero remote dependencies.
- **Data Honesty Framework:** Strictly prohibits simulated telemetry, randomizer mocks, or fabricated yields. Missing fields are explicitly exposed as `"তথ্য নেই"` / `"No data"`.

---

## 5. Verification Commands (Reproducibility)

Judges can verify the platform independently from the command line:

```bash
# 1. End-to-end API system integrity check (exits 0)
python scripts/demo_check.py

# 2. Empirical monsoon onset sensitivity sweep across 6 districts
python scripts/onset_window_sensitivity.py

# 3. Full backend automated test suite
python -m pytest -q

# 4. Frontend unit tests, production build, and SSR smoke test
cd frontend
npm test
npm run build
npm run smoke
```

---

## 6. Team Credits

**Team Azoic**  
Proudly participating in the NASA International Space Apps Challenge 2026.  
Dedicated to empowering Bangladesh's smallholder farming communities with transparent, Earth-observation-driven intelligence.
