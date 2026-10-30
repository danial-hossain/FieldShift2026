# AI Use and Assistance Disclosure

**Project:** FieldShift 2026: Climate-Adaptive Crop Rotation & Planting Intelligence  
**Team:** Team Azoic  
**Challenge:** NASA International Space Apps Challenge 2026  
**License:** Apache License 2.0  

---

## 1. Overview and Intent

In accordance with NASA International Space Apps Challenge guidelines on transparency and academic integrity, this document discloses the extent and nature of Artificial Intelligence (AI) assistance used in the development of FieldShift 2026.

FieldShift 2026 was architected, scientifically formulated, and directed by **Team Azoic**. AI tools served as pair-programming assistants to accelerate implementation velocity, construct regression test suites, enforce strict data honesty boundaries, and refactor user interfaces.

---

## 2. Tools and Technologies Used

- **Primary AI Assistant:** Google DeepMind Antigravity agentic coding assistant powered by Google Gemini models (`gemini-2.5-pro` / `gemini-2.5-flash`).
- **Interactive Shell & Code Inspection:** Local workspace execution environment operating under supervised human oversight.
- **Documentation & Verification Harness:** Automated verification scripts (`scripts/demo_check.py`, `scripts/onset_window_sensitivity.py`) running deterministically on local data.

---

## 3. Human Authorship vs. AI Assistance

| Platform Component | Human Role (Team Azoic) | AI Assistance Role | Verification Method |
|:---|:---|:---|:---|
| **Problem Definition & Use Case** | Conceived the challenge solution: mitigating Bangladesh monsoon onset shifts for marginal smallholder farmers. | None. | Direct domain expertise in Bangladesh agriculture. |
| **NASA Data Ingestion** | Selected NASA POWER (0.5° Daily Point Climatology, 2001–2025) and NASA GIBS / VIIRS true-color reflectance layers. | Implemented API clients, local SQLite caching, and bounding box queries. | Unit tests (`tests/test_nasa_power.py`) and offline fixture verification. |
| **Agronomic Science Formulation** | Defined usable rainfall onset rule (25 mm / 3 days, 21-day dry-spell lookahead), GDD parameters, and variety traits (BRRI dhan75 vs BRRI dhan49). | Translated mathematical rules into Python functions (`src/compute/agro.py`). | Validated against BRRI publications and agricultural extension standards. |
| **Statistical Methodology** | Chose two-sided Mann-Whitney rank sum test over parametric t-tests due to non-normal DOY distributions; mandated reporting p-values and confidence intervals. | Implemented `scipy.stats.mannwhitneyu` integration and empirical sensitivity sweeps. | Sensitivity tests across 6 AEZs (`docs/onset_window_sensitivity.md`). |
| **Optimization Engines (MILP & RL)** | Formulated 6-season rotation objectives (profit, water, soil health) and agronomic constraints (non-repetition, seasonal suitability). | Implemented PuLP MILP formulation and Gymnasium reinforcement learning environment. | Pytest suites (`tests/test_milp.py`, `tests/test_milp_season_suitability.py`, `tests/test_compare_and_replan.py`). |
| **Frontend Architecture & 3D Farm** | Designed UI layout, bilingual Bengali/English vernacular, and stylized clay diorama aesthetic without external stock assets. | Built procedural CanvasTextures (`farmTextures.js`), responsive CSS tokens, and Three.js orthographic scene. | SSR smoke render guard (`scripts/smoke-ssr.jsx`) and 137 unit tests. |

---

## 4. Strict Guardrails Against Data Fabrication ("Data Honesty")

A central commitment of FieldShift 2026 is that **no AI tool was permitted to fabricate numbers, telemetry, or scientific claims**. 

The following automated and architectural rules were enforced:
1. **Zero Mock Metric Generation:** Telemetry fields that cannot be directly derived from NASA satellites or farmer records (such as individual plot NDVI, real-time root-zone moisture %, or exact yield in maunds) are never estimated by canned randomizers. When data is unavailable, the UI explicitly displays `"তথ্য নেই"` / `"No data"`.
2. **Deterministic Offline Execution:** The backend runs with `OFFLINE=1`, operating entirely against authoritative local caches and bundled fixtures to guarantee reproducible results anywhere in the world.
3. **No Stock 3D Models or Imagery:** All 3D geometry in `ClayFarmScene.jsx` is procedural Three.js math, and satellite backgrounds are directly retrieved from NASA GIBS public-domain reflectance imagery.

---

## 5. Summary Statement

Team Azoic takes full scientific and technical responsibility for the architecture, methodology, code, and conclusions presented in FieldShift 2026. AI tools significantly increased our productivity without substituting for human scientific judgment or ethical accountability.
