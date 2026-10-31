import React from 'react';

export function SliderWithLabels({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange,
  ticks = [], // [{ value: 0, label: '0' }, { value: 100, label: '100' }]
  className = '',
  style = {}
}) {
  return (
    <div className={`ui-slider-with-labels ${className}`} style={{ margin: '12px 0', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        {label && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #e8ece9)' }}>
            {label}
          </span>
        )}
        <span style={{
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--primary, #00df81)',
          fontFamily: 'monospace'
        }}>
          {value} {unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--primary, #00df81)',
          cursor: 'pointer',
          height: '6px',
          borderRadius: '3px',
          background: 'var(--border-medium, #2a3742)',
          outline: 'none',
        }}
      />

      {ticks && ticks.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {ticks.map((t, idx) => (
            <span key={idx} style={{ fontSize: '10.5px', color: 'var(--text-dim, #7a8781)' }}>
              {t.label || t.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default SliderWithLabels;
