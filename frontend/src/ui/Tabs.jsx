import React from 'react';

export function Tabs({
  items = [], // [{ id, label, icon }]
  activeId,
  onChange,
  className = '',
  style = {}
}) {
  return (
    <div className={`ui-tabs ${className}`} style={style} role="tablist">
      {items.map(item => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange && onChange(item.id)}
            className={`ui-tab-item ${isActive ? 'ui-tab-item-active' : ''}`}
          >
            {item.icon && <span style={{ marginRight: 6 }}>{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
