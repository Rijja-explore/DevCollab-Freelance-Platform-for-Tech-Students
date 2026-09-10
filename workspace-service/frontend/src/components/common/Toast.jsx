import React from 'react';
import { useToast } from '../../contexts/ToastContext';

const TYPE_COLORS = {
  success: 'var(--color-teal)',
  error: 'var(--color-coral)',
  info: 'var(--color-amber)',
};

const containerStyle = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  alignItems: 'flex-end',
  pointerEvents: 'none',
};

function toastStyle(type) {
  const borderColor = TYPE_COLORS[type] ?? TYPE_COLORS.info;
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: '260px',
    maxWidth: '380px',
    padding: '12px 16px',
    background: 'rgba(13, 17, 23, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderLeft: `4px solid ${borderColor}`,
    borderRadius: 'var(--radius-md)',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-body)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
    pointerEvents: 'all',
  };
}

const messageStyle = {
  flex: 1,
  lineHeight: 1.45,
};

const dismissStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--color-muted)',
  fontSize: '1.1rem',
  lineHeight: 1,
  padding: '2px 4px',
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'color 0.15s ease',
};

/**
 * Toast — renders the active toast list from ToastContext.
 * Fixed position, bottom-right. Each toast has a color-coded left border
 * by type (success=teal, error=coral, info=amber) and a dismiss button.
 */
export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div style={containerStyle} role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={toastStyle(toast.type)}
          role="alert"
        >
          <span style={messageStyle}>{toast.message}</span>
          <button
            style={dismissStyle}
            aria-label="Dismiss notification"
            onClick={() => removeToast(toast.id)}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#e2e8f0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
