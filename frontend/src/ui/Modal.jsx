import React, { useEffect } from 'react';
import { CloseIcon } from './Icons.jsx';

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '640px',
  footer = null,
  className = '',
  style = {}
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ui-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(0, 0, 0, 0.72)',
        
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 180ms ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`ui-modal-container ${className}`}
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          background: 'var(--bg-card, #161d23)',
          border: '1.5px solid var(--border-medium, #2a3742)',
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: 'var(--shadow-elevation-2, 0 16px 40px rgba(0,0,0,0.6))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleIn 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          ...style
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-light, #222c36)',
          background: 'var(--bg-card-subtle, #1c242c)'
        }}>
          <div>
            {title && (
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main, #e8ece9)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #9aa5a0)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim, #7a8781)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close dialog"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {footer && (
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-light, #222c36)',
            background: 'var(--bg-card-subtle, #1c242c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
