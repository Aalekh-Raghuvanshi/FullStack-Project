import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/auth.js';
import { setAuthTokenProvider, setUnauthorizedHandler } from '../services/api.js';

const TOKEN_KEY = 'medicore.accessToken';
const EXPIRY_KEY = 'medicore.expiresAt';
const AuthContext = createContext(null);

function clearSession() {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(EXPIRY_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    const expiresAt = Number(window.sessionStorage.getItem(EXPIRY_KEY));
    return Boolean(token && (!expiresAt || Date.now() < expiresAt));
  });
  const [sessionMessage, setSessionMessage] = useState('');

  const expireSession = useCallback(() => {
    clearSession();
    setUser(null);
    setSessionMessage('Your session has expired. Please sign in again.');
  }, []);

  useEffect(() => {
    setAuthTokenProvider(() => window.sessionStorage.getItem(TOKEN_KEY));
    setUnauthorizedHandler(expireSession);
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    const expiresAt = Number(window.sessionStorage.getItem(EXPIRY_KEY));
    if (!token || (expiresAt && Date.now() >= expiresAt)) {
      clearSession();
      return () => setUnauthorizedHandler(null);
    }
    authService.getCurrentUser()
      .then(setUser)
      .catch((error) => {
        if (error.response?.status !== 401) setSessionMessage(error.userMessage || 'Unable to verify your session.');
      })
      .finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, [expireSession]);

  useEffect(() => {
    if (!user) return undefined;
    const expiresAt = Number(window.sessionStorage.getItem(EXPIRY_KEY));
    if (!expiresAt) return undefined;
    const timeout = window.setTimeout(expireSession, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [user, expireSession]);

  const signIn = useCallback(async (credentials) => {
    const result = await authService.login(credentials);
    window.sessionStorage.setItem(TOKEN_KEY, result.accessToken);
    window.sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + result.expiresIn * 1000));
    setSessionMessage('');
    setUser(result.user);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (window.sessionStorage.getItem(TOKEN_KEY)) await authService.logout();
    } finally {
      clearSession();
      setUser(null);
      setSessionMessage('');
    }
  }, []);

  const value = useMemo(() => ({ user, loading, sessionMessage, signIn, signOut, clearSessionMessage: () => setSessionMessage('') }), [user, loading, sessionMessage, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The hook intentionally shares the provider's context module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
