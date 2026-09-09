/**
 * WorkspaceNotFound
 * Renders a coral-tinted card when a workspace fetch returns 404.
 * Includes the offending workspaceId and a link back to the lookup page.
 *
 * Props:
 *   workspaceId: string
 *
 * Requirements: 6.3
 */

import { Link } from 'react-router-dom';

export default function WorkspaceNotFound({ workspaceId }) {
  return (
    <div
      style={{
        background: 'rgba(255, 107, 107, 0.08)',
        border: '1px solid rgba(255, 107, 107, 0.25)',
        borderRadius: '16px',
        padding: '2rem',
        textAlign: 'center',
        maxWidth: '480px',
        margin: '4rem auto',
      }}
    >
      {/* Icon placeholder */}
      <div
        style={{
          fontSize: '2.5rem',
          marginBottom: '1rem',
          color: 'var(--color-coral)',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        ✕
      </div>

      <h2
        style={{
          margin: '0 0 0.5rem',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--color-coral)',
        }}
      >
        Workspace Not Found
      </h2>

      <p
        style={{
          margin: '0 0 1.5rem',
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.6,
        }}
      >
        No workspace exists with ID{' '}
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.75)',
            background: 'rgba(255,255,255,0.06)',
            padding: '1px 6px',
            borderRadius: '4px',
          }}
        >
          {workspaceId}
        </code>
        . It may have been removed or the ID may be incorrect.
      </p>

      <Link
        to="/workspaces"
        style={{
          display: 'inline-block',
          padding: '0.5rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid rgba(255,107,107,0.4)',
          color: 'var(--color-coral)',
          textDecoration: 'none',
          fontSize: '0.875rem',
          fontWeight: 600,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.12)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        ← Back to Workspace Lookup
      </Link>
    </div>
  );
}
