// frontend/src/GlassComponents.jsx
// Reusable, tactile, accessible Glassmorphism UI components for FieldShift
import React from 'react';

/**
 * GlassPanel: High-end frosted glass container with luminous border and subtle specular reflection.
 */
export function GlassPanel({
  children,
  elevation = 'primary', // 'primary' | 'secondary' | 'elevated' | 'card'
  className = '',
  style = {},
  onClick,
  ...props
}) {
  const elevationClass =
    elevation === 'elevated'
      ? 'glass-panel-elevated'
      : elevation === 'card'
      ? 'glass-card'
      : elevation === 'secondary'
      ? 'glass-panel-secondary'
      : 'glass-panel';

  return (
    <div
      className={`${elevationClass} ${className}`}
      style={style}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * GlassCard: Translucent card with hover lift, luminous borders, and content slots.
 */
export function GlassCard({
  children,
  className = '',
  style = {},
  onClick,
  hoverable = true,
  ...props
}) {
  return (
    <div
      className={`glass-card ${hoverable ? 'glass-card-hover' : ''} ${className}`}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * GlassButton: Tactile button with subtle lift, press-down feedback, and accessible focus.
 */
export function GlassButton({
  children,
  variant = 'glass', // 'primary' | 'cyan' | 'outline' | 'glass' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon,
  className = '',
  style = {},
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props
}) {
  let variantClass = 'btn-glass';
  if (variant === 'primary') variantClass = 'btn-primary';
  else if (variant === 'cyan') variantClass = 'btn-cyan';
  else if (variant === 'outline') variantClass = 'btn-outline';
  else if (variant === 'danger') variantClass = 'btn-danger';

  const sizePadding =
    size === 'sm'
      ? { padding: '5px 12px', fontSize: '12px' }
      : size === 'lg'
      ? { padding: '12px 24px', fontSize: '15px' }
      : { padding: '8px 18px', fontSize: '13.5px' };

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${className}`}
      style={{
        ...sizePadding,
        ...style
      }}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className="spinner-icon" style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
      ) : icon ? (
        <span className="btn-icon-wrap" style={{ display: 'inline-flex' }}>{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}

/**
 * GlassMetricCard: Telemetry display with icon halo, label, bold value, and trend badge.
 */
export function GlassMetricCard({
  icon = '📊',
  label,
  value,
  unit = '',
  badge = null,
  badgeVariant = 'emerald', // 'emerald' | 'cyan' | 'amber'
  subtext = null,
  style = {},
  className = ''
}) {
  return (
    <div
      className={`glass-metric-card ${className}`}
      style={{
        background: 'var(--glass-bg-secondary)',
        backdropFilter: 'var(--glass-blur-subtle)',
        WebkitBackdropFilter: 'var(--glass-blur-subtle)',
        border: '1px solid var(--glass-border)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{label}</span>
        </div>
        {badge && (
          <GlassBadge variant={badgeVariant}>{badge}</GlassBadge>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
        <strong style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          {value}
        </strong>
        {unit && (
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>
            {unit}
          </span>
        )}
      </div>

      {subtext && (
        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
          {subtext}
        </span>
      )}
    </div>
  );
}

/**
 * GlassBadge: Translucent pill with colored luminous rim.
 */
export function GlassBadge({
  children,
  variant = 'emerald', // 'emerald' | 'cyan' | 'amber' | 'neutral'
  className = '',
  style = {}
}) {
  const variantClass =
    variant === 'cyan'
      ? 'glass-badge-cyan'
      : variant === 'amber'
      ? 'glass-badge-amber'
      : variant === 'emerald'
      ? 'glass-badge-emerald'
      : '';

  return (
    <span className={`glass-badge ${variantClass} ${className}`} style={style}>
      {children}
    </span>
  );
}

/**
 * GlassTabs: Segmented control dock with smooth active glass pill.
 */
export function GlassTabs({
  tabs = [],
  activeTab,
  onTabChange,
  style = {},
  className = ''
}) {
  return (
    <div
      className={`glass-tabs-dock ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: 4,
        background: 'var(--glass-bg-primary)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border)',
        borderRadius: 10,
        boxShadow: 'var(--glass-shadow)',
        ...style
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12.5,
              fontWeight: isActive ? 800 : 600,
              cursor: 'pointer',
              background: isActive ? 'linear-gradient(135deg, rgba(0, 223, 129, 0.22) 0%, rgba(0, 168, 96, 0.18) 100%)' : 'transparent',
              color: isActive ? '#00df81' : 'var(--text-muted)',
              borderBottom: isActive ? '2px solid #00df81' : '2px solid transparent',
              boxShadow: isActive ? '0 2px 8px rgba(0, 223, 129, 0.2)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.icon && <span style={{ marginRight: 6 }}>{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
