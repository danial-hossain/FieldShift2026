# FieldShift 2026: Climate-Adaptive Crop Rotation & Planting Intelligence

**NASA International Space Apps Challenge 2026**  
**Team:** Team Azoic  
**License:** Apache License 2.0 (see [LICENSE](LICENSE))  
**AI Disclosure:** Transparently documented in [docs/AI_USE.md](docs/AI_USE.md) and [docs/prompts/README.md](docs/prompts/README.md)  

---

## Executive Summary

Across Bangladesh, erratic monsoon onsets and escalating climate volatility severely threaten smallholder rice farmers. Traditional planting calendars often trigger either false-onset seedling mortality or late planting that exposes crops to terminal drought. 

**FieldShift 2026** is a hybrid Earth-observation intelligence platform that bridges 25 continuous years of NASA satellite climatology directly into actionable, mobile-first farm management. By combining **NASA POWER daily point observations (2001–2025)** with deterministic agro-meteorology, exact mathematical optimization (PuLP MILP), and adaptive reinforcement learning, FieldShift empowers farmers to schedule planting windows safely and transition toward sustainable, water-efficient multi-season crop rotations.

---

## Key NASA Earth Observation Datasets

1. **NASA POWER (Prediction Of Worldwide Energy Resources) Daily Point Climatology:**
   - **Coverage:** 2001-01-01 to 2025-12-31 (25 continuous years) at 0.5° × 0.5° spatial resolution.
   - **Parameters Ingested:** `PRECTOTCORR` (Precipitation Corrected), `T2M` (Mean Temp at 2m), `T2M_MAX`, `T2M_MIN`, `RH2M` (Relative Humidity), `WS2M` (Wind Speed), `ALLSKY_SFC_SW_DWN` (Solar Radiation).
   - **Role:** Drives empirical usable monsoon onset detection, Growing Degree Day (GDD) tracking, and 25-year climatological baseline evaluation across 6 key Bangladesh agricultural divisions.
2. **NASA Global Imagery Browse Services (GIBS) / VIIRS:**
   - **Layer:** `VIIRS_NOAA20_CorrectedReflectance_TrueColor`.
   - **Role:** High-resolution authentic true-color satellite reflectance imagery providing spatial geographic context for agricultural parcels in the Barind Tract (Rajshahi).

---

## Core Scientific Methodology

- **Deterministic Rainfall Onset Detection:** Sourced from Bangladesh Agricultural Research Council (BARC) & BRRI standards. An onset is triggered when cumulative precipitation over 3 consecutive days reaches >= 25.0 mm (with >= 1 rainy day >= 1.0 mm), verified by a **21-day forward lookahead** that rejects false onsets with consecutive dry spells >= 7 days.
- **Two-Sided Mann-Whitney U Test:** Non-parametric evaluation comparing Baseline (Period 1: 2001–2012, n=12) vs Recent Era (Period 2: 2013–2025, n=13) annual onset DOYs without assuming normality.
- **Thermal Phenology (GDD):** Calibrated to BRRI rice varieties with base temperature T_base = 10.0°C and upper cap T_cap = 35.0°C.
- **6-Season MILP Rotation Engine:** Exact mathematical programming using PuLP / CBC Branch-and-Bound to optimize 3-year (6-season) rotations under strict seasonal suitability constraints (`rabi`, `kharif`), non-repetition rules, water limits, and soil health objectives.
- **Three-Way Comparison Lab:** Transparent, side-by-side benchmarking of exact MILP, sequential Reinforcement Learning (Gymnasium), and heuristic domain rules.

---

## Quick Start & Offline Demo

FieldShift is engineered for complete offline autonomy (`OFFLINE=1`), ensuring that all core features function seamlessly without active internet connectivity.

### 1. Fast System Integrity Check
Execute an end-to-end dry run testing all primary API endpoints (Health, Crops, Advisory, Planning, Location Weather):
```bash
python scripts/demo_check.py
```
*(Outputs full verification status and latency report; exits 0 on success).*

### 2. Empirical Onset Window Sensitivity Analysis
Run the 6-district sensitivity sweep across search boundaries (01 May vs 15 May vs 01 June):
```bash
python scripts/onset_window_sensitivity.py
```
*(Report generated at `docs/onset_window_sensitivity.md`).*

### 3. Launching the Local Services
**Backend (FastAPI):**
```bash
$env:OFFLINE="1"
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

**Frontend (React + Vite + Three.js):**
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) to interact with the dashboard, 3D clay diorama farm, Planting Advisory, and Research Lab.

### 4. Running Test Suites
```bash
# Python backend test suite (unit, MILP, advisory, comparison lab)
python -m pytest -q

# Frontend regression & SSR smoke test suite
cd frontend
npm test
npm run smoke
```

---

## Scientific Limitations & Honesty Contract

- **Spatial Resolution:** NASA POWER data is provided at 0.5° × 0.5° resolution (~50 km grid cells). While exceptional for long-term climatological trends and regional onset shifts, microclimate variations, localized bund water storage, and tubewell availability must mediate on-farm decisions.
- **Data Honesty:** FieldShift strictly rejects data fabrication. Telemetry metrics that cannot be verified from satellite or user inputs (such as single-bed NDVI or real-time sensor moisture) are never synthesized; they are honestly displayed as "তথ্য নেই" / "No data".

---

## Architecture and module responsibilities

| Path | Responsibility |
| --- | --- |
| `src/data/nasa_power.py` | NASA POWER Daily Point API fetching, validation, cleaning, latest-valid-date detection, and CSV persistence. |
| `src/data/smap.py` | Separate SMAP soil-moisture CSV loader with provenance and an explicitly synthetic demo fallback. |
| `src/data/soil.py` | Soil-property CSV loader with unit conventions, provenance, and as-of filtering. |
| `src/data/crops.py` | Structured crop-knowledge loader and validation for demo agronomic/economic metadata. |
| `src/data/field_history.py` | Field-history loader with yield missingness, provenance, and conservative as-of filtering. |
| `src/state/field_state.py` | Build a validated, date-specific field state from environmental, soil, crop-knowledge, and field-history inputs. |
| `src/knowledge/crops.py` | Structured crop knowledge and crop data loading. Economic values will be explicitly labelled illustrative/demo values unless sourced otherwise. |
| `src/knowledge/agronomic_rules.py` | Transparent per-crop compatibility checks with compatible/incompatible/unknown results, independent of decision algorithms. |
| `src/preprocessing/features.py` | Deterministic raw, derived, and temporal feature construction from FieldState and dated observations. |
| `src/experiments/real_yield_training.py` | Provenance-preserving exploratory model comparison on uploaded ICRISAT Ethiopia observed trial yields; separate from app inference. |
| `src/optimizer/milp.py` | PuLP-based long-term crop rotation planning with configurable farmer priorities. |
| `src/rl/environment.py` | Sequential observation mechanics and proposed actions; no equipment control or farm-outcome reward. |
| `src/rl/agent.py` | Deterministic baseline policy interface; no learning algorithm is implemented. |
| `src/rl/reward.py` | Reward validation boundary; metadata-derived reward helper returns unavailable. |
| `src/rl/training.py` | Generic episode mechanics; no policy learning and no supported default reward. |
| `src/scenarios/stress_test.py` | Simulated normal, drought, heat, and low-water scenario evaluation; scenarios are not forecasts. |
| `src/dashboard.py` | Standard-library, read-only localhost dashboard assembled from existing data and decision modules. |
| `src/explainability/explanations.py` | Human-readable explanations grounded in actual inputs and model results. |
| `data/nasa_power/` | Cleaned NASA POWER data, kept distinct from SMAP and demo datasets. |
| `data/smap/` | SMAP data or clearly identified local fallback data. |
| `data/soil/` | Soil measurements or clearly labelled example/default values. |
| `data/crops/` | Configurable crop knowledge data. |
| `data/field_history/` | Field-specific crop and management history. |
| `models/milp/` | Persisted planning outputs/configuration when needed. |
| `models/rl/` | Saved RL models; a saved model will not imply scientific validation. |
| `app/` | Reserved for future static dashboard assets; no separate web framework is required. |

**Decision roles are intentionally distinct:** MILP plans a feasible multi-season
rotation; RL models sequential adaptive management as field conditions change.
They share the dynamic field state but are not substitutes for one another.

## Browser app and offline demo

The repository includes a lightweight browser app in `app/` that serves a farmer-facing form and calls the existing FieldShift pipeline through the repository modules. The app runs using the standard library and intentionally keeps live NASA POWER access disabled by default.

Start the app from the project root:

```powershell
.\.venv\Scripts\python.exe -m app.server --host 127.0.0.1 --port 8765
```

Then open `http://127.0.0.1:8765/` in a browser. The interface supports browser geolocation, manual latitude/longitude entry, field details, and an offline workflow run using the existing synthetic demo data. It includes clear warnings when live NASA data is unavailable.

