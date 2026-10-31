import React, { useEffect } from 'react';
import { CheckIcon, AlertCircleIcon, InfoIcon, CloseIcon } from './Icons.jsx';

export function Toast({
  type = 'info', // 'success' | 'error' | 'info'
  message,
  onClose,
  duration = 4000,
  className = '',
  style = {}
}) {
  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getStyle = () => {
    if (type === 'success') {
      return {
        bg: 'var(--bg-card, #161d23)',
        border: '1px solid #00df81',
        icon: <CheckIcon size={18} className="text-emerald-400" />,
        color: '#00df81',
      };
    }
    if (type === 'error') {
      return {
        bg: 'var(--bg-card, #161d23)',
        border: '1px solid #ef4444',
        icon: <AlertCircleIcon size={18} className="text-red-400" />,
        color: '#ef4444',
      };
    }
    return {
      bg: 'var(--bg-card, #161d23)',
      border: '1px solid #38bdf8',
      icon: <InfoIcon size={18} className="text-sky-400" />,
      color: '#38bdf8',
    };
  };

  const t = getStyle();

  return (
    <div
      className={`ui-toast ${className}`}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 18px',
        background: t.bg,
        border: t.border,
        borderRadius: 'var(--radius-md, 12px)',
        boxShadow: 'var(--shadow-elevation-2, 0 8px 24px rgba(0,0,0,0.45))',
        color: 'var(--text-main, #e8ece9)',
        fontSize: '13px',
        fontWeight: 600,
        maxWidth: '380px',
        animation: 'slideUp 180ms ease-out',
        ...style
      }}
    >
      <span>{t.icon}</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-dim, #7a8781)', cursor: 'pointer', padding: 2 }}
          aria-label="Close"
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}

export default Toast;
