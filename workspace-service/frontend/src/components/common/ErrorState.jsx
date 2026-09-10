import React from 'react';
import Button from './Button';

/**
 * ErrorState Component
 *
 * Renders a coral-tinted error message with a Retry button.
 *
 * Props:
 *   message  {string}   - human-readable error description
 *   onRetry  {function} - called when the user clicks "Retry"
 *
 * Requirements: 12.6
 */
export default function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '32px',
        borderRadius: '12px',
        background: 'rgba(255, 107, 107, 0.07)',
        border: '1px solid rgba(255, 107, 107, 0.25)',
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: '1.5rem' }} aria-hidden="true">⚠</span>
      <p
        style={{
          margin: 0,
          color: 'var(--color-coral)',
          fontSize: '0.9375rem',
          fontFamily: 'var(--font-body)',
        }}
      >
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
