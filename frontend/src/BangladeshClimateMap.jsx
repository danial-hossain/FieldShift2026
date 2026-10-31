// frontend/src/BangladeshClimateMap.jsx
// Interactive Bangladesh 64-District Climate Map & Scenario Perturbation Sliders (A6)
// Visualizes NASA Earth Observations across 64 districts with scenario sliders (Rainfall ±20%, Temp +0..+2°C)

import React, { useState, useMemo } from 'react';
import districtsData from './bd_districts_choropleth.json';
import { formatNumber } from './marketUtils.js';

export function BangladeshClimateMap({ activeField = null, lang = 'bn' }) {
  const [selectedLayer, setSelectedLayer] = useState('grace'); // 'grace' | 'onset' | 'rain' | 'smap'
  const [selectedYear, setSelectedYear] = useState(2024);
  const [rainDelta, setRainDelta] = useState(0); // -20% to +20%
  const [tempDelta, setTempDelta] = useState(0.0); // 0.0 to +2.0 °C
  const [hoveredDistrict, setHoveredDistrict] = useState(null);

  const lat = activeField?.latitude != null ? Number(activeField.latitude) : 24.85;
  const lon = activeField?.longitude != null ? Number(activeField.longitude) : 89.37;
  const fieldName = activeField?.name || (lang === 'bn' ? 'বগুড়া পরীক্ষামূলক খামার' : 'Bogura Demo Field');

  // Convert field lat/lon to SVG coordinates
  const fieldX = Math.round((lon - 88.0) / 4.8 * 360 + 30);
  const fieldY = Math.round((26.7 - lat) / 6.2 * 460 + 30);

  // Layer color schemes and metadata
  const LAYER_META = {
    grace: {
      titleBn: 'নাসা গ্রেস-এফও ভূগর্ভস্থ পানি ট্রেন্ড (GRACE-FO Mascon)',
      titleEn: 'NASA GRACE-FO Groundwater Trend (JPL RL06.3M)',
      unit: 'cm/yr',
      colorScale: (val) => {
        if (val <= -1.2) return '#ef4444'; // Red (Severe Barind)
        if (val <= -0.5) return '#f59e0b'; // Amber (Moderate)
        if (val <= -0.3) return '#38bdf8'; // Cyan
        return '#00df81'; // Green (Stable Haor)
      },
      legend: [
        { label: '< -1.2 cm/yr (Severe Barind)', color: '#ef4444' },
        { label: '-0.5 to -1.2 (Moderate)', color: '#f59e0b' },
        { label: '-0.2 to -0.5 (Coastal/Central)', color: '#38bdf8' },
        { label: '> -0.2 (Stable Haor Basin)', color: '#00df81' },
      ]
    },
    onset: {
      titleBn: 'আমন বর্ষা অনসেট পরিবর্তন ঝুঁকি (Aman Onset Shift)',
      titleEn: 'Aman Monsoon Onset Shift (IMERG 2001–2024)',
      unit: 'days',
      colorScale: (val) => {
        if (val < -10) return '#ef4444';
        if (val < -3) return '#f59e0b';
        if (val <= 3) return '#00df81';
        return '#38bdf8';
      },
      legend: [
        { label: '> 10 days earlier (Erratic)', color: '#ef4444' },
        { label: '3 to 10 days shift', color: '#f59e0b' },
        { label: '±3 days (Stable Normal)', color: '#00df81' },
        { label: 'Delayed Onset', color: '#38bdf8' },
      ]
    },
    rain: {
      titleBn: 'প্রাক-বর্ষা বৃষ্টিপাতের পরিবর্তন (IMERG Step Change)',
      titleEn: 'Pre-Monsoon Rainfall Change (IMERG mm)',
      unit: 'mm',
      colorScale: (val) => {
        if (val > 50) return '#0284c7';
        if (val > 20) return '#00df81';
        if (val >= 0) return '#38bdf8';
        return '#f59e0b';
      },
      legend: [
        { label: '> +50 mm (High increase)', color: '#0284c7' },
        { label: '+20 to +50 mm', color: '#00df81' },
        { label: '0 to +20 mm', color: '#38bdf8' },
        { label: '< 0 mm (Pre-monsoon deficit)', color: '#f59e0b' },
      ]
    },
    smap: {
      titleBn: 'নাসা এসএমএপি রুট-জোন আর্দ্রতা ঘাটতি (SMAP L4 Deficit)',
      titleEn: 'NASA SMAP L4 Root-Zone Moisture Deficit',
      unit: '%',
      colorScale: (val) => {
        if (val <= -15) return '#ef4444';
        if (val <= -10) return '#f59e0b';
        return '#38bdf8';
      },
      legend: [
        { label: '< -15% (Critical Barind Deficit)', color: '#ef4444' },
        { label: '-10% to -15% (Moderate Stress)', color: '#f59e0b' },
        { label: '> -10% (Adequate Buffer)', color: '#38bdf8' },
      ]
    }
  };

  // Scenario perturbation impact calculations
  const scenarioImpact = useMemo(() => {
    // Penman-Monteith ET0 sensitivity: +4.2% per °C
    const et0IncreasePct = Number((tempDelta * 4.2).toFixed(1));
    // Water requirement delta mm: baseline ~1850 mm
    const waterDeltaMm = Math.round(1850 * (et0IncreasePct / 100.0) - (rainDelta * 12.0));
    // Heat stress days: +3 days per 1°C
    const extraHeatStressDays = Math.round(tempDelta * 3.5);

    // Resilience comparisons across strategies
    const existingProfitDeltaPct = Number((- (tempDelta * 3.2) + (rainDelta * 0.4)).toFixed(1));
    const waterStratProfitDeltaPct = Number((- (tempDelta * 1.8) + (rainDelta * 0.15)).toFixed(1));
    const soilStratProfitDeltaPct = Number((- (tempDelta * 1.5) + (rainDelta * 0.10)).toFixed(1));

    return {
      et0IncreasePct,
      waterDeltaMm,
      extraHeatStressDays,
      existingProfitDeltaPct,
      waterStratProfitDeltaPct,
      soilStratProfitDeltaPct
    };
  }, [rainDelta, tempDelta]);

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--glass-border)', padding: '20px 24px', marginBottom: 24, boxShadow: 'var(--glass-shadow)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>🗺️🎛️</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--cyan)', background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              A6: NASA SPATIAL CLIMATE MAP &amp; SCENARIO ENGINE
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            {lang === 'bn' ? 'বাংলাদেশ ৬৪-জেলা নাসা ক্লাইমেট ম্যাপ ও সিনারিও পার্টারবেশন' : 'Bangladesh 64-District NASA Climate Map & Scenario Sliders'}
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {lang === 'bn' ? 'নাসা জিআরইসিই-এফও, এসএমএপি, এবং জিপিএম আইএমইআরজি দ্বারা ৬৪ জেলার স্তরবিন্যাস' : '64-district choropleth driven by GRACE-FO, SMAP L4, and GPM IMERG 2001–2024 observations'}
          </span>
        </div>

        {/* Layer Selector Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'grace', label: '🛰️ GRACE-FO Trend' },
            { id: 'onset', label: '🌦️ Aman Onset Shift' },
            { id: 'rain', label: '💧 Rainfall Step' },
            { id: 'smap', label: '🌱 SMAP Root Deficit' },
          ].map(l => (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelectedLayer(l.id)}
              style={{
                background: selectedLayer === l.id ? 'var(--cyan)' : 'var(--glass)',
                color: selectedLayer === l.id ? 'var(--bg-deep)' : 'var(--text-2)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: selectedLayer === l.id ? 800 : 500,
                cursor: 'pointer'
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Map (Left) + Climate Perturbation Sliders (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        
        {/* Left: Interactive SVG Bangladesh Map */}
        <div style={{ background: 'rgba(2, 6, 23, 0.65)', border: '1px solid var(--line)', borderRadius: 12, padding: 16, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
              {LAYER_META[selectedLayer][lang === 'bn' ? 'titleBn' : 'titleEn']}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
              {lang === 'bn' ? 'জেলাসমূহ: ৬৪' : 'Districts: 64'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg viewBox="0 0 420 520" style={{ width: '100%', maxWidth: 360, height: 'auto', maxHeight: 420 }}>
              {/* Outer border & subtle grid */}
              <rect width="420" height="520" fill="none" rx="10" />
              
              {/* District Centroid Circles */}
              {districtsData.map(d => {
                let val = d.grace_trend_cm_yr;
                if (selectedLayer === 'onset') val = d.shift_days;
                if (selectedLayer === 'rain') val = d.rainfall_step_mm;
                if (selectedLayer === 'smap') val = d.smap_deficit_pct;

                const color = LAYER_META[selectedLayer].colorScale(val);
                const isHovered = hoveredDistrict?.id === d.id;

                return (
                  <g
                    key={d.id}
                    onMouseEnter={() => setHoveredDistrict({ ...d, val })}
                    onMouseLeave={() => setHoveredDistrict(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={d.x}
                      cy={d.y}
                      r={isHovered ? 9 : 6.5}
                      fill={color}
                      stroke={isHovered ? '#fff' : 'rgba(255, 255, 255, 0.3)'}
                      strokeWidth={isHovered ? 2 : 1}
                      opacity={0.85}
                    />
                  </g>
                );
              })}

              {/* Farmer's Field Active GPS Beacon */}
              <g transform={`translate(${fieldX}, ${fieldY})`}>
                <circle cx="0" cy="0" r="14" fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.6" strokeDasharray="3 3" />
                <circle cx="0" cy="0" r="7" fill="#f43f5e" />
                <circle cx="0" cy="0" r="2.5" fill="#fff" />
                <text x="12" y="4" fill="#f43f5e" fontSize="10" fontWeight="900">
                  📍 {fieldName}
                </text>
              </g>
            </svg>
          </div>

          {/* Hover Tooltip Card */}
          {hoveredDistrict && (
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--water)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>{hoveredDistrict.name} ({hoveredDistrict.bn_name})</span>
                <span style={{ color: 'var(--water)' }}>{hoveredDistrict.val} {LAYER_META[selectedLayer].unit}</span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                {hoveredDistrict.division} Division • Lat: {hoveredDistrict.lat.toFixed(2)}°, Lon: {hoveredDistrict.lon.toFixed(2)}°
              </span>
            </div>
          )}

          {/* Map Legend */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            {LAYER_META[selectedLayer].legend.map((lg, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text-2)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: lg.color, display: 'inline-block' }} />
                <span>{lg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Climate Scenario Perturbation Sliders (Rainfall ±20%, Temp +0..+2°C) */}
        <div style={{ background: 'var(--glass-strong)', border: '1px solid var(--line)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>🎛️⚡</span>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                {lang === 'bn' ? 'জলবায়ু চাপ পরিস্থিতি সিমুলেটর (Scenario Sliders)' : 'Climate Stress Scenario Sliders'}
              </h3>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {lang === 'bn'
                ? 'আইপিসিসি এসএসপি ক্লাইমেট মডেলের ভিত্তিতে তাপমাত্রা বৃদ্ধি ও বৃষ্টিপাতের পরিবর্তন প্রয়োগ করে ৪টি কৌশল পরীক্ষা করুন:'
                : 'Perturb field seasonal climate to evaluate financial and hydrological robustness:'}
            </p>

            {/* Slider 1: Rainfall (-20% to +20%) */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                <span style={{ color: 'var(--water)' }}>🌧️ {lang === 'bn' ? 'বৃষ্টিপাত অ্যানোমালি (Rainfall)' : 'Seasonal Rainfall'}:</span>
                <span style={{ color: rainDelta > 0 ? 'var(--water)' : rainDelta < 0 ? 'var(--alert)' : 'var(--text)' }}>
                  {rainDelta > 0 ? `+${rainDelta}%` : `${rainDelta}%`}
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                step="5"
                value={rainDelta}
                onChange={(e) => setRainDelta(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--water)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                <span>-20% (Drought Risk)</span>
                <span>0% (Climatology Normal)</span>
                <span>+20% (Excess Rain)</span>
              </div>
            </div>

            {/* Slider 2: Temperature (+0.0 to +2.0 °C) */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                <span style={{ color: 'var(--sun)' }}>🌡️ {lang === 'bn' ? 'তাপমাত্রা বৃদ্ধি (Warming)' : 'Temperature Rise'}:</span>
                <span style={{ color: tempDelta > 1.0 ? 'var(--alert)' : 'var(--sun)' }}>
                  +{tempDelta.toFixed(1)} °C
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.2"
                value={tempDelta}
                onChange={(e) => setTempDelta(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--sun)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                <span>+0.0 °C (Baseline)</span>
                <span>+1.0 °C (Moderate Warming)</span>
                <span>+2.0 °C (High Thermal Stress)</span>
              </div>
            </div>

            {/* Scenario Impact Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
              <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>
                  {lang === 'bn' ? 'সেচ চাহিদা পরিবর্তন' : 'Irrigation Need Δ'}
                </span>
                <div style={{ fontSize: 16, fontWeight: 800, color: scenarioImpact.waterDeltaMm > 0 ? 'var(--alert)' : 'var(--leaf)', marginTop: 2 }}>
                  {scenarioImpact.waterDeltaMm > 0 ? `+${scenarioImpact.waterDeltaMm}` : scenarioImpact.waterDeltaMm} mm
                </div>
              </div>

              <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>
                  {lang === 'bn' ? 'বাষ্পীভবন (ET₀) বৃদ্ধি' : 'ET₀ Shift'}
                </span>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--water)', marginTop: 2 }}>
                  +{scenarioImpact.et0IncreasePct}%
                </div>
              </div>

              <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>
                  {lang === 'bn' ? 'অতিরিক্ত তাপ চাপ দিন' : 'Extra Heat Days'}
                </span>
                <div style={{ fontSize: 16, fontWeight: 800, color: scenarioImpact.extraHeatStressDays > 0 ? 'var(--alert)' : 'var(--text)', marginTop: 2 }}>
                  +{scenarioImpact.extraHeatStressDays} days
                </div>
              </div>
            </div>

            {/* Strategy Sensitivity Comparison Table */}
            <div style={{ background: 'rgba(2, 6, 23, 0.6)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>
                {lang === 'bn' ? 'কৌশলসমূহের মুনাফা সহনশীলতা (Profit Resilience):' : 'Strategy Profit Resilience Under Scenario:'}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>1. বর্তমান আবর্তন (Existing):</span>
                  <strong style={{ color: scenarioImpact.existingProfitDeltaPct < 0 ? 'var(--alert)' : 'var(--leaf)' }}>
                    {scenarioImpact.existingProfitDeltaPct > 0 ? `+${scenarioImpact.existingProfitDeltaPct}` : scenarioImpact.existingProfitDeltaPct}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--water)' }}>2. পানি সাশ্রয়ী (Water-Efficiency):</span>
                  <strong style={{ color: scenarioImpact.waterStratProfitDeltaPct < 0 ? 'var(--alert)' : 'var(--leaf)' }}>
                    {scenarioImpact.waterStratProfitDeltaPct > 0 ? `+${scenarioImpact.waterStratProfitDeltaPct}` : scenarioImpact.waterStratProfitDeltaPct}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--sun)' }}>3. মাটি স্বাস্থ্য (Soil-Resilience):</span>
                  <strong style={{ color: scenarioImpact.soilStratProfitDeltaPct < 0 ? 'var(--alert)' : 'var(--leaf)' }}>
                    {scenarioImpact.soilStratProfitDeltaPct > 0 ? `+${scenarioImpact.soilStratProfitDeltaPct}` : scenarioImpact.soilStratProfitDeltaPct}%
                  </strong>
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              type="button"
              onClick={() => { setRainDelta(0); setTempDelta(0.0); }}
              style={{
                background: 'transparent',
                border: '1px solid var(--line)',
                color: 'var(--text-2)',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              ↺ {lang === 'bn' ? 'রিসেট নরমাল' : 'Reset to Baseline'}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

export default BangladeshClimateMap;
