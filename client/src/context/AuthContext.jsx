import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/services';

export const AuthContext = createContext(null);

const SIGNED_OUT = { user: null, team: null, player: null };

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [me, setMe] = useState(SIGNED_OUT);

  const refresh = useCallback(async () => {
    try {
      setMe(await authApi.me());
    } catch {
      setMe(SIGNED_OUT);
    } finally {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    refresh();
    // Any 401 from the API (expired cookie) drops the session.
    const onUnauthorized = () => setMe(SIGNED_OUT);
    window.addEventListener('wp:unauthorized', onUnauthorized);
    return () => window.removeEventListener('wp:unauthorized', onUnauthorized);
  }, [refresh]);

  const login = useCallback(async (credentials) => {
    const next = await authApi.login(credentials);
    setMe(next);
    return next;
  }, []);

  const register = useCallback(async (body) => {
    const res = await authApi.register(body);
    if (!res.pendingApproval) setMe(res);
    return res;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setMe(SIGNED_OUT);
  }, []);

  const value = useMemo(() => {
    const role = me.user?.role ?? null;
    return {
      status,
      ...me,
      role,
      isStaff: role === 'admin' || role === 'coach',
      isAdmin: role === 'admin',
      login,
      register,
      logout,
      refresh,
      setMe,
    };
  }, [status, me, login, register, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
