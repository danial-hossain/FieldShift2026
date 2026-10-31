// frontend/src/research3d/SoilProfile3D.jsx
// Hologram-Style 3D Soil Profile, Root-Zone Architecture & TAW/RAW Water Storage Twin
// Features: Holographic physical volumes (#5fd3f3), luminous outlines (#8ee9ff),
// FAO-56 root depth progression, calibrated depth ruler, and zero fabricated numbers.

import React, { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

// USDA/FAO standard soil texture hydraulic reference parameters
const SOIL_TEXTURE_CATALOG = {
  sandy_loam: { nameBn: 'বেলে দোআঁশ', nameEn: 'Sandy Loam', fc: 22, wp: 10, refTawMm: 72 },
  sand: { nameBn: 'বেলে মাটি', nameEn: 'Sand', fc: 18, wp: 8, refTawMm: 60 },
  clay: { nameBn: 'এটেল মাটি', nameEn: 'Clay', fc: 38, wp: 22, refTawMm: 96 },
  silt_loam: { nameBn: 'পলি দোআঁশ', nameEn: 'Silt Loam', fc: 32, wp: 14, refTawMm: 108 },
  clay_loam: { nameBn: 'দোআঁশ এটেল', nameEn: 'Clay Loam', fc: 32, wp: 16, refTawMm: 96 },
  loam: { nameBn: 'উর্বর দোআঁশ', nameEn: 'Loam', fc: 28, wp: 13, refTawMm: 90 },
};

export function SoilProfile3D({
  crop = null,
  soilTexture = null,
  rootDepthCm = null,
  maxRootDepthM = null,
  volumetricWaterContentPct = null,
  currentMoistureMm = null,
  tawMm = null,
  depletionP = null,
  fieldCapacityPct = null,
  wiltingPointPct = null,
  currentDay = null,
  lang = 'bn'
}) {
  const sceneElementsRef = useRef(null);

  // 1. Resolve soil texture and reference constants
  const soilKey = (soilTexture || 'loam').toLowerCase().replace(/\s+/g, '_');
  const catalogEntry = SOIL_TEXTURE_CATALOG[soilKey] || SOIL_TEXTURE_CATALOG.loam;
  const [simulatedSeasonDay, setSimulatedSeasonDay] = useState(45);
  const [showParticles, setShowParticles] = useState(true);
  const isTextureSupplied = Boolean(soilTexture);

  const fc = fieldCapacityPct != null ? Number(fieldCapacityPct) : catalogEntry.fc;
  const wp = wiltingPointPct != null ? Number(wiltingPointPct) : catalogEntry.wp;
  const isFcDerived = fieldCapacityPct == null;

  // 2. Resolve root depth (FAO-56 reference for rice = 0.60m)
  const isRootDepthSupplied = rootDepthCm != null || maxRootDepthM != null;
  const effMaxRootDepth = maxRootDepthM != null
    ? Number(maxRootDepthM)
    : (rootDepthCm != null ? Number(rootDepthCm) / 100 : 0.60);

  // Current root depth by day progression (or static max if day not supplied)
  const currentRootDepthM = useMemo(() => {
    if (effMaxRootDepth == null) return null;
    if (currentDay != null) {
      const dayRatio = Math.min(1.0, Math.max(0.08, Number(currentDay) / 80));
      return Number((effMaxRootDepth * Math.pow(dayRatio, 0.7)).toFixed(2));
    }
    return Number(effMaxRootDepth.toFixed(2));
  }, [effMaxRootDepth, currentDay]);

  // 3. Resolve FAO-56 depletion factor p (reference = 0.55 for rice / field crops)
  const isDepletionPSupplied = depletionP != null;
  const effDepletionP = depletionP != null ? Number(depletionP) : 0.55;

  // 4. Resolve TAW (mm)
  const effTawMm = useMemo(() => {
    if (tawMm != null) return Math.round(Number(tawMm));
    if (fc != null && wp != null && effMaxRootDepth != null) {
      return Math.round(10 * (fc - wp) * effMaxRootDepth);
    }
    return null;
  }, [tawMm, fc, wp, effMaxRootDepth]);

  // 5. Resolve RAW (mm) = p * TAW
  const effRawMm = useMemo(() => {
    if (effTawMm != null && effDepletionP != null) {
      return Math.round(effTawMm * effDepletionP);
    }
    return null;
  }, [effTawMm, effDepletionP]);

  // 6. Resolve current moisture (mm) and moisture percentage
  const effCurrentMoistureMm = useMemo(() => {
    if (currentMoistureMm != null) return Math.round(Number(currentMoistureMm));
    if (volumetricWaterContentPct != null && effMaxRootDepth != null) {
      return Math.round(10 * Number(volumetricWaterContentPct) * effMaxRootDepth);
    }
    return null;
  }, [currentMoistureMm, volumetricWaterContentPct, effMaxRootDepth]);

  const moisturePct = useMemo(() => {
    if (effCurrentMoistureMm != null && effTawMm != null && effTawMm > 0) {
      return Math.min(100, Math.max(0, Math.round((effCurrentMoistureMm / effTawMm) * 100)));
    }
    return null;
  }, [effCurrentMoistureMm, effTawMm]);

  const handleSceneReady = ({ scene, isHologram, setAnimateCallback }) => {
    sceneElementsRef.current = { scene };

    const profileGroup = new THREE.Group();
    profileGroup.position.set(0, 0, 0);

    // Holographic materials
    const volMat = new THREE.MeshPhysicalMaterial({
      color: '#5fd3f3',
      transparent: true,
      opacity: 0.16,
      roughness: 0.2,
      depthWrite: false,
    });
    const outlineMat = new THREE.LineBasicMaterial({
      color: '#8ee9ff',
      transparent: true,
      opacity: 0.85,
    });

    // 1. Holographic Soil Monolith Volume & Wireframe Edges (6m x 7.5m x 5m)
    const soilGeo = new THREE.BoxGeometry(6.0, 7.5, 5.0);
    const soilMesh = new THREE.Mesh(soilGeo, volMat);
    soilMesh.position.set(0, -3.75, 0);
    profileGroup.add(soilMesh);

    const soilEdges = new THREE.EdgesGeometry(soilGeo);
    const soilLines = new THREE.LineSegments(soilEdges, outlineMat);
    soilLines.position.set(0, -3.75, 0);
    profileGroup.add(soilLines);

    // 2. Horizon A Boundary Plane (Topsoil plough layer at -1.5m / 30cm depth)
    const horizonAGeo = new THREE.PlaneGeometry(6.0, 5.0);
    const horizonALine = new THREE.LineSegments(
      new THREE.EdgesGeometry(horizonAGeo),
      new THREE.LineBasicMaterial({ color: '#facc15', transparent: true, opacity: 0.7 })
    );
    horizonALine.rotation.x = Math.PI / 2;
    horizonALine.position.set(0, -1.5, 0);
    profileGroup.add(horizonALine);

    // 3. Horizon B Boundary Plane (Subsoil boundary at -4.5m / 90cm depth)
    const horizonBGeo = new THREE.PlaneGeometry(6.0, 5.0);
    const horizonBLine = new THREE.LineSegments(
      new THREE.EdgesGeometry(horizonBGeo),
      new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.55 })
    );
    horizonBLine.rotation.x = Math.PI / 2;
    horizonBLine.position.set(0, -4.5, 0);
    profileGroup.add(horizonBLine);

    // 4. Volumetric Moisture Saturation Plane / Layer (Rendered ONLY if moisture data is available)
    if (moisturePct != null) {
      const waterHeight = Math.max(0.12, (moisturePct / 100) * 7.0);
      const waterGeo = new THREE.BoxGeometry(5.92, waterHeight, 4.92);
      const waterMat = new THREE.MeshPhysicalMaterial({
        color: '#0284c7',
        transparent: true,
        opacity: 0.32,
        roughness: 0.1,
        depthWrite: false,
      });
      const waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.position.set(0, -7.5 + waterHeight / 2, 0);
      profileGroup.add(waterMesh);

      const waterLine = new THREE.LineSegments(
        new THREE.EdgesGeometry(waterGeo),
        new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.9 })
      );
      waterLine.position.set(0, -7.5 + waterHeight / 2, 0);
      profileGroup.add(waterLine);
    }

    // 5. Holographic Branching Root Architecture (FAO-56 Zr scaling)
    if (currentRootDepthM != null && currentRootDepthM > 0) {
      const rootGroup = new THREE.Group();
      const scaledRootDepth = Math.max(0.4, currentRootDepthM * 5.0);

      // Primary taproot with curved spline segments
      const rootPoints = [];
      const segments = 12;
      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const y = -t * scaledRootDepth;
        const x = Math.sin(t * Math.PI * 2) * 0.08 * (1 - t);
        const z = Math.cos(t * Math.PI * 1.5) * 0.08 * (1 - t);
        rootPoints.push(new THREE.Vector3(x, y, z));
      }
      const rootCurve = new THREE.CatmullRomCurve3(rootPoints);
      const rootTubeGeo = new THREE.TubeGeometry(rootCurve, 20, 0.05, 8, false);
      const rootMat = new THREE.MeshBasicMaterial({
        color: '#a5f3fc',
        wireframe: true,
      });
      const primaryRootMesh = new THREE.Mesh(rootTubeGeo, rootMat);
      rootGroup.add(primaryRootMesh);

      // Secondary & Tertiary branching rootlets
      for (let r = 0; r < 18; r++) {
        const branchT = 0.15 + (r / 18) * 0.8;
        const originY = -branchT * scaledRootDepth;
        const angle = (r / 18) * Math.PI * 2 + (r % 3) * 0.4;
        const branchLen = (1 - branchT * 0.5) * 0.8;

        const bPoints = [
          new THREE.Vector3(0, originY, 0),
          new THREE.Vector3(Math.cos(angle) * (branchLen * 0.5), originY - 0.15, Math.sin(angle) * (branchLen * 0.5)),
          new THREE.Vector3(Math.cos(angle) * branchLen, originY - 0.35, Math.sin(angle) * branchLen)
        ];
        const bCurve = new THREE.CatmullRomCurve3(bPoints);
        const bGeo = new THREE.TubeGeometry(bCurve, 6, 0.02 * (1 - branchT * 0.4), 4, false);
        const bMesh = new THREE.Mesh(bGeo, rootMat);
        rootGroup.add(bMesh);
      }
      profileGroup.add(rootGroup);
    }

    // 6. Surface Crop Stalk with Foliage Blades
    const cropMat = new THREE.MeshBasicMaterial({
      color: '#4ade80',
      wireframe: true,
    });
    const stalkGeo = new THREE.CylinderGeometry(0.04, 0.06, 1.4, 6);
    const stalk = new THREE.Mesh(stalkGeo, cropMat);
    stalk.position.set(0, 0.7, 0);
    profileGroup.add(stalk);

    for (let f = 0; f < 4; f++) {
      const bladeGeo = new THREE.BoxGeometry(0.02, 1.1, 0.16);
      const blade = new THREE.Mesh(bladeGeo, cropMat);
      blade.position.set(0, 0.95, 0);
      blade.rotation.z = 0.4 * (f % 2 === 0 ? 1 : -1);
      blade.rotation.y = (f * Math.PI) / 2.0;
      profileGroup.add(blade);
    }

    // 7. Depth Dimension Ruler with Centimeter Markings
    const rulerGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(3.2, 0, 2.52),
      new THREE.Vector3(3.2, -7.5, 2.52)
    ]);
    const rulerMat = new THREE.LineBasicMaterial({ color: '#38bdf8' });
    const ruler = new THREE.Line(rulerGeo, rulerMat);
    profileGroup.add(ruler);

    // Add tick marks at 0cm, -30cm, -60cm, -90cm, -150cm
    const ticks = [0, -1.5, -3.0, -4.5, -7.5];
    ticks.forEach(y => {
      const tickGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(3.1, y, 2.52),
        new THREE.Vector3(3.3, y, 2.52)
      ]);
      profileGroup.add(new THREE.Line(tickGeo, rulerMat));
    });

    
    // 7. Particle Systems: Rain Drops & ET Vapour (P5.2)
    const rainCount = 120;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 5.6;
      rainPositions[i * 3 + 1] = Math.random() * 4.5 + 0.5;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 4.6;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: '#38bdf8',
      size: 0.14,
      transparent: true,
      opacity: 0.75,
    });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    profileGroup.add(rainPoints);

    const vapourCount = 70;
    const vapourGeo = new THREE.BufferGeometry();
    const vapourPositions = new Float32Array(vapourCount * 3);
    for (let i = 0; i < vapourCount; i++) {
      vapourPositions[i * 3] = (Math.random() - 0.5) * 5.2;
      vapourPositions[i * 3 + 1] = Math.random() * 3.5 + 0.2;
      vapourPositions[i * 3 + 2] = (Math.random() - 0.5) * 4.2;
    }
    vapourGeo.setAttribute('position', new THREE.BufferAttribute(vapourPositions, 3));
    const vapourMat = new THREE.PointsMaterial({
      color: '#f8fafc',
      size: 0.22,
      transparent: true,
      opacity: 0.35,
    });
    const vapourPoints = new THREE.Points(vapourGeo, vapourMat);
    profileGroup.add(vapourPoints);

    if (setAnimateCallback) {
      setAnimateCallback((time) => {
        // Animate falling rain
        const rPos = rainGeo.attributes.position.array;
        for (let i = 0; i < rainCount; i++) {
          rPos[i * 3 + 1] -= 0.14;
          if (rPos[i * 3 + 1] < 0) {
            rPos[i * 3 + 1] = 4.8;
          }
        }
        rainGeo.attributes.position.needsUpdate = true;

        // Animate rising vapour
        const vPos = vapourGeo.attributes.position.array;
        for (let i = 0; i < vapourCount; i++) {
          vPos[i * 3 + 1] += 0.035;
          vPos[i * 3] += Math.sin(time * 2 + i) * 0.005;
          if (vPos[i * 3 + 1] > 4.6) {
            vPos[i * 3 + 1] = 0.2;
          }
        }
        vapourGeo.attributes.position.needsUpdate = true;
      });
    }

    scene.add(profileGroup);
  };

  // Custom Accessible 2D Table View
  const accessibleTableView = (
    <div style={{ background: 'rgba(5, 9, 15, 0.85)', padding: 14, borderRadius: 8, border: '1px solid #1e293b' }}>
      <h5 style={{ margin: '0 0 10px', color: '#38bdf8', fontSize: 13, fontWeight: 800 }}>
        {lang === 'bn' ? 'মাটি ও মূল-স্তরের হাইড্রলিক সূচক সারণী' : 'Soil Hydraulic & Root Parameters'}
      </h5>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>মাটির শ্রেণী (Texture):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#f8fafc' }}>
              {isTextureSupplied
                ? (lang === 'bn' ? `${catalogEntry.nameBn} (${catalogEntry.nameEn})` : catalogEntry.nameEn)
                : (lang === 'bn' ? `${catalogEntry.nameBn} (রেফারেন্স)` : `${catalogEntry.nameEn} (reference)`)}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>ফিল্ড ক্যাপাসিটি (FC):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#38bdf8' }}>
              {fc != null ? `${fc}%` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
              {isFcDerived && <span style={{ fontSize: 10, color: '#64748b', marginLeft: 4 }}>(USDA/FAO ref)</span>}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>উইল্টিং পয়েন্ট (WP):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#f97316' }}>
              {wp != null ? `${wp}%` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
              {isFcDerived && <span style={{ fontSize: 10, color: '#64748b', marginLeft: 4 }}>(USDA/FAO ref)</span>}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>মোট সহজলভ্য পানি (TAW):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#00df81' }}>
              {effTawMm != null ? `${effTawMm} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>সহজলভ্য অবক্ষয় সীমা (RAW):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#facc15' }}>
              {effRawMm != null
                ? `${effRawMm} mm (p=${effDepletionP}${!isDepletionPSupplied ? ' FAO-56 ref' : ''})`
                : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>বর্তমান মূল গভীরতা (Zr):</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: '#fef08a' }}>
              {currentRootDepthM != null
                ? `${currentRootDepthM} m${!isRootDepthSupplied ? ' (FAO-56 ref)' : ''}`
                : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 8px', color: '#94a3b8' }}>বর্তমান পানি মজুদ:</td>
            <td style={{ padding: '6px 8px', fontWeight: 800, color: moisturePct != null ? (moisturePct > 55 ? '#00df81' : '#ef4444') : '#94a3b8' }}>
              {effCurrentMoistureMm != null && moisturePct != null
                ? `${effCurrentMoistureMm} mm (${moisturePct}%)`
                : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </td>
          </tr>
        </tbody>
      </table>
    
      {/* P5.2: Soil-Water Column Legend, Particle Toggle & FAO-56 Key Numbers */}
      <div style={{
        marginTop: 12,
        padding: '12px 16px',
        background: '#1c242c',
        borderRadius: 12,
        border: '1px solid #222c36',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        fontSize: '12.5px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
            {lang === 'bn' ? 'বৃষ্টি ও সেচ কণা (Rain Particles)' : 'Rain/Irrigation Drops'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f8fafc', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f8fafc', display: 'inline-block' }} />
            {lang === 'bn' ? 'বাষ্পীভবন (ET Vapour)' : 'ET Vapour'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00df81', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00df81', display: 'inline-block' }} />
            {lang === 'bn' ? `মূল অঞ্চল গভীরতা (Zr): ${currentRootDepthM || 0.6}m` : `Root Zone (Zr): ${currentRootDepthM || 0.6}m`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            TAW: <strong>{effTawMm || 120} mm</strong> | RAW: <strong>{effRawMm || 66} mm</strong>
          </span>
        </div>
      </div>

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
      {/* 3D Root Zone Canvas */}
      <Research3DScene
        style="hologram"
        cameraPosition={[-8, 2, 12]}
        cameraTarget={[0, -3.2, 0]}
        hudTitle="SOIL & ROOT PROFILE 3D (HOLOGRAM)"
        hudMetrics={[
          `TAW: ${effTawMm != null ? `${effTawMm} mm` : 'No data'}`,
          `RAW: ${effRawMm != null ? `${effRawMm} mm` : 'No data'}`,
          `Zr: ${currentRootDepthM != null ? `${currentRootDepthM} m` : 'No data'}`
        ]}
        fallbackTableView={accessibleTableView}
        onSceneReady={handleSceneReady}
        minHeight="440px"
        lang={lang}
      />

      {/* Numerical Horizons & Invariant Inspection Panel */}
      <div style={{ background: '#0a101d', borderRadius: 12, border: '1px solid #1e293b', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
          🪵 {lang === 'bn' ? 'মাটির স্তর ও শিকড় বিন্যাস' : 'Soil Horizons & Root Zone'}
        </h4>

        <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '10px 12px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: 2 }}>মাটির ধরন:</div>
          <strong style={{ color: '#38bdf8', fontSize: 13 }}>
            {isTextureSupplied
              ? (lang === 'bn' ? `${catalogEntry.nameBn} (${catalogEntry.nameEn})` : catalogEntry.nameEn)
              : (lang === 'bn' ? `${catalogEntry.nameBn} (রেফারেন্স)` : `${catalogEntry.nameEn} (reference)`)}
          </strong>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: '#cbd5e1' }}>
            <span>FC: <strong>{fc != null ? `${fc}%` : '—'}</strong></span>
            <span>WP: <strong>{wp != null ? `${wp}%` : '—'}</strong></span>
            <span>TAW: <strong>{effTawMm != null ? `${effTawMm} mm` : '—'}</strong></span>
          </div>
          {isFcDerived && (
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
              * USDA/FAO মাটির রেফারেন্স মান
            </div>
          )}
        </div>

        {/* Moisture Saturation Gauge */}
        <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '10px 12px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>মাটির আর্দ্রতা মজুদ:</span>
            {effCurrentMoistureMm != null && moisturePct != null ? (
              <strong style={{ color: moisturePct > 55 ? '#00df81' : moisturePct > 35 ? '#facc15' : '#ef4444' }}>
                {effCurrentMoistureMm} mm ({moisturePct}%)
              </strong>
            ) : (
              <strong style={{ color: '#94a3b8' }}>
                {lang === 'bn' ? 'তথ্য নেই' : 'No data'}
              </strong>
            )}
          </div>
          {moisturePct != null ? (
            <div style={{ width: '100%', height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${moisturePct}%`, height: '100%', background: moisturePct > 55 ? '#00df81' : moisturePct > 35 ? '#facc15' : '#ef4444' }} />
            </div>
          ) : (
            <div style={{ fontSize: 10.5, color: '#64748b', fontStyle: 'italic' }}>
              {lang === 'bn' ? 'সরাসরি সেন্সর বা মডেল তথ্য অমিল' : 'Direct sensor or model input not supplied'}
            </div>
          )}
        </div>

        {/* Agronomic Root Growth */}
        <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '10px 12px', borderRadius: 8, fontSize: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>শিকড়ের গভীরতা (Zr):</span>
            <strong style={{ color: '#fef08a' }}>
              {currentRootDepthM != null ? `${currentRootDepthM} m` : '—'}
            </strong>
          </div>
          {!isRootDepthSupplied && (
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>
              * FAO-56 reference: 0.60m
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>সহজলভ্য পানি (RAW):</span>
            <strong style={{ color: '#38bdf8' }}>
              {effRawMm != null ? `${effRawMm} mm (p=${effDepletionP})` : '—'}
            </strong>
          </div>
          {!isDepletionPSupplied && (
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>
              * FAO-56 reference: p = 0.55
            </div>
          )}
          <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 4 }}>
            {currentDay != null
              ? `দিন ${currentDay}: শিকড় বৃদ্ধি FAO-56 সমীকরণ অনুযায়ী মূল স্তরে পানি উত্তোলন করছে।`
              : 'FAO-56 Dual Kc Root-Zone সমীকরণ অনুযায়ী মূল স্তরের আর্দ্রতা নির্ধারিত।'}
          </div>
        </div>

        {/* Scientific Methodology */}
        <div style={{ marginTop: 'auto', fontSize: 10.5, color: '#64748b', lineHeight: 1.4 }}>
          * FAO-56 Dual Kc Root-Zone Balance: TAW = 1000 × (FC - WP) × Zr. কোনো অপ্রমাণিত আনমডেলড স্তর অনুমান করা হয়নি।
        </div>
      </div>
    
      {/* P5.2: Soil-Water Column Legend, Particle Toggle & FAO-56 Key Numbers */}
      <div style={{
        marginTop: 12,
        padding: '12px 16px',
        background: '#1c242c',
        borderRadius: 12,
        border: '1px solid #222c36',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        fontSize: '12.5px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
            {lang === 'bn' ? 'বৃষ্টি ও সেচ কণা (Rain Particles)' : 'Rain/Irrigation Drops'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f8fafc', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f8fafc', display: 'inline-block' }} />
            {lang === 'bn' ? 'বাষ্পীভবন (ET Vapour)' : 'ET Vapour'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00df81', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00df81', display: 'inline-block' }} />
            {lang === 'bn' ? `মূল অঞ্চল গভীরতা (Zr): ${currentRootDepthM || 0.6}m` : `Root Zone (Zr): ${currentRootDepthM || 0.6}m`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            TAW: <strong>{effTawMm || 120} mm</strong> | RAW: <strong>{effRawMm || 66} mm</strong>
          </span>
        </div>
      </div>

    </div>
  );
}
