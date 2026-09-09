/**
 * useSocket hook
 *
 * Connects to the Socket.IO server using the current auth token and,
 * when a workspaceId is provided, joins/leaves the workspace room on
 * mount/unmount.
 *
 * Returns { socket, connected } where socket is the singleton instance
 * and connected reflects the live connection state.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.11
 */

import { useEffect, useState } from 'react';
import { connectSocket, getSocket } from '../services/socket';
import useAuth from './useAuth';

export default function useSocket(workspaceId) {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    setConnected(socket.connected);

    function onConnect() { setConnected(true); }
    function onDisconnect() { setConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (workspaceId) {
      if (socket.connected) {
        socket.emit('join-workspace', { workspaceId });
      } else {
        socket.once('connect', () => socket.emit('join-workspace', { workspaceId }));
      }
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      if (workspaceId) {
        socket.emit('leave-workspace', { workspaceId });
      }
    };
  }, [token, workspaceId]);

  return { socket: getSocket(), connected };
}
