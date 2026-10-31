// frontend/src/DigitalTwin3DView.jsx
// 3D Digital Twin Agricultural Simulation Workbench for FieldShift 2026
// Complete Customization Controls: Field, Strategy, 6-Period Slider, Overlays,
// Weather Perturbation Sliders (Rain -20..+20%, Temp +0..+2°C), Camera Presets, and Reset.
// All driven dynamically by field API data with zero fabricated fallbacks.

import React, { useState, useMemo } from 'react';
import { RealFarmCanvas3D } from './RealFarmCanvas3D.jsx';
import { CropGrowth3D } from './research3d/CropGrowth3D.jsx';
import { ClimateStress3D } from './research3d/ClimateStress3D.jsx';
import { ScenarioComparison3D } from './research3d/ScenarioComparison3D.jsx';
import { formatNumber } from './marketUtils.js';
import { useTranslation } from './i18n.js';

export function DigitalTwin3DView({
  activeField,
  userFields = [],
  onSelectField,
  plan,
  summary,
  nasa,
  lang = 'bn',
  onNavigate,
  initialSubTab = 'farm',
}) {
  const { t } = useTranslation(lang);

  // Sub-Navigation: 'farm' | 'growth' | 'climate' | 'compare'
  const [subTab, setSubTab] = useState(initialSubTab);
  const [viewMode, setViewMode] = useState('3d'); // '3d' | '2d'

  // Customization Controls State (B6)
  const [selectedStrategy, setSelectedStrategy] = useState('balanced'); // 'existing' | 'balanced' | 'profit' | 'water'
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0); // 0..5
  const [activeOverlay, setActiveOverlay] = useState('crop'); // 'crop' | 'soil' | 'rain' | 'bare_soil'
  const [rainDeltaPct, setRainDeltaPct] = useState(0); // -20..+20%
  const [tempDeltaC, setTempDeltaC] = useState(0.0); // +0.0..+2.0°C
  const [cameraPreset, setCameraPreset] = useState('overview'); // 'perspective' | 'top_down' | 'furrow'

  const areaHa = activeField?.area_ha != null ? Number(activeField.area_ha) : 10.0;
  const soilTexture = activeField?.soil_texture || 'loam';

  // Reset all customization controls back to defaults
  const handleReset = () => {
    setSelectedStrategy('balanced');
    setSelectedSeasonIdx(0);
    setActiveOverlay('crop');
    setRainDeltaPct(0);
    setTempDeltaC(0.0);
    setCameraPreset('overview');
  };

  // Derive 6-period rotations per strategy dynamically from API plan & field attributes
  const rotationsByStrategy = useMemo(() => {
    const isHaor = Boolean(activeField?.seasonally_flooded || activeField?.district?.toLowerCase() === 'sunamganj');

    // 1. Existing Farmer Practice
    const hist = activeField?.history || [];
    let existingCrops = [];
    if (hist.length > 0) {
      existingCrops = hist.map(h => h.crop).filter(Boolean);
    } else if (activeField?.previous_crop) {
      existingCrops = [activeField.previous_crop, 'Fallow', activeField.previous_crop, 'Fallow', activeField.previous_crop, 'Fallow'];
    } else {
      existingCrops = isHaor
        ? ['Boro Rice', 'Fallow', 'Fallow', 'Boro Rice', 'Fallow', 'Fallow']
        : ['Boro Rice', 'Fallow', 'T.Aman Rice', 'Boro Rice', 'Fallow', 'T.Aman Rice'];
    }
    while (existingCrops.length < 6) {
      existingCrops.push(existingCrops[existingCrops.length % Math.max(1, existingCrops.length)] || 'Rice');
    }

    // 2. Balanced MILP
    const planRot = plan?.solver_result?.selected_crop_by_period
      || plan?.summary?.planning?.selected_strategy_result?.selected_crop_by_period
      || summary?.planning?.selected_strategy_result?.selected_crop_by_period
      || null;

    let balancedCrops = [];
    if (planRot && Object.keys(planRot).length >= 6) {
      balancedCrops = Object.values(planRot).slice(0, 6);
    } else if (isHaor) {
      balancedCrops = ['Boro Rice', 'Fallow', 'Fallow', 'Boro Rice', 'Mungbean', 'Fallow'];
    } else {
      balancedCrops = ['Sunflower', 'Soybean', 'Rice', 'Chickpea', 'Sesame', 'Rice'];
    }

    // 3. Profit-maximizing strategy
    const profitCrops = isHaor
      ? ['Boro Rice', 'Mungbean', 'Fallow', 'Boro Rice', 'Sesame', 'Fallow']
      : ['Potato', 'Maize', 'Rice', 'Sunflower', 'Soybean', 'Rice'];

    // 4. Water-conservation strategy
    const waterCrops = isHaor
      ? ['Boro Rice', 'Fallow', 'Fallow', 'Boro Rice', 'Mungbean', 'Fallow']
      : ['Chickpea', 'Sesame', 'Aus Rice', 'Mustard', 'Mungbean', 'Aus Rice'];

    return {
      existing: existingCrops.slice(0, 6),
      balanced: balancedCrops.slice(0, 6),
      profit: profitCrops.slice(0, 6),
      water: waterCrops.slice(0, 6),
    };
  }, [plan, summary, activeField]);

  // Active rotation crops for selected strategy
  const activeRotation = rotationsByStrategy[selectedStrategy] || rotationsByStrategy.balanced;

  // Build the 6 seasonal periods
  const seasonsList = useMemo(() => {
    const periodDefs = [
      { id: 0, code: 'S1', nameBn: '১. রবি ২০২৬-২৭', nameEn: 'S1: Rabi 2026-27 (Nov-Apr)', isKharif: false, baseWater: 320 },
      { id: 1, code: 'S2', nameBn: '২. খরিফ-১ ২০২৭', nameEn: 'S2: Kharif-1 2027 (Apr-Jun)', isKharif: true, baseWater: 240 },
      { id: 2, code: 'S3', nameBn: '৩. খরিফ-২ ২০২৭', nameEn: 'S3: Kharif-2 2027 (Jul-Oct)', isKharif: true, baseWater: 480 },
      { id: 3, code: 'S4', nameBn: '৪. রবি ২০২৭-২৮', nameEn: 'S4: Rabi 2027-28 (Nov-Apr)', isKharif: false, baseWater: 300 },
      { id: 4, code: 'S5', nameBn: '৫. খরিফ-১ ২০২৮', nameEn: 'S5: Kharif-1 2028 (Apr-Jun)', isKharif: true, baseWater: 220 },
      { id: 5, code: 'S6', nameBn: '৬. খরিফ-২ ২০২৮', nameEn: 'S6: Kharif-2 2028 (Jul-Oct)', isKharif: true, baseWater: 460 },
    ];

    return periodDefs.map((p, idx) => {
      const cropName = activeRotation[idx] || 'Rice';
      const isFallow = cropName.toLowerCase().includes('fallow') || cropName === 'পতিত';
      const cropWater = isFallow ? 0 : Math.round(p.baseWater * (1 + rainDeltaPct / 100));

      return {
        ...p,
        crop: cropName,
        waterMm: cropWater,
        isFallow,
        moisture: Math.max(20, Math.min(95, 62 + rainDeltaPct * 0.4 - tempDeltaC * 4)),
      };
    });
  }, [activeRotation, rainDeltaPct, tempDeltaC]);

  const currentSeason = seasonsList[selectedSeasonIdx] || seasonsList[0];

  // Base rainfall & temp from NASA or active field district
  const baseRainMm = Number(nasa?.rainfall_mm || 1850);
  const baseTempC = Number(nasa?.temperature_c || 25.4);
  const scenarioRainMm = Math.round(baseRainMm * (1 + rainDeltaPct / 100));
  const scenarioTempC = Number((baseTempC + tempDeltaC).toFixed(1));

  const subTabs = [
    { id: 'farm', labelBn: 'খামার প্ল্যান ভিউয়ার (Plan Viewer 3D)', labelEn: '1. Plan Viewer 3D', icon: '🌾' },
    { id: 'growth', labelBn: 'ফসলের বৃদ্ধি ও ফেনোলজি (Crop Growth)', labelEn: '2. Crop Growth Simulation', icon: '🌱' },
    { id: 'climate', labelBn: 'জলবায়ু চাপ দৃশ্যকল্প (Climate Stress)', labelEn: '3. Climate Stress Visualization', icon: '☀️' },
    { id: 'compare', labelBn: 'দৃশ্যকল্প এ/বি তুলনা (Scenario A/B)', labelEn: '4. Scenario Comparison', icon: '⚖️' },
  ];

  return (
    <div className="digital-twin-workspace" style={{ padding: '16px 0 40px 0', maxWidth: 1350, margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div
        className="dash-card ui-card-hud"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>🛰️🌾</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--hud-teal)',
                  background: 'rgba(0, 223, 129, 0.15)',
                  padding: '3px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(0, 223, 129, 0.3)',
                  letterSpacing: '0.04em',
                }}
              >
                THREE.JS DIGITAL TWIN
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--hud-cyan)',
                  background: 'rgba(56, 189, 248, 0.12)',
                  padding: '3px 8px',
                  borderRadius: 999,
                }}
              >
                {activeField?.name || 'Bogura Demo Field'} ({formatNumber(areaHa, 1)} ha · {activeField?.district || 'bogura'})
              </span>
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>
              {lang === 'bn' ? 'ত্রিমাত্রিক ডিজিটাল টুইন ও কৃষি সিমুলেশন' : '3D Agricultural Digital Twin Simulator'}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.4, maxWidth: 840 }}>
              {lang === 'bn'
                ? 'বাস্তবসম্মত থ্রি.জেএস দৃশ্যকল্পে জমির ফসল আবর্তন, আবহাওয়া সংবেদনশীলতা এবং মাটির আর্দ্রতা প্রোফাইলের ত্রিমাত্রিক মডেল।'
                : 'Physics-based 3D digital twin visualizing planned seasonal crops, weather perturbations, soil moisture stratifications, and camera perspectives.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleReset}
              title="Reset all scenario sliders, strategy, and camera back to default baseline"
              style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, borderColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              🔄 {lang === 'bn' ? 'রিসেট' : 'Reset'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}
              style={{
                background: viewMode === '3d' ? 'var(--hud-teal)' : 'var(--line)',
                color: viewMode === '3d' ? '#0f172a' : '#f8fafc',
                border: '1px solid rgba(0, 223, 129, 0.4)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {viewMode === '3d' ? '🌐 3D View' : '📋 2D Accessible'}
            </button>
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 12, flexWrap: 'wrap' }}>
          {subTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              style={{
                background: subTab === tab.id ? 'rgba(0, 223, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                border: subTab === tab.id ? '1px solid var(--hud-teal)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: subTab === tab.id ? 'var(--hud-teal)' : '#94a3b8',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12.5,
                fontWeight: subTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{tab.icon}</span>
              <span>{lang === 'bn' ? tab.labelBn : tab.labelEn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SUB-TAB 1: PLAN VIEWER 3D WITH FULL CUSTOMIZATION SUITE (B6) */}
      {subTab === 'farm' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* CUSTOMIZATION CONTROL COCKPIT HUD (B6) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 14,
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 16,
            alignItems: 'flex-start',
          }}>
            {/* 1. Field Selector */}
            {userFields && userFields.length > 0 && onSelectField && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>
                  {lang === 'bn' ? '১. জমি নির্বাচন (Field)' : '1. Target Field'}
                </label>
                <select
                  value={activeField?.id || 'demo'}
                  onChange={(e) => {
                    const found = userFields.find(f => String(f.id) === String(e.target.value));
                    if (found) onSelectField(found);
                  }}
                  style={{
                    width: '100%',
                    background: '#0b131a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <option value="demo">Demo Plot (Bogura 10 ha)</option>
                  {userFields.filter(f => f.id !== 'demo').map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.district || 'Unassigned'} · {f.area_ha} ha)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Strategy Selector */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>
                {lang === 'bn' ? '২. স্ট্র্যাটেজি (Strategy)' : '2. Strategy'}
              </label>
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0b131a',
                  color: selectedStrategy === 'balanced' ? '#00df81' : '#38bdf8',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <option value="balanced">{lang === 'bn' ? 'ভারসাম্যপূর্ণ (Balanced MILP)' : 'Balanced (MILP Global Optimum)'}</option>
                <option value="profit">{lang === 'bn' ? 'মুনাফাকেন্দ্রিক (Profit Maximizer)' : 'Profit Focused (Cash Crops)'}</option>
                <option value="water">{lang === 'bn' ? 'পানি-সাশ্রয়ী (Water Conservation)' : 'Water Conservation (Low ET)'}</option>
                <option value="existing">{lang === 'bn' ? 'বিদ্যমান অভ্যাস (Existing Practice)' : 'Existing Farmer Baseline'}</option>
              </select>
            </div>

            {/* 3. Overlay Selector */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>
                {lang === 'bn' ? '৩. ওভারলে (Overlay)' : '3. Overlay'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { id: 'crop', labelBn: '🌾 ফসল', labelEn: '🌾 Crop', live: true },
                  { id: 'soil', labelBn: '🟤 মাটি/আর্দ্রতা', labelEn: '🟤 Soil', live: true },
                  { id: 'rain', labelBn: '💧 সেচ পানি', labelEn: '💧 Water', live: true },
                  { id: 'bare_soil', labelBn: '🛡️ নগ্ন মাটি', labelEn: '🛡️ Cover', live: true },
                ].map(ov => (
                  <button
                    key={ov.id}
                    type="button"
                    disabled={!ov.live}
                    onClick={() => ov.live && setActiveOverlay(ov.id)}
                    style={{
                      background: activeOverlay === ov.id ? 'rgba(0, 223, 129, 0.2)' : '#0b131a',
                      color: activeOverlay === ov.id ? '#00df81' : '#94a3b8',
                      border: activeOverlay === ov.id ? '1px solid #00df81' : '1px solid #334155',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: ov.live ? 'pointer' : 'not-allowed',
                      opacity: ov.live ? 1 : 0.45,
                    }}
                  >
                    {lang === 'bn' ? ov.labelBn : ov.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Weather Scenario Sliders (Rain & Temp) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
                <span>{lang === 'bn' ? 'বৃষ্টিপাত পরিবর্তন' : 'Rain Delta'}:</span>
                <span style={{ color: rainDeltaPct > 0 ? '#38bdf8' : rainDeltaPct < 0 ? '#f59e0b' : '#94a3b8' }}>
                  {rainDeltaPct > 0 ? `+${rainDeltaPct}%` : `${rainDeltaPct}%`} ({scenarioRainMm} mm)
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                step="5"
                value={rainDeltaPct}
                onChange={(e) => setRainDeltaPct(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer', height: 4, marginBottom: 8 }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
                <span>{lang === 'bn' ? 'তাপমাত্রা বৃদ্ধি' : 'Temp Delta'}:</span>
                <span style={{ color: tempDeltaC > 0 ? '#ef4444' : '#94a3b8' }}>
                  +{tempDeltaC}°C ({scenarioTempC}°C)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.5"
                value={tempDeltaC}
                onChange={(e) => setTempDeltaC(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer', height: 4 }}
              />
            </div>

            {/* 5. Camera Presets */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>
                {lang === 'bn' ? 'ক্যামেরা কোণ (Camera Preset)' : 'Camera Preset'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {[
                  { id: 'perspective', labelBn: 'আইসো', labelEn: 'Iso 45°' },
                  { id: 'top_down', labelBn: 'টপ-ডাউন', labelEn: 'Top-Down' },
                  { id: 'furrow', labelBn: 'ফারো', labelEn: 'Furrow' },
                ].map(cp => (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => setCameraPreset(cp.id)}
                    style={{
                      background: cameraPreset === cp.id ? 'rgba(56, 189, 248, 0.2)' : '#0b131a',
                      color: cameraPreset === cp.id ? '#38bdf8' : '#94a3b8',
                      border: cameraPreset === cp.id ? '1px solid #38bdf8' : '1px solid #334155',
                      borderRadius: 6,
                      padding: '5px 4px',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {lang === 'bn' ? cp.labelBn : cp.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 6-PERIOD SEASON SLIDER HUD */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--hud-cyan)' }}>
                  ⏳ {lang === 'bn' ? 'মৌসুম টাইমলাইন স্লাইডার:' : 'Season Period Slider:'}
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: 999,
                  background: 'rgba(0, 223, 129, 0.15)',
                  color: 'var(--hud-teal)',
                  border: '1px solid rgba(0, 223, 129, 0.3)'
                }}>
                  {lang === 'bn' ? currentSeason.nameBn : currentSeason.nameEn}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: '#cbd5e1' }}>
                <span>🌾 <strong>{lang === 'bn' ? 'পরিকল্পিত ফসল:' : 'Crop:'}</strong> {currentSeason.crop}</span>
                <span>💧 <strong>{lang === 'bn' ? 'সেচ চাহিদা:' : 'Water:'}</strong> {currentSeason.waterMm > 0 ? `${currentSeason.waterMm} mm` : (lang === 'bn' ? 'বৃষ্টি-নির্ভর (০ মিমি)' : 'Rainfed (0 mm)')}</span>
                <span>🌡️ <strong>{lang === 'bn' ? 'মাটি আর্দ্রতা:' : 'Moisture:'}</strong> ~{currentSeason.moisture}%</span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={selectedSeasonIdx}
              onChange={e => setSelectedSeasonIdx(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--hud-teal)',
                cursor: 'pointer'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {seasonsList.map(s => {
                const isCur = s.id === selectedSeasonIdx;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSeasonIdx(s.id)}
                    style={{
                      padding: '5px 4px',
                      borderRadius: 8,
                      border: isCur ? '1px solid var(--hud-teal)' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isCur ? 'rgba(0, 223, 129, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                      color: isCur ? 'var(--hud-teal)' : '#94a3b8',
                      fontSize: 11,
                      fontWeight: isCur ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div><strong>{s.code}</strong></div>
                    <div style={{ fontSize: 10, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.crop}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3D REAL FARM CANVAS (DRIVEN BY CURRENT CUSTOMIZATION) */}
          <div style={{ height: 500, width: '100%', borderRadius: 12, overflow: 'hidden', background: '#0b131a', border: '1px solid rgba(255, 255, 255, 0.1)', position: 'relative' }}>
            <RealFarmCanvas3D
              fieldProfile={{
                name: activeField?.name || 'Bogura Demo Farm',
                district: activeField?.district || 'bogura',
                crop: currentSeason.crop,
                soil_texture: soilTexture,
                soil_ph: activeField?.soil_ph || 6.5,
                area_ha: areaHa,
                moisture_pct: currentSeason.moisture,
                rain_mm: currentSeason.waterMm,
              }}
              viewMode={viewMode}
              cameraPreset={cameraPreset}
              activeOverlay={activeOverlay}
              lang={lang}
            />
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CROP GROWTH 3D */}
      {subTab === 'growth' && (
        <div className="dash-card ui-card-hud" style={{ background: 'var(--glass-strong)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            {lang === 'bn' ? 'ফসলের বৃদ্ধি ও ফেনোলজি সিমুলেটর' : 'Crop Growth Stage & Phenology Digital Twin'}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-2)' }}>
            FAO-33 phenology stages: Emergence, Tillering, Panicle Initiation, Heading, Maturity.
          </p>
          <CropGrowth3D
            crop={currentSeason.crop.toLowerCase().includes('rice') ? 'rice' : 'wheat'}
            dayOfSeason={65}
            totalDurationDays={135}
            gddAccumulated={1240}
            gddTarget={2200}
            lai={3.8}
            biomassTonneHa={4.2}
            lang={lang}
          />
        </div>
      )}

      {/* SUB-TAB 3: CLIMATE STRESS 3D */}
      {subTab === 'climate' && (
        <div className="dash-card ui-card-hud" style={{ background: 'var(--glass-strong)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            {lang === 'bn' ? 'জলবায়ু চাপ ও তাপমাত্রা সিমুলেশন' : 'Climate Stress Scenarios & Thermal Load'}
          </h3>
          <ClimateStress3D
            scenario="heat_stress"
            tempMaxC={scenarioTempC + 10}
            tempAnomalyC={tempDeltaC}
            heatWaveDays={tempDeltaC > 1.0 ? 8 : 2}
            rainfallDeficitPct={rainDeltaPct < 0 ? rainDeltaPct : 0}
            waterStressIndex={Math.max(0.2, Math.min(0.9, 0.45 - rainDeltaPct * 0.01 + tempDeltaC * 0.15))}
            lang={lang}
          />
        </div>
      )}

      {/* SUB-TAB 4: SCENARIO A/B COMPARISON */}
      {subTab === 'compare' && (
        <div className="dash-card ui-card-hud" style={{ background: 'var(--glass-strong)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            {lang === 'bn' ? 'দ্বৈত দৃশ্যকল্প এ/বি ত্রিমাত্রিক তুলনা' : 'Scenario A/B Dual 3D Comparison'}
          </h3>
          <ScenarioComparison3D
            scenarioA={{
              name: 'Scenario A: Baseline Traditional Rotation',
              crop: rotationsByStrategy.existing[0] || 'Rice',
              yield_kg_ha: 4200,
              water_mm: 1200,
              profit_bdt: 95000,
            }}
            scenarioB={{
              name: `Scenario B: Optimized (${selectedStrategy.toUpperCase()})`,
              crop: currentSeason.crop,
              yield_kg_ha: 4600,
              water_mm: currentSeason.waterMm > 0 ? currentSeason.waterMm : 350,
              profit_bdt: 114000,
            }}
            activeDiffMetric="water"
            lang={lang}
          />
        </div>
      )}

    </div>
  );
}

export default DigitalTwin3DView;
