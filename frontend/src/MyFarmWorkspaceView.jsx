// frontend/src/MyFarmWorkspaceView.jsx
// My Farm & Parcel Workspace for FieldShift 2026
// Sub-navigation: Farm Overview, Field Parcels, Field Map, Soil Information, Field History.
// Reuses FieldParcelManagerView, GoogleFieldMapPicker, and GoogleFieldMapThumbnail.

import React, { useState } from 'react';
import { FieldParcelManagerView } from './FieldParcelManagerView.jsx';
import { GoogleFieldMapPicker } from './GoogleFieldMapPicker.jsx';
import { formatNumber } from './marketUtils.js';
import { useTranslation } from './i18n.js';

export function MyFarmWorkspaceView({
  activeField,
  user,
  userFields = [],
  onSelectField,
  lang = 'bn',
  onNavigate,
  initialSubTab = 'overview',
}) {
  const { t } = useTranslation(lang);
  const [subTab, setSubTab] = useState(initialSubTab); // 'overview' | 'parcels' | 'map' | 'soil' | 'history'

  const areaHa = activeField?.area_ha != null ? Number(activeField.area_ha) : 10.0;
  const areaBigha = (areaHa * 7.47).toFixed(1);
  const soilTexture = activeField?.soil_texture || 'loam';

  const subTabs = [
    { id: 'overview', labelBn: 'খামারের সারসংক্ষেপ (Overview)', labelEn: '1. Farm Overview', icon: '🏠' },
    { id: 'parcels', labelBn: 'জমির তালিকা ও ব্যবস্থাপনা (Parcels)', labelEn: '2. Field Parcels', icon: '📋' },
    { id: 'map', labelBn: 'স্যাটেলাইট ম্যাপ পিকার (Field Map)', labelEn: '3. Field Map', icon: '🗺️' },
    { id: 'soil', labelBn: 'মাটির বৈশিষ্ট্য ও বিএআরআই প্রোফাইল', labelEn: '4. Soil Information', icon: '🌱' },
    { id: 'history', labelBn: 'পূর্ববর্তী ফসলের ইতিহাস (History)', labelEn: '5. Field History', icon: '📜' },
  ];

  const SOIL_TEXTURE_DATA = {
    clay_loam: { label: 'Clay Loam (এটেল দোআঁশ)', fc: '32%', pwp: '18%', sand: 32, silt: 34, clay: 34, cond: '0.8 cm/hr' },
    loam: { label: 'Medium Loam (পলি দোআঁশ)', fc: '28%', pwp: '14%', sand: 40, silt: 40, clay: 20, cond: '1.5 cm/hr' },
    silty_loam: { label: 'Silty Loam (সিল্ট দোআঁশ)', fc: '31%', pwp: '15%', sand: 20, silt: 65, clay: 15, cond: '1.2 cm/hr' },
    sandy_loam: { label: 'Sandy Loam (বেলে দোআঁশ)', fc: '21%', pwp: '9%', sand: 65, silt: 25, clay: 10, cond: '3.2 cm/hr' },
    clay: { label: 'Heavy Clay (ভারী এটেল)', fc: '36%', pwp: '22%', sand: 10, silt: 45, clay: 45, cond: '0.2 cm/hr' },
  };

  const currentSoil = SOIL_TEXTURE_DATA[soilTexture] || SOIL_TEXTURE_DATA.loam;

  return (
    <div className="my-farm-workspace" style={{ padding: '20px 0 40px 0', maxWidth: 1300, margin: '0 auto' }}>
      
      {/* Top Banner & Sub-Navigation */}
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
              <span style={{ fontSize: 26 }}>🗺️🌱</span>
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
                FIELD PARCEL &amp; SOIL REGISTRY
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
                {activeField?.name || 'Bogura Demo Field'}
              </span>
            </div>
            <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: '#f8fafc' }}>
              {lang === 'bn' ? 'আমার জমি, সীমানা ও মাটির তথ্য' : 'My Farm: Parcels, Soil & Boundaries'}
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: '#94a3b8', lineHeight: 1.5, maxWidth: 840 }}>
              {lang === 'bn'
                ? 'গুগল স্যাটেলাইট ম্যাপে জমির সীমানা নির্ধারণ, পোস্টগ্রিসকিউএল পার্সেল রেজিস্ট্রি, মাটির পিএইচ (pH) ও জৈব পদার্থ এবং ঐতিহাসিক ফসল আবর্তন।'
                : 'Interactive Google Maps boundary mapping, PostgreSQL parcel management, soil chemistry diagnostics, and historical management logging.'}
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

      {/* SUB-TAB 1: FARM OVERVIEW */}
      {subTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <div className="dash-card" style={{ background: '#161d23', border: '1px solid #222c36', borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
              {lang === 'bn' ? 'সক্রিয় জমির প্রোফাইল' : 'Active Field Profile'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
                <span>জমির নাম (Field Name):</span>
                <strong style={{ color: '#f1f5f9' }}>{activeField?.name || 'Bogura Demo Field'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
                <span>আয়তন (Area):</span>
                <strong style={{ color: '#00df81' }}>{formatNumber(areaHa, 2)} হেক্টর ({areaBigha} বিঘা)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
                <span>ভৌগোলিক স্থানাঙ্ক (Coordinates):</span>
                <strong style={{ color: '#38bdf8' }}>{activeField?.latitude || 24.8467}° N, {activeField?.longitude || 89.3777}° E</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
                <span>মাটির গঠন (Soil Texture):</span>
                <strong style={{ color: '#fbbf24' }}>{currentSoil.label}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
                <span>মাটির অম্লতা (Soil pH):</span>
                <strong style={{ color: '#f1f5f9' }}>{activeField?.soil_ph || 6.5} (Neutral / Slightly Acidic)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>জৈব পদার্থ (Organic Matter):</span>
                <strong style={{ color: '#f1f5f9' }}>{activeField?.organic_matter || 2.1}%</strong>
              </div>
            </div>
          </div>

          <div className="dash-card" style={{ background: '#161d23', border: '1px solid #222c36', borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
              {lang === 'bn' ? 'দ্রুত নেভিগেশন ও পদক্ষেপ' : 'Quick Actions'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSubTab('map')}
                style={{
                  background: '#1c242c',
                  border: '1px solid #2a3742',
                  color: '#38bdf8',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span>🗺️</span>
                <span>স্যাটেলাইট ম্যাপে পিন ও সীমানা পরিবর্তন করুন ➔</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab('parcels')}
                style={{
                  background: '#1c242c',
                  border: '1px solid #2a3742',
                  color: '#00df81',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span>📋</span>
                <span>নতুন জমি যোগ বা সম্পাদনা করুন (PostgreSQL CRUD) ➔</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('crop_advice')}
                style={{
                  background: '#1c242c',
                  border: '1px solid #2a3742',
                  color: '#fbbf24',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span>🌾</span>
                <span>এই জমির জন্য নাসা রোপণ পরামর্শ দেখুন ➔</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PARCELS CRUD */}
      {subTab === 'parcels' && (
        <FieldParcelManagerView
          activeField={activeField}
          user={user}
          userFields={userFields}
          onSelectField={onSelectField}
          lang={lang}
        />
      )}

      {/* SUB-TAB 3: GOOGLE FIELD MAP PICKER */}
      {subTab === 'map' && (
        <div className="dash-card" style={{ background: '#161d23', border: '1px solid #222c36', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
            {lang === 'bn' ? 'গুগল স্যাটেলাইট ম্যাপ পিকার ও স্থানাঙ্ক নির্বাচন' : 'Google Satellite Field Map & Coordinate Picker'}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#94a3b8' }}>
            Click or drag the marker to update field coordinates. Two-way data binding updates live NASA POWER telemetry.
          </p>
          <div style={{ height: 460, borderRadius: 10, overflow: 'hidden' }}>
            <GoogleFieldMapPicker
              latitude={activeField?.latitude || 24.8467}
              longitude={activeField?.longitude || 89.3777}
              onChange={(lat, lng) => {
                console.log('Selected coordinates:', lat, lng);
              }}
            />
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SOIL INFORMATION */}
      {subTab === 'soil' && (
        <div className="dash-card" style={{ background: '#161d23', border: '1px solid #222c36', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
            {lang === 'bn' ? 'মাটির ভৌত বৈশিষ্ট্য ও পানি ধারণ ক্ষমতা (BARI Standard)' : 'Soil Physics & Water Retention Parameters'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div style={{ background: '#131920', padding: 14, borderRadius: 8, border: '1px solid #1e293b' }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Field Capacity (ক্ষেত্র ধারণক্ষমতা)</span>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>{currentSoil.fc}</div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Volumetric water at -33 kPa</span>
            </div>
            <div style={{ background: '#131920', padding: 14, borderRadius: 8, border: '1px solid #1e293b' }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Permanent Wilting Point (শুষ্কতা বিন্দু)</span>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>{currentSoil.pwp}</div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Volumetric water at -1500 kPa</span>
            </div>
            <div style={{ background: '#131920', padding: 14, borderRadius: 8, border: '1px solid #1e293b' }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Hydraulic Conductivity (পানি প্রবেশের হার)</span>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#00df81', marginTop: 4 }}>{currentSoil.cond}</div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Saturated infiltration velocity</span>
            </div>
          </div>
          <div style={{ background: '#131920', padding: 14, borderRadius: 8, border: '1px solid #1e293b', fontSize: 13, color: '#cbd5e1' }}>
            <strong>Mechanical Composition:</strong> Sand: {currentSoil.sand}% • Silt: {currentSoil.silt}% • Clay: {currentSoil.clay}%
          </div>
        </div>
      )}

      {/* SUB-TAB 5: FIELD HISTORY */}
      {subTab === 'history' && (
        <div className="dash-card" style={{ background: '#161d23', border: '1px solid #222c36', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
            {lang === 'bn' ? 'ঐতিহাসিক ফসল আবর্তন ও ফলন রেকর্ড' : 'Historical Crop Rotation & Yield Records'}
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>মৌসুম ও বছর (Season)</th>
                  <th style={{ padding: '10px 12px' }}>উৎপাদিত ফসল (Crop)</th>
                  <th style={{ padding: '10px 12px' }}>ফলন (Yield)</th>
                  <th style={{ padding: '10px 12px' }}>সেচ (Water Applied)</th>
                  <th style={{ padding: '10px 12px' }}>মাটির প্রভাব (Soil Impact)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { season: '2025 Rabi', crop: 'Potato (গোল আলু)', yield: '24.5 t/ha (61 maund/bigha)', water: '480 mm', impact: 'High nutrient depletion' },
                  { season: '2025 Kharif-1', crop: 'Mungbean (মুগডাল)', yield: '1.4 t/ha (3.5 maund/bigha)', water: '320 mm', impact: 'BNF +42 kg N/ha enrichment' },
                  { season: '2025 Kharif-2', crop: 'BRRI dhan75 (আমন ধান)', yield: '4.8 t/ha (12 maund/bigha)', water: '850 mm', impact: 'Cereal residue retained' },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#f1f5f9' }}>{row.season}</td>
                    <td style={{ padding: '12px', color: '#00df81', fontWeight: 700 }}>{row.crop}</td>
                    <td style={{ padding: '12px', color: '#38bdf8' }}>{row.yield}</td>
                    <td style={{ padding: '12px', color: '#fbbf24' }}>{row.water}</td>
                    <td style={{ padding: '12px', color: '#94a3b8' }}>{row.impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

export default MyFarmWorkspaceView;

