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
  const [activeOverlay, setActiveOverlay] = useState('moisture'); // 'moisture' | 'crop' | 'irrigation'

  const areaHa = activeField?.area_ha != null ? Number(activeField.area_ha) : 10.0;
  const soilTexture = activeField?.soil_texture || 'loam';

  const subTabs = [
    { id: 'farm', labelBn: 'খামার লাইভ দৃশ্য (Live Farm)', labelEn: '1. Live Farm View', icon: '🌾' },
    { id: 'growth', labelBn: 'ফসলের বৃদ্ধি ও ফেনোলজি (Crop Growth)', labelEn: '2. Crop Growth Simulation', icon: '🌱' },
    { id: 'hydrology', labelBn: 'মাটি ও পানি প্রবাহ (Soil & Water)', labelEn: '3. Soil & Water Hydrology', icon: '💧' },
    { id: 'climate', labelBn: 'জলবায়ু চাপ দৃশ্যকল্প (Climate Stress)', labelEn: '4. Climate Stress Visualization', icon: '☀️' },
    { id: 'compare', labelBn: 'দৃশ্যকল্প এ/বি তুলনা (Scenario A/B)', labelEn: '5. Scenario Comparison', icon: '⚖️' },
  ];

  return (
    <div className="digital-twin-workspace" style={{ padding: '20px 0 40px 0', maxWidth: 1300, margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div
        className="dash-card"
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
                  color: '#00df81',
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
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  padding: '3px 8px',
                  borderRadius: 999,
                }}
              >
                {activeField?.name || 'Bogura Demo Field'} ({formatNumber(areaHa, 1)} ha)
              </span>
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: '#f8fafc' }}>
              {lang === 'bn' ? 'ত্রিমাত্রিক ডিজিটাল টুইন ও কৃষি সিমুলেশন' : '3D Agricultural Digital Twin Simulator'}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: '#94a3b8', lineHeight: 1.5, maxWidth: 840 }}>
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
                background: viewMode === '3d' ? '#00df81' : '#1e293b',
                color: viewMode === '3d' ? '#0e1318' : '#ffffff',
                border: '1px solid rgba(0, 223, 129, 0.4)',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {viewMode === '3d' ? '🌐 WebGL 3D Active' : '📋 2D Accessible Mode'}
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
                background: subTab === tab.id ? 'rgba(0, 223, 129, 0.2)' : '#161d23',
                border: subTab === tab.id ? '1px solid #00df81' : '1px solid #2a3742',
                color: subTab === tab.id ? '#00df81' : '#94a3b8',
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

      {/* SUB-TAB 1: LIVE FARM 3D CANVAS */}
      {subTab === 'farm' && (
        <div className="dash-card" style={{ background: '#161d23', border: '1px solid #222c36', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                {lang === 'bn' ? 'সরাসরি খামার দৃশ্য (Interactive Farm Field Canvas)' : 'Interactive 3D Farm Field Canvas'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                Rotate: Left Click + Drag | Pan: Right Click + Drag | Zoom: Mouse Wheel
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {['moisture', 'crop', 'irrigation'].map(ov => (
                <button
                  key={ov}
                  type="button"
                  onClick={() => setActiveOverlay(ov)}
                  style={{
                    background: activeOverlay === ov ? 'rgba(0, 223, 129, 0.2)' : '#1c242c',
                    color: activeOverlay === ov ? '#00df81' : '#94a3b8',
                    border: activeOverlay === ov ? '1px solid #00df81' : '1px solid #2a3742',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {ov} Overlay
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 480, width: '100%', borderRadius: 10, overflow: 'hidden', background: '#0e1318', position: 'relative' }}>
            <RealFarmCanvas3D
              fieldProfile={{
                name: activeField?.name || 'Bogura Demo Farm',
                crop: 'rice',
                soil_texture: soilTexture,
                soil_ph: activeField?.soil_ph || 6.5,
                area_ha: areaHa,
                moisture_pct: 68,
                water_level_cm: 4.5,
              }}
              viewMode={viewMode}
              activeOverlay={activeOverlay}
              lang={lang}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                background: 'rgba(14, 19, 24, 0.85)',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                color: '#94a3b8',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              * খেতের ত্রিমাত্রিক রেন্ডারিং একটি বিজ্ঞানভিত্তিক সিমুলেশন প্রদর্শন; আবহাওয়া উপাত্ত বাস্তব নাসা পর্যবেক্ষণ।
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CROP GROWTH 3D */}
      {subTab === 'growth' && (
        <div className="dash-card" style={{ background: '#161d23', border: '1px solid #222c36', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
            {lang === 'bn' ? 'ফসলের বৃদ্ধি ও ফেনোলজি সিমুলেটর' : 'Crop Growth Stage & Phenology Digital Twin'}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#94a3b8' }}>
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

      {/* SUB-TAB 3: HYDROLOGY 3D */}
      {subTab === 'hydrology' && (
        <div className="dash-card" style={{ background: '#161d23', border: '1px solid #222c36', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
            {lang === 'bn' ? 'মাটি ও পানির স্তর সিমুলেশন' : 'Soil Horizon & Water Balance Simulator'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#38bdf8' }}>Lysimeter Inflow / Outflow</h4>
              <WaterBalance3D
                rainfallMm={22.0}
                irrigationMm={30.0}
                etaMm={4.2}
                deepPercolationMm={5.0}
                initialStorageMm={80.0}
                currentStorageMm={108.5}
                tawMm={140}
                lang={lang}
              />
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#00df81' }}>Root Zone Stratification</h4>
              <SoilProfile3D
                crop="rice"
                rootDepthCm={75}
                volumetricWaterContentPct={30.2}
                soilTexture={soilTexture}
                lang={lang}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CLIMATE STRESS 3D */}
      {subTab === 'climate' && (
        <div className="dash-card" style={{ background: '#161d23', border: '1px solid #222c36', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
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
        <div className="dash-card" style={{ background: '#161d23', border: '1px solid #222c36', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
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

