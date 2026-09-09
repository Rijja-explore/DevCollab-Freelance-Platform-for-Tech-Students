/**
 * Unit tests for the JWT decode utility.
 *
 * Tests the decodeToken function exported from AuthContext.
 * Validates: Requirements 1.2
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { decodeToken } from '../../contexts/AuthContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal well-formed JWT string with the given payload.
 * The header and signature are not validated by decodeToken.
 */
function buildJWT(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('decodeToken', () => {
  it('returns { userId, role } for a valid JWT', () => {
    const jwt = buildJWT({ sub: 'user-123', role: 'student' });
    const result = decodeToken(jwt);
    expect(result).toEqual({ userId: 'user-123', role: 'student' });
  });

  it('maps payload.sub → userId', () => {
    const jwt = buildJWT({ sub: 'abc', role: 'startup' });
    expect(decodeToken(jwt)?.userId).toBe('abc');
  });

  it('maps payload.role → role', () => {
    const jwt = buildJWT({ sub: 'x', role: 'admin' });
    expect(decodeToken(jwt)?.role).toBe('admin');
  });

  it('returns null for a malformed token (not a JWT)', () => {
    expect(decodeToken('not-a-jwt')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(decodeToken('')).toBeNull();
  });

  it('returns null for a token missing the payload section', () => {
    expect(decodeToken('header..')).toBeNull();
  });
});

// ── Property 1: JWT Decode Round-Trip ─────────────────────────────────────────
// Feature: workspace-frontend, Property 1: JWT Decode Round-Trip

describe('Property 1: JWT Decode Round-Trip', () => {
  it('correctly extracts sub → userId and role for any valid payload', () => {
    fc.assert(
      fc.property(
        fc.record({
          sub: fc.string({ minLength: 1, maxLength: 64 }),
          role: fc.string({ minLength: 1, maxLength: 32 }),
        }),
        ({ sub, role }) => {
          const jwt = buildJWT({ sub, role });
          const decoded = decodeToken(jwt);
          return decoded !== null && decoded.userId === sub && decoded.role === role;
        }
      ),
      { numRuns: 100 }
    );
  });
});
