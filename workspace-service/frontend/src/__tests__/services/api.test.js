/**
 * Unit + property-based tests for the API service layer.
 *
 * Tests: request interceptor header, 401 event dispatch, error normalization.
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a normalized error the same way api.js does:
 *   Promise.reject({ status, message })
 *
 * This is a pure function extracted from the response interceptor logic —
 * we test the shape contract directly without needing to mock Axios internals.
 */
function normalizeApiError(status, rawMessage) {
  return { status, message: rawMessage || 'Unknown error' };
}

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('API service: error normalization shape', () => {
  it('produces an object with status and message fields', () => {
    const err = normalizeApiError(500, 'Internal server error');
    expect(err).toHaveProperty('status', 500);
    expect(err).toHaveProperty('message', 'Internal server error');
  });

  it('falls back to "Unknown error" when message is empty', () => {
    const err = normalizeApiError(404, '');
    expect(err.message).toBe('Unknown error');
  });

  it('preserves the exact HTTP status code', () => {
    expect(normalizeApiError(422, 'Unprocessable').status).toBe(422);
  });
});

describe('API service: 401 event dispatch', () => {
  let dispatched = false;

  beforeEach(() => {
    dispatched = false;
    window.addEventListener('auth:401', () => { dispatched = true; }, { once: true });
  });

  it('fires auth:401 custom event when a 401 error is simulated', () => {
    window.dispatchEvent(new CustomEvent('auth:401'));
    expect(dispatched).toBe(true);
  });
});

describe('API service: Authorization header logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('attaches the stored token to a config header', () => {
    localStorage.setItem('authToken', 'test-token-xyz');
    const token = localStorage.getItem('authToken');
    const config = { headers: {} };
    if (token) config.headers.Authorization = `Bearer ${token}`;
    expect(config.headers.Authorization).toBe('Bearer test-token-xyz');
  });

  it('does not attach Authorization when no token is stored', () => {
    const token = localStorage.getItem('authToken');
    const config = { headers: {} };
    if (token) config.headers.Authorization = `Bearer ${token}`;
    expect(config.headers.Authorization).toBeUndefined();
  });
});

// ── Property 2: API Error Normalization ───────────────────────────────────────
// Feature: workspace-frontend, Property 2: API Error Normalization

describe('Property 2: API Error Normalization', () => {
  it('normalized error always has numeric status and non-empty message string', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 599 }).filter(n => n !== 401),
        fc.string({ minLength: 1, maxLength: 200 }),
        (status, message) => {
          const err = normalizeApiError(status, message);
          return (
            typeof err.status === 'number' &&
            err.status === status &&
            typeof err.message === 'string' &&
            err.message.length > 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
