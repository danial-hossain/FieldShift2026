// frontend/src/research3d/SixSeasonTrajectory3D.jsx
// Interactive 3D 6-Season Planning Trajectory & Multi-Year Field Rotation Visualizer
// Features: 6 chronologically arranged 3D seasonal parcels (Y1_S1 to Y3_S2), 3D crop morphology
// for recommended crops, botanical family alternation badges, legume BNF status, and interactive selection.

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

export function SixSeasonTrajectory3D({
  recommendations = [],
  selectedSeasonIndex = 0,
  onSelectSeason,
  strategy = 'balanced',
  lang = 'bn'
}) {
  const activeRec = recommendations[selectedSeasonIndex] || recommendations[0];

  const handleSceneReady = ({ scene }) => {
    const trajectoryGroup = new THREE.Group();

    // 6 Seasonal Parcels arranged in an elliptical chronological ring
    const radiusX = 6.2;
    const radiusZ = 3.8;

    recommendations.forEach((rec, idx) => {
      const angle = (idx / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radiusX;
      const z = Math.sin(angle) * radiusZ;
      const isSelected = selectedSeasonIndex === idx;

      const parcelGroup = new THREE.Group();
      parcelGroup.position.set(x, isSelected ? 0.35 : 0, z);

      // Soil Bed (Elevates if selected)
      const bedGeo = new THREE.BoxGeometry(2.2, 0.25, 2.2);
      const bedColor = rec.isLegume ? '#1e3a29' : '#2b1b10'; // Legume soil glows fertile dark green
      const bedMat = new THREE.MeshStandardMaterial({
        color: isSelected ? '#0284c7' : bedColor,
        roughness: 0.85
      });
      const bed = new THREE.Mesh(bedGeo, bedMat);
      bed.receiveShadow = true;
      parcelGroup.add(bed);

      // Earthen Bund
      const bundMat = new THREE.MeshStandardMaterial({ color: isSelected ? '#38bdf8' : '#4a3319' });
      const bundGeo = new THREE.BoxGeometry(2.35, 0.1, 0.12);
      const bund1 = new THREE.Mesh(bundGeo, bundMat);
      bund1.position.z = 1.15;
      parcelGroup.add(bund1);
      const bund2 = new THREE.Mesh(bundGeo, bundMat);
      bund2.position.z = -1.15;
      parcelGroup.add(bund2);

      // 3D Crop Model representing the specific recommended crop
      const cropHeight = Math.max(0.4, (rec.yieldTonHa || 3.0) * 0.16);
      const cropColor = rec.isLegume
        ? '#4ade80' // Legume bright green
        : rec.cropFamily.includes('Poaceae')
          ? '#eab308' // Cereal golden
          : '#38bdf8'; // Other cash crop

      const stalkGeo = new THREE.CylinderGeometry(0.04, 0.06, cropHeight, 8);
      const cropMat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.6 });
      const stalk = new THREE.Mesh(stalkGeo, cropMat);
      stalk.position.y = cropHeight / 2 + 0.12;
      stalk.castShadow = true;
      parcelGroup.add(stalk);

      // Canopy foliage
      const foliageGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const foliage = new THREE.Mesh(foliageGeo, cropMat);
      foliage.position.y = cropHeight + 0.2;
      parcelGroup.add(foliage);

      // Chronological Season Marker Pillar
      const markerGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
      const markerMat = new THREE.MeshBasicMaterial({ color: isSelected ? '#00df81' : '#64748b' });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(0, cropHeight + 0.65, 0);
      parcelGroup.add(marker);

      trajectoryGroup.add(parcelGroup);
    });

    // Connecting Chronological Ring Trajectory Spline
    const curvePoints = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      curvePoints.push(new THREE.Vector3(Math.cos(a) * radiusX, 0.05, Math.sin(a) * radiusZ));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const ringMat = new THREE.LineDashedMaterial({ color: '#38bdf8', dashSize: 0.4, gapSize: 0.2 });
    const ring = new THREE.Line(ringGeo, ringMat);
    ring.computeLineDistances();
    trajectoryGroup.add(ring);

    scene.add(trajectoryGroup);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      {/* 3D Seasonal Trajectory Canvas */}
      <Research3DScene
        cameraPosition={[0, 14, 14]}
        cameraTarget={[0, 0, 0]}
        hudTitle="6-SEASON FIELD ROTATION 3D"
        hudMetrics={[
          `Active: ${activeRec?.periodId || 'Y1_S1'}`,
          `Crop: ${activeRec?.cropName || 'Rice'}`,
          `Strategy: ${strategy.toUpperCase()}`
        ]}
        onSceneReady={handleSceneReady}
        minHeight="420px"
        lang={lang}
      />

      {/* Selected Season Rationale & Agronomic Constraints */}
      <div style={{ background: 'var(--glass-bg-card, rgba(15,23,42,0.8))', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid var(--glass-border, rgba(255,255,255,0.08))', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: 4, fontWeight: 800, fontSize: 11 }}>
            {activeRec?.periodId}
          </span>
          <span style={{ fontSize: 11.5, color: '#38bdf8', fontWeight: 700 }}>
            {activeRec?.calendarWindow}
          </span>
        </div>

        <div style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc' }}>
          {activeRec?.cropNameBn} ({activeRec?.cropName})
        </div>

        {/* Botanical Family & Legume Interval Badge */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '8px 10px', borderRadius: 6, fontSize: 11.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted)' }}>উদ্ভিদ পরিবার:</span>
            <strong style={{ color: '#cbd5e1' }}>{activeRec?.cropFamily}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>লেগিউম BNF স্ট্যাটাস:</span>
            <strong style={{ color: activeRec?.isLegume ? '#00df81' : '#f59e0b' }}>
              {activeRec?.isLegume ? '✅ ডালজাতীয় নাইট্রোজেন সংবন্ধন' : '🌾 অপুষ্টিকারক সিরিয়াল'}
            </strong>
          </div>
        </div>

        {/* Quantified Seasonal Outputs */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '8px 10px', borderRadius: 6, fontSize: 11.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted)' }}>অনুমিত ফলন:</span>
            <strong style={{ color: '#00df81' }}>{activeRec?.yieldTonHa} t/ha ({activeRec?.totalHarvestTons} টন)</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted)' }}>পানি চাহিদা:</span>
            <strong style={{ color: '#38bdf8' }}>{activeRec?.waterMm} mm</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>প্রত্যাশিত নিট লাভ:</span>
            <strong style={{ color: '#facc15' }}>৳{activeRec?.netProfitBdt?.toLocaleString()}</strong>
          </div>
        </div>

        {/* 6 Seasons Pill Selector */}
        <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
          {recommendations.map((r, idx) => (
            <button
              key={r.periodId}
              type="button"
              onClick={() => onSelectSeason && onSelectSeason(idx)}
              style={{
                padding: '4px 2px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: selectedSeasonIndex === idx ? 800 : 600,
                cursor: 'pointer',
                border: selectedSeasonIndex === idx ? '1px solid #00df81' : '1px solid var(--glass-border)',
                background: selectedSeasonIndex === idx ? '#00df81' : 'rgba(30, 41, 59, 0.6)',
                color: selectedSeasonIndex === idx ? '#04130c' : '#cbd5e1'
              }}
            >
              S{idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
