// frontend/src/research3d/NutrientProfile3D.jsx
// Interactive 3D Soil Nutrient Profile, Root Rhizosphere & Biological Nitrogen Fixation (BNF) Engine
// Features: 3D soil strata, N-P-K nutrient density spheres, BNF legume root nodules, and nitrogen-response indicators.

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

export function NutrientProfile3D({
  nitrogenKgHa = 120,
  phosphorusKgHa = 60,
  potassiumKgHa = 60,
  organicMatterPct = 1.85,
  soilPh = 6.8,
  crop = 'rice',
  isLegume = false,
  nitrogenStressFactor = 1.0,
  lang = 'bn'
}) {
  const handleSceneReady = ({ scene }) => {
    const nutrientGroup = new THREE.Group();

    // 1. Soil Column Profile
    const soilGeo = new THREE.BoxGeometry(5.0, 5.0, 5.0);
    const soilMat = new THREE.MeshStandardMaterial({
      color: '#2a1a0f',
      roughness: 0.95
    });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = -2.5;
    nutrientGroup.add(soil);

    // 2. 3D Root Architecture
    const tapGeo = new THREE.CylinderGeometry(0.06, 0.02, 3.2, 8);
    const rootMat = new THREE.MeshStandardMaterial({ color: '#fef08a', roughness: 0.5 });
    const tapRoot = new THREE.Mesh(tapGeo, rootMat);
    tapRoot.position.y = -1.6;
    nutrientGroup.add(tapRoot);

    // If Legume (BNF), add pink/cream Rhizobium root nodules!
    if (isLegume) {
      const noduleGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const noduleMat = new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.3 }); // Rhizobium pink
      for (let n = 0; n < 16; n++) {
        const nodule = new THREE.Mesh(noduleGeo, noduleMat);
        nodule.position.set(
          (Math.random() - 0.5) * 0.4,
          -0.6 - Math.random() * 2.2,
          (Math.random() - 0.5) * 0.4
        );
        nutrientGroup.add(nodule);
      }
    }

    // 3. Floating Nutrient Ion Spheres (N=Cyan, P=Orange, K=Purple)
    // Nitrogen particles (count scaled by nitrogenKgHa)
    const nCount = Math.min(45, Math.floor((nitrogenKgHa / 150) * 45));
    const nGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const nMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' }); // Nitrogen Cyan
    for (let i = 0; i < nCount; i++) {
      const p = new THREE.Mesh(nGeo, nMat);
      p.position.set((Math.random() - 0.5) * 4.4, -0.4 - Math.random() * 2.4, (Math.random() - 0.5) * 4.4);
      nutrientGroup.add(p);
    }

    // Phosphorus particles
    const pCount = Math.min(25, Math.floor((phosphorusKgHa / 80) * 25));
    const pMat = new THREE.MeshBasicMaterial({ color: '#f97316' }); // Phosphorus Orange
    for (let i = 0; i < pCount; i++) {
      const p = new THREE.Mesh(nGeo, pMat);
      p.position.set((Math.random() - 0.5) * 4.4, -0.8 - Math.random() * 2.2, (Math.random() - 0.5) * 4.4);
      nutrientGroup.add(p);
    }

    // Potassium particles
    const kCount = Math.min(25, Math.floor((potassiumKgHa / 80) * 25));
    const kMat = new THREE.MeshBasicMaterial({ color: '#c084fc' }); // Potassium Purple
    for (let i = 0; i < kCount; i++) {
      const p = new THREE.Mesh(nGeo, kMat);
      p.position.set((Math.random() - 0.5) * 4.4, -1.2 - Math.random() * 2.6, (Math.random() - 0.5) * 4.4);
      nutrientGroup.add(p);
    }

    scene.add(nutrientGroup);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
      {/* 3D Rhizosphere & Nutrient Density Canvas */}
      <Research3DScene
        cameraPosition={[-7, 1, 9]}
        cameraTarget={[0, -2.0, 0]}
        hudTitle="NUTRIENT PROFILE & BNF 3D"
        hudMetrics={[
          `N: ${nitrogenKgHa} kg/ha`,
          `P: ${phosphorusKgHa} kg/ha`,
          `K: ${potassiumKgHa} kg/ha`
        ]}
        onSceneReady={handleSceneReady}
        minHeight="440px"
        lang={lang}
      />

      {/* Numerical Nutrient Availability Panel */}
      <div style={{ background: 'var(--glass-bg-card, rgba(15,23,42,0.8))', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid var(--glass-border, rgba(255,255,255,0.08))', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
          🧪 {lang === 'bn' ? 'মাটির পুষ্টি ও নাইট্রোজেন ভারসাম্য' : 'Soil Nutrient Profile & BNF'}
        </h4>

        {/* N-P-K Regimes */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', marginBottom: 4 }}>
            প্রয়োগকৃত রাসায়নিক পুষ্টি মাত্রা (N-P-K):
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: '#38bdf8' }}>নাইট্রোজেন (N):</span>
            <strong>{nitrogenKgHa} kg/ha</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: '#f97316' }}>ফসফরাস (P₂O₅):</span>
            <strong>{phosphorusKgHa} kg/ha</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#c084fc' }}>পটাশিয়াম (K₂O):</span>
            <strong>{potassiumKgHa} kg/ha</strong>
          </div>
        </div>

        {/* Biological Nitrogen Fixation (BNF) Status */}
        <div style={{ background: isLegume ? 'rgba(244, 114, 182, 0.15)' : 'rgba(30, 41, 59, 0.5)', border: isLegume ? '1px solid rgba(244, 114, 182, 0.3)' : '1px solid var(--glass-border)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span style={{ fontWeight: 800, color: isLegume ? '#f472b6' : '#cbd5e1' }}>
              {isLegume ? '🌱 রাইজোবিয়াম নোডিউল সক্রিয় (BNF)' : '🌾 অপুষ্টিকারক সিরিয়াল ফসল'}
            </span>
            <span style={{ fontSize: 11, color: isLegume ? '#00df81' : '#f59e0b', fontWeight: 800 }}>
              {isLegume ? '+45 kg N/ha' : '-25 kg N/ha'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
            {isLegume
              ? 'শিমজাতীয় ফসলের মূলে রাইজোবিয়াম ব্যাকটেরিয়া প্রাকৃতিকভাবে বায়বীয় নাইট্রোজেন মাটিতে সংবন্ধন করছে।'
              : 'সিরিয়াল ফসল মাটি থেকে উল্লেখযোগ্য নাইট্রোজেন শোষণ করে সঞ্চিত উর্বরতা হ্রাস করে।'}
          </p>
        </div>

        {/* Soil Organic Matter & pH */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>জৈব পদার্থ (OM):</span>
            <strong style={{ color: '#f8fafc' }}>{organicMatterPct}%</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>মাটির পিএইচ (pH):</span>
            <strong style={{ color: '#f8fafc' }}>{soilPh} (Neutral)</strong>
          </div>
        </div>

        {/* Scientific Disclosures */}
        <div style={{ marginTop: 'auto', fontSize: 10.5, color: '#64748b', lineHeight: 1.4 }}>
          * মডেলের সীমাবদ্ধতা: মাটির অণুজীব ক্ষয় ও নাইট্রেট লিচিং ট্রান্সপোর্ট অ্যালগরিদমে অনুমিত নয়।
        </div>
      </div>
    </div>
  );
}
