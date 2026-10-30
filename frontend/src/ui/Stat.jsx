import React from 'react';

export function Stat({
  label,
  value,
  unit,
  sub,
  tone = 'neutral', // 'neutral' | 'accent' | 'leaf' | 'water' | 'sun' | 'alert' | 'hud'
  className = '',
  style = {}
}) {
  const toneClass = tone !== 'neutral' ? `ui-stat-tone-${tone}` : '';
  const displayValue = value != null && value !== '' ? value : '—';

  return (
    <div className={`ui-stat ${className}`} style={style}>
      {label && <span className="ui-stat-label">{label}</span>}
      <div className="ui-stat-value-wrap">
        <span className={`ui-stat-value ${toneClass}`}>{displayValue}</span>
        {unit && <span className="ui-stat-unit">{unit}</span>}
      </div>
      {sub && <span className="ui-stat-sub">{sub}</span>}
    </div>
  );
}

export default Stat;
