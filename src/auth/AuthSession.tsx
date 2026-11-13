import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type AuthUser, getSafeReturnPath } from './authApi';

export type AuthSessionStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';

export interface AuthSessionUser {
  id: string;
  displayName: string;
  email: string;
}

export interface AuthSessionValue {
  status: AuthSessionStatus;
  user: AuthSessionUser | null;
  getAccessToken: () => Promise<string | null>;
  signIn: (returnTo?: string) => void | Promise<void>;
  signOut: () => void | Promise<void>;
}

const unavailableSession: AuthSessionValue = {
  status: 'loading',
  user: null,
  getAccessToken: async () => null,
  signIn: () => undefined,
  signOut: () => undefined,
};

const AuthSessionContext = createContext<AuthSessionValue>(unavailableSession);

export function AuthSessionProvider({ value, children }: { value?: AuthSessionValue; children: ReactNode }) {
  const [status, setStatus] = useState<AuthSessionStatus>(value?.status ?? 'loading');
  const [user, setUser] = useState<AuthSessionUser | null>(value?.user ?? null);
  useEffect(() => {
    if (value) return;
    let active = true;
    const onSession = (event: Event) => {
      const next = (event as CustomEvent<AuthUser | null>).detail;
      setUser(next ? toSessionUser(next) : null);
      setStatus(next ? 'authenticated' : 'anonymous');
    };
    window.addEventListener('compareshop:auth-session', onSession);
    authApi.getAccessToken().then(token => token ? authApi.me() : null).then(current => {
      if (!active) return;
      setUser(current ? toSessionUser(current) : null);
      setStatus(current ? 'authenticated' : 'anonymous');
    }).catch(() => { if (active) { setUser(null); setStatus('anonymous'); } });
    return () => { active = false; window.removeEventListener('compareshop:auth-session', onSession); };
  }, [value]);
  const session = useMemo<AuthSessionValue>(() => value ?? ({
    status, user,
    getAccessToken: () => authApi.getAccessToken(),
    signIn: async (returnTo = '/') => { window.location.assign(`/login?returnTo=${encodeURIComponent(getSafeReturnPath(returnTo))}`); },
    signOut: async () => { await authApi.logout(); authApi.clear(); setUser(null); setStatus('anonymous'); setAuthSessionUser(null); window.location.assign('/'); },
  }), [value, status, user]);
  return <AuthSessionContext.Provider value={session}>{children}</AuthSessionContext.Provider>;
}

export function setAuthSessionUser(next: AuthUser | null) {
  window.dispatchEvent(new CustomEvent('compareshop:auth-session', { detail: next }));
}

function toSessionUser(current: AuthUser): AuthSessionUser { return { id: current.id, email: current.email, displayName: current.displayName?.trim() || current.email }; }

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
