// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { App } from './App';
import { LanguageProvider } from './i18n';
import { ShopPage } from './ShopPage';
import './styles.css';

const api = 'https://api-compareshop-dev.giamha.online/api/v1';
const shop = { id: 24, slug: 'sample-shop', name: 'Sample Shop', logoUrl: null, websiteUrl: null };
const product = { id: 91, slug: 'sample-product', name: 'Sample Product', brand: 'Example', category: { id: 4, slug: 'phones', name: 'Phones' }, offerSummary: { minPrice: 1200000, maxPrice: 1400000, offerCount: 3 } };
const laptop = { id: 92, slug: 'sample-laptop', name: 'Sample Laptop', brand: null, category: { id: 5, slug: 'laptops', name: 'Laptops' }, offerSummary: { minPrice: null, maxPrice: null, offerCount: 0 } };

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) } as Response);
}

function renderShop() {
  return render(<MemoryRouter initialEntries={['/shops/sample-shop']}><Routes><Route path="/shops/:slug" element={<ShopPage />} /></Routes></MemoryRouter>);
}

function renderShopRoute() {
  return render(<LanguageProvider><MemoryRouter initialEntries={['/shops/sample-shop']}><App /></MemoryRouter></LanguageProvider>);
}

function setColorScheme(theme: 'light' | 'dark') {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query.includes('prefers-color-scheme: dark') && theme === 'dark',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList));
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Partner Shop API data', () => {
  it('loads a shop by route slug, then its products by shop ID', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => String(input).endsWith('/shops/sample-shop')
      ? response(shop)
      : response({ items: [product], page: 1, pageSize: 12, totalItems: 1, totalPages: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    renderShop();
    expect(screen.getByRole('status').textContent).toContain('Đang tải');
    expect(await screen.findByRole('heading', { name: 'Sample Shop' })).toBeTruthy();
    expect(screen.getByText('Chưa có đánh giá')).toBeTruthy();
    expect(screen.getByText('(Số lượt đánh giá chưa có)')).toBeTruthy();
    expect(screen.getByText(/Cửa hàng đối tác · Trạng thái chưa được cung cấp/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Xem website ↗' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('link', { name: 'Sample Product' }).getAttribute('href')).toBe('/product/sample-product');
    expect(screen.getByText((_content, element) => element?.className === 'price' && element.textContent?.includes('1.200.000') === true)).toBeTruthy();
    expect(screen.queryByText(/1\.3M/)).toBeNull();
    expect(fetchMock).toHaveBeenNthCalledWith(1, `${api}/shops/sample-shop`);
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${api}/products?shopId=24&page=1&pageSize=12`);
  });

  it('preserves API rating, status, and the active website action when those fields exist', async () => {
    const shopWithDetails = { ...shop, rating: 4.8, reviewCount: 1200, status: 'active', websiteUrl: 'https://shop.example' };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => String(input).endsWith('/shops/sample-shop')
      ? response(shopWithDetails)
      : response({ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 })));
    renderShop();

    expect(await screen.findByText('★ 4.8')).toBeTruthy();
    expect(screen.getByText('(1.200 đánh giá)')).toBeTruthy();
    expect(screen.getByText(/Cửa hàng đối tác · Đang hoạt động/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Xem website ↗' }).getAttribute('href')).toBe('https://shop.example');
  });

  it.each(['light', 'dark'] as const)('keeps the Shop route fixed light under a %s color preference', async theme => {
    setColorScheme(theme);
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => String(input).endsWith('/shops/sample-shop')
      ? response(shop)
      : response({ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 })));
    renderShopRoute();

    expect(await screen.findByRole('heading', { name: 'Sample Shop' })).toBeTruthy();
    const shell = document.querySelector('.light-shell');
    expect(shell).toBeTruthy();
    expect(shell?.querySelector('.site-header')).toBeTruthy();
    expect(shell?.querySelector('.shop-hero')?.children).toHaveLength(3);
    expect(shell?.classList.contains('light-shell')).toBe(true);
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(theme === 'dark');
  });

  it('uses neutral fallbacks for absent logo and price, and renders the empty catalog state', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => String(input).endsWith('/shops/sample-shop')
      ? response(shop)
      : response({ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 })));
    renderShop();

    expect(await screen.findByText('Chưa có sản phẩm tại cửa hàng này')).toBeTruthy();
    expect(screen.getByText('SA')).toBeTruthy();
    expect(screen.queryByText(/Giá tốt|Giá niêm yết|1\.3M/)).toBeNull();
  });

  it('filters the loaded products with category fields returned by the API', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => String(input).endsWith('/shops/sample-shop')
      ? response(shop)
      : response({ items: [product, laptop], page: 1, pageSize: 12, totalItems: 2, totalPages: 1 })));
    renderShop();

    expect(await screen.findByRole('link', { name: 'Sample Product' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sample Laptop' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Laptops' }));
    expect(screen.getByRole('link', { name: 'Sample Laptop' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Sample Product' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tất cả (2)' }));
    expect(screen.getByRole('link', { name: 'Sample Product' })).toBeTruthy();
  });

  it('shows an error and retries both requests', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response(shop))
      .mockResolvedValueOnce(response({ items: [product], page: 1, pageSize: 12, totalItems: 1, totalPages: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    renderShop();

    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('heading', { name: 'Sample Shop' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('shows a not-found state if the shop endpoint returns an invalid response', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ id: 'invalid', name: 'Bad response' })));
    renderShop();

    expect(await screen.findByRole('heading', { name: 'Không thể tải thông tin cửa hàng' })).toBeTruthy();
  });
});
