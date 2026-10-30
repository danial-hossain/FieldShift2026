// frontend/src/research3d/SensitivityAnalysis3D.jsx
// Interactive 3D Sensitivity Analysis & Parameter Sweep Visualizer
// Features: 3D multi-step response pillars across perturbation ranges (-20%, -10%, +10%, +20%),
// dynamic crop and water response scaling, parameter isolation controls, and linked numerical metrics.

import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import { runAgronomicSimulation } from '../experimentSimulationEngine.js';
import { Research3DScene } from './Research3DScene.jsx';

export function SensitivityAnalysis3D({
  activeField,
  lang = 'bn'
}) {
  const [targetParam, setTargetParam] = useState('irrigation'); // 'irrigation' | 'nitrogen' | 'temperature' | 'taw'

  const steps = [-20, -10, 0, 10, 20]; // Perturbation percentage steps

  // Compute 5 sweep points based on target parameter
  const sweepData = useMemo(() => {
    return steps.map((pct) => {
      const mult = 1 + pct / 100;
      const baseConfig = {
        crop: 'rice',
        areaHa: 10.0,
        soilTexture: 'loam',
        weatherScenario: pct > 0 && targetParam === 'temperature' ? 'warming_1_5c' : 'baseline',
        irrigationMm: targetParam === 'irrigation' ? Math.round(350 * mult) : 350,
        nitrogenKgHa: targetParam === 'nitrogen' ? Math.round(120 * mult) : 120,
        phosphorusKgHa: 60,
        potassiumKgHa: 60,
        sellingPriceMaund: 1250,
        randomSeed: 2026
      };

      const res = runAgronomicSimulation(baseConfig);
      return {
        stepPct: pct,
        label: `${pct >= 0 ? '+' : ''}${pct}%`,
        yieldTonHa: res.yieldOutcomes.simulatedYieldTonHa,
        waterMm: res.waterBalance.totalWaterAppliedMm,
        netReturnBdt: res.economics.netReturnPerHaBdt,
        ks: res.stressIndicators.averageKs
      };
    });
  }, [targetParam]);

  const handleSceneReady = ({ scene }) => {
    const sweepGroup = new THREE.Group();

    // Ground platform
    const platGeo = new THREE.BoxGeometry(10.0, 0.3, 4.0);
    const platMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.y = -0.15;
    sweepGroup.add(plat);

    // 5 Sweep Response Pillars (Height = simulated yield * 0.6)
    sweepData.forEach((pt, idx) => {
      const xPos = (idx - 2) * 1.8;
      const pillarHeight = Math.max(0.2, pt.yieldTonHa * 0.65);
      const isBaseline = pt.stepPct === 0;

      // Color: green for baseline, cyan for positive gains, amber for negative
      const pColor = isBaseline ? '#00df81' : pt.stepPct > 0 ? '#38bdf8' : '#f59e0b';
      const pillarGeo = new THREE.CylinderGeometry(0.35, 0.35, pillarHeight, 16);
      const pillarMat = new THREE.MeshStandardMaterial({ color: pColor, metalness: 0.2, roughness: 0.4 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(xPos, pillarHeight / 2, 0);
      pillar.castShadow = true;
      sweepGroup.add(pillar);

      // Crop on top of pillar
      const cropHeight = Math.max(0.2, pt.yieldTonHa * 0.25);
      const plantGeo = new THREE.ConeGeometry(0.18, cropHeight, 6);
      const plantMat = new THREE.MeshStandardMaterial({ color: pt.ks > 0.85 ? '#15803d' : '#eab308' });
      const plant = new THREE.Mesh(plantGeo, plantMat);
      plant.position.set(xPos, pillarHeight + cropHeight / 2, 0);
      sweepGroup.add(plant);
    });

    scene.add(sweepGroup);
  };

  return (
    <div className="research-scene-layout-grid">
      {/* 3D Sensitivity Response Canvas */}
      <Research3DScene
        cameraPosition={[-8, 6, 12]}
        cameraTarget={[0, 1.5, 0]}
        hudTitle="SENSITIVITY RESPONSE SWEEP 3D"
        hudMetrics={[
          `Param: ${targetParam.toUpperCase()}`,
          `Range: -20% to +20%`,
          `Steps: 5`
        ]}
        onSceneReady={handleSceneReady}
        minHeight="440px"
        lang={lang}
      />

      {/* Sweep Configuration & Result Table Panel */}
      <div style={{ background: 'var(--glass-bg-card, rgba(15,23,42,0.8))', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid var(--glass-border, rgba(255,255,255,0.08))', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
          📐 {lang === 'bn' ? 'সংবেদনশীলতা বিশ্লেষণ (Sensitivity Sweep)' : 'Sensitivity Sweep Controls'}
        </h4>

        {/* Parameter Selector */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
            টার্গেট ইনপুট প্যারামিটার নির্বাচন:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { id: 'irrigation', label: '💧 সেচ বাজেট' },
              { id: 'nitrogen', label: '🌱 নাইট্রোজেন' },
              { id: 'temperature', label: '🌡️ তাপমাত্রা' },
              { id: 'taw', label: '🪵 মাটির TAW' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTargetParam(p.id)}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: targetParam === p.id ? 800 : 600,
                  cursor: 'pointer',
                  border: targetParam === p.id ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: targetParam === p.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: targetParam === p.id ? '#38bdf8' : 'rgba(238, 243, 238, 0.68)'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sweep Results Table */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: 8, padding: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ padding: '4px 6px' }}>ধাপ (Step)</th>
                <th style={{ padding: '4px 6px' }}>ফলন (t/ha)</th>
                <th style={{ padding: '4px 6px' }}>সেচ (mm)</th>
                <th style={{ padding: '4px 6px' }}>নিট লাভ</th>
              </tr>
            </thead>
            <tbody>
              {sweepData.map((pt, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: pt.stepPct === 0 ? '#00df81' : '#f8fafc' }}>
                  <td style={{ padding: '4px 6px', fontWeight: pt.stepPct === 0 ? 800 : 500 }}>{pt.label} {pt.stepPct === 0 ? '(Base)' : ''}</td>
                  <td style={{ padding: '4px 6px', fontWeight: 700 }}>{pt.yieldTonHa}</td>
                  <td style={{ padding: '4px 6px', color: '#38bdf8' }}>{pt.waterMm}</td>
                  <td style={{ padding: '4px 6px', color: '#facc15' }}>৳{Math.round(pt.netReturnBdt / 1000)}k</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 'auto', fontSize: 10.5, color: '#64748b', lineHeight: 1.4 }}>
          * একবারে একটি পরিবর্তনশীল মান (One-Variable-At-A-Time / OAT) বিশ্লেষণ।
        </div>
      </div>
    </div>
  );
}
