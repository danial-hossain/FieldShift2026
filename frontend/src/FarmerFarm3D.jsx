// frontend/src/FarmerFarm3D.jsx
// Immersive, tactile, interactive 3D-style isometric farm parcel visualizer for Bangladeshi farmers
// Features: Dynamic multi-plot selection, camera orbit/zoom/tilt, agronomic overlays (crop, moisture, soil, health, yield),
// realistic agricultural infrastructure (irrigation canals, solar pump station, agro-met mast, crop rows), and sleek glassmorphic UI.

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useTranslation, toBengaliNumber, formatArea } from './i18n.js';
import { GlassPanel, GlassCard, GlassButton, GlassBadge } from './GlassComponents.jsx';

export function FarmerFarm3D({
  activeField,
  userFields = [],
  onSelectField,
  recommendedCrop = 'Rice',
  nasa,
  lang = 'bn'
}) {
  const { t } = useTranslation(lang);
  const canvasRef = useRef(null);

  // View & Camera Controls
  const [viewMode, setViewMode] = useState('3d'); // '3d' | '2d'
  const [activeOverlay, setActiveOverlay] = useState('crop'); // 'crop' | 'moisture' | 'soil' | 'health' | 'yield'
  const [rotationAngle, setRotationAngle] = useState(0); // 0, 90, 180, 270 deg
  const [zoomLevel, setZoomLevel] = useState(1.0); // 0.8x to 1.4x
  const [cameraTilt, setCameraTilt] = useState('isometric'); // 'isometric' | 'topdown' | 'angled'

  // Plot Selection & Hover State
  const [hoveredPlotIndex, setHoveredPlotIndex] = useState(null);
  const [selectedPlotIndex, setSelectedPlotIndex] = useState(4); // Center main plot by default

  // Canonical active field normalization
  const canonicalFieldName = activeField?.name || (lang === 'bn' ? 'বগুড়া ডেমো খামার [DEMO]' : 'Bogura Demo Farm [DEMO]');
  const canonicalAreaHa = activeField?.area_ha != null ? Number(activeField.area_ha) : (activeField?.field_size_ha != null ? Number(activeField.field_size_ha) : 10.0);
  const canonicalSoil = activeField?.soil_texture || 'loam';
  const canonicalPh = activeField?.soil_ph != null ? Number(activeField.soil_ph) : 6.5;

  // 9-Plot Agricultural Experimental & Working Layout
  const plotsData = useMemo(() => {
    return [
      {
        id: 'P-01',
        row: -1,
        col: -1,
        nameBn: 'উত্তর-পশ্চিম আমন খেত',
        nameEn: 'North-West Aman Field',
        crop: 'Rice',
        cropBn: 'আমন ধান (ব্রি-৪৯)',
        cropEn: 'Aman Rice (BR-49)',
        stageBn: 'শীষ আসার পর্যায় (Heading)',
        stageEn: 'Heading Stage',
        moisturePct: 78,
        moistureStatusBn: 'পর্যাপ্ত আর্দ্রতা',
        moistureStatusEn: 'Adequate Moisture',
        soilType: 'loam',
        soilBn: 'পলি দোআঁশ (pH ৬.৪)',
        soilEn: 'Silt Loam (pH 6.4)',
        healthNdvi: 0.82,
        healthStatusBn: 'চমৎকার বৃদ্ধি',
        healthStatusEn: 'Excellent Canopy Growth',
        yieldMaundPerBigha: 18.5,
        yieldTonPerHa: 4.8,
        color: '#22c55e',
        accentColor: '#16a34a',
        icon: '🌾'
      },
      {
        id: 'P-02',
        row: -1,
        col: 0,
        nameBn: 'উত্তর মধ্য গম প্লট',
        nameEn: 'North Central Wheat Plot',
        crop: 'Wheat',
        cropBn: 'গম (বারি গম-৩৩)',
        cropEn: 'Wheat (BARI Gom-33)',
        stageBn: 'দানাধারণ পর্যায় (Grain Filling)',
        stageEn: 'Grain Filling',
        moisturePct: 62,
        moistureStatusBn: 'পরিমিত আর্দ্রতা',
        moistureStatusEn: 'Optimal Moisture',
        soilType: 'sandy loam',
        soilBn: 'বেলে দোআঁশ (pH ৬.৮)',
        soilEn: 'Sandy Loam (pH 6.8)',
        healthNdvi: 0.74,
        healthStatusBn: 'উচ্চ স্বাস্থ্য সূচক',
        healthStatusEn: 'High Health Index',
        yieldMaundPerBigha: 14.0,
        yieldTonPerHa: 3.6,
        color: '#eab308',
        accentColor: '#ca8a04',
        icon: '🌾'
      },
      {
        id: 'P-03',
        row: -1,
        col: 1,
        nameBn: 'উত্তর-পূর্ব ডাল ব্লক',
        nameEn: 'North-East Pulse Block',
        crop: 'Lentil',
        cropBn: 'মসুর ডাল (বারি মসুর-৮)',
        cropEn: 'Lentil (BARI Masur-8)',
        stageBn: 'শুটি গঠন পর্যায় (Podding)',
        stageEn: 'Podding Stage',
        moisturePct: 54,
        moistureStatusBn: 'পরিমিত শুষ্ক',
        moistureStatusEn: 'Moderate Dry',
        soilType: 'clay loam',
        soilBn: 'এঁটেল দোআঁশ (pH ৭.১)',
        soilEn: 'Clay Loam (pH 7.1)',
        healthNdvi: 0.68,
        healthStatusBn: 'স্বাভাবিক বৃদ্ধি',
        healthStatusEn: 'Normal Vigour',
        yieldMaundPerBigha: 8.5,
        yieldTonPerHa: 1.8,
        color: '#10b981',
        accentColor: '#059669',
        icon: '🌱'
      },
      {
        id: 'P-04',
        row: 0,
        col: -1,
        nameBn: 'পশ্চিম উচ্চ আলু খেত',
        nameEn: 'West Elevated Potato Plot',
        crop: 'Potato',
        cropBn: 'গোল আলু (ডায়মন্ট)',
        cropEn: 'Potato (Diamant)',
        stageBn: 'কন্দ গঠন পর্যায় (Tuber Bulking)',
        stageEn: 'Tuber Bulking',
        moisturePct: 70,
        moistureStatusBn: 'অনুকূল আর্দ্রতা',
        moistureStatusEn: 'Favourable Moisture',
        soilType: 'loam',
        soilBn: 'বেলে দোআঁশ (pH ৬.২)',
        soilEn: 'Sandy Loam (pH 6.2)',
        healthNdvi: 0.79,
        healthStatusBn: 'স্বাস্থ্যকর ক্যানোপি',
        healthStatusEn: 'Healthy Canopy',
        yieldMaundPerBigha: 95.0,
        yieldTonPerHa: 24.5,
        color: '#8b5cf6',
        accentColor: '#7c3aed',
        icon: '🥔'
      },
      {
        id: 'P-05',
        row: 0,
        col: 0,
        nameBn: `${canonicalFieldName} (মূল জমি)`,
        nameEn: `${canonicalFieldName} (Active Parcel)`,
        crop: recommendedCrop || 'Rice',
        cropBn: recommendedCrop === 'Rice' ? 'উন্নত আমন ধান (ব্রি-৭৫)' : `${recommendedCrop}`,
        cropEn: `${recommendedCrop} (Target Field)`,
        stageBn: 'কুশি গজানোর পর্যায় (Tillering)',
        stageEn: 'Vegetative Tillering',
        moisturePct: 75,
        moistureStatusBn: 'আদর্শ সেচ মাত্রা',
        moistureStatusEn: 'Ideal Irrigation Level',
        soilType: canonicalSoil,
        soilBn: `${canonicalSoil === 'loam' ? 'দোআঁশ মাটি' : canonicalSoil === 'clay' ? 'এঁটেল মাটি' : 'বেলে দোআঁশ'} (pH ${canonicalPh})`,
        soilEn: `${canonicalSoil} (pH ${canonicalPh})`,
        healthNdvi: 0.85,
        healthStatusBn: 'সর্বোচ্চ উৎপাদনশীলতা সূচক',
        healthStatusEn: 'Peak Productivity Index',
        yieldMaundPerBigha: 19.5,
        yieldTonPerHa: 5.2,
        color: '#00df81',
        accentColor: '#009959',
        icon: '👑',
        isMain: true
      },
      {
        id: 'P-06',
        row: 0,
        col: 1,
        nameBn: 'পূর্ব হাইব্রিড ভুট্টা খেত',
        nameEn: 'East Hybrid Maize Field',
        crop: 'Maize',
        cropBn: 'ভুট্টা (পায়োনিয়ার ৩৩৫৫)',
        cropEn: 'Hybrid Maize (P-3355)',
        stageBn: 'মোচা আসার পর্যায় (Silking)',
        stageEn: 'Silking / Tasseling',
        moisturePct: 65,
        moistureStatusBn: 'পর্যাপ্ত পানি',
        moistureStatusEn: 'Sufficient Water',
        soilType: 'loam',
        soilBn: 'উর্বর দোআঁশ (pH ৬.৬)',
        soilEn: 'Rich Loam (pH 6.6)',
        healthNdvi: 0.88,
        healthStatusBn: 'সবল বায়োমাস বৃদ্ধি',
        healthStatusEn: 'Vigorous Biomass',
        yieldMaundPerBigha: 42.0,
        yieldTonPerHa: 10.8,
        color: '#f59e0b',
        accentColor: '#d97706',
        icon: '🌽'
      },
      {
        id: 'P-07',
        row: 1,
        col: -1,
        nameBn: 'দক্ষিণ-পশ্চিম সরিষা খেত',
        nameEn: 'South-West Mustard Field',
        crop: 'Mustard',
        cropBn: 'সরিষা (বারি সরিষা-১৪)',
        cropEn: 'Mustard (BARI-14)',
        stageBn: 'পূর্ণ প্রস্ফুটন (Full Bloom)',
        stageEn: 'Full Bloom',
        moisturePct: 58,
        moistureStatusBn: 'পরিমিত আর্দ্রতা',
        moistureStatusEn: 'Moderate Moisture',
        soilType: 'sandy loam',
        soilBn: 'পলি দোআঁশ (pH ৬.৫)',
        soilEn: 'Silt Loam (pH 6.5)',
        healthNdvi: 0.72,
        healthStatusBn: 'হলুদ ফুলে ভরপুর',
        healthStatusEn: 'Dense Flowering Canopy',
        yieldMaundPerBigha: 6.8,
        yieldTonPerHa: 1.75,
        color: '#facc15',
        accentColor: '#ca8a04',
        icon: '🌼'
      },
      {
        id: 'P-08',
        row: 1,
        col: 0,
        nameBn: 'দক্ষিণ মধ্য বোনা ধান',
        nameEn: 'South Central Broadcast Rice',
        crop: 'Rice',
        cropBn: 'আউশ ধান (ব্রি-৪৮)',
        cropEn: 'Aus Rice (BR-48)',
        stageBn: 'দানা পরিপক্ক পর্যায় (Ripening)',
        stageEn: 'Ripening Stage',
        moisturePct: 68,
        moistureStatusBn: 'স্বাভাবিক আর্দ্রতা',
        moistureStatusEn: 'Normal Moisture',
        soilType: 'clay loam',
        soilBn: 'ভারী পলি (pH ৭.০)',
        soilEn: 'Heavy Silt (pH 7.0)',
        healthNdvi: 0.76,
        healthStatusBn: 'সোনালী পাকা ফসল',
        healthStatusEn: 'Golden Mature Grain',
        yieldMaundPerBigha: 16.0,
        yieldTonPerHa: 4.2,
        color: '#34d399',
        accentColor: '#059669',
        icon: '🌾'
      },
      {
        id: 'P-09',
        row: 1,
        col: 1,
        nameBn: 'দক্ষিণ-পূর্ব সবজি খেত',
        nameEn: 'South-East Vegetable Strip',
        crop: 'Tomato',
        cropBn: 'উচ্চফলনশীল টমেটো',
        cropEn: 'Hybrid Tomato (Ratan)',
        stageBn: 'ফল পাকা পর্যায় (Fruiting)',
        stageEn: 'Fruiting Stage',
        moisturePct: 76,
        moistureStatusBn: 'নিয়মিত সেচ আবশ্যক',
        moistureStatusEn: 'Frequent Irrigation Need',
        soilType: 'loam',
        soilBn: 'দোআঁশ মাটি (pH ৬.৩)',
        soilEn: 'Rich Loam (pH 6.3)',
        healthNdvi: 0.81,
        healthStatusBn: 'চমৎকার ফলন লক্ষণ',
        healthStatusEn: 'Vigorous Fruiting',
        yieldMaundPerBigha: 110.0,
        yieldTonPerHa: 28.5,
        color: '#f87171',
        accentColor: '#dc2626',
        icon: '🍅'
      }
    ];
  }, [canonicalFieldName, canonicalSoil, canonicalPh, recommendedCrop]);

  const activePlot = plotsData[selectedPlotIndex] || plotsData[4];

  // Canvas Isometric 3D Engine with High-Fidelity Agricultural Atmosphere
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewMode !== '3d') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let tick = 0;

    const render = () => {
      tick += 0.02; // Natural slow wind and water ripple speed
      const width = canvas.width;
      const height = canvas.height;

      // 1. Atmosphere: Futuristic Agricultural Command Center Twilight Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#061019'); // Deep obsidian night sky
      skyGrad.addColorStop(0.35, '#0b1d28'); // Soft emerald mist layer
      skyGrad.addColorStop(0.70, '#0d272d'); // Warm horizon
      skyGrad.addColorStop(1, '#08141b'); // Earth shadow
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric grid on the horizon
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 223, 129, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // Atmospheric ambient sunlight glow in upper corner
      ctx.save();
      const sunX = width * 0.86;
      const sunY = height * 0.12;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 110);
      sunGrad.addColorStop(0, 'rgba(0, 223, 129, 0.45)');
      sunGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.22)');
      sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 110, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Geometry Constants adjusted by camera controls
      const centerX = width * 0.48;
      const centerY = height * (cameraTilt === 'topdown' ? 0.52 : cameraTilt === 'angled' ? 0.44 : 0.48);
      const baseTileW = Math.min(width * 0.25, 128) * zoomLevel;
      const heightRatio = cameraTilt === 'topdown' ? 0.75 : cameraTilt === 'angled' ? 0.40 : 0.52;
      const baseTileH = baseTileW * heightRatio;

      // 2. Concrete Irrigation Canal (সেচ নালা) running west-to-east
      ctx.save();
      const canalY = centerY + baseTileH * 1.88;
      const canalStartX = centerX - baseTileW * 2.4;
      const canalEndX = centerX + baseTileW * 2.4;
      // Canal bed
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(canalStartX, canalY - 2, canalEndX - canalStartX, 22);
      // Flowing water
      const waterGrad = ctx.createLinearGradient(0, canalY, 0, canalY + 16);
      waterGrad.addColorStop(0, '#0284c7');
      waterGrad.addColorStop(1, '#0369a1');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(canalStartX, canalY, canalEndX - canalStartX, 16);

      // Flowing water caustics & ripple particles
      ctx.fillStyle = '#38bdf8';
      for (let w = -3; w <= 3; w++) {
        const waveX = centerX + w * 65 + (Math.sin(tick * 2.5 + w) * 18);
        ctx.fillRect(waveX, canalY + 5, 24, 3);
      }
      ctx.restore();

      // 3. Solar Powered Irrigation Pump Station (সৌরচালিত সেচ পাম্প)
      ctx.save();
      const pumpX = centerX + baseTileW * 1.7;
      const pumpY = canalY - 12;
      // Solar panel array (angled blue slate)
      ctx.fillStyle = '#1e3a8a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pumpX - 16, pumpY - 22);
      ctx.lineTo(pumpX + 16, pumpY - 22);
      ctx.lineTo(pumpX + 22, pumpY - 6);
      ctx.lineTo(pumpX - 10, pumpY - 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Solar array mount pole
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pumpX + 3, pumpY - 6);
      ctx.lineTo(pumpX + 3, pumpY + 8);
      ctx.stroke();
      // Pump motor unit
      ctx.fillStyle = '#00df81';
      ctx.fillRect(pumpX - 4, pumpY + 6, 14, 10);
      ctx.restore();

      // 4. Agro-Meteorological Sensor Mast (আবহাওয়া স্টেশন)
      ctx.save();
      const mastX = centerX - baseTileW * 1.85;
      const mastY = centerY - baseTileH * 1.35;
      // Tower
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mastX, mastY);
      ctx.lineTo(mastX, mastY - 48);
      ctx.stroke();
      // Anemometer cups
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(mastX + Math.cos(tick * 4) * 8, mastY - 48, 3.5, 0, Math.PI * 2);
      ctx.arc(mastX - Math.cos(tick * 4) * 8, mastY - 48, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Blinking green sensor telemetry beacon
      ctx.fillStyle = Math.sin(tick * 6) > 0 ? '#00df81' : '#14532d';
      ctx.beginPath();
      ctx.arc(mastX, mastY - 52, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5. Render 9 Isometric Agricultural Plots
      plotsData.forEach((p, idx) => {
        // Apply rotation angle (0, 90, 180, 270)
        let r = p.row;
        let c = p.col;
        if (rotationAngle === 90) {
          const temp = r;
          r = -c;
          c = temp;
        } else if (rotationAngle === 180) {
          r = -r;
          c = -c;
        } else if (rotationAngle === 270) {
          const temp = r;
          r = c;
          c = -temp;
        }

        const isoX = centerX + (c - r) * (baseTileW / 2);
        const isoY = centerY + (c + r) * (baseTileH / 2);

        const isSelected = selectedPlotIndex === idx;
        const isHovered = hoveredPlotIndex === idx;

        // Dynamic 3D Elevation with smooth tactile lift
        const elevation = isSelected ? 20 : isHovered ? 13 : 6;

        // Overlay colors
        let surfaceColor1 = p.color;
        let surfaceColor2 = p.accentColor || '#166534';

        if (activeOverlay === 'moisture') {
          if (p.moisturePct >= 75) {
            surfaceColor1 = '#0284c7';
            surfaceColor2 = '#0369a1';
          } else if (p.moisturePct >= 60) {
            surfaceColor1 = '#10b981';
            surfaceColor2 = '#047857';
          } else {
            surfaceColor1 = '#f59e0b';
            surfaceColor2 = '#b45309';
          }
        } else if (activeOverlay === 'health') {
          if (p.healthNdvi >= 0.80) {
            surfaceColor1 = '#00df81';
            surfaceColor2 = '#00a860';
          } else if (p.healthNdvi >= 0.70) {
            surfaceColor1 = '#84cc16';
            surfaceColor2 = '#4d7c0f';
          } else {
            surfaceColor1 = '#eab308';
            surfaceColor2 = '#ca8a04';
          }
        } else if (activeOverlay === 'soil') {
          if (p.soilType.includes('clay')) {
            surfaceColor1 = '#b45309';
            surfaceColor2 = '#78350f';
          } else if (p.soilType.includes('sandy')) {
            surfaceColor1 = '#d97706';
            surfaceColor2 = '#92400e';
          } else {
            surfaceColor1 = '#713f12';
            surfaceColor2 = '#451a03';
          }
        } else if (activeOverlay === 'yield') {
          if (p.yieldTonPerHa >= 15) {
            surfaceColor1 = '#a855f7';
            surfaceColor2 = '#7e22ce';
          } else if (p.yieldTonPerHa >= 5) {
            surfaceColor1 = '#00df81';
            surfaceColor2 = '#059669';
          } else {
            surfaceColor1 = '#f59e0b';
            surfaceColor2 = '#b45309';
          }
        }

        // Soft ground contact shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(isoX, isoY + baseTileH * 0.4, baseTileW * 0.45, baseTileH * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3D Subsurface Block (Right flank)
        ctx.fillStyle = isSelected ? '#1c2833' : '#111822';
        ctx.beginPath();
        ctx.moveTo(isoX, isoY - elevation + baseTileH / 2);
        ctx.lineTo(isoX + baseTileW / 2, isoY - elevation);
        ctx.lineTo(isoX + baseTileW / 2, isoY);
        ctx.lineTo(isoX, isoY + baseTileH / 2);
        ctx.closePath();
        ctx.fill();

        // 3D Subsurface Block (Left flank)
        ctx.fillStyle = isSelected ? '#253545' : '#18222e';
        ctx.beginPath();
        ctx.moveTo(isoX, isoY - elevation + baseTileH / 2);
        ctx.lineTo(isoX - baseTileW / 2, isoY - elevation);
        ctx.lineTo(isoX - baseTileW / 2, isoY);
        ctx.lineTo(isoX, isoY + baseTileH / 2);
        ctx.closePath();
        ctx.fill();

        // Top Parcel Diamond Surface
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(isoX, isoY - elevation - baseTileH / 2);
        ctx.lineTo(isoX + baseTileW / 2, isoY - elevation);
        ctx.lineTo(isoX, isoY - elevation + baseTileH / 2);
        ctx.lineTo(isoX - baseTileW / 2, isoY - elevation);
        ctx.closePath();

        const surfGrad = ctx.createLinearGradient(isoX - baseTileW / 2, isoY - elevation, isoX + baseTileW / 2, isoY - elevation);
        surfGrad.addColorStop(0, surfaceColor1);
        surfGrad.addColorStop(1, surfaceColor2);
        ctx.fillStyle = surfGrad;
        ctx.fill();

        // Field Boundary Ridge (খেতের আইল)
        ctx.strokeStyle = isSelected ? '#00df81' : isHovered ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1.2;
        ctx.stroke();
        ctx.restore();

        // Crop Rows Furrows
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        for (let f = -2; f <= 2; f++) {
          const furrowOffsetY = f * (baseTileH * 0.14);
          ctx.beginPath();
          ctx.moveTo(isoX - baseTileW * 0.28, isoY - elevation + furrowOffsetY);
          ctx.lineTo(isoX + baseTileW * 0.28, isoY - elevation + furrowOffsetY);
          ctx.stroke();
        }
        ctx.restore();

        // Swaying Crop Stalks
        const sway = Math.sin(tick * 1.5 + idx) * 3.5;
        ctx.save();
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.lineCap = 'round';

        const stalkOffsets = [
          { x: -baseTileW * 0.20, y: -baseTileH * 0.08 },
          { x: -baseTileW * 0.08, y: baseTileH * 0.12 },
          { x: 0, y: -baseTileH * 0.16 },
          { x: baseTileW * 0.10, y: baseTileH * 0.08 },
          { x: baseTileW * 0.20, y: -baseTileH * 0.06 }
        ];

        stalkOffsets.forEach((st) => {
          const stalkX = isoX + st.x;
          const stalkY = isoY - elevation + st.y;
          ctx.strokeStyle = isSelected ? '#f8fafc' : p.crop === 'Potato' ? '#78350f' : '#14532d';

          ctx.beginPath();
          ctx.moveTo(stalkX, stalkY);
          ctx.quadraticCurveTo(stalkX + sway * 0.5, stalkY - 7, stalkX + sway, stalkY - 16);
          ctx.stroke();

          // Fruit / Grain Head
          ctx.fillStyle = p.crop === 'Mustard' ? '#fde047' : p.crop === 'Tomato' ? '#ef4444' : isSelected ? '#00df81' : '#facc15';
          ctx.beginPath();
          ctx.arc(stalkX + sway, stalkY - 16, p.crop === 'Tomato' ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // Selected Plot Holographic Waypoint Beacon
        if (isSelected) {
          ctx.save();
          // Luminous pole
          ctx.strokeStyle = '#00df81';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(isoX, isoY - elevation);
          ctx.lineTo(isoX, isoY - elevation - 36);
          ctx.stroke();

          // Glass waypoint tag
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = '#00df81';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(isoX - 28, isoY - elevation - 54, 56, 18, 5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#00df81';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(p.id, isoX, isoY - elevation - 41);
          ctx.restore();
        }

        // Plot ID on tile
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = isSelected ? 'bold 10px Inter, sans-serif' : '9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.id, isoX, isoY - elevation + baseTileH * 0.32);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [canonicalFieldName, canonicalSoil, canonicalPh, recommendedCrop, viewMode, activeOverlay, rotationAngle, zoomLevel, cameraTilt, selectedPlotIndex, hoveredPlotIndex, plotsData]);

  // Click & Hover hit-testing
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width * 0.48;
    const centerY = height * (cameraTilt === 'topdown' ? 0.52 : cameraTilt === 'angled' ? 0.44 : 0.48);
    const baseTileW = Math.min(width * 0.25, 128) * zoomLevel;
    const heightRatio = cameraTilt === 'topdown' ? 0.75 : cameraTilt === 'angled' ? 0.40 : 0.52;
    const baseTileH = baseTileW * heightRatio;

    plotsData.forEach((p, idx) => {
      let r = p.row;
      let c = p.col;
      if (rotationAngle === 90) {
        const temp = r;
        r = -c;
        c = temp;
      } else if (rotationAngle === 180) {
        r = -r;
        c = -c;
      } else if (rotationAngle === 270) {
        const temp = r;
        r = c;
        c = -temp;
      }

      const isoX = centerX + (c - r) * (baseTileW / 2);
      const isoY = centerY + (c + r) * (baseTileH / 2);

      const dx = Math.abs(clickX - isoX) / (baseTileW / 2);
      const dy = Math.abs(clickY - isoY) / (baseTileH / 2);

      if (dx + dy <= 1.05) {
        setSelectedPlotIndex(idx);
      }
    });
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width * 0.48;
    const centerY = height * (cameraTilt === 'topdown' ? 0.52 : cameraTilt === 'angled' ? 0.44 : 0.48);
    const baseTileW = Math.min(width * 0.25, 128) * zoomLevel;
    const heightRatio = cameraTilt === 'topdown' ? 0.75 : cameraTilt === 'angled' ? 0.40 : 0.52;
    const baseTileH = baseTileW * heightRatio;

    let found = null;
    plotsData.forEach((p, idx) => {
      let r = p.row;
      let c = p.col;
      if (rotationAngle === 90) {
        const temp = r;
        r = -c;
        c = temp;
      } else if (rotationAngle === 180) {
        r = -r;
        c = -c;
      } else if (rotationAngle === 270) {
        const temp = r;
        r = c;
        c = -temp;
      }

      const isoX = centerX + (c - r) * (baseTileW / 2);
      const isoY = centerY + (c + r) * (baseTileH / 2);

      const dx = Math.abs(mouseX - isoX) / (baseTileW / 2);
      const dy = Math.abs(mouseY - isoY) / (baseTileH / 2);

      if (dx + dy <= 1.05) {
        found = idx;
      }
    });
    setHoveredPlotIndex(found);
  };

  const handleCanvasMouseLeave = () => {
    setHoveredPlotIndex(null);
  };

  return (
    <GlassPanel className="farmer-3d-visualizer-container" elevation="primary" style={{ margin: '24px 0', overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, rgba(0, 223, 129, 0.25) 0%, rgba(0, 168, 96, 0.15) 100%)', border: '1px solid var(--glass-border-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 12px rgba(0, 223, 129, 0.25)' }}>
            🌾
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              {lang === 'bn' ? 'ত্রিমাত্রিক আবাদি জমি ও ফসল ভিজ্যুয়ালাইজার' : 'Interactive 3D Farm & Crop Visualizer'}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
              {lang === 'bn'
                ? 'আইল, সেচ নালা, সৌর পাম্প ও মাটির আর্দ্রতা সমন্বিত ইন্টারেক্টিভ ত্রিমাত্রিক কৃষি মডেল'
                : 'Interactive 3D field parcel visualizer with canals, solar pump, and agronomic overlays'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlassButton
            variant={viewMode === '3d' ? 'primary' : 'glass'}
            size="sm"
            onClick={() => setViewMode('3d')}
          >
            {lang === 'bn' ? '🎮 ৩ডি দৃশ্য' : '🎮 3D View'}
          </GlassButton>
          <GlassButton
            variant={viewMode === '2d' ? 'primary' : 'glass'}
            size="sm"
            onClick={() => setViewMode('2d')}
          >
            {lang === 'bn' ? '🗺️ ২ডি মানচিত্র' : '🗺️ 2D Map'}
          </GlassButton>
        </div>
      </div>

      {/* 3D Action & Overlay Command Toolbar */}
      {viewMode === '3d' && (
        <div style={{ background: 'var(--glass-bg-secondary)', padding: '10px 18px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          {/* Layer Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
              {lang === 'bn' ? 'ফিল্টার স্তর:' : 'Overlay Layer:'}
            </span>
            {[
              { id: 'crop', labelBn: '🌱 ফসল বিন্যাস', labelEn: '🌱 Crop Layout' },
              { id: 'moisture', labelBn: '💧 সেচ ও আর্দ্রতা', labelEn: '💧 Soil Moisture' },
              { id: 'health', labelBn: '🌿 উদ্ভিজ্জ স্বাস্থ্য (NDVI)', labelEn: '🌿 Plant Health' },
              { id: 'soil', labelBn: '🧱 মাটির ধরন ও pH', labelEn: '🧱 Soil & pH' },
              { id: 'yield', labelBn: '📊 প্রত্যাশিত ফলন', labelEn: '📊 Yield Heatmap' }
            ].map(layer => (
              <button
                key={layer.id}
                type="button"
                onClick={() => setActiveOverlay(layer.id)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: activeOverlay === layer.id ? 800 : 600,
                  cursor: 'pointer',
                  border: activeOverlay === layer.id ? '1px solid #00df81' : '1px solid var(--glass-border)',
                  background: activeOverlay === layer.id ? 'rgba(0, 223, 129, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  color: activeOverlay === layer.id ? '#00df81' : 'var(--text-main)',
                  boxShadow: activeOverlay === layer.id ? '0 2px 8px rgba(0, 223, 129, 0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {lang === 'bn' ? layer.labelBn : layer.labelEn}
              </button>
            ))}
          </div>

          {/* Camera & Orbit Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GlassButton
              size="sm"
              variant="glass"
              onClick={() => setRotationAngle(prev => (prev + 90) % 360)}
              title={lang === 'bn' ? 'ক্যামেরা ঘোরান' : 'Rotate Field 90°'}
            >
              🔄 {rotationAngle}°
            </GlassButton>
            <GlassButton
              size="sm"
              variant="glass"
              onClick={() => setZoomLevel(prev => Math.min(1.4, Number((prev + 0.1).toFixed(1))))}
              title={lang === 'bn' ? 'কাছে আনুন' : 'Zoom In'}
            >
              🔍+
            </GlassButton>
            <GlassButton
              size="sm"
              variant="glass"
              onClick={() => setZoomLevel(prev => Math.max(0.8, Number((prev - 0.1).toFixed(1))))}
              title={lang === 'bn' ? 'দূরে নিন' : 'Zoom Out'}
            >
              🔍-
            </GlassButton>
            <GlassButton
              size="sm"
              variant="glass"
              onClick={() => {
                setRotationAngle(0);
                setZoomLevel(1.0);
                setCameraTilt('isometric');
              }}
              title={lang === 'bn' ? 'ক্যামেরা রিসেট' : 'Reset Camera'}
            >
              ⟲
            </GlassButton>
          </div>
        </div>
      )}

      {/* Main View Area: 3D Canvas vs 2D Fallback */}
      <div style={{ position: 'relative', width: '100%', minHeight: 380, background: '#090e15' }}>
        {viewMode === '3d' ? (
          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={820}
              height={420}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              style={{ display: 'block', width: '100%', height: 'auto', cursor: 'pointer' }}
              title={lang === 'bn' ? 'জমি নির্বাচন করতে ক্লিক করুন' : 'Click on any plot to inspect details'}
            />
            {/* Interactive hint overlay */}
            <div style={{ position: 'absolute', top: 12, left: 14, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
              💡 {lang === 'bn' ? 'যেকোনো প্লটে ক্লিক করে তথ্য দেখুন' : 'Click any plot to inspect field telemetry'}
            </div>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              {plotsData.map((plot, idx) => (
                <GlassCard
                  key={plot.id}
                  onClick={() => setSelectedPlotIndex(idx)}
                  style={{
                    background: selectedPlotIndex === idx ? 'rgba(0, 223, 129, 0.12)' : 'var(--glass-bg-secondary)',
                    borderColor: selectedPlotIndex === idx ? '#00df81' : 'var(--glass-border)',
                    boxShadow: selectedPlotIndex === idx ? '0 4px 16px rgba(0, 223, 129, 0.25)' : 'var(--glass-shadow)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#00df81', background: 'rgba(0, 223, 129, 0.15)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(0, 223, 129, 0.3)' }}>
                      {plot.id}
                    </span>
                    <span style={{ fontSize: 20 }}>{plot.icon}</span>
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
                    {lang === 'bn' ? plot.nameBn : plot.nameEn}
                  </h4>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {lang === 'bn' ? plot.cropBn : plot.cropEn}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)' }}>
                    <span>{lang === 'bn' ? `ফলন: ${toBengaliNumber(plot.yieldMaundPerBigha)} মণ/বিঘা` : `Yield: ${plot.yieldMaundPerBigha} md/bigha`}</span>
                    <span>{plot.moisturePct}% {lang === 'bn' ? 'আর্দ্রতা' : 'Moisture'}</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Plot Detailed Telemetry Inspector Bar */}
      <div style={{ background: 'var(--glass-bg-elevated)', borderTop: '1px solid var(--glass-border)', padding: '16px 20px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: '#00df81', color: '#09131d', padding: '3px 9px', borderRadius: 6, fontWeight: 800, fontSize: 12, boxShadow: '0 2px 8px rgba(0, 223, 129, 0.4)' }}>
              {activePlot.id}
            </span>
            <strong style={{ fontSize: 15, color: '#f8fafc' }}>
              {lang === 'bn' ? activePlot.nameBn : activePlot.nameEn}
            </strong>
            {activePlot.isMain && (
              <GlassBadge variant="emerald">
                ★ {lang === 'bn' ? 'সক্রিয় খামার' : 'Active Field'}
              </GlassBadge>
            )}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span>{lang === 'bn' ? 'মাটির আর্দ্রতা:' : 'Soil Moisture:'} </span>
            <strong style={{ color: activePlot.moisturePct >= 65 ? '#00df81' : '#f59e0b' }}>
              {toBengaliNumber(activePlot.moisturePct)}% ({lang === 'bn' ? activePlot.moistureStatusBn : activePlot.moistureStatusEn})
            </strong>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <div style={{ background: 'var(--glass-bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{lang === 'bn' ? 'ফসল ও জাত:' : 'Crop & Variety:'}</span>
            <strong style={{ fontSize: 13, color: '#f8fafc' }}>{lang === 'bn' ? activePlot.cropBn : activePlot.cropEn}</strong>
          </div>
          <div style={{ background: 'var(--glass-bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{lang === 'bn' ? 'বৃদ্ধির পর্যায়:' : 'Growth Stage:'}</span>
            <strong style={{ fontSize: 13, color: '#f8fafc' }}>{lang === 'bn' ? activePlot.stageBn : activePlot.stageEn}</strong>
          </div>
          <div style={{ background: 'var(--glass-bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{lang === 'bn' ? 'মাটি ও অম্লমান:' : 'Soil & pH:'}</span>
            <strong style={{ fontSize: 13, color: '#f8fafc' }}>{lang === 'bn' ? activePlot.soilBn : activePlot.soilEn}</strong>
          </div>
          <div style={{ background: 'var(--glass-bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{lang === 'bn' ? 'প্রত্যাশিত ফলন:' : 'Estimated Yield:'}</span>
            <strong style={{ fontSize: 13, color: '#00df81' }}>
              {lang === 'bn'
                ? `${toBengaliNumber(activePlot.yieldMaundPerBigha)} মণ/বিঘা (${toBengaliNumber(activePlot.yieldTonPerHa)} টন/হেক্টর)`
                : `${activePlot.yieldMaundPerBigha} md/bigha (${activePlot.yieldTonPerHa} t/ha)`}
            </strong>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <small style={{ color: 'var(--text-dim)', fontSize: 11 }}>
            ℹ️ {lang === 'bn'
              ? 'কাল্পনিক ত্রিমাত্রিক কৃষি মডেল (Illustrative 3D Simulation) — আইল, পাম্প ও সেচ চ্যানেল প্রদর্শনীর জন্য। সরাসরি স্যাটেলাইট সেন্সর বা ড্রোন ফুটেজ নয়।'
              : 'Illustrative 3D parcel simulation for crop stages and canal irrigation — not real-time satellite GIS or drone camera feed.'}
          </small>
        </div>
      </div>
    </GlassPanel>
  );
}
