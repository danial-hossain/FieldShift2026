// frontend/src/RealFarmCanvas3D.jsx
// Professional Three.js Real-time 3D Agricultural Simulation Canvas
// Features: Perspective camera with OrbitControls, procedural textures, instanced crop tillers (paddy),
// 3D canal with animated water flow, solar pump station, agro-meteorological research mast,
// root-zone soil cross-section, dynamic scientific overlays, interactive raycasting, and WebGL fallback.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Procedural texture generators for self-contained, offline-safe 3D materials
function createProceduralSoilTexture(baseColor = '#422817', noiseColor = '#2b170c') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // Layer fine organic soil grain
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 35;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain * 0.8));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain * 0.6));
  }
  ctx.putImageData(imgData, 0, 0);

  // Furrow lines
  ctx.strokeStyle = 'rgba(20, 10, 5, 0.25)';
  ctx.lineWidth = 4;
  for (let y = 16; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function createProceduralWaterNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(128, 128);
  const d = imgData.data;
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const idx = (y * 128 + x) * 4;
      const wave = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.5 + 0.5;
      d[idx] = Math.floor(128 + (Math.sin(x * 0.2) * 60)); // Nx
      d[idx + 1] = Math.floor(128 + (Math.cos(y * 0.2) * 60)); // Ny
      d[idx + 2] = 255; // Nz
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

// Single rice plant tiller geometry (procedural 3D blade clump)
function createRiceTillerGeometry() {
  const geom = new THREE.BufferGeometry();
  // 5 curved blade leaves originating from base stem
  const vertices = [];
  const normals = [];
  const uvs = [];

  const angles = [0, 1.25, 2.5, 3.75, 5.0];
  angles.forEach((angle, leafIdx) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const length = 0.85 + (leafIdx % 3) * 0.12;
    const droop = 0.25;

    // 4 segment quad strip per leaf
    const segments = 4;
    for (let s = 0; s < segments; s++) {
      const t1 = s / segments;
      const t2 = (s + 1) / segments;
      const w1 = (1 - t1 * 0.7) * 0.055;
      const w2 = (1 - t2 * 0.7) * 0.055;

      const y1 = t1 * length - Math.pow(t1, 2) * droop;
      const y2 = t2 * length - Math.pow(t2, 2) * droop;

      const r1 = t1 * 0.3;
      const r2 = t2 * 0.3;

      const x1 = cos * r1;
      const z1 = sin * r1;
      const x2 = cos * r2;
      const z2 = sin * r2;

      // Triangle 1
      vertices.push(
        x1 - sin * w1, y1, z1 + cos * w1,
        x1 + sin * w1, y1, z1 - cos * w1,
        x2 - sin * w2, y2, z2 + cos * w2
      );
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
      uvs.push(0, t1, 1, t1, 0, t2);

      // Triangle 2
      vertices.push(
        x1 + sin * w1, y1, z1 - cos * w1,
        x2 + sin * w2, y2, z2 - cos * w2,
        x2 - sin * w2, y2, z2 + cos * w2
      );
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
      uvs.push(1, t1, 1, t2, 0, t2);
    }
  });

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.computeVertexNormals();
  return geom;
}

