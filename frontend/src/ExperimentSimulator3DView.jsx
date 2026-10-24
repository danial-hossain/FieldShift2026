// frontend/src/ExperimentSimulator3DView.jsx
// Professional 3D Farm Experiment Simulator & Agricultural Scenario Workbench
// Features: Dual scenario builder (Scenario A vs B), interactive 3D experimental farm canvas,
// 9 experimental visualization overlays, time-step scrubber (Days 1-120), FAO-33 water balance engine,
// camera orbit/zoom controls, side-by-side diff comparison, and JSON/CSV export.

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation, toBengaliNumber, formatArea, formatCurrency } from './i18n.js';
import {
  CROP_AGRONOMIC_MODELS,
  WEATHER_SCENARIO_MODIFIERS,
  runAgronomicSimulation,
  compareScenarios
} from './experimentSimulationEngine.js';

export function ExperimentSimulator3DView({
  activeField,
  onNavigateTab,
  onBack,
  lang = 'bn'
}) {
  const { t } = useTranslation(lang);
  const canvasRef = useRef(null);

  // Scenario A Configuration State (Baseline)
  const [scenarioA, setScenarioA] = useState({
    name: lang === 'bn' ? 'দৃশ্যকল্প এ (বেসলাইন আমন)' : 'Scenario A (Baseline Aman)',
    crop: 'rice',
    areaHa: activeField?.area_ha != null ? Number(activeField.area_ha) : 10.0,
    soilTexture: activeField?.soil_texture || 'loam',
    weatherScenario: 'baseline',
    irrigationMm: 350,
    nitrogenKgHa: 120,
    phosphorusKgHa: 60,
    potassiumKgHa: 60,
    sellingPriceMaund: 1250,
    randomSeed: 2026
  });

  // Scenario B Configuration State (Experimental Treatment)
  const [scenarioB, setScenarioB] = useState({
    name: lang === 'bn' ? 'দৃশ্যকল্প বি (উষ্ণায়ন সহনশীল ও সেচ সাশ্রয়ী)' : 'Scenario B (Climate Resilient & Water Saving)',
    crop: 'rice',
    areaHa: activeField?.area_ha != null ? Number(activeField.area_ha) : 10.0,
    soilTexture: activeField?.soil_texture || 'loam',
    weatherScenario: 'warming_1_5c',
    irrigationMm: 240, // 31% water conservation
    nitrogenKgHa: 135,
    phosphorusKgHa: 65,
    potassiumKgHa: 70,
    sellingPriceMaund: 1300,
    randomSeed: 2026
  });

  // Active View & Simulation States
  const [activeScenarioTab, setActiveScenarioTab] = useState('A'); // 'A' | 'B' | 'compare'
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentDayStep, setCurrentDayStep] = useState(120); // 1 to 120
  const [isPlaying, setIsPlaying] = useState(false);

  // 3D Canvas Controls
  const [activeOverlay, setActiveOverlay] = useState('crop'); // 'crop'|'growth'|'irrigation'|'water_stress'|'soil'|'climate'|'yield'|'economics'|'scenario_diff'
  const [rotationAngle, setRotationAngle] = useState(0); // 0, 90, 180, 270
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [cameraTilt, setCameraTilt] = useState('isometric'); // 'isometric' | 'topdown' | 'angled'
  const [selectedPlotIndex, setSelectedPlotIndex] = useState(4); // Center plot
  const [hoveredPlotIndex, setHoveredPlotIndex] = useState(null);

  // Run Deterministic Simulations
  const simResultA = useMemo(() => runAgronomicSimulation(scenarioA), [scenarioA]);
  const simResultB = useMemo(() => runAgronomicSimulation(scenarioB), [scenarioB]);
  const comparison = useMemo(() => compareScenarios(simResultA, simResultB), [simResultA, simResultB]);

  // Active Simulation Result being visualized
  const currentSim = activeScenarioTab === 'B' ? simResultB : simResultA;

  // Animation Playback Loop for Day Scrubber
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentDayStep(prev => {
          if (prev >= 120) {
            setIsPlaying(false);
            return 120;
          }
          return prev + 2;
        });
      }, 75);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // 12-Plot Experimental Farm Layout
  const experimentalPlots = useMemo(() => {
    const treatments = [
      { id: 'EXP-1', row: -1, col: -1, titleBn: 'প্লট ১ (নিয়ন্ত্রণ ব্লক)', titleEn: 'Plot 1 (Control)', treatment: 'T1: 100% Water / N-120' },
      { id: 'EXP-2', row: -1, col: 0,  titleBn: 'প্লট ২ (এডাব্লিউডি সেচ)', titleEn: 'Plot 2 (AWD Irrigation)', treatment: 'T2: AWD -25% Water' },
      { id: 'EXP-3', row: -1, col: 1,  titleBn: 'প্লট ৩ (উচ্চ নাইট্রোজেন)', titleEn: 'Plot 3 (High Nitrogen)', treatment: 'T3: N-150 / P-70' },
      { id: 'EXP-4', row: 0,  col: -1, titleBn: 'প্লট ৪ (জৈব সার সমন্বয়)', titleEn: 'Plot 4 (Integrated OM)', treatment: 'T4: Compost + 70% Urea' },
      { id: 'EXP-5', row: 0,  col: 0,  titleBn: `${activeField?.name || 'প্রধান আবাদি জমি'} [কেন্দ্রীয় প্লট]`, titleEn: 'Main Field [Central Plot]', treatment: 'Target Field Benchmark', isTarget: true },
      { id: 'EXP-6', row: 0,  col: 1,  titleBn: 'প্লট ৬ (ঘাটতি সেচ ট্রায়াল)', titleEn: 'Plot 6 (Deficit Irrigation)', treatment: 'T5: 60% Deficit' },
      { id: 'EXP-7', row: 1,  col: -1, titleBn: 'প্লট ৭ (পটাশ পুষ্টি ট্রায়াল)', titleEn: 'Plot 7 (Potassium Trial)', treatment: 'T6: High K+ Stress Buffer' },
      { id: 'EXP-8', row: 1,  col: 0,  titleBn: 'প্লট ৮ (মালচিং প্রযুক্তি)', titleEn: 'Plot 8 (Straw Mulch)', treatment: 'T7: Moisture Retention' },
      { id: 'EXP-9', row: 1,  col: 1,  titleBn: 'প্লট ৯ (ড্রিপ ফার্টিগেশন)', titleEn: 'Plot 9 (Drip Fertigation)', treatment: 'T8: Precision Drip' }
    ];

    // Compute dynamic day-interpolated metrics for each plot
    const dayRatio = currentDayStep / 120;
    const baseSim = currentSim;

    return treatments.map((t, idx) => {
      // Perturbations around the simulated scenario to reflect real multi-plot trial variance
      const varianceFactor = 0.92 + (idx * 0.02);
      const plotYieldTonHa = baseSim.yieldOutcomes.simulatedYieldTonHa * varianceFactor;
      const plotYieldMaundBigha = (plotYieldTonHa * 25) / 7.47;
      const plotMoisture = Math.min(95, Math.max(30, (baseSim.waterBalance.cumulativeIrrigationMm > 250 ? 75 : 55) * (1 - (dayRatio * 0.2)) + (idx % 3) * 5));
      const plotKs = Math.min(1.0, Math.max(0.2, (plotMoisture / 65)));
      const plotHealthNdvi = Math.min(0.92, 0.40 + Math.sin(dayRatio * Math.PI) * 0.45 * plotKs);

      return {
        ...t,
        crop: baseSim.inputs.cropNameBn,
        cropEn: baseSim.inputs.cropNameEn,
        yieldTonHa: Number(plotYieldTonHa.toFixed(2)),
        yieldMaundBigha: Number(plotYieldMaundBigha.toFixed(1)),
        moisturePct: Math.round(plotMoisture),
        ks: Number(plotKs.toFixed(2)),
        ndvi: Number(plotHealthNdvi.toFixed(2)),
        waterAppliedMm: Math.round(baseSim.waterBalance.totalWaterAppliedMm * varianceFactor),
        netReturnBdt: Math.round(baseSim.economics.netReturnPerHaBdt * varianceFactor)
      };
    });
  }, [currentSim, currentDayStep, activeField]);

  const activePlot = experimentalPlots[selectedPlotIndex] || experimentalPlots[4];

  // 3D Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let tick = 0;

    const render = () => {
      tick += 0.02;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Atmosphere & Lab Lighting Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0f172a'); // Deep slate blue research canopy
      bgGrad.addColorStop(0.5, '#1e293b');
      bgGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Laboratory Grid Horizon
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // Geometry Constants
      const centerX = width * 0.48;
      const centerY = height * (cameraTilt === 'topdown' ? 0.52 : cameraTilt === 'angled' ? 0.44 : 0.48);
      const baseTileW = Math.min(width * 0.25, 130) * zoomLevel;
      const heightRatio = cameraTilt === 'topdown' ? 0.75 : cameraTilt === 'angled' ? 0.38 : 0.52;
      const baseTileH = baseTileW * heightRatio;

      // Research Concrete Irrigation Canal (সেচ চ্যানেল)
      ctx.save();
      ctx.fillStyle = '#0369a1';
      const canalY = centerY + baseTileH * 1.85;
      ctx.fillRect(centerX - baseTileW * 2.3, canalY, baseTileW * 4.6, 14);
      // Flowing water particles
      ctx.fillStyle = '#38bdf8';
      for (let p = -2; p <= 2; p++) {
        const px = centerX + p * 80 + Math.sin(tick * 2 + p) * 20;
        ctx.fillRect(px, canalY + 4, 25, 3);
      }
      ctx.restore();

      // Research Infrastructure: Agro-Meteorological Sensor Mast (আবহাওয়া স্টেশন)
      ctx.save();
      const mastX = centerX - baseTileW * 1.8;
      const mastY = centerY - baseTileH * 1.4;
      // Mast tower
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mastX, mastY);
      ctx.lineTo(mastX, mastY - 45);
      ctx.stroke();
      // Anemometer cups
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(mastX + Math.cos(tick * 4) * 8, mastY - 45, 3, 0, Math.PI * 2);
      ctx.arc(mastX - Math.cos(tick * 4) * 8, mastY - 45, 3, 0, Math.PI * 2);
      ctx.fill();
      // Label
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText('AGRO-MET MAST', mastX - 28, mastY - 52);
      ctx.restore();

      // 9 Experimental Diamond Plots
      experimentalPlots.forEach((plot, idx) => {
        let r = plot.row;
        let c = plot.col;
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

        // Dynamic 3D elevation
        const elevation = isSelected ? 20 : isHovered ? 12 : 6;

        // Overlay Color Computation
        let c1 = '#15803d';
        let c2 = '#166534';

        if (activeOverlay === 'crop') {
          c1 = plot.isTarget ? '#22c55e' : '#15803d';
          c2 = plot.isTarget ? '#16a34a' : '#14532d';
        } else if (activeOverlay === 'growth') {
          // Biomass / Growth stage from day scrubber
          const dayFrac = currentDayStep / 120;
          if (dayFrac < 0.25) {
            c1 = '#a3e635'; // Seedling
            c2 = '#65a30d';
          } else if (dayFrac < 0.70) {
            c1 = '#22c55e'; // Lush vegetative
            c2 = '#15803d';
          } else {
            c1 = '#facc15'; // Golden ripening
            c2 = '#ca8a04';
          }
        } else if (activeOverlay === 'irrigation') {
          if (plot.waterAppliedMm >= 400) {
            c1 = '#0284c7';
            c2 = '#0369a1';
          } else if (plot.waterAppliedMm >= 250) {
            c1 = '#38bdf8';
            c2 = '#0284c7';
          } else {
            c1 = '#f59e0b';
            c2 = '#d97706';
          }
        } else if (activeOverlay === 'water_stress') {
          if (plot.ks >= 0.85) {
            c1 = '#22c55e'; // No stress
            c2 = '#16a34a';
          } else if (plot.ks >= 0.60) {
            c1 = '#eab308'; // Moderate stress
            c2 = '#ca8a04';
          } else {
            c1 = '#ef4444'; // Severe water stress
            c2 = '#b91c1c';
          }
        } else if (activeOverlay === 'soil') {
          c1 = '#92400e';
          c2 = '#78350f';
        } else if (activeOverlay === 'climate') {
          c1 = currentSim.inputs.weatherScenario.includes('warming') ? '#f97316' : currentSim.inputs.weatherScenario.includes('drought') ? '#ef4444' : '#10b981';
          c2 = '#b45309';
        } else if (activeOverlay === 'yield') {
          if (plot.yieldTonHa >= 5.0) {
            c1 = '#10b981';
            c2 = '#047857';
          } else if (plot.yieldTonHa >= 3.5) {
            c1 = '#84cc16';
            c2 = '#4d7c0f';
          } else {
            c1 = '#f59e0b';
            c2 = '#b45309';
          }
        } else if (activeOverlay === 'economics') {
          if (plot.netReturnBdt >= 60000) {
            c1 = '#059669';
            c2 = '#047857';
          } else if (plot.netReturnBdt >= 30000) {
            c1 = '#10b981';
            c2 = '#059669';
          } else {
            c1 = '#dc2626';
            c2 = '#991b1b';
          }
        } else if (activeOverlay === 'scenario_diff') {
          // Scenario B vs Scenario A difference
          const yieldDiff = comparison ? comparison.yieldTonHa.absoluteDiff : 0;
          if (yieldDiff >= 0.3) {
            c1 = '#06b6d4'; // Cyan positive gain
            c2 = '#0891b2';
          } else if (yieldDiff >= -0.2) {
            c1 = '#e2e8f0'; // Neutral
            c2 = '#94a3b8';
          } else {
            c1 = '#f43f5e'; // Negative penalty
            c2 = '#e11d48';
          }
        }

        // Subsurface Earth Foundation
        ctx.fillStyle = isSelected ? '#1e293b' : '#0f172a';
        ctx.beginPath();
        ctx.moveTo(isoX, isoY - elevation + baseTileH / 2);
        ctx.lineTo(isoX + baseTileW / 2, isoY - elevation);
        ctx.lineTo(isoX + baseTileW / 2, isoY);
        ctx.lineTo(isoX, isoY + baseTileH / 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = isSelected ? '#334155' : '#1e293b';
        ctx.beginPath();
        ctx.moveTo(isoX, isoY - elevation + baseTileH / 2);
        ctx.lineTo(isoX - baseTileW / 2, isoY - elevation);
        ctx.lineTo(isoX - baseTileW / 2, isoY);
        ctx.lineTo(isoX, isoY + baseTileH / 2);
        ctx.closePath();
        ctx.fill();

        // Top Surface Diamond
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(isoX, isoY - elevation - baseTileH / 2);
        ctx.lineTo(isoX + baseTileW / 2, isoY - elevation);
        ctx.lineTo(isoX, isoY - elevation + baseTileH / 2);
        ctx.lineTo(isoX - baseTileW / 2, isoY - elevation);
        ctx.closePath();

        const grad = ctx.createLinearGradient(isoX - baseTileW / 2, isoY - elevation, isoX + baseTileW / 2, isoY - elevation);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#38bdf8' : isHovered ? '#facc15' : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = isSelected ? 3.5 : isHovered ? 2.5 : 1.2;
        ctx.stroke();
        ctx.restore();

        // Simulated Crop Height & Stalks based on currentDayStep
        const cropHeight = Math.min(22, 4 + (currentDayStep / 120) * 18);
        const sway = Math.sin(tick + idx) * 3;

        ctx.save();
        ctx.strokeStyle = isSelected ? '#ffffff' : '#86efac';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';

        // 5 crop stalks
        [-14, -7, 0, 7, 14].forEach((ox, sIdx) => {
          const sx = isoX + ox;
          const sy = isoY - elevation;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(sx + sway * 0.5, sy - cropHeight * 0.5, sx + sway, sy - cropHeight);
          ctx.stroke();

          // Golden seed head if mature
          if (currentDayStep > 85) {
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(sx + sway, sy - cropHeight, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.restore();

        // Selected Plot Marker
        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(isoX, isoY - elevation);
          ctx.lineTo(isoX, isoY - elevation - 38);
          ctx.stroke();

          ctx.fillStyle = '#0284c7';
          ctx.fillRect(isoX, isoY - elevation - 38, 86, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.fillText(plot.id, isoX + 6, isoY - elevation - 24);
          ctx.restore();
        }

        // Plot ID label on tile
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = isSelected ? 'bold 10px Inter, sans-serif' : '9px Inter, sans-serif';
        ctx.fillText(plot.id, isoX - 10, isoY - elevation + baseTileH * 0.32);
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [currentSim, currentDayStep, activeOverlay, rotationAngle, zoomLevel, cameraTilt, selectedPlotIndex, hoveredPlotIndex, experimentalPlots, comparison]);

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
    const baseTileW = Math.min(width * 0.25, 130) * zoomLevel;
    const heightRatio = cameraTilt === 'topdown' ? 0.75 : cameraTilt === 'angled' ? 0.38 : 0.52;
    const baseTileH = baseTileW * heightRatio;

    experimentalPlots.forEach((plot, idx) => {
      let r = plot.row;
      let c = plot.col;
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

      if (dx + dy <= 1.1) {
        setSelectedPlotIndex(idx);
      }
    });
  };

  // Export Experiment Results as JSON
  const handleExportJson = () => {
    const exportRecord = {
      experimentId: `EXP-FIELDSHIFT-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      activeScenario: activeScenarioTab,
      scenarioA: {
        inputs: scenarioA,
        results: simResultA
      },
      scenarioB: {
        inputs: scenarioB,
        results: simResultB
      },
      comparisonResult: comparison,
      provenance: {
        model: 'FieldShift AgroSim Deterministic v2.4 (FAO-33/56)',
        soilBalanceFormula: 'S_t = min(TAW, max(0, S_{t-1} + Rain_t + Irrig_t - ETa_t))',
        yieldResponseFormula: '(1 - Ya/Ym) = Ky * (1 - sum(ETa)/sum(ETc))',
        benchmarkSources: ['BARI Crop Benchmark 2024-2025', 'NASA POWER CERES/MERRA-2', 'DAE Agricultural Extension']
      }
    };

    const blob = new Blob([JSON.stringify(exportRecord, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FieldShift_Experiment_${activeScenarioTab}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Export 120-Day Daily Simulation Timeseries as CSV
  const handleExportCsv = () => {
    const records = currentSim.timeseries || [];
    if (!records.length) return;

    const headers = ['day', 'growth_stage', 'kc', 'et0_mm', 'etc_mm', 'eta_mm', 'soil_water_mm', 'stress_ks', 'rainfall_mm', 'irrigation_mm'];
    const rows = records.map(r => [
      r.day,
      `"${r.growthStageName}"`,
      r.kc,
      r.et0Mm,
      r.etcMm,
      r.etaMm,
      r.soilWaterMm,
      r.ks,
      r.rainfallMm,
      r.irrigationMm
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FieldShift_SimTimeseries_${activeScenarioTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="experiment-simulator-container" style={{ padding: '20px 24px', background: '#090d16', minHeight: '100vh', color: '#f8fafc' }}>
      {/* Top Scientific Command Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: '#0284c7', color: '#ffffff', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
              P0 RESEARCH WORKBENCH
            </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Model: <strong>FieldShift AgroSim FAO-33 / Penman-Monteith</strong>
            </span>
            <span style={{ fontSize: 12, color: '#38bdf8' }}>
              Field: <strong>{activeField?.name || 'বগুড়া ডেমো খামার [DEMO]'}</strong> (10.0 ha)
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            {lang === 'bn' ? 'ত্রিমাত্রিক কৃষি গবেষণা ল্যাব ও দৃশ্যকল্প সিমুলেটর' : '3D Farm Experiment Simulator & Scenario Workbench'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8', maxWidth: 840 }}>
            {lang === 'bn'
              ? 'এফএও-৩৩ ওয়াটার ব্যালেন্স ও জলবায়ু দৃশ্যকল্প অনুযায়ী একাধিক কৃষি কৌশল (Scenario A বনাম B) তৈরি, তুলনা এবং ১২০ দিনের ত্রিমাত্রিক ফলন ও অর্থনৈতিক বিশ্লেষণ।'
              : 'Multi-scenario experiment builder (Scenario A vs B), 120-day time progression scrubber, FAO-33 water-yield response, 3D farm overlay layers, and reproducible JSON/CSV telemetry exports.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleExportJson}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            📥 Export JSON
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            📊 Export CSV (120 Days)
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{ padding: '8px 14px', borderRadius: 8, background: '#0284c7', border: 'none', color: '#ffffff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
            >
              ← {lang === 'bn' ? 'ল্যাব ওভারভিউ' : 'Back to Lab Overview'}
            </button>
          )}
        </div>
      </div>

      {/* Scenario Mode Toggle: Scenario A vs Scenario B vs Side-by-Side Comparison */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setActiveScenarioTab('A')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            border: activeScenarioTab === 'A' ? '2px solid #22c55e' : '1px solid #334155',
            background: activeScenarioTab === 'A' ? '#14532d' : '#1e293b',
            color: activeScenarioTab === 'A' ? '#ffffff' : '#94a3b8'
          }}
        >
          🌾 {scenarioA.name}
        </button>
        <button
          type="button"
          onClick={() => setActiveScenarioTab('B')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            border: activeScenarioTab === 'B' ? '2px solid #0284c7' : '1px solid #334155',
            background: activeScenarioTab === 'B' ? '#0369a1' : '#1e293b',
            color: activeScenarioTab === 'B' ? '#ffffff' : '#94a3b8'
          }}
        >
          🔬 {scenarioB.name}
        </button>
        <button
          type="button"
          onClick={() => setActiveScenarioTab('compare')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            border: activeScenarioTab === 'compare' ? '2px solid #a855f7' : '1px solid #334155',
            background: activeScenarioTab === 'compare' ? '#6b21a8' : '#1e293b',
            color: activeScenarioTab === 'compare' ? '#ffffff' : '#94a3b8'
          }}
        >
          ⚖️ {lang === 'bn' ? 'দৃশ্যকল্প এ বনাম বি তুলনা' : 'Scenario A vs B Diff'}
        </button>
      </div>

      {/* Main 2-Column Research Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 20 }}>
        {/* Left Column: Experiment Workbench Parameter Controls */}
        <div style={{ background: '#111827', borderRadius: 14, border: '1px solid #1f2937', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
              ⚙️ {lang === 'bn' ? `প্যারামিটার কনফিগুরেশন (${activeScenarioTab})` : `Experiment Controls (${activeScenarioTab})`}
            </h3>
            <button
              type="button"
              onClick={() => {
                if (activeScenarioTab === 'A') {
                  setScenarioA({
                    name: 'Scenario A (Baseline Aman)',
                    crop: 'rice',
                    areaHa: 10.0,
                    soilTexture: 'loam',
                    weatherScenario: 'baseline',
                    irrigationMm: 350,
                    nitrogenKgHa: 120,
                    phosphorusKgHa: 60,
                    potassiumKgHa: 60,
                    sellingPriceMaund: 1250,
                    randomSeed: 2026
                  });
                } else {
                  setScenarioB({
                    name: 'Scenario B (Resilient AWD)',
                    crop: 'rice',
                    areaHa: 10.0,
                    soilTexture: 'loam',
                    weatherScenario: 'warming_1_5c',
                    irrigationMm: 240,
                    nitrogenKgHa: 135,
                    phosphorusKgHa: 65,
                    potassiumKgHa: 70,
                    sellingPriceMaund: 1300,
                    randomSeed: 2026
                  });
                }
              }}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
            >
              রিসেট
            </button>
          </div>

          {/* Form Controls */}
          {(() => {
            const currentConfig = activeScenarioTab === 'B' ? scenarioB : scenarioA;
            const updateConfig = (key, val) => {
              if (activeScenarioTab === 'B') {
                setScenarioB(prev => ({ ...prev, [key]: val }));
              } else {
                setScenarioA(prev => ({ ...prev, [key]: val }));
              }
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
                    {lang === 'bn' ? 'ফসল ও জাত নির্বাচন:' : 'Crop Selection:'}
                  </label>
                  <select
                    value={currentConfig.crop}
                    onChange={(e) => updateConfig('crop', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', fontSize: 13, fontWeight: 700 }}
                  >
                    <option value="rice">ধান (Aman / Boro Rice)</option>
                    <option value="wheat">গম (BARI Gom-33)</option>
                    <option value="maize">হাইব্রিড ভুট্টা (Hybrid Maize)</option>
                    <option value="mustard">সরিষা (BARI Sarisha-14)</option>
                    <option value="potato">গোল আলু (Diamant Potato)</option>
                    <option value="lentil">মসুর ডাল (BARI Masur-8)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
                    {lang === 'bn' ? 'আবহাওয়া দৃশ্যকল্প (NASA POWER Climate Perturbation):' : 'Weather Perturbation:'}
                  </label>
                  <select
                    value={currentConfig.weatherScenario}
                    onChange={(e) => updateConfig('weatherScenario', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', fontSize: 13 }}
                  >
                    <option value="baseline">Historical Normal (30-yr Normal)</option>
                    <option value="warming_1_5c">+1.5°C Global Warming</option>
                    <option value="drought_20pct">Moderate Drought (-20% Rain, +1.0°C)</option>
                    <option value="heavy_monsoon">Excess Monsoon (+25% Rain)</option>
                    <option value="extreme_heatwave">Extreme Heatwave (+3.0°C, Severe ET0)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
                      {lang === 'bn' ? 'সেচ বাজেট (মিমি):' : 'Irrigation (mm):'}
                    </label>
                    <input
                      type="number"
                      value={currentConfig.irrigationMm}
                      onChange={(e) => updateConfig('irrigationMm', Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
                      {lang === 'bn' ? 'জমি আয়তন (হেক্টর):' : 'Area (ha):'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={currentConfig.areaHa}
                      onChange={(e) => updateConfig('areaHa', Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>ইউরিয়া / N</label>
                    <input
                      type="number"
                      value={currentConfig.nitrogenKgHa}
                      onChange={(e) => updateConfig('nitrogenKgHa', Number(e.target.value))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>টিএসপি / P</label>
                    <input
                      type="number"
                      value={currentConfig.phosphorusKgHa}
                      onChange={(e) => updateConfig('phosphorusKgHa', Number(e.target.value))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>এমওপি / K</label>
                    <input
                      type="number"
                      value={currentConfig.potassiumKgHa}
                      onChange={(e) => updateConfig('potassiumKgHa', Number(e.target.value))}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', fontSize: 12 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
                    {lang === 'bn' ? 'বিক্রয় দর (টাকা/মণ):' : 'Selling Price (BDT/maund):'}
                  </label>
                  <input
                    type="number"
                    value={currentConfig.sellingPriceMaund}
                    onChange={(e) => updateConfig('sellingPriceMaund', Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: '#1f2937', border: '1px solid #374151', color: '#f8fafc', fontSize: 13 }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Quick Computed Metrics Summary */}
          <div style={{ marginTop: 16, background: '#1e293b', padding: 12, borderRadius: 10, border: '1px solid #334155' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', marginBottom: 6 }}>
              📊 SIMULATED KPI SUMMARY
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>অনুমিত ফলন:</span>
              <strong style={{ color: '#4ade80' }}>
                {currentSim.yieldOutcomes.simulatedYieldTonHa} টন/হেক্টর ({currentSim.yieldOutcomes.yieldMaundPerBigha} মণ/বিঘা)
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>সর্বমোট খরচ:</span>
              <strong style={{ color: '#f87171' }}>
                {formatCurrency(currentSim.economics.costPerHaBdt, lang)} /হেক্টর
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>নিট লাভ:</span>
              <strong style={{ color: '#38bdf8' }}>
                {formatCurrency(currentSim.economics.netReturnPerHaBdt, lang)} /হেক্টর
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#94a3b8' }}>ব্রেক-ইভেন দর:</span>
              <strong style={{ color: '#facc15' }}>
                {currentSim.economics.breakEvenPricePerKg} টাকা/কেজি ({currentSim.economics.breakEvenPricePerMaund} টাকা/মণ)
              </strong>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive 3D Farm Experiment Visualizer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 3D Visualizer Card */}
          <div style={{ background: '#111827', borderRadius: 14, border: '1px solid #1f2937', overflow: 'hidden' }}>
            {/* 3D Stage Top Toolbar */}
            <div style={{ padding: '10px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              {/* Overlay Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>LAYER:</span>
                {[
                  { id: 'crop', label: '🌱 Treatments' },
                  { id: 'growth', label: '🌿 Growth / Biomass' },
                  { id: 'irrigation', label: '💧 Water Budget' },
                  { id: 'water_stress', label: '⚡ Water Stress (Ks)' },
                  { id: 'yield', label: '📊 Yield Heatmap' },
                  { id: 'economics', label: '💰 Net Return' },
                  { id: 'scenario_diff', label: '⚖️ Diff A vs B' }
                ].map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setActiveOverlay(l.id)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: activeOverlay === l.id ? 800 : 600,
                      cursor: 'pointer',
                      border: activeOverlay === l.id ? '1px solid #38bdf8' : '1px solid #475569',
                      background: activeOverlay === l.id ? '#0284c7' : '#1e293b',
                      color: '#ffffff'
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {/* Camera Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setRotationAngle(p => (p + 90) % 360)}
                  style={{ padding: '4px 8px', borderRadius: 6, background: '#334155', border: 'none', color: '#f8fafc', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  🔄 {rotationAngle}°
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(p => Math.min(1.4, p + 0.1))}
                  style={{ padding: '4px 8px', borderRadius: 6, background: '#334155', border: 'none', color: '#f8fafc', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  🔍+
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(p => Math.max(0.8, p - 0.1))}
                  style={{ padding: '4px 8px', borderRadius: 6, background: '#334155', border: 'none', color: '#f8fafc', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  🔍-
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRotationAngle(0);
                    setZoomLevel(1.0);
                  }}
                  style={{ padding: '4px 8px', borderRadius: 6, background: '#334155', border: 'none', color: '#f8fafc', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  ⟲ Reset
                </button>
              </div>
            </div>

            {/* 3D Canvas */}
            <div style={{ position: 'relative', width: '100%', height: 380, background: '#090d16' }}>
              <canvas
                ref={canvasRef}
                width={760}
                height={380}
                onClick={handleCanvasClick}
                style={{ display: 'block', width: '100%', height: '100%', cursor: 'pointer' }}
              />
              <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(15, 23, 42, 0.85)', padding: '4px 10px', borderRadius: 6, fontSize: 11, color: '#38bdf8', border: '1px solid #334155' }}>
                🌾 {activeScenarioTab === 'B' ? scenarioB.name : scenarioA.name} · Day {currentDayStep} / 120
              </div>
            </div>

            {/* 120-Day Simulation Playback & Scrubber Bar */}
            <div style={{ padding: '12px 18px', background: '#1e293b', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  border: 'none',
                  background: isPlaying ? '#ef4444' : '#22c55e',
                  color: '#ffffff'
                }}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play Simulation'}
              </button>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 50 }}>
                  Day {currentDayStep}
                </span>
                <input
                  type="range"
                  min="1"
                  max="120"
                  value={currentDayStep}
                  onChange={(e) => setCurrentDayStep(Number(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer', accentColor: '#38bdf8' }}
                />
                <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 50 }}>
                  Day 120
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentDayStep(1)}
                style={{ padding: '4px 10px', borderRadius: 6, background: '#334155', border: 'none', color: '#f8fafc', fontSize: 11, cursor: 'pointer' }}
              >
                ⏪ Reset Day 1
              </button>
            </div>
          </div>

          {/* Selected Experimental Plot Inspector */}
          <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#0284c7', color: '#ffffff', padding: '2px 6px', borderRadius: 4, fontWeight: 800, fontSize: 11 }}>
                  {activePlot.id}
                </span>
                <strong style={{ fontSize: 14, color: '#f8fafc' }}>{activePlot.titleBn}</strong>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>({activePlot.treatment})</span>
              </div>
              <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700 }}>
                দিন {currentDayStep}: {currentDayStep <= 25 ? 'প্রারম্ভিক পর্যায়' : currentDayStep <= 55 ? 'কুশি বৃদ্ধি' : currentDayStep <= 90 ? 'দানাধারণ' : 'ফসল পাকা'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, background: '#1e293b', padding: 10, borderRadius: 8 }}>
              <div>
                <span style={{ display: 'block', fontSize: 10.5, color: '#94a3b8' }}>অনুমিত ফলন:</span>
                <strong style={{ fontSize: 12.5, color: '#4ade80' }}>{activePlot.yieldTonHa} t/ha ({activePlot.yieldMaundBigha} md/bigha)</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 10.5, color: '#94a3b8' }}>মাটির আর্দ্রতা:</span>
                <strong style={{ fontSize: 12.5, color: '#38bdf8' }}>{activePlot.moisturePct}% (Ks {activePlot.ks})</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 10.5, color: '#94a3b8' }}>প্রয়োগকৃত পানি:</span>
                <strong style={{ fontSize: 12.5, color: '#cbd5e1' }}>{activePlot.waterAppliedMm} mm</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 10.5, color: '#94a3b8' }}>প্রত্যাশিত নিট লাভ:</span>
                <strong style={{ fontSize: 12.5, color: '#facc15' }}>{formatCurrency(activePlot.netReturnBdt, lang)}/ha</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Scenario Side-by-Side Comparison Matrix */}
      {comparison && (
        <div style={{ marginTop: 20, background: '#111827', borderRadius: 14, border: '1px solid #1f2937', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#f8fafc' }}>
                ⚖️ {lang === 'bn' ? 'দৃশ্যকল্প এ বনাম দৃশ্যকল্প বি গাণিতিক তুলনা ম্যাট্রিক্স' : 'Multi-Scenario Quantitative Comparison (Scenario A vs B)'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#94a3b8' }}>
                {lang === 'bn'
                  ? 'ফলন, সেচ সাশ্রয়, খরচ ও নিট লাভের গাণিতিক পার্থক্য (Difference & Percentage Impact)'
                  : 'Absolute and percentage differences across productivity, water conservation, costs, and net returns'}
              </p>
            </div>
            <span style={{ background: '#1e293b', padding: '4px 10px', borderRadius: 6, fontSize: 11, color: '#38bdf8', border: '1px solid #334155' }}>
              Formula: B - A (Δ%)
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1' }}>
                  <th style={{ padding: '10px 14px' }}>অ্যাগ্রোনোমিক সূচক (Indicator)</th>
                  <th style={{ padding: '10px 14px' }}>{scenarioA.name}</th>
                  <th style={{ padding: '10px 14px' }}>{scenarioB.name}</th>
                  <th style={{ padding: '10px 14px' }}>পার্থক্য (Difference)</th>
                  <th style={{ padding: '10px 14px' }}>শতাংশ পরিবর্তন (% Impact)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: 'অনুমিত ফলন (t/ha)',
                    valA: `${comparison.yieldTonHa.scenarioA} t/ha`,
                    valB: `${comparison.yieldTonHa.scenarioB} t/ha`,
                    diff: `${comparison.yieldTonHa.absoluteDiff > 0 ? '+' : ''}${comparison.yieldTonHa.absoluteDiff} t/ha`,
                    pct: `${comparison.yieldTonHa.percentageDiff > 0 ? '+' : ''}${comparison.yieldTonHa.percentageDiff}%`,
                    isPositive: comparison.yieldTonHa.absoluteDiff >= 0
                  },
                  {
                    label: 'মোট পানি প্রয়োগ (mm)',
                    valA: `${comparison.waterAppliedMm.scenarioA} mm`,
                    valB: `${comparison.waterAppliedMm.scenarioB} mm`,
                    diff: `${comparison.waterAppliedMm.absoluteDiff > 0 ? '+' : ''}${comparison.waterAppliedMm.absoluteDiff} mm`,
                    pct: `${comparison.waterAppliedMm.percentageDiff > 0 ? '+' : ''}${comparison.waterAppliedMm.percentageDiff}%`,
                    isPositive: comparison.waterAppliedMm.absoluteDiff <= 0 // Water reduction is positive
                  },
                  {
                    label: 'পানি উৎপাদনশীলতা (kg/m³)',
                    valA: `${comparison.waterProductivity.scenarioA} kg/m³`,
                    valB: `${comparison.waterProductivity.scenarioB} kg/m³`,
                    diff: `${comparison.waterProductivity.absoluteDiff > 0 ? '+' : ''}${comparison.waterProductivity.absoluteDiff} kg/m³`,
                    pct: `${comparison.waterProductivity.percentageDiff > 0 ? '+' : ''}${comparison.waterProductivity.percentageDiff}%`,
                    isPositive: comparison.waterProductivity.absoluteDiff >= 0
                  },
                  {
                    label: 'মোট উৎপাদন খরচ (BDT/ha)',
                    valA: formatCurrency(comparison.totalCostBdt.scenarioA, lang),
                    valB: formatCurrency(comparison.totalCostBdt.scenarioB, lang),
                    diff: formatCurrency(comparison.totalCostBdt.absoluteDiff, lang),
                    pct: `${comparison.totalCostBdt.percentageDiff > 0 ? '+' : ''}${comparison.totalCostBdt.percentageDiff}%`,
                    isPositive: comparison.totalCostBdt.absoluteDiff <= 0
                  },
                  {
                    label: 'নিট লাভ (Net Profit BDT/ha)',
                    valA: formatCurrency(comparison.netReturnBdt.scenarioA, lang),
                    valB: formatCurrency(comparison.netReturnBdt.scenarioB, lang),
                    diff: formatCurrency(comparison.netReturnBdt.absoluteDiff, lang),
                    pct: `${comparison.netReturnBdt.percentageDiff > 0 ? '+' : ''}${comparison.netReturnBdt.percentageDiff}%`,
                    isPositive: comparison.netReturnBdt.absoluteDiff >= 0
                  },
                  {
                    label: 'ব্রেক-ইভেন দর (BDT/kg)',
                    valA: `${comparison.breakEvenPerKg.scenarioA} টাকা`,
                    valB: `${comparison.breakEvenPerKg.scenarioB} টাকা`,
                    diff: `${comparison.breakEvenPerKg.absoluteDiff > 0 ? '+' : ''}${comparison.breakEvenPerKg.absoluteDiff} টাকা`,
                    pct: `${comparison.breakEvenPerKg.percentageDiff > 0 ? '+' : ''}${comparison.breakEvenPerKg.percentageDiff}%`,
                    isPositive: comparison.breakEvenPerKg.absoluteDiff <= 0
                  }
                ].map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>{row.label}</td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{row.valA}</td>
                    <td style={{ padding: '10px 14px', color: '#38bdf8' }}>{row.valB}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: row.isPositive ? '#4ade80' : '#f87171' }}>
                      {row.diff}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: row.isPositive ? '#4ade80' : '#f87171' }}>
                      {row.pct}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provenance & Methodology Footnote */}
      <div style={{ marginTop: 18, padding: 14, background: '#111827', borderRadius: 10, border: '1px solid #1f2937', color: '#94a3b8', fontSize: 11.5 }}>
        <strong>🔬 বৈজ্ঞানিক ভিত্তি ও সীমাবদ্ধতা (Scientific Methodology & Provenance):</strong>
        <p style={{ margin: '4px 0 0' }}>
          সিমুলেশন মডেলটি জাতিসংঘের খাদ্য ও কৃষি সংস্থা (FAO-33 Stewart Model) এবং পেনম্যান-মন্টেথ ইভাপোট্রান্সপিরেশন (FAO-56) নীতিমালার উপর ভিত্তি করে নির্ণীত।
          এটি মাটির পানি ভারসাম্য ও আর্দ্রতা ঘাটতি ভিত্তিক আনুমানিক ফলন ও লাভ-ক্ষতির গবেষণা মডেল। স্থানীয় মাটি পরীক্ষা (Soil Lab Test) ও প্রত্যক্ষ ফিল্ড ট্রায়াল ছাড়া এটি কোনো গ্যারান্টিযুক্ত বাণিজ্যিক চুক্তি নয়।
        </p>
      </div>
    </div>
  );
}
