import React from 'react';
import { AlertTriangleIcon, RefreshIcon } from './Icons.jsx';

export function ErrorState({
  title = 'তথ্য লোড করা সম্ভব হয়নি',
  message = 'সার্ভার বা উপগ্রহ তথ্য সংযোগে সাময়িক বিলম্ব হচ্ছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
  onRetry = null,
  retryLabel = 'আবার চেষ্টা করুন (Retry)',
  height = '220px',
  className = '',
  style = {}
}) {
  return (
    <div
      className={`ui-error-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: height,
        padding: '24px 20px',
        textAlign: 'center',
        background: 'rgba(239, 68, 68, 0.05)',
        border: '1.5px dashed rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--radius-md, 12px)',
        margin: '12px 0',
        ...style
      }}
    >
      <div style={{ color: '#f87171', marginBottom: 12 }}>
        <AlertTriangleIcon size={32} />
      </div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #e8ece9)', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted, #9aa5a0)', maxWidth: '480px', lineHeight: 1.5, marginBottom: onRetry ? 16 : 0 }}>
        {message}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm, 8px)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 160ms ease'
          }}
        >
          <RefreshIcon size={14} />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
}

export default ErrorState;
