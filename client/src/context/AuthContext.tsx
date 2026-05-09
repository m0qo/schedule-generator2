import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: Status;
  username: string | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>('loading');
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    api.auth
      .me()
      .then(data => {
        setUsername(data.username);
        setStatus('authenticated');
      })
      .catch(() => {
        setUsername(null);
        setStatus('unauthenticated');
      });
  }, []);

  const login = useCallback(async (u: string, p: string) => {
    try {
      const data = await api.auth.login({ username: u, password: p });
      setUsername(data.username);
      setStatus('authenticated');
      return { ok: true };
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? 'Неверное имя или пароль'
          : err instanceof ApiError && err.status === 500
            ? 'Сервер не настроен (нет ADMIN_PASSWORD)'
            : err instanceof Error
              ? err.message
              : 'Ошибка входа';
      return { ok: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore network errors during logout
    }
    setUsername(null);
    setStatus('unauthenticated');
  }, []);

  return (
    <AuthContext.Provider value={{ status, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
