// frontend/src/research3d/ScenarioComparison3D.jsx
// Synchronized 3D Dual-Parcel Scenario Comparison Workbench (Scenario A vs Scenario B)
// Features: Side-by-side synchronized 3D parcels with linked camera orbit, dynamic differential
// meters (Δ Yield, Δ Water, Δ Net Profit), input diff cards, and Stewart model outcomes.

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Research3DScene } from './Research3DScene.jsx';

export function ScenarioComparison3D({
  scenarioA,
  scenarioB,
  simResultA,
  simResultB,
  comparison,
  currentDay = 120,
  lang = 'bn'
}) {
  const yieldA = simResultA?.yieldOutcomes?.simulatedYieldTonHa || 5.2;
  const yieldB = simResultB?.yieldOutcomes?.simulatedYieldTonHa || 5.6;
  const waterA = simResultA?.waterBalance?.totalWaterAppliedMm || 350;
  const waterB = simResultB?.waterBalance?.totalWaterAppliedMm || 240;

  const handleSceneReady = ({ scene }) => {
    const duelGroup = new THREE.Group();

    // PARCEL A (Left: Baseline)
    const parcelAGroup = new THREE.Group();
    parcelAGroup.position.set(-4.5, 0, 0);

    const bedGeo = new THREE.BoxGeometry(6.5, 0.3, 6.5);
    const bedAMat = new THREE.MeshStandardMaterial({ color: '#2a1a0f', roughness: 0.95 });
    const bedA = new THREE.Mesh(bedGeo, bedAMat);
    bedA.position.y = -0.15;
    parcelAGroup.add(bedA);

    // Crops in Parcel A (Grid of 36 plants)
    const cropAMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.6 });
    const heightA = 0.2 + (currentDay / 120) * 1.5;
    for (let x = -2; x <= 2; x += 0.8) {
      for (let z = -2; z <= 2; z += 0.8) {
        const plantGeo = new THREE.CylinderGeometry(0.04, 0.05, heightA, 6);
        const plant = new THREE.Mesh(plantGeo, cropAMat);
        plant.position.set(x, heightA / 2, z);
        parcelAGroup.add(plant);
      }
    }

    // Yield Indicator Cylinder for A
    const yPillarAGeo = new THREE.CylinderGeometry(0.3, 0.3, yieldA * 0.45, 12);
    const yPillarAMat = new THREE.MeshStandardMaterial({ color: '#00df81' });
    const yPillarA = new THREE.Mesh(yPillarAGeo, yPillarAMat);
    yPillarA.position.set(0, (yieldA * 0.45) / 2 + 0.1, 2.5);
    parcelAGroup.add(yPillarA);

    duelGroup.add(parcelAGroup);

    // PARCEL B (Right: Treatment / Resilient)
    const parcelBGroup = new THREE.Group();
    parcelBGroup.position.set(4.5, 0, 0);

    const bedBMat = new THREE.MeshStandardMaterial({ color: '#24170d', roughness: 0.95 });
    const bedB = new THREE.Mesh(bedGeo, bedBMat);
    bedB.position.y = -0.15;
    parcelBGroup.add(bedB);

    // Crops in Parcel B (Resilient treatment)
    const cropBMat = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.6 });
    const heightB = 0.2 + (currentDay / 120) * 1.6;
    for (let x = -2; x <= 2; x += 0.8) {
      for (let z = -2; z <= 2; z += 0.8) {
        const plantGeo = new THREE.CylinderGeometry(0.04, 0.05, heightB, 6);
        const plant = new THREE.Mesh(plantGeo, cropBMat);
        plant.position.set(x, heightB / 2, z);
        parcelBGroup.add(plant);
      }
    }

    // Yield Indicator Cylinder for B
    const yPillarBGeo = new THREE.CylinderGeometry(0.3, 0.3, yieldB * 0.45, 12);
    const yPillarBMat = new THREE.MeshStandardMaterial({ color: '#38bdf8' });
    const yPillarB = new THREE.Mesh(yPillarBGeo, yPillarBMat);
    yPillarB.position.set(0, (yieldB * 0.45) / 2 + 0.1, 2.5);
    parcelBGroup.add(yPillarB);

    duelGroup.add(parcelBGroup);

    // Dividing Delta Matrix Line
    const dividerGeo = new THREE.BoxGeometry(0.08, 0.1, 8.0);
    const dividerMat = new THREE.MeshBasicMaterial({ color: '#c084fc' });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.position.set(0, 0.05, 0);
    duelGroup.add(divider);

    scene.add(duelGroup);
  };

  return (
    <div className="research-scene-layout-grid">
      {/* Synchronized 3D Dual-Parcel Canvas */}
      <Research3DScene
        cameraPosition={[-14, 8, 16]}
        cameraTarget={[0, 0.8, 0]}
        hudTitle="SYNCHRONIZED SCENARIO A/B 3D"
        hudMetrics={[
          `A: ${yieldA} t/ha (${waterA}mm)`,
          `B: ${yieldB} t/ha (${waterB}mm)`
        ]}
        onSceneReady={handleSceneReady}
        minHeight="440px"
        lang={lang}
      />

      {/* Numerical Delta Impact Inspector */}
      <div style={{ background: 'var(--glass-bg-card, rgba(15,23,42,0.8))', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid var(--glass-border, rgba(255,255,255,0.08))', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
          ⚖️ {lang === 'bn' ? 'দৃশ্যকল্প এ বনাম বি ত্রিমাত্রিক তুলনা' : 'Synchronized Scenario A vs B Diff'}
        </h4>

        {/* Input Parameters That Differ */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 11.5 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#c084fc', marginBottom: 4 }}>
            ভিন্ন ইনপুট পরিবর্তনসমূহ (Differing Inputs):
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted)' }}>সেচ বাজেট:</span>
            <span>A: {scenarioA?.irrigationMm || 350}mm ➔ B: {scenarioB?.irrigationMm || 240}mm</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: 'var(--text-muted)' }}>আবহাওয়া:</span>
            <span>{scenarioB?.weatherScenario || 'warming_1_5c'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>নাইট্রোজেন (N):</span>
            <span>A: {scenarioA?.nitrogenKgHa || 120}kg ➔ B: {scenarioB?.nitrogenKgHa || 135}kg</span>
          </div>
        </div>

        {/* Output Outcomes Difference */}
        {comparison && (
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px 12px', borderRadius: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>ফলন প্রভাব (Δ Yield):</span>
              <strong style={{ color: comparison.yieldTonHa.absoluteDiff >= 0 ? '#00df81' : '#f87171' }}>
                {comparison.yieldTonHa.absoluteDiff >= 0 ? '+' : ''}{comparison.yieldTonHa.absoluteDiff} t/ha ({comparison.yieldTonHa.percentageDiff}%)
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>সেচ সাশ্রয় (Δ Water):</span>
              <strong style={{ color: comparison.waterAppliedMm.absoluteDiff <= 0 ? '#00df81' : '#f87171' }}>
                {comparison.waterAppliedMm.absoluteDiff} mm ({comparison.waterAppliedMm.percentageDiff}%)
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>নিট লাভ (Δ Profit):</span>
              <strong style={{ color: comparison.netReturnBdt.absoluteDiff >= 0 ? '#00df81' : '#f87171' }}>
                {comparison.netReturnBdt.absoluteDiff >= 0 ? '+' : ''}{comparison.netReturnBdt.absoluteDiff} BDT/ha
              </strong>
            </div>
          </div>
        )}

        <div style={{ marginTop: 'auto', fontSize: 10.5, color: '#64748b', lineHeight: 1.4 }}>
          * উভয় প্লট একই ক্যামেরা স্থানাঙ্ক ও স্কেলে সিঙ্ক্রোনাইজড ভাবে পরিভ্রমণযোগ্য।
        </div>
      </div>
    </div>
  );
}
