// FieldShift Centralized Design System Tokens
// Colors, typography, spacing (4/8/12/16/24/32), radius (8/12/16), elevation (2 levels),
// and color resolution for Canvas 2D, Three.js WebGL, and SVG contexts.

export const SPACING_TOKENS = {
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 24,
  space6: 32,
};

export const RADIUS_TOKENS = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

export const ELEVATION_TOKENS = {
  level1: '0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.24)',
  level2: '0 4px 14px -1px rgba(0, 0, 0, 0.35), 0 2px 6px -1px rgba(0, 0, 0, 0.2)',
};

export const COLOR_TOKENS = {
  // Dark Theme (Default)
  bgDeep: '#050b10',
  bgSurface: '#0a151d',
  bgCard: '#161d23',
  bgCardSubtle: '#1c242c',
  accent: '#00df81',
  leaf: '#00df81',
  water: '#38bdf8',
  sun: '#facc15',
  alert: '#f43f5e',
  hudCyan: '#00f0ff',
  hudTeal: '#00df81',
  text: '#eef3ee',
  text2: '#a5b5a8',
  text3: '#687d6e',
  line: '#1d2f25',
  lineCyan: '#00f0ff',
  border: '#1f293d',
  soil: '#8a5a3a',
  grass: '#8fb760',

  // Light Theme Overrides (High-contrast daylight theme for outdoor sun/projectors >= 4.5:1)
  light: {
    bgDeep: '#f8fafc',
    bgSurface: '#ffffff',
    bgCard: '#ffffff',
    bgCardSubtle: '#f1f5f9',
    accent: '#047857',
    leaf: '#047857',
    water: '#0284c7',
    sun: '#d97706',
    alert: '#dc2626',
    hudCyan: '#0284c7',
    hudTeal: '#047857',
    text: '#0f172a',
    text2: '#334155',
    text3: '#64748b',
    line: '#e2e8f0',
    lineCyan: '#0284c7',
    border: '#cbd5e1',
    soil: '#92400e',
    grass: '#15803d',
  }
};

export function resolveColor(tokenName, fallback = '#00df81') {
  if (!tokenName) return fallback;
  const clean = tokenName.replace(/^--/, '').replace(/-([a-z])/g, (_, g) => g.toUpperCase());

  // Check if document is currently in light mode
  const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight && COLOR_TOKENS.light && COLOR_TOKENS.light[clean]) {
    return COLOR_TOKENS.light[clean];
  }

  if (COLOR_TOKENS[clean]) return COLOR_TOKENS[clean];

  if (typeof window !== 'undefined' && window.getComputedStyle) {
    try {
      const varName = tokenName.startsWith('--') ? tokenName : `--${tokenName}`;
      const val = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (val && !val.startsWith('var(')) return val;
    } catch (_) {}
  }

  return COLOR_TOKENS[tokenName] || fallback;
}

export default COLOR_TOKENS;
