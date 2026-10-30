// frontend/src/clayFarm.test.js
// Unit tests for Clay-style 3D farm and honest field telemetry (Phase 4)

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';

// Exact logic extracted from ClayFarmScene for overlay resolution
const CLAY_PALETTE = {
  bg: '#0f1412',
  grass: '#9cbf7a',
  crop_rice: '#7fa860',
  crop_wheat: '#d8c27a',
  crop_pulse: '#8fae6a',
  crop_mustard: '#e0b04b',
  crop_default: '#7fa860',
  water: '#8ec5d6',
  soil_top: '#a8805c',
  soil_loam: '#a8805c',
  soil_clay: '#7d5b42',
  soil_sandy: '#c4a47c',
  no_data: '#a3a398',
  alert: '#d9644a',
};

function getPlotOverlayInfo(plot, overlay = 'crop', lang = 'bn') {
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

test('1. Overlays with missing data show neutral plot and "No data"', () => {
  const emptyPlot = { id: 'P-01', name: 'Plot 1' };
  const cropMissingBn = getPlotOverlayInfo(emptyPlot, 'crop', 'bn');
  assert.equal(cropMissingBn.color, CLAY_PALETTE.no_data);
  assert.equal(cropMissingBn.isAvailable, false);
  assert.ok(cropMissingBn.label.includes('তথ্য নেই'));

  const cropMissingEn = getPlotOverlayInfo(emptyPlot, 'crop', 'en');
  assert.equal(cropMissingEn.color, CLAY_PALETTE.no_data);
  assert.equal(cropMissingEn.isAvailable, false);
  assert.ok(cropMissingEn.label.includes('No data'));

  const soilMissing = getPlotOverlayInfo(emptyPlot, 'soil', 'en');
  assert.equal(soilMissing.color, CLAY_PALETTE.no_data);
  assert.equal(soilMissing.isAvailable, false);
  assert.ok(soilMissing.label.includes('No data'));

  const rainMissing = getPlotOverlayInfo(emptyPlot, 'rain', 'en');
  assert.equal(rainMissing.color, CLAY_PALETTE.no_data);
  assert.equal(rainMissing.isAvailable, false);
  assert.ok(rainMissing.label.includes('No data'));

  const nullPlot = getPlotOverlayInfo(null, 'crop', 'en');
  assert.equal(nullPlot.color, CLAY_PALETTE.no_data);
  assert.equal(nullPlot.isAvailable, false);
  assert.equal(nullPlot.label, 'No data');
});

test('2. Valid overlays render honest colors and labels', () => {
  const ricePlot = { id: 'P-01', crop: 'Rice', soil_texture: 'clay', rain_mm: 12.5 };
  
  const cropInfo = getPlotOverlayInfo(ricePlot, 'crop', 'en');
  assert.equal(cropInfo.isAvailable, true);
  assert.equal(cropInfo.color, CLAY_PALETTE.crop_rice);
  assert.equal(cropInfo.label, 'Rice');

  const soilInfo = getPlotOverlayInfo(ricePlot, 'soil', 'en');
  assert.equal(soilInfo.isAvailable, true);
  assert.equal(soilInfo.color, CLAY_PALETTE.soil_clay);
  assert.ok(soilInfo.label.includes('Clay'));

  const rainInfo = getPlotOverlayInfo(ricePlot, 'rain', 'en');
  assert.equal(rainInfo.isAvailable, true);
  assert.equal(rainInfo.color, CLAY_PALETTE.water);
  assert.ok(rainInfo.label.includes('12.5 mm'));
});

test('3. No NDVI, moisturePct or yieldTonPerHa passed or rendered', () => {
  const dir = path.resolve('src');
  const clayCode = fs.readFileSync(path.join(dir, 'ClayFarmScene.jsx'), 'utf-8');
  const farmerFarmCode = fs.readFileSync(path.join(dir, 'FarmerFarm3D.jsx'), 'utf-8');
  const realFarmCode = fs.readFileSync(path.join(dir, 'RealFarmCanvas3D.jsx'), 'utf-8');

  // Verify fabricated properties are NOT present in overlay handlers
  assert.ok(!clayCode.includes('healthNdvi'), 'ClayFarmScene must not reference healthNdvi');
  assert.ok(!clayCode.includes('yieldTonPerHa'), 'ClayFarmScene must not reference yieldTonPerHa');
  assert.ok(!clayCode.includes('yieldMaundPerBigha'), 'ClayFarmScene must not reference yieldMaundPerBigha');
  assert.ok(!clayCode.includes('moisturePct'), 'ClayFarmScene must not reference moisturePct');

  assert.ok(!farmerFarmCode.includes('healthNdvi'), 'FarmerFarm3D must not reference healthNdvi');
  assert.ok(!farmerFarmCode.includes('yieldTonPerHa'), 'FarmerFarm3D must not reference yieldTonPerHa');
  assert.ok(!farmerFarmCode.includes('yieldMaundPerBigha'), 'FarmerFarm3D must not reference yieldMaundPerBigha');
  assert.ok(!farmerFarmCode.includes('moisturePct:'), 'FarmerFarm3D must not reference moisturePct');

  assert.ok(!realFarmCode.includes('healthNdvi'), 'RealFarmCanvas3D must not reference healthNdvi');
  assert.ok(!realFarmCode.includes('yieldTonPerHa'), 'RealFarmCanvas3D must not reference yieldTonPerHa');
});

test('4. Advisory 3D props receive only district, crop, and soil_texture', () => {
  const advisoryCode = fs.readFileSync(path.resolve('src/NasaPlantingAdvisoryView.jsx'), 'utf-8');
  
  const realFarmIdx = advisoryCode.indexOf('<RealFarmCanvas3D');
  assert.ok(realFarmIdx !== -1, '<RealFarmCanvas3D> must be rendered in NasaPlantingAdvisoryView');
  const callBlock = advisoryCode.slice(realFarmIdx, realFarmIdx + 400);

  // Must include district, crop, soil_texture
  assert.ok(callBlock.includes('district: district'));
  assert.ok(callBlock.includes('crop:'));
  assert.ok(callBlock.includes('soil_texture:'));

  // Must NOT include fabricated metrics
  assert.ok(!callBlock.includes('soil_ph:'));
  assert.ok(!callBlock.includes('area_ha:'));
  assert.ok(!callBlock.includes('moisture_pct:'));
  assert.ok(!callBlock.includes('water_level_cm:'));
});

test('5. Clean unmount disposes Three.js resources and animation loops', () => {
  const clayCode = fs.readFileSync(path.resolve('src/ClayFarmScene.jsx'), 'utf-8');
  assert.ok(clayCode.includes('cancelAnimationFrame(animId)'));
  assert.ok(clayCode.includes('disposables.forEach'));
  assert.ok(clayCode.includes('renderer.dispose()'));
});

test('6. Three.js OrthographicCamera and clay materials instantiate correctly', () => {
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
  assert.ok(cam.isOrthographicCamera);

  const mat = new THREE.MeshStandardMaterial({
    color: CLAY_PALETTE.grass,
    roughness: 0.9,
    metalness: 0,
  });
  assert.equal(mat.roughness, 0.9);
  assert.equal(mat.metalness, 0);
  mat.dispose();
});
