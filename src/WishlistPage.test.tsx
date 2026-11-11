// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import stylesheet from './styles.css?inline';
import { LanguageProvider } from './i18n';
import { AuthSessionProvider, type AuthSessionValue } from './auth/AuthSession';
import { WishlistProvider } from './wishlist/WishlistContext';
import { WishlistPage } from './WishlistPage';

const item = { productId: 42, slug: 'sample-item', name: 'Sample item', imageUrl: 'https://cdn.example/wishlist.jpg', createdAtUtc: '2026-10-30T10:00:00Z' };
const jsonResponse = (status: number, body?: unknown) => ({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) }) as Response;
const session = (status: AuthSessionValue['status'], overrides: Partial<AuthSessionValue> = {}): AuthSessionValue => ({
  status,
  user: status === 'authenticated' ? { id: 'user-1', displayName: 'Sample User', email: 'sample@example.test' } : null,
  getAccessToken: vi.fn(async () => status === 'authenticated' ? 'access-token' : null),
  signIn: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  ...overrides,
});

function renderPage(authSession: AuthSessionValue) {
  return render(<LanguageProvider><AuthSessionProvider value={authSession}><MemoryRouter initialEntries={['/wishlist']}><WishlistProvider><WishlistPage /></WishlistProvider></MemoryRouter></AuthSessionProvider></LanguageProvider>);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('WishlistPage', () => {
  it('keeps the API out of anonymous sessions and signs in with the Wishlist return path', async () => {
    const anonymous = session('anonymous');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage(anonymous);

    fireEvent.click(await screen.findByRole('button', { name: 'Đăng nhập' }));
    await waitFor(() => expect(anonymous.signIn).toHaveBeenCalledWith('/wishlist'));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Danh sách yêu thích chỉ hiển thị cho tài khoản đã xác thực.')).toBeTruthy();
  });

  it('shows loading until the authenticated API response succeeds and renders only API items', async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn((..._args: Parameters<typeof fetch>) => new Promise<Response>(resolve => { resolveFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage(session('authenticated'));

    expect(screen.getByLabelText('Đang tải sản phẩm yêu thích').getAttribute('aria-busy')).toBe('true');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer access-token' } });
    resolveFetch(jsonResponse(200, { items: [item, { productId: 'bad', name: 'invalid' }] }));

    expect(await screen.findByRole('link', { name: 'Sample item' })).toBeTruthy();
    expect((screen.getByRole('img', { name: 'Sample item' }) as HTMLImageElement).src).toBe('https://cdn.example/wishlist.jpg');
    expect(screen.queryByText('invalid')).toBeNull();
    expect(screen.queryByLabelText('Đang tải sản phẩm yêu thích')).toBeNull();
  });

  it('keeps the empty-state action below its description with wireframe spacing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { items: [] })));
    renderPage(session('authenticated'));

    expect(await screen.findByRole('heading', { name: 'Chưa có sản phẩm yêu thích' })).toBeTruthy();
    const description = screen.getByText('Nhấn biểu tượng trái tim trên sản phẩm để lưu lại.');
    const action = screen.getByRole('link', { name: 'Khám phá sản phẩm' });
    expect(description.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(stylesheet).toMatch(/\.wishlist-page \.empty-state p\s*\{\s*margin:\s*0 0 18px;\s*font-size:\s*13px\s*;?\s*\}/);
  });

  it('keeps load failures retryable without displaying a successful empty list', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(500)).mockResolvedValueOnce(jsonResponse(200, { items: [item] }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage(session('authenticated'));

    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('link', { name: 'Sample item' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps a failed removal visible and offers a retry through the shared wishlist state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { items: [item] }))
      .mockResolvedValueOnce(jsonResponse(500))
      .mockResolvedValueOnce(jsonResponse(204))
      .mockResolvedValueOnce(jsonResponse(200, { items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage(session('authenticated'));

    fireEvent.click(await screen.findByRole('button', { name: 'Xóa Sample item' }));
    expect(await screen.findByText('Không thể cập nhật sản phẩm yêu thích. Vui lòng thử lại.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sample item' })).toBeTruthy();
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer access-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 42, operation: 'remove' }),
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Thử lại' })[0]);
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Sample item' })).toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
