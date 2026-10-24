// frontend/src/FarmerFarm3D.jsx
// Professional, interactive 3D-style isometric farm parcel visualizer for Bangladeshi farmers
// Features: Dynamic multi-plot selection, camera orbit/zoom/tilt, agronomic overlays (crop, moisture, soil, health, yield),
// realistic agricultural infrastructure (irrigation canals, pump station, field paths, crop rows), and graceful 2D fallback.

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation, toBengaliNumber, formatArea } from './i18n.js';

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
        healthStatusBn: 'চমৎকার উদ্ভিজ্জ বৃদ্ধি',
        healthStatusEn: 'Excellent Canopy Growth',
        yieldMaundPerBigha: 18.5,
        yieldTonPerHa: 4.8,
        color: '#86efac',
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
        color: '#fde68a',
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
        color: '#bbf7d0',
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
        stageBn: 'কন্দ বৃদ্ধি পর্যায় (Tuber Bulking)',
        stageEn: 'Tuber Bulking',
        moisturePct: 68,
        moistureStatusBn: 'আর্দ্র ও অনুকূল',
        moistureStatusEn: 'Favourable Moist',
        soilType: 'sandy loam',
        soilBn: 'বেলে দোআঁশ (pH ৬.২)',
        soilEn: 'Sandy Loam (pH 6.2)',
        healthNdvi: 0.79,
        healthStatusBn: 'স্বাস্থ্যবান ক্যানোপি',
        healthStatusEn: 'Healthy Canopy',
        yieldMaundPerBigha: 85.0,
        yieldTonPerHa: 22.0,
        color: '#fed7aa',
        icon: '🥔'
      },
      {
        id: 'P-05',
        row: 0,
        col: 0,
        nameBn: canonicalFieldName,
        nameEn: canonicalFieldName,
        crop: recommendedCrop || 'Rice',
        cropBn: `${recommendedCrop === 'Wheat' ? 'গম' : recommendedCrop === 'Maize' ? 'ভুট্টা' : recommendedCrop === 'Mustard' ? 'সরিষা' : 'উচ্চফলনশীল আমন ধান'} (প্রধান খেত)`,
        cropEn: `${recommendedCrop} (Target Field)`,
        isMain: true,
        stageBn: 'সর্বোচ্চ কুশি অবস্থা (Tillering)',
        stageEn: 'Active Tillering',
        moisturePct: 76,
        moistureStatusBn: 'সুনিয়ন্ত্রিত এডাব্লিউডি সেচ',
        moistureStatusEn: 'Regulated AWD Irrigation',
        soilType: canonicalSoil,
        soilBn: `${canonicalSoil === 'loam' ? 'উর্বর দোআঁশ' : canonicalSoil} (pH ${canonicalPh})`,
        soilEn: `${canonicalSoil} (pH ${canonicalPh})`,
        healthNdvi: 0.86,
        healthStatusBn: 'সর্বোত্তম স্বাস্থ্য ও বায়োমাস',
        healthStatusEn: 'Optimal Health & Biomass',
        yieldMaundPerBigha: 20.0,
        yieldTonPerHa: 5.2,
        color: '#22c55e',
        icon: '🌾'
      },
      {
        id: 'P-06',
        row: 0,
        col: 1,
        nameBn: 'পূর্ব ভুট্টার আইল ব্লক',
        nameEn: 'East Hybrid Maize Block',
        crop: 'Maize',
        cropBn: 'হাইব্রিড ভুট্টা (পায়োনিয়ার)',
        cropEn: 'Hybrid Maize',
        stageBn: 'মোচা গঠন পর্যায় (Silking)',
        stageEn: 'Silking Stage',
        moisturePct: 70,
        moistureStatusBn: 'পর্যাপ্ত পানি সঞ্চয়',
        moistureStatusEn: 'Adequate Storage',
        soilType: 'loam',
        soilBn: 'উর্বর দোআঁশ (pH ৬.৬)',
        soilEn: 'Loam (pH 6.6)',
        healthNdvi: 0.81,
        healthStatusBn: 'ঘন পাতা ও সুষম বৃদ্ধি',
        healthStatusEn: 'Dense Leaf Vigour',
        yieldMaundPerBigha: 38.0,
        yieldTonPerHa: 9.8,
        color: '#fef08a',
        icon: '🌽'
      },
      {
        id: 'P-07',
        row: 1,
        col: -1,
        nameBn: 'দক্ষিণ সরিষা বেঞ্চমার্ক',
        nameEn: 'South Mustard Benchmark',
        crop: 'Mustard',
        cropBn: 'সরিষা (বারি সরিষা-১৪)',
        cropEn: 'Mustard (BARI Sarisha-14)',
        stageBn: 'পূর্ণ প্রস্ফুটন (Full Bloom)',
        stageEn: 'Full Bloom',
        moisturePct: 58,
        moistureStatusBn: 'স্বল্প সেচ প্রয়োজন',
        moistureStatusEn: 'Low Water Requirement',
        soilType: 'loam',
        soilBn: 'দোআঁশ (pH ৬.৫)',
        soilEn: 'Loam (pH 6.5)',
        healthNdvi: 0.72,
        healthStatusBn: 'হলুদ ফুলে সমৃদ্ধ খেত',
        healthStatusEn: 'Flowering Stage',
        yieldMaundPerBigha: 6.2,
        yieldTonPerHa: 1.5,
        color: '#fde047',
        icon: '🌼'
      },
      {
        id: 'P-08',
        row: 1,
        col: 0,
        nameBn: 'দক্ষিণ সেচ সংলগ্ন ধান',
        nameEn: 'South Irrigation Canal Paddy',
        crop: 'Rice',
        cropBn: 'আমন ধান (ব্রি-৫১ জলমগ্নতা সহনশীল)',
        cropEn: 'Submergence Tolerant Rice',
        stageBn: 'কুশি বৃদ্ধি (Stem Elongation)',
        stageEn: 'Stem Elongation',
        moisturePct: 84,
        moistureStatusBn: 'উচ্চ আর্দ্রতা (নালা সংলগ্ন)',
        moistureStatusEn: 'High Moisture (Canal Side)',
        soilType: 'clay loam',
        soilBn: 'এঁটেল দোআঁশ (pH ৬.৭)',
        soilEn: 'Clay Loam (pH 6.7)',
        healthNdvi: 0.84,
        healthStatusBn: 'উজ্জ্বল সবুজ ফলন',
        healthStatusEn: 'Vibrant Green',
        yieldMaundPerBigha: 19.2,
        yieldTonPerHa: 4.9,
        color: '#86efac',
        icon: '🌾'
      },
      {
        id: 'P-09',
        row: 1,
        col: 1,
        nameBn: 'দক্ষিণ-পূর্ব শাকসবজি অঞ্চল',
        nameEn: 'South-East Vegetable Zone',
        crop: 'Tomato',
        cropBn: 'টমেটো ও শীতকালীন সবজি',
        cropEn: 'Tomato & Winter Veg',
        stageBn: 'ফল পরিপক্বতা (Ripening)',
        stageEn: 'Fruit Ripening',
        moisturePct: 65,
        moistureStatusBn: 'নিয়ন্ত্রিত ড্রিপ সেচ',
        moistureStatusEn: 'Drip Irrigated',
        soilType: 'sandy loam',
        soilBn: 'জৈবসমৃদ্ধ বেলে দোআঁশ (pH ৬.৩)',
        soilEn: 'Organic Sandy Loam (pH 6.3)',
        healthNdvi: 0.77,
        healthStatusBn: 'ফলনশীল অবস্থা',
        healthStatusEn: 'Fruiting Stage',
        yieldMaundPerBigha: 110.0,
        yieldTonPerHa: 28.5,
        color: '#fca5a5',
        icon: '🍅'
      }
    ];
  }, [canonicalFieldName, canonicalSoil, canonicalPh, recommendedCrop]);

  const activePlot = plotsData[selectedPlotIndex] || plotsData[4];

  // Canvas Isometric 3D Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewMode !== '3d') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let tick = 0;

    const render = () => {
      tick += 0.025; // Gentle natural wind & water wave
      const width = canvas.width;
      const height = canvas.height;

      // 1. Environmental Sky & Landscape Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#e0f2fe'); // Clear agricultural horizon sky
      skyGrad.addColorStop(0.45, '#f0fdf4'); // Soft green morning light
      skyGrad.addColorStop(0.75, '#ecfdf5');
      skyGrad.addColorStop(1, '#d1fae5'); // Earth reflection
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric cloud layers
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(width * 0.25 + Math.sin(tick * 0.1) * 20, height * 0.12, 60, 0, Math.PI * 2);
      ctx.arc(width * 0.32 + Math.sin(tick * 0.1) * 20, height * 0.10, 45, 0, Math.PI * 2);
      ctx.arc(width * 0.78 - Math.sin(tick * 0.1) * 15, height * 0.14, 75, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Sun illumination in upper corner
      ctx.save();
      const sunGrad = ctx.createRadialGradient(width * 0.88, height * 0.12, 10, width * 0.88, height * 0.12, 80);
      sunGrad.addColorStop(0, 'rgba(253, 224, 71, 0.85)');
      sunGrad.addColorStop(0.4, 'rgba(250, 204, 21, 0.35)');
      sunGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width * 0.88, height * 0.12, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Geometry Constants adjusted by camera controls
      const centerX = width * 0.48;
      const centerY = height * (cameraTilt === 'topdown' ? 0.52 : cameraTilt === 'angled' ? 0.44 : 0.48);
      const baseTileW = Math.min(width * 0.25, 126) * zoomLevel;
      const heightRatio = cameraTilt === 'topdown' ? 0.75 : cameraTilt === 'angled' ? 0.40 : 0.52;
      const baseTileH = baseTileW * heightRatio;

      // Draw Main Irrigation Canal (সেচ নালা) running west-to-east
      ctx.save();
      ctx.fillStyle = '#0284c7';
      const canalY = centerY + baseTileH * 1.85;
      ctx.beginPath();
      ctx.moveTo(centerX - baseTileW * 2.4, canalY);
      ctx.lineTo(centerX + baseTileW * 2.4, canalY);
      ctx.lineTo(centerX + baseTileW * 2.4, canalY + 16);
      ctx.lineTo(centerX - baseTileW * 2.4, canalY + 16);
      ctx.closePath();
      ctx.fill();

      // Flowing water shimmer
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      for (let w = -2; w <= 2; w++) {
        const waveX = centerX + w * 70 + (Math.sin(tick * 2 + w) * 15);
        ctx.fillRect(waveX, canalY + 4, 30, 4);
      }
      ctx.restore();

      // Access Road / Farm Path (খেতের রাস্তা)
      ctx.save();
      ctx.fillStyle = '#e7e5e4'; // Packed earth/concrete path
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 1;
      const pathStartX = centerX - baseTileW * 2.3;
      const pathStartY = centerY - baseTileH * 1.6;
      ctx.beginPath();
      ctx.moveTo(pathStartX, pathStartY);
      ctx.lineTo(pathStartX + 22, pathStartY - 10);
      ctx.lineTo(centerX + baseTileW * 2.4, centerY - baseTileH * 0.2);
      ctx.lineTo(centerX + baseTileW * 2.3, centerY - baseTileH * 0.2 + 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Render 9 Isometric Agricultural Plots
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

        // Dynamic 3D Elevation
        const elevation = isSelected ? 18 : isHovered ? 12 : 6;

        // Determine surface color based on active overlay
        let surfaceColor1 = p.color;
        let surfaceColor2 = '#16a34a';

        if (activeOverlay === 'moisture') {
          if (p.moisturePct >= 75) {
            surfaceColor1 = '#38bdf8'; // High moisture blue
            surfaceColor2 = '#0284c7';
          } else if (p.moisturePct >= 60) {
            surfaceColor1 = '#4ade80'; // Optimal green
            surfaceColor2 = '#16a34a';
          } else {
            surfaceColor1 = '#facc15'; // Dry amber
            surfaceColor2 = '#ca8a04';
          }
        } else if (activeOverlay === 'health') {
          if (p.healthNdvi >= 0.80) {
            surfaceColor1 = '#22c55e'; // Vibrant healthy green
            surfaceColor2 = '#15803d';
          } else if (p.healthNdvi >= 0.70) {
            surfaceColor1 = '#a3e635'; // Lime green
            surfaceColor2 = '#65a30d';
          } else {
            surfaceColor1 = '#fde047'; // Watchlist yellow
            surfaceColor2 = '#eab308';
          }
        } else if (activeOverlay === 'soil') {
          if (p.soilType.includes('clay')) {
            surfaceColor1 = '#b45309'; // Clay reddish-brown
            surfaceColor2 = '#78350f';
          } else if (p.soilType.includes('sandy')) {
            surfaceColor1 = '#fde68a'; // Sandy yellow-tan
            surfaceColor2 = '#d97706';
          } else {
            surfaceColor1 = '#a16207'; // Fertile Loam
            surfaceColor2 = '#713f12';
          }
        } else if (activeOverlay === 'yield') {
          if (p.yieldTonPerHa >= 15) {
            surfaceColor1 = '#c084fc'; // High tonnage tuber/veg purple
            surfaceColor2 = '#9333ea';
          } else if (p.yieldTonPerHa >= 5) {
            surfaceColor1 = '#4ade80'; // Excellent cereal green
            surfaceColor2 = '#16a34a';
          } else {
            surfaceColor1 = '#fbbf24'; // Oilseed / pulse amber
            surfaceColor2 = '#d97706';
          }
        } else {
          // Default Crop view
          if (isSelected) {
            surfaceColor1 = '#15803d';
            surfaceColor2 = '#166534';
          }
        }

        // 1. Draw 3D Earth Subsurface (Soil Foundation Block Sides)
        // Right flank side
        ctx.fillStyle = isSelected ? '#3f2e1a' : '#271c10';
        ctx.beginPath();
        ctx.moveTo(isoX, isoY - elevation + baseTileH / 2);
        ctx.lineTo(isoX + baseTileW / 2, isoY - elevation);
        ctx.lineTo(isoX + baseTileW / 2, isoY);
        ctx.lineTo(isoX, isoY + baseTileH / 2);
        ctx.closePath();
        ctx.fill();

        // Left flank side
        ctx.fillStyle = isSelected ? '#523c23' : '#392816';
        ctx.beginPath();
        ctx.moveTo(isoX, isoY - elevation + baseTileH / 2);
        ctx.lineTo(isoX - baseTileW / 2, isoY - elevation);
        ctx.lineTo(isoX - baseTileW / 2, isoY);
        ctx.lineTo(isoX, isoY + baseTileH / 2);
        ctx.closePath();
        ctx.fill();

        // 2. Draw Top Field Surface (Diamond Parcel)
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

        // Ail (খেতের আইল / Raised Field Ridge)
        ctx.strokeStyle = isSelected ? '#ffffff' : isHovered ? '#facc15' : '#78350f';
        ctx.lineWidth = isSelected ? 3.5 : isHovered ? 2.5 : 1.5;
        ctx.stroke();
        ctx.restore();

        // 3. Draw Agricultural Furrows / Crop Rows
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 1;
        for (let f = -2; f <= 2; f++) {
          const furrowOffsetY = f * (baseTileH * 0.14);
          ctx.beginPath();
          ctx.moveTo(isoX - baseTileW * 0.28, isoY - elevation + furrowOffsetY);
          ctx.lineTo(isoX + baseTileW * 0.28, isoY - elevation + furrowOffsetY);
          ctx.stroke();
        }
        ctx.restore();

        // 4. Draw Swaying Crop Vegetation Stalks
        const sway = Math.sin(tick + idx) * 3.5;
        ctx.save();
        ctx.lineWidth = isSelected ? 2.2 : 1.6;
        ctx.lineCap = 'round';

        // 5 crop stalks per tile with natural placement
        const stalkOffsets = [
          { x: -baseTileW * 0.22, y: -baseTileH * 0.1 },
          { x: -baseTileW * 0.08, y: baseTileH * 0.12 },
          { x: 0, y: -baseTileH * 0.18 },
          { x: baseTileW * 0.12, y: baseTileH * 0.08 },
          { x: baseTileW * 0.22, y: -baseTileH * 0.06 }
        ];

        stalkOffsets.forEach((st) => {
          const stalkX = isoX + st.x;
          const stalkY = isoY - elevation + st.y;
          ctx.strokeStyle = isSelected ? '#ffffff' : p.crop === 'Potato' ? '#78350f' : '#14532d';

          ctx.beginPath();
          ctx.moveTo(stalkX, stalkY);
          ctx.quadraticCurveTo(stalkX + sway * 0.5, stalkY - 8, stalkX + sway, stalkY - 18);
          ctx.stroke();

          // Golden/green grain head
          ctx.fillStyle = p.crop === 'Mustard' ? '#fde047' : p.crop === 'Tomato' ? '#ef4444' : isSelected ? '#86efac' : '#eab308';
          ctx.beginPath();
          ctx.arc(stalkX + sway, stalkY - 18, p.crop === 'Tomato' ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // 5. Selected Plot Marker Flag / Banner
        if (isSelected) {
          ctx.save();
          // White pole
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(isoX, isoY - elevation);
          ctx.lineTo(isoX, isoY - elevation - 42);
          ctx.stroke();

          // Green banner badge
          ctx.fillStyle = '#14532d';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = 6;
          ctx.fillRect(isoX, isoY - elevation - 42, 84, 22);

          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillText(lang === 'bn' ? '✓ সক্রিয় জমি' : '✓ Active Plot', isoX + 8, isoY - elevation - 27);
          ctx.restore();
        }

        // Plot ID Badge
        ctx.save();
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(0, 0, 0, 0.65)';
        ctx.font = isSelected ? 'bold 10px Inter, sans-serif' : '9px Inter, sans-serif';
        ctx.fillText(p.id, isoX - 10, isoY - elevation + baseTileH * 0.32);
        ctx.restore();
      });

      // Agricultural Well / Pump House Infrastructure (টিউবওয়েল / সেচ পাম্প)
      ctx.save();
      const pumpX = centerX + baseTileW * 1.6;
      const pumpY = centerY + baseTileH * 1.2;
      // Pump shed box
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(pumpX - 12, pumpY - 16, 24, 16);
      // Shed roof
      ctx.fillStyle = '#0d9488';
      ctx.beginPath();
      ctx.moveTo(pumpX - 16, pumpY - 16);
      ctx.lineTo(pumpX, pumpY - 26);
      ctx.lineTo(pumpX + 16, pumpY - 16);
      ctx.closePath();
      ctx.fill();
      // Pump label
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.fillText(lang === 'bn' ? '⚡ সোলার পাম্প' : 'Solar Pump', pumpX - 22, pumpY + 12);
      ctx.restore();

      // North Arrow Compass Indicator
      ctx.save();
      const compassX = 42;
      const compassY = height - 44;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(compassX, compassY, 20, 0, Math.PI * 2);
      ctx.stroke();

      // North pointer adjusted by rotationAngle
      const rotRad = (rotationAngle * Math.PI) / 180;
      const northTipX = compassX - Math.sin(rotRad) * 16;
      const northTipY = compassY - Math.cos(rotRad) * 16;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(northTipX, northTipY);
      ctx.lineTo(compassX + Math.cos(rotRad) * 5, compassY - Math.sin(rotRad) * 5);
      ctx.lineTo(compassX - Math.cos(rotRad) * 5, compassY + Math.sin(rotRad) * 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText('N', compassX - 4, compassY - 24);
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [viewMode, activeOverlay, rotationAngle, zoomLevel, cameraTilt, selectedPlotIndex, hoveredPlotIndex, plotsData, lang]);

  // Click & Hover hit-testing on canvas
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
    const baseTileW = Math.min(width * 0.25, 126) * zoomLevel;
    const heightRatio = cameraTilt === 'topdown' ? 0.75 : cameraTilt === 'angled' ? 0.40 : 0.52;
    const baseTileH = baseTileW * heightRatio;

    // Check hit against each plot
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

      // Distance check to tile center
      const dx = Math.abs(clickX - isoX) / (baseTileW / 2);
      const dy = Math.abs(clickY - isoY) / (baseTileH / 2);

      if (dx + dy <= 1.1) {
        setSelectedPlotIndex(idx);
        if (p.isMain && onSelectField && activeField) {
          onSelectField(activeField);
        }
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
    const baseTileW = Math.min(width * 0.25, 126) * zoomLevel;
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

  return (
    <div className="farmer-3d-card" style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 18px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      {/* 3D Header & Mode Selection */}
      <div className="farmer-3d-header" style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div className="farmer-3d-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            🌾
          </div>
          <div>
            <h3 className="farmer-3d-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              {lang === 'bn' ? 'ত্রিমাত্রিক আবাদি জমি ও ফসল ভিজ্যুয়ালাইজার' : 'Interactive 3D Farm & Crop Visualizer'}
            </h3>
            <p className="farmer-3d-subtitle" style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
              {lang === 'bn'
                ? 'আইল, সেচ নালা, মাটির আর্দ্রতা ও উদ্ভিজ্জ সূচক সমন্বিত ত্রিমাত্রিক কৃষি মডেল'
                : '3D interactive field parcels with irrigation canal, crop stages, and agronomic overlays'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className={`btn-mode-toggle ${viewMode === '3d' ? 'active' : ''}`}
            onClick={() => setViewMode('3d')}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              border: viewMode === '3d' ? '1px solid #16a34a' : '1px solid #cbd5e1',
              background: viewMode === '3d' ? '#16a34a' : '#ffffff',
              color: viewMode === '3d' ? '#ffffff' : '#334155'
            }}
          >
            {lang === 'bn' ? '🎮 ৩ডি ইন্টারেক্টিভ দৃশ্য' : '🎮 3D Interactive View'}
          </button>
          <button
            type="button"
            className={`btn-mode-toggle ${viewMode === '2d' ? 'active' : ''}`}
            onClick={() => setViewMode('2d')}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              border: viewMode === '2d' ? '1px solid #16a34a' : '1px solid #cbd5e1',
              background: viewMode === '2d' ? '#16a34a' : '#ffffff',
              color: viewMode === '2d' ? '#ffffff' : '#334155'
            }}
          >
            {lang === 'bn' ? '🗺️ ২ডি পরিকল্পনা মানচিত্র' : '🗺️ 2D Parcel Map'}
          </button>
        </div>
      </div>

      {/* 3D Action & Overlay Command Toolbar */}
      {viewMode === '3d' && (
        <div style={{ background: '#f8fafc', padding: '10px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          {/* Layer Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
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
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: activeOverlay === layer.id ? 800 : 600,
                  cursor: 'pointer',
                  border: activeOverlay === layer.id ? '1px solid #15803d' : '1px solid #cbd5e1',
                  background: activeOverlay === layer.id ? '#dcfce7' : '#ffffff',
                  color: activeOverlay === layer.id ? '#15803d' : '#475569'
                }}
              >
                {lang === 'bn' ? layer.labelBn : layer.labelEn}
              </button>
            ))}
          </div>

          {/* Camera & Orbit Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setRotationAngle(prev => (prev + 90) % 360)}
              title={lang === 'bn' ? 'ক্যামেরা ঘোরান' : 'Rotate Field 90°'}
              style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              🔄 {rotationAngle}°
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
              title={lang === 'bn' ? 'কাছে আনুন (Zoom In)' : 'Zoom In'}
              style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              🔍+
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.1))}
              title={lang === 'bn' ? 'দূরে নিন (Zoom Out)' : 'Zoom Out'}
              style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              🔍-
            </button>
            <button
              type="button"
              onClick={() => {
                setRotationAngle(0);
                setZoomLevel(1.0);
                setCameraTilt('isometric');
              }}
              title={lang === 'bn' ? 'ক্যামেরা রিসেট' : 'Reset Camera'}
              style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              ⟲ রিসেট
            </button>
          </div>
        </div>
      )}

      {/* Main View Area: 3D Canvas vs 2D Fallback */}
      <div className="farmer-3d-canvas-wrapper" style={{ position: 'relative', width: '100%', minHeight: 380, background: '#f8fafc' }}>
        {viewMode === '3d' ? (
          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={820}
              height={420}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              style={{ display: 'block', width: '100%', height: 'auto', cursor: 'pointer' }}
              title={lang === 'bn' ? 'জমি নির্বাচন করতে ক্লিক করুন' : 'Click on any plot to inspect details'}
            />
            {/* Interactive hint overlay */}
            <div style={{ position: 'absolute', top: 12, left: 14, background: 'rgba(255,255,255,0.92)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#334155', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
              💡 {lang === 'bn' ? 'যেকোনো প্লটে ক্লিক করে তথ্য দেখুন' : 'Click any plot to inspect field telemetry'}
            </div>
          </div>
        ) : (
          <div className="farmer-2d-plan-view" style={{ padding: 20 }}>
            <div className="farmer-2d-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              {plotsData.map((plot, idx) => (
                <div
                  key={plot.id}
                  onClick={() => setSelectedPlotIndex(idx)}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: selectedPlotIndex === idx ? '#f0fdf4' : '#ffffff',
                    border: selectedPlotIndex === idx ? '2px solid #16a34a' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>
                      {plot.id}
                    </span>
                    <span style={{ fontSize: 18 }}>{plot.icon}</span>
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                    {lang === 'bn' ? plot.nameBn : plot.nameEn}
                  </h4>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: '#475569' }}>
                    {lang === 'bn' ? plot.cropBn : plot.cropEn}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                    <span>{lang === 'bn' ? `ফলন: ${toBengaliNumber(plot.yieldMaundPerBigha)} মণ/বিঘা` : `Yield: ${plot.yieldMaundPerBigha} md/bigha`}</span>
                    <span>{plot.moisturePct}% আর্দ্রতা</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Plot Detailed Telemetry Inspector Bar */}
      <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: '#16a34a', color: '#ffffff', padding: '3px 8px', borderRadius: 6, fontWeight: 800, fontSize: 12 }}>
              {activePlot.id}
            </span>
            <strong style={{ fontSize: 15, color: '#0f172a' }}>
              {lang === 'bn' ? activePlot.nameBn : activePlot.nameEn}
            </strong>
            {activePlot.isMain && (
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
                ★ {lang === 'bn' ? 'সক্রিয় খামার' : 'Active Field'}
              </span>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#64748b' }}>
            <span>{lang === 'bn' ? 'মাটির আর্দ্রতা:' : 'Soil Moisture:'} </span>
            <strong style={{ color: activePlot.moisturePct >= 65 ? '#16a34a' : '#d97706' }}>
              {toBengaliNumber(activePlot.moisturePct)}% ({lang === 'bn' ? activePlot.moistureStatusBn : activePlot.moistureStatusEn})
            </strong>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, background: '#ffffff', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div>
            <span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>{lang === 'bn' ? 'ফসল ও জাত:' : 'Crop & Variety:'}</span>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>{lang === 'bn' ? activePlot.cropBn : activePlot.cropEn}</strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>{lang === 'bn' ? 'বৃদ্ধির পর্যায়:' : 'Growth Stage:'}</span>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>{lang === 'bn' ? activePlot.stageBn : activePlot.stageEn}</strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>{lang === 'bn' ? 'মাটি ও অম্লমান:' : 'Soil & pH:'}</span>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>{lang === 'bn' ? activePlot.soilBn : activePlot.soilEn}</strong>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>{lang === 'bn' ? 'প্রত্যাশিত ফলন:' : 'Estimated Yield:'}</span>
            <strong style={{ fontSize: 13, color: '#16a34a' }}>
              {lang === 'bn'
                ? `${toBengaliNumber(activePlot.yieldMaundPerBigha)} মণ/বিঘা (${toBengaliNumber(activePlot.yieldTonPerHa)} টন/হেক্টর)`
                : `${activePlot.yieldMaundPerBigha} md/bigha (${activePlot.yieldTonPerHa} t/ha)`}
            </strong>
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <small style={{ color: '#94a3b8', fontSize: 11 }}>
            ℹ️ {lang === 'bn'
              ? 'কাল্পনিক ত্রিমাত্রিক কৃষি মডেল (Illustrative 3D Simulation) — আইল ও সেচ চ্যানেল প্রদর্শনীর জন্য। সরাসরি স্যাটেলাইট সেন্সর বা ড্রোন ফুটেজ নয়।'
              : 'Illustrative 3D parcel simulation for crop stages and canal irrigation — not real-time satellite GIS or drone camera feed.'}
          </small>
        </div>
      </div>
    </div>
  );
}
