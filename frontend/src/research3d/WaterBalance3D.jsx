// frontend/src/research3d/WaterBalance3D.jsx
// Interactive 3D Hydrological Water Balance, Irrigation Bucket & Mass-Conservation Engine
// Features: 3D soil column, rainfall shower vectors, irrigation canal inflow, upward ETa flux,
// downward deep percolation drainage, dynamic storage water table, and real-time mass residual check.

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

export function WaterBalance3D({
  rainfallMm = 15,
  irrigationMm = 45,
  etaMm = 4.2,
  deepPercolationMm = 12.0,
  initialStorageMm = 80,
  currentStorageMm = 123.8,
  tawMm = 140,
  massResidualMm = 0.0,
  lang = 'bn'
}) {
  const taw = tawMm || 140;
  const storageRatio = Math.min(1.0, Math.max(0, currentStorageMm / taw));

  const handleSceneReady = ({ scene }) => {
    const bucketGroup = new THREE.Group();

    // 1. Transparent Cylindrical/Box Lysimeter Soil Column
    const columnGeo = new THREE.BoxGeometry(4.2, 6.0, 4.2);
    const columnMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const columnFrame = new THREE.Mesh(columnGeo, columnMat);
    columnFrame.position.y = -3.0;
    bucketGroup.add(columnFrame);

    // Soil Medium Inside Lysimeter
    const soilGeo = new THREE.BoxGeometry(4.0, 5.9, 4.0);
    const soilMat = new THREE.MeshStandardMaterial({
      color: '#382212',
      roughness: 0.95,
      metalness: 0.05
    });
    const soilMesh = new THREE.Mesh(soilGeo, soilMat);
    soilMesh.position.y = -3.0;
    bucketGroup.add(soilMesh);

    // Dynamic Saturated Soil Water Storage Layer (Height = storageRatio * 5.8)
    const waterHeight = Math.max(0.1, storageRatio * 5.8);
    const waterGeo = new THREE.BoxGeometry(4.05, waterHeight, 4.05);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.4
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -6.0 + waterHeight / 2;
    bucketGroup.add(waterMesh);

    // 2. Inflow: Rainfall Flux (Blue descending arrows from cloud plane)
    if (rainfallMm > 0) {
      const rainArrowGeo = new THREE.ConeGeometry(0.15, 0.5, 8);
      const rainArrowMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
      for (let r = 0; r < 5; r++) {
        const arrow = new THREE.Mesh(rainArrowGeo, rainArrowMat);
        arrow.rotation.x = Math.PI; // Pointing downward
        arrow.position.set((r - 2) * 0.7, 1.8, 0);
        bucketGroup.add(arrow);

        // Rain track line
        const rainLineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3((r - 2) * 0.7, 3.2, 0),
          new THREE.Vector3((r - 2) * 0.7, 1.8, 0)
        ]);
        const rainLine = new THREE.Line(rainLineGeo, new THREE.LineBasicMaterial({ color: '#38bdf8' }));
        bucketGroup.add(rainLine);
      }
    }

    // 3. Inflow: Irrigation Pipe (Cyan inflow pipe from right)
    if (irrigationMm > 0) {
      const pipeGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.0, 16);
      const pipeMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 });
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(3.0, 0.4, 0);
      bucketGroup.add(pipe);

      // Water stream jet into soil
      const jetGeo = new THREE.CylinderGeometry(0.12, 0.08, 1.2, 8);
      const jetMat = new THREE.MeshStandardMaterial({ color: '#00df81', transparent: true, opacity: 0.8 });
      const jet = new THREE.Mesh(jetGeo, jetMat);
      jet.rotation.z = -Math.PI / 4;
      jet.position.set(1.8, 0.1, 0);
      bucketGroup.add(jet);
    }

    // 4. Outflow: Evapotranspiration ETa (Amber upward ascending vectors)
    if (etaMm > 0) {
      const etaArrowGeo = new THREE.ConeGeometry(0.14, 0.45, 8);
      const etaArrowMat = new THREE.MeshBasicMaterial({ color: '#f59e0b' });
      for (let e = -1; e <= 1; e++) {
        const arrow = new THREE.Mesh(etaArrowGeo, etaArrowMat);
        arrow.position.set(e * 1.0, 1.6, 0);
        bucketGroup.add(arrow);

        const etaLineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(e * 1.0, 0.2, 0),
          new THREE.Vector3(e * 1.0, 1.6, 0)
        ]);
        const etaLine = new THREE.Line(etaLineGeo, new THREE.LineBasicMaterial({ color: '#f59e0b' }));
        bucketGroup.add(etaLine);
      }
    }

    // 5. Outflow: Deep Percolation Drainage (Purple downward arrows below root zone)
    if (deepPercolationMm > 0) {
      const dpArrowGeo = new THREE.ConeGeometry(0.16, 0.5, 8);
      const dpArrowMat = new THREE.MeshBasicMaterial({ color: '#c084fc' });
      const dp = new THREE.Mesh(dpArrowGeo, dpArrowMat);
      dp.rotation.x = Math.PI; // Downward
      dp.position.set(0, -6.8, 0);
      bucketGroup.add(dp);

      const dpLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -6.0, 0),
        new THREE.Vector3(0, -6.8, 0)
      ]);
      bucketGroup.add(new THREE.Line(dpLineGeo, new THREE.LineBasicMaterial({ color: '#c084fc' })));
    }

    scene.add(bucketGroup);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      {/* 3D Hydrological Mass Balance Canvas */}
      <Research3DScene
        cameraPosition={[-7, 1, 10]}
        cameraTarget={[0, -2.5, 0]}
        hudTitle="WATER BALANCE 3D LYSIMETER"
        hudMetrics={[
          `Storage: ${currentStorageMm}/${tawMm} mm`,
          `Residual: ${massResidualMm.toFixed(2)} mm`
        ]}
        onSceneReady={handleSceneReady}
        minHeight="440px"
        lang={lang}
      />

      {/* Numerical Hydrological Flux Accounting Panel */}
      <div style={{ background: 'var(--glass-bg-card, rgba(15,23,42,0.8))', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid var(--glass-border, rgba(255,255,255,0.08))', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
          💧 {lang === 'bn' ? 'হাইড্রোলজিক্যাল পানি ভারসাম্য ও ভর সংরক্ষণ' : 'Hydrological Mass Balance'}
        </h4>

        {/* Mass Balance Conservation Equation Badge */}
        <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: 11, fontFamily: 'monospace', color: '#38bdf8' }}>
          ΔS = Rain + Irrig - ETa - Drainage
        </div>

        {/* Inflows Accounting */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', marginBottom: 4 }}>⬇️ ইনপুট (INFLOWS):</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>বৃষ্টিপাত (Rainfall):</span>
            <strong style={{ color: '#38bdf8' }}>+{rainfallMm} mm</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>সেচ পানি (Irrigation):</span>
            <strong style={{ color: '#00df81' }}>+{irrigationMm} mm</strong>
          </div>
        </div>

        {/* Outflows Accounting */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', marginBottom: 4 }}>⬆️ আউটপুট (OUTFLOWS):</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>বাষ্পীভবন (ETa):</span>
            <strong style={{ color: '#f59e0b' }}>-{etaMm} mm</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>নির্গমন (Deep Percolation):</span>
            <strong style={{ color: '#c084fc' }}>-{deepPercolationMm} mm</strong>
          </div>
        </div>

        {/* Storage State & Strict Mass Conservation Residual */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>বর্তমান মজুদ (St):</span>
            <strong style={{ color: '#f8fafc' }}>{currentStorageMm} mm / {tawMm} mm</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>ভর সংরক্ষণ অবশিষ্টাংশ:</span>
            <strong style={{ color: Math.abs(massResidualMm) < 0.05 ? '#00df81' : '#f87171' }}>
              {massResidualMm.toFixed(2)} mm (Exact)
            </strong>
          </div>
        </div>

        {/* Transparent Model Assumptions */}
        <div style={{ marginTop: 'auto', fontSize: 10.5, color: '#64748b', lineHeight: 1.4 }}>
          * মডেলের সীমানা: ক্যানোপি ইন্টারসেপশন এবং পৃষ্ঠীয় রান-অফ মডেলের আওতাভুক্ত নয় বিধায় দৃশ্যত বাদ রাখা হয়েছে।
        </div>
      </div>
    </div>
  );
}
