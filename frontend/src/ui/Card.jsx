import React from 'react';

export function Card({
  variant = 'glass', // 'glass' | 'glass-strong' | 'hud'
  children,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  const variantClass = variant === 'hud'
    ? 'ui-card-hud'
    : (variant === 'glass-strong' ? 'ui-card-glass-strong' : 'ui-card-glass');

  return (
    <div
      className={`ui-card ${variantClass} ${className}`}
      style={style}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  icon,
  title,
  subtitle,
  action,
  className = '',
  style = {}
}) {
  return (
    <div className={`ui-card-header ${className}`} style={style}>
      <div className="ui-card-header-left">
        {icon && <div className="ui-card-header-icon">{icon}</div>}
        <div className="ui-card-header-titles">
          {title && <h3 className="ui-card-header-title">{title}</h3>}
          {subtitle && <p className="ui-card-header-subtitle">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="ui-card-header-actions">{action}</div>}
    </div>
  );
}
