// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthSessionProvider } from './auth/AuthSession';
import { LanguageProvider } from './i18n';
import { SearchPage } from './SearchPage';
import { WishlistProvider } from './wishlist/WishlistContext';

const api = 'https://api-compareshop-dev.giamha.online/api/v1';
const product = {
  id: 2041,
  slug: 'sample-computer',
  name: 'Sample Computer',
  imageUrl: null,
  brand: 'Example',
  category: { id: 2, slug: 'computers', name: 'Computers' },
  offerSummary: { minPrice: 1200, maxPrice: 1400, offerCount: 2 },
};

function response(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

function renderCategory(slug: string) {
  return render(<MemoryRouter initialEntries={[`/category/${slug}`]}>
    <AuthSessionProvider value={{ status: 'anonymous', user: null, getAccessToken: async () => null, signIn: vi.fn(), signOut: vi.fn() }}>
      <LanguageProvider><WishlistProvider><Routes><Route path="/category/:slug" element={<SearchPage />} /></Routes></WishlistProvider></LanguageProvider>
    </AuthSessionProvider>
  </MemoryRouter>);
}

function categoryApi(fetchMock: ReturnType<typeof vi.fn>) {
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === `${api}/categories`) return response({ items: [{ id: 1006, slug: 'electronics', name: 'Electronics', parentId: null }] });
    if (url === `${api}/categories?parentId=1006`) return response({ items: [
      { id: 2, slug: 'computers', name: 'Computers', parentId: 1006 },
      { id: 99, slug: 'unrelated', name: 'Unrelated' },
    ] });
    if (url === `${api}/categories?parentId=2`) return response({ items: [] });
    if (url.startsWith(`${api}/products?`)) return response({ items: [product], page: 1, pageSize: 12, totalItems: 1, totalPages: 1 });
    throw new Error(`Unexpected request: ${url}`);
  });
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('nested category routes', () => {
  it('resolves computers from its parent category and loads products by category ID', async () => {
    const fetchMock = vi.fn();
    categoryApi(fetchMock);
    vi.stubGlobal('fetch', fetchMock);

    renderCategory('computers');

    expect(await screen.findByRole('link', { name: 'Sample Computer' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Computers' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thêm vào yêu thích' })).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`${api}/products?page=1&pageSize=12&categoryId=2`));
  });

  it('keeps unknown category slugs in the not-found state without requesting unfiltered products', async () => {
    const fetchMock = vi.fn();
    categoryApi(fetchMock);
    vi.stubGlobal('fetch', fetchMock);

    renderCategory('unknown-category');

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy danh mục' })).toBeTruthy();
    expect(fetchMock.mock.calls.some(([input]) => String(input).startsWith(`${api}/products?`))).toBe(false);
  });
});
