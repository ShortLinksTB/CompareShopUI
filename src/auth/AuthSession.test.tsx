// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { AuthSessionProvider, setAuthSessionUser, useAuthSession, type AuthSessionValue } from './AuthSession';

const auth = vi.hoisted(() => ({ getAccessToken: vi.fn(), me: vi.fn(), logout: vi.fn(), clear: vi.fn() }));
vi.mock('./authApi', () => ({ authApi: auth, getSafeReturnPath: (value: unknown) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/' }));
function Probe() { const session = useAuthSession(); return <div data-testid="state">{session.status}:{session.user?.displayName ?? 'anonymous'}</div>; }
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('restores the account from the refresh cookie through the shared session provider', async () => {
  auth.getAccessToken.mockResolvedValue('access'); auth.me.mockResolvedValue({ id: 'u1', email: 'mai@example.test', displayName: 'Mai', emailVerified: true });
  render(<AuthSessionProvider><Probe /></AuthSessionProvider>);
  await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('authenticated:Mai'));
});

it('falls back to anonymous state when no refresh session is available', async () => {
  auth.getAccessToken.mockResolvedValue(null);
  render(<AuthSessionProvider><Probe /></AuthSessionProvider>);
  await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('anonymous:anonymous'));
  expect(auth.me).not.toHaveBeenCalled();
});

it('clears the authenticated user when a protected request cannot refresh the session', async () => {
  auth.getAccessToken.mockResolvedValue('access'); auth.me.mockResolvedValue({ id: 'u1', email: 'mai@example.test', displayName: 'Mai', emailVerified: true });
  render(<AuthSessionProvider><Probe /></AuthSessionProvider>);
  await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('authenticated:Mai'));
  window.dispatchEvent(new CustomEvent('compareshop:auth-session', { detail: null }));
  await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('anonymous:anonymous'));
});

it('accepts the existing injectable AuthSession test boundary and publishes user changes', async () => {
  const injected: AuthSessionValue = { status: 'anonymous', user: null, getAccessToken: async () => null, signIn: vi.fn(), signOut: vi.fn() };
  render(<AuthSessionProvider value={injected}><Probe /></AuthSessionProvider>);
  expect(screen.getByTestId('state').textContent).toBe('anonymous:anonymous');
  cleanup();
  auth.getAccessToken.mockResolvedValue(null);
  render(<AuthSessionProvider><Probe /></AuthSessionProvider>);
  await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('anonymous:anonymous'));
  setAuthSessionUser({ id: 'u2', email: 'lee@example.test', displayName: 'Lee', emailVerified: true });
  await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('authenticated:Lee'));
});
