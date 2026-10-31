# AI Use and Assistance Disclosure
## NASA International Space Apps Challenge 2026 — Team Azoic (Dhaka, Bangladesh)

**Project:** FieldShift 2026: Climate-Adaptive Crop Rotation & Planting Intelligence  
**Challenge Track:** "Field Shift: Adapting Farms with NASA Data" (Bangladesh Event, 13–14 Nov 2026)  
**Team:** Team Azoic, Dhaka (Daniel Hossain [Lead], Md. Fazle Elahi Mahi, Nusrat Jahan Tuli, Roman Ahmed Tanmoy, Mustakim Musa, Abir Ahmed Joy)  
**License:** Apache License 2.0  

---

### 1. Statement of Principle & Intent

In accordance with NASA International Space Apps Challenge rules on academic integrity, open-source transparency, and responsible AI use, this document provides a comprehensive, transparent disclosure of all Artificial Intelligence (AI) tools, models, and workflows employed in the research, engineering, and verification of FieldShift 2026.

FieldShift 2026 was conceptualized, architected, and scientifically governed by **Team Azoic**. AI technologies were employed as advanced pair-programming accelerators, documentation reviewers, and mathematical test-generation assistants under strict human supervision.

---

### 2. AI Tools and Models Utilized

1. **Google DeepMind Antigravity Agentic Assistant:**
   - **Models:** Google Gemini models (`gemini-2.5-pro` and `gemini-2.5-flash`).
   - **Role:** Primary development assistant for test-driven code implementation, refactoring, multi-season MILP mathematical programming, automated test harness construction, and cross-platform UI engineering.
2. **Anthropic Claude (Claude 3.5 Sonnet / Opus):**
   - **Role:** Independent architectural review, critique of agronomic edge cases (haor flooding, Barind groundwater depletion), and review of video demonstration scripts.
3. **OpenAI ChatGPT (GPT-4o):**
   - **Role:** Verification of FAO-56 Penman-Monteith reference evapotranspiration formulas, validation of SciPy Mann-Whitney U test p-value calculations, and bilingual Bengali grammar consistency checking.
4. **In-App Farmer AI Assistant:**
   - **Location:** [`frontend/src/AiAssistantView.jsx#L110-L165`](file:///h:/FieldShift2026/frontend/src/AiAssistantView.jsx#L110-L165).
   - **Model & Architecture:** Operates with a deterministic hybrid architecture. In offline mode (`OFFLINE=1`), it executes an agronomic rule-based response engine using verified NASA POWER and GPM IMERG telemetry. When online, it connects to Google Gemini (`gemini-2.5-flash`) via the backend route with strict prompt bounding: the assistant is strictly prohibited from fabricating crop yields, hallucinating planting dates, or providing unverified pesticide advice.

---

### 3. Division of Responsibility: Human Authorship vs. AI Assistance

| Project Dimension | Human Leadership (Team Azoic) | AI Assistance Role | Human Verification Method |
| :--- | :--- | :--- | :--- |
| **Problem Definition** | Identified the Boro–Fallow–Aman monoculture bottleneck in Bangladesh's Barind Tract; decided to pivot from single-season forecast to multi-season rotation. | None. | Field agronomy literature, BBS statistics, and DAE extension records. |
| **Scientific Conservatism** | Discovered and investigated the POWER vs. GPM IMERG pre-monsoon onset discrepancy; decided to reject premature planting shifts and enforce conservative satellite-confirmed baselines. | Automated the Benjamini-Hochberg FDR tests and generated IMERG validation tables (`docs/imerg_validation.md`). | Independent verification across 24 years of NASA GES DISC GPM_3IMERGDF daily records. |
| **Mathematical MILP Solver** | Formulated the multi-objective objective function, biological nitrogen fixation (BNF) legume intervals, food security cereal minimums, and haor seasonal flood boundaries. | Implemented the PuLP CBC branch-and-bound optimization solver in Python (`backend/app/domain/optimization.py`). | 48/48 test matrix verification across all Bangladesh AEZ profiles (`tests/test_milp.py`). |
| **NASA Earth Observation Suite** | Selected NASA GPM IMERG, POWER, SMAP, MODIS, GRACE, and SRTM; defined exact resolutions, spatial bounding boxes, and agronomic derivations. | Built automated data ingestion clients, HDF5/NetCDF parsers, and local SQLite/JSON caching engines. | Grounded in official NASA Earthdata, GES DISC, and Langley documentation. |
| **Farmer UI & 3D Digital Twin** | Designed the bilingual Bengali-first UX layout, 1680px container rules, 5-item assessment cards, and stylized procedural clay farm diorama. | Coded React 19 JSX components, responsive CSS variables, Three.js shaders, and procedural canvas textures (`farmTextures.js`). | 146 unit tests (`frontend/src/*.test.js`) and SSR smoke test across all 12 platform views. |
| **Prompt Engineering & Prompts Repository** | Formulated system prompts, temperature settings, and grounding constraints. Prompts stored in [`docs/prompts/README.md`](file:///h:/FieldShift2026/docs/prompts/README.md). | Synthesized prompt test cases and edge-case inputs. | Manual test script with 4 distinct field profiles (`scripts/field_test.py`). |

---

### 4. Zero Data Fabrication Guardrails

Throughout development, strict operational guardrails prohibited any generative AI tool from inventing data:
1. **No Synthetic Telemetry:** Satellite data fields (temperature, rainfall, soil moisture, NDVI, GRACE anomalies) are strictly loaded from verified files downloaded from NASA servers or rendered as `"তথ্য নেই" / "No data"`.
2. **No Hallucinated Optimality:** If an agronomic constraint cannot be satisfied, the PuLP MILP solver reports `Infeasible` or `Warning` rather than producing fabricated crop plans.
3. **Mandatory SAAO Extension Guard:** Every AI-assisted strategy output terminates with the mandatory notice:  
   *"এটি সিদ্ধান্তে সহায়তার জন্য; স্থানীয় কৃষি কর্মকর্তার (SAAO) সাথে যাচাই করুন।"*

---

### 5. Prompt Archive Location

All system instructions, model prompts, and conversational grounding frameworks utilized during research and development are archived in:
- [`docs/prompts/README.md`](file:///h:/FieldShift2026/docs/prompts/README.md)
- [`docs/prompts/ai_assistant_system_prompt.txt`](file:///h:/FieldShift2026/docs/prompts/ai_assistant_system_prompt.txt)
