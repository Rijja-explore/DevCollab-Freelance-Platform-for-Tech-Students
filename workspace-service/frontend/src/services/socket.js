import { io } from 'socket.io-client';

let socket = null;

export function getSocket() { return socket; }

export function connectSocket(token) {
  if (socket?.connected) return socket;
  socket = io('http://localhost:5000', {
    auth: { token },
    autoConnect: true,
    reconnection: true,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
