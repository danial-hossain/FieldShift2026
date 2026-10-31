# FieldShift 2026 — Event Booth Spoken Pitch & Judge Q&A Guide
## NASA International Space Apps Challenge 2026 — Bangladesh National Event (13–14 Nov)
**Challenge Track:** "Field Shift: Adapting Farms with NASA Data"  
**Team:** Azoic (Dhaka, Bangladesh) — Daniel Hossain (Lead), Md. Fazle Elahi Mahi, Nusrat Jahan Tuli, Roman Ahmed Tanmoy, Mustakim Musa, Abir Ahmed Joy  

---

## Part 1: The 60-Second Spoken Pitch (Word count ~140 words | 60 seconds)

> *"Honorable judges, Bangladeshi agriculture faces an existential climate bottleneck: our monsoon rains are shifting, groundwater in the Barind tract is dropping by over 1 centimeter a year, and farmers leave fields bare for 75 days in the pre-monsoon heat. Single-season planting advice cannot solve this.*
>
> *We built **FieldShift**. A farmer selects any field in Bangladesh, and within seconds receives an honest, NASA-backed crop rotation plan for the entire year. By combining 25 years of NASA POWER climatology, NASA GPM IMERG satellite rainfall, and SoilGrids, our optimization model tells the farmer exactly what to plant across 6 consecutive seasons.*
>
> *In drought-prone Rajshahi, it replaces groundwater-thirsty Boro rice with mustard and pulses, saving ~320 mm of irrigation water. In flooded Sunamganj haor, it leverages receding winter floodwaters for high-yield Boro. Accessible via web, printable cards, and rural SMS, 100% offline. FieldShift turns NASA data into food security."*

---

## Part 2: The 5 Most Critical Judge Questions & Honest Answers

### Q1: What specific NASA Earth observation datasets did you use, and how did you access them?
**Honest Answer:**
*"We integrated four primary NASA Earth observation programs directly into our spatial backend:*
1. ***NASA POWER v2.4.1 (0.5° grid):*** *25 years (2001–2025) of daily solar radiation, minimum/maximum temperatures, relative humidity, and FAO-56 Penman-Monteith reference evapotranspiration ($ET_0$).*
2. ***NASA GPM IMERG v07 (0.1° / ~10km grid):*** *Calibrated daily precipitation (GPM_3IMERGDF) downloaded via `earthaccess` from NASA GES DISC, used specifically for wet-season anomalous accumulation onset detection.*
3. ***NASA SMAP Level-4 (9km):*** *Global surface and root-zone soil moisture anomalies used to monitor agricultural drought and validate pre-monsoon moisture thresholds.*
4. ***NASA GRACE & GRACE-FO (JPL RL06.3M Mascon):*** *Terrestrial water storage anomalies proving the $-1.07\text{ cm/year}$ depletion rate in northwestern Bangladesh.*
*All data are pre-processed, grouped by unique 0.5° cells, and cached locally for 100% offline autonomy."*

---

### Q2: Why did you prioritize NASA GPM IMERG over NASA POWER for rainfall and onset validation?
**Honest Answer:**
*"This is one of our key scientific contributions. Initially, NASA POWER 0.5° reanalysis suggested that pre-monsoon rains had shifted 21 days earlier in Rajshahi. But rather than blindly trusting coarse reanalysis, we validated it against NASA GPM IMERG v07 daily satellite precipitation at 0.1° resolution.*
*The IMERG data revealed that the shift was statistically non-significant ($p = 0.34$, with a median shift of zero days). IMERG combines active spaceborne radar and microwave radiometers with gauge calibrations, making it vastly superior for tropical rainfall accumulation than atmospheric reanalysis. Because of this validation, FieldShift refused to publish unconfirmed early onset warnings, choosing instead to focus adaptation where it works: multi-season crop restructuring."*

---

### Q3: What in your application is real NASA data versus what is an illustrative assumption?
**Honest Answer:**
*"We maintain strict transparency with visible tags throughout the UI:*
- ***Real & Verified:*** *All climate and environmental metrics—rainfall series, temperature spikes, monsoon onset dates, soil texture classification, and groundwater depletion—are computed directly from NASA and ISRIC datasets.*
- ***Illustrative Assumptions (marked with 'উদাহরণমূলক' tag):*** *Crop farmgate market prices (BDT/kg), seed/fertilizer production costs, and theoretical yield potential are based on historical BBS (Bangladesh Bureau of Statistics) and FAOSTAT averages. Because localized fertilizer prices fluctuate with inflation and subsidies, we flag these as illustrative assumptions that extension officers can adjust."*

---

### Q4: What did your team build prior to the event, and what was built specifically for this challenge?
**Honest Answer:**
*"Prior to the event, we had baseline agricultural knowledge and open-source boilerplates. Everything you see today—the NASA POWER & IMERG 64-district download pipelines, the 6-period multi-season optimization model, the FAO-56 dual crop coefficient hydrology balance, the Three.js 3D diorama with InstancedMesh crop rows, the Two-Field comparison engine, the bilingual copywriting, and the SMS delivery format—was engineered, verified, and benchmarked specifically for this NASA Space Apps Challenge track."*

---

### Q5: How will actual smallholder farmers in rural Bangladesh access this? Most do not own smartphones.
**Honest Answer:**
*"FieldShift uses a three-tier delivery pipeline tailored for rural realities:*
1. ***Sub-Assistant Agriculture Officers (SAAO):*** *There are over 14,000 SAAOs across Bangladesh visiting farmers daily. They use the FieldShift offline tablet app to input coordinates and generate plans.*
2. ***Printable Farmer Card (A4 Print):*** *A clean, visual single-page schedule showing the 12-month calendar, watering dates, and fertilizer tips that can be printed at any union digital center (UDC).*
3. ***Plain-Text SMS Gateway:*** *With one click, our 'SMS কপি করুন' feature generates a compressed, Banglish-free SMS message (e.g. 'FieldShift: Rajshahi parcel advice: Mustard -> Mungbean -> Aman. Water savings ~320mm, extra margin ~24,000 BDT. Verify with local SAAO'). This reaches any $15 basic feature phone."*
