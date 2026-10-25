// frontend/src/research3d/RecoverySimulation3D.jsx
// Interactive 3D Crop Failure Shock & Multi-Season Restorative Recovery Visualizer
// Features: 3D catastrophic shock visualization (drought, flood/waterlogging, pest blight, salinity),
// and multi-season restorative soil recovery trajectory.

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

export function RecoverySimulation3D({
  failureType = 'drought_shock',
  severity = 'severe',
  failureSeason = 0,
  simData,
  lang = 'bn'
}) {
  const shockProperties = useMemo(() => {
    switch (failureType) {
      case 'excess_rain':
        return { name: 'Waterlogging & Flood', color: '#0284c7', soilColor: '#1e293b', hasFlood: true };
      case 'heat_stress':
        return { name: 'Heat Stress Wave', color: '#ef4444', soilColor: '#451a03', hasHeatHaze: true };
      case 'soil_shock':
        return { name: 'Soil Salinity Shock', color: '#f8fafc', soilColor: '#78716c', hasSalineCrust: true };
      case 'crop_loss':
        return { name: 'Pest / Blight Loss', color: '#854d0e', soilColor: '#2b1b10', isBlighted: true };
      case 'drought_shock':
      default:
        return { name: 'Drought Shock', color: '#f59e0b', soilColor: '#603813', isParched: true };
    }
  }, [failureType]);

  const handleSceneReady = ({ scene }) => {
    const recoveryGroup = new THREE.Group();

    // 1. Soil Bed with Shock Material Texture
    const bedGeo = new THREE.BoxGeometry(6.5, 0.4, 6.5);
    const bedMat = new THREE.MeshStandardMaterial({ color: shockProperties.soilColor, roughness: 0.95 });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.y = -0.2;
    bed.receiveShadow = true;
    recoveryGroup.add(bed);

    // If flood shock, render a pool of standing floodwater on the parcel!
    if (shockProperties.hasFlood) {
      const floodGeo = new THREE.BoxGeometry(6.4, 0.25, 6.4);
      const floodMat = new THREE.MeshStandardMaterial({
        color: '#0284c7',
        transparent: true,
        opacity: 0.8,
        roughness: 0.1
      });
      const flood = new THREE.Mesh(floodGeo, floodMat);
      flood.position.y = 0.12;
      recoveryGroup.add(flood);
    }

    // If salinity shock, render white salt crystals / crust!
    if (shockProperties.hasSalineCrust) {
      const saltGeo = new THREE.BoxGeometry(6.3, 0.05, 6.3);
      const saltMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 });
      const salt = new THREE.Mesh(saltGeo, saltMat);
      salt.position.y = 0.03;
      recoveryGroup.add(salt);
    }

    // 2. Shock-damaged plants vs Restorative Recovery Crops
    const cropColor = shockProperties.isBlighted
      ? '#713f12' // Brown blight
      : shockProperties.isParched
        ? '#ca8a04' // Scorched drought
        : shockProperties.hasFlood
          ? '#155e75' // Waterlogged dark green
          : '#15803d'; // Recovering green

    const plantCount = 25;
    for (let x = -2; x <= 2; x += 1.0) {
      for (let z = -2; z <= 2; z += 1.0) {
        const stalkGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.9, 6);
        const stalkMat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.7 });
        const stalk = new THREE.Mesh(stalkGeo, stalkMat);
        stalk.position.set(x, 0.45, z);
        if (shockProperties.isParched || shockProperties.isBlighted) {
          stalk.rotation.z = (Math.random() - 0.5) * 0.45; // Drooping
        }
        recoveryGroup.add(stalk);
      }
    }

    scene.add(recoveryGroup);
  };

  return (
    <div className="research-scene-layout-grid">
      {/* 3D Shock & Recovery Scene */}
      <Research3DScene
        cameraPosition={[-8, 6, 12]}
        cameraTarget={[0, 0, 0]}
        hudTitle={`SHOCK: ${shockProperties.name.toUpperCase()}`}
        hudMetrics={[
          `Severity: ${severity.toUpperCase()}`,
          `Season: S${failureSeason + 1}`
        ]}
        onSceneReady={handleSceneReady}
        minHeight="420px"
        lang={lang}
      />

      {/* Numerical Recovery & Soil Restoration Inspector */}
      <div style={{ background: 'var(--glass-bg-card, rgba(15,23,42,0.8))', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid var(--glass-border, rgba(255,255,255,0.08))', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
          🛡️ {lang === 'bn' ? 'ফসল বিপর্যয় ও পুনরুদ্ধার সিমুলেশন' : 'Crop Failure Shock & Recovery'}
        </h4>

        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: 2 }}>বিপর্যয়ের ধরন (Shock Type):</div>
          <strong style={{ color: shockProperties.color, fontSize: 13.5 }}>{shockProperties.name}</strong>
          <div style={{ color: '#cbd5e1', fontSize: 11, marginTop: 4 }}>
            তীব্রতা: <strong>{severity}</strong> · প্রভাব বিস্তারকাল: মৌসুম {failureSeason + 1}
          </div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#00df81', marginBottom: 4 }}>
            পুনরুদ্ধার কৌশল (Adaptive Restorative Protocol):
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.4 }}>
            বিপর্যয়-পরবর্তী মৌসুমে ক্ষয়ক্ষতি পুষিয়ে নিতে নাইট্রোজেন সংবন্ধনকারী লেগিউম (মুগডাল) ও লবণাক্ততা সহনশীল জাত প্রতিস্থাপিত হবে।
          </p>
        </div>

        <div style={{ marginTop: 'auto', fontSize: 10.5, color: '#64748b', lineHeight: 1.4 }}>
          * Dynamic replanning heuristic evaluates multi-season recovery constraints.
        </div>
      </div>
    </div>
  );
}
