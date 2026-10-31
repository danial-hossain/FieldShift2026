import React from 'react';

export function AnswerHeader({
  eyebrow = 'আজকের প্রধান সিদ্ধান্ত / KEY RECOMMENDATION',
  headline,
  summary,
  badgeText = 'NASA POWER + IMERG যাচাইকৃত',
  actions,
  className = '',
  style = {}
}) {
  return (
    <div className={`ui-answer-header glass-panel ${className}`} style={{
      background: 'linear-gradient(135deg, rgba(0, 223, 129, 0.08) 0%, rgba(56, 189, 248, 0.04) 100%)',
      border: '1.5px solid rgba(0, 223, 129, 0.3)',
      borderRadius: 'var(--radius-lg, 16px)',
      padding: '20px 24px',
      marginBottom: '20px',
      boxShadow: 'var(--shadow-elevation-1, 0 4px 16px rgba(0,0,0,0.25))',
      ...style
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--primary, #00df81)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary, #00df81)', display: 'inline-block' }} />
          {eyebrow}
        </span>
        {badgeText && (
          <span className="source-tag live" style={{ fontSize: '11px', padding: '3px 8px' }}>
            {badgeText}
          </span>
        )}
      </div>

      {headline && (
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text-main, #e8ece9)',
          margin: '0 0 8px 0',
          lineHeight: 1.4
        }}>
          {headline}
        </h2>
      )}

      {summary && (
        <p style={{
          fontSize: '14px',
          color: 'var(--text-muted, #9aa5a0)',
          margin: 0,
          lineHeight: 1.6,
          maxWidth: '920px'
        }}>
          {summary}
        </p>
      )}

      {actions && (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
}

export default AnswerHeader;
