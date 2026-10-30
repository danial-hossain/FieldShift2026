# GPM IMERG Satellite Precipitation Cross-Validation (2001–2024)

## Objective & Methodology
To rigorously validate the rainfall onset trends observed in NASA POWER 0.5° reanalysis meteorology (`PRECTOTCORR`, derived from MERRA-2 and GEOS), we extracted independent daily satellite precipitation from the **NASA Global Precipitation Measurement (GPM) IMERG Final Daily product (`GPM_3IMERGDF` v07)** at 0.1° × 0.1° (~10 km) spatial resolution.

Using NASA's `earthaccess` client and GES DISC OPeNDAP DAP4 hyperslab slicing, daily precipitation was compiled for the exact coordinate cells of the 6 core Bangladesh agricultural districts (Rajshahi, Bogura, Rangpur, Mymensingh, Jashore, Cumilla) spanning 24 years (2001-01-01 to 2024-12-31, n=8,766 days). The identical mathematical onset definitions were applied:
1. **Wet-Season Onset (Anomalous Accumulation)**: Objective Liebmann & Marengo (2001) cumulative anomaly minimum within the 1 March – 31 August window against multi-decadal daily mean rainfall climatology ($R_{clim}$).
2. **Agronomic Aman Rice Onset**: Three consecutive days totaling $\ge 25$ mm after 1 June with no 7-day post-onset dry spell ($<5$ mm total).

Trends were compared between Period 1 (2001–2012) and Period 2 (2013–2024) using non-parametric Mann-Whitney U two-sided hypothesis tests.

---

## Comparison Table: NASA POWER (0.5°) vs NASA GPM IMERG (0.1°)

| District | POWER Wet Onset Shift (days) | POWER Wet p-val | IMERG Wet Onset Shift (days) | IMERG Wet p-val | POWER Aman Shift (days) | IMERG Aman Shift (days) | IMERG Aman Censored |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Rajshahi | -21.5 | 0.0038 | -9.5 | 0.3406 | 3.5 | 8.5 | 20% |
| Bogura | -16.5 | 0.0256 | 0.0 | 0.7946 | -0.5 | 2.0 | 33% |
| Rangpur | -19.5 | 0.0207 | -1.5 | 1.0 | 0.0 | 0.5 | 45% |
| Mymensingh | -9.0 | 0.1208 | -3.5 | 0.6649 | -1.0 | 1.5 | 41% |
| Jashore | -22.5 | 0.0089 | -5.0 | 0.3705 | -4.5 | 8.5 | 20% |
| Cumilla | -10.0 | 0.0963 | -0.5 | 0.6224 | 0.0 | 4.0 | 41% |

---

## Verdict
NASA GPM IMERG 0.1° satellite precipitation does **not** confirm the statistically significant pre-monsoon wet-season onset advancement detected in NASA POWER 0.5° reanalysis. Across all 6 evaluated districts, IMERG wet-season anomalous accumulation onset changes between 2001–2012 and 2013–2024 are statistically indistinguishable from zero ($p \ge 0.34$ across all sites; median shift is 0.0 days in Bogura, -1.5 days in Rangpur, and -0.5 days in Cumilla). Furthermore, in full agreement with POWER, IMERG confirms no significant shift in agronomic Aman Kharif-2 monsoon onset ($p \ge 0.19$, with 21–46% left-censoring). Because high-resolution satellite precipitation does not confirm an earlier onset, the planting advisory maintains scientific conservatism: it does not claim an earlier pre-monsoon onset for Aman rice and advises strict adherence to traditional BRRI sowing and transplanting windows (mid-June seedbeds, mid-July transplanting) to prevent seedling submergence and avoid catastrophic terminal drought during grain filling.
