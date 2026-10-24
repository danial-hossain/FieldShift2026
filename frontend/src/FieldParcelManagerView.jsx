import React, { useState, useEffect } from 'react';
import { GoogleFieldMapPicker } from './GoogleFieldMapPicker.jsx';
import { GoogleFieldMapThumbnail } from './GoogleFieldMapThumbnail.jsx';

const SOIL_TEXTURE_DATA = {
  clay_loam: {
    label: 'Clay Loam',
    fc: '32%',
    pwp: '18%',
    sand: 32,
    silt: 34,
    clay: 34,
    colorHex: '#78350f',
    bgBadge: '#fef3c7',
    textBadge: '#92400e',
    hydraulicCond: '0.8 cm/hr'
  },
  loam: {
    label: 'Medium Loam',
    fc: '28%',
    pwp: '14%',
    sand: 40,
    silt: 40,
    clay: 20,
    colorHex: '#854d0e',
    bgBadge: '#fef9c3',
    textBadge: '#854d0e',
    hydraulicCond: '1.5 cm/hr'
  },
  silty_loam: {
    label: 'Silty Loam',
    fc: '31%',
    pwp: '15%',
    sand: 20,
    silt: 65,
    clay: 15,
    colorHex: '#a16207',
    bgBadge: '#fef3c7',
    textBadge: '#78350f',
    hydraulicCond: '1.2 cm/hr'
  },
  sandy_loam: {
    label: 'Sandy Loam',
    fc: '21%',
    pwp: '9%',
    sand: 65,
    silt: 25,
    clay: 10,
    colorHex: '#ca8a04',
    bgBadge: '#fef08a',
    textBadge: '#713f12',
    hydraulicCond: '3.2 cm/hr'
  },
  silty_clay: {
    label: 'Silty Clay',
    fc: '36%',
    pwp: '22%',
    sand: 10,
    silt: 45,
    clay: 45,
    colorHex: '#581c87',
    bgBadge: '#f3e8ff',
    textBadge: '#6b21a8',
    hydraulicCond: '0.3 cm/hr'
  },
  clay: {
    label: 'Heavy Clay',
    fc: '39%',
    pwp: '25%',
    sand: 15,
    silt: 25,
    clay: 60,
    colorHex: '#450a0a',
    bgBadge: '#fee2e2',
    textBadge: '#991b1b',
    hydraulicCond: '0.2 cm/hr'
  },
  unknown: {
    label: 'Standard Loam',
    fc: '27%',
    pwp: '13%',
    sand: 40,
    silt: 40,
    clay: 20,
    colorHex: '#713f12',
    bgBadge: '#f5f5f4',
    textBadge: '#44403c',
    hydraulicCond: '1.4 cm/hr'
  }
};

const defaultFormatDate = d => {
  if (!d) return 'Ready';
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return String(d);
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(d);
  }
};

const defaultFormatNumber = (val, digits = 2, fallback = 'Not available') => {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return n.toFixed(digits);
};

