import React from 'react';

export function Pill({
  children,
  icon,
  tone = 'neutral', // 'neutral' | 'accent' | 'leaf' | 'water' | 'sun' | 'alert' | 'hud'
  className = '',
  style = {},
  ...props
}) {
  return (
    <span className={`ui-pill ui-pill-${tone} ${className}`} style={style} {...props}>
      {icon && <span style={{ display: 'inline-flex', fontSize: 12 }}>{icon}</span>}
      {children}
    </span>
  );
}

export const Badge = Pill;
