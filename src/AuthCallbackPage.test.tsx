// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { App } from './App';

const auth = vi.hoisted(() => ({
  complete: vi.fn<() => Promise<string>>(),
  pendingReturnPath: vi.fn<() => string>(),
  start: vi.fn<(returnTo: unknown) => Promise<void>>(),
}));

vi.mock('./auth/authClient', () => ({
  completeSignInCallback: auth.complete,
  getPendingReturnPath: auth.pendingReturnPath,
  startSignIn: auth.start,
}));

function renderCallback() {
  window.history.replaceState({}, '', '/auth/callback?code=authorization-code&state=opaque-state');
  return render(<LanguageProvider><BrowserRouter><App /></BrowserRouter></LanguageProvider>);
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('standalone auth callback', () => {
  it('shows processing outside the site shell while the OIDC callback is pending', () => {
    auth.complete.mockReturnValue(new Promise(() => undefined));
    renderCallback();

    expect(screen.getByRole('heading', { name: 'Đang hoàn tất đăng nhập…' })).toBeTruthy();
    expect(screen.queryByRole('banner')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('shows the redirecting state and returns to the resolved safe app path', async () => {
    auth.complete.mockResolvedValue('/wishlist');
    renderCallback();

    expect(await screen.findByRole('heading', { name: 'Đăng nhập thành công, đang chuyển hướng…' })).toBeTruthy();
    await waitFor(() => expect(window.location.pathname).toBe('/wishlist'), { timeout: 2000 });
  });

  it('shows retryable failure and retries sign-in using the saved return path', async () => {
    auth.complete.mockRejectedValue(new Error('callback cancelled'));
    auth.pendingReturnPath.mockReturnValue('/wishlist');
    auth.start.mockResolvedValue();
    renderCallback();

    fireEvent.click(await screen.findByRole('button', { name: 'Thử đăng nhập lại' }));
    await waitFor(() => expect(auth.start).toHaveBeenCalledWith('/wishlist'));
    expect(screen.getByRole('heading', { name: 'Không thể hoàn tất đăng nhập' })).toBeTruthy();
  });
});
