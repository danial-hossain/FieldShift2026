// frontend/src/research3d/Research3DScene.jsx
// Core Shared Three.js Scene Container for FieldShift Research Lab
// Provides: Perspective camera, OrbitControls, directional sun lighting with PCF soft shadows,
// atmospheric fog, ACESFilmic tone mapping, HUD overlay, WebGL detection, resize, and GPU disposal.

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function Research3DScene({
  cameraPosition = [0, 20, 24],
  cameraTarget = [0, 0, 0],
  minDistance = 3,
  maxDistance = 75,
  maxPolarAngle = Math.PI / 2 - 0.04,
  autoRotate = false,
  autoRotateSpeed = 1.0,
  fogColor = '#0b1329',
  fogDensity = 0.015,
  hudTitle = 'SCIENTIFIC 3D WORKBENCH',
  hudMetrics = [],
  onSceneReady,
  children,
  className = '',
  style = {},
  minHeight = '420px',
  lang = 'bn'
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameIdRef = useRef(null);

  const [fps, setFps] = useState(60);
  const [webGlSupported, setWebGlSupported] = useState(true);

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

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 420;

    // 1. Scene & Atmospheric Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(fogColor);
    scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    sceneRef.current = scene;

    // 2. Perspective Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 150);
    camera.position.set(...cameraPosition);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High Quality Soft Shadows
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
    controls.maxPolarAngle = maxPolarAngle;
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    controls.target.set(...cameraTarget);
    controlsRef.current = controls;

    // 5. Lighting
    const sunLight = new THREE.DirectionalLight('#fffbeb', 2.0);
    sunLight.position.set(16, 28, 14);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight('#38bdf8', '#1e293b', 0.85);
    scene.add(hemiLight);

    // Call ready callback
    if (onSceneReady) {
      onSceneReady({ scene, camera, renderer, controls });
    }

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let frameCount = 0;
    let fpsTimer = performance.now();

    const animate = (currentTime) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      frameCount++;
      if (currentTime - fpsTimer >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - fpsTimer)));
        frameCount = 0;
        fpsTimer = currentTime;
      }

      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = autoRotateSpeed;
      controls.update();

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync AutoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = autoRotateSpeed;
    }
  }, [autoRotate, autoRotateSpeed]);

  if (!webGlSupported) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
        <h4 style={{ margin: '0 0 6px', color: '#f8fafc', fontSize: '15px', fontWeight: 800 }}>
          {lang === 'bn' ? 'ত্রিমাত্রিক (3D) ইঞ্জিন উপলব্ধ নয়' : '3D WebGL Context Unavailable'}
        </h4>
        <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8' }}>
          {lang === 'bn'
            ? 'আপনার ব্রাউজারে হার্ডওয়্যার এক্সিলারেশন চালু নেই। সায়েন্টিফিক চার্ট ও ডেটা টেবিল প্রদর্শিত হচ্ছে।'
            : 'Hardware acceleration is disabled. Showing 2D scientific tables and metrics fallback.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`research-3d-scene-wrapper ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        minHeight,
        borderRadius: '12px',
        overflow: 'hidden',
        userSelect: 'none',
        ...style
      }}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight }} />

      {/* Top HUD Stats Badge */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px',
          borderRadius: 6,
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#38bdf8',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none'
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00df81', display: 'inline-block' }} />
        <span>{hudTitle}</span>
        <span style={{ color: '#64748b' }}>|</span>
        <span>{fps} FPS</span>
        {hudMetrics.map((m, idx) => (
          <React.Fragment key={idx}>
            <span style={{ color: '#64748b' }}>|</span>
            <span>{m}</span>
          </React.Fragment>
        ))}
      </div>

      {/* Camera Reset Action */}
      <button
        type="button"
        title="Reset Camera"
        onClick={() => {
          if (cameraRef.current && controlsRef.current) {
            cameraRef.current.position.set(...cameraPosition);
            controlsRef.current.target.set(...cameraTarget);
            controlsRef.current.update();
          }
        }}
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          padding: '4px 8px',
          borderRadius: 6,
          background: 'rgba(30, 41, 59, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#f8fafc',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.15s ease'
        }}
      >
        ⟲ Reset Camera
      </button>

      {/* Optional Interactive Canvas Overlays (Children) */}
      {children}
    </div>
  );
}
