// frontend/src/ClayFarmScene.jsx
// Warm, matte, clay-style 3D diorama farm scene built with plain Three.js.
// Features: Isometric OrthographicCamera, soft warm lighting, diorama soil strata,
// instanced crop beds, barn, silo, trees, fence, honest overlays (crop, soil, rain),
// raycast plot selection, and zero fabricated telemetry.

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createGrassTexture,
  createTilledSoilTexture,
  createTerracottaStrataTexture,
  createDirtPathTexture,
} from './farmTextures.js';

// Color Palette — Matte Pastels & Soil Strata (UI 4 & Phase 4 compliant)
export const CLAY_PALETTE = {
  bg: '#0f1412',
  grass: '#8fb760',
  crop_rice: '#7fa860',
  crop_wheat: '#d8c27a',
  crop_pulse: '#8fae6a',
  crop_mustard: '#e0b04b',
  crop_default: '#7fa860',
  water: '#8ec5d6',
  soil_top: '#b36a3c',
  soil_layer_1: '#9a5a33',
  soil_layer_2: '#7a4628',
  soil_layer_3: '#574030',
  soil_loam: '#a8805c',
  soil_clay: '#7d5b42',
  soil_sandy: '#c4a47c',
  no_data: '#a3a398',
  alert: '#d9644a',
  barn_wall: '#efe7da',
  barn_roof: '#6f7a80',
  silo: '#e8e8e2',
  fence: '#c9b48c',
  tree_dark: '#4f7d31',
  tree_light: '#5f8f3a',
  wood_trunk: '#6b4f38',
  hud_bg: 'rgba(16, 28, 22, 0.85)',
  hud_border: 'rgba(255, 255, 255, 0.1)',
};

/**
 * Pure helper to classify a bed's visual appearance.
 * When plot or plot.crop is missing/null, returns { kind: 'soil' }.
 */
export function bedAppearance(plot) {
  if (!plot || !plot.crop) {
    return { kind: 'soil' };
  }
  return {
    kind: 'crop',
    crop: plot.crop,
  };
}

/**
 * Determine the honest overlay color and label for a plot.
 * NEVER fabricates NDVI, moisture %, or yield.
 */
export function getPlotOverlayInfo(plot, overlay = 'crop', lang = 'bn') {
  if (!plot) {
    return {
      color: CLAY_PALETTE.no_data,
      label: lang === 'bn' ? 'তথ্য নেই' : 'No data',
      isAvailable: false,
    };
  }

  if (overlay === 'crop') {
    if (!plot.crop) {
      return {
        color: CLAY_PALETTE.no_data,
        label: lang === 'bn' ? 'ফসল: তথ্য নেই' : 'Crop: No data',
        isAvailable: false,
      };
    }
    const c = String(plot.crop).toLowerCase();
    let color = CLAY_PALETTE.crop_default;
    if (c.includes('rice') || c.includes('aman') || c.includes('aus') || c.includes('boro') || c.includes('ধান')) {
      color = CLAY_PALETTE.crop_rice;
    } else if (c.includes('wheat') || c.includes('গম')) {
      color = CLAY_PALETTE.crop_wheat;
    } else if (c.includes('lentil') || c.includes('pulse') || c.includes('ডাল') || c.includes('মসুর')) {
      color = CLAY_PALETTE.crop_pulse;
    } else if (c.includes('mustard') || c.includes('সরিষা')) {
      color = CLAY_PALETTE.crop_mustard;
    }
    return {
      color,
      label: plot.cropBn && lang === 'bn' ? plot.cropBn : (plot.cropEn || plot.crop),
      isAvailable: true,
    };
  }

  if (overlay === 'soil') {
    if (!plot.soil_texture && !plot.soilType) {
      return {
        color: CLAY_PALETTE.no_data,
        label: lang === 'bn' ? 'মাটি: তথ্য নেই' : 'Soil: No data',
        isAvailable: false,
      };
    }
    const s = String(plot.soil_texture || plot.soilType).toLowerCase();
    let color = CLAY_PALETTE.soil_loam;
    let label = lang === 'bn' ? 'দোআঁশ মাটি' : 'Loam Soil';
    if (s.includes('clay') || s.includes('এঁটেল')) {
      color = CLAY_PALETTE.soil_clay;
      label = lang === 'bn' ? 'এঁটেল মাটি' : 'Clay Soil';
    } else if (s.includes('sand') || s.includes('বেলে')) {
      color = CLAY_PALETTE.soil_sandy;
      label = lang === 'bn' ? 'বেলে মাটি' : 'Sandy Soil';
    }
    return { color, label, isAvailable: true };
  }

  if (overlay === 'bare_soil') {
    const isBare = !plot.crop || String(plot.crop).toLowerCase().includes('fallow') || String(plot.crop).toLowerCase() === 'পতিত';
    return {
      color: isBare ? '#ef4444' : '#10b981',
      label: isBare ? (lang === 'bn' ? 'নগ্ন মাটি (ক্ষয় ঝুঁকি)' : 'Bare Soil (Erosion Risk)') : (lang === 'bn' ? 'শস্য আচ্ছাদিত' : 'Vegetative Cover'),
      isAvailable: true,
    };
  }

  if (overlay === 'rain') {
    if (plot.rain_mm == null || isNaN(plot.rain_mm)) {
      return {
        color: CLAY_PALETTE.no_data,
        label: lang === 'bn' ? 'বৃষ্টিপাত: তথ্য নেই' : 'Rainfall: No data',
        isAvailable: false,
      };
    }
    const mm = Number(plot.rain_mm);
    const color = mm > 0 ? CLAY_PALETTE.water : '#c29a6a';
    const label = lang === 'bn' ? `বৃষ্টিপাত: ${mm.toFixed(1)} মিমি` : `Rainfall: ${mm.toFixed(1)} mm`;
    return { color, label, isAvailable: true };
  }

  return {
    color: CLAY_PALETTE.no_data,
    label: lang === 'bn' ? 'তথ্য নেই' : 'No data',
    isAvailable: false,
  };
}

