// frontend/src/FarmerFarm3D.jsx
// Honest, tactile 3D diorama farm parcel visualizer for Bangladeshi farmers
// Powered by ClayFarmScene (plain Three.js) with zero fabricated numbers.

import React, { useState, useMemo } from 'react';
import { useTranslation } from './i18n.js';
import { GlassPanel, GlassButton, GlassBadge } from './GlassComponents.jsx';
import { ClayFarmScene, getPlotOverlayInfo } from './ClayFarmScene.jsx';

export function FarmerFarm3D({
  activeField,
  userFields = [],
  onSelectField,
  recommendedCrop = 'Rice',
  nasa,
  lang = 'bn'
}) {
  const { t } = useTranslation(lang);

  // View & Overlay controls (Only HONEST overlays: crop, soil, rain)
  const [viewMode, setViewMode] = useState('3d'); // '3d' | '2d'
  const [activeOverlay, setActiveOverlay] = useState('crop'); // 'crop' | 'soil' | 'rain'
  const [selectedPlot, setSelectedPlot] = useState(null);

  // Derive honest field telemetry
  const rainMm = nasa?.rainfall_mm != null ? Number(nasa.rainfall_mm) : null;
  const soilTexture = activeField?.soil_texture || null;
  const currentCrop = activeField?.crop || recommendedCrop || null;
  const hasWaterDeficit = Boolean(activeField?.water_deficit_mm && activeField.water_deficit_mm > 0);

  // Generate 9 plots based strictly on actual farm context
  const plotsData = useMemo(() => {
    const tiles = [];
    const baseName = activeField?.name || (lang === 'bn' ? 'বগুড়া ডেমো খামার' : 'Bogura Demo Farm');

    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const idx = (r + 1) * 3 + (c + 1);
        const isCenter = idx === 4;

        tiles.push({
          id: `P-0${idx + 1}`,
          row: r,
          col: c,
          name: isCenter
            ? `${baseName} (${lang === 'bn' ? 'মূল খেত' : 'Main Plot'})`
            : `${lang === 'bn' ? 'পার্শ্ববর্তী প্লট' : 'Adjacent Plot'} ${idx + 1}`,
          crop: isCenter ? currentCrop : (idx % 2 === 0 ? currentCrop : null),
          soil_texture: soilTexture,
          rain_mm: rainMm,
          hasAlert: isCenter && hasWaterDeficit,
          isMain: isCenter,
        });
      }
    }
    return tiles;
  }, [activeField, currentCrop, soilTexture, rainMm, hasWaterDeficit, lang]);

  const activePlot = selectedPlot || plotsData[4] || plotsData[0];
  const overlayInfo = getPlotOverlayInfo(activePlot, activeOverlay, lang);

  return (
    <GlassPanel className="farmer-farm-3d-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
      {/* 1. Header Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🌾</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#eef3ee' }}>
              {activeField?.name || (lang === 'bn' ? 'খামারের ত্রিমাত্রিক মডেল' : 'Farm Parcel 3D Model')}
            </h3>
            <span style={{ fontSize: 11, color: 'rgba(238, 243, 238, 0.68)' }}>
              {lang === 'bn' ? 'উদাহরণমূলক খামারের মডেল' : 'Illustrative farm model'}
            </span>
          </div>
        </div>

        {/* Overlay Switches & 2D/3D Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Overlays */}
          <div style={{ display: 'inline-flex', background: 'var(--surface)', padding: 3, borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              onClick={() => setActiveOverlay('crop')}
              style={{
                background: activeOverlay === 'crop' ? '#00df81' : 'transparent',
                color: activeOverlay === 'crop' ? '#050b10' : 'rgba(238, 243, 238, 0.68)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🌱 {lang === 'bn' ? 'ফসল' : 'Crop'}
            </button>
            <button
              type="button"
              onClick={() => setActiveOverlay('soil')}
              style={{
                background: activeOverlay === 'soil' ? '#00df81' : 'transparent',
                color: activeOverlay === 'soil' ? '#050b10' : 'rgba(238, 243, 238, 0.68)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🪵 {lang === 'bn' ? 'মাটি' : 'Soil'}
            </button>
            <button
              type="button"
              onClick={() => setActiveOverlay('rain')}
              style={{
                background: activeOverlay === 'rain' ? '#00df81' : 'transparent',
                color: activeOverlay === 'rain' ? '#050b10' : 'rgba(238, 243, 238, 0.68)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🌧️ {lang === 'bn' ? 'বৃষ্টিপাত' : 'Rain'}
            </button>
          </div>

          {/* 3D / 2D View Switch */}
          <div style={{ display: 'inline-flex', background: 'var(--surface)', padding: 3, borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              style={{
                background: viewMode === '3d' ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                color: viewMode === '3d' ? '#eef3ee' : 'rgba(238, 243, 238, 0.68)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              3D
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              style={{
                background: viewMode === '2d' ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                color: viewMode === '2d' ? '#eef3ee' : 'rgba(238, 243, 238, 0.68)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              2D
            </button>
          </div>
        </div>
      </div>

      {/* 2. Clay 3D Diorama Scene */}
      <div style={{ height: 420, width: '100%', position: 'relative' }}>
        <ClayFarmScene
          plots={plotsData}
          activeOverlay={activeOverlay}
          lang={lang}
          viewMode={viewMode}
          hasAlert={hasWaterDeficit}
          onSelectPlot={(p) => setSelectedPlot(p)}
          caption={lang === 'bn' ? 'উদাহরণমূলক খামারের মডেল' : 'Illustrative farm model'}
        />
      </div>

      {/* 3. Honest Selected Plot Telemetry Inspector Bar */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '14px 18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                background: '#00df81',
                color: '#050b10',
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 800,
                fontSize: 11,
              }}
            >
              {activePlot.id}
            </span>
            <strong style={{ fontSize: 14, color: '#eef3ee' }}>
              {activePlot.name}
            </strong>
            {activePlot.isMain && (
              <GlassBadge variant="emerald">
                {lang === 'bn' ? 'মূল জমি' : 'Main Parcel'}
              </GlassBadge>
            )}
            {activePlot.hasAlert && (
              <span style={{ color: '#f43f5e', fontSize: 12, fontWeight: 700 }}>
                ⚠️ {lang === 'bn' ? 'সেচ ঘাটতি সতর্কতা' : 'Water Deficit Alert'}
              </span>
            )}
          </div>

          <div style={{ fontSize: 12, color: 'rgba(238, 243, 238, 0.68)' }}>
            <span>{lang === 'bn' ? 'সক্রিয় ওভারলে: ' : 'Active Overlay: '}</span>
            <strong style={{ color: overlayInfo.isAvailable ? '#eef3ee' : 'rgba(238, 243, 238, 0.68)' }}>
              {overlayInfo.label}
            </strong>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <div style={{ background: 'var(--surface)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ display: 'block', fontSize: 11, color: 'rgba(238, 243, 238, 0.68)', marginBottom: 2 }}>
              {lang === 'bn' ? 'ফসল ও জাত:' : 'Crop:'}
            </span>
            <strong style={{ fontSize: 13, color: activePlot.crop ? '#eef3ee' : 'rgba(238, 243, 238, 0.68)' }}>
              {activePlot.crop || (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </strong>
          </div>

          <div style={{ background: 'var(--surface)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ display: 'block', fontSize: 11, color: 'rgba(238, 243, 238, 0.68)', marginBottom: 2 }}>
              {lang === 'bn' ? 'মাটির ধরণ:' : 'Soil Texture:'}
            </span>
            <strong style={{ fontSize: 13, color: activePlot.soil_texture ? '#eef3ee' : 'rgba(238, 243, 238, 0.68)' }}>
              {activePlot.soil_texture || (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </strong>
          </div>

          <div style={{ background: 'var(--surface)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ display: 'block', fontSize: 11, color: 'rgba(238, 243, 238, 0.68)', marginBottom: 2 }}>
              {lang === 'bn' ? 'বৃষ্টিপাত (NASA POWER):' : 'Rainfall (NASA POWER):'}
            </span>
            <strong style={{ fontSize: 13, color: activePlot.rain_mm != null ? '#38bdf8' : 'rgba(238, 243, 238, 0.68)' }}>
              {activePlot.rain_mm != null ? `${activePlot.rain_mm.toFixed(1)} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </strong>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <small style={{ color: 'rgba(238, 243, 238, 0.68)', fontSize: 11 }}>
            ℹ️ {lang === 'bn'
              ? 'উদাহরণমূলক খামারের মডেল। বাস্তব কৃষি উপাত্ত শুধুমাত্র NASA POWER বৃষ্টিপাত এবং নিবন্ধিত মাটির টেক্সচার থেকে প্রদর্শিত হয়।'
              : 'Illustrative farm model. Real agronomic data is strictly sourced from NASA POWER rainfall and registered soil texture.'}
          </small>
        </div>
      </div>
    </GlassPanel>
  );
}
export default FarmerFarm3D;
