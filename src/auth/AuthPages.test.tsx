// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthPages } from './AuthPages';
import { AuthSessionProvider, type AuthSessionValue } from './AuthSession';
import { LanguageProvider } from '../i18n';

const api = vi.hoisted(() => ({
  register: vi.fn(), verifyEmail: vi.fn(), resendVerification: vi.fn(), login: vi.fn(), forgotPassword: vi.fn(), verifyResetCode: vi.fn(), resetPassword: vi.fn(),
}));
vi.mock('./authApi', async importOriginal => {
  const actual = await importOriginal<typeof import('./authApi')>();
  return { ...actual, authApi: { ...actual.authApi, ...api } };
});

const anonymous: AuthSessionValue = { status: 'anonymous', user: null, getAccessToken: async () => null, signIn: vi.fn(), signOut: vi.fn() };
function renderAt(path: string) {
  window.history.replaceState({}, '', path);
  return render(<LanguageProvider><AuthSessionProvider value={anonymous}><MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={<AuthPages />} /></Routes></MemoryRouter></AuthSessionProvider></LanguageProvider>);
}
function enter(id: string, value: string) { fireEvent.change(document.getElementById(id)!, { target: { value } }); }
function submit() { fireEvent.submit(document.querySelector('form')!); }
function CurrentPath() { return <span data-testid="current-path">{useLocation().pathname}</span>; }

afterEach(() => { cleanup(); vi.clearAllMocks(); window.__APP_CONFIG__ = undefined; window.localStorage.removeItem('giatot-language'); });

describe('auth pages', () => {
  it('shows a generic registration confirmation only after submission succeeds', async () => {
    api.register.mockResolvedValue({ accepted: true });
    renderAt('/register');
    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();
    expect(await screen.findByRole('heading', { name: 'Kiểm tra email của bạn' })).toBeTruthy();
    expect(screen.getByText(/Nếu địa chỉ email có thể đăng ký/)).toBeTruthy();
    expect(api.register).toHaveBeenCalledWith({ email: 'mai@example.test', password: 'Shop-Safe-2026' });
  });

  it('localizes registration password feedback, visibility, and accepted confirmation in English', async () => {
    window.localStorage.setItem('giatot-language', 'en');
    api.register.mockResolvedValue({ accepted: true });
    renderAt('/register');
    expect(screen.getByText('At least 8 characters')).toBeTruthy();
    expect(screen.getByText('Not a commonly used password')).toBeTruthy();
    expect(screen.getByText('Does not contain the part of your email before @')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy();
    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeTruthy();
    expect(screen.getByText('Open the verification email to activate your account. The link is valid for 24 hours.')).toBeTruthy();
  });

  it('keeps an API failure visible instead of showing a success state', async () => {
    api.login.mockRejectedValue(new Error('Auth service is unavailable.'));
    renderAt('/login'); enter('email', 'mai@example.test'); enter('password', 'password'); submit();
    expect((await screen.findByRole('alert')).textContent).toContain('Auth service is unavailable.');
    expect(screen.getByRole('heading', { name: 'Đăng nhập để trải nghiệm tốt hơn' })).toBeTruthy();
  });

  it('returns to a safe local path after a successful sign-in', async () => {
    api.login.mockResolvedValue({ accessToken: 'memory-token', user: { id: 'u1', email: 'mai@example.test', displayName: 'Mai', emailVerified: true } });
    window.history.replaceState({}, '', '/login?returnTo=%2Fwishlist');
    render(<LanguageProvider><AuthSessionProvider value={anonymous}><MemoryRouter initialEntries={['/login?returnTo=%2Fwishlist']}><Routes><Route path="*" element={<><AuthPages /><CurrentPath /></>} /></Routes></MemoryRouter></AuthSessionProvider></LanguageProvider>);
    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/wishlist'));
  });

  it('consumes verification token and removes it from browser history', async () => {
    api.verifyEmail.mockResolvedValue({ verified: true });
    renderAt('/verify-email?token=one-time-secret');
    expect(await screen.findByRole('heading', { name: 'Email đã được xác minh' })).toBeTruthy();
    await waitFor(() => expect(api.verifyEmail).toHaveBeenCalledWith('one-time-secret'));
    expect(window.location.search).toBe('');
  });

  it('takes the forgot-password flow through PIN verification and a matching new password', async () => {
    api.forgotPassword.mockResolvedValue({ accepted: true });
    api.verifyResetCode.mockResolvedValue({ resetToken: 'private-reset-token' });
    api.resetPassword.mockResolvedValue({ reset: true });
    renderAt('/forgot-password'); enter('email', 'mai@example.test'); submit();
    expect(await screen.findByRole('heading', { name: 'Nhập mã 6 số' })).toBeTruthy();
    expect(document.getElementById('pin')?.getAttribute('autocomplete')).toBe('one-time-code');
    expect(document.getElementById('pin')?.getAttribute('inputmode')).toBe('numeric');
    enter('pin', '482913'); submit();
    expect(await screen.findByRole('heading', { name: 'Đặt mật khẩu mới' })).toBeTruthy();
    enter('password', 'New-Shop-Safe-2026'); enter('confirmPassword', 'New-Shop-Safe-2026'); submit();
    expect(await screen.findByRole('heading', { name: 'Đã đổi mật khẩu' })).toBeTruthy();
    expect(api.resetPassword).toHaveBeenCalledWith('private-reset-token', 'New-Shop-Safe-2026');
    expect(document.body.textContent).not.toContain('private-reset-token');
  });
});
