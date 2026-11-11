import { createContext, useContext, type ReactNode } from 'react';

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

export function AuthSessionProvider({ value = unavailableSession, children }: { value?: AuthSessionValue; children: ReactNode }) {
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
