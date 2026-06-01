import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, TOKEN_KEY } from '../lib/axios';
import type { AuthUser, LoginResponse } from '../types/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
  login: (phone: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = 'dokonchi:user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  });
  const [isReady, setIsReady] = useState(false);

  // Token bor bo'lsa /auth/me ni so'rab tekshirib turish
  useEffect(() => {
    let cancelled = false;
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsReady(true);
      return;
    }
    api
      .get<AuthUser>('/auth/me')
      .then((res) => {
        if (cancelled) return;
        setUser(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      })
      .catch(() => {
        if (cancelled) return;
        // 401 → interceptor allaqachon localStorage tozalab loginga yo'naltiradi
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
    // bo'sh bog'liqlik — bir marta ishga tushganda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (phone: string, password: string) => {
    const res = await api.post<LoginResponse>('/auth/login', { phone, password });
    localStorage.setItem(TOKEN_KEY, res.data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    setToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isReady, login, logout }),
    [user, token, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider ichida bo\'lishi kerak');
  return ctx;
}
