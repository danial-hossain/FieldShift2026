import React, { useState } from 'react';

export function RiskChip({
  level = 'low', // 'low' | 'medium' | 'high'
  label,
  whyText,
  evidenceSource = 'NASA POWER / IMERG',
  className = '',
  style = {}
}) {
  const [showPopover, setShowPopover] = useState(false);

  const getTheme = () => {
    switch (level) {
      case 'high':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          border: '1.5px solid rgba(239, 68, 68, 0.35)',
          color: '#f87171',
          dot: '#ef4444',
          defaultLabel: 'উচ্চ ঝুঁকি (High Risk)',
        };
      case 'medium':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: '1.5px solid rgba(245, 158, 11, 0.35)',
          color: '#fbbf24',
          dot: '#f59e0b',
          defaultLabel: 'মাঝারি ঝুঁকি (Moderate Risk)',
        };
      case 'low':
      default:
        return {
          bg: 'rgba(0, 223, 129, 0.12)',
          border: '1.5px solid rgba(0, 223, 129, 0.35)',
          color: '#34d399',
          dot: '#00df81',
          defaultLabel: 'কম ঝুঁকি (Low Risk)',
        };
    }
  };

  const theme = getTheme();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setShowPopover(!showPopover)}
        className={`ui-risk-chip ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 'var(--radius-full, 9999px)',
          background: theme.bg,
          border: theme.border,
          color: theme.color,
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 160ms ease',
          ...style
        }}
        title="ক্লিক করে প্রমাণের ভিত্তি দেখুন"
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: theme.dot }} />
        <span>{label || theme.defaultLabel}</span>
        {whyText && (
          <span style={{
            fontSize: '10px',
            opacity: 0.85,
            textDecoration: 'underline',
            marginLeft: 4
          }}>
            কেন?
          </span>
        )}
      </button>

      {showPopover && whyText && (
        <div style={{
          position: 'absolute',
          bottom: '125%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '280px',
          background: 'var(--bg-card, #161d23)',
          border: '1px solid var(--border-medium, #2a3742)',
          borderRadius: 'var(--radius-md, 12px)',
          padding: '12px 14px',
          boxShadow: 'var(--shadow-elevation-2, 0 8px 24px rgba(0,0,0,0.5))',
          zIndex: 90,
          fontSize: '12px',
          color: 'var(--text-main, #e8ece9)',
          lineHeight: 1.5,
          textAlign: 'left'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: theme.color, display: 'flex', justifyContent: 'space-between' }}>
            <span>ঝুঁকির কারণ ও উপগ্রহ প্রমাণ</span>
            <span
              onClick={(e) => { e.stopPropagation(); setShowPopover(false); }}
              style={{ cursor: 'pointer', opacity: 0.7 }}
            >
              ✕
            </span>
          </div>
          <div style={{ color: 'var(--text-muted, #9aa5a0)', marginBottom: 6 }}>
            {whyText}
          </div>
          {evidenceSource && (
            <div style={{ fontSize: '10px', color: 'var(--text-dim, #7a8781)', borderTop: '1px solid var(--border-light, #222c36)', paddingTop: 4 }}>
              উৎস: {evidenceSource}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RiskChip;
