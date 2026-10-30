# Prompt Engineering & AI Session Protocol

This directory documents the prompt structure, system instructions, and verification patterns used during the development of **FieldShift 2026** with the Google DeepMind Antigravity coding assistant.

---

## 1. Core Principles Enforced in Prompts

1. **Deterministic Verification:** Every instruction required running automated tests and linters before and after code changes (`pytest`, `npm test`, `npm run build`, `npm run smoke`).
2. **Data Honesty Contract:** Explicit instructions prohibited injecting mock/random numbers, hardcoded fallback values for mathematical solvers, or simulated satellite telemetry.
3. **Reproducibility Guarantee:** All scripts, fixtures, and procedural generators were designed to execute cleanly in completely offline environments (`$env:OFFLINE="1"`).
4. **Preservation of Comments & Citations:** All existing scientific citations (BRRI Rice Knowledge Bank, FAO-33, NASA POWER documentation) and explanatory comments were preserved across all edits.

---

## 2. Representative Task Prompts

### Phase 1: Agronomic Rule Calibration & Mathematical Formulation
```text
Task: Implement deterministic multi-period crop season suitability constraints in src/optimizer/milp.py.
Rules:
- Add 'allowed_seasons' to crop knowledge base ('rabi', 'kharif', 'rabi|kharif').
- When solving 6-season rotation, enforce x[crop, period] == 0 when crop's allowed season does not match period season.
- Verify using pytest tests/test_milp_season_suitability.py across profit, water, soil, and balanced priorities for Rajshahi climatology.
- Do NOT fabricate crops or yields.
```

### Phase 2: Frontend Data Honesty & Null Safety
```text
Task: Replace arbitrary hardcoded fallback metrics with honest empty states across all farm management cards.
Rules:
- When plot overlay or telemetry data is missing, render neutral clay soil with 'তথ্য নেই' / 'No data'.
- Never pass fabricated healthNdvi or moisturePct properties.
- Add an SSR smoke test checking that all 12 platform destinations render cleanly without crashing in both empty and populated states.
```

### Phase 3: Procedural 3D Farm Diorama
```text
Task: Build an authentic stylized clay diorama 3D farm scene in ClayFarmScene.jsx using Three.js.
Rules:
- Zero stock imagery or external 3D asset downloads. Use pure procedural CanvasTextures for grass stippling, tilled soil furrows, terracotta strata, and dirt paths.
- Directional sun light (#ffe2b8, intensity 2.6) and soft sky light (#c8e0f4).
- Dense instanced crop plants (600-900 instances across active beds).
- Total WebGL draw calls must remain below 90.
- Clean unmount disposing all geometries, textures, and requestAnimationFrame loops.
```

---

## 3. Session Log Archive
For complete transcript inspection and auditability, local session logs and execution traces are cataloged in the conversation transcript files within the project environment.
