import React from 'react';

export function DataSourceTag({
  source = 'NASA POWER',
  mode = 'climatology',
  period = '2001-2025',
  className = '',
  style = {}
}) {
  const parts = [source, mode, period].filter(Boolean);
  return (
    <span className={`ui-data-source-tag ${className}`} style={style}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--leaf)', display: 'inline-block' }} />
      {parts.join(' · ')}
    </span>
  );
}
