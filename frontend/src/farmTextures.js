// frontend/src/farmTextures.js
// Procedural CanvasTextures for stylized clay diorama 3D farm
// Zero external assets/stock imagery: pure procedural math & Canvas 2D API.

import * as THREE from 'three';

function createSafeCanvas(width = 256, height = 256) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return { canvas, ctx };
  } catch {
    return null;
  }
}

/**
 * Grass blades texture: fine stippling and organic micro-variation.
 */
export function createGrassTexture() {
  const env = createSafeCanvas(256, 256);
  if (!env) return new THREE.Texture();

  const { canvas, ctx } = env;
  ctx.fillStyle = '#8fb760';
  ctx.fillRect(0, 0, 256, 256);

  // Micro stippling blades
  const greens = ['#7ea654', '#9bc26b', '#729948', '#a4cb74'];
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const len = 1.5 + Math.random() * 3.5;
    const angle = (Math.random() - 0.5) * 0.6;
    ctx.strokeStyle = greens[Math.floor(Math.random() * greens.length)];
    ctx.lineWidth = 0.8 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(angle) * len, y - Math.cos(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Tilled soil furrows texture: parallel ridge lines with crumbly earthy roughness.
 */
export function createTilledSoilTexture() {
  const env = createSafeCanvas(256, 256);
  if (!env) return new THREE.Texture();

  const { canvas, ctx } = env;
  ctx.fillStyle = '#7a4628';
  ctx.fillRect(0, 0, 256, 256);

  // Parallel furrows
  const ridgeHeight = 16;
  for (let y = 0; y < 256; y += ridgeHeight) {
    // Ridge crest (lighter warm brown)
    const crestGrad = ctx.createLinearGradient(0, y, 0, y + ridgeHeight);
    crestGrad.addColorStop(0, '#8d5331');
    crestGrad.addColorStop(0.4, '#a2623a');
    crestGrad.addColorStop(0.6, '#6b3c22');
    crestGrad.addColorStop(1, '#57301a');
    ctx.fillStyle = crestGrad;
    ctx.fillRect(0, y, 256, ridgeHeight);
  }

  // Crumbly soil noise
  ctx.fillStyle = 'rgba(40, 20, 10, 0.25)';
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 0.8 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Terracotta strata texture: layered sedimentary clay strata for diorama slab edges.
 */
export function createTerracottaStrataTexture() {
  const env = createSafeCanvas(256, 256);
  if (!env) return new THREE.Texture();

  const { canvas, ctx } = env;
  ctx.fillStyle = '#9a5a33';
  ctx.fillRect(0, 0, 256, 256);

  // Horizontal sedimentary layers with slight waviness
  const layerColors = ['#b36a3c', '#9a5a33', '#854c2b', '#6f3e23', '#5a311b', '#a46238'];
  let currentY = 0;
  while (currentY < 256) {
    const h = 18 + Math.random() * 28;
    const col = layerColors[Math.floor(Math.random() * layerColors.length)];
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, currentY);
    for (let x = 0; x <= 256; x += 32) {
      const dy = (Math.sin(x * 0.05 + currentY) * 2.5);
      ctx.lineTo(x, currentY + dy);
    }
    ctx.lineTo(256, currentY + h);
    ctx.lineTo(0, currentY + h);
    ctx.closePath();
    ctx.fill();
    currentY += h;
  }

  // Subtle horizontal silt striations
  ctx.strokeStyle = 'rgba(255, 230, 200, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Dirt path texture: fine compacted earth with subtle pebble grit.
 */
export function createDirtPathTexture() {
  const env = createSafeCanvas(256, 256);
  if (!env) return new THREE.Texture();

  const { canvas, ctx } = env;
  ctx.fillStyle = '#bfa585';
  ctx.fillRect(0, 0, 256, 256);

  // Micro mottling
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 0.5 + Math.random() * 1.5;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(120, 95, 70, 0.18)' : 'rgba(235, 220, 195, 0.16)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