export function FieldParcelManagerView({
  user = null,
  userFarms = [],
  fieldsLoaded = true,
  fieldsError = '',
  activeField = null,
  userFields = [],
  onSelectField,
  onSelectForAnalysis,
  onViewField,
  onEditField,
  onArchiveField,
  onAddField,
  onBack,
  formatDate = defaultFormatDate,
  formatNumber = defaultFormatNumber
}) {
  const [mapMode, setMapMode] = useState('satellite'); // 'satellite' | '3d_block' | 'ndvi'
  const [pinMode, setPinMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isDemo = Boolean(activeField?.id === 'demo' || activeField?.is_demo);
  const hasActiveField = Boolean(activeField);
  const lat = activeField?.latitude != null ? Number(activeField.latitude) : 24.8500;
  const lon = activeField?.longitude != null ? Number(activeField.longitude) : 89.3700;
  const [pinnedCoords, setPinnedCoords] = useState({ lat, lon });

  // Keep pinned coordinates synchronized if active field updates and pin mode is off
  useEffect(() => {
    if (!pinMode) {
      setPinnedCoords({ lat, lon });
    }
  }, [lat, lon, pinMode]);

  const areaHa = activeField?.area_ha != null ? Number(activeField.area_ha) : 10.0;
  const areaAcres = (areaHa * 2.47105).toFixed(1);
  const texture = activeField?.soil_texture || 'loam';
  const organicMatter = activeField?.organic_matter != null ? Number(activeField.organic_matter) : 2.5;
  const irrigationMm = activeField?.irrigation_capacity_mm != null ? Number(activeField.irrigation_capacity_mm) : 90;
  const crop = activeField?.crop || activeField?.previous_crop || 'Maize';
  const cropYear = activeField?.previous_crop_year || 2024;

  const soilInfo = SOIL_TEXTURE_DATA[texture] || SOIL_TEXTURE_DATA.unknown;

  // Filtered fields based on search
  const filteredFields = userFields.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.soil_texture && f.soil_texture.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (f.id && String(f.id).includes(searchQuery))
  );

  const handleStartPinning = () => {
    setMapMode('satellite');
    setPinMode(true);
  };

  const handleCancelPinning = () => {
    setPinMode(false);
    setPinnedCoords({ lat, lon });
  };

  const handleRegisterFromPin = () => {
    if (onAddField) {
      onAddField({
        latitude: pinnedCoords.lat,
        longitude: pinnedCoords.lon
      });
    }
  };

  return (
    <div className="parcel-manager-viewport">
      {/* 1. Header Toolbar with Direct Add Button */}
      <div className="parcel-view-header">
        <div className="parcel-header-left">
          <div className="parcel-icon-glow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6l9-4 9 4v12l-9 4-9-4V6z" />
              <path d="M12 2v20" />
              <path d="M3 6l18 12" />
            </svg>
          </div>
          <div>
            <div className="header-breadcrumbs">
              <span>Farm Management</span>
              <span className="sep">/</span>
              <span className="current">Field & Parcel Registry</span>
            </div>
            <h2>My Field & Parcel Manager</h2>
            <p>Manage Field Boundaries, Soil Texture Horizons & Authoritative GIS Farm Locations</p>
          </div>
        </div>

        <div className="parcel-header-actions">
          <button type="button" className="btn-parcel-back" onClick={onBack}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* 2. Active Parcel Hero Summary Card */}
      <div className="parcel-hero-banner" style={{ borderLeft: hasActiveField ? (isDemo ? '4px solid #0284c7' : '4px solid #16a34a') : '4px solid #f59e0b' }}>
        <div className="hero-banner-main">
          <div className="hero-status-tag" style={{ background: hasActiveField ? (isDemo ? '#e0f2fe' : '#dcfce7') : '#fef3c7', color: hasActiveField ? (isDemo ? '#0369a1' : '#15803d') : '#b45309' }}>
            <span className={hasActiveField ? "pulse-dot" : ""} style={hasActiveField ? undefined : { width: 8, height: 8, borderRadius: '50%', background: '#b45309', display: 'inline-block' }} />
            {hasActiveField ? (isDemo ? 'DEMO BENCHMARK PARCEL' : 'CURRENT ACTIVE PARCEL') : 'NO ACTIVE PARCEL REGISTERED'}
          </div>
          <h1 className="hero-parcel-name">
            {hasActiveField ? activeField.name : 'কোনো সক্রিয় জমি নিবন্ধিত নেই (০ জমি)'}
          </h1>
          <div className="hero-meta-strip">
            {hasActiveField ? (
              <>
                <span className="hero-meta-chip font-mono">
                  📍 {lat.toFixed(4)}° N, {lon.toFixed(4)}° E
                </span>
                <span className="hero-meta-chip">
                  📐 {areaHa} ha ({areaAcres} acres)
                </span>
                <span className="hero-meta-chip" style={{ background: soilInfo.bgBadge, color: soilInfo.textBadge, borderColor: soilInfo.colorHex }}>
                  🌱 {soilInfo.label}
                </span>
                <span className="hero-source-chip">
                  {isDemo ? 'Offline Demo Benchmark' : `Authoritative PostgreSQL (#${activeField.id})`}
                </span>
              </>
            ) : (
              <>
                <span className="hero-meta-chip">
                  📋 রেজিস্ট্রি খালি (০ নিবন্ধিত জমি)
                </span>
                <span className="hero-meta-chip">
                  💡 নিচে "Add New Field" চাপুন বা ডেমো খামার পরীক্ষা করুন
                </span>
              </>
            )}
          </div>
        </div>

        <div className="hero-banner-stats">
          <div className="hero-stat-block">
            <span className="stat-label">Organic Matter</span>
            <span className="stat-val text-green">{hasActiveField ? `${organicMatter}%` : '--'}</span>
            <small className="stat-sub">{hasActiveField ? (isDemo ? 'Benchmark Estimate' : 'Measured / Registered') : 'No measurement'}</small>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat-block">
            <span className="stat-label">Irrigation Cap.</span>
            <span className="stat-val">{hasActiveField ? `${irrigationMm} mm` : '--'}</span>
            <small className="stat-sub">{hasActiveField ? 'Seasonal Quota' : 'No measurement'}</small>
          </div>
        </div>
      </div>

      {/* 3. Main Stage: 3D / Satellite Map Viewport (Left) + Soil Horizon Deck (Right) */}
      <div className="parcel-main-grid">
        {/* Left Map Viewport Card */}
        <div className="parcel-stage-card">
          <div className="stage-header-bar">
            <div className="stage-mode-tabs">
              <button
                type="button"
                className={`stage-mode-btn ${mapMode === 'satellite' ? 'active' : ''}`}
                onClick={() => setMapMode('satellite')}
              >
                🛰️ Satellite View
              </button>
              <button
                type="button"
                className={`stage-mode-btn ${mapMode === '3d_block' ? 'active' : ''}`}
                onClick={() => setMapMode('3d_block')}
              >
                🏔️ 3D Terrain Block
              </button>
              <button
                type="button"
                className={`stage-mode-btn ${mapMode === 'ndvi' ? 'active' : ''}`}
                onClick={() => setMapMode('ndvi')}
              >
                🌱 Simulated NDVI Health
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {mapMode === 'satellite' && (
                pinMode ? (
                  <button
                    type="button"
                    className="stage-mode-btn"
                    style={{ background: '#fef2f2', borderColor: '#ef4444', color: '#b91c1c' }}
                    onClick={handleCancelPinning}
                  >
                    ✕ Cancel Pin
                  </button>
                ) : (
                  <button
                    type="button"
                    className="stage-mode-btn"
                    style={{ background: '#eff6ff', borderColor: '#3b82f6', color: '#1d4ed8' }}
                    onClick={handleStartPinning}
                    title="Click anywhere on the map to pin a new location for a new field"
                  >
                    📍 Pin New Location on Map
                  </button>
                )
              )}
              <div className="stage-coords-tag font-mono">
                GPS: {(pinMode ? pinnedCoords.lat : lat).toFixed(4)}, {(pinMode ? pinnedCoords.lon : lon).toFixed(4)}
              </div>
            </div>
          </div>

          {/* Pin Mode Alert Strip */}
          {mapMode === 'satellite' && pinMode && (
            <div style={{
              background: '#ecfdf5',
              borderBottom: '1px solid #a7f3d0',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              fontSize: 13
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>📍</span>
                <span>
                  <strong>Pin Mode Active:</strong> Drag marker or click the map to select coordinates (
                  <code className="font-mono">{pinnedCoords.lat.toFixed(4)}°, {pinnedCoords.lon.toFixed(4)}°</code>
                  ).
                </span>
              </div>
              <button
                type="button"
                className="btn-primary-sm"
                style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
                onClick={handleRegisterFromPin}
              >
                + Register Field with these Coordinates
              </button>
            </div>
          )}

          <div className="stage-canvas-wrapper">
            {mapMode === 'satellite' && (
              <div className="interactive-google-map-holder">
                <GoogleFieldMapPicker
                  latitude={pinMode ? pinnedCoords.lat : lat}
                  longitude={pinMode ? pinnedCoords.lon : lon}
                  readOnly={!pinMode}
                  onChange={(newLat, newLng) => {
                    if (pinMode) {
                      setPinnedCoords({ lat: Number(newLat), lon: Number(newLng) });
                    }
                  }}
                  onLocationNameChange={() => {}}
                />
              </div>
            )}

            {mapMode === '3d_block' && (
              <div className="isometric-3d-block-holder">
                <svg className="isometric-svg" viewBox="0 0 600 380" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="topsoilGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={soilInfo.colorHex} />
                      <stop offset="100%" stopColor="#3f2305" />
                    </linearGradient>
                    <linearGradient id="subsoilGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#451a03" />
                      <stop offset="100%" stopColor="#1c1917" />
                    </linearGradient>
                    <linearGradient id="canopyGreen" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#15803d" />
                    </linearGradient>
                  </defs>

                  {/* Dark Grid Background */}
                  <rect width="600" height="380" fill="#09140e" rx="16" />

                  {/* 3D Isometric Extruded Block Base */}
                  {/* Right Face (Depth Layer) */}
                  <polygon points="480,180 480,260 300,340 300,260" fill="url(#subsoilGrad)" stroke="#78350f" strokeWidth="1.5" />
                  {/* Left Face (Depth Layer) */}
                  <polygon points="120,180 120,260 300,340 300,260" fill="#291807" stroke="#78350f" strokeWidth="1.5" />

                  {/* Top Face (Surface Crop Canopy / Furrow field) */}
                  <polygon points="300,80 480,180 300,260 120,180" fill="url(#topsoilGrad)" stroke="#22c55e" strokeWidth="2" />

                  {/* Crop Furrow Lines in 3D perspective */}
                  <g stroke="rgba(34, 197, 94, 0.5)" strokeWidth="2" fill="none">
                    <line x1="260" y1="102" x2="380" y2="215" strokeDasharray="6 4" />
                    <line x1="220" y1="125" x2="340" y2="238" strokeDasharray="6 4" />
                    <line x1="180" y1="147" x2="300" y2="260" strokeDasharray="6 4" />
                    <line x1="300" y1="80" x2="420" y2="193" strokeDasharray="6 4" />
                    <line x1="340" y1="102" x2="460" y2="215" strokeDasharray="6 4" />
                  </g>

                  {/* 3D Crop Plants Array */}
                  <g fill="url(#canopyGreen)">
                    <circle cx="280" cy="120" r="5" />
                    <circle cx="320" cy="140" r="6" />
                    <circle cx="360" cy="160" r="5.5" />
                    <circle cx="240" cy="140" r="5" />
                    <circle cx="280" cy="165" r="6.5" />
                    <circle cx="320" cy="190" r="6" />
                    <circle cx="200" cy="165" r="4.5" />
                    <circle cx="240" cy="190" r="6" />
                    <circle cx="280" cy="215" r="6.5" />
                  </g>

                  {/* Center Radar Beacon */}
                  <g transform="translate(300, 170)">
                    <circle cx="0" cy="0" r="28" fill="none" stroke="#4ade80" strokeWidth="1.5" opacity="0.6">
                      <animate attributeName="r" values="10;45" dur="2.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="0" cy="0" r="6" fill="#22c55e" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                  </g>

                  {/* Dimension Annotations */}
                  <g fill="#f8fafc" fontSize="11" fontWeight="700">
                    <text x="495" y="200" fill="#4ade80">Topsoil: 0–15 cm (OM {organicMatter}%)</text>
                    <text x="495" y="235" fill="#f59e0b">Subsoil: 15–40 cm ({soilInfo.label})</text>
                    <text x="495" y="270" fill="#94a3b8">Bedrock Drainage Horizon</text>
                    <line x1="485" y1="185" x2="490" y2="185" stroke="#4ade80" strokeWidth="2" />
                    <line x1="485" y1="220" x2="490" y2="220" stroke="#f59e0b" strokeWidth="2" />
                    <line x1="485" y1="260" x2="490" y2="260" stroke="#94a3b8" strokeWidth="2" />
                  </g>

                  {/* Irrigation Inflow Pipe Line */}
                  <path d="M70,220 L120,240 L300,260" stroke="#38bdf8" strokeWidth="3" fill="none" strokeDasharray="8 4" />
                  <circle cx="70" cy="220" r="5" fill="#38bdf8" />
                  <text x="40" y="210" fill="#38bdf8" fontSize="10.5" fontWeight="800">IRRIGATION CAPACITY: {irrigationMm} MM</text>
                </svg>
              </div>
            )}

            {mapMode === 'ndvi' && (
              <div className="ndvi-simulation-holder">
                <svg className="ndvi-svg" viewBox="0 0 600 380" preserveAspectRatio="xMidYMid meet">
                  <rect width="600" height="380" fill="#04120a" rx="16" />

                  <g opacity="0.9">
                    <rect x="80" y="50" width="440" height="260" rx="12" fill="#14532d" stroke="#22c55e" strokeWidth="1.5" />
                    <circle cx="220" cy="150" r="80" fill="#16a34a" opacity="0.8" />
                    <circle cx="360" cy="190" r="95" fill="#22c55e" opacity="0.85" />
                    <circle cx="410" cy="130" r="65" fill="#4ade80" opacity="0.9" />
                    <ellipse cx="280" cy="220" rx="90" ry="45" fill="#15803d" opacity="0.75" />
                    <ellipse cx="140" cy="240" rx="50" ry="30" fill="#84cc16" opacity="0.7" />
                  </g>

                  {/* False Color Heatmap Scale Legend */}
                  <g transform="translate(100, 335)">
                    <text x="0" y="14" fill="#94a3b8" fontSize="11" fontWeight="700">NDVI VIGOR:</text>
                    <rect x="90" y="2" width="50" height="15" fill="#ca8a04" rx="3" />
                    <text x="95" y="13" fill="#ffffff" fontSize="9.5" fontWeight="700">0.25 (Low)</text>

                    <rect x="145" y="2" width="60" height="15" fill="#16a34a" rx="3" />
                    <text x="150" y="13" fill="#ffffff" fontSize="9.5" fontWeight="700">0.55 (Med)</text>

                    <rect x="210" y="2" width="65" height="15" fill="#4ade80" rx="3" />
                    <text x="215" y="13" fill="#052e16" fontSize="9.5" fontWeight="800">0.82 (High)</text>

                    <text x="300" y="14" fill="#4ade80" fontSize="11.5" fontWeight="800">
                      Mean Field Canopy Index: 0.68 (Robust Biomass)
                    </text>
                  </g>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Right Soil Horizon Deck */}
        <div className="parcel-soil-deck">
          {/* Card 1: Soil Horizon Stratigraphy */}
          <div className="param-card-3d soil-stratigraphy-card">
            <div className="card-top-row">
              <div className="card-title-wrap">
                <span className="card-title-icon">🧪 Soil Horizon Core</span>
                <span className="card-subtitle-note">Geological Horizons & Texture Stratigraphy</span>
              </div>
              <span className="soil-tag-pill" style={{ background: soilInfo.bgBadge, color: soilInfo.textBadge, borderColor: soilInfo.colorHex }}>
                {soilInfo.label}
              </span>
            </div>

            {/* Geological Core Strata Breakdown */}
            <div className="soil-strata-container">
              {/* Left Depth Column Indicator */}
              <div className="soil-depth-column" title="Soil Horizon Depth Profile">
                <div className="strata-block strata-a" style={{ background: `linear-gradient(180deg, #166534 0%, ${soilInfo.colorHex} 100%)` }}>
                  <span className="strata-id">A</span>
                </div>
                <div className="strata-block strata-b">
                  <span className="strata-id">B</span>
                </div>
                <div className="strata-block strata-c">
                  <span className="strata-id">C</span>
                </div>
              </div>

              {/* Right Horizon Descriptions */}
              <div className="soil-horizons-list">
                {/* A Horizon */}
                <div className="horizon-row-card horizon-a-card">
                  <div className="horizon-row-head">
                    <strong className="h-name">A-Horizon (Topsoil 0–15 cm)</strong>
                    <span className="depth-badge">0–15 cm</span>
                  </div>
                  <div className="horizon-row-metrics">
                    <span className="h-metric-chip highlight">Organic Matter: {organicMatter}%</span>
                    <span className="h-metric-chip">High Biota</span>
                  </div>
                </div>

                {/* B Horizon */}
                <div className="horizon-row-card horizon-b-card">
                  <div className="horizon-row-head">
                    <strong className="h-name">B-Horizon (Subsoil 15–40 cm)</strong>
                    <span className="depth-badge">15–40 cm</span>
                  </div>
                  <div className="horizon-row-metrics">
                    <span className="h-metric-chip">Illuvial Clay Enrichment</span>
                    <span className="h-metric-chip highlight">FC: {soilInfo.fc}</span>
                  </div>
                </div>

                {/* C Horizon */}
                <div className="horizon-row-card horizon-c-card">
                  <div className="horizon-row-head">
                    <strong className="h-name">C-Horizon (Substratum)</strong>
                    <span className="depth-badge">40+ cm</span>
                  </div>
                  <div className="horizon-row-metrics">
                    <span className="h-metric-chip">Weathered Bedrock</span>
                    <span className="h-metric-chip">Drainage Floor</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Particle Texture Fractions Breakdown */}
            <div className="soil-fractions-wrapper">
              <div className="fractions-label-row">
                <span className="fractions-title">Soil Texture Fractions</span>
                <span className="fractions-total">USDA Particle Size Distribution</span>
              </div>

              <div className="soil-fractions-bar-v2">
                <div
                  className="fraction-seg-v2 sand"
                  style={{ width: `${soilInfo.sand}%` }}
                  title={`Sand: ${soilInfo.sand}%`}
                >
                  <span>Sand {soilInfo.sand}%</span>
                </div>
                <div
                  className="fraction-seg-v2 silt"
                  style={{ width: `${soilInfo.silt}%` }}
                  title={`Silt: ${soilInfo.silt}%`}
                >
                  <span>Silt {soilInfo.silt}%</span>
                </div>
                <div
                  className="fraction-seg-v2 clay"
                  style={{ width: `${soilInfo.clay}%` }}
                  title={`Clay: ${soilInfo.clay}%`}
                >
                  <span>Clay {soilInfo.clay}%</span>
                </div>
              </div>

              <div className="fractions-legend-grid">
                <div className="fraction-legend-box sand">
                  <span className="dot" />
                  <span className="name">Sand</span>
                  <strong className="pct">{soilInfo.sand}%</strong>
                </div>
                <div className="fraction-legend-box silt">
                  <span className="dot" />
                  <span className="name">Silt</span>
                  <strong className="pct">{soilInfo.silt}%</strong>
                </div>
                <div className="fraction-legend-box clay">
                  <span className="dot" />
                  <span className="name">Clay</span>
                  <strong className="pct">{soilInfo.clay}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Key Physical Soil Metrics */}
          <div className="param-card-3d">
            <div className="card-top-row">
              <span className="card-title-icon">💧 Physical Moisture Parameters</span>
              <span className="status-live-chip">Live Profile</span>
            </div>
            <div className="param-metrics-grid">
              <div className="p-metric-box">
                <span className="lbl">Field Capacity (FC)</span>
                <strong className="val text-green">{soilInfo.fc}</strong>
              </div>
              <div className="p-metric-box">
                <span className="lbl">Wilting Point (PWP)</span>
                <strong className="val text-amber">{soilInfo.pwp}</strong>
              </div>
              <div className="p-metric-box">
                <span className="lbl">Drought Resiliency</span>
                <strong className="val text-green">High Buffer</strong>
              </div>
              <div className="p-metric-box">
                <span className="lbl">Water Table Depth</span>
                <strong className="val">3.2 <small>m (Rabi)</small></strong>
              </div>
            </div>
          </div>

          {/* Card 3: Crop Rotation History */}
          <div className="param-card-3d">
            <div className="card-top-row">
              <span className="card-title-icon">🌾 Agronomic Rotation History</span>
              <span className="crop-history-badge">{cropYear} • {crop}</span>
            </div>
            <div className="crop-history-body">
              <div className="crop-sequence-pill-strip">
                <div className="seq-step prev">
                  <span className="seq-yr">{cropYear - 1}</span>
                  <strong>Lentil (BNF)</strong>
                </div>
                <span className="seq-arrow">→</span>
                <div className="seq-step current">
                  <span className="seq-yr">{cropYear}</span>
                  <strong>{crop}</strong>
                </div>
                <span className="seq-arrow">→</span>
                <div className="seq-step next">
                  <span className="seq-yr">{cropYear + 1}</span>
                  <strong>Mungbean (Proposed)</strong>
                </div>
              </div>
              <p className="crop-rotation-note">
                Prior rotation included nitrogen-fixing pulses contributing ~35 kg N/ha residual fertility.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Complete "My Fields" Section - High-Fidelity Centralized Database Registry */}
      <section className="profile-card-section" style={{ marginTop: 28 }}>
        <div className="my-fields-header">
          <div className="my-fields-title">
            <h3>My Fields</h3>
            <span className="field-count-pill">
              {!user ? 'Sign in required' : !fieldsLoaded ? 'Loading...' : fieldsError ? 'Unavailable' : `${userFields.length} ${userFields.length === 1 ? 'Field' : 'Fields'}`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="db-search-wrap">
              <input
                type="text"
                placeholder="Search parcels or soil…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="parcel-search-input"
                style={{ width: 220 }}
              />
            </div>

            <button
              type="button"
              className="btn-add-field"
              onClick={() => onAddField && onAddField({ latitude: lat, longitude: lon })}
              title="Register a new agricultural field in PostgreSQL"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              + Add New Field
            </button>
          </div>
        </div>

        {!user ? (
          <p className="field-load-notice">Sign in to load registered fields from PostgreSQL.</p>
        ) : !fieldsLoaded ? (
          <p className="field-load-notice">Loading registered fields from PostgreSQL...</p>
        ) : fieldsError ? (
          <p className="field-load-notice" role="alert">Could not load registered fields: {fieldsError}</p>
        ) : filteredFields.length > 0 ? (
          <div className="fields-cards-grid">
            {filteredFields.map(fld => {
              const isActive = activeField && String(activeField.id) === String(fld.id);
              const latestCrop = fld.previous_crop || fld.current_crop || (fld.history && fld.history[0]?.crop) || 'Not recorded';
              const latestCropYear = fld.previous_crop_year || (fld.history && fld.history[0]?.year) || 'year unavailable';

              return (
                <div key={fld.id} className="field-card-item">
                  {/* 1. Google Maps Location Preview at Top of Card */}
                  <GoogleFieldMapThumbnail
                    latitude={fld.latitude}
                    longitude={fld.longitude}
                    name={fld.name}
                    height="180px"
                    onClick={() => {
                      if (onViewField) onViewField(fld);
                      else if (onSelectField) onSelectField(fld, false);
                    }}
                  />

                  <div className="field-card-content">
                    {/* Level 1 & 2: Field Name, Status & ID */}
                    <div className="field-card-header">
                      <div className="field-card-title-wrap">
                        <h4>{fld.name}</h4>
                        <span className="field-id-badge">Field ID #{fld.id}</span>
                      </div>
                      <span className={`completeness-badge ${isActive ? 'active-highlight' : ''}`}>
                        {isActive ? 'Active Field' : 'Registered'}
                      </span>
                    </div>

                    {/* Level 3: Location / Farm Station */}
                    <div className="field-location-row">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="field-coords-text">
                        {formatNumber(fld.latitude, 4, null) != null && formatNumber(fld.longitude, 4, null) != null
                          ? `${formatNumber(fld.latitude, 4)}, ${formatNumber(fld.longitude, 4)}`
                          : 'Coordinates not provided'}
                      </span>
                      <span className="field-farm-text">
                        {userFarms.find(farm => farm.id === fld.farm_id)?.name || `My farm`}
                      </span>
                    </div>

                    {/* Level 4: Important Properties - 2 Highlight Blocks */}
                    <div className="field-props-highlight-grid">
                      <div className="prop-highlight-card">
                        <div className="prop-highlight-val">
                          {formatNumber(fld.area_ha, 1, null) != null ? `${formatNumber(fld.area_ha, 1)} ha` : 'Not provided'}
                        </div>
                        <div className="prop-highlight-lbl">Field Size</div>
                      </div>
                      <div className="prop-highlight-card">
                        <div className="prop-highlight-val" style={{ textTransform: 'capitalize' }}>
                          {fld.soil_texture ? fld.soil_texture.replaceAll('_', ' ') : 'Not provided'}
                        </div>
                        <div className="prop-highlight-lbl">Soil Texture</div>
                      </div>
                    </div>

                    {/* Level 5: Detailed Parameters & Metadata */}
                    <div className="field-props-list">
                      <div className="prop-row">
                        <span className="prop-row-key">Soil pH</span>
                        <span className="prop-row-val">
                          {fld.soil_ph != null ? formatNumber(fld.soil_ph, 1) : 'Not provided'}
                        </span>
                      </div>
                      <div className="prop-row">
                        <span className="prop-row-key">Organic Matter</span>
                        <span className="prop-row-val">
                          {formatNumber(fld.organic_matter, 1, null) != null ? `${formatNumber(fld.organic_matter, 1)} %` : 'Not provided'}
                        </span>
                      </div>
                      <div className="prop-row">
                        <span className="prop-row-key">Irrigation Capacity</span>
                        <span className="prop-row-val">
                          {fld.irrigation_capacity_mm != null ? `${Math.round(Number(fld.irrigation_capacity_mm))} mm` : 'Not provided'}
                        </span>
                      </div>
                      <div className="prop-row">
                        <span className="prop-row-key">Previous Crop</span>
                        <span className="prop-row-val">
                          <span className="crop-chip">{latestCrop} ({latestCropYear})</span>
                        </span>
                      </div>
                      <div className="prop-row prop-meta-row">
                        <span className="prop-row-key">Registered</span>
                        <span className="prop-row-val">{formatDate(fld.created_at)}</span>
                      </div>
                      <div className="prop-row prop-meta-row">
                        <span className="prop-row-key">Last Analysis</span>
                        <span className="prop-row-val" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                          {fld.last_analysis_date ? formatDate(fld.last_analysis_date) : 'Ready'}
                        </span>
                      </div>
                    </div>

                    {/* Level 6: Actions */}
                    <div className="field-card-actions">
                      {isActive ? (
                        <button
                          type="button"
                          className="btn-active-field-badge"
                          disabled
                          title="This field is currently selected and active"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Active Field
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-select-analysis"
                          onClick={() => {
                            if (onSelectForAnalysis) onSelectForAnalysis(fld);
                            else if (onSelectField) onSelectField(fld, false);
                          }}
                          title="Set this field as active and sync coordinates for analysis"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          Select for Analysis
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-field-action"
                        onClick={() => onViewField && onViewField(fld)}
                        title="View full field details and crop history"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        className="btn-field-action"
                        onClick={() => onEditField && onEditField(fld)}
                        title="Edit field parameters"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="btn-field-archive"
                        onClick={() => onArchiveField && onArchiveField(fld)}
                        title="Archive / Remove this field"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px dashed var(--border-light)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <h4 style={{ margin: '0 0 6px', fontSize: 16 }}>No registered farm parcels found</h4>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
              {searchQuery ? `No fields matched "${searchQuery}".` : 'Add your first agricultural parcel to configure soil properties and optimize crop rotations.'}
            </p>
            <button
              type="button"
              className="btn-add-field"
              style={{ margin: '0 auto' }}
              onClick={() => onAddField && onAddField({ latitude: lat, longitude: lon })}
            >
              + Add Your First Field
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
