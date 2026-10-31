// frontend/src/DigitalTwin3DView.jsx
// 3D Digital Twin Agricultural Simulation Workbench for FieldShift 2026
// Sub-navigation: Live Farm View, Crop Growth Simulation, Soil & Water Visualization,
// Climate Stress Visualization, Scenario A/B Comparison.
// Full WebGL OrbitControls, procedural textures, instanced paddy tillers, and 2D accessible fallback.

import React, { useState } from 'react';
import { RealFarmCanvas3D } from './RealFarmCanvas3D.jsx';
import { CropGrowth3D } from './research3d/CropGrowth3D.jsx';
import { ClimateStress3D } from './research3d/ClimateStress3D.jsx';
import { WaterBalance3D } from './research3d/WaterBalance3D.jsx';
import { SoilProfile3D } from './research3d/SoilProfile3D.jsx';
import { ScenarioComparison3D } from './research3d/ScenarioComparison3D.jsx';
import { formatNumber } from './marketUtils.js';
import { useTranslation } from './i18n.js';

export function DigitalTwin3DView({
  activeField,
  plan,
  summary,
  nasa,
  lang = 'bn',
  onNavigate,
  initialSubTab = 'farm',
}) {
  const { t } = useTranslation(lang);
  const [subTab, setSubTab] = useState(initialSubTab); // 'farm' | 'growth' | 'hydrology' | 'climate' | 'compare'
  const [viewMode, setViewMode] = useState('3d'); // '3d' | '2d'
  const [activeOverlay, setActiveOverlay] = useState('crop'); // 'moisture' | 'crop' | 'irrigation'

  const areaHa = activeField?.area_ha != null ? Number(activeField.area_ha) : 10.0;
  const soilTexture = activeField?.soil_texture || 'loam';

  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);

  const seasonsList = [
    { id: 0, code: 'S1', nameBn: '১. রবি ২০২৬-২৭', nameEn: 'S1: Rabi 2026-27 (Nov-Apr)', isKharif: false, crop: 'wheat', cropBn: 'গম (Wheat)', waterMm: 350, moisture: 62 },
    { id: 1, code: 'S2', nameBn: '২. খরিফ-২ ২০২৭', nameEn: 'S2: Kharif-2 2027 (Jul-Oct)', isKharif: true, crop: 'rice', cropBn: 'আমন ধান (Aman Rice)', waterMm: 0, moisture: 82, onsetMarker: '১৫-২৫ জুন (অনাবৃষ্টির ঝুঁকি ১৬.৭%)' },
    { id: 2, code: 'S3', nameBn: '৩. রবি ২০২৭-২৮', nameEn: 'S3: Rabi 2027-28 (Nov-Apr)', isKharif: false, crop: 'mustard', cropBn: 'সরিষা (Mustard)', waterMm: 120, moisture: 58 },
    { id: 3, code: 'S4', nameBn: '৪. খরিফ-২ ২০২৮', nameEn: 'S4: Kharif-2 2028 (Jul-Oct)', isKharif: true, crop: 'rice', cropBn: 'আমন ধান (Aman Rice)', waterMm: 0, moisture: 80, onsetMarker: '১৮-২৮ জুন (অনাবৃষ্টির ঝুঁকি ১৬.৭%)' },
    { id: 4, code: 'S5', nameBn: '৫. রবি ২০২৮-২৯', nameEn: 'S5: Rabi 2028-29 (Nov-Apr)', isKharif: false, crop: 'lentil', cropBn: 'মসুর ডাল (Lentil)', waterMm: 95, moisture: 60 },
    { id: 5, code: 'S6', nameBn: '৬. খরিফ-২ ২০২৯', nameEn: 'S6: Kharif-2 2029 (Jul-Oct)', isKharif: true, crop: 'rice', cropBn: 'আমন ধান (Aman Rice)', waterMm: 0, moisture: 84, onsetMarker: '১৬-২৬ জুন (অনাবৃষ্টির ঝুঁকি ১৬.৭%)' },
  ];

  const currentSeason = seasonsList[selectedSeasonIdx] || seasonsList[0];

  const subTabs = [
    { id: 'farm', labelBn: 'খামার প্ল্যান ভিউয়ার (Plan Viewer 3D)', labelEn: '1. Plan Viewer 3D', icon: '🌾' },
    { id: 'growth', labelBn: 'ফসলের বৃদ্ধি ও ফেনোলজি (Crop Growth)', labelEn: '2. Crop Growth Simulation', icon: '🌱' },
    { id: 'climate', labelBn: 'জলবায়ু চাপ দৃশ্যকল্প (Climate Stress)', labelEn: '3. Climate Stress Visualization', icon: '☀️' },
    { id: 'compare', labelBn: 'দৃশ্যকল্প এ/বি তুলনা (Scenario A/B)', labelEn: '4. Scenario Comparison', icon: '⚖️' },
  ];

  return (
    <div className="digital-twin-workspace" style={{ padding: '20px 0 40px 0', maxWidth: 1300, margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div
        className="dash-card ui-card-hud"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 26 }}>🛰️🌾</span>
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
                {activeField?.name || 'Bogura Demo Field'} ({formatNumber(areaHa, 1)} ha)
              </span>
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>
              {lang === 'bn' ? 'ত্রিমাত্রিক ডিজিটাল টুইন ও কৃষি সিমুলেশন' : '3D Agricultural Digital Twin Simulator'}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 840 }}>
              {lang === 'bn'
                ? 'বাস্তবসম্মত থ্রি.জেএস (Three.js) দৃশ্যকল্পে ধানের বৃদ্ধি, সেচ খালের পানি প্রবাহ, মাটির আর্দ্রতা প্রোফাইল এবং জলবায়ু চাপের ত্রিমাত্রিক মডেল।'
                : 'Interactive Three.js physics-based digital twin visualizing rice tiller phenology, canal hydrology, soil moisture stratifications, and climate stress scenarios.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}
              style={{
                background: viewMode === '3d' ? 'var(--hud-teal)' : 'var(--line)',
                color: viewMode === '3d' ? 'var(--bg-deep)' : 'var(--text)',
                border: '1px solid rgba(0, 223, 129, 0.4)',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {viewMode === '3d' ? '🌐 3D View' : '📋 2D Accessible Mode'}
            </button>
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
                background: subTab === tab.id ? 'rgba(0, 223, 129, 0.2)' : 'var(--glass-strong)',
                border: subTab === tab.id ? '1px solid var(--hud-teal)' : '1px solid var(--line)',
                color: subTab === tab.id ? 'var(--hud-teal)' : 'var(--text-2)',
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

      {/* SUB-TAB 1: PLAN VIEWER 3D WITH 6-SEASON SLIDER */}
      {subTab === 'farm' && (
        <div className="dash-card ui-card-hud" style={{ background: 'var(--glass-strong)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                {lang === 'bn' ? '৬-মৌসুম ফসল পরিকল্পনা ভিউয়ার (MILP Plan Viewer 3D)' : '6-Season MILP Plan Viewer 3D'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-2)' }}>
                {lang === 'bn'
                  ? 'নিচের স্লাইডার টেনে প্রতিটি মৌসুমের পরিকল্পিত ফসল, সেচ চাহিদা ও বর্ষা অনসেট মার্কার ত্রিমাত্রিক বেডে দেখুন।'
                  : 'Drag the season slider below to visualize planned crops, water needs, and monsoon onset risk markers across all 6 periods.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'crop', labelBn: 'ফসল ওভারলে', labelEn: 'Crop Overlay', live: true },
                { id: 'moisture', labelBn: 'আর্দ্রতা ওভারলে', labelEn: 'Moisture Overlay', live: false },
                { id: 'irrigation', labelBn: 'সেচ ওভারলে', labelEn: 'Irrigation Overlay', live: false },
              ].map(ov => {
                const isSelected = activeOverlay === ov.id;
                return (
                  <button
                    key={ov.id}
                    type="button"
                    disabled={!ov.live}
                    onClick={() => ov.live && setActiveOverlay(ov.id)}
                    title={ov.live ? (lang === 'bn' ? ov.labelBn : ov.labelEn) : (lang === 'bn' ? 'উপাত্ত নেই' : 'No live telemetry')}
                    style={{
                      background: isSelected ? 'rgba(0, 223, 129, 0.2)' : 'var(--glass)',
                      color: isSelected ? 'var(--hud-teal)' : 'var(--text-3)',
                      border: isSelected ? '1px solid var(--hud-teal)' : '1px solid var(--line)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: ov.live ? 'pointer' : 'not-allowed',
                      opacity: ov.live ? 1 : 0.45,
                    }}
                  >
                    {lang === 'bn' ? ov.labelBn : ov.labelEn} {!ov.live ? (lang === 'bn' ? '(উপাত্ত নেই)' : '(No data)') : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6-Period Season Slider Bar & Selector HUD */}
          <div style={{
            background: 'var(--glass)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--hud-cyan)' }}>
                  ⏳ {lang === 'bn' ? 'মৌসুম নির্বাচন (Season Timeline):' : 'Season Period Timeline:'}
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(0, 223, 129, 0.15)',
                  color: 'var(--hud-teal)',
                  border: '1px solid rgba(0, 223, 129, 0.3)'
                }}>
                  {lang === 'bn' ? currentSeason.nameBn : currentSeason.nameEn}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-2)' }}>
                <span>🌾 <strong>{lang === 'bn' ? 'পরিকল্পিত ফসল:' : 'Crop:'}</strong> {lang === 'bn' ? currentSeason.cropBn : currentSeason.crop.toUpperCase()}</span>
                <span>💧 <strong>{lang === 'bn' ? 'সেচ চাহিদা:' : 'Irrigation:'}</strong> {currentSeason.waterMm > 0 ? `${currentSeason.waterMm} mm` : (lang === 'bn' ? 'বৃষ্টি-নির্ভর (০ মিমি)' : 'Rainfed (0 mm)')}</span>
                {currentSeason.onsetMarker && (
                  <span style={{ color: 'var(--hud-amber, #f59e0b)', fontWeight: 600 }}>
                    🌧️ {lang === 'bn' ? 'অনসেট মার্কার:' : 'Onset:'} {currentSeason.onsetMarker}
                  </span>
                )}
              </div>
            </div>

            {/* Slider Input */}
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

            {/* Step Button Indicators */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {seasonsList.map(s => {
                const isCur = s.id === selectedSeasonIdx;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSeasonIdx(s.id)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: 8,
                      border: isCur ? '1px solid var(--hud-teal)' : '1px solid var(--line)',
                      background: isCur ? 'rgba(0, 223, 129, 0.2)' : 'var(--glass)',
                      color: isCur ? 'var(--hud-teal)' : 'var(--text-3)',
                      fontSize: 11,
                      fontWeight: isCur ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div><strong>{s.code}</strong></div>
                    <div style={{ fontSize: 10, opacity: 0.85 }}>{s.crop}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: 480, width: '100%', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-deep)', position: 'relative' }}>
            <RealFarmCanvas3D
              fieldProfile={{
                name: activeField?.name || 'Bogura Demo Farm',
                crop: currentSeason.crop,
                soil_texture: soilTexture,
                soil_ph: activeField?.soil_ph || 6.5,
                area_ha: areaHa,
                moisture_pct: currentSeason.moisture,
                water_level_cm: currentSeason.isKharif ? 5.0 : 0.0,
              }}
              viewMode={viewMode}
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
            FAO-33 phenology stages: Emergence (চারা গজানো), Tillering (কুশি বৃদ্ধি), Panicle Initiation (শীষ গঠন), Heading (ফুল ফোটা), Maturity (দানা পুষ্ট হওয়া).
          </p>
          <CropGrowth3D
            crop="rice"
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
            tempMaxC={38.5}
            tempAnomalyC={+3.2}
            heatWaveDays={6}
            rainfallDeficitPct={-45}
            waterStressIndex={0.72}
            lang={lang}
          />
        </div>
      )}

      {/* SUB-TAB 5: SCENARIO A/B COMPARISON */}
      {subTab === 'compare' && (
        <div className="dash-card ui-card-hud" style={{ background: 'var(--glass-strong)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            {lang === 'bn' ? 'দ্বৈত দৃশ্যকল্প এ/বি ত্রিমাত্রিক তুলনা' : 'Scenario A/B Dual 3D Comparison'}
          </h3>
          <ScenarioComparison3D
            scenarioA={{
              name: 'Scenario A: Baseline Traditional Rotation',
              crop: 'Rice (Aman)',
              yield_kg_ha: 4200,
              water_mm: 1200,
              profit_bdt: 95000,
            }}
            scenarioB={{
              name: 'Scenario B: Climate Resilient + AWD Water Saving',
              crop: 'BRRI dhan75 + AWD',
              yield_kg_ha: 4600,
              water_mm: 880,
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

