import React from 'react';

export function Donut({
  segments = [], // [{ label, value, tone }]
  totalLabel = '',
  totalValue = null,
  size = 120,
  strokeWidth = 12,
  className = '',
  style = {}
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const validSegments = segments.filter(s => s && Number(s.value) > 0);
  const total = validSegments.reduce((sum, s) => sum + Number(s.value), 0);

  if (validSegments.length === 0 || total === 0) {
    return (
      <div
        className={`ui-donut-empty ${className}`}
        style={{
          width: size,
          height: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: `${strokeWidth}px solid rgba(255, 255, 255, 0.08)`,
          boxSizing: 'border-box',
          textAlign: 'center',
          color: 'var(--text-3)',
          fontSize: 11,
          ...style
        }}
      >
        <span>তথ্য নেই</span>
      </div>
    );
  }

  const toneColors = {
    accent: 'var(--accent)',
    leaf: 'var(--leaf)',
    water: 'var(--water)',
    sun: 'var(--sun)',
    alert: 'var(--alert)',
    hud: 'var(--hud-cyan, var(--accent))'
  };

  let cumulativeOffset = 0;

  return (
    <div
      className={`ui-donut ${className}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />
        {validSegments.map((seg, idx) => {
          const ratio = Number(seg.value) / total;
          const strokeDash = ratio * circumference;
          const offset = circumference - cumulativeOffset;
          cumulativeOffset += strokeDash;
          const color = toneColors[seg.tone] || seg.color || 'var(--accent)';

          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          );
        })}
      </svg>
      {(totalLabel || totalValue != null) && (
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          {totalValue != null && (
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
              {totalValue}
            </span>
          )}
          {totalLabel && (
            <span style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2 }}>
              {totalLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
