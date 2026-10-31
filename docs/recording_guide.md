# FieldShift 2026 — Video Recording Guide (240s & 30s Demonstrations)
## NASA International Space Apps Challenge 2026 — Team Azoic (Dhaka, Bangladesh)

This guide provides exact step-by-step instructions for recording the official demonstration videos for FieldShift 2026. Every click, viewport dimension, script cue, and offline startup command is specified to ensure seamless reproduction.

---

### 1. Offline Environment Setup & Startup Commands

To demonstrate 100% offline autonomy without external internet dependencies, run the system in offline mode:

#### Step 1.1: Start Offline Backend Server
Open a terminal in the repository root (`h:\FieldShift2026`):
```bash
# Windows PowerShell
$env:OFFLINE="1"
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

# Windows Command Prompt (cmd)
set OFFLINE=1
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
*Verification:* Access `http://127.0.0.1:8000/api/health` — it will return `{"status": "ok", "mode": "offline"}`.

#### Step 1.2: Start Frontend Development Server
Open a second terminal in `h:\FieldShift2026\frontend`:
```bash
npm run dev
```
*Verification:* Frontend starts on `http://127.0.0.1:5173`.

#### Step 1.3: Open Demo Mode in Browser
Open Chrome / Chromium and navigate to:
```
http://127.0.0.1:5173/?demo=1
```
The URL query `?demo=1` automatically:
1. Selects the **Rajshahi Barind Agricultural Field** (Godagari, $24.47^\circ\text{N}, 88.33^\circ\text{E}$, 1.0 ha).
2. Preselects the existing rotation **Boro–Fallow–Aman** as the baseline.
3. Hides developer debug panels and raw data inspectors.
4. Resets CSS transitions and animation durations to 0.001ms to eliminate screen recording lag and stutter.
5. Sets the UI to the official bilingual presentation state.

---

### 2. Viewport Specifications

| Phase | Target Device | Dimensions | Zoom Level | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Part 1 & 3 (Farmer Flow)** | Mobile (iPhone 14 / Pixel 7) | **390 × 844 px** | 100% | Chrome DevTools device mode (`Ctrl+Shift+M`) |
| **Part 2 & 4 (Planning & Lab)** | Desktop / Large Tablet | **1440 × 900 px** | 100% | Full desktop layout displaying 4 side-by-side columns |

---

### 3. Step-by-Step Click Path for 240s Demonstration Video

#### PART 1: WHO — Smallholder Farmer Context (0:00 – 0:45)
- **Viewport:** `390 × 844 px` (Mobile view)
- **Starting URL:** `http://127.0.0.1:5173/?demo=1`
- **Actions & Clicks:**
  1. `0:00 – 0:20`: Show Title Card with Team Azoic Dhaka credits.
  2. `0:20 – 0:35`: Switch to browser showing mobile interface (`/` or `FarmerHomeView`).
  3. `0:35 – 0:45`: Tap **"আমার জমি" (My Farm)** in bottom navigation bar. Point out Abdul's 1.0-hectare field profile in Godagari, Rajshahi ($24.47^\circ\text{N}, 88.33^\circ\text{E}$) with the existing rotation `Boro-Fallow-Aman` prominently shown.

#### PART 2: WHY — Groundwater Depletion & Honest Science (0:45 – 1:45)
- **Viewport:** `1440 × 900 px` (Desktop view)
- **Actions & Clicks:**
  1. `0:45 – 1:15`: Click **"উপাত্ত ও প্রমাণ" (Data & Evidence)** on the left navigation sidebar.
     - Scroll down to the **NASA GRACE Groundwater Anomaly** card: point cursor to the $-1.48\text{ cm/year}$ depletion rate in the Barind tract.
     - Scroll to the **NASA MODIS NDVI Seasonality** graph: highlight the 75-day pre-monsoon bare soil drop (NDVI $<0.20$).
  2. `1:15 – 1:45`: Click sub-tab **"আইএমইআরজি ক্রস-ভ্যালিডেশন" (IMERG Cross-Validation)**.
     - Highlight the scientific comparison table showing NASA POWER ($0.5^\circ$) vs NASA GPM IMERG ($0.1^\circ$).
     - Emphasize the verdict: *"p = 0.34, shift = 0 days — pre-monsoon shift not confirmed by satellite precipitation; FieldShift uses conservative satellite-confirmed baseline."*

