import React from 'react';

export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  className = '',
  style = {}
}) {
  return (
    <div
      className={`ui-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
}

export function CardSkeleton({
  lines = 3,
  className = '',
  style = {}
}) {
  return (
    <div className={`ui-card ui-card-glass ${className}`} style={{ padding: '20px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Skeleton width="36px" height="36px" borderRadius="10px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width="45%" height="16px" />
          <Skeleton width="70%" height="12px" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} width={`${90 - i * 15}%`} height="14px" />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
