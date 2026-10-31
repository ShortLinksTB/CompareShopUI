// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(),
  clear: vi.fn<() => Promise<void>>(),
  signIn: vi.fn<(_: unknown) => Promise<void>>(),
}));

vi.mock('./auth/authClient', () => ({
  getAuthenticatedAccessToken: auth.getToken,
  clearAuthenticatedSession: auth.clear,
  startSignIn: auth.signIn,
}));

import { WishlistPage } from './WishlistPage';

const item = { productId: 42, slug: 'sample-item', name: 'Sample item', createdAtUtc: '2026-10-30T10:00:00Z' };
const jsonResponse = (status: number, body?: unknown) => ({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) }) as Response;

function renderPage() { return render(<MemoryRouter><WishlistPage /></MemoryRouter>); }

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  auth.getToken.mockReset();
  auth.clear.mockReset().mockResolvedValue();
  auth.signIn.mockReset().mockResolvedValue();
});

describe('WishlistPage', () => {
  it('keeps the API out of signed-out sessions and starts sign-in with the Wishlist return path', async () => {
    auth.getToken.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Đăng nhập' }));
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('/wishlist'));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Danh sách yêu thích chỉ hiển thị cho tài khoản đã xác thực.')).toBeTruthy();
  });

  it('shows the skeleton until the bearer-authenticated response succeeds and then renders only API items', async () => {
    auth.getToken.mockResolvedValue('access-token');
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn((..._args: Parameters<typeof fetch>) => new Promise<Response>(resolve => { resolveFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(screen.getByLabelText('Đang tải sản phẩm yêu thích').getAttribute('aria-busy')).toBe('true');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer access-token' } });
    resolveFetch(jsonResponse(200, { items: [item, { productId: 'bad', name: 'invalid' }] }));

    expect(await screen.findByRole('link', { name: 'Sample item' })).toBeTruthy();
    expect(screen.queryByText('invalid')).toBeNull();
    expect(screen.queryByLabelText('Đang tải sản phẩm yêu thích')).toBeNull();
  });

  it('clears unusable auth after a 401 and offers retryable sign-in', async () => {
    auth.getToken.mockResolvedValue('expired-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401)));
    renderPage();

    expect((await screen.findByRole('alert')).textContent).toContain('Phiên đăng nhập đã hết hạn');
    expect(auth.clear).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập lại' }));
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('/wishlist'));
    expect(screen.queryByRole('link', { name: 'Sample item' })).toBeNull();
  });

  it('keeps other load failures retryable without displaying a successful empty list', async () => {
    auth.getToken.mockResolvedValue('access-token');
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(500)).mockResolvedValueOnce(jsonResponse(200, { items: [item] }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('link', { name: 'Sample item' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('removes only after 204 and keeps the item visible with a retry action on failure', async () => {
    auth.getToken.mockResolvedValue('access-token');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { items: [item] }))
      .mockResolvedValueOnce(jsonResponse(500))
      .mockResolvedValueOnce(jsonResponse(204));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    const removeButton = await screen.findByRole('button', { name: 'Xóa Sample item' });
    fireEvent.click(removeButton);
    expect(await screen.findByText('Không thể xóa sản phẩm yêu thích. Vui lòng thử lại.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sample item' })).toBeTruthy();
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer access-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 42, operation: 'remove' }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Sample item' })).toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
