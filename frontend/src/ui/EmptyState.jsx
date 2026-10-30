import React from 'react';

export function EmptyState({
  icon = '🌾',
  title = 'তথ্য নেই',
  description = 'কোনো রেকর্ড বা পর্যবেক্ষণ পাওয়া যায়নি।',
  action,
  className = '',
  style = {}
}) {
  return (
    <div className={`ui-empty-state ${className}`} style={style}>
      <div className="ui-empty-state-icon">{icon}</div>
      <h4 className="ui-empty-state-title">{title}</h4>
      {description && <p className="ui-empty-state-desc">{description}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
