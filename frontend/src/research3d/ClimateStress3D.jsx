// frontend/src/research3d/ClimateStress3D.jsx
// Interactive Professional 3D Climate Stress, Atmospheric Thermal Dome & Penman-Monteith ET0 Digital Twin
// Features: Geodesic atmospheric temperature dome, solar irradiance vectors with atmospheric depth,
// realistic furrow crop rows showing drought chlorosis vs thriving vegetative vigor,
// Penman-Monteith reference ET0 flux telemetry, and accessible 2D data table fallback.

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

// Procedural farm terrain texture with drought cracking / moisture variations
function createClimateTerrainTexture(isDrought) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = isDrought ? '#452b14' : '#2b1b10';
  ctx.fillRect(0, 0, 256, 256);

  const imgData = ctx.getImageData(0, 0, 256, 256);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 30;
    d[i] = Math.min(255, Math.max(0, d[i] + grain));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain * 0.75));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain * 0.5));
  }
  ctx.putImageData(imgData, 0, 0);

  // Furrow lines
  ctx.strokeStyle = isDrought ? 'rgba(30, 15, 5, 0.4)' : 'rgba(15, 8, 4, 0.3)';
  ctx.lineWidth = 3;
  for (let y = 16; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

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
  const isDrought = weatherScenario.includes('drought') || tempDeltaC >= 2.0;

  // Dome color based on temperature perturbation
  const domeColor = useMemo(() => {
    if (weatherScenario.includes('heatwave') || tempDeltaC >= 3.0) return '#ef4444';
    if (weatherScenario.includes('warming') || tempDeltaC >= 1.5) return '#f97316';
    if (weatherScenario.includes('drought')) return '#eab308';
    if (weatherScenario.includes('monsoon')) return '#0284c7';
    return '#38bdf8';
  }, [weatherScenario, tempDeltaC]);

  const handleSceneReady = ({ scene }) => {
    const climateGroup = new THREE.Group();

    // 1. Agricultural Farm Plot with Furrow Texture
    const groundGeo = new THREE.PlaneGeometry(18, 18);
    const groundTex = createClimateTerrainTexture(isDrought);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.94,
      metalness: 0.02
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    climateGroup.add(ground);

    // 2. Atmospheric Thermal Radiation Dome with Soft Depth
    const domeGeo = new THREE.SphereGeometry(9.5, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: domeColor,
      transparent: true,
      opacity: 0.22,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    climateGroup.add(dome);

    // Subtle thermal dome wireframe rim
    const rimMat = new THREE.MeshBasicMaterial({ color: domeColor, wireframe: true, transparent: true, opacity: 0.12 });
    const domeRim = new THREE.Mesh(domeGeo, rimMat);
    climateGroup.add(domeRim);

    // 3. Solar Radiation Pyranometer Source with Sun Glow
    const sunGeo = new THREE.SphereGeometry(0.85, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(6.5, 10.5, 4.5);
    climateGroup.add(sun);

    // Solar radiation rays towards farm center
    for (let r = 0; r < 8; r++) {
      const angle = (r / 8) * Math.PI * 2;
      const targetX = Math.cos(angle) * 5.5;
      const targetZ = Math.sin(angle) * 5.5;
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(6.5, 10.5, 4.5),
        new THREE.Vector3(targetX, 0.05, targetZ)
      ]);
      const rayMat = new THREE.LineBasicMaterial({
        color: domeColor,
        transparent: true,
        opacity: 0.35
      });
      climateGroup.add(new THREE.Line(rayGeo, rayMat));
    }

    // 4. Realistic Crop Plants in Furrow Rows (Realistic Tillers rather than simple cones!)
    const plantColor = stressDays > 14 ? '#ca8a04' : '#15803d';
    const plantMat = new THREE.MeshStandardMaterial({
      color: plantColor,
      roughness: 0.55,
      metalness: 0.05
    });

    // Generate natural multi-blade tiller geometry
    for (let x = -4.5; x <= 4.5; x += 1.8) {
      for (let z = -4.5; z <= 4.5; z += 1.8) {
        const plantGroup = new THREE.Group();
        plantGroup.position.set(x + (Math.random() - 0.5) * 0.2, 0, z + (Math.random() - 0.5) * 0.2);

        // 3 arched blade leaves per plant
        for (let b = 0; b < 3; b++) {
          const bladeAngle = (b / 3) * Math.PI * 2;
          const bladePoints = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(Math.cos(bladeAngle) * 0.22, 0.45, Math.sin(bladeAngle) * 0.22),
            new THREE.Vector3(Math.cos(bladeAngle) * 0.35, 0.35, Math.sin(bladeAngle) * 0.35)
          ];
          const bladeCurve = new THREE.CatmullRomCurve3(bladePoints);
          const bladeGeo = new THREE.TubeGeometry(bladeCurve, 6, 0.035, 4, false);
          const bladeMesh = new THREE.Mesh(bladeGeo, plantMat);
          bladeMesh.castShadow = true;
          plantGroup.add(bladeMesh);
        }
        climateGroup.add(plantGroup);
      }
    }

    scene.add(climateGroup);
  };

  // Custom Accessible 2D Table View
  const accessibleTableView = (
    <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: 14, borderRadius: 8 }}>
      <h5 style={{ margin: '0 0 10px', color: '#38bdf8', fontSize: 13, fontWeight: 800 }}>
        {lang === 'bn' ? 'জলবায়ু চাপ ও তাপমাত্রা পারটারবেশন সারণী' : 'Climate Stress & Telemetry Table'}
      </h5>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>দৃশ্যকল্প (Scenario):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#f8fafc' }}>{weatherScenario}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>সিমুলেটেড তাপমাত্রা:</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: domeColor }}>
              {currentTempC}°C (Δ{tempDeltaC >= 0 ? '+' : ''}{tempDeltaC}°C)
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>রেফারেন্স ET0 বৃদ্ধি:</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#f59e0b' }}>{et0Mm} mm/day</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>পানি চাপ দিন (Stress Days):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: stressDays > 12 ? '#ef4444' : '#00df81' }}>{stressDays} দিন</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>বৃষ্টিপাত বাজেট:</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#38bdf8' }}>{rainfallMm} mm</td>
          </tr>
          <tr>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>প্রত্যাশিত ফলন প্রভাব:</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: yieldTonHa >= 5.0 ? '#00df81' : '#f59e0b' }}>{yieldTonHa} t/ha</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div
      className="research-scene-layout-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: 16
      }}
    >
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
        fallbackTableView={accessibleTableView}
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
        <div style={{ marginTop: 'auto', background: 'rgba(15, 23, 42, 0.6)', padding: 10, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: 10.5, color: '#94a3b8' }}>
          🛰️ NASA POWER CERES/MERRA-2 গ্রিডেড ক্লাইমেট মডেল ভিত্তিক তাপমাত্রা পারটারবেশন।
        </div>
      </div>
    </div>
  );
}
