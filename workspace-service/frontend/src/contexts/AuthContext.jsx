import { createContext, useState, useEffect, useCallback } from 'react';
import { connectSocket } from '../services/socket';
import { useToast } from './ToastContext';

export const AuthContext = createContext(null);

/**
 * Decode the payload section of a JWT string.
 * Returns { userId, role } or null if the token is invalid.
 */
export function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

function readInitialState() {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return { token: null, userId: null, role: null };
    const decoded = decodeToken(token);
    if (!decoded) return { token: null, userId: null, role: null };
    return { token, userId: decoded.userId, role: decoded.role };
  } catch {
    return { token: null, userId: null, role: null };
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(readInitialState);
  const { addToast } = useToast();

  const clearToken = useCallback(() => {
    localStorage.removeItem('authToken');
    setAuthState({ token: null, userId: null, role: null });
  }, []);

  const setToken = useCallback(
    (token) => {
      const decoded = decodeToken(token);
      if (!decoded) {
        addToast('Invalid token format', 'error');
        return;
      }
      localStorage.setItem('authToken', token);
      setAuthState({ token, userId: decoded.userId, role: decoded.role });
      connectSocket(token);
    },
    [addToast]
  );

  // Listen for auth:401 events dispatched by the api service
  useEffect(() => {
    const handle401 = () => {
      clearToken();
      addToast('Session expired. Please provide a new token.', 'error');
    };

    window.addEventListener('auth:401', handle401);
    return () => window.removeEventListener('auth:401', handle401);
  }, [clearToken, addToast]);

  return (
    <AuthContext.Provider value={{ ...authState, setToken, clearToken }}>
      {children}
    </AuthContext.Provider>
  );
}
