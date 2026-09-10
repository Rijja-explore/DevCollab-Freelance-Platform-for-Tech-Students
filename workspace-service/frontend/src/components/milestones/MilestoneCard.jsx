import React from 'react';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

/**
 * MilestoneCard
 *
 * Displays a single milestone's details.
 * - Title and amount (formatted as USD currency)
 * - StatusBadge for current status
 * - completedAt date when present
 * - completionNotes when present
 * - "Complete" button visible only for PENDING or IN_PROGRESS milestones
 *
 * Props:
 *   milestone  {Milestone}  - the milestone data object
 *   onComplete {function}   - called with the milestone when Complete is clicked
 *
 * Requirements: 9.2, 9.6, 9.9
 */

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const COMPLETABLE_STATUSES = new Set(['PENDING', 'IN_PROGRESS']);

export default function MilestoneCard({ milestone, onComplete }) {
  const {
    title,
    amount,
    status,
    completedAt,
    completionNotes,
  } = milestone;

  const canComplete = COMPLETABLE_STATUSES.has(status);

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header row: title + status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: '#e2e8f0',
            lineHeight: 1.4,
          }}
        >
          {title}
        </h3>
        <StatusBadge status={status} />
      </div>

      {/* Amount */}
      <p
        style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-teal)',
        }}
      >
        {currencyFormatter.format(amount)}
      </p>

      {/* Completed At */}
      {completedAt && (
        <p
          style={{
            margin: 0,
            fontSize: '0.8125rem',
            color: 'rgba(226, 232, 240, 0.6)',
          }}
        >
          Completed:{' '}
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {new Date(completedAt).toLocaleDateString()}
          </span>
        </p>
      )}

      {/* Completion Notes */}
      {completionNotes && (
        <p
          style={{
            margin: 0,
            fontSize: '0.875rem',
            color: 'rgba(226, 232, 240, 0.75)',
            fontStyle: 'italic',
            borderLeft: '3px solid rgba(255, 255, 255, 0.15)',
            paddingLeft: '10px',
          }}
        >
          {completionNotes}
        </p>
      )}

      {/* Complete action */}
      {canComplete && (
        <div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onComplete(milestone)}
          >
            Complete
          </Button>
        </div>
      )}
    </div>
  );
}
