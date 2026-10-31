import React from 'react';

export function SegmentedControl({
  options = [], // [{ value: 'A', label: 'Option A' }]
  value,
  onChange,
  size = 'md', // 'sm' | 'md'
  className = '',
  style = {}
}) {
  const isSm = size === 'sm';

  return (
    <div
      className={`ui-segmented-control ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        background: 'var(--bg-card-subtle, #1c242c)',
        borderRadius: 'var(--radius-sm, 8px)',
        border: '1px solid var(--border-light, #222c36)',
        ...style
      }}
      role="group"
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: isSm ? '4px 10px' : '6px 14px',
              fontSize: isSm ? '11.5px' : '13px',
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? 'var(--primary, #00df81)' : 'var(--text-muted, #9aa5a0)',
              background: isSelected ? 'var(--bg-card, #161d23)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 160ms ease',
              boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