export function RealFarmCanvas3D({
  experimentalPlots = [],
  activeOverlay = 'crop',
  currentDayStep = 120,
  selectedPlotIndex = 4,
  onSelectPlot,
  cameraMode = 'aerial', // 'aerial' | 'ground' | 'cross_section' | 'orbit'
  showSoilCrossSection = false,
  showWireframe = false,
  isAutoRotate = false,
  cropType = 'rice',
  lang = 'bn'
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Instanced Meshes & Dynamic Elements
  const instancedCropsRef = useRef([]);
  const plotMeshesRef = useRef([]);
  const waterMeshRef = useRef(null);
  const anemometerCupsRef = useRef(null);
  const soilCrossSectionGroupRef = useRef(null);

  const [fps, setFps] = useState(60);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [hoveredPlot, setHoveredPlot] = useState(null);

  // Initialize Scene, Camera, Renderer, Lighting, and Controls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebGlSupported(false);
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // 1. Scene & Atmospheric Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1329');
    scene.fog = new THREE.FogExp2('#0b1329', 0.015);
    sceneRef.current = scene;

    // 2. Perspective Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(0, 26, 28);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High Quality & Soft Shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't go below ground
    controls.minDistance = 4;
    controls.maxDistance = 85;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Physically Plausible Sunlight & Ambient Fill
    const sunLight = new THREE.DirectionalLight('#fffbeb', 2.2);
    sunLight.position.set(20, 35, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    const d = 24;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight('#38bdf8', '#1e293b', 0.85);
    scene.add(hemiLight);

    const labPointLight = new THREE.PointLight('#38bdf8', 1.2, 30);
    labPointLight.position.set(0, 8, 0);
    scene.add(labPointLight);

    // 6. Agricultural Terrain Base (Loam field with subtle elevation)
    const soilTexture = createProceduralSoilTexture();
    const terrainGeo = new THREE.PlaneGeometry(54, 54, 32, 32);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: '#261b11',
      map: soilTexture,
      roughness: 0.95,
      metalness: 0.05
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.05;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Lab Reference Grid Line Markings
    const gridHelper = new THREE.GridHelper(50, 25, '#38bdf8', '#1e293b');
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // 7. Concrete Irrigation Canal (সেচ চ্যানেল)
    const canalGroup = new THREE.Group();
    const canalLength = 36;
    const canalWidth = 1.4;
    const canalDepth = 0.7;

    // Concrete bed
    const canalBedGeo = new THREE.BoxGeometry(canalWidth + 0.5, 0.2, canalLength);
    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      roughness: 0.85,
      metalness: 0.15
    });
    const canalBed = new THREE.Mesh(canalBedGeo, concreteMat);
    canalBed.position.set(13.5, 0.05, 0);
    canalBed.receiveShadow = true;
    canalGroup.add(canalBed);

    // Canal walls
    const wallGeo = new THREE.BoxGeometry(0.25, canalDepth, canalLength);
    const leftWall = new THREE.Mesh(wallGeo, concreteMat);
    leftWall.position.set(13.5 - (canalWidth / 2 + 0.12), canalDepth / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    canalGroup.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, concreteMat);
    rightWall.position.set(13.5 + (canalWidth / 2 + 0.12), canalDepth / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    canalGroup.add(rightWall);

    // Flowing Water Surface in Canal
    const waterNormalMap = createProceduralWaterNormalMap();
    const waterGeo = new THREE.PlaneGeometry(canalWidth, canalLength);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.12,
      metalness: 0.3,
      normalMap: waterNormalMap,
      transparent: true,
      opacity: 0.88
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(13.5, canalDepth - 0.15, 0);
    waterMeshRef.current = waterMesh;
    canalGroup.add(waterMesh);

    // PVC Inflow pipes into plots
    const pipeMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 });
    for (let p = -1; p <= 1; p++) {
      const pipeGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.2, 16);
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(11.5, 0.45, p * 8.5);
      pipe.castShadow = true;
      canalGroup.add(pipe);

      // Valve wheel
      const valveGeo = new THREE.TorusGeometry(0.18, 0.04, 8, 16);
      const valveMat = new THREE.MeshStandardMaterial({ color: '#ef4444' });
      const valve = new THREE.Mesh(valveGeo, valveMat);
      valve.rotation.y = Math.PI / 2;
      valve.position.set(12.5, 0.65, p * 8.5);
      canalGroup.add(valve);
    }
    scene.add(canalGroup);

    // 8. Solar Photovoltaic Pumping Station (সৌর পাম্পিং স্টেশন)
    const pumpGroup = new THREE.Group();
    pumpGroup.position.set(13.5, 0, -16);

    // Solar panels array (angled at 24° for Bogura latitude)
    const panelFrameGeo = new THREE.BoxGeometry(4.2, 0.1, 2.6);
    const panelFrameMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.3 });
    const panelFrame = new THREE.Mesh(panelFrameGeo, panelFrameMat);
    panelFrame.position.set(0, 2.3, 0);
    panelFrame.rotation.x = 24 * (Math.PI / 180);
    panelFrame.castShadow = true;
    pumpGroup.add(panelFrame);

    // Solar PV cells
    const pvCellsGeo = new THREE.PlaneGeometry(4.0, 2.4);
    const pvCellsMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.15,
      metalness: 0.95
    });
    const pvCells = new THREE.Mesh(pvCellsGeo, pvCellsMat);
    pvCells.rotation.x = -Math.PI / 2 + 24 * (Math.PI / 180);
    pvCells.position.set(0, 2.36, 0);
    pumpGroup.add(pvCells);

    // Steel leg struts
    const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.3, 8);
    const strutMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.9 });
    const s1 = new THREE.Mesh(strutGeo, strutMat);
    s1.position.set(-1.8, 1.15, 0.8);
    s1.castShadow = true;
    pumpGroup.add(s1);
    const s2 = new THREE.Mesh(strutGeo, strutMat);
    s2.position.set(1.8, 1.15, 0.8);
    s2.castShadow = true;
    pumpGroup.add(s2);

    // Pump controller box & motor housing
    const pumpBoxGeo = new THREE.BoxGeometry(0.9, 1.1, 0.7);
    const pumpBoxMat = new THREE.MeshStandardMaterial({ color: '#0284c7', metalness: 0.4 });
    const pumpBox = new THREE.Mesh(pumpBoxGeo, pumpBoxMat);
    pumpBox.position.set(0, 0.55, 1.5);
    pumpBox.castShadow = true;
    pumpGroup.add(pumpBox);

    scene.add(pumpGroup);

    // 9. Agro-Meteorological Research Mast (আবহাওয়া স্টেশন)
    const mastGroup = new THREE.Group();
    mastGroup.position.set(-15, 0, -12);

    // 3D lattice tower
    const mastPoleGeo = new THREE.CylinderGeometry(0.12, 0.22, 7.5, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.7, roughness: 0.3 });
    const mastPole = new THREE.Mesh(mastPoleGeo, mastMat);
    mastPole.position.y = 3.75;
    mastPole.castShadow = true;
    mastGroup.add(mastPole);

    // Anemometer crossbar & rotating cups
    const anemometerGroup = new THREE.Group();
    anemometerGroup.position.y = 7.5;
    const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
    barGeo.rotateZ(Math.PI / 2);
    const crossBar = new THREE.Mesh(barGeo, mastMat);
    anemometerGroup.add(crossBar);

    // Cups
    const cupMat = new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.2 });
    const cupGeo = new THREE.SphereGeometry(0.14, 8, 8, 0, Math.PI);
    const cup1 = new THREE.Mesh(cupGeo, cupMat);
    cup1.position.x = 0.6;
    cup1.rotation.y = Math.PI / 2;
    anemometerGroup.add(cup1);
    const cup2 = new THREE.Mesh(cupGeo, cupMat);
    cup2.position.x = -0.6;
    cup2.rotation.y = -Math.PI / 2;
    anemometerGroup.add(cup2);
    anemometerCupsRef.current = anemometerGroup;
    mastGroup.add(anemometerGroup);

    // Solar radiation pyranometer & Campbell logger
    const loggerGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
    const loggerMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.5 });
    const logger = new THREE.Mesh(loggerGeo, loggerMat);
    logger.position.set(0, 2.2, 0.4);
    logger.castShadow = true;
    mastGroup.add(logger);

    scene.add(mastGroup);

    // 10. Subsurface Soil Cross-Section / Root Profile Slice Group
    const crossSectionGroup = new THREE.Group();
    crossSectionGroup.position.set(0, -0.01, 0);

    // Strata 1: Topsoil / Plough Pan (0 - 30cm)
    const topsoilSliceGeo = new THREE.BoxGeometry(7.5, 0.6, 7.5);
    const topsoilSliceMat = new THREE.MeshStandardMaterial({
      color: '#3d2614', // Rich humus dark loam
      roughness: 0.95,
      metalness: 0.05
    });
    const topsoilSlice = new THREE.Mesh(topsoilSliceGeo, topsoilSliceMat);
    topsoilSlice.position.set(0, -0.3, 0);
    topsoilSlice.receiveShadow = true;
    crossSectionGroup.add(topsoilSlice);

    // Strata 2: Subsoil Horizon (30cm - 90cm)
    const subsoilSliceGeo = new THREE.BoxGeometry(7.5, 1.2, 7.5);
    const subsoilSliceMat = new THREE.MeshStandardMaterial({
      color: '#5c4028', // Denser silt loam
      roughness: 0.98,
      metalness: 0.02
    });
    const subsoilSlice = new THREE.Mesh(subsoilSliceGeo, subsoilSliceMat);
    subsoilSlice.position.set(0, -1.2, 0);
    subsoilSlice.receiveShadow = true;
    crossSectionGroup.add(subsoilSlice);

    // Strata 3: Deep Percolation & Capillary Table (90cm - 160cm)
    const deepSliceGeo = new THREE.BoxGeometry(7.5, 1.4, 7.5);
    const deepSliceMat = new THREE.MeshStandardMaterial({
      color: '#2e424d', // Moist water-saturated stratum
      roughness: 0.7,
      metalness: 0.2
    });
    const deepSlice = new THREE.Mesh(deepSliceGeo, deepSliceMat);
    deepSlice.position.set(0, -2.5, 0);
    deepSlice.receiveShadow = true;
    crossSectionGroup.add(deepSlice);

    crossSectionGroup.visible = false;
    soilCrossSectionGroupRef.current = crossSectionGroup;
    scene.add(crossSectionGroup);

    // 11. Nine 3D Experimental Plots & Instanced Crop Tillers
    const plotMeshes = [];
    const instancedCrops = [];
    const tillerGeo = createRiceTillerGeometry();

    const plotWidth = 7.2;
    const plotLength = 7.2;
    const bundWidth = 0.55;
    const bundHeight = 0.35;

    // 3x3 layout spacing
    const coords = [-8.5, 0, 8.5];

    let plotIndex = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const xPos = coords[c];
        const zPos = coords[r];
        const currPlotIdx = plotIndex;

        // Plot soil bed
        const bedGeo = new THREE.BoxGeometry(plotWidth, 0.25, plotLength);
        const bedMat = new THREE.MeshStandardMaterial({
          color: '#362213',
          roughness: 0.9,
          metalness: 0.05
        });
        const bedMesh = new THREE.Mesh(bedGeo, bedMat);
        bedMesh.position.set(xPos, 0.12, zPos);
        bedMesh.receiveShadow = true;
        bedMesh.userData = { plotIndex: currPlotIdx };
        scene.add(bedMesh);
        plotMeshes.push(bedMesh);

        // Raised Earthen Bunds (আইল) around each plot
        const bundMat = new THREE.MeshStandardMaterial({ color: '#4a3319', roughness: 0.95 });
        // North bund
        const nBund = new THREE.Mesh(new THREE.BoxGeometry(plotWidth + bundWidth, bundHeight, bundWidth), bundMat);
        nBund.position.set(xPos, bundHeight / 2, zPos - (plotLength / 2 + bundWidth / 2));
        nBund.castShadow = true;
        nBund.receiveShadow = true;
        scene.add(nBund);
        // South bund
        const sBund = new THREE.Mesh(new THREE.BoxGeometry(plotWidth + bundWidth, bundHeight, bundWidth), bundMat);
        sBund.position.set(xPos, bundHeight / 2, zPos + (plotLength / 2 + bundWidth / 2));
        sBund.castShadow = true;
        sBund.receiveShadow = true;
        scene.add(sBund);
        // West bund
        const wBund = new THREE.Mesh(new THREE.BoxGeometry(bundWidth, bundHeight, plotLength), bundMat);
        wBund.position.set(xPos - (plotWidth / 2 + bundWidth / 2), bundHeight / 2, zPos);
        wBund.castShadow = true;
        wBund.receiveShadow = true;
        scene.add(wBund);
        // East bund
        const eBund = new THREE.Mesh(new THREE.BoxGeometry(bundWidth, bundHeight, plotLength), bundMat);
        eBund.position.set(xPos + (plotWidth / 2 + bundWidth / 2), bundHeight / 2, zPos);
        eBund.castShadow = true;
        eBund.receiveShadow = true;
        scene.add(eBund);

        // Instanced Crop Clumps for this plot (180 clumps per plot in a structured agricultural grid)
        const rowsCount = 12;
        const colsCount = 15;
        const instanceCount = rowsCount * colsCount;

        const cropMat = new THREE.MeshStandardMaterial({
          color: '#15803d',
          roughness: 0.6,
          metalness: 0.1,
          side: THREE.DoubleSide
        });

        const instancedMesh = new THREE.InstancedMesh(tillerGeo, cropMat, instanceCount);
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        let instIdx = 0;
        const xStep = (plotWidth - 0.8) / (colsCount - 1);
        const zStep = (plotLength - 0.8) / (rowsCount - 1);

        for (let row = 0; row < rowsCount; row++) {
          for (let col = 0; col < colsCount; col++) {
            const px = xPos - (plotWidth - 0.8) / 2 + col * xStep + (Math.random() - 0.5) * 0.12;
            const pz = zPos - (plotLength - 0.8) / 2 + row * zStep + (Math.random() - 0.5) * 0.12;
            const py = 0.24;

            dummy.position.set(px, py, pz);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.scale.set(1.0, 1.0, 1.0);
            dummy.updateMatrix();

            instancedMesh.setMatrixAt(instIdx, dummy.matrix);
            instancedMesh.setColorAt(instIdx, new THREE.Color('#15803d'));
            instIdx++;
          }
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
        if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
        scene.add(instancedMesh);
        instancedCrops.push(instancedMesh);

        plotIndex++;
      }
    }

    plotMeshesRef.current = plotMeshes;
    instancedCropsRef.current = instancedCrops;

    // 12. Interactive Raycaster for 3D Plot Hover & Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(plotMeshesRef.current);

      if (intersects.length > 0) {
        const hitPlot = intersects[0].object.userData.plotIndex;
        setHoveredPlot(hitPlot);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredPlot(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    const onPointerDown = (event) => {
      // Only handle primary left click
      if (event.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(plotMeshesRef.current);

      if (intersects.length > 0) {
        const hitPlot = intersects[0].object.userData.plotIndex;
        if (onSelectPlot) {
          onSelectPlot(hitPlot);
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // 13. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 14. Real-time Animation Loop & Performance Monitor
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();

    const animate = (currentTime) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      // Measure FPS
      frameCount++;
      if (currentTime - fpsTimer >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - fpsTimer)));
        frameCount = 0;
        fpsTimer = currentTime;
      }

      // Continuous Water Ripple Animation in Canal
      if (waterMeshRef.current && waterMeshRef.current.material.normalMap) {
        waterMeshRef.current.material.normalMap.offset.x = (currentTime * 0.0004) % 1;
        waterMeshRef.current.material.normalMap.offset.y = (currentTime * 0.0002) % 1;
      }

      // Anemometer Continuous Wind Spin
      if (anemometerCupsRef.current) {
        anemometerCupsRef.current.rotation.y += 0.045;
      }

      // Auto-rotation when enabled
      if (controlsRef.current) {
        controlsRef.current.autoRotate = isAutoRotate;
        controlsRef.current.autoRotateSpeed = 1.0;
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      }
      // Dispose GPU resources
      renderer.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      tillerGeo.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Camera Preset & Position with smooth transition
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (cameraMode === 'aerial') {
      camera.position.set(0, 30, 26);
      controls.target.set(0, 0, 0);
    } else if (cameraMode === 'ground') {
      camera.position.set(0, 1.8, 13.5);
      controls.target.set(0, 1.2, 0);
    } else if (cameraMode === 'cross_section') {
      camera.position.set(-15, 2.5, 12);
      controls.target.set(0, -1.0, 0);
    }
    controls.update();
  }, [cameraMode]);

  // Wireframe / Soil Cross-Section Toggle
  useEffect(() => {
    if (soilCrossSectionGroupRef.current) {
      soilCrossSectionGroupRef.current.visible = showSoilCrossSection;
    }
    if (plotMeshesRef.current) {
      plotMeshesRef.current.forEach((mesh) => {
        mesh.material.wireframe = showWireframe;
      });
    }
  }, [showSoilCrossSection, showWireframe]);

  // Update Dynamic Instanced Crop Phenology, Scales & Scientific Overlays
  useEffect(() => {
    const instancedCrops = instancedCropsRef.current;
    const plotMeshes = plotMeshesRef.current;
    if (!instancedCrops || instancedCrops.length === 0) return;

    // Growth progression factor from Day 1 to Day 120
    const dayRatio = Math.min(1.0, Math.max(0.05, currentDayStep / 120));
    // Phenological height scale: emerges at 0.12x, reaches 1.0x at day 85, matures at 1.05x
    const heightScale = Math.min(1.15, Math.pow(dayRatio, 0.75) * 1.1);

    // Tiller density spread expands from tillering stage (Day 25)
    const spreadScale = Math.min(1.0, 0.25 + dayRatio * 0.75);

    experimentalPlots.forEach((plot, plotIdx) => {
      const instMesh = instancedCrops[plotIdx];
      const bedMesh = plotMeshes[plotIdx];
      if (!instMesh) return;

      const isSelected = selectedPlotIndex === plotIdx;
      const isHovered = hoveredPlot === plotIdx;

      // 1. Bed Elevation & Border Highlight
      if (bedMesh) {
        bedMesh.position.y = isSelected ? 0.35 : isHovered ? 0.22 : 0.12;

        // Overlay Colors for Soil Bed
        let bedColor = '#362213';
        if (activeOverlay === 'soil') {
          bedColor = plot.moisturePct > 70 ? '#1f2937' : '#573a20';
        } else if (activeOverlay === 'water_stress') {
          bedColor = plot.ks < 0.7 ? '#7f1d1d' : '#14532d';
        }
        bedMesh.material.color.set(isSelected ? '#38bdf8' : bedColor);
      }

      // 2. Crop Color Computation based on Scientific Overlay
      let targetColor = '#15803d'; // Default healthy vegetative green

      if (activeOverlay === 'crop') {
        if (dayRatio < 0.22) {
          targetColor = '#84cc16'; // Early seedling
        } else if (dayRatio < 0.70) {
          targetColor = plot.isTarget ? '#22c55e' : '#15803d';
        } else if (dayRatio < 0.90) {
          targetColor = '#a3e635'; // Panicle / flowering
        } else {
          targetColor = '#eab308'; // Golden ripe paddy
        }
      } else if (activeOverlay === 'growth') {
        if (dayRatio < 0.25) targetColor = '#a3e635';
        else if (dayRatio < 0.70) targetColor = '#16a34a';
        else targetColor = '#ca8a04';
      } else if (activeOverlay === 'irrigation') {
        if (plot.waterAppliedMm >= 400) targetColor = '#0284c7'; // Abundant
        else if (plot.waterAppliedMm >= 250) targetColor = '#38bdf8'; // Optimal AWD
        else targetColor = '#f59e0b'; // Deficit
      } else if (activeOverlay === 'water_stress') {
        if (plot.ks >= 0.88) targetColor = '#22c55e'; // No stress
        else if (plot.ks >= 0.65) targetColor = '#facc15'; // Moderate stress
        else targetColor = '#ef4444'; // Severe drought stress
      } else if (activeOverlay === 'yield') {
        if (plot.yieldTonHa >= 6.0) targetColor = '#10b981';
        else if (plot.yieldTonHa >= 4.5) targetColor = '#3b82f6';
        else targetColor = '#f97316';
      } else if (activeOverlay === 'scenario_diff') {
        targetColor = plot.isTarget ? '#8b5cf6' : '#64748b';
      }

      // 3. Update all instanced tillers for this plot
      const dummy = new THREE.Object3D();
      const instanceCount = instMesh.count;
      const color = new THREE.Color(targetColor);

      for (let i = 0; i < instanceCount; i++) {
        instMesh.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

        // Adjust height and spread based on day
        dummy.scale.set(spreadScale, heightScale, spreadScale);
        dummy.updateMatrix();

        instMesh.setMatrixAt(i, dummy.matrix);
        instMesh.setColorAt(i, color);
      }

      instMesh.instanceMatrix.needsUpdate = true;
      if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
    });
  }, [experimentalPlots, activeOverlay, currentDayStep, selectedPlotIndex, hoveredPlot]);

  if (!webGlSupported) {
    return (
      <div className="webgl-fallback-container p-6 text-center text-slate-300 bg-slate-900 rounded-xl border border-slate-700">
        <div className="text-3xl mb-2">⚠️</div>
        <h4 className="text-lg font-semibold text-white mb-2">
          {lang === 'bn' ? 'ত্রিমাত্রিক (3D) ইঞ্জিন চালু করা যায়নি' : '3D WebGL Context Unavailable'}
        </h4>
        <p className="text-sm max-w-md mx-auto text-slate-400">
          {lang === 'bn'
            ? 'আপনার ব্রাউজারে হার্ডওয়্যার এক্সিলারেশন অথবা WebGL নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে ব্রাউজার সেটিংসে WebGL সক্ষম করুন।'
            : 'Hardware acceleration is disabled or unsupported in this environment. Showing 2D scientific data overlay fallback.'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[540px] rounded-xl overflow-hidden select-none">
      {/* Three.js Mount Container */}
      <div ref={mountRef} className="w-full h-full min-h-[540px]" />

      {/* Real-time 3D Engine HUD Stats */}
      <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/75 border border-slate-800 text-xs font-mono text-cyan-400 backdrop-blur-md pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>THREE.JS v186</span>
        <span className="text-slate-500">|</span>
        <span>{fps} FPS</span>
        <span className="text-slate-500">|</span>
        <span>1,620 CROP MESHES</span>
      </div>

      {/* Interactive Helper Hint */}
      <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 backdrop-blur-md pointer-events-none">
        {lang === 'bn'
          ? '🖱️ বাম ক্লিকে ৩ডি দৃশ্য ঘোরান | স্ক্রলে জুম | প্লটে ক্লিক করে নির্বাচন করুন'
          : '🖱️ Left-drag to Orbit | Scroll to Zoom | Click any plot to inspect'}
      </div>
    </div>
  );
}
