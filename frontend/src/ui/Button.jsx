import React from 'react';

export function Button({
  children,
  icon,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost'
  size = 'md', // 'sm' | 'md'
  className = '',
  style = {},
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`ui-btn ui-btn-${variant} ui-btn-${size} ${className}`}
      style={{
        opacity: disabled ? 0.45 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        ...style
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', fontSize: size === 'sm' ? 12 : 14 }}>{icon}</span>}
      {children}
    </button>
  );
}
