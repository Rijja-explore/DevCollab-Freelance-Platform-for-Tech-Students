import React from 'react';

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  padding: '48px 24px',
  textAlign: 'center',
};

const iconWrapperStyle = {
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-muted)',
  fontSize: '1.75rem',
};

const messageStyle = {
  color: 'var(--color-muted)',
  fontSize: '0.9375rem',
  fontFamily: 'var(--font-body)',
  maxWidth: '320px',
  lineHeight: 1.5,
};

/**
 * EmptyState — centered empty placeholder.
 *
 * Props:
 *  message {string}      - Text to display
 *  icon    {ReactNode?}  - Optional icon; defaults to a muted placeholder
 */
export default function EmptyState({ message, icon }) {
  return (
    <div style={containerStyle} role="status" aria-label={message}>
      <div style={iconWrapperStyle} aria-hidden="true">
        {icon ?? '○'}
      </div>
      <p style={messageStyle}>{message}</p>
    </div>
  );
}
