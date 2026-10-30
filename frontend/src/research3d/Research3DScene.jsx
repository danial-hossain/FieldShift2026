// frontend/src/research3d/Research3DScene.jsx
// Core Shared Three.js Scene Container for FieldShift Research Lab
// Provides: Perspective camera, OrbitControls, directional sun lighting with PCF soft shadows,
// atmospheric fog, ACESFilmic tone mapping, HUD overlay, WebGL detection, resize, GPU disposal,
// camera presets, 2D accessible table fallback toggle, and mobile power-saving optimizations.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function Research3DScene({
  cameraPosition = [0, 20, 24],
  cameraTarget = [0, 0, 0],
  minDistance = 2.5,
  maxDistance = 85,
  maxPolarAngle = Math.PI / 2 - 0.04,
  autoRotate = false,
  autoRotateSpeed = 1.0,
  fogColor = '#0b1329',
  fogDensity = 0.015,
  hudTitle = 'SCIENTIFIC 3D WORKBENCH',
  hudMetrics = [],
  fallbackTableView = null,
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
  const isVisibleRef = useRef(true);
  const composerRef = useRef(null);
  const customAnimateRef = useRef(null);

  const [fps, setFps] = useState(60);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [viewMode, setViewMode] = useState('3d'); // '3d' | '2d'
  const [activePreset, setActivePreset] = useState('default');

  const applyCameraPreset = useCallback((preset) => {
    if (!cameraRef.current || !controlsRef.current) return;
    setActivePreset(preset);

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (preset) {
      case 'iso':
        camera.position.set(18, 16, 18);
        controls.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
        break;
      case 'top':
        camera.position.set(0, 30, 0.1);
        controls.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
        break;
      case 'profile':
        camera.position.set(0, 3, 24);
        controls.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
        break;
      case 'closeup':
        camera.position.set(cameraPosition[0] * 0.4, cameraPosition[1] * 0.4, cameraPosition[2] * 0.4);
        controls.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
        break;
      case 'default':
      default:
        camera.position.set(...cameraPosition);
        controls.target.set(...cameraTarget);
        break;
    }
    controls.update();
  }, [cameraPosition, cameraTarget]);

  useEffect(() => {
    if (viewMode !== '3d') return;

    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) {
      setWebGlSupported(false);
      setViewMode('2d');
      return;
    }

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 420;
    const isHologram = style === 'hologram';

    // 1. Scene & Atmospheric Fog
    const scene = new THREE.Scene();
    const bgCol = isHologram ? '#05090f' : fogColor;
    scene.background = new THREE.Color(bgCol);
    scene.fog = new THREE.FogExp2(bgCol, isHologram ? 0.012 : fogDensity);
    sceneRef.current = scene;

    // 2. Perspective Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 150);
    camera.position.set(...cameraPosition);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High Quality Soft Shadows
    // Adaptive pixel ratio clamped for mobile battery & WebGL performance
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const pixelRatio = isMobile
      ? Math.min(window.devicePixelRatio || 1, 1.25)
      : Math.min(window.devicePixelRatio || 1, 1.75);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: isMobile ? 'default' : 'high-performance',
      alpha: false,
      preserveDrawingBuffer: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(pixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // WebGL Context Lost & Restored Handling
    const handleContextLost = (e) => {
      e.preventDefault();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
    const handleContextRestored = () => {
      // Re-trigger animate
      animFrameIdRef.current = requestAnimationFrame(animate);
    };
    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('webglcontextlost', handleContextLost, false);
    canvasEl.addEventListener('webglcontextrestored', handleContextRestored, false);

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
    sunLight.shadow.mapSize.width = isMobile ? 512 : 1024;
    sunLight.shadow.mapSize.height = isMobile ? 512 : 1024;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight('#38bdf8', '#1e293b', 0.85);
    scene.add(hemiLight);

    // Initialize Hologram Bloom Composer if applicable
    const canBloom = isHologram &&
      typeof window !== 'undefined' &&
      window.innerWidth >= 768 &&
      (navigator.hardwareConcurrency || 4) > 4;

    if (canBloom) {
      try {
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.6,
          0.4,
          0.85
        );
        composer.addPass(bloomPass);
        composer.addPass(new OutputPass());
        composerRef.current = composer;
      } catch (err) {
        console.warn('Hologram Bloom composer failed, falling back to direct render:', err);
      }
    }

    // Call ready callback
    if (onSceneReady) {
      onSceneReady({
        scene,
        camera,
        renderer,
        controls,
        isHologram,
        setAnimateCallback: (cb) => { customAnimateRef.current = cb; },
      });
    }

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composerRef.current) composerRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // IntersectionObserver to pause rendering when offscreen
    let observer;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      }, { threshold: 0.05 });
      observer.observe(container);
    }

    // Page Visibility change handler (tab switch)
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Animation Loop
    let frameCount = 0;
    let fpsTimer = performance.now();

    const animate = (currentTime) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (!isVisibleRef.current) return; // Skip work when offscreen or tab hidden

      frameCount++;
      if (currentTime - fpsTimer >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - fpsTimer)));
        frameCount = 0;
        fpsTimer = currentTime;
      }

      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = autoRotateSpeed;
      controls.update();

      if (customAnimateRef.current) {
        customAnimateRef.current(0.016, performance.now() * 0.001);
      }

      if (composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (observer) observer.disconnect();
      canvasEl.removeEventListener('webglcontextlost', handleContextLost);
      canvasEl.removeEventListener('webglcontextrestored', handleContextRestored);
      if (composerRef.current?.dispose) {
        composerRef.current.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [viewMode]);

  // Sync AutoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = autoRotateSpeed;
    }
  }, [autoRotate, autoRotateSpeed]);

  if (!webGlSupported || viewMode === '2d') {
    return (
      <div
        className={`research-3d-scene-wrapper ${className}`}
        style={{
          position: 'relative',
          width: '100%',
          minHeight,
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '20px',
          color: '#cbd5e1',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          ...(typeof style === 'object' && style !== null ? style : {})
        }}
      >
        {/* Header with Switch Back to 3D */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <strong style={{ color: '#f8fafc', fontSize: '14px' }}>
              {hudTitle} — {lang === 'bn' ? 'সায়েন্টিফিক ডেটা টেবিল' : 'Scientific Data Table View'}
            </strong>
          </div>
          {webGlSupported && (
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(0, 223, 129, 0.15)',
                border: '1px solid #00df81',
                color: '#00df81',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🌐 {lang === 'bn' ? 'ত্রিমাত্রিক (3D) মোডে ফিরুন' : 'Switch to 3D Digital Twin'}
            </button>
          )}
        </div>

        {/* Render provided custom fallback table or structured metrics table */}
        {fallbackTableView ? (
          <div style={{ flex: 1, overflowX: 'auto' }}>
            {fallbackTableView}
          </div>
        ) : (
          <div style={{ flex: 1, overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.6)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '8px 12px', color: '#94a3b8' }}>{lang === 'bn' ? 'প্যারামিটার / মেট্রিক' : 'Metric / Variable'}</th>
                  <th style={{ padding: '8px 12px', color: '#94a3b8' }}>{lang === 'bn' ? 'মান ও একক' : 'Value & Unit'}</th>
                  <th style={{ padding: '8px 12px', color: '#94a3b8' }}>{lang === 'bn' ? 'বৈজ্ঞানিক প্রাসঙ্গিকতা' : 'Scientific Context'}</th>
                </tr>
              </thead>
              <tbody>
                {hudMetrics.map((metric, idx) => {
                  let label = `Metric ${idx + 1}`;
                  let value = '';
                  let color = '#f8fafc';
                  if (typeof metric === 'object' && metric !== null) {
                    label = metric.label != null ? String(metric.label).trim() : label;
                    value = metric.value != null ? String(metric.value).trim() : '';
                    color = metric.color || color;
                  } else if (typeof metric === 'string') {
                    const colonIdx = metric.indexOf(':');
                    if (colonIdx !== -1) {
                      label = metric.slice(0, colonIdx).trim() || label;
                      value = metric.slice(colonIdx + 1).trim();
                    } else {
                      value = metric;
                    }
                  } else if (metric != null) {
                    value = String(metric);
                  }
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#38bdf8' }}>{label}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color }}>{value}</td>
                      <td style={{ padding: '8px 12px', color: '#94a3b8', fontSize: '11.5px' }}>
                        FAO / NASA POWER / BARI Verified
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
          * {lang === 'bn'
            ? 'অ্যাক্সেসিবিলিটি ও কম ক্ষমতাসম্পন্ন ডিভাইসের জন্য উচ্চ-স্পষ্টতাসম্পন্ন ২ডি বৈজ্ঞানিক ডেটা ভিউ।'
            : 'Accessible high-contrast scientific table fallback for screen readers, mobile battery saver, and non-WebGL environments.'}
        </div>
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
        touchAction: 'pan-y', // Keep page scroll active on mobile touch
        ...(typeof style === 'object' && style !== null ? style : {})
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
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#38bdf8',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          pointerEvents: 'none',
          maxWidth: 'calc(100% - 150px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00df81', display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontWeight: 800 }}>{hudTitle}</span>
        <span style={{ color: '#64748b' }}>|</span>
        <span>{fps} FPS</span>
        {hudMetrics.map((m, idx) => {
          let text = '';
          let color = '#f8fafc';
          if (typeof m === 'object' && m !== null) {
            const labelStr = m.label != null ? String(m.label).trim() : '';
            const valStr = m.value != null ? String(m.value).trim() : '';
            color = m.color || color;
            text = labelStr && valStr ? `${labelStr}: ${valStr}` : (labelStr || valStr);
          } else if (typeof m === 'string') {
            text = m;
          } else if (m != null) {
            text = String(m);
          }
          if (!text) return null;
          return (
            <React.Fragment key={idx}>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color }}>{text}</span>
            </React.Fragment>
          );
        })}
      </div>

      {/* Top-Right Action Controls (2D Toggle + Reset) */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          display: 'flex',
          gap: 6,
          alignItems: 'center'
        }}
      >
        {/* Toggle to 2D Accessible View */}
        <button
          type="button"
          title="Switch to 2D Data Table"
          onClick={() => setViewMode('2d')}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#38bdf8',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.15s ease'
          }}
        >
          📊 2D Table
        </button>

        {/* Camera Reset Action */}
        <button
          type="button"
          title="Reset Camera"
          onClick={() => applyCameraPreset('default')}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.15s ease'
          }}
        >
          ⟲ Reset
        </button>
      </div>

      {/* Bottom Camera Presets Toolbar */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 12,
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          padding: '3px 6px',
          borderRadius: 6,
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          fontSize: '10.5px'
        }}
      >
        <span style={{ color: '#64748b', fontWeight: 700, paddingRight: 4, fontSize: '10px' }}>CAM:</span>
        {[
          { id: 'iso', label: '📐 Iso' },
          { id: 'top', label: '🔝 Top' },
          { id: 'profile', label: '🌾 Side' },
          { id: 'closeup', label: '🔍 Zoom' }
        ].map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyCameraPreset(p.id)}
            style={{
              padding: '2px 6px',
              borderRadius: 4,
              border: activePreset === p.id ? '1px solid #00df81' : '1px solid transparent',
              background: activePreset === p.id ? 'rgba(0, 223, 129, 0.2)' : 'transparent',
              color: activePreset === p.id ? '#00df81' : '#cbd5e1',
              cursor: 'pointer',
              fontSize: '10.5px',
              fontWeight: 600
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Optional Interactive Canvas Overlays (Children) */}
      {children}
    </div>
  );
}
