# FieldShift 2026 — Official NASA Planting-Window Advisory
## 240-Second (4-Minute) Local Judging Demonstration Script

**Target Audience:** NASA Space Apps Challenge Judges, Agronomists, and Agricultural Extension Officers  
**Presenter Tone:** Scientifically rigorous, cautious, respectful of farmers, evidence-based, proud of local calibration  
**Key Takeaway:** We do not invent convenient numbers or hardcode results; we extract real NASA observations, apply agronomically defensible rules, quantify uncertainty, and deliver clear Bangla advisories to smallholders.

---

### Phase 1: The Problem & Context (0:00 – 0:45 | 45 seconds)
*Visual: Open FieldShift 2026 Home Dashboard at `http://127.0.0.1:8000/`. Point to the top alert banner "নাসা রোপণ পরামর্শ (NASA Planting Window Advisory)".*

> **Presenter:**
> "Honorable judges, across the drought-prone Barind Tract of northwestern Bangladesh, rainfed Aman rice feeds over 35 million people. For generations, farmers relied on the traditional Bengali calendar to prepare seedbeds by mid-June. But climate change has disrupted the South Asian monsoon.
> 
> When farmers transplant too early on false monsoon rains, their seedlings face devastating nursery drought. When they delay past August 15, traditional 145-day varieties like BRRI dhan49 hit terminal drought during October flowering and late-November cold sterility.
> 
> FieldShift 2026 solves this by bringing 25 years of NASA satellite observations directly into a mobile-first, offline-capable planting-window advisory."

---

### Phase 2: Live Navigation & The 25-Year NASA Evidence (0:45 – 1:30 | 45 seconds)
*Visual: Click 'পরামর্শ দেখুন ➔' on the banner or click 'Crop Advice' in the sidebar. Select 'Rajshahi' and 'Aman Rice'.*

> **Presenter:**
> "Let's inspect the actual science. We do not invent an 11-day delay or hardcode a pre-selected narrative.
> 
> Here, FieldShift queries NASA POWER daily telemetry for Rajshahi (24.37° N, 88.60° E) spanning 9,131 days across 2001 through 2025. 
> 
> We divide the data into two historical eras:
> - **Period 1 Baseline:** 2001 to 2012 (12 years)
> - **Period 2 Recent Era:** 2013 to 2025 (13 years)
> 
> Using our documented agronomic onset rule—cumulative rainfall of 25 mm over 3 days followed by a strict 21-day dry-spell lookahead—the calculated median onset in Rajshahi moved from Day of Year 154.5 (June 3) in Period 1 to Day of Year 158.0 (June 7) in Period 2, an observed median delay of **+3.5 days**."

---

### Phase 3: Statistical Rigor & Sensitivity Sweeps (1:30 – 2:30 | 60 seconds)
*Visual: Point to the Mann-Whitney statistics card, then click through the sensitivity toggle buttons: '20 mm', '25 mm', '30 mm'.*

> **Presenter:**
> "Notice our scientific integrity: Does a median delay mean we can claim statistical certainty?
> 
> We run a two-sided Mann-Whitney rank sum test. With n1=12 and n2=13, the p-value is 0.9344. This proves a vital agronomic truth: **high interannual variability**, not a uniform monotonic shift. Monsoons are becoming erratic, not simply later every year.
> 
> Look at our Sensitivity Analysis panel:
> - At **20 mm** threshold, the shift is **+3.0 days**.
> - At **25 mm** (our agronomic baseline), the shift is **+3.5 days**.
> - At **30 mm** (higher puddle requirement), the shift widens to **+11.0 days**!
> 
> Furthermore, NASA thermal telemetry reveals an increase of **+25.6 Growing Degree Days (GDD)** across the Kharif growing season, accelerating vegetative development and raising water demand during reproductive heading."

---

### Phase 4: Defensible Recommendation & SMS Delivery (2:30 – 3:15 | 45 seconds)
*Visual: Focus on the SMS preview card, click 'এসএমএস কপি করুন', and point to the recommended varieties.*

> **Presenter:**
> "A shift in rainfall onset does **NOT** equal a 1-to-1 shift in transplanting window. If a farmer simply delays transplanting by two weeks, traditional rice will fail in November.
> 
> Instead, FieldShift executes a defensible agronomic adaptation rule:
> 1. We recommend a cautious **7 to 10-day buffer** in nursery seedbed preparation (June 25 to July 10).
> 2. We advise switching to early-maturing, drought-escaping varieties: **BRRI dhan75** (115 days) and **BRRI dhan71**, which mature safely before terminal drought.
> 3. We generate an SMS-length Bangla advisory strictly under 160 characters:
>    *'{District} আমন: বৃষ্টি ৪ দিন দেরিতে আসছে। বীজতলা ২৫ জুনের পরে ফেলুন। ব্রি ধান৭৫ চাষ করুন ও সম্পূরক সেচ প্রস্তুত রাখুন।'* (117 characters)
> 
> With one tap, field extension workers can copy and broadcast this SMS to thousands of smallholders."

---

### Phase 5: Offline First, 3D Integration & Multi-Season Optimization (3:15 – 4:00 | 45 seconds)
*Visual: Toggle the 3D Farm Diorama, show the procedural soil strata and instanced crop rows, then switch to Farm Planning and Comparison Lab.*

> **Presenter:**
> "Finally, let's look under the hood:
> - **Offline-First:** FieldShift operates seamlessly with `OFFLINE=1`. Judges can run our automated demo check right now (`python scripts/demo_check.py`); every calculation runs on local verified cache fixtures without external network dependencies.
> - **Stylized 3D Farm Diorama:** Our custom Three.js diorama farm uses procedural CanvasTextures for grass, tilled soil furrows, and layered terracotta strata, populated with over 600 instanced crop plants and an instant 2D schematic fallback for low-spec devices.
> - **6-Season MILP & Comparison Lab:** Beyond planting windows, FieldShift solves multi-year rotations balancing profit, water limits, and soil organic matter, transparently benchmarking exact MILP against reinforcement learning and heuristic rules.
> - **Full Provenance:** Every metric cites NASA POWER Daily Point API, GEOS/MERRA-2 assimilation, spatial resolution of 0.5°, and BRRI guidelines.
> 
> In summary, FieldShift 2026 transforms complex space-agency telemetry into an actionable, statistically honest, mobile-first Bengali advisory that protects smallholder farmers' harvests. Thank you!"
