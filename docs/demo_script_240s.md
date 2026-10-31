# FieldShift 2026 — 240-Second Demonstration Script
## NASA International Space Apps Challenge 2026 — Team Azoic (Dhaka, Bangladesh)
**Challenge Track:** "Field Shift: Adapting Farms with NASA Data"  
**Duration:** Exactly 240 Seconds (4 Minutes)  
**Presenters:** Team Azoic — Daniel Hossain (Lead), Md. Fazle Elahi Mahi, Nusrat Jahan Tuli, Roman Ahmed Tanmoy, Mustakim Musa, Abir Ahmed Joy  
**Tone:** Agronomically rigorous, statistically honest, farmer-centered, clear English voiceover with visual Bangla UI cues  

---

### PART 1: WHO — Team & The Smallholder Farmer Context (0:00 – 0:45 | 45 Seconds)

**Visual (0:00 – 0:20):**  
Title slide with NASA Space Apps Challenge 2026 banner, Team Azoic Dhaka logo, and team credits. Cut to an authentic drone/satellite view of the drought-prone Barind Tract in Rajshahi, Bangladesh, transitioning to a smallholder farmer standing beside a parched paddy field.

**Voiceover (0:00 – 0:20):**  
*"Hello! We are Team Azoic from Dhaka, Bangladesh—Daniel Hossain, Fazle Elahi Mahi, Nusrat Jahan Tuli, Roman Ahmed Tanmoy, Mustakim Musa, and Abir Ahmed Joy. We are competing in NASA Space Apps 2026 in the challenge: 'Field Shift: Adapting Farms with NASA Data'."*

**Visual (0:20 – 0:45):**  
Map zooms into a 1.0-hectare parcel in Godagari, Rajshahi ($24.47^\circ\text{N}, 88.33^\circ\text{E}$). The mobile interface of FieldShift opens at 390px mobile viewport, showing the farmer's registered parcel profile.

**Voiceover (0:20 – 0:45):**  
*"Meet Abdul, a smallholder farmer cultivating one hectare in Rajshahi. Like millions of farmers across Bangladesh, Abdul is locked into a rigid Boro–Fallow–Aman crop rotation. For decades, he has grown water-thirsty Boro rice in the dry winter, left his land bare during late spring, and planted rainfed Aman in the monsoon. But today, this cycle is breaking down."*

---

### PART 2: WHY — Groundwater Depletion, Bare Soil & Honest Science (0:45 – 1:45 | 60 Seconds)

**Visual (0:45 – 1:15):**  
Data & Evidence view displaying the NASA GRACE mascon groundwater trend chart (showing $-1.48\text{ cm/year}$ depletion in the Barind tract), coupled with NASA SMAP root-zone soil moisture deficit maps and MODIS 250m NDVI time-series showing 75 days of bare fallow ground (NDVI $<0.20$).

**Voiceover (0:45 – 1:15):**  
*"Abdul's farm faces three converging crises. First, NASA GRACE satellite mascon data reveals that the Barind aquifer is declining at -1.48 centimeters every year. Deep tubewell pumping for winter Boro rice is exhausting groundwater and driving up energy costs. Second, NASA MODIS satellite NDVI imagery shows that during the pre-monsoon Kharif-1 season, his fields sit bare for 75 days, leaving topsoil vulnerable to rainstorms and stripping soil organic matter. A single-season planting advisory cannot fix this. Abdul needs an honest, multi-season crop rotation."*

**Visual (1:15 – 1:45):**  
Screen displays the IMERG Cross-Validation report with the comparison table between NASA POWER $0.5^\circ$ reanalysis and NASA GPM IMERG $0.1^\circ$ satellite precipitation.

**Voiceover (1:15 – 1:45):**  
*"And FieldShift approaches this with strict scientific honesty. While NASA POWER 0.5° reanalysis initially suggested that pre-monsoon rains had shifted 21 days earlier, our cross-validation with high-resolution NASA GPM IMERG satellite precipitation proved this shift is not confirmed—p is 0.34, with a median shift of zero days. Rather than making risky claims, FieldShift adheres to satellite-confirmed IMERG observations and focuses where adaptation truly works: restructuring the entire crop rotation."*

---

