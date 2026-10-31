// frontend/src/research3d/SyntheticLab3D.jsx
// Interactive Three.js WebGL 3D Visualization for Synthetic Data Lab & Provenance Registry
// Renders dynamic 3D farm parcels with real-time soil pH, organic matter, irrigation furrows,
// crop canopy stress response, and tiered 3D data provenance architecture.

import React, { useRef, useEffect, useState, useId } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function SyntheticLab3D({
  scenarios = [],
  activeScenarioIndex = 0,
  onSelectScenario = null,
  activeTab = 'generator', // 'generator' | 'provenance'
  provenanceSummary = null,
  seed = 42,
  height = 430,
}) {
  const mountRef = useRef(null);
  const animFrameRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [cameraPreset, setCameraPreset] = useState('overview');
  const canvasId = useId();

  const currentScenario = scenarios[activeScenarioIndex] || scenarios[0] || {
    scenario_id: 'SYNTH_DEFAULT',
    field_size_ha: 5.0,
    soil_ph: 6.5,
    organic_matter_pct: 2.0,
    irrigation_capacity_mm: 450,
    stress_type: 'none',
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // WebGL Context Check
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch {
      setWebGlSupported(false);
      return;
    }

    const width = container.clientWidth || 720;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a111a);
    scene.fog = new THREE.FogExp2(0x0a111a, 0.018);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5.5, 4.2, 6.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.0;
    controls.maxDistance = 18.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controlsRef.current = controls;

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    sunLight.position.set(8, 12, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    fillLight.position.set(-6, 4, -6);
    scene.add(fillLight);

    // Root Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    if (activeTab === 'generator') {
      // -------------------------------------------------------------------
      // 3D SYNTHETIC SCENARIO FARM PARCEL
      // -------------------------------------------------------------------
      const ph = Number(currentScenario.soil_ph) || 6.5;
      const om = Number(currentScenario.organic_matter_pct) || 2.0;
      const irrig = Number(currentScenario.irrigation_capacity_mm) || 400;
      const area = Math.max(1.0, Math.min(10.0, Number(currentScenario.field_size_ha) || 5.0));

      // Derive physical colors based on scientific parameters
      // pH: Acidic (<5.8) = reddish-ochre, Neutral (6.0-7.2) = fertile brown, Alkaline (>7.5) = grey-chalky
      let topsoilColor = 0x4a2e18;
      if (ph < 5.8) topsoilColor = 0x6e3820; // Acidic
      else if (ph > 7.4) topsoilColor = 0x5a554a; // Alkaline
      else topsoilColor = 0x3d2614; // Neutral dark humus

      // OM modulates darkness/richness
      const omFactor = Math.min(1.0, om / 3.0);
      const parcelMat = new THREE.MeshStandardMaterial({
        color: topsoilColor,
        roughness: 0.9 - omFactor * 0.15,
        metalness: 0.05,
      });

      // Parcel Dimensions
      const parcelW = 3.6 + (area / 10.0) * 1.8;
      const parcelD = 3.6 + (area / 10.0) * 1.8;
      const parcelH = 0.55;

      // Main Soil Bed
      const bedGeo = new THREE.BoxGeometry(parcelW, parcelH, parcelD);
      const bedMesh = new THREE.Mesh(bedGeo, parcelMat);
      bedMesh.position.y = -parcelH / 2;
      bedMesh.receiveShadow = true;
      bedMesh.castShadow = true;
      rootGroup.add(bedMesh);

      // Subsoil Layer (lower horizon)
      const subsoilMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.95 });
      const subsoilGeo = new THREE.BoxGeometry(parcelW, 0.45, parcelD);
      const subsoilMesh = new THREE.Mesh(subsoilGeo, subsoilMat);
      subsoilMesh.position.y = -parcelH - 0.225;
      rootGroup.add(subsoilMesh);

      // Deep Geological Substratum
      const geoMat = new THREE.MeshStandardMaterial({ color: 0x271e16, roughness: 1.0 });
      const geoMesh = new THREE.Mesh(new THREE.BoxGeometry(parcelW, 0.35, parcelD), geoMat);
      geoMesh.position.y = -parcelH - 0.45 - 0.175;
      rootGroup.add(geoMesh);

      // Holographic Synthetic Boundary Grid Wireframe
      const wireMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 });
      const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(bedGeo), wireMat);
      wireframe.position.copy(bedMesh.position);
      rootGroup.add(wireframe);

      // Dual Irrigation Furrows / Canals
      const canalW = parcelW * 0.88;
      const waterMat = new THREE.MeshStandardMaterial({
        color: irrig < 200 ? 0x78716c : 0x0284c7, // Dry muddy vs flowing water
        roughness: irrig < 200 ? 0.9 : 0.1,
        metalness: irrig < 200 ? 0.0 : 0.8,
        transparent: true,
        opacity: irrig < 200 ? 0.5 : 0.85,
      });

      const canal1 = new THREE.Mesh(new THREE.BoxGeometry(canalW, 0.06, 0.32), waterMat);
      canal1.position.set(0, 0.02, -parcelD * 0.28);
      canal1.receiveShadow = true;
      rootGroup.add(canal1);

      const canal2 = new THREE.Mesh(new THREE.BoxGeometry(canalW, 0.06, 0.32), waterMat);
      canal2.position.set(0, 0.02, parcelD * 0.28);
      canal2.receiveShadow = true;
      rootGroup.add(canal2);

      // Stress Markers:
      const stressType = (currentScenario.stress_type || '').toLowerCase();
      const isDrought = stressType.includes('drought') || irrig < 250;
      const isHeat = stressType.includes('heat') || stressType.includes('warming');
      const isSaline = ph > 7.5 || stressType.includes('salin');

      // Heatwave Dome (Atmospheric Thermal Radiative Shell)
      if (isHeat) {
        const heatMat = new THREE.MeshBasicMaterial({
          color: 0xf97316,
          transparent: true,
          opacity: 0.12,
          side: THREE.BackSide,
        });
        const dome = new THREE.Mesh(new THREE.SphereGeometry(parcelW * 0.75, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2), heatMat);
        dome.position.y = 0;
        rootGroup.add(dome);
      }

      // Salinity White Crust Patches
      if (isSaline) {
        const saltMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
        for (let i = 0; i < 6; i++) {
          const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.02, 8), saltMat);
          patch.position.set((Math.random() - 0.5) * (parcelW * 0.7), 0.015, (Math.random() - 0.5) * (parcelD * 0.7));
          rootGroup.add(patch);
        }
      }

      // Procedural Crop Plant Grid
      const rows = 5;
      const cols = 5;
      const cropColor = isDrought
        ? 0xb45309 // Stressed withered ochre
        : isHeat
        ? 0xd97706 // Heat chlorosis
        : 0x16a34a; // Lush healthy green

      const cropHeight = isDrought ? 0.35 : isHeat ? 0.45 : 0.65;
      const stemMat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.4 });
      const foliageMat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.3 });

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Avoid planting inside irrigation canal furrows
          const zPos = ((r - (rows - 1) / 2) / rows) * (parcelD * 0.78);
          if (Math.abs(zPos - canal1.position.z) < 0.25 || Math.abs(zPos - canal2.position.z) < 0.25) {
            continue;
          }
          const xPos = ((c - (cols - 1) / 2) / cols) * (parcelW * 0.78);

          const plantGroup = new THREE.Group();
          plantGroup.position.set(xPos, 0, zPos);

          // Stem
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, cropHeight, 6), stemMat);
          stem.position.y = cropHeight / 2;
          stem.castShadow = true;
          plantGroup.add(stem);

          // Foliage Leaves
          const leafCount = isDrought ? 3 : 5;
          for (let l = 0; l < leafCount; l++) {
            const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 5), foliageMat);
            const ang = (l / leafCount) * Math.PI * 2;
            leaf.position.set(Math.cos(ang) * 0.07, cropHeight * 0.75, Math.sin(ang) * 0.07);
            leaf.rotation.z = Math.cos(ang) * 0.4;
            leaf.rotation.x = Math.sin(ang) * 0.4;
            leaf.castShadow = true;
            plantGroup.add(leaf);
          }

          rootGroup.add(plantGroup);
        }
      }
    } else {
      // -------------------------------------------------------------------
      // 3D PROVENANCE & RELIABILITY ARCHITECTURE (4 DATA TIERS)
      // -------------------------------------------------------------------
      const tiers = [
        { id: 1, name: 'Tier 1: Space Ag Assimilation', sub: 'NASA POWER MERRA-2 Gridded', color: 0x38bdf8, y: 1.8, x: -3.0 },
        { id: 2, name: 'Tier 2: Mechanistic Models', sub: 'FAO-56 & PuLP CBC Solvers', color: 0x00df81, y: 0.6, x: -1.0 },
        { id: 3, name: 'Tier 3: Research Baselines', sub: 'BARI / BRRI Field Handbooks', color: 0xf59e0b, y: -0.6, x: 1.0 },
        { id: 4, name: 'Tier 4: Synthetic Sandbox', sub: 'Fixed-Seed Counterfactual Trials', color: 0xa78bfa, y: -1.8, x: 3.0 },
      ];

      tiers.forEach((t) => {
        const tierGroup = new THREE.Group();
        tierGroup.position.set(t.x, t.y, 0);

        // Tier Pedestal
        const pedMat = new THREE.MeshStandardMaterial({
          color: t.color,
          roughness: 0.3,
          metalness: 0.6,
          transparent: true,
          opacity: 0.85,
        });
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.4, 24), pedMat);
        ped.receiveShadow = true;
        ped.castShadow = true;
        tierGroup.add(ped);

        // Core Symbol
        const orbMat = new THREE.MeshStandardMaterial({
          color: t.color,
          emissive: t.color,
          emissiveIntensity: 0.35,
          roughness: 0.2,
        });
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 20), orbMat);
        orb.position.y = 0.55;
        orb.castShadow = true;
        tierGroup.add(orb);

        // Telemetry beam connecting tiers sequentially
        if (t.id < 4) {
          const nextTier = tiers[t.id];
          const beamGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0.55, 0),
            new THREE.Vector3(nextTier.x - t.x, nextTier.y - t.y + 0.55, 0),
          ]);
          const beamMat = new THREE.LineDashedMaterial({
            color: 0x94a3b8,
            dashSize: 0.2,
            gapSize: 0.1,
            transparent: true,
            opacity: 0.6,
          });
          const beam = new THREE.Line(beamGeo, beamMat);
          beam.computeLineDistances();
          tierGroup.add(beam);
        }

        rootGroup.add(tierGroup);
      });
    }

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle orbital oscillation
      rootGroup.rotation.y = Math.sin(elapsedTime * 0.15) * 0.08;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      scene.traverse((child) => {
        if (child.isMesh || child.isLine) {
          if (child.geometry) child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      renderer.dispose();
      container.replaceChildren();
    };
  }, [activeScenarioIndex, scenarios, activeTab, height]);

  // Camera preset controller
  const applyPreset = (preset) => {
    setCameraPreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;
    if (preset === 'overview') {
      cameraRef.current.position.set(5.5, 4.2, 6.0);
      controlsRef.current.target.set(0, 0, 0);
    } else if (preset === 'soil') {
      cameraRef.current.position.set(4.0, -0.2, 4.5);
      controlsRef.current.target.set(0, -0.5, 0);
    } else if (preset === 'canopy') {
      cameraRef.current.position.set(0, 5.5, 1.2);
      controlsRef.current.target.set(0, 0.4, 0);
    }
    controlsRef.current.update();
  };

  if (!webGlSupported) {
    return (
      <div style={{ padding: 24, textAlign: 'center', background: '#131920', borderRadius: 14, color: '#94a3b8' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🧪</div>
        <h4 style={{ color: '#fff', margin: '0 0 6px' }}>3D Synthetic Sandbox Unavailable</h4>
        <p style={{ margin: 0, fontSize: 13 }}>WebGL hardware acceleration disabled. Conventional table display active.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: 20 }}>
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        id={`synthetic-canvas-${canvasId}`}
        style={{
          width: '100%',
          height: `${height}px`,
          borderRadius: 16,
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at center, #0e1726 0%, #060b12 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
        }}
      />

      {/* Floating Glass Top Bar */}
      <div style={{
        position: 'absolute',
        top: 14,
        left: 14,
        right: 14,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        pointerEvents: 'none',
      }}>
        {/* Left: Interactive Scenario Selector Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'auto' }}>
          {activeTab === 'generator' && scenarios.slice(0, 6).map((scen, idx) => {
            const isSel = idx === activeScenarioIndex;
            return (
              <button
                key={scen.scenario_id || idx}
                onClick={() => onSelectScenario && onSelectScenario(idx)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 999,
                  background: isSel ? 'rgba(56, 189, 248, 0.28)' : 'rgba(15, 23, 42, 0.8)',
                  border: `1px solid ${isSel ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)'}`,
                  color: isSel ? '#ffffff' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: isSel ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                #{idx + 1} {scen.scenario_id?.replace('SCEN_', '') || `Scen ${idx + 1}`}
              </button>
            );
          })}
        </div>

        {/* Right: Mandatory Scientific Disclaimer & Camera Presets */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', pointerEvents: 'auto' }}>
          <span style={{
            fontSize: 10.5,
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(234, 179, 8, 0.18)',
            color: '#facc15',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            fontWeight: 800,
            letterSpacing: '0.04em',
          }}>
            🧪 Synthetic Stress Simulation
          </span>

          <button
            onClick={() => applyPreset('overview')}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              background: cameraPreset === 'overview' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#38bdf8',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Overview
          </button>
          <button
            onClick={() => applyPreset('soil')}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              background: cameraPreset === 'soil' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#38bdf8',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Soil Profile
          </button>
        </div>
      </div>

      {/* Floating Glass Bottom Telemetry HUD */}
      <div style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
        right: 14,
        background: 'rgba(11, 19, 30, 0.85)',
        border: '1px solid rgba(56, 189, 248, 0.22)',
        borderRadius: 12,
        padding: '10px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🧪</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>
              {activeTab === 'generator'
                ? `3D Synthetic Farm Parcel: ${currentScenario.scenario_id || `Scenario #${activeScenarioIndex + 1}`}`
                : '3D Scientific Data Provenance & Reliability Architecture'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {activeTab === 'generator'
                ? `Deterministic PRNG Seed: ${seed} • Soil Horizon Depth: 0.55m topsoil, 0.45m subsoil`
                : 'NASA POWER Space Ag Telemetry • Mechanistic FAO-56 • Empirical Research Benchmarks'}
            </div>
          </div>
        </div>

        {activeTab === 'generator' && (
          <div style={{ display: 'flex', gap: 16, fontSize: 11.5 }}>
            <div>
              <span style={{ color: '#64748b' }}>Area:</span>
              <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{currentScenario.field_size_ha || 5.0} ha</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Soil pH:</span>
              <div style={{ color: '#38bdf8', fontWeight: 600 }}>{currentScenario.soil_ph || 6.5}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Organic Matter:</span>
              <div style={{ color: '#00df81', fontWeight: 600 }}>{currentScenario.organic_matter_pct || 2.0}%</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Irrig Capacity:</span>
              <div style={{ color: '#f59e0b', fontWeight: 600 }}>{currentScenario.irrigation_capacity_mm || 400} mm</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Stress Mode:</span>
              <div style={{ color: '#ef4444', fontWeight: 700, textTransform: 'capitalize' }}>
                {currentScenario.stress_type || 'None (Nominal)'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
