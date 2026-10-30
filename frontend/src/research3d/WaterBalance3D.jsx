// frontend/src/research3d/WaterBalance3D.jsx
// Hologram-Style 3D Hydrological Water Balance, Irrigation Bucket & Mass-Conservation Engine
// Features: Holographic physical volumes (#5fd3f3), luminous outlines (#8ee9ff),
// particle flux streams along CatmullRomCurve3 with real flux speed, and zero fabricated numbers.

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

export function WaterBalance3D({
  rainfallMm = null,
  irrigationMm = null,
  etaMm = null,
  deepPercolationMm = null,
  initialStorageMm = null,
  currentStorageMm = null,
  tawMm = null,
  massResidualMm = null,
  lang = 'bn'
}) {
  const taw = tawMm != null ? Number(tawMm) : null;
  const currentStorage = currentStorageMm != null ? Number(currentStorageMm) : null;
  const storageRatio = (taw && currentStorage != null) ? Math.min(1.0, Math.max(0, currentStorage / taw)) : 0.5;

  const handleSceneReady = ({ scene, isHologram, setAnimateCallback }) => {
    const bucketGroup = new THREE.Group();

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

    // 1. Holographic Lysimeter Soil Column Volume & Edges
    const columnGeo = new THREE.BoxGeometry(4.2, 6.0, 4.2);
    const columnMesh = new THREE.Mesh(columnGeo, volMat);
    columnMesh.position.y = -3.0;
    bucketGroup.add(columnMesh);

    const columnEdges = new THREE.EdgesGeometry(columnGeo);
    const columnLine = new THREE.LineSegments(columnEdges, outlineMat);
    columnLine.position.y = -3.0;
    bucketGroup.add(columnLine);

    // 2. Storage Water Table Plane / Volume
    if (currentStorage != null && taw != null) {
      const waterHeight = Math.max(0.15, storageRatio * 5.8);
      const waterGeo = new THREE.BoxGeometry(4.05, waterHeight, 4.05);
      const waterMat = new THREE.MeshPhysicalMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.25,
        roughness: 0.1,
        depthWrite: false,
      });
      const waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.position.y = -6.0 + waterHeight / 2;
      bucketGroup.add(waterMesh);

      const waterEdges = new THREE.EdgesGeometry(waterGeo);
      const waterLine = new THREE.LineSegments(waterEdges, new THREE.LineBasicMaterial({ color: '#5fd3f3' }));
      waterLine.position.y = -6.0 + waterHeight / 2;
      bucketGroup.add(waterLine);
    }

    // 3. Dynamic Water Flow Particles along CatmullRomCurve3
    const activeStreams = [];
    const particleGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const particleMat = new THREE.MeshBasicMaterial({ color: '#8ee9ff' });

    // A. Rainfall Stream (Rain descending into column)
    if (rainfallMm != null && rainfallMm > 0) {
      const rainCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 3.5, 0),
        new THREE.Vector3(0, 1.8, 0),
        new THREE.Vector3(0, 0.1, 0),
      ]);
      const speed = Math.min(2.5, Math.max(0.4, Number(rainfallMm) / 10.0));
      const particles = [];
      for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(particleGeo, particleMat);
        bucketGroup.add(p);
        particles.push({ mesh: p, offset: i / 6.0 });
      }
      activeStreams.push({ curve: rainCurve, particles, speed });
    }

    // B. Irrigation Inflow Stream (Curving from side pipe)
    if (irrigationMm != null && irrigationMm > 0) {
      const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 12);
      const pipeMesh = new THREE.Mesh(pipeGeo, volMat);
      pipeMesh.rotation.z = Math.PI / 2;
      pipeMesh.position.set(2.8, 0.4, 0);
      bucketGroup.add(pipeMesh);

      const pipeLine = new THREE.LineSegments(new THREE.EdgesGeometry(pipeGeo), outlineMat);
      pipeLine.rotation.z = Math.PI / 2;
      pipeLine.position.set(2.8, 0.4, 0);
      bucketGroup.add(pipeLine);

      const irrigCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(2.8, 0.4, 0),
        new THREE.Vector3(1.6, 0.2, 0),
        new THREE.Vector3(0.5, -0.2, 0),
      ]);
      const speed = Math.min(2.5, Math.max(0.4, Number(irrigationMm) / 20.0));
      const particles = [];
      for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(particleGeo, particleMat);
        bucketGroup.add(p);
        particles.push({ mesh: p, offset: i / 6.0 });
      }
      activeStreams.push({ curve: irrigCurve, particles, speed });
    }

    // C. Evapotranspiration Upward Flux Stream
    if (etaMm != null && etaMm > 0) {
      const etaCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.5, 0),
        new THREE.Vector3(0, 1.2, 0),
        new THREE.Vector3(0, 2.8, 0),
      ]);
      const speed = Math.min(2.0, Math.max(0.3, Number(etaMm) / 3.0));
      const etaMat = new THREE.MeshBasicMaterial({ color: '#f59e0b' });
      const particles = [];
      for (let i = 0; i < 5; i++) {
        const p = new THREE.Mesh(particleGeo, etaMat);
        bucketGroup.add(p);
        particles.push({ mesh: p, offset: i / 5.0 });
      }
      activeStreams.push({ curve: etaCurve, particles, speed });
    }

    // D. Deep Percolation Downward Drainage Stream
    if (deepPercolationMm != null && deepPercolationMm > 0) {
      const dpCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -5.8, 0),
        new THREE.Vector3(0, -6.8, 0),
        new THREE.Vector3(0, -7.8, 0),
      ]);
      const speed = Math.min(2.0, Math.max(0.3, Number(deepPercolationMm) / 8.0));
      const dpMat = new THREE.MeshBasicMaterial({ color: '#c084fc' });
      const particles = [];
      for (let i = 0; i < 5; i++) {
        const p = new THREE.Mesh(particleGeo, dpMat);
        bucketGroup.add(p);
        particles.push({ mesh: p, offset: i / 5.0 });
      }
      activeStreams.push({ curve: dpCurve, particles, speed });
    }

    scene.add(bucketGroup);

    // Animation hook for particle flow
    setAnimateCallback?.((delta, elapsed) => {
      activeStreams.forEach((stream) => {
        stream.particles.forEach((pt) => {
          pt.offset = (pt.offset + delta * stream.speed * 0.4) % 1.0;
          const pos = stream.curve.getPoint(pt.offset);
          if (pos) pt.mesh.position.copy(pos);
        });
      });
    });
  };

  // 2D Accessible Table View
  const accessibleTableView = (
    <div style={{ background: 'var(--surface)', padding: 14, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <h5 style={{ margin: '0 0 10px', color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>
        {lang === 'bn' ? 'হাইড্রোলজিক্যাল পানি ভারসাম্য সারণী' : 'Hydrological Mass Balance Table'}
      </h5>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <td style={{ padding: '6px 8px', color: 'rgba(238, 243, 238, 0.68)' }}>বৃষ্টিপাত (Rainfall Inflow):</td>
            <td style={{ padding: '6px 8px', fontWeight: 700, color: '#38bdf8' }}>
              {rainfallMm != null ? `+${rainfallMm} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <td style={{ padding: '6px 8px', color: 'rgba(238, 243, 238, 0.68)' }}>সেচ পানি (Irrigation Inflow):</td>
            <td style={{ padding: '6px 8px', fontWeight: 700, color: '#00df81' }}>
              {irrigationMm != null ? `+${irrigationMm} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <td style={{ padding: '6px 8px', color: 'rgba(238, 243, 238, 0.68)' }}>বাষ্পীভবন (ETa Outflow):</td>
            <td style={{ padding: '6px 8px', fontWeight: 700, color: '#facc15' }}>
              {etaMm != null ? `-${etaMm} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <td style={{ padding: '6px 8px', color: 'rgba(238, 243, 238, 0.68)' }}>গভীর নিষ্কাশন (Percolation):</td>
            <td style={{ padding: '6px 8px', fontWeight: 700, color: '#c084fc' }}>
              {deepPercolationMm != null ? `-${deepPercolationMm} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <td style={{ padding: '6px 8px', color: 'rgba(238, 243, 238, 0.68)' }}>বর্তমান মজুদ (Storage):</td>
            <td style={{ padding: '6px 8px', fontWeight: 700, color: '#eef3ee' }}>
              {currentStorage != null && taw != null ? `${currentStorage} mm / ${taw} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px 8px', color: 'rgba(238, 243, 238, 0.68)' }}>ভর সংরক্ষণ অবশিষ্টাংশ:</td>
            <td style={{ padding: '6px 8px', fontWeight: 700, color: massResidualMm != null ? '#00df81' : 'rgba(238, 243, 238, 0.68)' }}>
              {massResidualMm != null ? `${Number(massResidualMm).toFixed(2)} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
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
      {/* 3D Hydrological Hologram Canvas */}
      <Research3DScene
        style="hologram"
        cameraPosition={[-7, 1, 10]}
        cameraTarget={[0, -2.5, 0]}
        hudTitle="WATER BALANCE 3D HOLOGRAPHIC LYSIMETER"
        hudMetrics={[
          currentStorage != null && taw != null ? `Storage: ${currentStorage}/${taw} mm` : 'Storage: No data',
          massResidualMm != null ? `Residual: ${Number(massResidualMm).toFixed(2)} mm` : 'Residual: No data',
        ]}
        fallbackTableView={accessibleTableView}
        onSceneReady={handleSceneReady}
        minHeight="440px"
        lang={lang}
      />

      {/* Numerical Hydrological Flux Accounting Panel */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#eef3ee' }}>
          💧 {lang === 'bn' ? 'হাইড্রোলজিক্যাল পানি ভারসাম্য ও ভর সংরক্ষণ' : 'Hydrological Mass Balance'}
        </h4>

        {/* Mass Balance Conservation Equation */}
        <div style={{ background: 'rgba(90, 169, 201, 0.1)', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(90, 169, 201, 0.25)', fontSize: 11, fontFamily: 'monospace', color: '#38bdf8' }}>
          ΔS = Rain + Irrig - ETa - Drainage
        </div>

        {/* Inflows Accounting */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: 6, fontSize: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>⬇️ {lang === 'bn' ? 'ইনপুট (INFLOWS)' : 'INFLOWS'}:</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'rgba(238, 243, 238, 0.68)' }}>{lang === 'bn' ? 'বৃষ্টিপাত (Rainfall):' : 'Rainfall:'}</span>
            <strong style={{ color: '#38bdf8' }}>
              {rainfallMm != null ? `+${rainfallMm} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(238, 243, 238, 0.68)' }}>{lang === 'bn' ? 'সেচ পানি (Irrigation):' : 'Irrigation:'}</span>
            <strong style={{ color: '#00df81' }}>
              {irrigationMm != null ? `+${irrigationMm} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </strong>
          </div>
        </div>

        {/* Outflows Accounting */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: 6, fontSize: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#facc15', marginBottom: 4 }}>⬆️ {lang === 'bn' ? 'আউটপুট (OUTFLOWS)' : 'OUTFLOWS'}:</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'rgba(238, 243, 238, 0.68)' }}>{lang === 'bn' ? 'বাষ্পীভবন (ETa):' : 'Evapotranspiration:'}</span>
            <strong style={{ color: '#facc15' }}>
              {etaMm != null ? `-${etaMm} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(238, 243, 238, 0.68)' }}>{lang === 'bn' ? 'নির্গমন (Deep Percolation):' : 'Deep Percolation:'}</span>
            <strong style={{ color: '#c084fc' }}>
              {deepPercolationMm != null ? `-${deepPercolationMm} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </strong>
          </div>
        </div>

        {/* Storage State & Residual */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: 6, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'rgba(238, 243, 238, 0.68)' }}>{lang === 'bn' ? 'বর্তমান মজুদ (St):' : 'Storage (St):'}</span>
            <strong style={{ color: '#eef3ee' }}>
              {currentStorage != null && taw != null ? `${currentStorage} mm / ${taw} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(238, 243, 238, 0.68)' }}>{lang === 'bn' ? 'ভর সংরক্ষণ অবশিষ্টাংশ:' : 'Mass Conservation Residual:'}</span>
            <strong style={{ color: massResidualMm != null ? '#00df81' : 'rgba(238, 243, 238, 0.68)' }}>
              {massResidualMm != null ? `${Number(massResidualMm).toFixed(2)} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
            </strong>
          </div>
        </div>

        <div style={{ marginTop: 'auto', fontSize: 11, color: 'rgba(238, 243, 238, 0.68)', lineHeight: 1.4 }}>
          ℹ️ {lang === 'bn'
            ? 'হলোগ্রাফিক পানি ভারসাম্য ডিজিটাল টুইন। সরাসরি উপাত্ত অনুপস্থিত থাকলে কোনো কৃত্তিম মান তৈরি করা হয় না।'
            : 'Holographic water balance digital twin. When real observation data is missing, no fabricated values are rendered.'}
        </div>
      </div>
    </div>
  );
}
export default WaterBalance3D;
