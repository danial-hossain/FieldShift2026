// frontend/src/DataEvidenceView.jsx
// Data & Evidence Workspace for FieldShift 2026
// Sub-navigation: NASA Data Sources, Data Provenance Registry, Research Reports, Scientific Methodology.
// Features: 4-tier data reliability hierarchy, dataset citations, NASA POWER parameter registry,
// missing-value protocols, and reproducibility reports.

import React, { useState } from 'react';
import { SyntheticDataLabView } from './SyntheticDataLabView.jsx';
import { formatNumber } from './marketUtils.js';
import { useTranslation } from './i18n.js';

export function DataEvidenceView({
  activeField,
  nasa,
  lang = 'bn',
  request,
  initialSubTab = 'sources',
}) {
  const { t } = useTranslation(lang);
  const [subTab, setSubTab] = useState(initialSubTab); // 'sources' | 'provenance' | 'reports' | 'methodology'

  const subTabs = [
    { id: 'sources', labelBn: 'নাসা তথ্য উৎস (NASA Sources)', labelEn: '1. NASA Data Sources', icon: '🛰️' },
    { id: 'provenance', labelBn: 'ডেটা প্রোভেন্যান্স রেজিস্ট্রি (4-Tier)', labelEn: '2. Data Provenance Registry', icon: '🏛️' },
    { id: 'reports', labelBn: 'গবেষণা ও বেঞ্চমার্ক রিপোর্ট', labelEn: '3. Research Reports', icon: '📊' },
    { id: 'methodology', labelBn: 'বৈজ্ঞানিক পদ্ধতি ও নিয়ম', labelEn: '4. Scientific Methodology', icon: '🔬' },
    { id: 'limitations', labelBn: 'সীমাবদ্ধতা ও পরিধি (Limitations)', labelEn: '5. Limitations & Boundaries', icon: '⚠️' },
  ];

  const DATASET_REGISTRY = [
    {
      code: 'PRECTOTCORR',
      name: 'Precipitation Corrected',
      units: 'mm/day',
      source: 'NASA GEOS-5.12.4 / MERRA-2',
      tier: 'Tier 1 (Observed / Assimilated)',
      coverage: '2001–2025 (25 Years Daily)',
      missingRule: '-999 marker converted to NaN; omitted without artificial imputation',
    },
    {
      code: 'T2M',
      name: 'Temperature at 2 Meters',
      units: '°C',
      source: 'NASA POWER Daily Point API',
      tier: 'Tier 1 (Observed / Assimilated)',
      coverage: '2001–2025 (25 Years Daily)',
      missingRule: 'Valid range [-10°C, 55°C]; missing days excluded from GDD accumulation',
    },
    {
      code: 'T2M_MAX / T2M_MIN',
      name: 'Maximum & Minimum Temperature',
      units: '°C',
      source: 'NASA POWER Daily Point API',
      tier: 'Tier 1 (Observed / Assimilated)',
      coverage: '2001–2025 (25 Years Daily)',
      missingRule: 'Used for daily diurnal range and GDD = max(0, min(35, Tmean) - 10)',
    },
    {
      code: 'RH2M',
      name: 'Relative Humidity at 2 Meters',
      units: '%',
      source: 'NASA POWER Daily Point API',
      tier: 'Tier 1 (Observed / Assimilated)',
      coverage: '2001–2025 (25 Years Daily)',
      missingRule: 'Valid range [0%, 100%]; missing values flagged as unavailable',
    },
    {
      code: 'ALLSKY_SFC_SW_DWN',
      name: 'All Sky Surface Shortwave Downward Irradiance',
      units: 'MJ/m²/day',
      source: 'NASA FlashFlux / CERES Satellite',
      tier: 'Tier 1 (Observed / Assimilated)',
      coverage: '2001–2025 (25 Years Daily)',
      missingRule: 'Solar radiation telemetry for Hargreaves reference evapotranspiration (ET0)',
    },
    {
      code: 'SMAP_L4_SM',
      name: 'Soil Moisture Active Passive (Root Zone SPL4SMGP)',
      units: 'm³/m³ (Volumetric fraction)',
      source: 'NASA SMAP Level-4 Global Assimilation (9 km)',
      tier: 'Tier 1 (OPeNDAP Subsetting)',
      coverage: 'Seasonal Telemetry (2023–2024) via NSIDC OPeNDAP',
      missingRule: 'Root zone moisture (0–100 cm depth) subsetted across representative seasons; multi-decadal archive catalogued as planned limitation.',
    },
    {
      code: 'MOD13Q1_NDVI',
      name: 'MODIS Normalized Difference Vegetation Index (NDVI)',
      units: 'Unitless Index [-0.2, 1.0]',
      source: 'NASA MODIS Terra/Aqua (250 m 16-Day)',
      tier: 'Planned (LP DAAC Cloud Tested)',
      coverage: 'LP DAAC Granule Catalogued',
      missingRule: 'Single 16-day granule tested (231 MB); full 24-year series (~130 GB) catalogued under Known Limitations as planned remote feature.',
    },
    {
      code: 'GRACE_JPL_RL06',
      name: 'GRACE / GRACE-FO Terrestrial Water Storage Anomaly',
      units: 'cm Equivalent Water Height (EWH)',
      source: 'NASA JPL RL06.3M Mascon CRI Grid (0.5°)',
      tier: 'Tier 1 (Satellite Gravimetry)',
      coverage: '2002–2024 (259 Monthly Observations)',
      missingRule: 'Regional trends recomputed directly from JPL NetCDF (-1.07 cm/yr Barind, +0.44 cm/yr Haor basin, -0.15 cm/yr Coastal), setting MILP water-scarcity weights.',
    },
    {
      code: 'SRTMGL1_ELEV',
      name: 'SRTM 1 Arc-Second Global Elevation & Slope',
      units: 'meters / % slope',
      source: 'NASA SRTMGL1 (30 m DEM)',
      tier: 'Tier 1 (Space Shuttle Radar Topography)',
      coverage: 'Static Topography (30 m global grid)',
      missingRule: 'Derived 3x3 Sobel window topographic slope and elevation from raw .hgt tiles for Hargreaves ET0 pressure correction and flood exposure.',
    },
  ];

  return (
    <div className="data-evidence-workspace" style={{ padding: '20px 0 40px 0', maxWidth: 1300, margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div
        className="dash-card ui-card-hud"
        style={{
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 26 }}>🛰️🏛️</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--water)',
                  background: 'rgba(56, 189, 248, 0.15)',
                  padding: '3px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  letterSpacing: '0.04em',
                }}
              >
                SCIENTIFIC PROVENANCE &amp; TRACEABILITY
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--leaf)',
                  background: 'rgba(0, 223, 129, 0.12)',
                  padding: '3px 8px',
                  borderRadius: 999,
                }}
              >
                {lang === 'bn' ? 'উৎস ও পদ্ধতি' : 'Sources and methods'}
              </span>
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>
              {lang === 'bn' ? 'তথ্য প্রমাণ ও বৈজ্ঞানিক প্রোভেন্যান্স' : 'Data Evidence & Scientific Provenance'}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 840 }}>
              {lang === 'bn'
                ? 'নাসা পাওয়ার দৈনিক উপাত্তের স্পেশাল ও টেম্পোরাল কভারেজ, ৪-স্তরের প্রোভেন্যান্স হায়ারার্কি, এবং বিআরআরআই ও এফএও অনুমোদিত বৈজ্ঞানিক পদ্ধতির প্রমাণ্য দলিল।'
                : 'Traceable NASA Earth Observations, 4-tier data provenance hierarchy, dataset citations, and validated agro-meteorological calibration methodologies.'}
            </p>
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 14, flexWrap: 'wrap' }}>
          {subTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              style={{
                background: subTab === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'var(--glass-strong)',
                border: subTab === tab.id ? '1px solid var(--water)' : '1px solid var(--line)',
                color: subTab === tab.id ? 'var(--water)' : 'var(--text-2)',
                borderRadius: 8,
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: subTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{lang === 'bn' ? tab.labelBn : tab.labelEn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SUB-TAB 1: NASA DATA SOURCES */}
      {subTab === 'sources' && (
        <div className="dash-card ui-card-hud" style={{ background: 'var(--glass-strong)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                {lang === 'bn' ? 'নাসা পাওয়ার অনুমোদিত প্যারামিটার রেজিস্ট্রি' : 'Official NASA POWER Telemetry Registry'}
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                NASA Prediction Of Worldwide Energy Resources (POWER) Daily Point API • 0.5° x 0.5° Spatial Grid
              </span>
            </div>
            <a
              href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'var(--water)',
                color: 'var(--text)',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              ↗ NASA POWER API Docs
            </a>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-2)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Parameter</th>
                  <th style={{ padding: '10px 12px' }}>Variable Name</th>
                  <th style={{ padding: '10px 12px' }}>Units</th>
                  <th style={{ padding: '10px 12px' }}>Assimilation Model</th>
                  <th style={{ padding: '10px 12px' }}>Data Reliability Tier</th>
                  <th style={{ padding: '10px 12px' }}>Missing Data Protocol</th>
                </tr>
              </thead>
              <tbody>
                {DATASET_REGISTRY.map((d, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '12px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--water)' }}>{d.code}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text)' }}>{d.name}</td>
                    <td style={{ padding: '12px', color: 'var(--sun)' }}>{d.units}</td>
                    <td style={{ padding: '12px', color: 'var(--text-2)' }}>{d.source}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: 11, background: 'rgba(0, 223, 129, 0.15)', color: 'var(--leaf)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        {d.tier}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-2)', maxWidth: 280 }}>{d.missingRule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DATA PROVENANCE REGISTRY (4-TIER HIERARCHY) */}
      {subTab === 'provenance' && (
        <div>
          <SyntheticDataLabView
            activeField={activeField}
            request={request}
            formatNumber={formatNumber}
            initialTab="provenance"
            lang={lang}
          />
        </div>
      )}

      {/* SUB-TAB 3: RESEARCH REPORTS & BENCHMARKS */}
      {subTab === 'reports' && (
        <div className="dash-card ui-card-hud" style={{ background: 'var(--glass-strong)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            {lang === 'bn' ? 'গবেষণা ও এলগরিদমিক বেঞ্চমার্ক রিপোর্ট' : 'Algorithmic Optimization & Robustness Reports'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {[
              {
                title: 'Multi-Field Sensitivity Across Bangladesh Agro-Ecological Zones',
                status: 'PASSED (17/17 Invariants)',
                date: '2026-10-30',
                desc: 'Evaluates 6 canonical field profiles (Bogura, Rajshahi, Rangpur, Mymensingh, Barisal, Cumilla) across soil texture, pH, and irrigation constraints.',
              },
              {
                title: 'Rajshahi Aman Rainfall Onset Distribution Shift (2001–2012 vs 2013–2025)',
                status: 'Empirical (+3.5 to +10.5 Days)',
                date: '2026-10-30',
                desc: 'NASA POWER Daily Point observation analysis using 3-day 25mm onset rule and 21-day dry-spell lookahead. Mann-Whitney U test p=0.93 indicates high interannual variance.',
              },
              {
                title: 'PuLP MILP Multi-Objective Solver Stability & Feasibility Benchmark',
                status: 'OPTIMAL (48/48 Cases)',
                date: '2026-10-30',
                desc: 'Tested across 4 objective profiles (Balanced, Profit-Focused, Water-Efficiency, Soil-Health). Enforces legume BNF intervals and botanical family alternation.',
              },
            ].map((rep, idx) => (
              <div key={idx} style={{ background: 'var(--glass)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{rep.date}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--leaf)', background: 'rgba(0, 223, 129, 0.12)', padding: '2px 8px', borderRadius: 4 }}>
                    {rep.status}
                  </span>
                </div>
                <strong style={{ fontSize: 14, color: 'var(--text)', display: 'block', marginBottom: 6 }}>{rep.title}</strong>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{rep.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SCIENTIFIC METHODOLOGY */}
      {subTab === 'methodology' && (
        <div className="dash-card ui-card-hud" style={{ background: 'var(--glass-strong)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            {lang === 'bn' ? 'বৈজ্ঞানিক পদ্ধতি, কৃষি নিয়ম ও সতর্কর্তা' : 'Scientific Methodology & Agronomic Calibration Protocols'}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            <div style={{ background: 'var(--glass)', padding: 16, borderRadius: 10, border: '1px solid var(--line)' }}>
              <strong style={{ color: 'var(--leaf)', display: 'block', marginBottom: 6, fontSize: 14 }}>
                1. বৃষ্টিপাত অনসেট নির্ধারণ নিয়ম (Rainfall Onset Definition):
              </strong>
              আমন মৌসুমে জুনের ১ তারিখ থেকে প্রতিদিনের বৃষ্টিপাত পরিমাপ করা হয়। প্রথম যে তারিখে পরপর ৩ দিনে মোট বৃষ্টিপাত ২৫ মিমি বা তার বেশি হয় এবং কমপক্ষে ১ দিন কার্যকর বৃষ্টি (≥ ১.০ মিমি) হয়, সেটিকে প্রাথমিক অনসেট বিবেচনা করা হয়।
            </div>

            <div style={{ background: 'var(--glass)', padding: 16, borderRadius: 10, border: '1px solid var(--line)' }}>
              <strong style={{ color: 'var(--water)', display: 'block', marginBottom: 6, fontSize: 14 }}>
                2. শুষ্ক স্পেল প্রত্যাখ্যান নিয়ম (Dry-Spell Lookahead Rule):
              </strong>
              প্রাথমিক অনসেটের পরবর্তী ২১ দিনের মধ্যে যদি একটানা ৭ বা তার বেশি দিন শুষ্ক (বৃষ্টি ২.০ মিমি এর কম) থাকে, তবে সেটিকে ভুয়া অনসেট (False Onset) হিসেবে বাতিল করা হয় এবং পরবর্তী টেকসই বৃষ্টিপাতের জন্য অনুসন্ধান অব্যাহত রাখা হয়।
            </div>

            <div style={{ background: 'var(--glass)', padding: 16, borderRadius: 10, border: '1px solid var(--line)' }}>
              <strong style={{ color: 'var(--sun)', display: 'block', marginBottom: 6, fontSize: 14 }}>
                3. ডিগ্রি-ডে সঞ্চয়ন (Growing Degree Days - GDD):
              </strong>
              ধানের শারীরবৃত্তীয় বৃদ্ধি পরিমাপে T_base = ১০°C এবং T_cap = ৩৫°C ব্যবহৃত হয়। সূত্র: Daily GDD = max(0, min(35, T_mean) - 10)। খরিফ মৌসুমে ডিগ্রি-ডে বৃদ্ধির ফলে উদ্ভিদের পানি চাহিদা বাড়ে।
            </div>

            <div style={{ background: 'var(--glass)', padding: 16, borderRadius: 10, border: '1px solid var(--line)' }}>
              <strong style={{ color: 'var(--alert)', display: 'block', marginBottom: 6, fontSize: 14 }}>
                4. রোপণ শিফট ও অনসেট শিফটের পার্থক্য (Recommendation Rule):
              </strong>
              বৃষ্টিপাত অনসেটের শিফট সরাসরি ধানের চারা রোপণ শিফটের সমান নয়। আগস্টের ১৫ তারিখের পরে রোপণ করলে অক্টোবরের শেষভাগে ধানের শীষ বের হওয়ার সময় খরা এবং নভেম্বরের ঠান্ডায় চিটা হওয়ার ঝুঁকি তৈরি হয়। তাই FieldShift সর্বোচ্চ ৭-১০ দিনের পরিমিত বীজতলা শিফট এবং স্বল্পমেয়াদী দ্রুত পরিপক্ক জাত (ব্রি ধান-৭৫, ১১৫ দিন) চাষের সুনির্দিষ্ট সুপারিশ করে।
            </div>
          </div>
        </div>
      )}


      {/* SUB-TAB 5: SCIENTIFIC LIMITATIONS & BOUNDARIES */}
      {subTab === 'limitations' && (
        <div className="dash-card ui-card-hud" style={{ background: 'var(--glass-strong)', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                {lang === 'bn' ? 'মডেল ও ডেটার বৈজ্ঞানিক সীমাবদ্ধতা এবং ব্যবহারিক পরিধি' : 'Scientific Limitations & Operational Boundaries'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
                {lang === 'bn'
                  ? 'গাণিতিক মডেল, রিমোট সেন্সিং উপাত্ত এবং বাজার তথ্যের বাস্তব সীমাবদ্ধতাসমূহ স্বচ্ছভাবে উপস্থাপিত।'
                  : 'Transparent disclosure of gridded satellite resolution, simulation bounds, market dynamics, and agronomic assumptions.'}
              </p>
            </div>
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(234, 179, 8, 0.15)', color: '#f59e0b', fontWeight: 700, border: '1px solid rgba(234, 179, 8, 0.3)' }}>
              {lang === 'bn' ? 'স্বচ্ছ গবেষণা চুক্তি' : 'Honesty Contract'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Limitation 1 */}
            <div style={{ background: 'var(--glass)', padding: 16, borderRadius: 12, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🛰️</span>
                <strong style={{ fontSize: 14, color: 'var(--water)' }}>
                  {lang === 'bn' ? '১. ০.৫° গ্রিড রেজোলিউশন (NASA POWER Scale)' : '1. 0.5° Gridded Scale (NASA POWER Resolution)'}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                {lang === 'bn'
                  ? 'NASA POWER আবহাওয়া উপাত্ত প্রায় ৫৫ কিমি × ৫৫ কিমি গ্রিড কোষে সংগৃহীত। এটি আঞ্চলিক মনসুন অনসেট ও সাধারণ প্রবণতা নির্ণয়ে অত্যন্ত নিখুঁত হলেও, অত্যন্ত স্থানীয় নদীর বাঁধ, গাছপালার ছায়া বা মাইক্রো-ক্লাইমেট বৈচিত্র্য এতে প্রতিফলিত হয় না।'
                  : 'NASA POWER meteorology is assimilated over a 0.5° × 0.5° (~55 km) grid cell. While statistically robust for multi-decadal climatology and onset detection, hyper-local microclimates (canopy shade, river levees) are spatially averaged across the cell.'}
              </p>
            </div>

            {/* Limitation 2 */}
            <div style={{ background: 'var(--glass)', padding: 16, borderRadius: 12, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🌱</span>
                <strong style={{ fontSize: 14, color: 'var(--leaf)' }}>
                  {lang === 'bn' ? '২. মাঠ পর্যায়ে লাইসিমিটার প্রমাণের শূন্যতা' : '2. Remote Sensing vs In-Situ Lysimetry'}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                {lang === 'bn'
                  ? 'মাটির আর্দ্রতা ও হাইড্রোলজিক্যাল বৈশিষ্ট্য ISRIC SoilGrids ও FAO-56 সমীকরণ ভিত্তিক। মাঠের মাটির বাস্তব ঘনত্ব ও ভূগর্ভস্থ পানিস্তরের গভীরতার পরিবর্তন যাচাইয়ের জন্য স্থানীয় উপ-সহকারী কৃষি কর্মকর্তা (SAAO) বা আঞ্চলিক মাটি পরীক্ষাগারের পরামর্শ প্রয়োজন।'
                  : 'Soil moisture and hydrology are modeled using ISRIC SoilGrids 250m and FAO-56 empirical functions. In-situ physical soil compaction and local watertable depth may vary; local agricultural extension (SAAO) validation is recommended.'}
              </p>
            </div>

            {/* Limitation 3 */}
            <div style={{ background: 'var(--glass)', padding: 16, borderRadius: 12, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>📈</span>
                <strong style={{ fontSize: 14, color: 'var(--accent-amber, #f59e0b)' }}>
                  {lang === 'bn' ? '৩. স্থানীয় হাট বনাম জাতীয় গড় মূল্য' : '3. Regional Mandi vs National Price Data'}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                {lang === 'bn'
                  ? 'অর্থনৈতিক লাভজনকতা হিসাব BBS এবং FAOSTAT-এর প্রাতিষ্ঠানিক পাইকারি মূল্যের গড় ডেটা ব্যবহার করে। কিন্তু দৈনিক স্থানীয় হাটে পাইকার সিন্ডিকেট, পরিবহন খরচ এবং তাৎক্ষণিক সরবরাহ-চাহিদার কারণে বিক্রয়মূল্য ওঠানামা করতে পারে।'
                  : 'Profit models utilize official BBS and FAOSTAT wholesale benchmarks. Actual farmgate returns at local village haats fluctuate based on transport access, middleman margins, and day-to-day market arrivals.'}
              </p>
            </div>

            {/* Limitation 4 */}
            <div style={{ background: 'var(--glass)', padding: 16, borderRadius: 12, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🧪</span>
                <strong style={{ fontSize: 14, color: '#a855f7' }}>
                  {lang === 'bn' ? '৪. সিন্থেটিক সিমুলেশন পরিধি' : '4. Synthetic Benchmark Boundaries'}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                {lang === 'bn'
                  ? 'গবেষণা ল্যাবে ব্যবহৃত সিন্থেটিক স্ট্রেস টেস্টগুলো অ্যালগরিদমের চরম আবহাওয়ায় প্রতিক্রিয়া যাচাইয়ের জন্য তৈরি। এগুলো ভবিষ্যৎ আবহাওয়ার পূর্বাভাস নয় এবং বাস্তব মাঠের পরিমাপিত তথ্য হিসেবে দাবি করা হয় না।'
                  : 'Synthetic holdout scenarios in the research lab exist purely to benchmark PuLP MILP solver stability under non-linear perturbations. They are not empirical future forecasts and represent controlled synthetic stress-tests.'}
              </p>
            </div>

            {/* Limitation 5 */}
            <div style={{ background: 'var(--glass)', padding: 16, borderRadius: 12, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🌊</span>
                <strong style={{ fontSize: 14, color: '#38bdf8' }}>
                  {lang === 'bn' ? '৫. হাওর ও প্লাবনভূমির জলাবদ্ধতা গতিশীলতা' : '5. Wetland & Flash Flood Dynamics'}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                {lang === 'bn'
                  ? 'সুনামগঞ্জের মতো নিচু হাওর অঞ্চলে এপ্রিলের শেষ বা মে মাসে পাহাড়ি ঢলে আকস্মিক বন্যা হতে পারে। আমাদের মডেল আমন মৌসুমে হাওরের জমিকে অনাবাদী রাখে, তবে ফসল কাটার সময় স্থানীয় বাঁধের নিরাপত্তা ও নিষ্কাশন অত্যন্ত গুরুত্বপূর্ণ।'
                  : 'Low-lying haor basins (e.g. Sunamganj) face flash flood risks from upstream catchments. While our optimization model enforces Kharif fallow constraints, Boro harvest windows remain dependent on local submersible embankment conditions.'}
              </p>
            </div>

            {/* Limitation 6 */}
            <div style={{ background: 'var(--glass)', padding: 16, borderRadius: 12, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🛡️</span>
                <strong style={{ fontSize: 14, color: '#ec4899' }}>
                  {lang === 'bn' ? '৬. উপাত্তের সততা ও ফাঁকা অবস্থা নীতি' : '6. Zero Fabrication & Honest Empty States'}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                {lang === 'bn'
                  ? 'যেখানে নাসার পরিমাপিত উপাত্ত বা ব্যবহারকারীর ইনপুট নেই (যেমন একক প্লটের লাইভ এনডিভিআই বা সেন্সর আর্দ্রতা), FieldShift সেখানে কৃত্রিম সংখ্যা বসায় না; স্পষ্টভাবে "তথ্য নেই" দেখায়।'
                  : 'Where empirical satellite telemetry or farmer field inputs are unavailable (e.g. single-plot live NDVI or continuous telemetry), FieldShift renders an honest "No data / তথ্য নেই" state rather than fabricated placeholders.'}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DataEvidenceView;