#### PART 3: WHAT — Live Demonstration of Farm Planning (1:45 – 2:45)
- **Viewport:** `1440 × 900 px` (Desktop view)
- **Actions & Clicks:**
  1. `1:45 – 2:05`: Click **"খামার পরিকল্পনা" (Farm Planning)** in the sidebar.
     - Show the 4-column side-by-side layout:
       - Column 1: **Existing Rotation Baseline** (Boro–Fallow–Aman).
       - Columns 2–4: **Balanced**, **Water-Saving**, **Soil-Building** NASA strategies.
     - Click the **Water-Saving Strategy** card (`পানি-সাশ্রয়ী বিকল্প`).
  2. `2:05 – 2:30`: Scroll down to the **5-Item Agronomic Card** (`৫-দফা মূল্যায়ন`):
     - Click the **"এর মানে কী?" (What does this mean?)** popover next to *বাষ্পীভবন ও প্রস্বেদন (Evapotranspiration)*. The explanation popover opens smoothly.
     - Click the popover next to *মাটির আর্দ্রতা ঘাটতি (SMAP Soil Moisture)*.
     - Click the popover next to *অনিশ্চয়তা পরিসীমা (P10–P90 Uncertainty)*.
  3. `2:30 – 2:45`: Scroll down through the continuous **12-Month Cropping Calendar Strip**:
     - Point out the replacement of bare fallow with Kharif-1 mungbean.
     - Point cursor directly to the mandatory golden rule notice at the card footer:  
       `"এটি সিদ্ধান্তে সহায়তার জন্য; স্থানীয় কৃষি কর্মকর্তার (SAAO) সাথে যাচাই করুন।"`

#### PART 4: SO WHAT — Algorithmic Integrity & 100% Offline Autonomy (2:45 – 4:00)
- **Viewport:** `1440 × 900 px` (Desktop view)
- **Actions & Clicks:**
  1. `2:45 – 3:15`: Click **"উন্নত গবেষণা" (Advanced Research)** -> **"তুলনামূলক ল্যাব" (Comparison Lab)**.
     - Display the 3-Way Optimization benchmark:
       - Exact mathematical MILP (PuLP CBC).
       - Reinforcement Learning (Gymnasium MDP).
       - Domain Rule-Based heuristic.
     - Highlight the transparent disclosure: MILP proves optimality; RL policy is experimental.
  2. `3:15 – 3:45`: Disconnect WiFi / Ethernet or highlight the green **NASA POWER: Standby / OFFLINE=1** badge in the top bar.
     - Navigate to **"আবহাওয়া" (Weather)** -> instant render of cached daily reanalysis.
     - Navigate to **"সেচ ও পানি" (Water & Irrigation)** -> instant ET0 water demand chart.
     - Navigate to **"ডিজিটাল টুইন ৩ডি" (Digital Twin 3D)** -> realistic farm render with draw calls reported in the HUD chip.
     - Emphasize: *Zero network lag, zero fabricated numbers, fully resilient in remote haor and barind villages.*
  3. `3:45 – 4:00`: Return to concluding Title Slide with full Team Azoic member names, Apache-2.0 license, and NASA Space Apps 2026 closing remarks.

---

### 4. Step-by-Step Click Path for 30s Teaser Video

- **Viewport:** `1440 × 900 px`
- **Total Duration:** 30 Seconds (5s Hook + 7s Crisis + 10s Live Demo + 8s Offline & Team)
- **Click Sequence:**
  1. `0:00 – 0:05`: Title card with Space Apps logo & Team Azoic -> Cut to Rajshahi 1.0 ha farm parcel.
  2. `0:05 – 0:12`: Quick jump to Data & Evidence: GRACE Barind depletion chart ($-1.48\text{ cm/yr}$) and MODIS bare soil fallow gap.
  3. `0:12 – 0:22`: Switch to Farm Planning: 4-column side-by-side comparison. Click Water-Saving Strategy showing 140 mm water savings and 12-month green calendar.
  4. `0:22 – 0:30`: Highlight OFFLINE=1 badge + closing slide naming Daniel, Mahi, Tuli, Tanmoy, Musa, Joy — Team Azoic, Dhaka.
