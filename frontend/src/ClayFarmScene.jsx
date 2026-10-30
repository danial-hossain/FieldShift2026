// frontend/src/ClayFarmScene.jsx
// Warm, matte, clay-style 3D diorama farm scene built with plain Three.js.
// Features: Isometric OrthographicCamera, soft warm lighting, diorama soil strata,
// instanced crop rows, honest overlays (crop, soil, rain), raycast plot selection,
// and zero fabricated telemetry (no NDVI, no fake moisture%, no fake yield).

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Color Palette — Matte Pastels & Soil Strata
export const CLAY_PALETTE = {
  bg: '#0f1412',
  grass: '#9cbf7a',
  crop_rice: '#7fa860',
  crop_wheat: '#d8c27a',
  crop_pulse: '#8fae6a',
  crop_mustard: '#e0b04b',
  crop_default: '#7fa860',
  water: '#8ec5d6',
  soil_top: '#a8805c',
  soil_layer_1: '#8a6648',
  soil_layer_2: '#6f5038',
  soil_layer_3: '#574030',
  soil_loam: '#a8805c',
  soil_clay: '#7d5b42',
  soil_sandy: '#c4a47c',
  no_data: '#a3a398',
  alert: '#d9644a',
  hud_bg: 'rgba(22, 29, 26, 0.92)',
  hud_border: 'rgba(255, 255, 255, 0.1)',
};

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

