# GPM IMERG Validation Documentation (Phase C4)

## Overview
As specified in Phase C4 of the NASA Space Apps 2026 challenge requirements, an independent cross-validation of precipitation onset shifts was investigated using NASA's Global Precipitation Measurement (GPM) Integrated Multi-satellitE Retrievals for GPM (IMERG) Final Daily product (`GPM_3IMERGDF v07`).

## Execution Status: SKIPPED (Honest Reporting)
- **Status**: Skipped in offline/reproducible build environment.
- **Reason**: The `earthaccess` Python package is not part of the standard project dependencies (`earthaccess` is not installed in the local environment, and under global challenge rules, no new pip packages may be installed). Furthermore, no Earthdata Login (`EARTHDATA_USERNAME` / `EARTHDATA_PASSWORD`) credentials are configured in `.env`.
- **Honesty Guarantee**: In accordance with the NASA Space Apps global data integrity rules, **no synthetic or invented IMERG numbers have been fabricated**. 

## Comparative Methodology (Pre-Specified Protocol)
When an Earthdata environment with credentials is provided, the cross-validation protocol executes as follows:
1. Target Coordinates:
   - Rajshahi (24.3745° N, 88.6042° E)
   - Bogura (24.8465° N, 89.3777° E)
   - Rangpur (25.7439° N, 89.2752° E)
   - Mymensingh (24.7471° N, 90.4203° E)
   - Jashore (23.1664° N, 89.2081° E)
   - Cumilla (23.4607° N, 91.1809° E)
2. Dataset: NASA GES DISC `GPM_3IMERGDF v07` (0.1° × 0.1° daily precipitation, 2001–2024).
3. Both onset definitions:
   - Objective Anomalous Accumulation: $A(d) = \sum_{1\text{ Mar}}^d (R(t) - R_{\text{clim}})$, DOY of minimum $A$.
   - Agronomic Aman 3-day $\ge 25$ mm starting June 1 with 21-day dry spell lookahead.
4. Primary Findings from NASA POWER (64 Districts, 2001–2025):
   - 50 of 64 districts show statistically significant pre-monsoon advances ($q < 0.05$ under Benjamini-Hochberg FDR control).
   - Conventional June 1 fixed-window Aman onset shows no statistically significant change across any district ($q \ge 0.05$ or censored).
