// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthCallbackPage } from './AuthCallbackPage';

const auth = vi.hoisted(() => ({
  initializeAuthCallback: vi.fn<() => Promise<boolean>>(),
  consumeReturnPath: vi.fn<() => string>(),
  beginSignIn: vi.fn<(returnPath: string) => Promise<void>>(),
}));

vi.mock('./auth/authClient', () => auth);

function renderCallback() {
  return render(<MemoryRouter initialEntries={['/auth/callback?code=abc']}><Routes>
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route path="/wishlist" element={<p>Wishlist route</p>} />
    <Route path="/" element={<p>Home route</p>} />
  </Routes></MemoryRouter>);
}

describe('AuthCallbackPage', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('shows the standalone processing state while the OIDC adapter validates the callback', () => {
    auth.initializeAuthCallback.mockReturnValue(new Promise(() => {}));
    renderCallback();
    expect(screen.getByRole('status', { name: 'Đang xử lý đăng nhập' })).toBeTruthy();
    expect(screen.getByText('Đang hoàn tất đăng nhập…')).toBeTruthy();
    expect(document.querySelector('.site-header')).toBeNull();
  });

  it('redirects only after a valid callback and adapter-provided return target', async () => {
    auth.initializeAuthCallback.mockResolvedValue(true);
    auth.consumeReturnPath.mockReturnValue('/wishlist');
    renderCallback();
    expect(await screen.findByText('Đăng nhập thành công, đang chuyển hướng…')).toBeTruthy();
    expect(await screen.findByText('Wishlist route', {}, { timeout: 1000 })).toBeTruthy();
  });

  it('shows a retryable failure and retries sign-in without establishing a session', async () => {
    auth.initializeAuthCallback.mockRejectedValue(new Error('invalid state'));
    auth.consumeReturnPath.mockReturnValue('/wishlist');
    auth.beginSignIn.mockResolvedValue();
    renderCallback();
    expect(await screen.findByText('Không thể hoàn tất đăng nhập')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thử đăng nhập lại' }));
    await waitFor(() => expect(auth.beginSignIn).toHaveBeenCalledWith('/wishlist'));
    expect(screen.queryByText('Wishlist route')).toBeNull();
  });
});