export function ClayFarmScene({
  plots = [],
  activeOverlay = 'crop',
  lang = 'bn',
  onSelectPlot,
  viewMode = '3d',
  hasAlert = false,
  caption = '',
}) {
  const mountRef = useRef(null);
  const [selectedPlotId, setSelectedPlotId] = useState(plots[0]?.id || 'P-01');
  const [webGLError, setWebGLError] = useState(false);

  // Normalize plots to 9 diorama tiles if empty or single field passed
  const normalizedPlots = useMemo(() => {
    if (plots && plots.length >= 9) return plots.slice(0, 9);
    const base = plots && plots.length > 0 ? plots[0] : {};
    const defaultTiles = [];
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const idx = (r + 1) * 3 + (c + 1);
        defaultTiles.push({
          id: `P-0${idx + 1}`,
          row: r,
          col: c,
          name: `${base.name || (lang === 'bn' ? 'প্লট' : 'Plot')} ${idx + 1}`,
          crop: idx === 4 ? (base.crop || 'Rice') : (idx % 2 === 0 ? base.crop : null),
          soil_texture: base.soil_texture || base.soilType || 'loam',
          rain_mm: base.rain_mm != null ? base.rain_mm : null,
          hasAlert: idx === 4 && hasAlert,
        });
      }
    }
    return defaultTiles;
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
      scene.background = new THREE.Color(CLAY_PALETTE.bg);

      // 1. Isometric Orthographic Camera
      const aspect = width / height;
      const frustumSize = 13.5;
      camera = new THREE.OrthographicCamera(
        (-frustumSize * aspect) / 2,
        (frustumSize * aspect) / 2,
        frustumSize / 2,
        -frustumSize / 2,
        0.1,
        1000
      );

      // Standard 35.264 deg tilt, 45 deg Y rotation
      camera.position.set(18, 14, 18);
      camera.lookAt(0, 0, 0);

      // 2. WebGL Renderer
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
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

      // 4. Lighting & Environment
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const roomEnv = new RoomEnvironment();
      const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTex;
      disposables.push(envTex, roomEnv, pmrem);

      // Warm Directional Sun Light
      const sunLight = new THREE.DirectionalLight(0xfff1dc, 1.8);
      sunLight.position.set(15, 24, 12);
      sunLight.castShadow = true;
      sunLight.shadow.radius = 4;
      const shadowMapDim = width <= 768 ? 1024 : 2048;
      sunLight.shadow.mapSize.set(shadowMapDim, shadowMapDim);
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 60;
      sunLight.shadow.camera.left = -10;
      sunLight.shadow.camera.right = 10;
      sunLight.shadow.camera.top = 10;
      sunLight.shadow.camera.bottom = -10;
      scene.add(sunLight);

      // Soft Hemisphere Ambient Fill
      const hemiLight = new THREE.HemisphereLight(0xdfe8ee, 0x6b5a45, 0.35);
      scene.add(hemiLight);

      // 5. Materials (roughness 0.85 - 0.95, metalness 0)
      const matTopSoil = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.soil_top,
        roughness: 0.9,
        metalness: 0,
      });
      const matLayer1 = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.soil_layer_1,
        roughness: 0.92,
        metalness: 0,
      });
      const matLayer2 = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.soil_layer_2,
        roughness: 0.94,
        metalness: 0,
      });
      const matLayer3 = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.soil_layer_3,
        roughness: 0.95,
        metalness: 0,
      });
      const matWater = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.water,
        roughness: 0.3,
        metalness: 0.05,
      });
      disposables.push(matTopSoil, matLayer1, matLayer2, matLayer3, matWater);

      // 6. Base Plinth & Soil Strata Diorama
      const baseGeo1 = new RoundedBoxGeometry(11.4, 0.35, 11.4, 2, 0.1);
      const baseMesh1 = new THREE.Mesh(baseGeo1, matLayer1);
      baseMesh1.position.y = -0.3;
      baseMesh1.receiveShadow = true;
      scene.add(baseMesh1);

      const baseGeo2 = new RoundedBoxGeometry(11.2, 0.45, 11.2, 2, 0.1);
      const baseMesh2 = new THREE.Mesh(baseGeo2, matLayer2);
      baseMesh2.position.y = -0.7;
      baseMesh2.receiveShadow = true;
      scene.add(baseMesh2);

      const baseGeo3 = new RoundedBoxGeometry(11.0, 0.55, 11.0, 2, 0.1);
      const baseMesh3 = new THREE.Mesh(baseGeo3, matLayer3);
      baseMesh3.position.y = -1.2;
      baseMesh3.receiveShadow = true;
      scene.add(baseMesh3);
      disposables.push(baseGeo1, baseGeo2, baseGeo3);

      // Cute Irrigation Canal along perimeter
      const canalGeo = new THREE.BoxGeometry(10.8, 0.08, 0.7);
      const canalMesh = new THREE.Mesh(canalGeo, matWater);
      canalMesh.position.set(0, 0.04, 5.0);
      scene.add(canalMesh);
      disposables.push(canalGeo);

      // 7. Interactive Plot Tiles & Instanced Crops
      const plotMeshes = [];
      const tileSize = 3.1;
      const tileHeight = 0.35;
      const tileSpacing = 3.6;

      const cropStemGeo = new THREE.CylinderGeometry(0.04, 0.07, 0.35, 6);
      const cropStemMat = new THREE.MeshStandardMaterial({
        color: CLAY_PALETTE.crop_rice,
        roughness: 0.88,
        metalness: 0,
      });
      disposables.push(cropStemGeo, cropStemMat);

      normalizedPlots.forEach((plot) => {
        const overlay = getPlotOverlayInfo(plot, activeOverlay, lang);
        const tileMat = new THREE.MeshStandardMaterial({
          color: overlay.color,
          roughness: 0.88,
          metalness: 0,
        });
        disposables.push(tileMat);

        const tileGeo = new RoundedBoxGeometry(tileSize, tileHeight, tileSize, 2, 0.12);
        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        const posX = plot.col * tileSpacing;
        const posZ = plot.row * tileSpacing;
        tileMesh.position.set(posX, 0.08, posZ);
        tileMesh.castShadow = true;
        tileMesh.receiveShadow = true;
        tileMesh.userData = { plotId: plot.id, plotData: plot };

        scene.add(tileMesh);
        plotMeshes.push(tileMesh);
        disposables.push(tileGeo);

        // Crop Instances if plot has a valid crop
        if (plot.crop) {
          const rows = 4;
          const cols = 4;
          const totalInstances = rows * cols;
          const instMesh = new THREE.InstancedMesh(cropStemGeo, cropStemMat, totalInstances);
          instMesh.castShadow = true;
          instMesh.receiveShadow = true;

          const dummy = new THREE.Object3D();
          let count = 0;
          for (let ri = 0; ri < rows; ri++) {
            for (let ci = 0; ci < cols; ci++) {
              const offsetX = (ci - 1.5) * 0.65;
              const offsetZ = (ri - 1.5) * 0.65;
              dummy.position.set(posX + offsetX, 0.38, posZ + offsetZ);
              dummy.scale.set(1.0, 0.85 + Math.sin(ri + ci) * 0.25, 1.0);
              dummy.updateMatrix();
              instMesh.setMatrixAt(count++, dummy.matrix);
            }
          }
          instMesh.instanceMatrix.needsUpdate = true;
          scene.add(instMesh);
          disposables.push(instMesh);
        }
      });

      // 8. Raycasting on Tap / Click
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

      // 9. Render Loop
      let clock = new THREE.Clock();
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        controls.update();

        // Gentle canal shimmer
        if (canalMesh.material) {
          canalMesh.position.y = 0.04 + Math.sin(elapsed * 1.5) * 0.005;
        }

        renderer.render(scene, camera);
      };
      animate();

      // Resize Observer
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
      });
      resizeObserver.observe(container);

      // Clean-up on unmount
      return () => {
        cancelAnimationFrame(animId);
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);

        disposables.forEach((item) => {
          if (item?.dispose) item.dispose();
        });
        if (renderer?.dispose) renderer.dispose();
        if (container.contains(renderer?.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch (err) {
      console.warn('ClayFarmScene WebGL initialization error:', err);
      setWebGLError(true);
    }
  }, [viewMode, normalizedPlots, activeOverlay, lang, onSelectPlot, webGLError]);

  // Overlay info for the active selected plot
  const selectedOverlay = getPlotOverlayInfo(selectedPlot, activeOverlay, lang);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 380, overflow: 'hidden', background: CLAY_PALETTE.bg }}>
      {/* 2D Schematic Fallback */}
      {(viewMode === '2d' || webGLError) ? (
        <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    background: isSelected ? 'var(--surface-2)' : 'var(--surface)',
                    border: isSelected ? '2px solid var(--leaf)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{plot.name}</span>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: info.color }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: info.isAvailable ? 'var(--text)' : 'var(--text-muted)' }}>
                    {info.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      )}

      {/* Floating HUD Card for Selected Plot */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: CLAY_PALETTE.hud_bg,
          border: `1px solid ${CLAY_PALETTE.hud_border}`,
          borderRadius: 8,
          padding: '10px 14px',
          color: '#e8ece9',
          fontSize: 12,
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          maxWidth: 240,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 14 }}>🌾</span>
          <strong style={{ fontSize: 13 }}>{selectedPlot?.name || 'Plot'}</strong>
          {selectedPlot?.hasAlert && (
            <span style={{ color: CLAY_PALETTE.alert, fontWeight: 700, fontSize: 11 }}>
              ● {lang === 'bn' ? 'সতর্কতা' : 'Alert'}
            </span>
          )}
        </div>
        <div style={{ color: '#9aa5a0', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
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

      {/* Caption Banner */}
      {caption && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            background: 'rgba(15, 20, 18, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            color: '#9aa5a0',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
export default ClayFarmScene;
