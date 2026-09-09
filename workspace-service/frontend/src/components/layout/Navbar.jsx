import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { getSocket } from '../../services/socket';
import TokenInput from '../common/TokenInput';
import StatusBadge from '../common/StatusBadge';

/**
 * Navbar — top application bar.
 *
 * - Shows app title "DevCollab Workspace" in Syne font.
 * - When unauthenticated (userId === null): renders <TokenInput />.
 * - When authenticated: renders decoded userId (JetBrains Mono) + role badge.
 * - Tracks socket connection state and shows amber "Reconnecting…" indicator
 *   when the socket is disconnected.
 *
 * Requirements: 11.2, 11.3
 */

const navbarStyle = {
  position: 'fixed',
  top: 0,
  left: '220px', // offset for Sidebar width
  right: 0,
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 28px',
  background: 'rgba(10, 14, 26, 0.80)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  zIndex: 200,
};

const titleStyle = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 700,
  fontSize: '1.1rem',
  letterSpacing: '-0.01em',
  color: '#e2e8f0',
  userSelect: 'none',
};

const rightSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const userIdStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.8rem',
  color: '#94a3b8',
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 'var(--radius-sm)',
  padding: '4px 10px',
};

const reconnectingStyle = {
  fontSize: '0.8rem',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  color: 'var(--color-amber)',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

export default function Navbar() {
  const { userId, role } = useAuth();
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const socket = getSocket();

    // No socket yet — nothing to listen to
    if (!socket) return;

    // Sync initial state
    setConnected(socket.connected);

    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [userId]); // re-run when user logs in/out so we pick up a fresh socket

  return (
    <header style={navbarStyle} role="banner">
      <span style={titleStyle}>DevCollab Workspace</span>

      <div style={rightSectionStyle}>
        {/* Socket reconnecting indicator */}
        {!connected && (
          <span style={reconnectingStyle} role="status" aria-live="polite">
            <span aria-hidden="true">⟳</span>
            Reconnecting…
          </span>
        )}

        {userId === null ? (
          /* Unauthenticated — show token input */
          <TokenInput />
        ) : (
          /* Authenticated — show decoded identity */
          <>
            <span style={userIdStyle} title="Your user ID" aria-label={`User ID: ${userId}`}>
              {userId}
            </span>
            <StatusBadge status={role} />
          </>
        )}
      </div>
    </header>
  );
}
