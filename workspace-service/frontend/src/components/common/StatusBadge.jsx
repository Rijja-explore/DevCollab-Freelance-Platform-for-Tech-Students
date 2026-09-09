/**
 * StatusBadge
 * Renders a small pill with the semantic color for the given status.
 * Background is at 15% opacity; text is at full color.
 * Unknown statuses fall back to muted style without throwing an error.
 *
 * Requirements: 12.1
 */

const STATUS_COLORS = {
  ACTIVE:      'var(--color-teal)',
  COMPLETED:   'var(--color-teal)',
  PENDING:     'var(--color-amber)',
  IN_PROGRESS: 'var(--color-violet)',
  ARCHIVED:    'var(--color-muted)',
};

const DEFAULT_COLOR = 'var(--color-muted)';

/**
 * Returns the CSS color value for a given status string.
 * Exported for isolated testing.
 */
export function getStatusColor(status) {
  return Object.hasOwn(STATUS_COLORS, status) ? STATUS_COLORS[status] : DEFAULT_COLOR;
}

export default function StatusBadge({ status }) {
  const color = getStatusColor(status);

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: color,
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
      }}
      data-status={status}
    >
      {status ?? 'UNKNOWN'}
    </span>
  );
}
