/**
 * WorkspaceHeader
 * Displays workspace metadata: all IDs, status badge, and formatted creation date.
 * IDs are rendered in JetBrains Mono via the --font-mono CSS custom property.
 *
 * Props:
 *   workspace: { id, projectId, studentId, startupId, status, createdAt }
 *
 * Requirements: 6.2
 */

import StatusBadge from '../common/StatusBadge';

const monoStyle = { fontFamily: 'var(--font-mono)' };

function MetaRow({ label, value, mono = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)',
          minWidth: '90px',
        }}
      >
        {label}
      </span>
      <span style={mono ? { ...monoStyle, fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)' } : { fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)' }}>
        {value}
      </span>
    </div>
  );
}

export default function WorkspaceHeader({ workspace }) {
  if (!workspace) return null;

  const { id, projectId, studentId, startupId, status, createdAt } = workspace;

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString()
    : '—';

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2
          style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          Workspace
        </h2>
        <StatusBadge status={status} />
      </div>

      <div>
        <MetaRow label="Workspace ID" value={id} mono />
        <MetaRow label="Project ID"   value={projectId} mono />
        <MetaRow label="Student ID"   value={studentId} mono />
        <MetaRow label="Startup ID"   value={startupId} mono />
        <MetaRow label="Created"      value={formattedDate} />
      </div>
    </div>
  );
}
