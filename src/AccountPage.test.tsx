// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AccountPage } from './AccountPage';
import { AuthSessionProvider, type AuthSessionValue } from './auth/AuthSession';
import { LanguageProvider } from './i18n';

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

function renderAccount(session: AuthSessionValue) {
  return render(<LanguageProvider><AuthSessionProvider value={session}><MemoryRouter initialEntries={['/account']}><Routes><Route path="/account" element={<AccountPage />} /></Routes></MemoryRouter></AuthSessionProvider></LanguageProvider>);
}

const baseSession: AuthSessionValue = {
  status: 'loading', user: null,
  getAccessToken: async () => null,
  signIn: vi.fn(),
  signOut: vi.fn(),
};

describe('AccountPage', () => {
  it('shows loading without exposing account data before session resolves', () => {
    renderAccount(baseSession);
    expect(screen.getByRole('status').textContent).toContain('Đang tải tài khoản');
    expect(screen.queryByText(/Trần Minh Quân|quanquan@gmail.com/)).toBeNull();
  });

  it('sends anonymous users to sign in with the local account return path', async () => {
    const signIn = vi.fn();
    renderAccount({ ...baseSession, status: 'anonymous', signIn });
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('/account'));
    expect(screen.getByRole('status').textContent).toContain('Đang chuyển đến đăng nhập');
  });

  it('renders session identity and a live wishlist count, while hiding unsupported cards', async () => {
    const getAccessToken = vi.fn(async () => 'opaque-test-token');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ items: [
      { productId: 12, slug: 'one', name: 'One', imageUrl: null, createdAtUtc: '2026-01-01' },
      { productId: 13, slug: 'two', name: 'Two', imageUrl: null, createdAtUtc: '2026-01-02' },
    ] }) } as Response)));
    renderAccount({ ...baseSession, status: 'authenticated', user: { id: 'u1', displayName: 'Mai Nguyen', email: 'mai@example.test' }, getAccessToken });
    expect(screen.getByRole('heading', { name: 'Xin chào, Mai Nguyen' })).toBeTruthy();
    expect(screen.getByText('mai@example.test')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText('2').length).toBeGreaterThan(0));
    expect(screen.queryByText('Theo dõi giá')).toBeNull();
    expect(screen.queryByText('Lịch sử xem')).toBeNull();
    expect(getAccessToken).toHaveBeenCalledOnce();
  });

  it('delegates sign out to AuthSession', () => {
    const signOut = vi.fn();
    renderAccount({ ...baseSession, status: 'authenticated', user: { id: 'u1', displayName: 'Mai Nguyen', email: 'mai@example.test' }, signOut });
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất khỏi tài khoản/ }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('localizes the live wishlist count in English', async () => {
    localStorage.setItem('giatot-language', 'en');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ items: [
      { productId: 12, slug: 'one', name: 'One', imageUrl: null, createdAtUtc: '2026-01-01' },
    ] }) } as Response)));
    renderAccount({ ...baseSession, status: 'authenticated', user: { id: 'u1', displayName: 'Mai Nguyen', email: 'mai@example.test' }, getAccessToken: async () => 'opaque-test-token' });
    expect(await screen.findByText('1 product')).toBeTruthy();
  });
});
