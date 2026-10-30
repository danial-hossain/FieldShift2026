import React from 'react';

export function RingGauge({
  value = null,
  max = 100,
  label = '',
  unit = '%',
  tone = 'accent', // 'accent' | 'leaf' | 'water' | 'sun' | 'alert' | 'hud'
  size = 110,
  strokeWidth = 12,
  className = '',
  style = {}
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (value == null || isNaN(Number(value))) {
    return (
      <div
        className={`ui-ring-gauge-empty ${className}`}
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
          color: 'rgba(238, 243, 238, 0.42)',
          fontSize: 11,
          fontFamily: 'inherit',
          ...style
        }}
      >
        <span>তথ্য নেই</span>
        {label && <span style={{ fontSize: 9, marginTop: 2 }}>{label}</span>}
      </div>
    );
  }

  const numVal = Math.min(max, Math.max(0, Number(value)));
  const ratio = max > 0 ? numVal / max : 0;
  const offset = circumference - ratio * circumference;

  const toneColors = {
    accent: '#c5e86c',
    leaf: '#00df81',
    water: '#38bdf8',
    sun: '#facc15',
    alert: '#f43f5e',
    hud: '#00f0ff'
  };
  const strokeColor = toneColors[tone] || '#c5e86c';

  return (
    <div
      className={`ui-ring-gauge ${className}`}
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
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      {/* Center Label */}
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
        <span style={{ fontSize: size >= 100 ? 18 : 14, fontWeight: 700, color: '#eef3ee', lineHeight: 1 }}>
          {value}{unit}
        </span>
        {label && (
          <span style={{ fontSize: 10, color: 'rgba(238, 243, 238, 0.68)', marginTop: 3, textAlign: 'center', maxWidth: size * 0.75 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
