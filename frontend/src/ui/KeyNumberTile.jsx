import React from 'react';

export function KeyNumberTile({
  label,
  value,
  unit = '',
  delta = null,
  deltaType = 'positive', // 'positive' | 'negative' | 'neutral'
  deltaLabel = '',
  source = '',
  icon = null,
  highlight = false,
  className = '',
  style = {}
}) {
  const getDeltaStyle = () => {
    if (deltaType === 'positive') {
      return { background: 'rgba(0, 223, 129, 0.15)', color: '#00df81', border: '1px solid rgba(0, 223, 129, 0.3)' };
    }
    if (deltaType === 'negative') {
      return { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' };
    }
    return { background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' };
  };

  return (
    <div
      className={`ui-key-number-tile ${highlight ? 'highlight' : ''} ${className}`}
      style={{
        background: 'var(--bg-card, #161d23)',
        border: highlight ? '1.5px solid var(--primary, #00df81)' : '1px solid var(--border-light, #222c36)',
        borderRadius: 'var(--radius-md, 12px)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-elevation-1, 0 2px 6px rgba(0,0,0,0.18))',
        transition: 'transform 180ms ease, border-color 180ms ease',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #9aa5a0)' }}>
          {label}
        </span>
        {icon && <span style={{ color: 'var(--text-dim, #7a8781)' }}>{icon}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '4px 0 8px 0' }}>
        <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main, #e8ece9)', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim, #7a8781)' }}>
            {unit}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto', flexWrap: 'wrap' }}>
        {delta !== null ? (
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full, 9999px)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            ...getDeltaStyle()
          }}>
            {delta} {deltaLabel}
          </span>
        ) : <span />}

        {source && (
          <span style={{ fontSize: '10px', color: 'var(--text-dim, #7a8781)', fontWeight: 500 }}>
            {source}
          </span>
        )}
      </div>
    </div>
  );
}

export default KeyNumberTile;
