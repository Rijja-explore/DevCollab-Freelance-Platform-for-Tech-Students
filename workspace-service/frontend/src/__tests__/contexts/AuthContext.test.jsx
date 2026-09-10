/**
 * Unit tests for AuthContext.
 *
 * Tests token read/write/clear lifecycle.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { AuthProvider, AuthContext, decodeToken } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { useContext } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildJWT(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

const VALID_JWT = buildJWT({ sub: 'user-99', role: 'student' });

/** Wrapper that wraps the component under test in both providers. */
function Providers({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}

/** Consumer component that exposes AuthContext values via a ref callback. */
function AuthConsumer({ onValue }) {
  const ctx = useContext(AuthContext);
  onValue(ctx);
  return null;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('AuthContext', () => {
  it('starts with null state when no token in localStorage', () => {
    let ctx;
    render(
      <Providers>
        <AuthConsumer onValue={(c) => { ctx = c; }} />
      </Providers>
    );
    expect(ctx.token).toBeNull();
    expect(ctx.userId).toBeNull();
    expect(ctx.role).toBeNull();
  });

  it('reads a valid token from localStorage on mount', () => {
    localStorage.setItem('authToken', VALID_JWT);
    let ctx;
    render(
      <Providers>
        <AuthConsumer onValue={(c) => { ctx = c; }} />
      </Providers>
    );
    expect(ctx.token).toBe(VALID_JWT);
    expect(ctx.userId).toBe('user-99');
    expect(ctx.role).toBe('student');
  });

  it('clearToken removes token from localStorage and resets state', () => {
    localStorage.setItem('authToken', VALID_JWT);
    let ctx;
    render(
      <Providers>
        <AuthConsumer onValue={(c) => { ctx = c; }} />
      </Providers>
    );

    act(() => { ctx.clearToken(); });

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(ctx.token).toBeNull();
    expect(ctx.userId).toBeNull();
  });

  it('setToken saves to localStorage and decodes correctly', () => {
    const newJwt = buildJWT({ sub: 'new-user', role: 'startup' });
    let ctx;
    render(
      <Providers>
        <AuthConsumer onValue={(c) => { ctx = c; }} />
      </Providers>
    );

    act(() => { ctx.setToken(newJwt); });

    expect(localStorage.getItem('authToken')).toBe(newJwt);
    expect(ctx.userId).toBe('new-user');
    expect(ctx.role).toBe('startup');
  });

  it('auth:401 event triggers clearToken', async () => {
    localStorage.setItem('authToken', VALID_JWT);
    let ctx;
    render(
      <Providers>
        <AuthConsumer onValue={(c) => { ctx = c; }} />
      </Providers>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:401'));
    });

    await waitFor(() => {
      expect(ctx.token).toBeNull();
    });
    expect(localStorage.getItem('authToken')).toBeNull();
  });
});
