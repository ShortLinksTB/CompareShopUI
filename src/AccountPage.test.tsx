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

function alertResponse(items: unknown[], ok = true, status = ok ? 200 : 500) {
  return { ok, status, json: async () => ({ items }) } as Response;
}

function priceAlert(id: number) {
  return { id, productId: id + 10, slug: `product-${id}`, name: `Product ${id}`, targetPrice: 100, isActive: true, createdAtUtc: '2026-01-01' };
}

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

  it('renders session identity and live wishlist and price-alert counts, hiding unsupported cards', async () => {
    const getAccessToken = vi.fn(async () => 'opaque-test-token');
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/price-alerts')
      ? alertResponse([priceAlert(1), priceAlert(2), priceAlert(3)])
      : alertResponse([
        { productId: 12, slug: 'one', name: 'One', imageUrl: null, createdAtUtc: '2026-01-01' },
        { productId: 13, slug: 'two', name: 'Two', imageUrl: null, createdAtUtc: '2026-01-02' },
      ])));
    renderAccount({ ...baseSession, status: 'authenticated', user: { id: 'u1', displayName: 'Mai Nguyen', email: 'mai@example.test' }, getAccessToken });
    expect(screen.getByRole('heading', { name: 'Xin chào, Mai Nguyen' })).toBeTruthy();
    expect(screen.getByText('mai@example.test')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText('2').length).toBeGreaterThan(0));
    expect(await screen.findByText('3 sản phẩm')).toBeTruthy();
    expect(screen.getByText('Theo dõi giá')).toBeTruthy();
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
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/price-alerts')
      ? alertResponse([priceAlert(1)])
      : alertResponse([{ productId: 12, slug: 'one', name: 'One', imageUrl: null, createdAtUtc: '2026-01-01' }])));
    renderAccount({ ...baseSession, status: 'authenticated', user: { id: 'u1', displayName: 'Mai Nguyen', email: 'mai@example.test' }, getAccessToken: async () => 'opaque-test-token' });
    expect(await screen.findByText('1 product')).toBeTruthy();
    expect(await screen.findByText('1 alert')).toBeTruthy();
  });

  it('shows a zero count when the price-alert API returns an empty list', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/price-alerts')
      ? alertResponse([])
      : alertResponse([])));
    renderAccount({ ...baseSession, status: 'authenticated', user: { id: 'u1', displayName: 'Mai Nguyen', email: 'mai@example.test' }, getAccessToken: async () => 'opaque-test-token' });
    expect(screen.getAllByText('Đang tải…').length).toBeGreaterThan(0);
    expect((await screen.findAllByText('0 sản phẩm')).length).toBe(2);
    expect(screen.queryByText('Không thể tải số theo dõi giá.')).toBeNull();
  });

  it('shows a localized error when loading price alerts fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/price-alerts')
      ? alertResponse([], false, 500)
      : alertResponse([])));
    renderAccount({ ...baseSession, status: 'authenticated', user: { id: 'u1', displayName: 'Mai Nguyen', email: 'mai@example.test' }, getAccessToken: async () => 'opaque-test-token' });
    expect(await screen.findByText('Không thể tải số theo dõi giá.')).toBeTruthy();
  });

  it('localizes price-alert failures in English', async () => {
    localStorage.setItem('giatot-language', 'en');
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/price-alerts')
      ? alertResponse([], false, 503)
      : alertResponse([])));
    renderAccount({ ...baseSession, status: 'authenticated', user: { id: 'u1', displayName: 'Mai Nguyen', email: 'mai@example.test' }, getAccessToken: async () => 'opaque-test-token' });
    expect(await screen.findByText('Could not load your price-alert count.')).toBeTruthy();
  });
});
