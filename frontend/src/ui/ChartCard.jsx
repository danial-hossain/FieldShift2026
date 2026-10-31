import React from 'react';

export function ChartCard({
  findingTitle, // Title stating the finding, e.g. "প্রাক-বর্ষার অনসেট: গত ২০ বছরে বৃষ্টিপাত ৩-৫ দিন এগিয়ে এসেছে"
  subtitle = '',
  units = '',
  source = 'NASA POWER v2.4.1 (0.5° গ্রিড) ও NASA GPM IMERG v07',
  actions = null,
  children,
  className = '',
  style = {}
}) {
  return (
    <div
      className={`ui-chart-card dash-card ${className}`}
      style={{
        background: 'var(--bg-card, #161d23)',
        border: '1px solid var(--border-light, #222c36)',
        borderRadius: 'var(--radius-md, 12px)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-elevation-1, 0 2px 8px rgba(0,0,0,0.2))',
        ...style
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div>
          {findingTitle && (
            <h4 style={{
              margin: '0 0 4px 0',
              fontSize: '15px',
              fontWeight: 800,
              color: 'var(--text-main, #e8ece9)',
              lineHeight: 1.4
            }}>
              {findingTitle}
            </h4>
          )}
          {(subtitle || units) && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #9aa5a0)' }}>
              {subtitle} {units ? `(${units})` : ''}
            </div>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {actions}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: '180px', width: '100%', position: 'relative' }}>
        {children}
      </div>

      {source && (
        <div style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: '1px solid var(--border-light, #222c36)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-dim, #7a8781)',
          flexWrap: 'wrap',
          gap: 6
        }}>
          <span>উৎস: {source}</span>
          <span className="source-tag verified" style={{ fontSize: '10px', padding: '1px 6px' }}>যাচাইকৃত</span>
        </div>
      )}
    </div>
  );
}

export default ChartCard;
