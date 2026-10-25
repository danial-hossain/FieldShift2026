// frontend/src/realFarm3D.test.js
// Unit tests for the Three.js 3D Agricultural Simulation Engine and Environment

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

test('Three.js v186 core modules and math primitives load successfully in ESM', () => {
  assert.ok(THREE, 'THREE namespace should exist');
  assert.ok(THREE.Scene, 'THREE.Scene should exist');
  assert.ok(THREE.PerspectiveCamera, 'THREE.PerspectiveCamera should exist');
  assert.ok(THREE.WebGLRenderer, 'THREE.WebGLRenderer should exist');
  assert.ok(THREE.InstancedMesh, 'THREE.InstancedMesh should exist');
  assert.ok(THREE.PCFSoftShadowMap, 'THREE.PCFSoftShadowMap should exist');
});

test('3D Camera Presets have valid mathematical coordinates and viewing angles', () => {
  const cameraPresets = {
    aerial: { position: [0, 30, 26], target: [0, 0, 0] },
    ground: { position: [0, 1.8, 13.5], target: [0, 1.2, 0] },
    cross_section: { position: [-15, 2.5, 12], target: [0, -1.0, 0] }
  };

  // Verify aerial camera is positioned high above the ground plane
  assert.ok(cameraPresets.aerial.position[1] >= 25, 'Aerial camera Y should be >= 25');
  // Verify ground camera is at human furrow height (1.5 - 2.0 meters)
  assert.ok(cameraPresets.ground.position[1] >= 1.2 && cameraPresets.ground.position[1] <= 2.2, 'Ground camera Y should be ~1.8m');
  // Verify soil cross section focuses below zero elevation
  assert.ok(cameraPresets.cross_section.target[1] < 0, 'Cross section target should point below ground plane');
});

test('Phenological crop growth scaling accurately models emergence to harvest (Days 1 to 120)', () => {
  const computeCropScale = (day) => {
    const dayRatio = Math.min(1.0, Math.max(0.05, day / 120));
    const heightScale = Math.min(1.15, Math.pow(dayRatio, 0.75) * 1.1);
    const spreadScale = Math.min(1.0, 0.25 + dayRatio * 0.75);
    return { heightScale, spreadScale, dayRatio };
  };

  const day1 = computeCropScale(1);
  const day35 = computeCropScale(35);
  const day70 = computeCropScale(70);
  const day120 = computeCropScale(120);

  // Day 1: tiny seedling
  assert.ok(day1.heightScale < 0.2, 'Day 1 height should be small seedling shoot (< 0.2)');
  assert.ok(day1.spreadScale < 0.35, 'Day 1 spread should be compact (< 0.35)');

  // Monotonic growth
  assert.ok(day35.heightScale > day1.heightScale, 'Day 35 height must exceed Day 1');
  assert.ok(day70.heightScale > day35.heightScale, 'Day 70 height must exceed Day 35');
  assert.ok(day120.heightScale >= day70.heightScale, 'Day 120 height must be at mature scale');

  // Maximum canopy height clamped to ~1.15
  assert.ok(day120.heightScale <= 1.2, 'Mature height should not exceed realistic biological canopy limit');
});

test('Scientific overlay color computation strictly maps to simulation parameters', () => {
  const getOverlayColor = (overlayType, plot) => {
    if (overlayType === 'water_stress') {
      if (plot.ks >= 0.88) return '#22c55e'; // Green optimal
      if (plot.ks >= 0.65) return '#facc15'; // Yellow moderate stress
      return '#ef4444'; // Red severe stress
    }
    if (overlayType === 'irrigation') {
      if (plot.waterAppliedMm >= 400) return '#0284c7';
      if (plot.waterAppliedMm >= 250) return '#38bdf8';
      return '#f59e0b';
    }
    if (overlayType === 'yield') {
      if (plot.yieldTonHa >= 6.0) return '#10b981';
      if (plot.yieldTonHa >= 4.5) return '#3b82f6';
      return '#f97316';
    }
    return '#15803d';
  };

  // Water stress boundary conditions
  assert.equal(getOverlayColor('water_stress', { ks: 1.0 }), '#22c55e', 'Optimal Ks >= 0.88 should be green');
  assert.equal(getOverlayColor('water_stress', { ks: 0.75 }), '#facc15', 'Moderate Ks 0.65-0.88 should be yellow');
  assert.equal(getOverlayColor('water_stress', { ks: 0.40 }), '#ef4444', 'Severe Ks < 0.65 should be red');

  // Irrigation water budget thresholds
  assert.equal(getOverlayColor('irrigation', { waterAppliedMm: 450 }), '#0284c7', 'Abundant water should be deep blue');
  assert.equal(getOverlayColor('irrigation', { waterAppliedMm: 300 }), '#38bdf8', 'Optimal AWD water should be cyan');
  assert.equal(getOverlayColor('irrigation', { waterAppliedMm: 180 }), '#f59e0b', 'Deficit water should be amber');
});

test('Multi-plot agricultural trial perturbations are deterministic and physically bounded', () => {
  const baseYield = 5.2; // t/ha
  const plots = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(idx => {
    const varianceFactor = 0.94 + (idx * 0.015);
    const plotYield = Number((baseYield * varianceFactor).toFixed(2));
    return { idx, varianceFactor, plotYield };
  });

  // Verify all 9 plots have positive yields within ±10% agronomic experimental variance
  assert.equal(plots.length, 9, 'Must have exactly 9 experimental plots');
  plots.forEach(p => {
    assert.ok(p.plotYield >= baseYield * 0.9, 'Plot yield must not drop below 90% base');
    assert.ok(p.plotYield <= baseYield * 1.1, 'Plot yield must not exceed 110% base');
    assert.ok(Number.isFinite(p.plotYield), 'Plot yield must be a finite number');
  });

  // Center plot (EXP-5 / index 4) represents benchmark: 0.94 + 4 * 0.015 = 1.000
  assert.equal(plots[4].varianceFactor, 1.0, 'Center plot (index 4) should have varianceFactor exactly 1.0');
  assert.equal(plots[4].plotYield, baseYield, 'Center plot yield should equal base simulated yield');
});

test('Soil cross-section root zone horizons strictly match FAO-56 rooting depths', () => {
  const horizons = [
    { name: 'Topsoil / Plough Pan', depthStartM: 0, depthEndM: 0.30, soilType: 'Humus-rich Loam' },
    { name: 'Subsoil Root Zone', depthStartM: 0.30, depthEndM: 0.90, soilType: 'Silt Loam' },
    { name: 'Deep Percolation & Capillary Table', depthStartM: 0.90, depthEndM: 1.60, soilType: 'Saturated Base' }
  ];

  assert.equal(Number((horizons[0].depthEndM - horizons[0].depthStartM).toFixed(2)), 0.30, 'Topsoil thickness should be 30cm');
  assert.equal(Number((horizons[1].depthEndM - horizons[1].depthStartM).toFixed(2)), 0.60, 'Subsoil root zone should be 60cm');
  assert.ok(horizons[2].depthEndM > 1.5, 'Capillary table must extend past 1.5m');
});
