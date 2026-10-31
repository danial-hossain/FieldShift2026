import React from 'react';

const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function CalendarStrip({
  segments = [], // [{ label: 'Mustard', startMonth: 10, endMonth: 1, color: '#eab308' }] (0-indexed)
  lang = 'bn',
  currentMonth = new Date().getMonth(),
  title = '',
  className = '',
  style = {}
}) {
  const months = lang === 'bn' ? MONTHS_BN : MONTHS_EN;

  return (
    <div className={`ui-calendar-strip ${className}`} style={{
      background: 'var(--bg-card, #161d23)',
      border: '1px solid var(--border-light, #222c36)',
      borderRadius: 'var(--radius-md, 12px)',
      padding: '16px',
      ...style
    }}>
      {title && (
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #e8ece9)', marginBottom: 12 }}>
          {title}
        </div>
      )}

      {/* Month Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 2,
        marginBottom: 8,
        textAlign: 'center',
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--text-muted, #9aa5a0)'
      }}>
        {months.map((m, idx) => (
          <div
            key={m}
            style={{
              padding: '4px 0',
              borderRadius: '4px',
              background: idx === currentMonth ? 'rgba(0, 223, 129, 0.15)' : 'transparent',
              color: idx === currentMonth ? 'var(--primary, #00df81)' : 'inherit',
              borderBottom: idx === currentMonth ? '2px solid var(--primary, #00df81)' : 'none'
            }}
          >
            {m}
          </div>
        ))}
      </div>

      {/* Crop / Activity Segments */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((seg, sIdx) => {
          // Normalize start and end
          const start = Math.max(0, Math.min(11, seg.startMonth ?? 0));
          const end = Math.max(0, Math.min(11, seg.endMonth ?? 11));
          const color = seg.color || '#00df81';

          return (
            <div key={seg.label || sIdx} style={{ position: 'relative', height: 26, background: 'rgba(255,255,255,0.03)', borderRadius: 6, overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${(start / 12) * 100}%`,
                  width: `${(((end >= start ? end - start + 1 : 12 - start + end + 1)) / 12) * 100}%`,
                  background: `linear-gradient(90deg, ${color}cc, ${color})`,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={`${seg.label}: ${months[start]} - ${months[end]}`}
              >
                {seg.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarStrip;
