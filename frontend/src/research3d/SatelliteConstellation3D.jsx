// frontend/src/research3d/SatelliteConstellation3D.jsx
// Interactive Three.js 3D Earth & Satellite Sensor Constellation Visualizer
// Real-time orbital paths for NASA POWER, Sentinel-2 MSI, NASA SMAP, and Landsat-9

import React, { useRef, useEffect, useState, useId } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function SatelliteConstellation3D({
  selectedSensorId = null,
  onSelectSensor = null,
  height = 420,
}) {
  const mountRef = useRef(null);
  const animFrameRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const satellitesRef = useRef([]);

  const [activeSensor, setActiveSensor] = useState(selectedSensorId || 'nasa_power');
  const [isRotating, setIsRotating] = useState(true);
  const [hoveredInfo, setHoveredInfo] = useState(null);
  const [webGlSupported, setWebGlSupported] = useState(true);

  const canvasId = useId();

  const SENSORS = [
    {
      id: 'nasa_power',
      name: 'NASA POWER (MERRA-2)',
      agency: 'NASA Langley',
      orbitType: 'Synoptic Gridded Climatology (0.5° x 0.5°)',
      altitude: 'Reanalysis / Geostationary Assimilation',
      color: '#38bdf8',
      radius: 3.2,
      inclination: 0.25,
      speed: 0.008,
      status: 'OPERATIONAL CONNECTED',
      revisit: 'Daily updates (2-day lag)',
      bands: 'Solar All-Sky Insolation, T2M, RH2M, Precipitation',
    },
    {
      id: 'sentinel_2',
      name: 'Sentinel-2 MSI (ESA Copernicus)',
      agency: 'ESA / EU Copernicus',
      orbitType: 'Sun-synchronous Polar Orbit',
      altitude: '786 km (LEO)',
      color: '#00df81',
      radius: 2.5,
      inclination: 1.71, // ~98 deg
      speed: 0.018,
      status: 'PREREQUISITE READY (STANDBY)',
      revisit: '5 days (Twin constellation 2A/2B)',
      bands: 'B4 Red, B8 NIR, B11 SWIR (10m - 20m NDVI)',
    },
    {
      id: 'nasa_smap',
      name: 'NASA SMAP (Soil Moisture Active Passive)',
      agency: 'NASA JPL',
      orbitType: 'Sun-synchronous Polar Orbit (6:00 AM/PM)',
      altitude: '685 km (LEO)',
      color: '#f59e0b',
      radius: 2.3,
      inclination: 1.70,
      speed: 0.022,
      status: 'STANDBY (API AUTH REQUIRED)',
      revisit: '2-3 days global coverage',
      bands: 'L-Band Radiometer 1.41 GHz (Root-zone volumetric water)',
    },
    {
      id: 'landsat_9',
      name: 'Landsat-9 OLI-2 / TIRS-2',
      agency: 'NASA / USGS',
      orbitType: 'Sun-synchronous Polar Orbit',
      altitude: '705 km (LEO)',
      color: '#a78bfa',
      radius: 2.7,
      inclination: 1.72,
      speed: 0.015,
      status: 'STANDBY (USGS EROS CONNECTOR)',
      revisit: '8 days offset with Landsat 8',
      bands: 'Thermal Infrared (TIRS-2) ET0 & Crop Surface Temp',
    },
  ];

  useEffect(() => {
    if (selectedSensorId) {
      setActiveSensor(selectedSensorId);
    }
  }, [selectedSensorId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // WebGL Check
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

    const width = container.clientWidth || 700;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060b11);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.5, 3.2, 5.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.5;
    controls.maxDistance = 14;
    controlsRef.current = controls;

    // Lighting
    const ambient = new THREE.AmbientLight(0x223344, 1.4);
    scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(8, 6, 6);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-6, -3, -6);
    scene.add(rimLight);

    // Stars background
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 350;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 50;
      starPositions[i + 1] = (Math.random() - 0.5) * 50;
      starPositions[i + 2] = (Math.random() - 0.5) * 50;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.1, transparent: true, opacity: 0.6 });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // Earth Globe
    const earthRadius = 1.4;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x11273b,
      roughness: 0.65,
      metalness: 0.1,
      wireframe: false,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Lat-Long Graticule Grid
    const gridGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(earthRadius + 0.005, 18, 18));
    const gridMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.35 });
    const grid = new THREE.LineSegments(gridGeo, gridMat);
    scene.add(grid);

    // Atmosphere Glow Shell
    const atmoGeo = new THREE.SphereGeometry(earthRadius + 0.08, 36, 36);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmo);

    // Bangladesh Pinpoint (Bogura Demo Field: 24.8° N, 89.4° E)
    const latRad = (24.8 * Math.PI) / 180;
    const lonRad = (89.4 * Math.PI) / 180;
    const bdX = (earthRadius + 0.02) * Math.cos(latRad) * Math.cos(lonRad);
    const bdY = (earthRadius + 0.02) * Math.sin(latRad);
    const bdZ = (earthRadius + 0.02) * Math.cos(latRad) * Math.sin(lonRad);

    const bdMarkerGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const bdMarkerMat = new THREE.MeshBasicMaterial({ color: 0x00df81 });
    const bdMarker = new THREE.Mesh(bdMarkerGeo, bdMarkerMat);
    bdMarker.position.set(bdX, bdY, bdZ);
    scene.add(bdMarker);

    // Pulsing target ring
    const ringGeo = new THREE.RingGeometry(0.06, 0.08, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00df81, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(bdX, bdY, bdZ);
    ring.lookAt(0, 0, 0);
    scene.add(ring);

    // Build Satellites & Orbital Paths
    const satelliteObjects = [];
    SENSORS.forEach(sensor => {
      // Orbital Ring Track
      const trackPoints = [];
      const segments = 96;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = sensor.radius * Math.cos(theta);
        const y = sensor.radius * Math.sin(theta) * Math.sin(sensor.inclination);
        const z = sensor.radius * Math.sin(theta) * Math.cos(sensor.inclination);
        trackPoints.push(new THREE.Vector3(x, y, z));
      }
      const trackGeo = new THREE.BufferGeometry().setFromPoints(trackPoints);
      const trackMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(sensor.color),
        transparent: true,
        opacity: sensor.id === activeSensor ? 0.75 : 0.25,
      });
      const track = new THREE.Line(trackGeo, trackMat);
      scene.add(track);

      // Satellite Body Group
      const satGroup = new THREE.Group();

      // Main Bus
      const busGeo = new THREE.BoxGeometry(0.1, 0.08, 0.1);
      const busMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(sensor.color),
        roughness: 0.3,
        metalness: 0.8,
      });
      const bus = new THREE.Mesh(busGeo, busMat);
      satGroup.add(bus);

      // Solar Panels
      const panelGeo = new THREE.BoxGeometry(0.25, 0.01, 0.06);
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.9 });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      satGroup.add(panel);

      // Sensor Frustum Scan Cone
      const coneHeight = sensor.radius - earthRadius;
      const coneGeo = new THREE.ConeGeometry(0.35, coneHeight, 16, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(sensor.color),
        transparent: true,
        opacity: sensor.id === activeSensor ? 0.16 : 0.04,
        side: THREE.DoubleSide,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = -coneHeight / 2;
      cone.rotation.x = Math.PI;
      satGroup.add(cone);

      scene.add(satGroup);

      satelliteObjects.push({
        sensor,
        group: satGroup,
        track,
        trackMat,
        coneMat,
        angle: Math.random() * Math.PI * 2,
      });
    });

    satellitesRef.current = satelliteObjects;

    // Raycasting for interactive hover / click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = event => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const interactiveMeshes = satelliteObjects.map(s => s.group.children[0]);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const found = satelliteObjects.find(s => s.group.children[0] === intersects[0].object);
        if (found) {
          setHoveredInfo(found.sensor);
          document.body.style.cursor = 'pointer';
        }
      } else {
        setHoveredInfo(null);
        document.body.style.cursor = 'default';
      }
    };

    const onPointerDown = event => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const interactiveMeshes = satelliteObjects.map(s => s.group.children[0]);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const found = satelliteObjects.find(s => s.group.children[0] === intersects[0].object);
        if (found) {
          setActiveSensor(found.sensor.id);
          if (onSelectSensor) onSelectSensor(found.sensor.id);
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();

      // Earth slight rotation
      if (isRotating) {
        earth.rotation.y += 0.002;
        grid.rotation.y += 0.002;
      }

      // Satellites propagation along orbits
      satelliteObjects.forEach(sat => {
        if (isRotating) {
          sat.angle += sat.sensor.speed;
        }
        const x = sat.sensor.radius * Math.cos(sat.angle);
        const y = sat.sensor.radius * Math.sin(sat.angle) * Math.sin(sat.sensor.inclination);
        const z = sat.sensor.radius * Math.sin(sat.angle) * Math.cos(sat.sensor.inclination);

        sat.group.position.set(x, y, z);
        sat.group.lookAt(0, 0, 0);

        // Highlight active sensor
        const isActive = sat.sensor.id === activeSensor;
        sat.trackMat.opacity = isActive ? 0.75 : 0.22;
        sat.coneMat.opacity = isActive ? 0.18 : 0.03;
      });

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
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      }
      document.body.style.cursor = 'default';

      // Dispose resources
      scene.traverse(child => {
        if (child.isMesh || child.isLine || child.isPoints) {
          if (child.geometry) child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      renderer.dispose();
      container.replaceChildren();
    };
  }, [height, isRotating, activeSensor]);

  const activeSensorObj = SENSORS.find(s => s.id === activeSensor) || SENSORS[0];

  if (!webGlSupported) {
    return (
      <div style={{
        padding: '30px',
        textAlign: 'center',
        background: '#131920',
        borderRadius: '14px',
        border: '1px solid #1e293b',
        color: '#94a3b8'
      }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🛰️</div>
        <h4 style={{ color: '#f8fafc', margin: '0 0 6px' }}>WebGL Orbital Constellation Unavailable</h4>
        <p style={{ margin: 0, fontSize: 13 }}>Hardware acceleration disabled or WebGL context unavailable in current browser.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '24px' }}>
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        id={`satellite-canvas-${canvasId}`}
        style={{
          width: '100%',
          height: `${height}px`,
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at center, #0a1320 0%, #04080e 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
        }}
      />

      {/* Floating Glass Top Bar: Sensor Selectors & View Controls */}
      <div style={{
        position: 'absolute',
        top: 14,
        left: 14,
        right: 14,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        pointerEvents: 'none',
      }}>
        {/* Sensor Quick Switch Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', pointerEvents: 'auto' }}>
          {SENSORS.map(s => {
            const isSelected = s.id === activeSensor;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSensor(s.id);
                  if (onSelectSensor) onSelectSensor(s.id);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.75)',
                  border: `1px solid ${isSelected ? s.color : 'rgba(255, 255, 255, 0.12)'}`,
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  fontSize: '11.5px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                {s.name.split(' (')[0]}
              </button>
            );
          })}
        </div>

        {/* Orbit Action Controls */}
        <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto' }}>
          <button
            onClick={() => setIsRotating(!isRotating)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {isRotating ? '⏸️ Pause Orbit' : '▶️ Resume Orbit'}
          </button>
          <button
            onClick={() => {
              if (cameraRef.current && controlsRef.current) {
                cameraRef.current.position.set(4.5, 3.2, 5.0);
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
              }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#38bdf8',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            🎯 Center View
          </button>
        </div>
      </div>

      {/* Floating Glass Bottom Inspector: Active Sensor Details */}
      <div style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
        right: 14,
        background: 'rgba(11, 19, 30, 0.82)',
        border: `1px solid ${activeSensorObj.color}40`,
        borderRadius: '12px',
        padding: '12px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: `${activeSensorObj.color}20`,
            border: `1px solid ${activeSensorObj.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
          }}>
            🛰️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                {activeSensorObj.name}
              </span>
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: activeSensorObj.status.includes('OPERATIONAL') ? 'rgba(0, 223, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: activeSensorObj.status.includes('OPERATIONAL') ? '#00df81' : '#f59e0b',
                fontWeight: 700,
              }}>
                {activeSensorObj.status}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
              Agency: <span style={{ color: '#e2e8f0' }}>{activeSensorObj.agency}</span> • Orbit: <span style={{ color: '#38bdf8' }}>{activeSensorObj.orbitType}</span> ({activeSensorObj.altitude})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '18px', fontSize: '11.5px' }}>
          <div>
            <span style={{ color: '#64748b' }}>Cadence:</span>
            <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{activeSensorObj.revisit}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Target Field:</span>
            <div style={{ color: '#00df81', fontWeight: 600 }}>Bogura, Bangladesh (24.8°N, 89.4°E)</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Primary Telemetry:</span>
            <div style={{ color: '#38bdf8', fontWeight: 600 }}>{activeSensorObj.bands}</div>
          </div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredInfo && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.85)',
          color: '#ffffff',
          padding: '4px 12px',
          borderRadius: '6px',
          fontSize: '11px',
          border: `1px solid ${hoveredInfo.color}`,
          pointerEvents: 'none',
        }}>
          Click to inspect: {hoveredInfo.name}
        </div>
      )}
    </div>
  );
}
