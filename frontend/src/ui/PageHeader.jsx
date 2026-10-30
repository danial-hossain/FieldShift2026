import React from 'react';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className = '',
  style = {}
}) {
  return (
    <div className={`ui-page-header ${className}`} style={style}>
      <div>
        {eyebrow && <div className="ui-page-header-eyebrow">{eyebrow}</div>}
        {title && <h1 className="ui-page-header-title">{title}</h1>}
        {subtitle && <p className="ui-page-header-sub">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{actions}</div>}
    </div>
  );
}
