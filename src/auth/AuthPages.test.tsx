// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthPages } from './AuthPages';
import { AuthApiError } from './authApi';
import { AuthSessionProvider, type AuthSessionValue } from './AuthSession';
import { LanguageProvider, useLanguage } from '../i18n';

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
function LanguageControls() { const { setLanguage } = useLanguage(); return <><button onClick={() => setLanguage('vi')}>VI</button><button onClick={() => setLanguage('en')}>EN</button></>; }

afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); window.__APP_CONFIG__ = undefined; });

describe('auth pages', () => {
  it('localizes the auth brand accessible name when the locale changes', () => {
    render(<LanguageProvider><LanguageControls /><AuthSessionProvider value={anonymous}><MemoryRouter initialEntries={['/login']}><Routes><Route path="*" element={<AuthPages />} /></Routes></MemoryRouter></AuthSessionProvider></LanguageProvider>);

    expect(screen.getByRole('link', { name: 'GiaTot — trang chủ' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('link', { name: 'GiaTot — home page' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'GiaTot — trang chủ' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'VI' }));
    expect(screen.getByRole('link', { name: 'GiaTot — trang chủ' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'GiaTot — home page' })).toBeNull();
  });

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
    expect(screen.getByLabelText('Verification code')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Resend code/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Enter a different email' })).toBeTruthy();
    expect(api.forgotPassword).toHaveBeenCalledWith('mai@example.test', undefined);
  });

  it('updates the unverified alert and accepted resend feedback when locale changes', async () => {
    api.login.mockRejectedValue(new AuthApiError(403, 'email_not_verified', 'Bạn cần xác minh email trước khi đăng nhập.'));
    api.resendVerification.mockResolvedValue({ accepted: true });
    render(<LanguageProvider><LanguageControls /><AuthSessionProvider value={anonymous}><MemoryRouter initialEntries={['/login']}><Routes><Route path="*" element={<AuthPages />} /></Routes></MemoryRouter></AuthSessionProvider></LanguageProvider>);

    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();

    expect(await screen.findByRole('heading', { name: 'Xác minh email để tiếp tục' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Bạn cần xác minh email trước khi đăng nhập.');
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('heading', { name: 'Verify your email to continue' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Verify your email before signing in.');
    expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));

    expect(await screen.findByText('If the email can receive requests, a new message has been sent.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'VI' }));
    expect(screen.getByText('Nếu email có thể nhận yêu cầu, thư mới đã được gửi.')).toBeTruthy();
    expect(api.resendVerification).toHaveBeenCalledWith('mai@example.test', undefined);
  });

  it('shows the unverified alert and accepted resend feedback in Vietnamese', async () => {
    api.login.mockRejectedValue(new AuthApiError(403, 'email_not_verified', 'Bạn cần xác minh email trước khi đăng nhập.'));
    api.resendVerification.mockResolvedValue({ accepted: true });
    renderAt('/login');

    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();

    expect(await screen.findByRole('heading', { name: 'Xác minh email để tiếp tục' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Bạn cần xác minh email trước khi đăng nhập.');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi lại thư xác minh' }));
    expect(await screen.findByText('Nếu email có thể nhận yêu cầu, thư mới đã được gửi.')).toBeTruthy();
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

  it('does not show accepted feedback when resend resolves without acceptance', async () => {
    api.login.mockRejectedValue(new AuthApiError(403, 'email_not_verified', 'Bạn cần xác minh email trước khi đăng nhập.'));
    api.resendVerification.mockResolvedValue({ accepted: false } as never);
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

  it('keeps non-lockout HTTP errors in the generic login handling', async () => {
    api.login.mockRejectedValue(new AuthApiError(503, 'service_unavailable', 'Yêu cầu chưa thể hoàn tất. Vui lòng thử lại.'));
    renderAt('/login'); enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();

    expect((await screen.findByRole('alert')).textContent).toBe('Yêu cầu chưa thể hoàn tất. Vui lòng thử lại.');
    expect(screen.getByRole('heading', { name: 'Đăng nhập để trải nghiệm tốt hơn' })).toBeTruthy();
  });

  it('keeps a non-login HTTP 429 in the generic forgot-code state', async () => {
    api.forgotPassword.mockResolvedValue({ accepted: true });
    api.verifyResetCode.mockRejectedValue(new AuthApiError(429, 'rate_limited', 'Yêu cầu chưa thể hoàn tất. Vui lòng thử lại.'));
    renderAt('/forgot-password');
    enter('email', 'mai@example.test'); submit();
    expect(await screen.findByRole('heading', { name: 'Nhập mã 6 số' })).toBeTruthy();

    enter('pin', '482913'); submit();

    expect((await screen.findByRole('alert')).textContent).toContain('Yêu cầu chưa thể hoàn tất. Vui lòng thử lại.');
    expect(screen.getByRole('heading', { name: 'Nhập mã 6 số' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Thử lại sau ít phút' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Đặt lại mật khẩu' })).toBeNull();
  });

  it('shows the Vietnamese temporary-lockout state for a login HTTP 429', async () => {
    api.login.mockRejectedValue(new AuthApiError(429, 'request_failed'));
    renderAt('/login');
    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();

    expect(await screen.findByRole('heading', { name: 'Thử lại sau ít phút' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Tạm khoá đăng nhập Có quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau 15 phút, hoặc đặt lại mật khẩu ngay.');
    expect(screen.getByText('Việc tạm khoá giúp bảo vệ tài khoản của bạn khỏi người lạ.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đặt lại mật khẩu' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quay lại đăng nhập' })).toBeTruthy();
    expect(screen.queryByText('The request could not be completed. Please try again.')).toBeNull();
  });

  it('localizes the temporary-lockout state for a login HTTP 429 in English', async () => {
    localStorage.setItem('giatot-language', 'en');
    api.login.mockRejectedValue(new AuthApiError(429, 'request_failed'));
    renderAt('/login');
    enter('email', 'mai@example.test'); enter('password', 'Shop-Safe-2026'); submit();

    expect(await screen.findByRole('heading', { name: 'Try again in a few minutes' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Sign-in temporarily locked There have been too many failed sign-in attempts. Please try again in 15 minutes or reset your password now.');
    expect(screen.getByText('This temporary lock helps protect your account from unauthorized access.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeTruthy();
    expect(document.body.textContent).not.toContain('Đăng nhập tạm khoá');
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

  it('localizes the verify-email success body when the locale changes', async () => {
    api.verifyEmail.mockResolvedValue({ verified: true });
    const path = '/verify-email?token=one-time-secret';
    window.history.replaceState({}, '', path);
    render(<LanguageProvider><AuthSessionProvider value={anonymous}><MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={<><AuthPages /><LanguageControls /></>} /></Routes></MemoryRouter></AuthSessionProvider></LanguageProvider>);

    const vietnameseBody = 'Tài khoản của bạn đã sẵn sàng. Đăng nhập để lưu sản phẩm và theo dõi giá.';
    const englishBody = 'Your account is ready. Sign in to save products and track prices.';
    expect(await screen.findByText(vietnameseBody)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByText(englishBody)).toBeTruthy();
    expect(screen.queryByText(vietnameseBody)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'VI' }));
    expect(screen.getByText(vietnameseBody)).toBeTruthy();
    expect(screen.queryByText(englishBody)).toBeNull();
  });

  it('localizes the English PIN and reset-password states', async () => {
    localStorage.setItem('giatot-language', 'en');
    api.forgotPassword.mockResolvedValue({ accepted: true });
    api.verifyResetCode.mockResolvedValue({ resetToken: 'private-reset-token' });
    api.resetPassword.mockResolvedValue({ reset: true });
    renderAt('/forgot-password');
    enter('email', 'mai@example.test'); submit();
    expect(await screen.findByRole('heading', { name: 'Enter your 6-digit code' })).toBeTruthy();
    enter('pin', '482913'); submit();
    expect(await screen.findByRole('heading', { name: 'Set a new password' })).toBeTruthy();
    expect(screen.getByText('Choose a password you have not used elsewhere. After changing it, you will be signed out of your other devices.')).toBeTruthy();
    expect(screen.getByLabelText('New password')).toBeTruthy();
    expect(screen.getByLabelText('New password').getAttribute('aria-label')).toBe('New password');
    expect(screen.getByLabelText('Confirm password').getAttribute('aria-label')).toBe('Confirm password');
    expect(screen.getByRole('button', { name: 'Change password' })).toBeTruthy();
    enter('password', 'New-Shop-Safe-2026'); enter('confirmPassword', 'New-Shop-Safe-2026'); submit();
    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeTruthy();
    expect(document.body.textContent).not.toContain('Mã xác nhận');
    expect(document.body.textContent).not.toContain('Đổi mật khẩu');
    expect(document.body.textContent).not.toContain('private-reset-token');
  });

  it('takes the Vietnamese forgot-password flow through PIN verification and a matching new password', async () => {
    api.forgotPassword.mockResolvedValue({ accepted: true });
    api.verifyResetCode.mockResolvedValue({ resetToken: 'private-reset-token' });
    api.resetPassword.mockResolvedValue({ reset: true });
    renderAt('/forgot-password'); enter('email', 'mai@example.test'); submit();
    expect(await screen.findByRole('heading', { name: 'Nhập mã 6 số' })).toBeTruthy();
    expect(document.getElementById('pin')?.getAttribute('autocomplete')).toBe('one-time-code');
    expect(document.getElementById('pin')?.getAttribute('inputmode')).toBe('numeric');
    enter('pin', '482913'); submit();
    expect(await screen.findByRole('heading', { name: 'Đặt mật khẩu mới' })).toBeTruthy();
    expect(screen.getByText('Chọn mật khẩu mà bạn chưa dùng ở nơi khác. Sau khi đổi, bạn sẽ được đăng xuất khỏi các thiết bị khác.')).toBeTruthy();
    expect(screen.getByLabelText('Mật khẩu mới')).toBeTruthy();
    expect(screen.getByLabelText('Mật khẩu mới').getAttribute('aria-label')).toBe('Mật khẩu mới');
    expect(screen.getByLabelText('Nhập lại mật khẩu').getAttribute('aria-label')).toBe('Nhập lại mật khẩu');
    enter('password', 'New-Shop-Safe-2026'); enter('confirmPassword', 'New-Shop-Safe-2026'); submit();
    expect(await screen.findByRole('heading', { name: 'Đã đổi mật khẩu' })).toBeTruthy();
    expect(api.resetPassword).toHaveBeenCalledWith('private-reset-token', 'New-Shop-Safe-2026');
    expect(document.body.textContent).not.toContain('private-reset-token');
  });

  it('shows the localized expired reset state when the API rejects an expired reset token', async () => {
    localStorage.setItem('giatot-language', 'en');
    api.resetPassword.mockRejectedValue(new AuthApiError(400, 'reset_token_invalid'));
    renderAt('/forgot-password?step=reset');

    enter('password', 'New-Shop-Safe-2026');
    enter('confirmPassword', 'New-Shop-Safe-2026');
    submit();

    expect(await screen.findByRole('heading', { name: 'This link is no longer valid' })).toBeTruthy();
    expect(document.querySelector('.auth-state-icon.is-warning svg')).toBeTruthy();
    expect(screen.queryByText('Follow the instructions below to continue.')).toBeNull();
    expect(screen.getByText('The password reset session expired or was already used. You can request a new code.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Request a new code' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeTruthy();
    expect(document.body.textContent).not.toContain('Phiên đặt lại');
    expect(document.body.textContent).not.toContain('New-Shop-Safe-2026');
    expect(document.getElementById('password')).toBeNull();
    expect(document.getElementById('confirmPassword')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Request a new code' }));
    expect(screen.getByRole('heading', { name: 'Forgot password?' })).toBeTruthy();
  });

  it('matches the approved Vietnamese reset-expired state composition', async () => {
    api.resetPassword.mockRejectedValue(new AuthApiError(400, 'reset_token_invalid'));
    renderAt('/forgot-password?step=reset');

    enter('password', 'New-Shop-Safe-2026');
    enter('confirmPassword', 'New-Shop-Safe-2026');
    submit();

    expect(await screen.findByRole('heading', { name: 'Liên kết không còn hiệu lực' })).toBeTruthy();
    expect(document.querySelector('.auth-state-icon.is-warning svg')).toBeTruthy();
    expect(screen.queryByText('Làm theo hướng dẫn bên dưới để tiếp tục.')).toBeNull();
    expect(screen.getByText('Phiên đặt lại mật khẩu đã hết hạn hoặc đã được dùng. Bạn có thể yêu cầu mã mới.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Yêu cầu mã mới' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quay lại đăng nhập' })).toBeTruthy();
  });
});
