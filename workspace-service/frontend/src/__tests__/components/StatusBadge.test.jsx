/**
 * Property-based + unit tests for StatusBadge component.
 *
 * Tests the getStatusColor utility and StatusBadge rendering.
 * Validates: Requirements 9.9, 12.1
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import StatusBadge, { getStatusColor } from '../../components/common/StatusBadge';

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('getStatusColor', () => {
  it('returns teal for ACTIVE', () => {
    expect(getStatusColor('ACTIVE')).toBe('var(--color-teal)');
  });

  it('returns teal for COMPLETED', () => {
    expect(getStatusColor('COMPLETED')).toBe('var(--color-teal)');
  });

  it('returns amber for PENDING', () => {
    expect(getStatusColor('PENDING')).toBe('var(--color-amber)');
  });

  it('returns violet for IN_PROGRESS', () => {
    expect(getStatusColor('IN_PROGRESS')).toBe('var(--color-violet)');
  });

  it('returns muted for ARCHIVED', () => {
    expect(getStatusColor('ARCHIVED')).toBe('var(--color-muted)');
  });

  it('returns muted (default) for an unknown status', () => {
    expect(getStatusColor('UNKNOWN_STATUS')).toBe('var(--color-muted)');
  });

  it('does not throw for undefined input', () => {
    expect(() => getStatusColor(undefined)).not.toThrow();
  });
});

describe('StatusBadge rendering', () => {
  it('renders the status text', () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('renders "UNKNOWN" for undefined status', () => {
    render(<StatusBadge />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('applies data-status attribute for CSS targeting', () => {
    const { container } = render(<StatusBadge status="PENDING" />);
    const badge = container.querySelector('[data-status="PENDING"]');
    expect(badge).not.toBeNull();
  });
});

// ── Property 10: StatusBadge Color Mapping ───────────────────────────────────
// Feature: workspace-frontend, Property 10: StatusBadge Color Mapping

const KNOWN_STATUSES = ['ACTIVE', 'COMPLETED', 'PENDING', 'IN_PROGRESS', 'ARCHIVED'];
const EXPECTED_COLORS = {
  ACTIVE:      'var(--color-teal)',
  COMPLETED:   'var(--color-teal)',
  PENDING:     'var(--color-amber)',
  IN_PROGRESS: 'var(--color-violet)',
  ARCHIVED:    'var(--color-muted)',
};

describe('Property 10: StatusBadge Color Mapping', () => {
  it('known statuses always map to the correct color variable', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...KNOWN_STATUSES),
        (status) => {
          const color = getStatusColor(status);
          return color === EXPECTED_COLORS[status];
        }
      ),
      { numRuns: 100 }
    );
  });

  it('arbitrary strings never throw and always return a string', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (status) => {
          const color = getStatusColor(status);
          return typeof color === 'string' && color.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('StatusBadge renders without throwing for any string status', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        (status) => {
          let threw = false;
          try {
            render(<StatusBadge status={status} />);
          } catch {
            threw = true;
          }
          return !threw;
        }
      ),
      { numRuns: 50 }
    );
  });
});
