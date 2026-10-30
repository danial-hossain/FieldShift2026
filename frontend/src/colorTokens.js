// Design token hex colors for Three.js, Canvas 2D, and WebGL contexts
// where CSS var(--...) cannot be evaluated.

export const COLOR_TOKENS = {
  bgDeep: '#050b10',
  bgSurface: '#0a151d',
  accent: '#c5e86c',
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
};

export function resolveColor(tokenName, fallback = '#00df81') {
  if (!tokenName) return fallback;
  const clean = tokenName.replace(/^--/, '').replace(/-([a-z])/g, (_, g) => g.toUpperCase());
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
