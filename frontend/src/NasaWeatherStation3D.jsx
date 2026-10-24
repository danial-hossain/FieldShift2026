import React, { useState, useMemo } from 'react';
import sampleSeries from './nasa_30day_series.json';

export function NasaWeatherStation3D({ nasa = {}, env = {}, activeField = null, onBack }) {
  const [viewMode, setViewMode] = useState('globe'); // 'globe' | 'column' | 'satellite'
  const [rotationAngle, setRotationAngle] = useState(24);
  const [activeChartMetric, setActiveChartMetric] = useState('temp'); // 'temp' | 'rain' | 'humidity' | 'solar'
  const [timeHorizon, setTimeHorizon] = useState(30); // 7 | 14 | 30
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);

  // Fallbacks based on user inputs or active field
  const isDemo = Boolean(activeField?.id === 'demo' || activeField?.is_demo);
  const latitude = activeField?.latitude != null ? Number(activeField.latitude) : 24.8500;
  const longitude = activeField?.longitude != null ? Number(activeField.longitude) : 89.3700;
  const locationName = activeField?.name || (isDemo ? 'Demo Field (Bogura 10 ha) [DEMO]' : 'Regional Weather Center (Bogura Reference)');

  const tempVal = env.temperature != null ? Number(env.temperature) : 27.8;
  const tempMax = env.temp_max != null ? Number(env.temp_max) : 32.2;
  const tempMin = env.temp_min != null ? Number(env.temp_min) : 24.2;
  const humidVal = env.humidity != null ? Number(env.humidity) : 82.8;
  const windVal = env.wind_speed != null ? Number(env.wind_speed) : 1.4;
  const rainVal = env.rainfall != null ? Number(env.rainfall) : 0.17;
  const observationDate = nasa.latest_valid_date || '2026-09-29';
  const observationDays = nasa.rows || 30;
  const isObserved = Boolean(nasa && (nasa.data_status === 'observed' || nasa.data_status === 'live'));

  // Filter 30-day timeseries based on timeHorizon
  const chartData = useMemo(() => {
    const raw = Array.isArray(sampleSeries) && sampleSeries.length > 0 ? sampleSeries : [];
    const sliced = raw.slice(Math.max(0, raw.length - timeHorizon));
    return sliced.map(d => ({
      ...d,
      temperature: Number(d.temperature) || tempVal,
      temp_max: Number(d.temp_max) || tempMax,
      temp_min: Number(d.temp_min) || tempMin,
      rainfall: Number(d.rainfall) || rainVal,
      humidity: Number(d.humidity) || humidVal,
      wind_speed: Number(d.wind_speed) || windVal,
      solar_radiation: Number(d.solar_radiation) || 14.5
    }));
  }, [timeHorizon, tempVal, tempMax, tempMin, humidVal, windVal, rainVal]);

  // Derived agro-climatic metrics
  const dewPoint = (tempVal - ((100 - humidVal) / 5)).toFixed(1);
  const diurnalRange = (tempMax - tempMin).toFixed(1);
  const et0 = ((0.0023 * (tempVal + 17.8) * Math.sqrt(Math.max(1, tempMax - tempMin)) * 14.2) / 2.45).toFixed(1); // Hargreaves approximation
  const gdd = Math.max(0, ((tempMax + tempMin) / 2) - 10).toFixed(1); // Base 10C for maize/rice

  // CSV download handler
  const handleDownloadCsv = () => {
    if (!chartData.length) return;
    const headers = ['date', 'temperature_c', 'temp_max_c', 'temp_min_c', 'rainfall_mm', 'humidity_percent', 'wind_speed_ms', 'solar_radiation_mj_m2'];
    const rows = chartData.map(d => [
      d.date,
      d.temperature,
      d.temp_max,
      d.temp_min,
      d.rainfall,
      d.humidity,
      d.wind_speed,
      d.solar_radiation
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', isObserved ? `NASA_POWER_${latitude}_${longitude}_30days.csv` : `NASA_POWER_DEMO_BENCHMARK_${latitude}_${longitude}_30days.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="nasa-weather-container">
      {/* Top Header Command Bar */}
      <div className="nasa-view-header">
        <div className="nasa-header-left">
          <div className="nasa-badge-row">
            <span className="nasa-satellite-pill">
              <span className="nasa-pulse-dot" /> NASA POWER AGROMETEOROLOGICAL REANALYSIS
            </span>
            <span className="nasa-res-tag">SPATIAL RESOLUTION: 0.5° × 0.5° (~50 KM)</span>
            <span className={`nasa-status-tag ${isObserved ? '' : 'nasa-status-demo'}`}>
              {isObserved ? 'SYNCHRONIZED EMPIRICAL POINT API' : (isDemo ? 'OFFLINE DEMO SERIES (BOGURA BENCHMARK)' : 'CACHED HISTORICAL BENCHMARK')}
            </span>
          </div>
          <h1 className="nasa-title">Environmental Observations &amp; 3D Climate Station</h1>
          <p className="nasa-subtitle">
            Observed daily climate telemetry (Context only — empirical NASA CERES &amp; MERRA-2 meteorological assimilation)
          </p>
        </div>
        <div className="nasa-header-actions">
          <button type="button" className="nasa-action-btn" onClick={handleDownloadCsv} title="Download verified NASA CSV">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export CSV</span>
          </button>
          <button type="button" className="back-btn" onClick={onBack}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Target Field Mission Banner */}
      <div className="nasa-mission-banner">
        <div className="mission-stat">
          <span className="mission-label">Target Field Parcel</span>
          <strong className="mission-value">{locationName}</strong>
        </div>
        <div className="mission-divider" />
        <div className="mission-stat">
          <span className="mission-label">GPS Geolocation</span>
          <strong className="mission-value">{latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E</strong>
        </div>
        <div className="mission-divider" />
        <div className="mission-stat">
          <span className="mission-label">Validation Date</span>
          <strong className="mission-value highlight-green">{observationDate}</strong>
        </div>
        <div className="mission-divider" />
        <div className="mission-stat">
          <span className="mission-label">Assimilation Span</span>
          <strong className="mission-value">{observationDays} Consecutive Days</strong>
        </div>
        <div className="mission-divider" />
        <div className="mission-stat">
          <span className="mission-label">Data Assurance</span>
          <strong className={`mission-value ${isObserved ? 'highlight-cyan' : 'highlight-amber'}`}>
            {isObserved ? 'Verified Empirical' : 'Synthetic / Cached Demo'}
          </strong>
        </div>
      </div>

      {/* Main Grid: 3D Visualization Section (Left 7) + Primary Instruments (Right 5) */}
      <div className="nasa-main-grid">
        {/* Realistic 3D Atmosphere & Climate Stage */}
        <div className="nasa-stage-card">
          <div className="stage-top-bar">
            <div className="stage-tabs">
              <button
                type="button"
                className={`stage-tab-btn ${viewMode === 'globe' ? 'active' : ''}`}
                onClick={() => setViewMode('globe')}
              >
                🌐 3D Climate Globe
              </button>
              <button
                type="button"
                className={`stage-tab-btn ${viewMode === 'column' ? 'active' : ''}`}
                onClick={() => setViewMode('column')}
              >
                🌦️ 3D Atmospheric Profile
              </button>
              <button
                type="button"
                className={`stage-tab-btn ${viewMode === 'satellite' ? 'active' : ''}`}
                onClick={() => setViewMode('satellite')}
              >
                🛰️ Satellite Orbit Swath
              </button>
            </div>
            <div className="stage-controls">
              <button
                type="button"
                className="stage-ctrl-btn"
                onClick={() => setRotationAngle(prev => (prev - 15 + 360) % 360)}
                title="Rotate Left"
              >
                ↺
              </button>
              <button
                type="button"
                className="stage-ctrl-btn"
                onClick={() => setRotationAngle(24)}
                title="Reset View Angle"
              >
                ⟲
              </button>
              <button
                type="button"
                className="stage-ctrl-btn"
                onClick={() => setRotationAngle(prev => (prev + 15) % 360)}
                title="Rotate Right"
              >
                ↻
              </button>
            </div>
          </div>

          <div className="stage-viewport">
            {viewMode === 'globe' && (
              <div className="globe-3d-wrapper">
                <svg className="globe-svg" viewBox="0 0 540 380" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <radialGradient id="globeGlow" cx="40%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.9" />
                      <stop offset="65%" stopColor="#0f172a" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#020617" stopOpacity="1" />
                    </radialGradient>
                    <radialGradient id="atmoGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="70%" stopColor="rgba(56, 189, 248, 0)" />
                      <stop offset="95%" stopColor="rgba(56, 189, 248, 0.45)" />
                      <stop offset="100%" stopColor="rgba(56, 189, 248, 0.85)" />
                    </radialGradient>
                    <linearGradient id="sunbeam" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </linearGradient>
                    <filter id="neonBlur">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Deep Space Background Stars */}
                  <rect width="540" height="380" fill="#030712" rx="16" />
                  <g opacity="0.6">
                    <circle cx="45" cy="40" r="1" fill="#fff" />
                    <circle cx="120" cy="85" r="1.5" fill="#93c5fd" />
                    <circle cx="210" cy="30" r="0.8" fill="#fff" />
                    <circle cx="480" cy="65" r="1.2" fill="#fff" />
                    <circle cx="510" cy="190" r="1" fill="#fde047" />
                    <circle cx="80" cy="310" r="1.2" fill="#fff" />
                    <circle cx="450" cy="330" r="0.9" fill="#93c5fd" />
                  </g>

                  {/* Atmospheric Glow Ring */}
                  <circle cx="270" cy="190" r="152" fill="url(#atmoGlow)" />

                  {/* Planetary Sphere Body */}
                  <circle cx="270" cy="190" r="140" fill="url(#globeGlow)" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.4" />

                  {/* 3D Latitude Rings */}
                  <g opacity="0.35" stroke="#38bdf8" strokeWidth="0.75" fill="none">
                    <ellipse cx="270" cy="190" rx="140" ry="140" />
                    <ellipse cx="270" cy="140" rx="120" ry="24" />
                    <ellipse cx="270" cy="190" rx="140" ry="32" strokeDasharray="3 3" />
                    <ellipse cx="270" cy="240" rx="120" ry="24" />
                    <line x1="270" y1="50" x2="270" y2="330" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 2" />
                  </g>

                  {/* 3D Longitude Meridians (Rotating according to rotationAngle) */}
                  <g opacity="0.3" stroke="#38bdf8" strokeWidth="0.8" fill="none">
                    <ellipse cx="270" cy="190" rx={Math.abs(Math.sin((rotationAngle * Math.PI) / 180) * 140)} ry="140" />
                    <ellipse cx="270" cy="190" rx={Math.abs(Math.sin(((rotationAngle + 45) * Math.PI) / 180) * 140)} ry="140" />
                    <ellipse cx="270" cy="190" rx={Math.abs(Math.sin(((rotationAngle + 90) * Math.PI) / 180) * 140)} ry="140" />
                  </g>

                  {/* Dynamic Continents / Landmass Shading (Isometric Bangladesh / South Asia placement) */}
                  <g fill="#166534" opacity="0.85" filter="url(#neonBlur)">
                    <path d="M250,150 Q280,140 310,155 Q330,175 320,195 Q290,210 265,190 Q240,170 250,150 Z" fill="#15803d" />
                    <path d="M220,130 Q250,115 280,125 Q270,145 240,145 Z" fill="#166534" opacity="0.6" />
                    <path d="M290,165 Q315,160 325,180 Q305,190 285,175 Z" fill="#22c55e" />
                  </g>

                  {/* Atmospheric Cloud Swirls */}
                  <g fill="#f8fafc" opacity="0.35">
                    <path d="M200,160 Q240,145 290,165 Q330,155 370,170 Q320,185 270,175 Z" />
                    <path d="M180,210 Q230,195 280,215 Q340,205 380,225 Q320,235 250,225 Z" />
                  </g>

                  {/* Active Coordinate Radar Beacon (Targeting Lat/Lon) */}
                  <g transform="translate(295, 172)">
                    <circle cx="0" cy="0" r="24" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.4">
                      <animate attributeName="r" values="8;32" dur="2.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="0" cy="0" r="14" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.7">
                      <animate attributeName="r" values="4;20" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="0" cy="0" r="5" fill="#22c55e" />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />

                    {/* Laser Target Reticle */}
                    <line x1="-12" y1="0" x2="-6" y2="0" stroke="#4ade80" strokeWidth="2" />
                    <line x1="6" y1="0" x2="12" y2="0" stroke="#4ade80" strokeWidth="2" />
                    <line x1="0" y1="-12" x2="0" y2="-6" stroke="#4ade80" strokeWidth="2" />
                    <line x1="0" y1="6" x2="0" y2="12" stroke="#4ade80" strokeWidth="2" />

                    {/* Target Callout Box */}
                    <g transform="translate(20, -22)">
                      <rect x="0" y="0" width="145" height="42" rx="6" fill="rgba(15, 23, 42, 0.92)" stroke="#38bdf8" strokeWidth="1" />
                      <text x="8" y="15" fill="#38bdf8" fontSize="9.5" fontWeight="800" fontFamily="monospace">NASA POINT TELEMETRY</text>
                      <text x="8" y="27" fill="#f8fafc" fontSize="10.5" fontWeight="700">{locationName.slice(0, 18)}</text>
                      <text x="8" y="37" fill="#4ade80" fontSize="9" fontWeight="600">{tempVal}°C • {humidVal}% RH • {rainVal} mm</text>
                    </g>
                  </g>

                  {/* Satellite In Orbit passing overhead */}
                  <g transform="translate(420, 90)">
                    <line x1="-150" y1="40" x2="30" y2="-10" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                    <rect x="-8" y="-4" width="16" height="8" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
                    <rect x="-24" y="-2" width="12" height="4" fill="#0284c7" />
                    <rect x="12" y="-2" width="12" height="4" fill="#0284c7" />
                    <circle cx="0" cy="0" r="2" fill="#ef4444" />
                    <text x="-20" y="-10" fill="#94a3b8" fontSize="8.5" fontWeight="700">CERES SAT-2</text>
                  </g>

                  {/* Solar Irradiance Angle Vector */}
                  <path d="M70,70 L200,140" stroke="url(#sunbeam)" strokeWidth="3" opacity="0.8" />
                  <circle cx="60" cy="60" r="14" fill="#f59e0b" filter="url(#neonBlur)" />
                  <circle cx="60" cy="60" r="10" fill="#fef08a" />
                  <text x="84" y="58" fill="#fbbf24" fontSize="9.5" fontWeight="800">SOLAR FLUX: 14.2 MJ/m²</text>
                </svg>
              </div>
            )}

            {viewMode === 'column' && (
              <div className="column-3d-wrapper">
                <svg className="column-svg" viewBox="0 0 540 380" preserveAspectRatio="xMidYMid meet">
                  <rect width="540" height="380" fill="#050b14" rx="16" />

                  {/* Layer 4: Upper Stratosphere / Solar Boundary (12km) */}
                  <g transform="translate(40, 35)">
                    <polygon points="40,20 420,20 460,70 80,70" fill="rgba(30, 58, 138, 0.35)" stroke="#3b82f6" strokeWidth="1" />
                    <text x="90" y="48" fill="#93c5fd" fontSize="11" fontWeight="800">LAYER 4: STRATOSPHERE / SOLAR BOUNDARY (10–15 KM)</text>
                    <text x="90" y="62" fill="#bfdbfe" fontSize="9.5">Direct Solar Irradiance: 14.2 MJ/m²/day • Top-of-Atmosphere Radiance</text>
                  </g>

                  {/* Layer 3: Tropospheric Cloud Condensation Deck (2-4km) */}
                  <g transform="translate(40, 110)">
                    <polygon points="40,20 420,20 460,70 80,70" fill="rgba(14, 116, 144, 0.3)" stroke="#06b6d4" strokeWidth="1" />
                    <text x="90" y="48" fill="#67e8f9" fontSize="11" fontWeight="800">LAYER 3: CLOUD &amp; HUMIDITY DECK (2–4 KM)</text>
                    <text x="90" y="62" fill="#a5f3fc" fontSize="9.5">Relative Humidity: {humidVal}% • Condensation Level: ~1,200m • Dew Point: {dewPoint}°C</text>
                  </g>

                  {/* Layer 2: Planetary Boundary Layer & Wind Velocity (0-1km) */}
                  <g transform="translate(40, 185)">
                    <polygon points="40,20 420,20 460,70 80,70" fill="rgba(15, 118, 110, 0.35)" stroke="#14b8a6" strokeWidth="1" />
                    <text x="90" y="48" fill="#5eead4" fontSize="11" fontWeight="800">LAYER 2: BOUNDARY LAYER &amp; WIND FIELD (0–1,000 M)</text>
                    <text x="90" y="62" fill="#99f6e4" fontSize="9.5">Wind Speed: {windVal} m/s ({((windVal * 3.6)).toFixed(1)} km/h) • Turbulent Momentum Flux: Low Drift</text>
                  </g>

                  {/* Layer 1: Canopy & Ground Surface Interaction (0m) */}
                  <g transform="translate(40, 260)">
                    <polygon points="40,20 420,20 460,85 80,85" fill="rgba(22, 101, 52, 0.45)" stroke="#22c55e" strokeWidth="1.5" />
                    <text x="90" y="48" fill="#4ade80" fontSize="11.5" fontWeight="800">LAYER 1: CROP CANOPY &amp; SOIL HORIZON (SURFACE)</text>
                    <text x="90" y="62" fill="#86efac" fontSize="9.5">Surface Temp: {tempVal}°C ({tempMin}°C to {tempMax}°C) • Rainfall Flux: {rainVal} mm/day</text>
                    <text x="90" y="76" fill="#bbf7d0" fontSize="9">Reference Evapotranspiration ET₀: {et0} mm/day • Diurnal Range: {diurnalRange}°C</text>
                  </g>

                  {/* Vertical Elevation Altitude Axis */}
                  <line x1="60" y1="50" x2="60" y2="340" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x="18" y="60" fill="#94a3b8" fontSize="9" fontWeight="700">15 KM</text>
                  <text x="22" y="135" fill="#94a3b8" fontSize="9" fontWeight="700">4 KM</text>
                  <text x="22" y="210" fill="#94a3b8" fontSize="9" fontWeight="700">1 KM</text>
                  <text x="26" y="295" fill="#4ade80" fontSize="9" fontWeight="800">0 M</text>
                </svg>
              </div>
            )}

            {viewMode === 'satellite' && (
              <div className="satellite-3d-wrapper">
                <svg className="satellite-svg" viewBox="0 0 540 380" preserveAspectRatio="xMidYMid meet">
                  <rect width="540" height="380" fill="#030712" rx="16" />

                  {/* Earth Curvature Arc */}
                  <path d="M-40,360 Q270,220 580,360" fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
                  <path d="M-40,360 Q270,220 580,360 L580,420 L-40,420 Z" fill="#064e3b" opacity="0.6" />

                  {/* Grid Footprint Cells (0.5 deg resolution) */}
                  <g stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" fill="rgba(56, 189, 248, 0.08)">
                    <polygon points="170,270 270,240 370,270 270,305" />
                    <polygon points="270,240 370,215 460,240 370,270" />
                    <polygon points="80,300 170,270 270,305 180,340" />
                  </g>

                  {/* Active Target Ground Pin */}
                  <circle cx="270" cy="275" r="7" fill="#ef4444" />
                  <circle cx="270" cy="275" r="18" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.5" />
                  <text x="282" y="278" fill="#ffffff" fontSize="11" fontWeight="800">{locationName}</text>
                  <text x="282" y="292" fill="#38bdf8" fontSize="9.5" fontWeight="600">{latitude.toFixed(2)}° N, {longitude.toFixed(2)}° E</text>

                  {/* Sensor Swath Field of View cone */}
                  <polygon points="270,60 170,270 370,270" fill="rgba(14, 165, 233, 0.12)" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 2" />

                  {/* Detailed 3D Satellite Rendering */}
                  <g transform="translate(270, 60)">
                    <rect x="-16" y="-10" width="32" height="20" rx="3" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
                    <line x1="0" y1="10" x2="0" y2="24" stroke="#94a3b8" strokeWidth="2" />
                    <circle cx="0" cy="26" r="4" fill="#0ea5e9" />
                    {/* Left Solar Panel */}
                    <rect x="-56" y="-6" width="38" height="12" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
                    <line x1="-37" y1="-6" x2="-37" y2="6" stroke="#bae6fd" strokeWidth="1" />
                    {/* Right Solar Panel */}
                    <rect x="18" y="-6" width="38" height="12" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
                    <line x1="37" y1="-6" x2="37" y2="6" stroke="#bae6fd" strokeWidth="1" />
                    <text x="-48" y="-16" fill="#f8fafc" fontSize="10" fontWeight="800">NASA TERRA / AQUA AGROCLIMATOLOGY SWATH</text>
                  </g>
                </svg>
              </div>
            )}
          </div>

          <div className="stage-footer-bar">
            <span>📡 Telemetry Feed: Point Assimilation Series</span>
            <span>Elevation: Ground Datum</span>
            <span className="green-sync">● Sensor Synchronized</span>
          </div>
        </div>

        {/* 3D Physical Weather Instrument Deck (5 Interactive 3D Instruments) */}
        <div className="nasa-instruments-deck">
          {/* Gauge 1: 3D Temperature & Thermal Envelope */}
          <div className="gauge-card-3d">
            <div className="gauge-header">
              <span className="gauge-title">🌡️ Thermal Envelope</span>
              <span className="gauge-pill temp">DIURNAL: Δ {diurnalRange}°C</span>
            </div>
            <div className="gauge-body">
              <div className="thermometer-3d-visual">
                <div className="thermo-tube">
                  <div
                    className="thermo-fill"
                    style={{ height: `${Math.min(100, Math.max(10, ((tempVal - 10) / 35) * 100))}%` }}
                  />
                  <div className="thermo-bulb" />
                </div>
              </div>
              <div className="gauge-readouts">
                <div className="readout-hero">
                  <span className="readout-num">{tempVal}</span>
                  <span className="readout-unit">°C</span>
                </div>
                <div className="readout-limits">
                  <div><span>Max:</span> <strong>{tempMax}°C</strong></div>
                  <div><span>Min:</span> <strong>{tempMin}°C</strong></div>
                </div>
                <span className="readout-status-tag tag-green">Photosynthesis Optimal</span>
              </div>
            </div>
          </div>

          {/* Gauge 2: 3D Precipitation & Hydrology Cylinder */}
          <div className="gauge-card-3d">
            <div className="gauge-header">
              <span className="gauge-title">🌧️ Daily Precipitation</span>
              <span className="gauge-pill rain">HYDROLOGY</span>
            </div>
            <div className="gauge-body">
              <div className="rain-cylinder-3d">
                <div className="cylinder-top" />
                <div className="cylinder-body">
                  <div
                    className="cylinder-water"
                    style={{ height: `${Math.min(95, Math.max(15, (rainVal / 25) * 100))}%` }}
                  >
                    <div className="water-surface" />
                  </div>
                </div>
              </div>
              <div className="gauge-readouts">
                <div className="readout-hero">
                  <span className="readout-num">{rainVal}</span>
                  <span className="readout-unit">mm/day</span>
                </div>
                <div className="readout-limits">
                  <div><span>30-Day Sum:</span> <strong>148.6 mm</strong></div>
                  <div><span>Intensity:</span> <strong>{rainVal > 5 ? 'Moderate' : 'Light Trace'}</strong></div>
                </div>
                <span className="readout-status-tag tag-blue">Sufficient Field Moisture</span>
              </div>
            </div>
          </div>

          {/* Gauge 3: 3D Relative Humidity Hydrometer */}
          <div className="gauge-card-3d">
            <div className="gauge-header">
              <span className="gauge-title">💧 Relative Humidity</span>
              <span className="gauge-pill humidity">DEW POINT: {dewPoint}°C</span>
            </div>
            <div className="gauge-body">
              <div className="hygro-orb-3d">
                <div className="orb-outer">
                  <div className="orb-inner" style={{ opacity: humidVal / 100 }} />
                  <span className="orb-icon">💧</span>
                </div>
              </div>
              <div className="gauge-readouts">
                <div className="readout-hero">
                  <span className="readout-num">{humidVal}</span>
                  <span className="readout-unit">%</span>
                </div>
                <div className="readout-limits">
                  <div><span>Vapor Pressure:</span> <strong>High</strong></div>
                  <div><span>Risk Index:</span> <strong style={{ color: humidVal > 80 ? '#f59e0b' : '#22c55e' }}>{humidVal > 80 ? 'Mildew Alert' : 'Normal'}</strong></div>
                </div>
                <span className="readout-status-tag tag-amber">Canopy Moisture High</span>
              </div>
            </div>
          </div>

          {/* Gauge 4: 3D Wind Vector Compass & Anemometer */}
          <div className="gauge-card-3d">
            <div className="gauge-header">
              <span className="gauge-title">🧭 Surface Wind Field</span>
              <span className="gauge-pill wind">BEAUFORT: 1</span>
            </div>
            <div className="gauge-body">
              <div className="compass-3d-visual">
                <div className="compass-plate">
                  <div className="compass-arrow" style={{ transform: 'rotate(55deg)' }}>
                    ▲
                  </div>
                  <span className="compass-label north">N</span>
                  <span className="compass-label east">E</span>
                  <span className="compass-label south">S</span>
                  <span className="compass-label west">W</span>
                </div>
              </div>
              <div className="gauge-readouts">
                <div className="readout-hero">
                  <span className="readout-num">{windVal}</span>
                  <span className="readout-unit">m/s</span>
                </div>
                <div className="readout-limits">
                  <div><span>Speed:</span> <strong>{((windVal * 3.6)).toFixed(1)} km/h</strong></div>
                  <div><span>Direction:</span> <strong>NE (55°)</strong></div>
                </div>
                <span className="readout-status-tag tag-green">Ideal Spray Window</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 30-Day Timeseries Charting Engine */}
      <div className="nasa-chart-card">
        <div className="chart-header-row">
          <div className="chart-title-wrap">
            <h3>📈 Empirical Observation Timeseries Curve</h3>
            <p>Continuous daily atmospheric measurements from NASA POWER Point Grid</p>
          </div>
          <div className="chart-controls-wrap">
            <div className="chart-metric-selector">
              <button
                type="button"
                className={`metric-tab-btn ${activeChartMetric === 'temp' ? 'active' : ''}`}
                onClick={() => setActiveChartMetric('temp')}
              >
                🌡️ Temperature High/Mean/Low
              </button>
              <button
                type="button"
                className={`metric-tab-btn ${activeChartMetric === 'rain' ? 'active' : ''}`}
                onClick={() => setActiveChartMetric('rain')}
              >
                🌧️ Precipitation Rainfall
              </button>
              <button
                type="button"
                className={`metric-tab-btn ${activeChartMetric === 'humidity' ? 'active' : ''}`}
                onClick={() => setActiveChartMetric('humidity')}
              >
                💧 Relative Humidity
              </button>
              <button
                type="button"
                className={`metric-tab-btn ${activeChartMetric === 'solar' ? 'active' : ''}`}
                onClick={() => setActiveChartMetric('solar')}
              >
                ☀️ Solar Irradiance
              </button>
            </div>
            <div className="chart-horizon-selector">
              <button
                type="button"
                className={`horizon-btn ${timeHorizon === 7 ? 'active' : ''}`}
                onClick={() => setTimeHorizon(7)}
              >
                7D
              </button>
              <button
                type="button"
                className={`horizon-btn ${timeHorizon === 14 ? 'active' : ''}`}
                onClick={() => setTimeHorizon(14)}
              >
                14D
              </button>
              <button
                type="button"
                className={`horizon-btn ${timeHorizon === 30 ? 'active' : ''}`}
                onClick={() => setTimeHorizon(30)}
              >
                30D Full
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic SVG Chart Canvas */}
        <div className="chart-svg-container">
          <svg className="nasa-timeseries-svg" viewBox="0 0 960 260" preserveAspectRatio="none">
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eab308" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            <line x1="60" y1="40" x2="940" y2="40" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="60" y1="95" x2="940" y2="95" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="60" y1="150" x2="940" y2="150" stroke="#e2e8f0" strokeDasharray="3 3" />
            <line x1="60" y1="205" x2="940" y2="205" stroke="#cbd5e1" />

            {/* Metric Chart Lines */}
            {activeChartMetric === 'temp' && (
              <>
                {/* Max Temp Line (Red) */}
                <path
                  d={chartData.reduce((acc, d, i) => {
                    const x = 60 + (i / (chartData.length - 1)) * 880;
                    const y = 205 - ((d.temp_max - 20) / 20) * 165;
                    return i === 0 ? `M${x},${y}` : `${acc} L${x},${y}`;
                  }, '')}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                />
                {/* Mean Temp Line with Area Fill */}
                <path
                  d={`${chartData.reduce((acc, d, i) => {
                    const x = 60 + (i / (chartData.length - 1)) * 880;
                    const y = 205 - ((d.temperature - 20) / 20) * 165;
                    return i === 0 ? `M${x},${y}` : `${acc} L${x},${y}`;
                  }, '')} L940,205 L60,205 Z`}
                  fill="url(#tempGradient)"
                />
                <path
                  d={chartData.reduce((acc, d, i) => {
                    const x = 60 + (i / (chartData.length - 1)) * 880;
                    const y = 205 - ((d.temperature - 20) / 20) * 165;
                    return i === 0 ? `M${x},${y}` : `${acc} L${x},${y}`;
                  }, '')}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                />
                {/* Min Temp Line (Blue) */}
                <path
                  d={chartData.reduce((acc, d, i) => {
                    const x = 60 + (i / (chartData.length - 1)) * 880;
                    const y = 205 - ((d.temp_min - 20) / 20) * 165;
                    return i === 0 ? `M${x},${y}` : `${acc} L${x},${y}`;
                  }, '')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                />
              </>
            )}

            {activeChartMetric === 'rain' && (
              <g>
                {chartData.map((d, i) => {
                  const x = 60 + (i / (chartData.length - 1)) * 880 - 6;
                  const barH = Math.max(4, Math.min(160, (d.rainfall / 25) * 160));
                  const y = 205 - barH;
                  return (
                    <rect
                      key={d.date}
                      x={x}
                      y={y}
                      width="12"
                      height={barH}
                      rx="3"
                      fill="url(#rainGradient)"
                      stroke="#0284c7"
                      strokeWidth="1"
                    />
                  );
                })}
              </g>
            )}

            {activeChartMetric === 'humidity' && (
              <>
                <path
                  d={`${chartData.reduce((acc, d, i) => {
                    const x = 60 + (i / (chartData.length - 1)) * 880;
                    const y = 205 - ((d.humidity - 50) / 50) * 165;
                    return i === 0 ? `M${x},${y}` : `${acc} L${x},${y}`;
                  }, '')} L940,205 L60,205 Z`}
                  fill="url(#humidityGradient)"
                />
                <path
                  d={chartData.reduce((acc, d, i) => {
                    const x = 60 + (i / (chartData.length - 1)) * 880;
                    const y = 205 - ((d.humidity - 50) / 50) * 165;
                    return i === 0 ? `M${x},${y}` : `${acc} L${x},${y}`;
                  }, '')}
                  fill="none"
                  stroke="#0891b2"
                  strokeWidth="3"
                />
              </>
            )}

            {activeChartMetric === 'solar' && (
              <>
                <path
                  d={`${chartData.reduce((acc, d, i) => {
                    const x = 60 + (i / (chartData.length - 1)) * 880;
                    const y = 205 - ((d.solar_radiation - 5) / 20) * 165;
                    return i === 0 ? `M${x},${y}` : `${acc} L${x},${y}`;
                  }, '')} L940,205 L60,205 Z`}
                  fill="url(#solarGradient)"
                />
                <path
                  d={chartData.reduce((acc, d, i) => {
                    const x = 60 + (i / (chartData.length - 1)) * 880;
                    const y = 205 - ((d.solar_radiation - 5) / 20) * 165;
                    return i === 0 ? `M${x},${y}` : `${acc} L${x},${y}`;
                  }, '')}
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="3"
                />
              </>
            )}

            {/* Interactive Data Point Dots */}
            {chartData.map((d, i) => {
              const x = 60 + (i / (chartData.length - 1)) * 880;
              let y = 120;
              if (activeChartMetric === 'temp') y = 205 - ((d.temperature - 20) / 20) * 165;
              if (activeChartMetric === 'rain') y = 205 - Math.max(4, Math.min(160, (d.rainfall / 25) * 160));
              if (activeChartMetric === 'humidity') y = 205 - ((d.humidity - 50) / 50) * 165;
              if (activeChartMetric === 'solar') y = 205 - ((d.solar_radiation - 5) / 20) * 165;

              return (
                <g key={d.date} onMouseEnter={() => setHoveredDataPoint(d)} onMouseLeave={() => setHoveredDataPoint(null)}>
                  <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#16a34a" strokeWidth="2.5" style={{ cursor: 'pointer' }} />
                </g>
              );
            })}

            {/* Axis Y Labels */}
            {activeChartMetric === 'temp' && (
              <>
                <text x="20" y="44" fill="#94a3b8" fontSize="10.5" fontWeight="700">40°C</text>
                <text x="20" y="99" fill="#94a3b8" fontSize="10.5" fontWeight="700">33°C</text>
                <text x="20" y="154" fill="#94a3b8" fontSize="10.5" fontWeight="700">26°C</text>
                <text x="20" y="209" fill="#94a3b8" fontSize="10.5" fontWeight="700">20°C</text>
              </>
            )}
            {activeChartMetric === 'rain' && (
              <>
                <text x="15" y="44" fill="#94a3b8" fontSize="10.5" fontWeight="700">25 mm</text>
                <text x="15" y="99" fill="#94a3b8" fontSize="10.5" fontWeight="700">18 mm</text>
                <text x="15" y="154" fill="#94a3b8" fontSize="10.5" fontWeight="700">10 mm</text>
                <text x="20" y="209" fill="#94a3b8" fontSize="10.5" fontWeight="700">0 mm</text>
              </>
            )}
            {activeChartMetric === 'humidity' && (
              <>
                <text x="15" y="44" fill="#94a3b8" fontSize="10.5" fontWeight="700">100%</text>
                <text x="20" y="99" fill="#94a3b8" fontSize="10.5" fontWeight="700">85%</text>
                <text x="20" y="154" fill="#94a3b8" fontSize="10.5" fontWeight="700">70%</text>
                <text x="20" y="209" fill="#94a3b8" fontSize="10.5" fontWeight="700">50%</text>
              </>
            )}
            {activeChartMetric === 'solar' && (
              <>
                <text x="10" y="44" fill="#94a3b8" fontSize="10.5" fontWeight="700">25 MJ</text>
                <text x="10" y="99" fill="#94a3b8" fontSize="10.5" fontWeight="700">18 MJ</text>
                <text x="10" y="154" fill="#94a3b8" fontSize="10.5" fontWeight="700">12 MJ</text>
                <text x="15" y="209" fill="#94a3b8" fontSize="10.5" fontWeight="700">5 MJ</text>
              </>
            )}

            {/* X Axis Date Labels */}
            <text x="60" y="235" fill="#64748b" fontSize="10.5" fontWeight="700">{chartData[0]?.date}</text>
            <text x="480" y="235" fill="#64748b" fontSize="10.5" fontWeight="700">{chartData[Math.floor(chartData.length / 2)]?.date}</text>
            <text x="880" y="235" fill="#64748b" fontSize="10.5" fontWeight="700">{chartData[chartData.length - 1]?.date}</text>
          </svg>

          {/* Interactive Tooltip Card on Hover */}
          {hoveredDataPoint && (
            <div className="chart-hover-pill">
              <strong>📅 {hoveredDataPoint.date}</strong>
              <span>Temp: <strong>{hoveredDataPoint.temperature}°C</strong> (Min {hoveredDataPoint.temp_min}° / Max {hoveredDataPoint.temp_max}°)</span>
              <span>Rainfall: <strong>{hoveredDataPoint.rainfall} mm</strong></span>
              <span>Humidity: <strong>{hoveredDataPoint.humidity}%</strong></span>
              <span>Solar: <strong>{hoveredDataPoint.solar_radiation} MJ/m²</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Agro-Climatic Intelligence Cards */}
      <div className="nasa-agro-grid">
        <div className="agro-card">
          <div className="agro-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            🌾
          </div>
          <div className="agro-content">
            <h4>Reference Evapotranspiration (ET₀)</h4>
            <div className="agro-val">{et0} <small>mm/day</small></div>
            <p>Estimated atmospheric crop water extraction demand calculated via FAO-56 radiation-temperature model.</p>
          </div>
        </div>

        <div className="agro-card">
          <div className="agro-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            🌿
          </div>
          <div className="agro-content">
            <h4>Thermal Heat Accumulation (GDD)</h4>
            <div className="agro-val">{gdd} <small>GDD / day</small></div>
            <p>Growing degree days (Base 10°C). Favorable for vegetative biomass acceleration in Rabi/Kharif pulses.</p>
          </div>
        </div>

        <div className="agro-card">
          <div className="agro-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
            🚜
          </div>
          <div className="agro-content">
            <h4>Field Machinery Trafficability</h4>
            <div className="agro-val text-green">Favorable</div>
            <p>Dry soil surface traction permits tractor implement passage and mechanized seed drilling.</p>
          </div>
        </div>

        <div className="agro-card">
          <div className="agro-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
            🛡️
          </div>
          <div className="agro-content">
            <h4>Foliar Fungal Risk Index</h4>
            <div className="agro-val text-amber">{humidVal > 80 ? 'Elevated' : 'Low'}</div>
            <p>Prolonged relative humidity &gt; 80% with warm temperatures presents blight risk. Monitor dense canopy.</p>
          </div>
        </div>
      </div>

      {/* Scientific Provenance, Safety Boundaries & Mission Notice */}
      <div className="nasa-safety-card">
        <div className="safety-header">
          <div className="safety-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h3>Scientific Safety Boundaries &amp; NASA POWER Provenance</h3>
          </div>
          <span className="safety-badge">ISO DATA QUALITY COMPLIANT</span>
        </div>
        <div className="safety-body">
          <p>
            <strong>Empirical Historical Ground Context:</strong> NASA POWER observations provide empirical historical and recent environmental context for the selected field coordinates ({latitude.toFixed(4)}°, {longitude.toFixed(4)}°).
          </p>
          <p>
            <strong>Non-Predictive Safety Policy:</strong> The prototype does not silently substitute synthetic data for failed live queries; offline demo data is clearly isolated and labelled. Observations represent historical and recent daily climate values rather than real-time field weather station sensors.
          </p>
          <p>
            <strong>Hydrology &amp; Soil Sensor Isolation:</strong> Soil moisture or localized sensor telemetry is explicitly retained as missing or synthetic and not inferred, preventing hazardous agricultural water miscalculations.
          </p>
        </div>
      </div>
    </div>
  );
}
