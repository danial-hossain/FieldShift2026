// frontend/src/research3d/CropGrowth3D.jsx
// Interactive Professional 3D Crop Growth, Phenology & Stewart Ky Yield-Response Digital Twin
// Features: Multi-culm tiller cluster morphology, arched leaf blades with midrib curves,
// nodding panicle with individual distichous spikelet glumes, acrylic digital-twin yield pillars,
// Stewart Ky yield deficit delta bridge, and accessible 2D data table fallback.

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

// Procedural texture for soil seedbed
function createCrumbBedTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#26180f';
  ctx.fillRect(0, 0, 256, 256);

  const imgData = ctx.getImageData(0, 0, 256, 256);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 32;
    d[i] = Math.min(255, Math.max(0, d[i] + grain));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain * 0.7));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain * 0.5));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

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

    // 1. Agricultural Soil Bed with Crumb Texture
    const bedGeo = new THREE.BoxGeometry(7.5, 0.45, 5.5, 4, 1, 4);
    const bedTexture = createCrumbBedTexture();
    const bedMat = new THREE.MeshStandardMaterial({
      map: bedTexture,
      roughness: 0.96,
      metalness: 0.02
    });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.y = -0.225;
    bed.receiveShadow = true;
    cropDisplayGroup.add(bed);

    // 2. Realistic Multi-Culm Tiller Cluster (Height scaled by day)
    const dayRatio = Math.min(1.0, Math.max(0.08, currentDay / 120));
    const plantHeight = 0.3 + dayRatio * 1.9;

    // Foliage color progression: lush green -> drought chlorosis -> golden ripening
    let plantColor = '#15803d';
    let panicleColor = '#84cc16';
    if (currentDay > 95) {
      plantColor = '#b45309'; // Golden-amber ripening
      panicleColor = '#eab308'; // Golden grain
    } else if (ks < 0.65) {
      plantColor = '#ca8a04'; // Drought chlorosis
      panicleColor = '#ca8a04';
    } else if (ks < 0.85) {
      plantColor = '#65a30d'; // Mild stress
    }

    const plantGroup = new THREE.Group();
    plantGroup.position.set(-1.6, 0, 0);

    const plantMat = new THREE.MeshStandardMaterial({
      color: plantColor,
      roughness: 0.45,
      metalness: 0.08
    });

    // 4 Distinct Curved Tillers/Culms radiating from crown
    const culmAngles = [0, Math.PI * 0.55, Math.PI * 1.1, Math.PI * 1.65];
    culmAngles.forEach((angle, cIdx) => {
      const culmHeight = plantHeight * (0.85 + (cIdx % 3) * 0.08);
      const culmPoints = [];
      const culmSegs = 8;
      for (let s = 0; s <= culmSegs; s++) {
        const t = s / culmSegs;
        const cy = t * culmHeight;
        const cx = Math.cos(angle) * (t * 0.22);
        const cz = Math.sin(angle) * (t * 0.22);
        culmPoints.push(new THREE.Vector3(cx, cy, cz));
      }
      const culmCurve = new THREE.CatmullRomCurve3(culmPoints);
      const culmGeo = new THREE.TubeGeometry(culmCurve, 12, 0.035 * (1 - cIdx * 0.08), 6, false);
      const culmMesh = new THREE.Mesh(culmGeo, plantMat);
      culmMesh.castShadow = true;
      plantGroup.add(culmMesh);

      // 3 Leaf blades attached along each culm
      for (let l = 0; l < 3; l++) {
        const attachT = 0.35 + l * 0.25;
        const origin = culmCurve.getPoint(attachT);
        const leafLen = culmHeight * 0.55;
        const leafAngle = angle + (l % 2 === 0 ? 0.45 : -0.45);

        const leafPoints = [
          origin,
          new THREE.Vector3(origin.x + Math.cos(leafAngle) * (leafLen * 0.6), origin.y + leafLen * 0.3, origin.z + Math.sin(leafAngle) * (leafLen * 0.6)),
          new THREE.Vector3(origin.x + Math.cos(leafAngle) * leafLen, origin.y - leafLen * 0.15, origin.z + Math.sin(leafAngle) * leafLen)
        ];
        const leafCurve = new THREE.CatmullRomCurve3(leafPoints);
        const leafGeo = new THREE.TubeGeometry(leafCurve, 8, 0.025, 4, false);
        const leafMesh = new THREE.Mesh(leafGeo, plantMat);
        leafMesh.castShadow = true;
        plantGroup.add(leafMesh);
      }
    });

    // 3. Nodding Panicle with Distichous Spikelet Glumes (Flowering / Maturity)
    if (currentDay > 60) {
      const panicleGroup = new THREE.Group();
      const apexY = plantHeight;
      const panicleLen = 0.75;

      // Curved nodding rachis
      const rachisPoints = [
        new THREE.Vector3(0, apexY, 0),
        new THREE.Vector3(0.18, apexY + 0.18, 0.08),
        new THREE.Vector3(0.38, apexY + 0.08, 0.18),
        new THREE.Vector3(0.48, apexY - 0.22, 0.24)
      ];
      const rachisCurve = new THREE.CatmullRomCurve3(rachisPoints);
      const rachisGeo = new THREE.TubeGeometry(rachisCurve, 10, 0.02, 6, false);
      const panicleMat = new THREE.MeshStandardMaterial({ color: panicleColor, roughness: 0.35 });
      const rachisMesh = new THREE.Mesh(rachisGeo, panicleMat);
      panicleGroup.add(rachisMesh);

      // Individual Distichous Grain Glumes (Oryza sativa spikelets)
      const glumeGeo = new THREE.CylinderGeometry(0.025, 0.015, 0.14, 6);
      for (let g = 0; g < 18; g++) {
        const gt = 0.2 + (g / 18) * 0.75;
        const pt = rachisCurve.getPoint(gt);
        const glume = new THREE.Mesh(glumeGeo, panicleMat);
        glume.position.set(pt.x + (Math.random() - 0.5) * 0.08, pt.y, pt.z + (Math.random() - 0.5) * 0.08);
        glume.rotation.z = 0.6 * (g % 2 === 0 ? 1 : -1);
        glume.rotation.x = Math.random() * 0.4;
        glume.castShadow = true;
        panicleGroup.add(glume);
      }
      plantGroup.add(panicleGroup);
    }
    cropDisplayGroup.add(plantGroup);

    // 4. Digital-Twin Yield Pillars (Potential Ym vs Actual Ya)
    const pillarGroup = new THREE.Group();
    pillarGroup.position.set(2.0, 0, 0);

    // Potential Yield Cylinder Pillar (Sky Blue with Glowing Edge)
    const potHeight = Math.max(0.15, potentialYieldTonHa * 0.55);
    const potGeo = new THREE.CylinderGeometry(0.42, 0.42, potHeight, 24);
    const potMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      metalness: 0.35,
      roughness: 0.25,
      transparent: true,
      opacity: 0.88
    });
    const potPillar = new THREE.Mesh(potGeo, potMat);
    potPillar.position.set(-0.75, potHeight / 2, 0);
    potPillar.castShadow = true;
    pillarGroup.add(potPillar);

    // Actual Simulated Yield Cylinder Pillar (Green if >=85% of potential, else Amber)
    const actHeight = Math.max(0.15, simulatedYieldTonHa * 0.55);
    const actColor = simulatedYieldTonHa >= potentialYieldTonHa * 0.85 ? '#00df81' : '#f59e0b';
    const actGeo = new THREE.CylinderGeometry(0.42, 0.42, actHeight, 24);
    const actMat = new THREE.MeshStandardMaterial({
      color: actColor,
      metalness: 0.35,
      roughness: 0.25,
      transparent: true,
      opacity: 0.88
    });
    const actPillar = new THREE.Mesh(actGeo, actMat);
    actPillar.position.set(0.75, actHeight / 2, 0);
    actPillar.castShadow = true;
    pillarGroup.add(actPillar);

    // Connecting Bridge Arch for Deficit Visualization
    const bridgeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.75, potHeight, 0),
      new THREE.Vector3(0, Math.max(potHeight, actHeight) + 0.3, 0),
      new THREE.Vector3(0.75, actHeight, 0)
    ]);
    const bridgeMat = new THREE.LineBasicMaterial({
      color: yieldDeficitPct > 15 ? '#ef4444' : '#00df81',
      linewidth: 2
    });
    const bridge = new THREE.Line(bridgeGeo, bridgeMat);
    pillarGroup.add(bridge);

    cropDisplayGroup.add(pillarGroup);
    scene.add(cropDisplayGroup);
  };

  // Custom Accessible 2D Table View
  const accessibleTableView = (
    <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: 14, borderRadius: 8 }}>
      <h5 style={{ margin: '0 0 10px', color: '#38bdf8', fontSize: 13, fontWeight: 800 }}>
        {lang === 'bn' ? 'ফসল বৃদ্ধি ও ফলন রেসপন্স সূচক' : 'Crop Phenology & Stewart Yield Table'}
      </h5>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>ফসল ও জাত:</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#f8fafc' }}>{cropNameBn} ({crop})</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>বর্তমান পর্যায় (Day {currentDay}):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#00df81' }}>{growthStageBn}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>সর্বোচ্চ সম্ভাব্য ফলন (Ym):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#38bdf8' }}>{potentialYieldTonHa} t/ha</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>সিমুলেটেড ফলন (Ya):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: simulatedYieldTonHa >= potentialYieldTonHa * 0.85 ? '#00df81' : '#f59e0b' }}>
              {simulatedYieldTonHa} t/ha
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>পানি চাপ সহগ (Ks):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: ks >= 0.85 ? '#00df81' : '#ef4444' }}>{ks}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>ফলন রেসপন্স ফ্যাক্টর (Ky):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#cbd5e1' }}>{ky}</td>
          </tr>
          <tr>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>ফলন ঘাটতি:</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: yieldDeficitPct > 15 ? '#ef4444' : '#00df81' }}>
              -{yieldDeficitPct}%
            </td>
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
        fallbackTableView={accessibleTableView}
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
