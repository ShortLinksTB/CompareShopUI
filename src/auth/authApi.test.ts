// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi, fetchWithAuth, getSafeReturnPath } from './authApi';

function response(body: unknown, status = 200) { return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body } as Response); }
afterEach(() => { authApi.clear(); window.__APP_CONFIG__ = undefined; vi.unstubAllGlobals(); });

describe('typed auth API client', () => {
  it('sends registration through the configured API without persisting auth tokens', async () => {
    window.__APP_CONFIG__ = { AUTH_API_URL: 'https://auth.example.test' };
    const fetchMock = vi.fn().mockResolvedValue(response({ accepted: true }, 202)); vi.stubGlobal('fetch', fetchMock);
    await authApi.register({ email: 'mai@example.test', password: 'private-password' });
    expect(fetchMock).toHaveBeenCalledWith('https://auth.example.test/api/v1/auth/register', expect.objectContaining({ credentials: 'include', method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'mai@example.test', password: 'private-password' });
  });

  it('treats the contract HTTP 202 as accepted without requiring a response body field', async () => {
    window.__APP_CONFIG__ = { AUTH_API_URL: 'https://auth.example.test' };
    const fetchMock = vi.fn().mockResolvedValue(response({}, 202)); vi.stubGlobal('fetch', fetchMock);
    await expect(authApi.register({ email: 'mai@example.test', password: 'private-password' })).resolves.toEqual({ accepted: true });
  });

  it('treats an empty-body forgot-password HTTP 202 as generic acceptance', async () => {
    window.__APP_CONFIG__ = { AUTH_API_URL: 'https://auth.example.test' };
    const jsonMock = vi.fn().mockRejectedValue(new SyntaxError('empty response'));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 202, json: jsonMock,
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(authApi.forgotPassword('mai@example.test')).resolves.toEqual({ accepted: true });
    expect(fetchMock).toHaveBeenCalledWith('https://auth.example.test/api/v1/auth/forgot-password', expect.objectContaining({
      credentials: 'include', method: 'POST', body: JSON.stringify({ email: 'mai@example.test' }),
    }));
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it('keeps the returned access token in memory and maps API auth errors', async () => {
    window.__APP_CONFIG__ = { AUTH_API_URL: 'https://auth.example.test' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ accessToken: 'memory-token', user: { id: '1', email: 'a@b.test', displayName: 'Mai', emailVerified: true } })));
    await authApi.login({ email: 'a@b.test', password: 'pw' });
    await expect(authApi.getAccessToken()).resolves.toBe('memory-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ code: 'email_not_verified' }, 403)));
    await expect(authApi.login({ email: 'a@b.test', password: 'pw' })).rejects.toMatchObject({ code: 'email_not_verified', status: 403 });
  });

  it('loads the authenticated user after login when the contract returns only an access token', async () => {
    window.__APP_CONFIG__ = { AUTH_API_URL: 'https://auth.example.test' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ accessToken: 'memory-token' }))
      .mockResolvedValueOnce(response({ id: 'u1', email: 'mai@example.test', displayName: 'Mai', emailVerified: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(authApi.login({ email: 'mai@example.test', password: 'private-password' })).resolves.toEqual({
      accessToken: 'memory-token',
      user: { id: 'u1', email: 'mai@example.test', displayName: 'Mai', emailVerified: true },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('https://auth.example.test/api/v1/auth/me');
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({ Authorization: 'Bearer memory-token' });
    await expect(authApi.getAccessToken()).resolves.toBe('memory-token');
  });

  it('clears the in-memory token when the post-login user lookup fails', async () => {
    window.__APP_CONFIG__ = { AUTH_API_URL: 'https://auth.example.test' };
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ accessToken: 'memory-token' }))
      .mockResolvedValueOnce(response({ code: 'forbidden' }, 403)));

    await expect(authApi.login({ email: 'mai@example.test', password: 'private-password' })).rejects.toMatchObject({ status: 403 });
    await expect(authApi.getAccessToken()).resolves.toBeNull();
  });

  it('refreshes once and retries a protected request with the new bearer token', async () => {
    window.__APP_CONFIG__ = { AUTH_API_URL: 'https://auth.example.test' };
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ code: 'expired' }, 401)).mockResolvedValueOnce(response({ accessToken: 'fresh-token' })).mockResolvedValueOnce(response({ id: 'u', email: 'a@b.test', displayName: 'Mai', emailVerified: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(authApi.me()).resolves.toMatchObject({ displayName: 'Mai' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ credentials: 'include' });
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({ 'X-Requested-With': 'XMLHttpRequest' });
    expect(fetchMock.mock.calls[2][1].headers).toMatchObject({ Authorization: 'Bearer fresh-token' });
  });

  it('sends the CSRF request header on logout', async () => {
    window.__APP_CONFIG__ = { AUTH_API_URL: 'https://auth.example.test' };
    const fetchMock = vi.fn().mockResolvedValue(response({})); vi.stubGlobal('fetch', fetchMock);
    await authApi.logout();
    expect(fetchMock).toHaveBeenCalledWith('https://auth.example.test/api/v1/auth/logout', expect.objectContaining({
      credentials: 'include', headers: expect.objectContaining({ 'X-Requested-With': 'XMLHttpRequest' }),
    }));
  });

  it('clears the session and publishes anonymous state when refresh fails', async () => {
    window.__APP_CONFIG__ = { AUTH_API_URL: 'https://auth.example.test' };
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ code: 'expired' }, 401)).mockResolvedValueOnce(response({ code: 'expired' }, 401));
    vi.stubGlobal('fetch', fetchMock);
    const sessionChange = vi.fn(); window.addEventListener('compareshop:auth-session', sessionChange);
    await expect(authApi.me()).rejects.toMatchObject({ code: 'expired' });
    expect(sessionChange).toHaveBeenCalledWith(expect.objectContaining({ detail: null }));
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({ 'X-Requested-With': 'XMLHttpRequest' });
    window.removeEventListener('compareshop:auth-session', sessionChange);
  });

  it('retries one protected Shop API request after a 401 refresh', async () => {
    window.__APP_CONFIG__ = { AUTH_API_URL: 'https://auth.example.test' };
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ accessToken: 'old-token', user: { id: 'u', email: 'a@b.test', displayName: 'A' } }))
      .mockResolvedValueOnce(response({}, 401)).mockResolvedValueOnce(response({ accessToken: 'new-token' })).mockResolvedValueOnce(response({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await authApi.login({ email: 'a@b.test', password: 'pw' });
    const result = await fetchWithAuth('https://shop.example.test/wishlist', {}, 'old-token');
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][1].headers).toMatchObject({ Authorization: 'Bearer new-token' });
  });

  it('reports network and service configuration failures without a mock fallback', async () => {
    window.__APP_CONFIG__ = undefined;
    await expect(authApi.register({ email: 'a@b.test', password: 'pw' })).rejects.toThrow('Auth service is unavailable.');
    window.__APP_CONFIG__ = { AUTH_API_URL: 'https://auth.example.test' };
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(authApi.register({ email: 'a@b.test', password: 'pw' })).rejects.toMatchObject({ code: 'service_unavailable', status: 0 });
  });

  it('only enables the typed local mock in development configuration', async () => {
    window.__APP_CONFIG__ = { AUTH_MOCK_ENABLED: true };
    await authApi.register({ email: 'mock@example.test', password: 'Shop-Safe-2026' });
    await expect(authApi.login({ email: 'mock@example.test', password: 'Shop-Safe-2026' })).rejects.toMatchObject({ code: 'email_not_verified' });
    await authApi.verifyEmail('mock-verification-token');
    await expect(authApi.login({ email: 'mock@example.test', password: 'Shop-Safe-2026' })).resolves.toMatchObject({ user: { emailVerified: true } });
    await expect(authApi.getAccessToken()).resolves.toBe('development-only-memory-token');
    await authApi.logout();
    await expect(authApi.getAccessToken()).resolves.toBeNull();
  });

  it('accepts only same-origin local return paths', () => {
    expect(getSafeReturnPath('/wishlist?tab=price#first')).toBe('/wishlist?tab=price#first');
    expect(getSafeReturnPath('//attacker.test')).toBe('/');
    expect(getSafeReturnPath('/\\\\attacker.test')).toBe('/');
    expect(getSafeReturnPath('/auth/callback')).toBe('/');
  });
});
