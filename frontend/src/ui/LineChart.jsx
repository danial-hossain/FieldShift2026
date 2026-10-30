import React, { useId } from 'react';

export function LineChart({
  series = [], // array of numbers or [{ x, y }]
  width = 280,
  height = 80,
  tone = 'accent', // 'accent' | 'leaf' | 'water' | 'sun' | 'alert' | 'hud'
  strokeWidth = 2,
  showGradient = true,
  className = '',
  style = {}
}) {
  const gradientId = useId();

  // Normalize numbers
  const points = series.map((pt, i) => {
    if (typeof pt === 'number') return { x: i, y: pt };
    if (pt && typeof pt.y === 'number') return { x: pt.x ?? i, y: pt.y };
    return null;
  }).filter(Boolean);

  if (points.length < 2) {
    return (
      <div
        className={`ui-linechart-empty ${className}`}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-3)',
          fontSize: 11,
          fontStyle: 'italic',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 8,
          border: '1px dashed var(--line)',
          ...style
        }}
      >
        তথ্য নেই
      </div>
    );
  }

  const yVals = points.map(p => p.y);
  const minY = Math.min(...yVals);
  const maxY = Math.max(...yVals);
  const ySpan = maxY - minY || 1;

  const padX = 8;
  const padY = 8;
  const drawW = width - padX * 2;
  const drawH = height - padY * 2;

  const coords = points.map((p, idx) => {
    const x = padX + (idx / (points.length - 1)) * drawW;
    const y = padY + drawH - ((p.y - minY) / ySpan) * drawH;
    return { x, y };
  });

  const pathD = coords.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z`;

  const toneColors = {
    accent: 'var(--accent)',
    leaf: 'var(--leaf)',
    water: 'var(--water)',
    sun: 'var(--sun)',
    alert: 'var(--alert)',
    hud: 'var(--hud-cyan, var(--accent))'
  };
  const strokeColor = toneColors[tone] || 'var(--accent)';

  return (
    <div className={`ui-linechart ${className}`} style={{ width, height, position: 'relative', ...style }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {showGradient && (
          <path d={areaD} fill={`url(#${gradientId})`} />
        )}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export const Sparkline = LineChart;
