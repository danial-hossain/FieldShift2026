// frontend/src/research3d/ClimateStress3D.jsx
// Interactive 3D Climate Stress & Thermal Dome Workbench
// Features: 3D farm parcel under atmospheric temperature dome, solar irradiance vectors,
// real-time Penman-Monteith ET0 flux, drought and heatwave comparisons, and stress days tracking.

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

export function ClimateStress3D({
  weatherScenario = 'warming_1_5c',
  tempDeltaC = 1.5,
  baseTempC = 28.5,
  et0Mm = 4.8,
  stressDays = 18,
  rainfallMm = 180,
  crop = 'rice',
  yieldTonHa = 4.85,
  lang = 'bn'
}) {
  const currentTempC = Number((baseTempC + tempDeltaC).toFixed(1));

  // Dome color based on temperature
  const domeColor = useMemo(() => {
    if (weatherScenario.includes('heatwave') || tempDeltaC >= 3.0) return '#ef4444';
    if (weatherScenario.includes('warming') || tempDeltaC >= 1.5) return '#f97316';
    if (weatherScenario.includes('drought')) return '#eab308';
    if (weatherScenario.includes('monsoon')) return '#0284c7';
    return '#38bdf8';
  }, [weatherScenario, tempDeltaC]);

  const handleSceneReady = ({ scene }) => {
    const climateGroup = new THREE.Group();

    // 1. Agricultural Farm Plot
    const groundGeo = new THREE.PlaneGeometry(16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: weatherScenario.includes('drought') ? '#573a20' : '#2b1b10',
      roughness: 0.95
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    climateGroup.add(ground);

    // 2. Atmospheric Thermal Radiation Dome
    const domeGeo = new THREE.SphereGeometry(9.0, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: domeColor,
      transparent: true,
      opacity: 0.18,
      wireframe: true
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    climateGroup.add(dome);

    // 3. Solar Radiation Pyranometer Source (Sun Sphere with Thermal Glare)
    const sunGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: domeColor });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(6, 10, 4);
    climateGroup.add(sun);

    // Thermal radiation rays
    for (let r = 0; r < 6; r++) {
      const angle = (r / 6) * Math.PI * 2;
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(6, 10, 4),
        new THREE.Vector3(Math.cos(angle) * 4.5, 0.1, Math.sin(angle) * 4.5)
      ]);
      const rayMat = new THREE.LineBasicMaterial({ color: domeColor, transparent: true, opacity: 0.45 });
      climateGroup.add(new THREE.Line(rayGeo, rayMat));
    }

    // 4. Stressed vs Thriving Crops in Rows
    const plantColor = stressDays > 14 ? '#eab308' : '#15803d';
    const cropMat = new THREE.MeshStandardMaterial({ color: plantColor, roughness: 0.6 });
    for (let x = -4; x <= 4; x += 1.6) {
      for (let z = -4; z <= 4; z += 1.6) {
        const plantGeo = new THREE.ConeGeometry(0.2, 0.8, 6);
        const plant = new THREE.Mesh(plantGeo, cropMat);
        plant.position.set(x, 0.4, z);
        plant.castShadow = true;
        climateGroup.add(plant);
      }
    }

    scene.add(climateGroup);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      {/* 3D Atmospheric Thermal Dome Canvas */}
      <Research3DScene
        cameraPosition={[-12, 10, 16]}
        cameraTarget={[0, 2, 0]}
        hudTitle="CLIMATE STRESS & THERMAL DOME 3D"
        hudMetrics={[
          `Temp: ${currentTempC}°C (Δ${tempDeltaC >= 0 ? '+' : ''}${tempDeltaC}°C)`,
          `ET0: ${et0Mm} mm/day`,
          `Stress: ${stressDays} days`
        ]}
        onSceneReady={handleSceneReady}
        minHeight="440px"
        lang={lang}
      />

      {/* Climate Impact & Penman-Monteith Telemetry */}
      <div style={{ background: 'var(--glass-bg-card, rgba(15,23,42,0.8))', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid var(--glass-border, rgba(255,255,255,0.08))', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
          🌡️ {lang === 'bn' ? 'জলবায়ু চাপ ও তাপমাত্রা পারটারবেশন' : 'Climate Stress & Thermal Impact'}
        </h4>

        {/* Temperature & Scenario Badge */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>সিমুলেটেড তাপমাত্রা:</span>
            <strong style={{ color: domeColor, fontSize: 13.5 }}>{currentTempC}°C</strong>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            বেসলাইন স্বাভাবিক থেকে {tempDeltaC >= 0 ? '+' : ''}{tempDeltaC}°C পরিবর্তন
          </div>
        </div>

        {/* Evapotranspiration ET0 Acceleration */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>রেফারেন্স ET0 বৃদ্ধি:</span>
            <strong style={{ color: '#f59e0b' }}>{et0Mm} mm/দিন</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>পানি ঘাটতি জনিত দিন:</span>
            <strong style={{ color: stressDays > 12 ? '#ef4444' : '#00df81' }}>{stressDays} দিন</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>প্রত্যাশিত ফলন প্রভাব:</span>
            <strong style={{ color: yieldTonHa >= 5.0 ? '#00df81' : '#f59e0b' }}>{yieldTonHa} t/ha</strong>
          </div>
        </div>

        {/* NASA POWER Gridded Model Notice */}
        <div style={{ marginTop: 'auto', background: 'rgba(15, 23, 42, 0.6)', padding: 10, borderRadius: 8, border: '1px solid var(--glass-border)', fontSize: 10.5, color: '#94a3b8' }}>
          🛰️ NASA POWER CERES/MERRA-2 গ্রিডেড ক্লাইমেট মডেল ভিত্তিক তাপমাত্রা পারটারবেশন।
        </div>
      </div>
    </div>
  );
}
