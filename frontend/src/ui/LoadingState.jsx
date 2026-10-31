import React from 'react';

export function LoadingState({
  message = 'তথ্য লোড হচ্ছে...',
  subtext = 'NASA POWER ও ISRIC SoilGrids উপগ্রহ তথ্য যাচাই করা হচ্ছে',
  height = '200px',
  className = '',
  style = {}
}) {
  return (
    <div
      className={`ui-loading-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: height,
        padding: '32px 16px',
        textAlign: 'center',
        background: 'transparent',
        ...style
      }}
    >
      <div style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        border: '3px solid rgba(0, 223, 129, 0.2)',
        borderTopColor: 'var(--primary, #00df81)',
        animation: 'spin 0.8s linear infinite',
        marginBottom: 16
      }} />
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main, #e8ece9)', marginBottom: 4 }}>
        {message}
      </div>
      {subtext && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted, #9aa5a0)' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

export default LoadingState;
