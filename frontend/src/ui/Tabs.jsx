import React from 'react';

export function Tabs({
  items,
  tabs,
  activeId,
  activeTab,
  onChange,
  onTabChange,
  className = '',
  style = {},
  lang = 'bn',
}) {
  const tabList = (items ?? tabs) || [];
  const currentActiveId = activeId ?? activeTab;
  const handleSelect = onChange ?? onTabChange;

  return (
    <div className={`ui-tabs ${className}`} style={style} role="tablist">
      {tabList.map(item => {
        const id = item.id ?? item.key;
        const isActive = id === currentActiveId;
        const label = item.label ?? (lang === 'bn' ? (item.labelBn || item.titleBn) : (item.labelEn || item.titleEn)) ?? item.title ?? id;

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleSelect && handleSelect(id)}
            className={`ui-tab-item ${isActive ? 'ui-tab-item-active' : ''}`}
          >
            {item.icon && <span style={{ marginRight: 6 }}>{item.icon}</span>}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
