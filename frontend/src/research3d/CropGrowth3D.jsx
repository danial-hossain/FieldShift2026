// frontend/src/research3d/CropGrowth3D.jsx
// Interactive 3D Crop Growth, Phenology & Stewart Ky Yield-Response Visualizer
// Features: 3D procedural crop morphology, phenological growth stages, stress chlorosis,
// dual harvest yield pillars (Potential Ym vs Actual Ya), and 0.2 t/ha biological floor disclosure.

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

export function CropGrowth3D({
  crop = 'rice',
  cropNameBn = 'আমন ধান',
  currentDay = 120,
  growthStageName = 'Maturity / Ripening',
  growthStageBn = 'সোনালী ধান পরিপক্ব পর্যায়',
  simulatedYieldTonHa = 5.2,
  potentialYieldTonHa = 6.5,
  ks = 0.92,
  ky = 1.15,
  etaSumMm = 460,
  etcSumMm = 490,
  yieldFloorApplied = false,
  lang = 'bn'
}) {
  const yieldDeficitPct = potentialYieldTonHa > 0
    ? Math.max(0, Math.round(((potentialYieldTonHa - simulatedYieldTonHa) / potentialYieldTonHa) * 100))
    : 0;

  const handleSceneReady = ({ scene }) => {
    const cropDisplayGroup = new THREE.Group();

    // 1. Agricultural Soil Bed
    const bedGeo = new THREE.BoxGeometry(7.0, 0.4, 5.0);
    const bedMat = new THREE.MeshStandardMaterial({ color: '#2b1b10', roughness: 0.95 });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.y = -0.2;
    bed.receiveShadow = true;
    cropDisplayGroup.add(bed);

    // 2. Crop Plant Clump: Height scaled by day (0.15m at Day 1 -> 1.2m at Day 120)
    const dayRatio = Math.min(1.0, Math.max(0.08, currentDay / 120));
    const plantHeight = 0.2 + dayRatio * 1.8;

    // Plant foliage color: green when Ks >= 0.85, yellow chlorosis when Ks < 0.65, golden when mature
    let plantColor = '#15803d';
    if (currentDay > 95) {
      plantColor = '#ca8a04'; // Golden ripening
    } else if (ks < 0.65) {
      plantColor = '#eab308'; // Drought stress chlorosis
    } else if (ks < 0.85) {
      plantColor = '#84cc16'; // Mild stress
    }

    const plantGroup = new THREE.Group();
    plantGroup.position.set(-1.5, 0, 0);

    const stemGeo = new THREE.CylinderGeometry(0.04, 0.06, plantHeight, 8);
    const stemMat = new THREE.MeshStandardMaterial({ color: plantColor, roughness: 0.6 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = plantHeight / 2;
    stem.castShadow = true;
    plantGroup.add(stem);

    // Arched leaf blades
    const leafCount = Math.floor(4 + dayRatio * 6);
    for (let l = 0; l < leafCount; l++) {
      const angle = (l / leafCount) * Math.PI * 2;
      const bladeGeo = new THREE.BoxGeometry(0.02, plantHeight * 0.7, 0.18);
      const blade = new THREE.Mesh(bladeGeo, stemMat);
      blade.position.set(Math.cos(angle) * 0.1, plantHeight * 0.5, Math.sin(angle) * 0.1);
      blade.rotation.z = Math.cos(angle) * 0.4;
      blade.rotation.x = Math.sin(angle) * 0.4;
      plantGroup.add(blade);
    }

    // Seed panicle head if flowering or mature
    if (currentDay > 65) {
      const panicleGeo = new THREE.ConeGeometry(0.12, 0.6, 8);
      const panicleMat = new THREE.MeshStandardMaterial({ color: currentDay > 95 ? '#eab308' : '#84cc16' });
      const panicle = new THREE.Mesh(panicleGeo, panicleMat);
      panicle.position.set(0, plantHeight + 0.2, 0);
      panicle.rotation.z = 0.2;
      plantGroup.add(panicle);
    }
    cropDisplayGroup.add(plantGroup);

    // 3. Dual 3D Yield Pillars (Comparing Potential Ym vs Actual Ya)
    const pillarGroup = new THREE.Group();
    pillarGroup.position.set(2.0, 0, 0);

    // Potential Yield Pillar (Blue)
    const potHeight = Math.max(0.1, potentialYieldTonHa * 0.5);
    const potGeo = new THREE.CylinderGeometry(0.35, 0.35, potHeight, 16);
    const potMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', metalness: 0.3, roughness: 0.4 });
    const potPillar = new THREE.Mesh(potGeo, potMat);
    potPillar.position.set(-0.6, potHeight / 2, 0);
    potPillar.castShadow = true;
    pillarGroup.add(potPillar);

    // Actual Simulated Yield Pillar (Green or Amber)
    const actHeight = Math.max(0.1, simulatedYieldTonHa * 0.5);
    const actColor = simulatedYieldTonHa >= potentialYieldTonHa * 0.85 ? '#00df81' : '#f59e0b';
    const actGeo = new THREE.CylinderGeometry(0.35, 0.35, actHeight, 16);
    const actMat = new THREE.MeshStandardMaterial({ color: actColor, metalness: 0.3, roughness: 0.4 });
    const actPillar = new THREE.Mesh(actGeo, actMat);
    actPillar.position.set(0.6, actHeight / 2, 0);
    actPillar.castShadow = true;
    pillarGroup.add(actPillar);

    cropDisplayGroup.add(pillarGroup);

    scene.add(cropDisplayGroup);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      {/* 3D Crop Growth & Yield Pillars Canvas */}
      <Research3DScene
        cameraPosition={[-5, 3, 8]}
        cameraTarget={[0.5, 0.8, 0]}
        hudTitle="CROP PHENOLOGY & YIELD 3D"
        hudMetrics={[
          `Ya: ${simulatedYieldTonHa} t/ha`,
          `Ym: ${potentialYieldTonHa} t/ha`,
          `Ks: ${ks}`
        ]}
        onSceneReady={handleSceneReady}
        minHeight="440px"
        lang={lang}
      />

      {/* Numerical Phenology & Stewart Model Inspector */}
      <div style={{ background: 'var(--glass-bg-card, rgba(15,23,42,0.8))', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid var(--glass-border, rgba(255,255,255,0.08))', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
          🌾 {lang === 'bn' ? 'ফসল বৃদ্ধি ও ফলন রেসপন্স' : 'Crop Phenology & Yield Response'}
        </h4>

        {/* Current Growth Stage */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: 2 }}>বর্তমান পর্যায় (Day {currentDay}):</div>
          <strong style={{ color: '#00df81', fontSize: 13 }}>{growthStageBn}</strong>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{growthStageName}</div>
        </div>

        {/* Stewart Yield Model Equation */}
        <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: 11, fontFamily: 'monospace', color: '#38bdf8' }}>
          (1 - Ya/Ym) = Ky × (1 - ΣETa/ΣETc)
        </div>

        {/* Dual Yield Comparison Metrics */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>সম্ভাব্য ফলন (Ym):</span>
            <strong style={{ color: '#38bdf8' }}>{potentialYieldTonHa} t/ha</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>সিমুলেটেড ফলন (Ya):</span>
            <strong style={{ color: simulatedYieldTonHa >= potentialYieldTonHa * 0.85 ? '#00df81' : '#f59e0b' }}>
              {simulatedYieldTonHa} t/ha
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>পানি ঘাটতি জনিত ক্ষতি:</span>
            <strong style={{ color: yieldDeficitPct > 15 ? '#ef4444' : '#00df81' }}>
              -{yieldDeficitPct}% (Ky={ky})
            </strong>
          </div>
        </div>

        {/* 0.2 t/ha Modeling Floor Notification */}
        {yieldFloorApplied && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 10px', borderRadius: 8, fontSize: 11, color: '#fca5a5' }}>
            ⚠️ <strong>০.২ টন/হেক্টর ন্যূনতম ফ্লোর (মডেলিং অনুমান):</strong> চরম খরা বা পুষ্টি শূন্যতায় বায়োমাস/স্যালভেজ মডেলিংয়ের সুবিধার্থে নির্ধারিত ন্যূনতম মান; এটি কোনো সার্বজনীন জৈবিক নিয়ম নয়।
          </div>
        )}

        <div style={{ marginTop: 'auto', fontSize: 10.5, color: '#64748b', lineHeight: 1.4 }}>
          * FAO-33 স্টুয়ার্ট ওয়াটার-রেসপন্স মডেল অনুযায়ী গণনা করা হয়েছে।
        </div>
      </div>
    </div>
  );
}
