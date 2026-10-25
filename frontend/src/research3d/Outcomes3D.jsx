// frontend/src/research3d/Outcomes3D.jsx
// Interactive 3D Model Prediction vs. Empirical Ground Truth Validation Workbench
// Visualizes side-by-side 3D agricultural beds comparing MILP/Model expectations against real farmer observations:
// - Left Bed: Model Mathematical Forecast (Yield pillar, water budget, revenue badge)
// - Right Bed: Recorded Empirical Ground Truth (Real harvested yield, actual water applied, revenue)
// - Delta Variance Bridge: Visual 3D variance indicator showing model accuracy or prediction gap

import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

export function Outcomes3D({
  selectedOutcome,
  formPreview,
  activeField,
  formatNumber = (n, d = 1) => Number(n || 0).toFixed(d),
  lang = 'bn'
}) {
  const [metricMode, setMetricMode] = useState('yield'); // 'yield' | 'revenue' | 'water'

  // Resolve active data to display: either the selected historical outcome or the live form preview
  const data = useMemo(() => {
    if (selectedOutcome) {
      return {
        season: selectedOutcome.season_name || 'Rabi / Dry',
        crop: selectedOutcome.crop_planted || 'Potato',
        predYield: Number(selectedOutcome.predicted_yield_kg_ha || 25000),
        actYield: Number(selectedOutcome.actual_yield_kg_ha || 24500),
        predRev: Number(selectedOutcome.predicted_revenue_bdt || 250000),
        actRev: Number(selectedOutcome.actual_revenue_bdt || 245000),
        predWater: Number(selectedOutcome.predicted_water_mm || 500),
        actWater: Number(selectedOutcome.actual_water_mm || 470),
        yieldVar: Number(selectedOutcome.yield_variance_pct ?? -2.0),
        revVar: Number(selectedOutcome.revenue_variance_pct ?? -2.0),
        isGroundTruth: true
      };
    }
    if (formPreview) {
      const predY = Number(formPreview.predicted_yield_kg_ha || 25000);
      const actY = Number(formPreview.actual_yield_kg_ha || 24500);
      const predR = Number(formPreview.predicted_revenue_bdt || 250000);
      const actR = Number(formPreview.actual_revenue_bdt || 245000);
      const yVar = predY > 0 ? ((actY - predY) / predY) * 100 : 0;
      const rVar = predR > 0 ? ((actR - predR) / predR) * 100 : 0;
      return {
        season: formPreview.season_name || 'Current Input',
        crop: formPreview.crop_planted || 'Potato',
        predYield: predY,
        actYield: actY,
        predRev: predR,
        actRev: actR,
        predWater: Number(formPreview.predicted_water_mm || 500),
        actWater: Number(formPreview.actual_water_mm || 470),
        yieldVar: yVar,
        revVar: rVar,
        isGroundTruth: true
      };
    }
    return {
      season: 'Demo Benchmark (Bogura)',
      crop: 'Potato',
      predYield: 25000,
      actYield: 24500,
      predRev: 250000,
      actRev: 245000,
      predWater: 500,
      actWater: 470,
      yieldVar: -2.0,
      revVar: -2.0,
      isGroundTruth: false
    };
  }, [selectedOutcome, formPreview]);

  const handleSceneReady = ({ scene }) => {
    const rootGroup = new THREE.Group();

    // 1. Dual Plot Beds (Left: Predicted, Right: Actual)
    const bedGeo = new THREE.BoxGeometry(4.5, 0.4, 4.5);

    // Left Bed: Mathematical Model Prediction (Purple/Cyan accent)
    const predBedGroup = new THREE.Group();
    predBedGroup.position.set(-3.2, 0, 0);

    const predBedMat = new THREE.MeshStandardMaterial({
      color: 0x1b182b,
      roughness: 0.9,
      metalness: 0.1
    });
    const predBed = new THREE.Mesh(bedGeo, predBedMat);
    predBed.position.y = -0.2;
    predBed.receiveShadow = true;
    predBedGroup.add(predBed);

    // Model Prediction Luminous Frame
    const predBorderGeo = new THREE.BoxGeometry(4.65, 0.08, 4.65);
    const predBorderMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const predBorder = new THREE.Mesh(predBorderGeo, predBorderMat);
    predBorder.position.y = 0.04;
    predBedGroup.add(predBorder);

    // Left Crop Representation (Stylized model canopy)
    const predCropMat = new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.7 });
    for (let x = -1.3; x <= 1.3; x += 0.85) {
      for (let z = -1.3; z <= 1.3; z += 0.85) {
        const cropTiller = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 6), predCropMat);
        cropTiller.position.set(x, 0.4, z);
        cropTiller.castShadow = true;
        predBedGroup.add(cropTiller);
      }
    }

    // Left 3D Pillar (Predicted Value)
    const maxVal = metricMode === 'yield' ? 30000 : metricMode === 'revenue' ? 300000 : 600;
    const curPred = metricMode === 'yield' ? data.predYield : metricMode === 'revenue' ? data.predRev : data.predWater;
    const predHeight = Math.max(0.3, Math.min(3.8, (curPred / maxVal) * 3.5));

    const predPillarGeo = new THREE.CylinderGeometry(0.35, 0.35, predHeight, 16);
    const predPillarMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.3,
      roughness: 0.3,
      emissive: 0x581c87,
      emissiveIntensity: 0.4
    });
    const predPillar = new THREE.Mesh(predPillarGeo, predPillarMat);
    predPillar.position.set(1.4, predHeight / 2, 1.4);
    predPillar.castShadow = true;
    predBedGroup.add(predPillar);

    rootGroup.add(predBedGroup);

    // Right Bed: Empirical Ground Truth (Emerald if >= predicted, Amber if within 10%, Red if lower)
    const actBedGroup = new THREE.Group();
    actBedGroup.position.set(3.2, 0, 0);

    const actBedMat = new THREE.MeshStandardMaterial({
      color: 0x14201a,
      roughness: 0.9,
      metalness: 0.1
    });
    const actBed = new THREE.Mesh(bedGeo, actBedMat);
    actBed.position.y = -0.2;
    actBed.receiveShadow = true;
    actBedGroup.add(actBed);

    // Actual Outcome Border Color based on variance
    const isPositive = data.yieldVar >= 0;
    const borderColor = isPositive ? 0x00df81 : data.yieldVar >= -10 ? 0xf59e0b : 0xef4444;

    const actBorderGeo = new THREE.BoxGeometry(4.65, 0.08, 4.65);
    const actBorderMat = new THREE.MeshBasicMaterial({ color: borderColor });
    const actBorder = new THREE.Mesh(actBorderGeo, actBorderMat);
    actBorder.position.y = 0.04;
    actBedGroup.add(actBorder);

    // Right Crop Representation (Real observed vegetative health)
    const actCropMat = new THREE.MeshStandardMaterial({
      color: isPositive ? 0x10b981 : 0xd97706,
      roughness: 0.6
    });
    for (let x = -1.3; x <= 1.3; x += 0.85) {
      for (let z = -1.3; z <= 1.3; z += 0.85) {
        const cropTiller = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.85, 6), actCropMat);
        cropTiller.position.set(x, 0.42, z);
        cropTiller.castShadow = true;
        actBedGroup.add(cropTiller);
      }
    }

    // Right 3D Pillar (Observed Value)
    const curAct = metricMode === 'yield' ? data.actYield : metricMode === 'revenue' ? data.actRev : data.actWater;
    const actHeight = Math.max(0.3, Math.min(3.8, (curAct / maxVal) * 3.5));

    const actPillarGeo = new THREE.CylinderGeometry(0.35, 0.35, actHeight, 16);
    const actPillarMat = new THREE.MeshStandardMaterial({
      color: borderColor,
      metalness: 0.3,
      roughness: 0.3,
      emissive: isPositive ? 0x047857 : 0x78350f,
      emissiveIntensity: 0.4
    });
    const actPillar = new THREE.Mesh(actPillarGeo, actPillarMat);
    actPillar.position.set(-1.4, actHeight / 2, 1.4);
    actPillar.castShadow = true;
    actBedGroup.add(actPillar);

    rootGroup.add(actBedGroup);

    // Central Delta Variance Bridge
    const bridgeGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8);
    const bridgeMat = new THREE.MeshBasicMaterial({ color: borderColor });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 1.2, 0);
    rootGroup.add(bridge);

    // Central Delta Node Marker
    const deltaNodeGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const deltaNodeMat = new THREE.MeshStandardMaterial({
      color: borderColor,
      emissive: borderColor,
      emissiveIntensity: 0.5,
      roughness: 0.2
    });
    const deltaNode = new THREE.Mesh(deltaNodeGeo, deltaNodeMat);
    deltaNode.position.set(0, 1.2, 0);
    rootGroup.add(deltaNode);

    // Add Base Grid
    const grid = new THREE.GridHelper(16, 16, 0x334155, 0x1e293b);
    grid.position.y = -0.42;
    rootGroup.add(grid);

    scene.add(rootGroup);

    return () => {
      scene.remove(rootGroup);
      [predBedGeo, predBorderGeo, predPillarGeo, actBorderGeo, actPillarGeo, bridgeGeo, deltaNodeGeo].forEach(g => g?.dispose?.());
      [predBedMat, predBorderMat, predCropMat, predPillarMat, actBedMat, actBorderMat, actCropMat, actPillarMat, bridgeMat, deltaNodeMat].forEach(m => m?.dispose?.());
    };
  };

  const deltaPct = metricMode === 'yield' ? data.yieldVar : metricMode === 'revenue' ? data.revVar : (((data.actWater - data.predWater) / Math.max(1, data.predWater)) * 100);
  const deltaColor = deltaPct >= 0 ? '#00df81' : '#f87171';

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(168, 85, 247, 0.25)', background: '#0a0e14', marginBottom: '20px' }}>
      {/* 3D Scene Controls Header */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        right: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        pointerEvents: 'none',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          padding: '6px 14px',
          borderRadius: '999px',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'auto'
        }}>
          <span style={{ fontSize: '14px' }}>⚖️</span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.03em' }}>
            {lang === 'bn' ? 'ত্রিমাত্রিক পূর্বাভাস বনাম বাস্তব ফলাফল' : '3D PREDICTION VS. GROUND TRUTH'}
          </span>
          <span style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '999px',
            background: data.isGroundTruth ? 'rgba(0, 223, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: data.isGroundTruth ? '#00df81' : '#f59e0b',
            border: `1px solid ${data.isGroundTruth ? 'rgba(0, 223, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            fontWeight: 700
          }}>
            {data.isGroundTruth ? (lang === 'bn' ? 'প্রকৃত পর্যবেক্ষণ' : 'EMPIRICAL RECORD') : (lang === 'bn' ? 'বেঞ্চমার্ক মোড' : 'BENCHMARK')}
          </span>
        </div>

        {/* Metric Mode Switcher */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: '4px',
          pointerEvents: 'auto'
        }}>
          <button
            type="button"
            onClick={() => setMetricMode('yield')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: metricMode === 'yield' ? 'rgba(168, 85, 247, 0.3)' : 'transparent',
              color: metricMode === 'yield' ? '#c084fc' : '#94a3b8'
            }}
          >
            🌾 {lang === 'bn' ? 'ফলন (kg/ha)' : 'Yield'}
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('revenue')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: metricMode === 'revenue' ? 'rgba(0, 223, 129, 0.25)' : 'transparent',
              color: metricMode === 'revenue' ? '#00df81' : '#94a3b8'
            }}
          >
            💰 {lang === 'bn' ? 'রাজস্ব (BDT)' : 'Revenue'}
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('water')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: metricMode === 'water' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: metricMode === 'water' ? '#38bdf8' : '#94a3b8'
            }}
          >
            💧 {lang === 'bn' ? 'সেচ পানি (mm)' : 'Water'}
          </button>
        </div>
      </div>

      {/* Main Three.js Scene */}
      <Research3DScene
        cameraPosition={[0, 9, 14]}
        cameraTarget={[0, 0.5, 0]}
        minHeight="380px"
        hudTitle="EMPIRICAL VALIDATION MATRIX"
        hudMetrics={[
          { label: 'Crop', value: data.crop },
          { label: 'Season', value: data.season },
          {
            label: metricMode === 'yield' ? 'Pred Yield' : metricMode === 'revenue' ? 'Pred Rev' : 'Pred Water',
            value: metricMode === 'yield' ? `${formatNumber(data.predYield, 0)} kg/ha` : metricMode === 'revenue' ? `${formatNumber(data.predRev, 0)} ৳` : `${data.predWater} mm`,
            color: '#c084fc'
          },
          {
            label: metricMode === 'yield' ? 'Actual Yield' : metricMode === 'revenue' ? 'Actual Rev' : 'Actual Water',
            value: metricMode === 'yield' ? `${formatNumber(data.actYield, 0)} kg/ha` : metricMode === 'revenue' ? `${formatNumber(data.actRev, 0)} ৳` : `${data.actWater} mm`,
            color: deltaColor
          },
          {
            label: 'Variance Δ',
            value: `${deltaPct > 0 ? '+' : ''}${formatNumber(deltaPct, 1)}%`,
            color: deltaColor
          }
        ]}
        onSceneReady={handleSceneReady}
      />

      {/* 3D Legend Bar */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '12px',
        right: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '11.5px',
        color: '#94a3b8',
        zIndex: 10,
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#a855f7', display: 'inline-block' }}></span>
            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{lang === 'bn' ? 'বাম প্লট: গাণিতিক পূর্বাভাস (MILP)' : 'Left Plot: Model Forecast'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: deltaColor, display: 'inline-block' }}></span>
            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{lang === 'bn' ? 'ডান প্লট: মাঠের প্রকৃত তথ্য (Ground Truth)' : 'Right Plot: Field Observation'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#64748b' }}>{lang === 'bn' ? 'কন্ট্রোল: মাউস ড্র্যাগ করে ঘোরান • স্ক্রোল করে জুম করুন' : 'Controls: Orbit Drag • Scroll Zoom'}</span>
        </div>
      </div>
    </div>
  );
}