## Requirements

- Python 3.10 or newer
- Packages listed in `requirements.txt`: NumPy, pandas, Requests, PuLP,
  openpyxl, and scikit-learn
- PuLP is constrained to the 2.x/3.x API range so the installed package
  includes the compatible CBC solver interface used by this prototype.

Create the virtual environment and install the declared dependencies from the
repository root on Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

The default example location is configurable at each data/FieldState call;
Dhaka coordinates are examples, not fixed study coordinates. NASA POWER is
fetched only when its explicit ingestion command is run. The dashboard reads
existing local CSVs and makes no network requests.

## Phase 2: NASA POWER daily data

**Status: complete.** The pipeline includes request validation, API error
handling, numeric/date cleaning, missing-marker conversion, latest-valid-date
detection, CSV persistence, and mocked unit tests.

NASA POWER is an environmental data source, not an AI model. FieldShift uses
the [NASA POWER Daily Point API](https://power.larc.nasa.gov/api/temporal/daily/point)
with the `AG` community and these parameters: `T2M`, `T2M_MAX`, `T2M_MIN`,
`PRECTOTCORR`, `RH2M`, `WS2M`, and `ALLSKY_SFC_SW_DWN`.

The reusable function accepts caller-supplied latitude, longitude, start date,
and end date. It supports arbitrary historical date ranges as well as a
recent-window helper. The recent helper allows for processing latency and
returns latest available/near-real-time processed daily data, not instant live
data. Dates are parsed as pandas datetimes and environmental values are parsed
as numeric values. NASA's `-999` missing-value marker is converted to `NaN`;
missing observations are not replaced by zero.

`get_latest_valid_date` looks for the latest row containing at least one valid
environmental measurement after cleaning. It does not use the latest calendar
date when that row contains only missing values. Use `save_nasa_power_data` to
save cleaned records under `data/nasa_power/`; filenames identify the NASA
POWER source, coordinates, and requested date range.

Dhaka is used only as an example location (`latitude = 23.8103`,
`longitude = 90.4125`). The values saved by this pipeline come from the NASA
POWER API; this data pipeline does not forecast climate or crop outcomes and
does not claim scientific validation. The old `src.nasa_power` import path
remains available as a compatibility wrapper.

Run the unit tests (standard-library `unittest`, no additional test package):

```powershell
python -m unittest discover -s tests -v
```

Run a recent NASA POWER example from the repository root (requires network
access; saves the cleaned CSV under `data/nasa_power/`):

```powershell
python -m src.data.nasa_power
```

## Phase 3 — Data Foundation

**Status: complete.** The four independent input sources are available through
CSV loaders:

- SMAP provides soil-moisture observations. The loader accepts normalized
  observation CSVs; the bundled `data/smap/demo_smap.csv` is synthetic and is
  not NASA SMAP data. This prototype does not claim live or real-time SMAP
  access. Soil moisture is represented as volumetric fraction (m³/m³).
- Soil data provides field properties. N/P/K are represented in mg/kg, pH is
  unitless, organic matter is percent by mass, and texture is categorical.
- Crop knowledge provides crop family, legume flag, water and climate ranges,
  and illustrative economic metadata. Water requirement is mm per growing
  season, expected yield is t/ha, production cost is illustrative BDT/ha, and
  market price is illustrative BDT/t.
- Field history provides previous crop/season and management information.
  Known yield is represented in t/ha. History stores year and season; as-of
  filtering conservatively excludes all records from the decision year because
  season chronology is not standardized.

Bundled soil, crop, SMAP, and field-history examples have `source=demo` and
`data_status=synthetic`. No bundled values are represented as measured
observations or authoritative Bangladesh statistics. Observed records loaded
from a user-provided CSV retain their source/status labels. Unknown values
remain `NaN`; they are never silently converted to zero. Soil `as_of_date`,
SMAP observation dates, and field-history year/season are preserved to support
future data-leakage controls.

Agronomic and economic example values are illustrative and are not
scientifically validated.

## Phase 4 — Dynamic FieldState

**Status: complete.** `build_field_state` combines NASA POWER, SMAP, soil,
crop knowledge, and field history into one `FieldState` for a specified field
and decision date:

```text
NASA POWER + SMAP + Soil + Crop Knowledge + Field History
                         ↓
                     FieldState
```

The state records the field identity, decision date, location, weather
observations, soil moisture/properties, the latest eligible previous crop and
its known metadata, and source-specific provenance/status. `to_dict()` and
`from_dict()` provide deterministic serialization. Build the state again for a
different date to represent a changing field condition; FieldState itself does
not calculate trends or features.

Only dated observations on or before the decision date are eligible. For
field history, records from the decision year are conservatively excluded
because the data records year/season but not exact dates or standardized
season chronology. If multiple records in the latest prior year exist, the
existing loader order provides a stable tie-break; this is not asserted to
represent agronomic season order. Missing environmental, moisture, soil, and
yield values remain `NaN`. Provenance and status are kept per input category,
so NASA POWER observations are not conflated with synthetic demo inputs.

FieldState is **not** an AI model, crop recommendation, optimization result,
RL policy, or prediction. It only represents known input conditions for
future decision modules. Phase 4 does not implement MILP, RL, stress testing,
dashboard, explainability, or crop recommendations.

## Phase 5 — Feature Engineering

**Status: complete.** A deterministic feature layer transforms FieldState and
optional dated observations into:

```text
FieldState
    ↓
Raw Features
    ↓
Derived Environmental Features
    ↓
Temporal Features
    ↓
Ordered Feature Set + Provenance
```

`build_features(field_state, environmental_history=None, smap_history=None)`
preserves raw environmental, soil, and crop-history context. It also computes
temperature range (`temp_max - temp_min`), a generic heat indicator, and a
generic low-soil-moisture indicator. Temporal changes compare a current
FieldState measurement with the previous valid dated observation; recent means
use actual dated observations within a configurable calendar-day window.
Temporal outputs remain `NaN` when a previous observation or sufficient recent
observations are unavailable.

Defaults are explicit prototype engineering assumptions: heat threshold
`35.0°C`, low soil-moisture threshold `0.20 m³/m³`, recent window 7 calendar
days, and at least 2 distinct dated observations for a recent mean. These are
not universal scientific thresholds; actual water stress depends on soil
texture, crop, rooting depth, and local conditions. `FeatureConfig` allows
these choices to be changed.

The returned dictionary has a stable feature order and a separate
`provenance` mapping. Raw features retain observed/synthetic/unknown status;
derived values are marked `derived_from_observed`,
`derived_from_synthetic`, `derived_from_mixed`, or `unknown`. Future dates,
NASA's `-999` marker, and invalid numeric history values do not become usable
observations. Missing inputs remain `NaN`; no imputation or zero-filling occurs.

Feature engineering only produces inputs. It does not recommend or rank crops,
calculate aggregate scores, or perform optimization, MILP, RL, stress testing,
or final decision logic.

Example with normalized observation frames:

```python
import pandas as pd

from src.data.smap import load_smap_data
from src.state.field_state import build_field_state
from src.preprocessing.features import build_features

power = pd.read_csv(
    "data/nasa_power/nasa_power_lat23.8103_lon90.4125_20260831_20260929.csv"
)
state = build_field_state(
    "field_001", 23.8103, 90.4125, "2026-09-29", power
)
features = build_features(
    state,
    environmental_history=power,
    smap_history=load_smap_data(
        23.8103, 90.4125, "2026-09-25", "2026-09-29"
    ),
)
print(features["temperature_range"])
print(features["provenance"]["temperature_range"])
```

## Phase 6 — Agronomic Rules and Compatibility

**Status: complete.** Rule evaluation combines field state, optional Phase 5
features, crop metadata, and eligible field history:

```text
FieldState + Features + Crop Knowledge + History
                    ↓
             Agronomic Rules
                    ↓
       Per-crop compatibility signals
```

`evaluate_crop_compatibility` returns an independent result for one crop;
`evaluate_all_crops` preserves the supplied crop order and returns separate
results. Each rule has a status (`compatible`, `incompatible`, or `unknown`),
a factual reason, and input provenance. Unknown required data remain unknown;
they are not treated as either passing or failing. Overall compatibility is
only a categorical summary of the explicitly defined rules: any violation
makes it incompatible, all satisfied rules make it compatible, otherwise it is
unknown. It is never a numeric score.

Implemented checks/context:

- Temperature and pH are compared with the crop's configured ranges.
- Family rotation is violated when the candidate family matches the recorded
  previous crop family; missing previous-family context remains unknown.
- Water compatibility is only conclusive if a caller supplies
  `features["available_water_mm"]` as seasonal available water in mm, directly
  comparable to crop seasonal `water_requirement`. Daily rainfall or generic
  soil-moisture indicators alone cannot establish seasonal supply, so water
  compatibility remains unknown while their values/provenance are reported.
- The configurable legume interval defaults to 3 seasons. A legume candidate
  satisfies the current-season requirement. For non-legumes, known previous
  seasons are checked conservatively; history from the decision year and
  future years is excluded. Insufficient history or unknown crop metadata
  results in unknown. The interval is a prototype setting, not a universal
  agronomic prescription.
- Duration, legume status, nutrient effect, soil impact, and measured nutrient
  context are returned as descriptive metadata, not scored or judged against
  invented thresholds.

Phase 6 does **not** select or rank a best crop, optimize a rotation, train RL,
or make a crop recommendation. It adds no aggregate score, MILP, RL, or stress
testing. The rule outputs are inputs for future decision components only.

Example:

```python
from src.data.crops import load_crop_knowledge
from src.knowledge.agronomic_rules import (
    evaluate_all_crops,
)

crop_results = evaluate_all_crops(
    load_crop_knowledge(),
    field_state,
    features,
    field_history=history,
)
```

The list follows the crop input order; it is not ranked.

## Phase 7 — MILP Long-Term Rotation Planning

**Status: complete.** `src/optimizer/milp.py` builds a PuLP mixed-integer
linear program for a configurable sequence of planting periods. The default is
three years with two prototype periods per year
(`Y1_S1`, `Y1_S2`, ..., `Y3_S2`); callers may supply a different ordered
period list or change years/seasons per year.

Binary decision variables `x[crop, period]` select one crop for each period.
The model requires one crop each period, prevents adjacent crops in the same
family using Phase 6's family compatibility rule, excludes explicitly
incompatible temperature/pH/supplied seasonal-water cases, applies the
previous-crop-family restriction to the first period, and enforces a
configurable rolling legume interval (default 3 periods). Unknown compatibility
does not automatically exclude a crop. Crop duration is returned in crop
metadata but not converted into calendar constraints because the configured
seasons do not define reliable dates. Since future seasonal observations are
not forecasts, explicit temperature, pH, and seasonal-water compatibility is
evaluated against the supplied current FieldState/features and then treated as
a static eligibility condition across the planning horizon.

The objective combines normalized components with caller-provided profit,
water-saving, and soil-restoration priority weights. Profit uses
`expected_yield * market_price - production_cost`; water saving reverses a
min-max normalization of seasonal crop water demand. Soil restoration uses the
explicit illustrative mapping below, averaged equally before min-max
normalization: legume flag (`1`/`0`), known `nutrient_effect` labels
(`biological_nitrogen_fixation=1`, high nutrient demand `=-1`, moderate demand
`=0`), and known `soil_impact` labels (`improves_rotation_diversity=1`,
residue indicators `=0.5`, disturbance/high-water-use indicators `=-0.5`).
These are prototype objective encodings, not measured soil-health effects.

Normalization is min-max over the supplied crop set. If an objective with a
positive requested weight has incomplete metadata for any candidate, that
whole objective component is excluded and the remaining available weights are
renormalized; no missing value is substituted with zero. If no positively
weighted objective can be calculated, input validation raises a clear error.
Monetary output uses the crop file's illustrative BDT/ha metadata and is not
validated farm-profit prediction. The solver result is the optimum only for
the supplied crop metadata, field state, constraints, periods, and weights; it
is not a universal recommendation.

`objective_value` is the sum across selected periods of each effective weight
times that component's normalized value. `normalized_components` reports those
dimensionless totals. In contrast, `profit_component` is the unnormalized sum
of the illustrative gross-margin proxy (BDT/ha); `water_component` and
`soil_component` are sums of their normalized per-crop values. Strategy
weights affect only this objective; they do not alter the hard rotation or
agronomic constraints.

An infeasible problem returns `status="infeasible"` with no selected rotation
and a constraint summary. Provenance and data status identify NASA POWER,
soil/moisture, crop metadata, history, and applied agronomic rules separately.
MILP handles constrained multi-period planning; it does not implement the
future RL role of sequential adaptive management as conditions evolve.

Example:

```python
from src.data.crops import load_crop_knowledge
from src.optimizer.milp import optimize_rotation

result = optimize_rotation(
    field_state=field_state,
    crops=load_crop_knowledge(),
    features=features,
    field_history=history,
    profit_weight=0.5,
    water_weight=0.3,
    soil_weight=0.2,
)
print(result["status"])
print(result["selected_crop_by_period"])
print(result["constraint_summary"])
```

## Phase 8 — Alternative Rotation Strategies

**Status: complete.** `src/optimizer/strategies.py` runs the Phase 7 MILP
repeatedly with named priority profiles. Each profile changes the relative
profit, water-saving, and soil-restoration objective weights; all crop
constraints, normalization, missing-data handling, solver behavior, and
provenance remain owned by the Phase 7 optimizer. The built-in profiles are
prototype scenarios, not measured or inferred farmer preferences:

| Priority profile | Profit | Water | Soil |
| --- | ---: | ---: | ---: |
| Profit-focused | 0.70 | 0.20 | 0.10 |
| Water-focused | 0.20 | 0.60 | 0.20 |
| Soil-focused | 0.20 | 0.20 | 0.60 |
| Balanced | 0.34 | 0.33 | 0.33 |

Different weights can produce different feasible rotations and objective
trade-offs. Multiple profiles may also produce the same rotation; that is a
valid result and is exposed descriptively as `same_rotation_as`. The comparison
preserves profile order and shows weights, status, rotation, profit,
water-saving, and soil-restoration components side by side. It does not
combine component values into a new comparison score or declare a universal
preferred strategy. An infeasible MILP result remains attached to its profile
with no selected rotation, while other profiles continue to run.

```python
from src.optimizer.strategies import generate_rotation_strategies

result = generate_rotation_strategies(
    field_state=field_state,
    crops=crops,
    features=features,
    field_history=history,
    planning_periods=["Spring", "Monsoon", "Autumn", "Winter"],
    agronomic_config={"legume_interval_seasons": 3},
    optimizer_options={"years": 2, "seasons_per_year": 2},
)
for name, scenario in result["comparison"].items():
    print(name, scenario["weights"], scenario["status"])
    print(scenario["rotation"], scenario["profit_component"])
```

Custom profiles are supplied as an insertion-ordered mapping from a profile
name to exactly three non-negative weights (`profit`, `water`, and `soil`).
The result retains Phase 7 data status and provenance, and marks strategy
weights as caller-supplied or prototype defaults. NASA POWER can be observed
data while soil/moisture, crop knowledge, and history may remain demo or
synthetic. Economic values and soil-objective mappings remain illustrative,
not validated farm economics or real-world agronomic outcomes.

## Phase 9 — Stress Testing and What-If Analysis

**Status: complete.** `src/scenarios/stress_test.py` applies controlled,
configurable perturbations to a copied FieldState/features input, then uses
the Phase 6 rule engine and optionally the Phase 7 MILP to compare scenario
outputs with a baseline. An observation is source data; a scenario value is a
hypothetical modification and is explicitly marked `source="scenario"` and
`data_status="synthetic"`. Unchanged data retain their existing provenance.

The default cases are `normal` (copy only), `drought` (subtract 0.08 m³/m³
from soil moisture, bounded below by zero), `heat` (add 5°C to temperature
and to available min/max temperatures), and `low_water` (multiply explicitly
supplied seasonal `available_water_mm` by 0.60). These configurable values
are prototype what-if assumptions, not climate projections. Low-water is
not applicable when seasonal available water is missing; daily rainfall and
soil moisture are not substitutes. Missing baseline soil moisture or
temperature likewise makes the relevant perturbation not applicable.

For each applicable scenario, derived state-dependent features are refreshed
while supplied temporal/context features are retained. The existing Phase 6
compatibility rules are re-evaluated; optional MILP re-optimization calls the
existing Phase 7 optimizer with its unchanged constraints/objective behavior.
Results include changed values, compatibility changes, baseline/scenario
rotations and components, and provenance. An unchanged rotation is valid;
infeasibility and non-applicable scenarios are reported without fabricated
rotations. This layer does not make forecasts or produce a stress score.

```python
from src.scenarios.stress_test import run_stress_tests

result = run_stress_tests(
    field_state=field_state,
    features=features,
    crops=crops,
    field_history=history,
    scenarios=["normal", "drought", "heat", "low_water"],
    scenario_config={
        "drought_soil_moisture_delta": -0.08,
        "heat_temperature_delta": 5.0,
        "low_water_fraction": 0.60,
    },
    run_milp=True,
)
for name, scenario in result["scenarios"].items():
    print(name, scenario["status"], scenario["changed_fields"])
    print(scenario["baseline_rotation"], scenario["scenario_rotation"])
```

Run the complete test suite and source compile check from PowerShell:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -B -m compileall -q src
```

## Install dependencies (Windows PowerShell)

From the repository root:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Initial project check

Compile all Python modules without generating bytecode files:

```powershell
.\.venv\Scripts\python.exe -B -m compileall -q src
```

This initial check confirms Python syntax only. It does not fetch NASA data,
solve an optimization problem, or train/evaluate an RL policy.

## Configuration and research notes

The existing NASA POWER script uses the Dhaka test location
(`23.8103`, `90.4125`) as an example. Location settings should be supplied by
the caller/configuration rather than copied into each module. NASA POWER data is
processed daily/near-real-time data, not instant live data.

Soil defaults, crop economics, and stress transformations must remain
configurable and clearly labelled as assumptions or simulations. Model results
are prototype outputs and should not be presented as scientifically validated
without appropriate evaluation.

## Phase 10 — Sequential Reinforcement-Learning Environment

**Status: deterministic environment mechanics only; no policy has been
trained.** `src/rl/environment.py` represents sequential adaptive field
management, not crop-rotation selection (Phase 7 MILP remains the long-term
planner). It reuses `FieldState` and `build_features`, does not call the MILP,
and does not fetch weather or control farm equipment.

`FieldShiftEnvironment(field_state, environmental_history=None, features=None,
config=None, step_limit=None)` accepts a state and already-prepared
observations. `reset(initial_state=None, seed=None)` returns
`(observation, info)`. `step(action)` returns
`(observation, reward, terminated, truncated, info)`. `get_state()`,
`get_observation()`, and `get_available_actions()` expose state, observation,
and currently supported actions. Seeds are accepted for reproducible setup;
the current transition model contains no random behavior.

The structured observation exposes the supported current FieldState values and
features in `OBSERVATION_FEATURES`, including temperature, rainfall, recent
temperature/rainfall summaries, soil moisture and summary (when available),
N/P/K, pH, stress indicators, and explicitly supplied available seasonal water
or irrigation context. Missing numerical data are represented as `null`/`None`
with a parallel `missingness` entry, never as an observed zero. The observation
also contains per-field source/status provenance and episode position.
`build_features` computes recent summaries only from observations at or before
the current state date; preloaded later rows are withheld until stepped into.

The default actions are `no_intervention` and `inspect_reassess`. Both advance
to at most one next prepared environmental observation; reassessment itself
does not fabricate a new measurement. An `irrigation_adjustment` proposal is
available only when caller-supplied features include a finite positive
`irrigation_capacity_mm`. The caller must provide a positive `amount_mm` no
greater than that capacity. This is a logged proposal, not a control signal or
an applied irrigation measurement. The historical `previous_irrigation`
category alone does not enable it.

No defensible management outcome/reward model is present, so every step
returns `reward=None`, with `reward_status` set to
`unavailable_no_validated_outcome_model`. The existing metadata-based crop
reward helper is not used by this management environment. This avoids
inventing yield, profit, disease, water-use outcomes, or soil-health effects.
Transitions only reveal the next provided record; they do not simulate effects
of an action on the field. Source field state, feature mappings, and historical
input data are copied and remain unchanged.

The episode terminates when `EnvironmentConfig.max_steps` is reached or when
the supplied historical observations are exhausted. An optional external
`step_limit` sets `truncated=True` only while the episode could otherwise
continue. Stepping after either end raises an error and requires `reset()`.
Daily NASA POWER records make this a daily observation transition; that does
not imply daily intervention decisions are agronomically appropriate. Use
input observations that match the intended decision cadence. These mechanics
do not constitute a trained policy, forecast, or validated recommendation.

Example (from the repository root; prepared local data only):

```python
import pandas as pd

from src.rl.environment import EnvironmentConfig, FieldShiftEnvironment
from src.state.field_state import build_field_state

weather = pd.read_csv(
    r"data\nasa_power\nasa_power_lat23.8103_lon90.4125_20260831_20260929.csv"
).sort_values("date", kind="stable").reset_index(drop=True)
state = build_field_state(
    "field_001", 23.8103, 90.4125, weather.iloc[0]["date"], weather
)
environment = FieldShiftEnvironment(
    state,
    environmental_history=weather,
    config=EnvironmentConfig(max_steps=3),
)
observation, reset_info = environment.reset(initial_state=state, seed=7)
while True:
    observation, reward, terminated, truncated, info = environment.step(
        "inspect_reassess"
    )
    print(info["observation_date"], info["explanation"], info["reward_status"])
    if terminated or truncated:
        break
print(environment.get_episode_summary())
```

The example demonstrates state/observation mechanics only. NASA POWER rows
remain dated observations, and soil/SMAP inputs may be missing or synthetic.
To run the complete tests and source compilation:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -B -m compileall -q src
```

## Phase 11 — RL Policy Interface and Training Boundary

**Status: generic episode runner and deterministic baseline only; no learning
algorithm is trained.** The Phase 10 observation is a structured mapping with
continuous values, missingness, and provenance; this phase does not discretize
or hash it into arbitrary tabular states. Q-learning and other learning
algorithms are deferred until state representation and reward semantics are
defined.

`src/rl/agent.py` defines the `Policy.select_action(observation,
available_actions, seed=None)` protocol and
`DeterministicBaselinePolicy`. The baseline chooses `no_intervention` when
available, otherwise the first available action. It is only a reproducible
mechanics baseline, not a learned policy or agronomic recommendation.
`src/rl/training.py` exposes:

```python
from src.rl import DeterministicBaselinePolicy, run_training

result = run_training(
    environment,
    policy=DeterministicBaselinePolicy(),
    episodes=2,
    seed=17,
)
print(result["status"])
print(result["history"])
```

The runner uses the Phase 10 `reset(seed=...)` and five-value `step()` API.
It validates structured observations/actions, finite numeric rewards, and
separate `terminated`/`truncated` flags. Per-episode history records seed,
step count, action sequence, termination reason, reward availability/source,
errors, and provenance. Training stops and records `unsupported_reward` when
the environment returns `None`; it never substitutes zero. Non-numeric,
NaN, or infinite rewards produce an explicit `invalid_reward` status.
Environment, policy, malformed-transition, and reward-provider errors are
recorded with their type and message.

The Phase 10 environment currently returns `reward=None`, because FieldShift
has no validated management-outcome model. A caller can supply a
`reward_provider(observation, action, next_observation, info)` callback; it is
used only when the environment reward is unavailable and must return a finite
number or a validated `RewardAssessment`. Such rewards are marked
`experimental_user_supplied` and remain the caller's responsibility to
document and justify.
This hook does not authorize inventing yield, profit, disease, crop-growth, or
soil-health outcomes. A provider is not evidence of learning or useful
agronomic performance.

No neural network, external RL dependency, model prediction, or learning
progress metric is introduced. Sequential management remains separate from
Phase 7 MILP crop-rotation planning. The training framework only exercises a
policy against transitions and reports what actually occurred.

## Phase 12 — MILP Plan Context for Sequential RL

`src/integration/milp_rl.py` provides a deliberately one-way, read-only adapter
from an existing Phase 7 `optimize_rotation()` result to sequential-policy
context. The optimizer remains the long-term planner; the Phase 10 environment
remains the sequential management simulator; Phase 11 policies still select
management actions. The adapter does not rerun MILP, alter environment
behavior, or imply that a planned crop was planted.

`adapt_milp_result(result)` returns an immutable `MILPRotationContext`.
`optimal` and `feasible` results expose their period-to-crop plan. Infeasible,
not-solved, solver-error, and missing results preserve their status with no
rotation. Invalid status or inconsistent/malformed plan schemas produce
`status="invalid"` and an explicit reason; no fallback plan is constructed.
When supplied, planning periods must match the rotation keys in the same
order. Objective components, constraint summary, data status, and provenance
are copied from the MILP result. Context mappings are read-only; `to_dict()`
returns an independent serialization.

`add_planning_context(observation, context_or_result)` optionally attaches a
separate `planning_context` mapping to a copied observation. Existing state,
features, missingness, and provenance are preserved; planning context is
explicitly tagged `rotation_is_plan_not_observation=True` and
`planting_confirmed=False`. This external adapter does not modify
`FieldShiftEnvironment`, its source state/features, or the MILP result, and the
environment continues to work without it.

MILP objective values remain descriptive planning outputs; Phase 12 does not
map them to RL rewards. Phase 10 currently returns `reward=None`, so Phase 11
training continues to require its separately documented experimental reward
provider or stops as unsupported. The plan is not an observed field action or
a verified crop history record, and future periods are visible only as
explicit plan context, never relabeled as environmental observations.

```python
from src.integration.milp_rl import adapt_milp_result, add_planning_context
from src.optimizer.milp import optimize_rotation

milp_result = optimize_rotation(field_state, crops=crops, features=features)
plan_context = adapt_milp_result(milp_result)
policy_observation = add_planning_context(
    environment.get_observation(),
    plan_context,
)
print(policy_observation["planning_context"]["status"])
print(policy_observation["planning_context"]["planned_rotation"])
```

## Phase 13 — Reward Evidence and Validation Boundary

**Audit result: no repository dataset supports a measured, management-linked
agronomic reward.** `src/rl/reward.py` now provides a validation boundary and
lists evidence requirements for future outcome-based work; it does not define
an agronomic reward formula. The Phase 10 environment remains unchanged and
returns `None` by default.

The bundled candidate data are not measured management outcomes:

| Candidate | Bundled coverage and missingness | Provenance and limitation |
| --- | --- | --- |
| Field history | 4 rows; yield is missing in 1 row (3/4 present). Irrigation is categorical, not a measured volume. | All rows are `demo` / `synthetic`; yield records do not attribute an action to an outcome. |
| Crop knowledge | 7 crops; demo expected yield, cost, market price, and seasonal water requirement fields are populated. | All rows are `demo` / `synthetic`; estimates are not realized yield, costs, revenue, or metered water use. |
| Soil | 2 records; N and organic matter are each missing once; other listed soil fields are present. | Both are `demo` / `synthetic` snapshots, not independent repeated soil-health measurements. |
| SMAP fallback | 3 daily records (2026-09-25 through 2026-09-27); soil moisture is present in all 3. | All are labelled `demo` / `synthetic`; moisture is environmental context, not a measured management outcome. |
| NASA POWER | 365 daily rows in 2025 and 30 in 2026-08-31 through 2026-09-29; 2026 has 2 missing solar-radiation values among the listed variables. | NASA environmental observations do not measure crop, economic, water-use, soil-change, or action outcomes. |

No observed yield/revenue/cost dataset, metered farm-water outcome series,
repeated independently measured soil-health series, or documented
management-action outcome dataset is bundled. Test fixtures are synthetic
test inputs and do not increase that evidence coverage. Thus yield,
production cost/revenue, water use, soil-health change, and management-action
effects are all unavailable as validated reward outcomes.

`validate_reward(value, source=..., provenance=..., units=..., reason=...)`
returns an immutable `RewardAssessment`. `None` is `unavailable`; malformed,
non-numeric, NaN, infinite, boolean, and unsupported-source values are
`invalid`; a finite user callback value is
`experimental_user_supplied`; and a finite environment value is
`environment_numeric` (numeric validity only, not scientific or agronomic
validation). No missing reward is changed to zero. Provenance, units, and
reason are retained, and serialized assessments state
`agronomic_validation="not_established"`. The training history now includes
the assessment status, units, provenance, and reason. Existing finite custom
reward providers remain accepted only as explicitly experimental.

```python
from src.rl import OUTCOME_INPUT_REQUIREMENTS, validate_reward

assessment = validate_reward(
    0.25,
    source="user_supplied",
    units="experimental score",
    provenance={"data_status": "synthetic", "provider": "prototype"},
)
print(assessment.to_dict())
for requirement in OUTCOME_INPUT_REQUIREMENTS:
    print(requirement.name, requirement.units, requirement.evidence)
```

The requirements describe evidence to collect (including field/crop/time
linkage, measurement units, methods, and provenance); they are not a proposed
formula. This validation boundary never derives reward from crop metadata,
planned rotations, or MILP objective components. The legacy
`calculate_reward` signature now returns an explicit unavailable result with
no scalar reward or components; it cannot turn crop metadata or rule statuses
into an RL signal. Any future reward design still needs an explicit formula,
justified scaling/weights, eligible observed outcome coverage, and a
documented evaluation/attribution design. No trained policy, yield
improvement, water saving, or real-world recommendation quality is claimed.

## Phase 14 — RL Learning-Algorithm Readiness Gate

**Readiness audit: the current Phase 10 environment is not ready for an
evidence-backed learning algorithm.** `src/rl/readiness.py` provides
`assess_learning_readiness(environment, reward=None, outcome_evidence=None)`.
It is a read-only gate: it inspects the current observation and available
actions without calling `reset()` or `step()`. It does not train a policy or
independently verify caller-provided evidence.

The observation is a structured mapping. `features` has the stable
`OBSERVATION_FEATURES` order: temperature/minimum/maximum temperature,
rainfall, recent means and changes, soil moisture and its summaries, N/P/K,
pH, heat/water stress indicators, available seasonal water, and optional
irrigation capacity. These are numeric continuous fields (some are derived
numeric indicators); unavailable measurements are `None` and separately
marked by `missingness`. Provenance records source and data status for each
feature. `state` also carries categorical field/date context, prior crop and
family, soil texture, previous irrigation category, provenance labels, and
numeric field measurements. `episode_context` carries discrete step counts.
Crop/field labels and provenance are context, not measured outcome targets.

The base action IDs are `no_intervention` and `inspect_reassess`.
`irrigation_adjustment` is available only when a finite positive
caller-supplied `irrigation_capacity_mm` is present; its amount must be
positive and within capacity. It is only a proposal, not an applied control.
In Phase 10 all actions expose the same next supplied historical record; the
action does not alter that record or simulate an outcome. There is no
observed action-conditioned transition model.

Phase 10 terminates at its configured maximum step count or when supplied
historical observations are exhausted. An external `step_limit` produces
truncation only when the episode could otherwise continue. These distinctions
are retained by Phase 11 training. A short or exhausted historical sequence
may provide too few sequential decisions to compare policies.

The gate returns one of:

| Status | Meaning |
| --- | --- |
| `blocked_invalid_configuration` | Environment/API, observation/action schema, reward assessment, or evidence record is malformed. |
| `blocked_missing_outcome_evidence` | Reward is unavailable/unverified, measured action outcomes or action-conditioned transitions are absent, or declared episode/evaluation evidence is insufficient. |
| `experimental_only` | A finite user-supplied reward is available, but is not evidence-backed. |
| `ready_for_algorithm_prototype` | The interface and explicitly declared minimum evidence contract pass; this is permission to prototype an algorithm, not a validated reward or proof of policy performance. |

To return `ready_for_algorithm_prototype`, the gate requires a finite
environment `RewardAssessment`, linked by matching `evidence_id` and units to
caller-attested observed outcome evidence; an allowed measured outcome
(yield, realized revenue/cost, applied water, soil-health change, or a
management-action outcome); assessed/adequate coverage with non-empty
provenance and less than 100% missingness; outcome coverage of every currently
available action; evidence of observed action-conditioned transitions; and
an environment explicitly declaring
`supports_action_conditioned_transitions = True`. The minimum prototype
screen also requires at least 2 independent training episodes, 2 held-out
evaluation episodes, and 2 decision steps per episode, plus a declared
evaluation protocol. These are screening minima, not statistically
established sample sizes. Evidence assertions are checked for schema,
consistency, and synthetic/demo/MILP markers, but the gate cannot establish
their truth or scientific quality.

The current FieldShift environment does not declare action-conditioned
transition support and still returns `reward=None`. Therefore it remains
`blocked_missing_outcome_evidence`; a finite custom reward remains
`experimental_only`. MILP rotations/objectives, crop-knowledge metadata,
weather/soil context, and synthetic fixtures cannot satisfy the measured
outcome requirement. The report separately marks policy-performance
validation as `not_performed` and agronomic effectiveness as
`not_established`. Phase 14 adds no Q-learning, DQN, PPO, or other learning
algorithm and does not change the MILP or Phase 10 reward behavior.

```python
from src.rl import assess_learning_readiness

readiness = assess_learning_readiness(
    environment,
    reward=environment_reward_assessment,
    outcome_evidence=outcome_evidence_record,
)
print(readiness.to_dict())
```

## Phase 15 — Farm Outcome Contract and Offline Data Preparation

`src/rl/outcomes.py` defines a caller-supplied action/outcome event contract
and read-only preparation pipeline. No farm outcome records are bundled or
created by this phase. The current row schema permits zero or one measured
outcome per action event. It requires the linked action event ID to match that
row's event ID; this is intentionally stricter than inferring linkage from
timestamps or field proximity. Multiple outcome metrics for one action need
a future normalized action/outcome join schema; this contract does not
duplicate an action and pretend those rows are independent action events.

`OUTCOME_RECORD_FIELDS` is the stable schema:

| Field group | Fields and meaning |
| --- | --- |
| Identity/split | `event_id`, optional `outcome_id`, `field_id`, `season_id`, `episode_id`, and `split` (`train`, `validation`, or `test`). |
| Time | ISO-8601 timezone-aware `observation_timestamp`, `decision_timestamp`, optional `action_timestamp`, and outcome `measurement_timestamp` plus inclusive `outcome_window_start`/`outcome_window_end`. Observation ≤ decision ≤ applied action ≤ measured outcome; an outcome measurement must lie within its declared window, and that window cannot start before the applied action. |
| Action | `action_id`, mapping-valued `action_parameters`, and `action_status` (`planned`, `confirmed_applied`, or `not_applied`). Only `confirmed_applied` actions can link to measured outcomes. Planned/not-applied records cannot claim execution timestamps or outcomes. A MILP plan is not an action event. |
| Outcome | `outcome_name`, finite numeric `outcome_value`, explicit `outcome_unit`, `measurement_method`, and `linked_action_event_id`. Supported exact units include measured yield `t/ha`, realized revenue/cost `BDT/ha`, measured water use `mm/ha`, and metric-specific soil-health units `pH`, `mg/kg`, `%`, or `m3/m3`. No automatic unit conversion is performed. |
| Quality/provenance | `outcome_missing`, `missingness_flags`, `data_quality_flags`, top-level `data_status` (`observed`, `synthetic`, `demo`, `planned`, or `missing`), `source`, and a provenance mapping containing `source_id`, source `record_id`, and `data_status`. |

All declared fields are required in each record; fields not in
`OUTCOME_RECORD_FIELDS` are rejected. For planned or not-applied actions,
`action_timestamp` is null. For confirmed applied actions it is required.
`outcome_id`, measurement fields, and linkage fields are null only when
`outcome_missing=True`.

Unmeasured outcomes use `outcome_missing=True`, list `outcome_value` in
`missingness_flags`, and leave every measurement/linkage field null. They are
not imputed or assigned zero. `observed` status must agree with provenance;
demo, synthetic, fixture, planning, and MILP markers cannot be relabelled as
observed. These checks catch inconsistent declarations, but cannot authenticate
a source or prove that an asserted measurement is genuine.

`validate_outcome_records(records, required_action_ids=None)` returns a
deterministic report with `error`/`warning` findings, severity, field, event
record ID, explanation, observed/missing counts, per-flag missingness counts,
split counts, and action coverage overall and by split. It checks required
identifiers, timezone-aware temporal ordering,
measurement/unit validity, duplicate event/outcome IDs, explicit linkage,
provenance, field-season split isolation, and overlapping outcome windows for
the same field across splits. Incomplete action coverage is a warning and
blocks an evaluation-ready status; it is never repaired by discarding a
record.

`prepare_offline_evaluation_data(records, required_action_ids=None)` preserves
an immutable snapshot of all caller records and emits `train`, `validation`,
and `test` groups only when validation and split-leakage checks pass. Groups
contain only valid, observed, confirmed-applied action/outcome rows; planned,
missing-outcome, and synthetic/demo rows remain in `raw_records` and are not
silently promoted into evaluation samples. The report includes observed and
missingness counts, action coverage, split counts, findings, and explicit
refusal reasons. Even a prepared dataset is marked
`prepared_for_offline_analysis_no_performance_claim`: this module does not
train a policy, calculate rewards, estimate causal effects, compare policies,
or claim performance. Offline observational association does not establish
that an action caused an outcome. The Phase 10 reward default and Phase 14
readiness gate are unchanged.

```python
from src.rl import prepare_offline_evaluation_data, validate_outcome_records

# Supply records from a documented, permissioned field data source.
validation = validate_outcome_records(records, required_action_ids=action_ids)
print(validation.to_dict())
prepared = prepare_offline_evaluation_data(
    records,
    required_action_ids=action_ids,
)
print(prepared.policy_performance_status)
print(prepared.to_dict()["refusal_reasons"])
```

Tests use clearly synthetic in-memory fixtures only to exercise validation;
they are not included as field data or evaluation evidence. MILP rotation
plans, crop metadata, NASA/SMAP context, and hypothetical stress scenarios
remain separate from confirmed actions and measured outcomes.

## Phase 16 — Caller-Supplied Farm Outcome Ingestion

`src/data/farm_outcomes.py` provides `ingest_farm_outcomes(source,
required_action_ids=None)` for caller-provided CSV paths or iterables of
structured mappings. It uses the Phase 15 `OUTCOME_RECORD_FIELDS` contract
and validator rather than implementing a second validation schema.

CSV files must contain exactly the Phase 15 column set. Nested
`action_parameters` and `provenance` values, and the `missingness_flags` and
`data_quality_flags` sequences, are JSON-encoded cells. `outcome_missing` is
the literal `true` or `false`; numeric outcomes must parse as finite numbers.
Malformed cells and rows, missing/extra/duplicate columns, invalid timestamps,
and unsupported units are retained and reported rather than repaired or
dropped. The returned immutable `FarmOutcomeImport` separates source snapshots
from normalized records and exposes record counts, provenance counts,
record-specific findings, Phase 15 validation, and offline-preparation status.
Only valid records admitted by Phase 15 can appear in prepared groups; invalid
imports must not be used as evaluation evidence.

Provenance is never inferred as observed. Both the top-level `data_status` and
`provenance.data_status` must explicitly agree as `observed` for a record to
be classified as observed; synthetic/demo and planned records remain distinct,
and unknown or conflicting declarations are not promoted. Confirmed-applied
actions are required for measured outcomes. A planned MILP rotation is not an
applied action or measured outcome. The importer does not calculate rewards,
start training, or make performance or causal claims. No real farm records
are bundled. Field IDs should be stable pseudonyms; personal identifiers are
not part of the schema.

```python
from src.data.farm_outcomes import ingest_farm_outcomes

# Placeholder only: replace with a permissioned caller CSV, not sample data.
result = ingest_farm_outcomes(
    r"C:\path\to\caller_farm_outcomes.csv",
    required_action_ids=["irrigation_adjustment"],
)
print(result.to_dict())

# Optional persistence requires an explicit absolute output path.
# Existing files are refused unless overwrite=True is explicitly passed.
# result.write_json(r"C:\path\to\ingestion-report.json")
```

`write_json()` writes a detached bundle of the original CSV/mapping records,
normalized snapshots, and validation report. It does not write to a default
location and refuses to overwrite an existing file unless the caller opts in.
The import result's `valid` flag indicates validation success, not data
authenticity or sufficient sample size. Even valid imports may be refused by
Phase 15 offline preparation for insufficient observed outcome/action coverage.

## Phase 17 — Farm Data Quality and Evidence Coverage

`src/data/data_quality.py` provides
`build_data_quality_report(source, required_action_ids=None,
required_outcome_types=None)`. `source` may be a Phase 16
`FarmOutcomeImport`, a Phase 15 `OfflineEvaluationDataset`, or caller-supplied
outcome mappings. A bare validation summary is not enough to build
record-level/grouped counts; use its dataset with raw record snapshots or
provide the original records. An omitted source produces a clear empty report.
Phase 15 remains the source of schema, temporal, unit, linkage, leakage, and
offline eligibility decisions; this report does not duplicate or repair those
rules.

The deterministic report retains raw and normalized snapshots and original
findings. It includes total/valid/invalid/evaluation-eligible counts, grouping
by declared provenance, field, season, split, action, and outcome type,
missingness/quality flags by field-season, applied-action/outcome linkage,
coverage warnings, offline refusal reasons, and diagnostic counts for
duplicate identifiers, timestamp errors, units, leakage, and overlapping
outcome windows. Optional required action and outcome IDs identify absent coverage.
`evaluation_eligible` identifies records admitted by Phase 15 into a valid
train/validation/test group. The report separately retains the dataset-level
offline refusal status: individual eligible rows do not overcome missing
split/action coverage. The Phase 15 split minimum is a structural screen, not
a statistical sample-size threshold.

Evidence categories are reported separately per record: `schema_valid`,
`observed_declared`, `measurement_linked`, `evaluation_eligible`,
`insufficient_coverage`, and `provenance_unverified`. A caller's declaration
does not independently establish source authenticity; even a record with an
observed declaration remains marked provenance-unverified. These categories
do not imply causal attribution, agronomic reward validity, or policy
performance.

```python
from src.data.data_quality import build_data_quality_report
from src.data.farm_outcomes import ingest_farm_outcomes

# Incomplete synthetic placeholder only; not farm evidence.
placeholder_records = [{
    "event_id": "synthetic-test-only",
    "field_id": "synthetic-field",
    "season_id": "synthetic-season",
    "split": "train",
    "action_id": "placeholder-action",
    "action_status": "planned",
    "data_status": "synthetic",
    "provenance": {"data_status": "synthetic"},
}]
report = build_data_quality_report(placeholder_records)

# For actual caller input, pass the immutable Phase 16 import result:
farm_import = ingest_farm_outcomes(r"C:\path\to\caller_farm_outcomes.csv")
report = build_data_quality_report(
    farm_import,
    required_action_ids=["irrigation_adjustment"],
    required_outcome_types=["measured_water_use"],
)
print(report.to_dict())
```

This read-only report does not alter records, overwrite datasets, infer
measurements, calculate rewards, train a policy, verify authenticity, estimate
causal effects, or claim policy performance.

## Phase 18 — Farm Outcome Quality CLI

Run the workflow from the repository root with:

```powershell
.\.venv\Scripts\python.exe -m src.data.farm_outcomes_cli `
  "C:\path\to\caller_farm_outcomes.csv" `
  --output "C:\path\to\selected\quality-report.json"
```

The input CSV path is required. `--output` is optional; without it, the
deterministic JSON report is written to standard output. The CLI also accepts
`--overwrite`, but only together with `--output`; without that explicit flag an
existing destination is preserved and the command exits with an output error.
The output directory must already exist, and the output cannot be the input
CSV. The CLI resolves paths and only writes the selected JSON destination.

The JSON report has `ingestion` status/findings, a `data_quality` summary with
the distinct evidence categories, `offline_evaluation` preparation status and
refusal reasons, record counts (`total`, `valid`, `invalid`,
`measurement_linked`, `evaluation_eligible`), and `limitations`. It does not
include full raw records by default; source snapshots remain available from
the Phase 16 import result in-process. Malformed records are reported and
preserved by the ingestion result; they are never imputed, repaired, or
silently discarded. A validation-invalid CSV produces a report and exit code
5 rather than a success-shaped empty result.

Exit codes are 0 for a report with no ingestion validation errors, 2 for
argument errors, 3 for input/path/read errors, 4 for output/path/write errors,
and 5 when a report was generated but ingestion validation found errors.
Warnings and an offline-evaluation refusal may accompany exit code 0: valid
schema does not imply complete evaluation coverage. `observed` is only the
caller's provenance declaration and is not independently authenticated.
Dataset-level readiness, measurement linkage, and per-record evaluation
eligibility are reported separately. The CLI does not calculate rewards,
train policies, verify data authenticity, estimate causal effects, or claim
agronomic or policy performance.

## Phase 19 — Reproducible Offline Evaluation Export

`src/data/offline_export.py` exposes
`export_offline_evaluation(source, output_path, overwrite=False,
created_at=None)`. `source` may be a CSV path, Phase 16 `FarmOutcomeImport`,
Phase 15 `OfflineEvaluationDataset`, or an iterable of caller records.
`output_path` must be an explicit absolute path whose parent already exists.
Exports are written atomically in that directory, refuse replacement unless
`overwrite=True`, and reject a destination resolving to the input CSV.

The export is deterministic for the same records and options: JSON keys are
sorted, records use a stable field/season/episode/time/identifier ordering,
and no timestamp is generated unless the caller explicitly supplies a
timezone-aware `created_at`. CSV exports include a SHA-256 digest of the
source file bytes; this checksum supports reproducibility and does not
authenticate the file or its assertions.

Only a fully prepared Phase 15 dataset is written as an evaluation export.
Train, validation, and test remain separate. If Phase 15 refuses preparation,
or any split is empty, the API returns a refusal result with original refusal
reasons and writes no dataset file. Exported samples are limited to records
already in the validated offline groups; planned, synthetic/demo, unknown,
unconfirmed, and missing-outcome records are not added. Record-level
eligibility does not override dataset-level readiness.

The CLI supports the same export as a separate optional destination while
preserving its report output:

```powershell
.\.venv\Scripts\python.exe -m src.data.farm_outcomes_cli `
  "C:\path\to\caller_farm_outcomes.csv" `
  --output "C:\path\to\quality-report.json" `
  --export-evaluation "C:\path\to\offline-evaluation.json"
```

Use `--export-overwrite` to explicitly permit replacement of the export path;
the existing `--overwrite` continues to apply only to the quality-report
`--output`. If preparation is refused, the CLI returns its validation error
code and creates no evaluation export. Exported records remain observational
data: the operation does not authenticate source provenance, establish
causal validity, calculate rewards, train a policy, or prove policy
performance.

## Phase 21 — Integrating Caller Farm Data and Evidence Readiness

### What is and is not bundled

The bundled NASA POWER CSVs contain daily environmental observations
(temperature, rainfall, humidity, wind, and solar radiation): 365 daily rows
for 2025 and 30 rows for 2026-08-31 through 2026-09-29. These are not crop
yield, irrigation-use, sales, soil-change, or management-action outcomes.
FieldShift has no bundled observed farm-management action/outcome records.

The bundled soil, crop-knowledge, field-history, and SMAP CSVs are explicitly
`demo` / `synthetic`. Crop yields, prices, and costs are illustrative metadata;
field-history yield is not action-linked outcome evidence, and its
`irrigation` column is a category rather than a measured volume. The SMAP
loader accepts caller CSV data but the bundled fallback is not a NASA SMAP
observation. Caller files marked `observed` are still declarations: this
workflow does not independently authenticate them.

### Provider workflow

1. Keep the provider's original files unchanged. Use stable pseudonymous
   `field_id` values; farmer names, phone numbers, and other personal details
   are not required. Keep NASA/environment, soil, crop-history, applied-action,
   and outcome sources distinguishable rather than merging them into synthetic
   outcome rows.
2. Load context sources using their existing documented schemas:
   `load_soil_data()` (`nitrogen`, `phosphorus`, `potassium` in mg/kg, pH
   unitless, organic matter percent, `as_of_date`), `load_field_history()`
   (yield in t/ha, year/season, and categorical irrigation), and
   `load_smap_data()` (soil moisture as m³/m³ with observation date,
   coordinates, source, and data status). Their loaders do not create action
   or outcome linkage.
3. Prepare the separate management/outcome CSV using exactly the Phase 15
   `OUTCOME_RECORD_FIELDS` column names. Every header is required. Blank
   action timestamps are allowed only for `planned`/`not_applied` actions;
   outcome and linkage measurement cells may be blank only when
   `outcome_missing=true`.
   `action_parameters`, `provenance`, `missingness_flags`, and
   `data_quality_flags` are JSON-encoded cells; `outcome_missing` is the
   literal `true` or `false`. The fields are:

   | Group | Required columns |
   | --- | --- |
   | Identity and split | `event_id`, `outcome_id`, `field_id`, `season_id`, `episode_id`, `split` |
   | Decision/action time | `observation_timestamp`, `decision_timestamp`, `action_timestamp` |
   | Action | `action_id`, `action_parameters`, `action_status`, `linked_action_event_id` |
   | Measured outcome | `outcome_name`, `outcome_value`, `outcome_unit`, `measurement_timestamp`, `outcome_window_start`, `outcome_window_end`, `outcome_missing`, `measurement_method` |
   | Source and quality | `data_status`, `source`, `provenance`, `missingness_flags`, `data_quality_flags` |

4. Record planned/recommended actions separately from evidence of execution.
   `action_status` is `planned`, `confirmed_applied`, or `not_applied`.
   Recommendations and MILP plans are not completed field actions. A measured
   outcome requires `confirmed_applied`, a timezone-aware action timestamp,
   and `linked_action_event_id` equal to its `event_id`. The row contract
   supports one outcome per action event; do not duplicate an event to attach
   multiple outcomes.
5. Preserve provider units and document any explicit mapping before loading.
   There is no automatic unit conversion or column-name guessing. Supported
   exact outcome units include `t/ha` for measured yield, `BDT/ha` for realized
   revenue or recorded production cost, `mm/ha` for measured water use, and
   the metric-specific units listed in Phase 15. In `action_parameters`, keep
   the provider's applied-action parameters and their units explicit. Do not
   silently turn a categorical irrigation level or an environmental estimate
   into a measured volume.
6. Set both top-level `data_status` and `provenance.data_status` consistently.
   An observed declaration also requires provenance `source_id` and source
   `record_id`, plus the source/method details available from the provider.
   Use the relevant `synthetic`, `demo`, `planned`, or `missing` status rather
   than upgrading uncertain records. Unknown provenance remains unverified.
   For a missing outcome, leave all measurement/linkage cells empty, set
   `outcome_missing=true`, and identify `outcome_value` in
   `missingness_flags`; do not fill with zero.
7. Assign `train`, `validation`, or `test` at field-season level before
   analysis. Keep a field-season in one split and avoid overlapping outcome
   windows for a field across splits. These are leakage safeguards, not
   evidence that the sample is statistically adequate.

The CLI can produce the ingestion and data-quality summary without printing
raw records:

```powershell
.\.venv\Scripts\python.exe -m src.data.farm_outcomes_cli `
  "C:\provider\actions-and-outcomes.csv" `
  --output "C:\provider\fieldshift-quality-report.json"
```

For explicit coverage requirements, use the existing Python APIs. This
example contains paths and action/outcome names only, not fabricated
measurements:

```python
from src.data.data_quality import build_data_quality_report
from src.data.farm_outcomes import ingest_farm_outcomes
from src.data.offline_export import export_offline_evaluation

farm_import = ingest_farm_outcomes(
    r"C:\provider\actions-and-outcomes.csv",
    required_action_ids=["provider_action_id"],
)
quality = build_data_quality_report(
    farm_import,
    required_action_ids=["provider_action_id"],
    required_outcome_types=["measured_water_use"],
)
print(quality.to_dict())

if (
    farm_import.offline_evaluation.policy_performance_status
    == "prepared_for_offline_analysis_no_performance_claim"
    and not quality["evaluation_refusal_reasons"]
    and not quality["action_outcome_coverage"]["missing_required_outcome_types"]
):
    export_offline_evaluation(
        farm_import,
        r"C:\provider\offline-evaluation.json",
    )
```

The report distinguishes schema validity, declared provenance, measurement
linkage, per-record eligibility, and dataset-level readiness. It retains
missingness and validation findings and explains refusal when required
observed action/outcome coverage or non-empty splits are absent. A CSV import
with explicit `required_action_ids` retains those requirements when the
import result is passed to the exporter. A prepared/exported dataset still
does not establish authenticity, causal effects, agronomic reward validity,
yield gains, water savings, or policy performance. The workflow does not
train RL, calculate rewards, change MILP plans, infer measurements, or
automatically join context sources to outcome records.

No generic adapter for provider-specific column names or unit conversions was
added: the existing typed context loaders and canonical action/outcome
contract already provide explicit schemas. If a provider uses a different
schema, map it explicitly outside the importer, retain the source unchanged,
document each field/unit mapping, then submit the canonical representation
for Phase 15 validation. Tests use temporary synthetic fixtures only.

## Phase 22 — RL Reward and Evidence Readiness

The environment's reward remains unavailable (`None`). It advances through
supplied observations only; irrigation is a `proposal_not_applied` record and
does not change the field or represent confirmed management. The legacy
`calculate_reward(...)` function is retained for call compatibility but now
returns `reward=None`, all components unavailable, and a reason rather than
using crop economics, legume flags, agronomic status, or action penalties as
rewards.

`assess_learning_readiness()` remains the explicit prototype gate. In this
repository, the environment does not support action-conditioned transitions,
no validated outcome-based reward is available, and no observed farm
action/outcome dataset is bundled; readiness is therefore
`blocked_missing_outcome_evidence`. Invalid rewards/configuration produce
blocked statuses with reasons. `run_training()` is a generic episode
mechanics loop, not an RL learning algorithm: without a reward it stops with
`unsupported_reward` and does not fill zero. A custom finite reward callback
is marked experimental and does not enable evidence-backed training.

Before a data-driven algorithm can be considered, a provider must supply
validated, explicitly linked confirmed-applied actions and measured outcomes
with documented units/methods/provenance, adequate missingness and required
action coverage, leakage-safe independent train/held-out field-season groups,
action-conditioned transition evidence, an outcome-grounded reward
specification, and a predeclared evaluation protocol. Passing caller assertions
alone still does not establish authenticity or performance. No algorithm is
enabled by this prototype.

## Phase 23 — Planning, Offline Evaluation, and Stress-Test Boundaries

The MILP remains the long-term constrained crop-rotation planner, separate
from RL management. Existing agronomic constraints and configurable strategy
profiles are exercised by the unit tests. Profiles express assumptions; the
system reports equal rotations where they occur and does not infer that one
profile is superior. Drought, heat, and low-water runs perturb supplied
context using explicit configurable deltas/fractions; they are hypothetical
what-if scenarios, not forecasts.

Offline dataset preparation and export reuse Phase 15 validation and its
field-season split, duplicate-ID, timestamp, unit, linkage, and overlapping
window checks. Exports remain separate by train/validation/test. There are no
real measured farm outcomes in the repository, so no observational policy
comparison or performance evaluation is reported. Existing safeguards are
tested with temporary synthetic fixtures only; these tests are not evidence
of field performance. Dataset eligibility does not establish causal validity
or policy quality.

## Phase 24 — Local Research Dashboard

`src/dashboard.py` provides a small read-only local dashboard using only the
Python standard library HTTP server and existing pandas/PuLP data modules.
It reads local NASA POWER CSVs (no network fetching), SMAP/soil/crop/history
inputs, and optionally a caller action/outcome CSV. It shows the selected
NASA observation date and provenance/status, current FieldState and feature
availability, agronomic rule results, a MILP plan, profile outputs,
hypothetical stress-test summaries, farm-data quality/coverage, and RL
readiness blockers. Missing local sources are reported unavailable; missing
farm evidence is an explicit empty report. Displayed plans are not applied
actions, and caller-observed labels remain unauthenticated. The plan and each
strategy show solver status, objective components, normalized values, and
whether the illustrative monetary component was included. Unknown crop
compatibility and seasonal water availability are explicit. Stress-test
summaries include the backend's baseline/scenario rotations when applicable;
the assumed changes remain hypothetical, not forecasts.

Launch from the repository root:

```powershell
.\.venv\Scripts\python.exe -m src.dashboard
```

Open `http://127.0.0.1:8765/` in a browser and stop with Ctrl+C. Optional
arguments are `--host`, `--port`, `--field-id`, `--decision-date`,
`--nasa-csv`, and `--farm-outcomes-csv`. For example:

```powershell
.\.venv\Scripts\python.exe -m src.dashboard `
  --field-id "pseudonymous-field-01" `
  --decision-date "2026-09-29" `
  --nasa-csv "C:\provider\nasa-power-normalized.csv" `
  --farm-outcomes-csv "C:\provider\actions-and-outcomes.csv"
```

The dashboard does not write or modify source data, call NASA/SMAP services,
train RL, calculate rewards, or display accuracy/yield/savings/performance
claims. Local source file paths are shown in the output; do not pass files
whose paths you do not want exposed to other users with access to the local
dashboard. Bind to localhost unless a trusted deployment explicitly requires
otherwise.

## Phase 25 — End-to-End Verification

The supported end-to-end flow is the existing modular sequence: NASA POWER
daily environmental ingestion; preprocessing; date-specific FieldState;
agronomic rules; MILP rotation and strategy profiles; hypothetical stress
testing; caller farm-outcome ingestion/quality; leakage-checked offline
preparation/export; blocked RL readiness; and the read-only dashboard view.
Source loaders and reports preserve missingness/provenance, and output writes
are explicit with overwrite/path-collision safeguards.

Run the test suite and source compilation from the repository root:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -B -m compileall -q src
git diff --check
```

The dashboard uses the same suite; its data assembly, unavailable-input
fallback, safe HTML rendering, MILP/profile/stress integration, and RL blocker
are covered by `tests/test_dashboard.py`. There is no separately installed
dashboard framework or dependency.

Current evidence limitation: repository environmental data are not crop
outcomes, bundled non-NASA agronomic/context CSVs are demo/synthetic, and no
observed farm action/outcome records are bundled. Consequently, evidence-backed
RL training and empirical offline policy evaluation remain blocked. Caller
data and declarations must be reviewed by their provider; the prototype does
not independently authenticate them or establish causal effects, agronomic
effectiveness, yield gains, water savings, or real-world policy performance.

## Exploratory training with uploaded trial yields

`src/experiments/real_yield_training.py` reads the four Ethiopia workbooks in
`data/download/dataverse_files.zip`, retains observed yield and source
provenance, converts yield from kg/ha to t/ha, and compares a mean baseline,
Ridge, Random Forest, and HistGradientBoosting using five-fold cross-validation
grouped by recorded site. Run it from the repository root:

```powershell
.\.venv\Scripts\python.exe -m src.experiments.real_yield_training
```

The normalized records and dataset manifest are written to
`data/acquired/icrisat_ethiopia/`; the separate model and evaluation report
are written to `models/real_yield_pilot/`. This pilot uses Ethiopian trial
data, not Bangladesh farm data, and its held-out-site metrics do not validate
Bangladesh predictions. The artifact is not used by the browser app, which
continues to use its existing synthetic demo estimate. Static trial records
are not sequential action/outcome trajectories, so this dataset does not
train the RL policy. The second uploaded New Zealand archive is excluded
because its included terms restrict reuse pending permission. Verify the
source dataset's current terms before redistribution or commercial use.

## One-step treatment-ranking prototype

`src/experiments/trial_contextual_bandit.py` fits a separate offline contextual
bandit to observed treatment/yield rows. It is intentionally **not sequential
RL**: the trial data do not record evolving field state, repeated management
actions, or delayed outcomes. Train it after the yield-data step:

```powershell
.\.venv\Scripts\python.exe -m src.experiments.trial_contextual_bandit
```

It saves a separate artifact/report under `models/ethiopia_trial_bandit/`.
Evaluation predicts yield for the treatment actually observed at held-out
sites; it does not estimate counterfactual policy value or causal treatment
effects. Treatment rankings are restricted to replicated treatments within
the selected crop and source workbook. They are Ethiopian research outputs,
not Bangladesh farm advice, and are not wired into the app.
