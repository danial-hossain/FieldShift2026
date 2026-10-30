// frontend/src/GlassComponents.jsx
// Backward-compatible wrappers over the modern FieldShift UI Kit (frontend/src/ui/)
import React from 'react';
import { Card, Button, Pill, Stat, Tabs } from './ui/index.js';

export { Card, CardHeader, Stat, RingGauge, Donut, LineChart, Sparkline, Pill, Badge, Button, Tabs, EmptyState, DataSourceTag, PageHeader } from './ui/index.js';

export function GlassPanel({
  children,
  elevation = 'primary', // 'primary' | 'secondary' | 'elevated' | 'card'
  className = '',
  style = {},
  onClick,
  ...props
}) {
  const variant = elevation === 'elevated' || elevation === 'secondary' ? 'glass-strong' : 'glass';
  return (
    <Card
      variant={variant}
      className={`glass-panel ${className}`}
      style={style}
      onClick={onClick}
      {...props}
    >
      {children}
    </Card>
  );
}

export function GlassCard({
  children,
  className = '',
  style = {},
  onClick,
  hoverable = true,
  ...props
}) {
  return (
    <Card
      variant="glass"
      className={`glass-card ${hoverable ? 'glass-card-hover' : ''} ${className}`}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </Card>
  );
}

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
  let mappedVariant = 'secondary';
  if (variant === 'primary' || variant === 'cyan') mappedVariant = 'primary';
  else if (variant === 'outline' || variant === 'ghost') mappedVariant = 'ghost';

  const btnSize = size === 'sm' ? 'sm' : 'md';

  return (
    <Button
      variant={mappedVariant}
      size={btnSize}
      icon={loading ? '⏳' : icon}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      className={`glass-btn ${className}`}
      style={style}
      {...props}
    >
      {children}
    </Button>
  );
}

export function GlassBadge({
  children,
  variant = 'emerald', // 'emerald' | 'cyan' | 'amber' | 'neutral'
  className = '',
  style = {}
}) {
  let tone = 'neutral';
  if (variant === 'emerald' || variant === 'leaf') tone = 'leaf';
  else if (variant === 'cyan' || variant === 'water') tone = 'water';
  else if (variant === 'amber' || variant === 'sun') tone = 'sun';
  else if (variant === 'danger' || variant === 'alert') tone = 'alert';

  return (
    <Pill tone={tone} className={`glass-badge ${className}`} style={style}>
      {children}
    </Pill>
  );
}

export function GlassMetricCard({
  icon = '📊',
  label,
  value,
  unit = '',
  badge = null,
  badgeVariant = 'emerald',
  subtext = null,
  style = {},
  className = ''
}) {
  return (
    <Card variant="glass" className={`glass-metric-card ${className}`} style={{ padding: '14px 16px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{label}</span>
        </div>
        {badge && <GlassBadge variant={badgeVariant}>{badge}</GlassBadge>}
      </div>
      <Stat value={value} unit={unit} sub={subtext} />
    </Card>
  );
}

export function GlassTabs({
  tabs = [],
  activeTab,
  onTabChange,
  style = {},
  className = ''
}) {
  const items = tabs.map(t => ({ id: t.id, label: t.label, icon: t.icon }));
  return (
    <Tabs
      items={items}
      activeId={activeTab}
      onChange={onTabChange}
      style={style}
      className={className}
    />
  );
}