### PART 3: WHAT — Live Demonstration of Farm Planning (1:45 – 2:45 | 60 Seconds)

**Visual (1:45 – 2:10):**  
Screen transitions to Farm Planning view on mobile. Abdul's existing rotation (Boro–Fallow–Aman) is evaluated as the baseline. The solver displays 3 NASA-optimized rotation alternatives side-by-side: Balanced, Water-Saving, and Soil-Building. User selects the Water-Saving strategy.

**Voiceover (1:45 – 2:10):**  
*"Let's see FieldShift in action. Abdul opens Farm Planning. His existing Boro–Fallow–Aman rotation is evaluated as the baseline. Using Mixed Integer Linear Programming solved with PuLP CBC, FieldShift generates three NASA-informed alternatives. Abdul selects the Water-Saving Strategy, tailored for the Barind tract."*

**Visual (2:10 – 2:30):**  
Camera zooms into the deterministic 5-Item Agronomic Card. The user clicks the small 'এর মানে কী? (What does this mean?)' popovers next to Evapotranspiration ($ET_0$), SMAP soil moisture, and Uncertainty (P10–P90).

**Voiceover (2:10 – 2:30):**  
*"For every strategy, FieldShift produces a deterministic five-item card: why it was recommended, the scientific evidence from 25 years of NASA POWER climatology and SoilGrids, the benefits—saving 140 millimeters of irrigation water and fixing 70 kg of biological nitrogen—data gaps, and local risks. Notice the small 'এর মানে কী?' popovers: clicking them explains evapotranspiration, SMAP root-zone moisture anomalies, and satellite versus ground data in plain Bengali."*

**Visual (2:30 – 2:45):**  
The user scrolls down past the 12-Month Continuous Cropping Calendar Strip and Bangladesh Climate Map to highlight the prominent card footer:  
*"এটি সিদ্ধান্তে সহায়তার জন্য; স্থানীয় কৃষি কর্মকর্তার (SAAO) সাথে যাচাই করুন।"*

**Voiceover (2:30 – 2:45):**  
*"Abdul sees exactly when his field is covered across a 12-month calendar strip, replacing bare fallow with restorative mungbean. And every strategy card ends with our golden rule: 'This is for decision support; please verify with your local Sub-Assistant Agriculture Officer (SAAO)'."*

---

### PART 4: SO WHAT — Algorithmic Integrity & 100% Offline Autonomy (2:45 – 4:00 | 75 Seconds)

**Visual (2:45 – 3:15):**  
Screen switches to Research Workspace: 3-Way Optimization Comparison Lab. The 3D synchronized workbench renders MILP, Reinforcement Learning, and Rule-Based simulations simultaneously, showing constraint satisfaction and trade-off winner determinations.

**Voiceover (2:45 – 3:15):**  
*"For agronomists and researchers, FieldShift features a 3-Way Decision Comparison Lab. We benchmark exact MILP optimization against sequential Reinforcement Learning in a custom Gymnasium MDP environment and heuristic domain rules. We disclose transparently that while MILP guarantees mathematical optimality, RL policies are experimental and require empirical ground calibration."*

**Visual (3:15 – 3:45):**  
Presenter disconnects the network cable or shows the green OFFLINE=1 badge in the header. The app navigates smoothly through Weather, Water Irrigation, and Digital Twin 3D Farm Diorama with zero network delay.

**Voiceover (3:15 – 3:45):**  
*"Most crucially for rural Bangladesh: FieldShift is 100% autonomous offline. When cellular networks drop in remote villages, every NASA dataset—POWER climatology, GPM IMERG rainfall, SMAP anomalies, MODIS NDVI, and GRACE trends—remains instantly available from local pre-cached engines. Zero network lag. Zero fabricated numbers."*

**Visual (3:45 – 4:00):**  
Final closing title slide showing Team Azoic credits, Apache-2.0 open-source license, and the tagline:  
*FieldShift 2026: Earth Observations Powering Resilient Bangladesh Agriculture.*

**Voiceover (3:45 – 4:00):**  
*"FieldShift does not replace the farmer or the extension officer; it arms them with a quarter-century of NASA Earth observation science to adapt crop rotations safely, sustainably, and profitably. We are Team Azoic, and this is FieldShift 2026. Thank you!"*
