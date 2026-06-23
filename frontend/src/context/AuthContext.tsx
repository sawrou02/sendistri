import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api, { setAccessToken } from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to restore session via the refresh-token cookie.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post<{ data: { accessToken: string } }>('/auth/refresh');
        setAccessToken(data.data.accessToken);
        const me = await api.get<{ data: User }>('/auth/me');
        setUser(me.data.data);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const { data } = await api.post<{ data: { accessToken: string; user: User } }>('/auth/login', {
      email,
      password,
    });
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
