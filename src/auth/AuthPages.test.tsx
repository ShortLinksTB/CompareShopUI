// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthPages } from './AuthPages';
import { AuthApiError } from './authApi';
import { AuthSessionProvider, type AuthSessionValue } from './AuthSession';
import { LanguageProvider } from '../i18n';

const api = vi.hoisted(() => ({
  register: vi.fn(), verifyEmail: vi.fn(), resendVerification: vi.fn(), login: vi.fn(), me: vi.fn(), forgotPassword: vi.fn(), verifyResetCode: vi.fn(), resetPassword: vi.fn(),
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

afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); window.__APP_CONFIG__ = undefined; });

describe('auth pages', () => {
  it('shows a generic registration confirmation only after submission succeeds', async () => {
    api.register.mockResolvedValue({ accepted: true });
    renderAt('/register');
    expect(screen.getByRole('button', { name: 'Tạo tài khoản' })).toBeTruthy();
    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();
    expect(await screen.findByRole('heading', { name: 'Kiểm tra email của bạn' })).toBeTruthy();
    expect(screen.getByText(/Nếu địa chỉ email có thể đăng ký/)).toBeTruthy();
    expect(api.register).toHaveBeenCalledWith({ email: 'mai@example.test', password: 'Shop-Safe-2026' });
  });

  it('localizes registration password feedback, visibility, and accepted confirmation in English', async () => {
    window.localStorage.setItem('giatot-language', 'en');
    api.register.mockResolvedValue({ accepted: true });
    renderAt('/register');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
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

  it('localizes the complete forgot-password request and accepted state in English', async () => {
    window.localStorage.setItem('giatot-language', 'en');
    api.forgotPassword.mockResolvedValue({ accepted: true });
    renderAt('/forgot-password');

    expect(screen.getByRole('heading', { name: 'Forgot password?' })).toBeTruthy();
    expect(screen.getByText('Enter your registered email address. We will send a 6-digit code to reset your password.')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    enter('email', 'mai@example.test'); submit();

    expect(await screen.findByRole('heading', { name: 'Enter your 6-digit code' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('If the email is registered, a reset code has been sent.');
    expect(api.forgotPassword).toHaveBeenCalledWith('mai@example.test', undefined);
  });

  it('localizes the unverified login state and shows accepted resend feedback in English', async () => {
    localStorage.setItem('giatot-language', 'en');
    api.login.mockRejectedValue(new AuthApiError(403, 'email_not_verified', 'Bạn cần xác minh email trước khi đăng nhập.'));
    api.resendVerification.mockResolvedValue({ accepted: true });
    renderAt('/login');

    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();

    expect(await screen.findByRole('heading', { name: 'Verify your email to continue' })).toBeTruthy();
    expect(screen.getByText('Verify your email before signing in.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));

    expect(await screen.findByText('If the email can receive requests, a new message has been sent.')).toBeTruthy();
    expect(api.resendVerification).toHaveBeenCalledWith('mai@example.test', undefined);
  });

  it('keeps resend failures visible without showing accepted feedback', async () => {
    api.login.mockRejectedValue(new AuthApiError(403, 'email_not_verified', 'Bạn cần xác minh email trước khi đăng nhập.'));
    api.resendVerification.mockRejectedValue(new Error('Không thể gửi lại. Vui lòng thử lại.'));
    renderAt('/login');
    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();
    await screen.findByRole('heading', { name: 'Xác minh email để tiếp tục' });

    fireEvent.click(screen.getByRole('button', { name: 'Gửi lại thư xác minh' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Không thể gửi lại. Vui lòng thử lại.');
    expect(screen.queryByText('Nếu email có thể nhận yêu cầu, thư mới đã được gửi.')).toBeNull();
  });

  it('keeps an API failure visible instead of showing a success state', async () => {
    api.login.mockRejectedValue(new Error('Auth service is unavailable.'));
    renderAt('/login'); enter('email', 'mai@example.test'); enter('password', 'password'); submit();
    expect((await screen.findByRole('alert')).textContent).toContain('Auth service is unavailable.');
    expect(screen.getByRole('heading', { name: 'Đăng nhập để trải nghiệm tốt hơn' })).toBeTruthy();
  });

  it('localizes the login password toggle, accessible label, and forgot-password link in English', () => {
    localStorage.setItem('giatot-language', 'en');
    renderAt('/login');

    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeTruthy();
    const showPassword = screen.getByRole('button', { name: 'Show password' });
    expect(showPassword.textContent).toBe('Show');

    fireEvent.click(showPassword);

    expect(screen.getByRole('button', { name: 'Hide password' }).textContent).toBe('Hide');
    expect((document.getElementById('password') as HTMLInputElement).type).toBe('text');
  });

  it('returns to a safe local path after a successful sign-in', async () => {
    api.login.mockResolvedValue({ accessToken: 'memory-token', user: { id: 'u1', email: 'mai@example.test', displayName: 'Mai', emailVerified: true } });
    window.history.replaceState({}, '', '/login?returnTo=%2Fwishlist');
    render(<LanguageProvider><AuthSessionProvider value={anonymous}><MemoryRouter initialEntries={['/login?returnTo=%2Fwishlist']}><Routes><Route path="*" element={<><AuthPages /><CurrentPath /></>} /></Routes></MemoryRouter></AuthSessionProvider></LanguageProvider>);
    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();
    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/wishlist'));
  });

  it('establishes the session from the token-only login contract using the /me profile', async () => {
    api.login.mockResolvedValue({ accessToken: 'memory-token' });
    api.me.mockResolvedValue({ id: 'u1', email: 'mai@example.test', displayName: 'Mai', emailVerified: true });
    window.history.replaceState({}, '', '/login?returnTo=%2Fwishlist');
    const sessionChanged = vi.fn(); window.addEventListener('compareshop:auth-session', sessionChanged);
    render(<LanguageProvider><AuthSessionProvider value={anonymous}><MemoryRouter initialEntries={['/login?returnTo=%2Fwishlist']}><Routes><Route path="*" element={<><AuthPages /><CurrentPath /></>} /></Routes></MemoryRouter></AuthSessionProvider></LanguageProvider>);

    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();

    await waitFor(() => expect(screen.getByTestId('current-path').textContent).toBe('/wishlist'));
    expect(api.me).toHaveBeenCalledOnce();
    expect(sessionChanged).toHaveBeenCalledWith(expect.objectContaining({ detail: { id: 'u1', email: 'mai@example.test', displayName: 'Mai', emailVerified: true } }));
    window.removeEventListener('compareshop:auth-session', sessionChanged);
  });

  it('does not publish or navigate to an authenticated state when the /me lookup fails', async () => {
    api.login.mockResolvedValue({ accessToken: 'memory-token' });
    api.me.mockRejectedValue(new Error('sensitive response detail'));
    renderAt('/login');
    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();

    expect((await screen.findByRole('alert')).textContent).toContain('Không thể xác nhận phiên đăng nhập');
    expect(document.body.textContent).not.toContain('sensitive response detail');
    expect(screen.getByRole('heading', { name: 'Đăng nhập để trải nghiệm tốt hơn' })).toBeTruthy();
  });

  it('publishes the authenticated user to the shared AuthSession after login', async () => {
    const user = { id: 'u1', email: 'mai@example.test', displayName: 'Mai', emailVerified: true };
    api.login.mockResolvedValue({ accessToken: 'memory-token', user });
    const onSession = vi.fn();
    window.addEventListener('compareshop:auth-session', onSession);
    renderAt('/login');
    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();

    await waitFor(() => expect(onSession).toHaveBeenCalledWith(expect.objectContaining({ detail: user })));
    window.removeEventListener('compareshop:auth-session', onSession);
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