// Fixed pseudo-random generator for deterministic plant placement
function pseudoRandom(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function ClayFarmScene({
  plots = [],
  activeOverlay = 'crop',
  lang = 'bn',
  onSelectPlot,
  viewMode = '3d',
  cameraPreset = 'perspective',
  hasAlert = false,
  caption = '',
}) {
  const mountRef = useRef(null);
  const [selectedPlotId, setSelectedPlotId] = useState(plots[0]?.id || 'P-01');
  const [webGLError, setWebGLError] = useState(false);

  // Normalize plots to 6 diorama beds (or use real parcels if passed)
  const normalizedPlots = useMemo(() => {
    if (plots && plots.length >= 6) return plots.slice(0, 6);
    const base = plots && plots.length > 0 ? plots[0] : {};
    const defaultBeds = [];
    // 3 rows x 2 cols of crop beds on the farm slab
    const positions = [
      { r: -1, c: -1 }, { r: -1, c: 0 },
      { r: 0, c: -1 },  { r: 0, c: 0 },
      { r: 1, c: -1 },  { r: 1, c: 0 },
    ];
    positions.forEach((pos, idx) => {
      defaultBeds.push({
        id: `P-0${idx + 1}`,
        row: pos.r,
        col: pos.c,
        name: `${base.name || (lang === 'bn' ? 'প্লট' : 'Bed')} ${idx + 1}`,
        crop: idx === 0 ? (base.crop || 'Rice') : (idx % 2 === 1 ? base.crop : null),
        soil_texture: base.soil_texture || base.soilType || 'loam',
        rain_mm: base.rain_mm != null ? base.rain_mm : null,
        hasAlert: idx === 0 && hasAlert,
      });
    });
    return defaultBeds;
  }, [plots, hasAlert, lang]);

  const selectedPlot = useMemo(() => {
    return normalizedPlots.find((p) => p.id === selectedPlotId) || normalizedPlots[0];
  }, [normalizedPlots, selectedPlotId]);

  useEffect(() => {
    if (viewMode === '2d' || webGLError) return;

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    let renderer, scene, camera, controls, animId;
    const disposables = [];

    try {
      scene = new THREE.Scene();

      // Root scene group for idle rotation
      const sceneGroup = new THREE.Group();
      scene.add(sceneGroup);

      // 1. Isometric Orthographic Camera
      const aspect = width / height;
      const frustumSize = 14.5;
      camera = new THREE.OrthographicCamera(
        (-frustumSize * aspect) / 2,
        (frustumSize * aspect) / 2,
        frustumSize / 2,
        -frustumSize / 2,
        0.1,
        1000
      );

      // Standard isometric tilt or cameraPreset
      if (cameraPreset === 'top_down') {
        camera.position.set(0, 24, 0.01);
        camera.lookAt(0, 0, 0);
      } else if (cameraPreset === 'furrow') {
        camera.position.set(6, 3, 12);
        camera.lookAt(0, 0.8, 0);
      } else {
        camera.position.set(18, 16, 18);
        camera.lookAt(0, 0, 0);
      }

      // 2. WebGL Renderer with transparency for floating look
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // 3. OrbitControls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2.15;
      controls.minPolarAngle = Math.PI / 6;
      controls.enablePan = width > 768;

      let isInteracting = false;
      let resumeTimeout = null;
      controls.addEventListener('start', () => {
        isInteracting = true;
        if (resumeTimeout) clearTimeout(resumeTimeout);
      });
      controls.addEventListener('end', () => {
        resumeTimeout = setTimeout(() => {
          isInteracting = false;
        }, 1500);
      });

      // 4. Lighting & Environment
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const roomEnv = new RoomEnvironment();
      const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTex;
      disposables.push(envTex, roomEnv, pmrem);

      // Warm Sun DirectionalLight
      const sunLight = new THREE.DirectionalLight(0xffe2b8, 2.6);
      sunLight.position.set(14, 22, 10);
      sunLight.castShadow = true;
      sunLight.shadow.radius = 5;
      const shadowMapDim = (typeof window !== 'undefined' && window.innerWidth <= 768) || width <= 768 ? 512 : 1024;
      sunLight.shadow.mapSize.set(shadowMapDim, shadowMapDim);
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 50;
      sunLight.shadow.camera.left = -9;
      sunLight.shadow.camera.right = 9;
      sunLight.shadow.camera.top = 9;
      sunLight.shadow.camera.bottom = -9;
      scene.add(sunLight);

      // Soft Sky HemisphereLight
      const hemiLight = new THREE.HemisphereLight(0xc8e0f4, 0x6b5a45, 0.7);
      scene.add(hemiLight);

      // 5. Procedural Textures & Materials (matte clay roughness 0.85 - 0.95, metalness 0)
      const grassTex = createGrassTexture();
      const soilTex = createTilledSoilTexture();
      const strataTex = createTerracottaStrataTexture();
      const dirtPathTex = createDirtPathTexture();
      disposables.push(grassTex, soilTex, strataTex, dirtPathTex);

      const matGrassTop = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.grass,
        map: grassTex,
        roughness: 0.92,
        metalness: 0,
      });
      const matSoilTopBand = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.soil_top, // #b36a3c
        map: strataTex,
        roughness: 0.92,
        metalness: 0,
      });
      const matSoilMidBand = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.soil_layer_1, // #9a5a33
        map: strataTex,
        roughness: 0.94,
        metalness: 0,
      });
      const matSoilBotBand = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.soil_layer_2, // #7a4628
        map: strataTex,
        roughness: 0.95,
        metalness: 0,
      });
      const matDirtPath = new THREE.MeshStandardMaterial({
        color: '#c4a682',
        map: dirtPathTex,
        roughness: 0.94,
        metalness: 0,
      });
      const matWater = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.water, // #8ec5d6
        roughness: 0.25,
        metalness: 0.05,
      });
      const matBarnWall = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.barn_wall, // #efe7da
        roughness: 0.9,
        metalness: 0,
      });
      const matBarnRoof = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.barn_roof, // #6f7a80
        roughness: 0.9,
        metalness: 0,
      });
      const matSilo = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.silo, // #e8e8e2
        roughness: 0.85,
        metalness: 0,
      });
      const matFence = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.fence, // #c9b48c
        roughness: 0.9,
        metalness: 0,
      });
      const matTreeDark = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.tree_dark, // #4f7d31
        roughness: 0.92,
        metalness: 0,
      });
      const matTreeLight = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.tree_light, // #5f8f3a
        roughness: 0.92,
        metalness: 0,
      });
      const matWood = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.wood_trunk,
        roughness: 0.92,
        metalness: 0,
      });

      disposables.push(
        matGrassTop, matSoilTopBand, matSoilMidBand, matSoilBotBand, matDirtPath,
        matWater, matBarnWall, matBarnRoof, matSilo, matFence,
        matTreeDark, matTreeLight, matWood
      );

      // 6. Base Slab: One thick rounded slab (height ~22% of width: 2.6 / 12.0) with 3 visible soil bands
      const slabWidth = 11.8;
      const slabDepth = 11.8;

      // Bottom layer
      const botLayerGeo = new RoundedBoxGeometry(slabWidth - 0.4, 0.85, slabDepth - 0.4, 3, 0.12);
      const botLayerMesh = new THREE.Mesh(botLayerGeo, matSoilBotBand);
      botLayerMesh.position.y = -0.95;
      botLayerMesh.receiveShadow = true;
      sceneGroup.add(botLayerMesh);
      disposables.push(botLayerGeo);

      // Middle layer
      const midLayerGeo = new RoundedBoxGeometry(slabWidth - 0.2, 0.9, slabDepth - 0.2, 3, 0.12);
      const midLayerMesh = new THREE.Mesh(midLayerGeo, matSoilMidBand);
      midLayerMesh.position.y = -0.1;
      midLayerMesh.receiveShadow = true;
      sceneGroup.add(midLayerMesh);
      disposables.push(midLayerGeo);

      // Top layer
      const topLayerGeo = new RoundedBoxGeometry(slabWidth, 0.85, slabDepth, 3, 0.15);
      const topLayerMesh = new THREE.Mesh(topLayerGeo, matSoilTopBand);
      topLayerMesh.position.y = 0.75;
      topLayerMesh.receiveShadow = true;
      sceneGroup.add(topLayerMesh);
      disposables.push(topLayerGeo);

      // Thin darker edge band around the top slab
      const matGrassEdge = new THREE.MeshStandardMaterial({
        color: '#6e8f48',
        roughness: 0.95,
        metalness: 0,
      });
      disposables.push(matGrassEdge);

      const grassEdgeGeo = new RoundedBoxGeometry(slabWidth - 0.05, 0.20, slabDepth - 0.05, 3, 0.12);
      const grassEdgeMesh = new THREE.Mesh(grassEdgeGeo, matGrassEdge);
      grassEdgeMesh.position.y = 1.18;
      grassEdgeMesh.receiveShadow = true;
      sceneGroup.add(grassEdgeMesh);
      disposables.push(grassEdgeGeo);

      // Grass surface
      const grassGeo = new RoundedBoxGeometry(slabWidth - 0.18, 0.18, slabDepth - 0.18, 3, 0.1);
      const grassMesh = new THREE.Mesh(grassGeo, matGrassTop);
      grassMesh.position.y = 1.24;
      grassMesh.receiveShadow = true;
      sceneGroup.add(grassMesh);
      disposables.push(grassGeo);

      // Under-slab soft shadow plane (ShadowMaterial)
      const shadowPlaneGeo = new THREE.PlaneGeometry(16, 16);
      const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.35 });
      const shadowPlaneMesh = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
      shadowPlaneMesh.rotation.x = -Math.PI / 2;
      shadowPlaneMesh.position.y = -1.45;
      shadowPlaneMesh.receiveShadow = true;
      sceneGroup.add(shadowPlaneMesh);
      disposables.push(shadowPlaneGeo, shadowPlaneMat);

      // 7. Water Canal Strip (#8ec5d6)
      const canalGeo = new RoundedBoxGeometry(0.85, 0.1, 8.8, 2, 0.05);
      const canalMesh = new THREE.Mesh(canalGeo, matWater);
      canalMesh.position.set(4.4, 1.25, 0.2);
      canalMesh.receiveShadow = true;
      sceneGroup.add(canalMesh);
      disposables.push(canalGeo);

      // 8. Low-Poly Barn (#efe7da walls, #6f7a80 roof)
      const barnGroup = new THREE.Group();
      barnGroup.position.set(-3.6, 1.3, -3.4);

      const barnWallGeo = new THREE.BoxGeometry(2.0, 1.1, 1.5);
      const barnWallMesh = new THREE.Mesh(barnWallGeo, matBarnWall);
      barnWallMesh.position.y = 0.55;
      barnWallMesh.castShadow = true;
      barnWallMesh.receiveShadow = true;
      barnGroup.add(barnWallMesh);
      disposables.push(barnWallGeo);

      // Prism roof (3-sided cylinder)
      const barnRoofGeo = new THREE.CylinderGeometry(1.05, 1.05, 2.15, 3);
      const barnRoofMesh = new THREE.Mesh(barnRoofGeo, matBarnRoof);
      barnRoofMesh.rotation.z = Math.PI / 2;
      barnRoofMesh.position.set(0, 1.45, 0);
      barnRoofMesh.castShadow = true;
      barnGroup.add(barnRoofMesh);
      disposables.push(barnRoofGeo);

      // Small door
      const barnDoorGeo = new THREE.BoxGeometry(0.5, 0.7, 0.05);
      const barnDoorMesh = new THREE.Mesh(barnDoorGeo, matWood);
      barnDoorMesh.position.set(0, 0.35, 0.76);
      barnGroup.add(barnDoorMesh);
      disposables.push(barnDoorGeo);

      sceneGroup.add(barnGroup);

      // 9. Low-Poly Silo (cylinder + dome #e8e8e2)
      const siloGroup = new THREE.Group();
      siloGroup.position.set(-1.8, 1.3, -4.2);

      const siloBodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16);
      const siloBodyMesh = new THREE.Mesh(siloBodyGeo, matSilo);
      siloBodyMesh.position.y = 0.9;
      siloBodyMesh.castShadow = true;
      siloBodyMesh.receiveShadow = true;
      siloGroup.add(siloBodyMesh);
      disposables.push(siloBodyGeo);

      const siloDomeGeo = new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const siloDomeMesh = new THREE.Mesh(siloDomeGeo, matSilo);
      siloDomeMesh.position.y = 1.8;
      siloDomeMesh.castShadow = true;
      siloGroup.add(siloDomeMesh);
      disposables.push(siloDomeGeo);

      sceneGroup.add(siloGroup);

      // 9b. Wooden Barrels & Crates near Barn / Silo
      const barrelGeo = new THREE.CylinderGeometry(0.18, 0.20, 0.42, 10);
      disposables.push(barrelGeo);
      const b1 = new THREE.Mesh(barrelGeo, matWood);
      b1.position.set(-2.5, 1.51, -2.4);
      b1.castShadow = true;
      sceneGroup.add(b1);
      const b2 = new THREE.Mesh(barrelGeo, matWood);
      b2.position.set(-2.15, 1.51, -2.7);
      b2.castShadow = true;
      sceneGroup.add(b2);

      const crateGeo = new THREE.BoxGeometry(0.36, 0.36, 0.36);
      disposables.push(crateGeo);
      const crate = new THREE.Mesh(crateGeo, matWood);
      crate.position.set(-2.8, 1.48, -2.8);
      crate.rotation.y = 0.25;
      crate.castShadow = true;
      sceneGroup.add(crate);

      // 9c. Winding Dirt Walkway Paths (#c4a682 with procedural stippling)
      const mainPathGeo = new RoundedBoxGeometry(0.52, 0.02, 7.8, 2, 0.04);
      const mainPathMesh = new THREE.Mesh(mainPathGeo, matDirtPath);
      mainPathMesh.position.set(0, 1.34, 0.7);
      mainPathMesh.receiveShadow = true;
      sceneGroup.add(mainPathMesh);
      disposables.push(mainPathGeo);

      const barnBranchGeo = new RoundedBoxGeometry(2.6, 0.02, 0.48, 2, 0.04);
      const barnBranchMesh = new THREE.Mesh(barnBranchGeo, matDirtPath);
      barnBranchMesh.position.set(-1.4, 1.34, -2.4);
      barnBranchMesh.rotation.y = -0.3;
      barnBranchMesh.receiveShadow = true;
      sceneGroup.add(barnBranchMesh);
      disposables.push(barnBranchGeo);

      const canalCrossGeo = new RoundedBoxGeometry(3.6, 0.02, 0.45, 2, 0.04);
      const canalCrossMesh = new THREE.Mesh(canalCrossGeo, matDirtPath);
      canalCrossMesh.position.set(2.0, 1.34, 0.7);
      canalCrossMesh.receiveShadow = true;
      sceneGroup.add(canalCrossMesh);
      disposables.push(canalCrossGeo);

      // 10. Low Fence Ring around farm perimeter (#c9b48c)
      const fenceGroup = new THREE.Group();
      const fencePostGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
      const fenceRailGeo = new THREE.BoxGeometry(1.6, 0.04, 0.04);
      disposables.push(fencePostGeo, fenceRailGeo);

      // Add fence sections on the outer bounds
      const fenceCoords = [
        [-5.2, -5.2, -3.6, -5.2],
        [-3.6, -5.2, -2.0, -5.2],
        [-5.2, -5.2, -5.2, -3.6],
        [-5.2, -3.6, -5.2, -2.0],
        [3.8, -5.2, 5.2, -5.2],
        [5.2, -5.2, 5.2, -3.6],
        [5.2, 3.6, 5.2, 5.2],
        [3.8, 5.2, 5.2, 5.2],
      ];
      fenceCoords.forEach(([x1, z1, x2, z2]) => {
        const mx = (x1 + x2) / 2;
        const mz = (z1 + z2) / 2;
        const post = new THREE.Mesh(fencePostGeo, matFence);
        post.position.set(x1, 1.45, z1);
        post.castShadow = true;
        fenceGroup.add(post);

        const rail1 = new THREE.Mesh(fenceRailGeo, matFence);
        rail1.position.set(mx, 1.5, mz);
        if (x1 === x2) rail1.rotation.y = Math.PI / 2;
        fenceGroup.add(rail1);

        const rail2 = new THREE.Mesh(fenceRailGeo, matFence);
        rail2.position.set(mx, 1.38, mz);
        if (x1 === x2) rail2.rotation.y = Math.PI / 2;
        fenceGroup.add(rail2);
      });
      sceneGroup.add(fenceGroup);

      // 11. 6-10 Round Trees (sphere clusters on brown trunks)
      const treePositions = [
        { x: -4.6, z: -1.2, scale: 0.9, mat: matTreeDark },
        { x: -4.8, z: 0.8, scale: 1.1, mat: matTreeLight },
        { x: -4.5, z: 2.8, scale: 1.0, mat: matTreeDark },
        { x: -4.2, z: 4.6, scale: 0.85, mat: matTreeLight },
        { x: 4.6, z: -4.6, scale: 1.1, mat: matTreeDark },
        { x: 4.8, z: 4.6, scale: 0.95, mat: matTreeLight },
        { x: 2.4, z: -4.6, scale: 0.8, mat: matTreeLight },
        { x: 0.4, z: -4.8, scale: 1.05, mat: matTreeDark },
      ];

      const trunkGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.7, 8);
      const canopyGeo = new THREE.SphereGeometry(0.55, 12, 10);
      disposables.push(trunkGeo, canopyGeo);

      treePositions.forEach((tp) => {
        const tg = new THREE.Group();
        tg.position.set(tp.x, 1.3, tp.z);
        tg.scale.setScalar(tp.scale);

        const trunk = new THREE.Mesh(trunkGeo, matWood);
        trunk.position.y = 0.35;
        trunk.castShadow = true;
        tg.add(trunk);

        const canopy1 = new THREE.Mesh(canopyGeo, tp.mat);
        canopy1.position.set(0, 0.85, 0);
        canopy1.castShadow = true;
        tg.add(canopy1);

        const canopy2 = new THREE.Mesh(canopyGeo, tp.mat);
        canopy2.position.set(0.15, 1.1, -0.1);
        canopy2.scale.set(0.75, 0.75, 0.75);
        canopy2.castShadow = true;
        tg.add(canopy2);

        sceneGroup.add(tg);
      });

      // 12. 4-6 Interactive Crop Beds with InstancedMesh Plants & Tilled Soil
      const plotMeshes = [];
      const plantConGeo = new THREE.ConeGeometry(0.12, 0.35, 6);
      const plantMat = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.crop_rice,
        roughness: 0.88,
        metalness: 0,
      });
      disposables.push(plantConGeo, plantMat);

      // Materials for neutral tilled soil beds (#8a5a3a top, darker furrows, sparse sprouts #7fae4f)
      const matFurrowLine = new THREE.MeshStandardMaterial({
        color: '#5c3a24',
        roughness: 0.98,
        metalness: 0,
      });
      const matSprout = new THREE.MeshStandardMaterial({
        color: '#7fae4f',
        roughness: 0.88,
        metalness: 0,
      });
      const sproutGeo = new THREE.ConeGeometry(0.05, 0.15, 5);
      disposables.push(matFurrowLine, matSprout, sproutGeo);

      // Bed placements: 3 rows along Z, 2 columns along X
      const bedWidth = 2.6;
      const bedDepth = 2.2;
      const bedCols = [-1.6, 1.6];
      const bedRows = [-2.0, 0.7, 3.4];

      normalizedPlots.forEach((plot, idx) => {
        const colIdx = idx % 2;
        const rowIdx = Math.floor(idx / 2);
        const posX = bedCols[colIdx];
        const posZ = bedRows[rowIdx];

        const appearance = bedAppearance(plot);
        const overlay = getPlotOverlayInfo(plot, activeOverlay, lang);
        const isNeutralSoil = appearance.kind === 'soil';

        const bedColor = isNeutralSoil ? '#8a5a3a' : overlay.color;
        const bedMat = new THREE.MeshStandardMaterial({
          color: bedColor,
          map: isNeutralSoil ? soilTex : null,
          roughness: 0.9,
          metalness: 0,
        });
        disposables.push(bedMat);

        const bedGeo = new RoundedBoxGeometry(bedWidth, 0.16, bedDepth, 2, 0.08);
        const bedMesh = new THREE.Mesh(bedGeo, bedMat);
        bedMesh.position.set(posX, 1.34, posZ);
        bedMesh.castShadow = true;
        bedMesh.receiveShadow = true;
        bedMesh.userData = { plotId: plot.id, plotData: plot };

        sceneGroup.add(bedMesh);
        plotMeshes.push(bedMesh);
        disposables.push(bedGeo);

        if (isNeutralSoil) {
          // Darker furrow lines via thin raised strips
          const furrowGeo = new THREE.BoxGeometry(0.07, 0.02, bedDepth - 0.3);
          disposables.push(furrowGeo);
          const furrowOffsetsX = [-0.75, -0.25, 0.25, 0.75];
          furrowOffsetsX.forEach((ox) => {
            const furrowMesh = new THREE.Mesh(furrowGeo, matFurrowLine);
            furrowMesh.position.set(posX + ox, 1.43, posZ);
            furrowMesh.receiveShadow = true;
            sceneGroup.add(furrowMesh);
          });

          // Sparse small sprouts (#7fae4f) along the furrows
          const sproutPositions = [
            { ox: -0.75, oz: -0.5 },
            { ox: -0.25, oz: 0.3 },
            { ox: 0.25, oz: -0.2 },
            { ox: 0.75, oz: 0.6 },
            { ox: 0.25, oz: 0.5 },
          ];
          sproutPositions.forEach((sp, sIdx) => {
            const sprout = new THREE.Mesh(sproutGeo, matSprout);
            sprout.position.set(posX + sp.ox, 1.48, posZ + sp.oz);
            sprout.castShadow = true;
            sprout.receiveShadow = true;
            sprout.rotation.y = (sIdx * 1.3);
            sceneGroup.add(sprout);
          });
        } else if (plot.crop) {
          // Dense instanced crop plants inside bed (deterministic pseudo-random placement)
          const rows = 8;
          const cols = 12;
          const totalInstances = rows * cols;
          const instMesh = new THREE.InstancedMesh(plantConGeo, plantMat, totalInstances);
          instMesh.castShadow = true;
          instMesh.receiveShadow = true;

          const dummy = new THREE.Object3D();
          let count = 0;
          for (let ri = 0; ri < rows; ri++) {
            for (let ci = 0; ci < cols; ci++) {
              const seed = idx * 100 + ri * 10 + ci;
              const rndScale = 0.65 + pseudoRandom(seed) * 0.35;
              const rndRotY = pseudoRandom(seed + 1) * Math.PI * 2;
              const offsetX = (ci - 5.5) * 0.18 + (pseudoRandom(seed + 2) - 0.5) * 0.04;
              const offsetZ = (ri - 3.5) * 0.22 + (pseudoRandom(seed + 3) - 0.5) * 0.04;

              dummy.position.set(posX + offsetX, 1.50, posZ + offsetZ);
              dummy.rotation.y = rndRotY;
              dummy.scale.set(rndScale, rndScale * 1.1, rndScale);
              dummy.updateMatrix();
              instMesh.setMatrixAt(count++, dummy.matrix);
            }
          }
          instMesh.instanceMatrix.needsUpdate = true;
          sceneGroup.add(instMesh);
          disposables.push(instMesh);
        }
      });

      // 13. Raycasting for Plot Selection
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const onPointerDown = (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(plotMeshes);
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          if (hit.userData?.plotId) {
            setSelectedPlotId(hit.userData.plotId);
            onSelectPlot?.(hit.userData.plotData);
          }
        }
      };
      renderer.domElement.addEventListener('pointerdown', onPointerDown);

      // 14. Render on Demand & Subtle Intro Turn (capped at 4s)
      let isVisible = true;
      let isTabActive = typeof document !== 'undefined' ? !document.hidden : true;

      const render = () => {
        if (!renderer || !scene || !camera) return;
        if (!isVisible || !isTabActive) return;
        renderer.render(scene, camera);
      };

      controls.addEventListener('change', render);

      // Initial render & draw calls reporting
      render();
      const initialCalls = renderer.info?.render?.calls ?? 0;
      console.info(`[ClayFarmScene] initial draw calls: ${initialCalls}`);

      // Intro turn (stops after 4 seconds)
      const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let introTimer = null;
      let introActive = !prefersReduced;

      if (introActive) {
        let prevTime = performance.now();
        const runIntro = (time) => {
          if (!introActive) return;
          const delta = (time - prevTime) / 1000;
          prevTime = time;
          if (isVisible && isTabActive && !isInteracting) {
            sceneGroup.rotation.y += 0.05 * delta;
            render();
          }
          animId = requestAnimationFrame(runIntro);
        };
        animId = requestAnimationFrame(runIntro);

        introTimer = setTimeout(() => {
          introActive = false;
          if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
          }
        }, 4000);
      }

      // Intersection Observer to pause rendering when off-screen
      let intersectionObserver = null;
      if (typeof IntersectionObserver !== 'undefined') {
        intersectionObserver = new IntersectionObserver((entries) => {
          const entry = entries[0];
          isVisible = entry ? entry.isIntersecting : true;
          if (isVisible && isTabActive) {
            render();
          }
        }, { threshold: 0.1 });
        intersectionObserver.observe(container);
      }

      // Visibility change listener to pause rendering when tab is backgrounded
      const handleVisibilityChange = () => {
        isTabActive = typeof document !== 'undefined' ? !document.hidden : true;
        if (isTabActive && isVisible) {
          render();
        }
      };
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }

      // 15. Resize Observer
      const resizeObserver = new ResizeObserver(() => {
        if (!container) return;
        const nw = container.clientWidth || 600;
        const nh = container.clientHeight || 420;
        const nAspect = nw / nh;
        camera.left = (-frustumSize * nAspect) / 2;
        camera.right = (frustumSize * nAspect) / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
        render();
      });
      resizeObserver.observe(container);

      // Clean-up on unmount
      return () => {
        introActive = false;
        if (animId) cancelAnimationFrame(animId);
        if (introTimer) clearTimeout(introTimer);
        if (resumeTimeout) clearTimeout(resumeTimeout);
        controls.removeEventListener('change', render);
        if (intersectionObserver) intersectionObserver.disconnect();
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);

        disposables.forEach((item) => {
          if (item?.dispose) item.dispose();
        });
        if (controls?.dispose) controls.dispose();
        if (renderer?.dispose) renderer.dispose();
        if (container.contains(renderer?.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch (err) {
      console.warn('ClayFarmScene WebGL initialization error:', err);
      setWebGLError(true);
    }
  }, [viewMode, normalizedPlots, activeOverlay, cameraPreset, lang, onSelectPlot, webGLError]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400, overflow: 'hidden' }}>
      {/* Background Soft Accent Glow in DOM behind canvas (floating diorama look) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 55%, rgba(197, 232, 108, 0.12) 0%, transparent 68%)',
        }}
      />

      {/* 2D Schematic Fallback */}
      {(viewMode === '2d' || webGLError) ? (
        <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, flex: 1 }}>
            {normalizedPlots.map((plot) => {
              const info = getPlotOverlayInfo(plot, activeOverlay, lang);
              const isSelected = plot.id === selectedPlotId;
              return (
                <div
                  key={plot.id}
                  onClick={() => {
                    setSelectedPlotId(plot.id);
                    onSelectPlot?.(plot);
                  }}
                  style={{
                    background: isSelected ? 'rgba(197, 232, 108, 0.15)' : 'rgba(16, 28, 22, 0.62)',
                    border: isSelected ? '2px solid #c5e86c' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 14,
                    padding: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#eef3ee' }}>{plot.name}</span>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: info.color }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: info.isAvailable ? '#eef3ee' : 'rgba(238, 243, 238, 0.45)' }}>
                    {info.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }} />
      )}

      {/* Floating Glass HUD Card for Selected Plot */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          background: CLAY_PALETTE.hud_bg,
          border: `1px solid ${CLAY_PALETTE.hud_border}`,
          borderRadius: 14,
          padding: '12px 16px',
          color: '#eef3ee',
          fontSize: 12,
          pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          maxWidth: 260,
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 16 }}>🌾</span>
          <strong style={{ fontSize: 13, color: '#c5e86c' }}>{selectedPlot?.name || 'Plot'}</strong>
          {selectedPlot?.hasAlert && (
            <span style={{ color: CLAY_PALETTE.alert, fontWeight: 700, fontSize: 11 }}>
              ● {lang === 'bn' ? 'সতর্কতা' : 'Alert'}
            </span>
          )}
        </div>
        <div style={{ color: 'rgba(238, 243, 238, 0.68)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div>
            <strong>{lang === 'bn' ? 'ফসল: ' : 'Crop: '}</strong>
            {selectedPlot?.crop || (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
          </div>
          <div>
            <strong>{lang === 'bn' ? 'মাটি: ' : 'Soil: '}</strong>
            {selectedPlot?.soil_texture || (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
          </div>
          <div>
            <strong>{lang === 'bn' ? 'বৃষ্টিপাত: ' : 'Rainfall: '}</strong>
            {selectedPlot?.rain_mm != null ? `${selectedPlot.rain_mm} mm` : (lang === 'bn' ? 'তথ্য নেই' : 'No data')}
          </div>
        </div>
      </div>

      {/* Honest Model Caption Banner */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 14,
          background: 'rgba(16, 28, 22, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 999,
          padding: '4px 12px',
          fontSize: 11,
          color: 'rgba(238, 243, 238, 0.68)',
          zIndex: 2,
        }}
      >
        {caption || (lang === 'bn' ? 'উদাহরণমূলক খামারের মডেল' : 'Illustrative Farm Diorama')}
      </div>
    </div>
  );
}

export default ClayFarmScene;
