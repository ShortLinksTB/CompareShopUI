// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { LanguageProvider } from './i18n';

const categories = { items: [{ id: 1, slug: 'phones', name: 'Phones' }] };
const products = {
  items: [{ id: 5, slug: 'sample-phone', name: 'Sample Phone', brand: 'Example', category: { id: 1, slug: 'phones', name: 'Phones' }, offerSummary: { minPrice: 1200000, maxPrice: 1500000, offerCount: 2 } }],
  page: 1, pageSize: 10, totalItems: 1, totalPages: 1,
};

function renderApp() {
  return render(<LanguageProvider><BrowserRouter><App /></BrowserRouter></LanguageProvider>);
}

function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  return renderApp();
}

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) } as Response);
}

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

describe('Home API data', () => {
  it('loads categories and products from the catalog endpoints and renders API fields', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(categories))
      .mockResolvedValueOnce(response(products))
      .mockResolvedValueOnce(response({ items: [], page: 1, pageSize: 1, totalItems: 42, totalPages: 42 }));
    vi.stubGlobal('fetch', fetchMock);
    renderApp();

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect((await screen.findAllByRole('link', { name: 'Phones' })).some(link => link.getAttribute('href') === '/category/phones')).toBe(true);
    expect(await screen.findByRole('link', { name: 'Sample Phone' })).toBeTruthy();
    expect(screen.getByText('42 sản phẩm')).toBeTruthy();
    expect(screen.getByText(/Từ 1\.200\.000/)).toBeTruthy();
    expect(screen.getByText('2 cửa hàng đang bán')).toBeTruthy();
    expect(screen.getByText('Chưa có hình ảnh')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Chưa có hình ảnh' })).toBeTruthy();
    expect(screen.queryByText('Apple')).toBeNull();
    expect(screen.queryByText(/★/)).toBeNull();
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api-compareshop-dev.giamha.online/api/v1/categories');
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api-compareshop-dev.giamha.online/api/v1/products?page=1&pageSize=10');
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://api-compareshop-dev.giamha.online/api/v1/products?categoryId=1&page=1&pageSize=1');
  });

  it('shows empty states when both API collections are empty', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(response({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 })));
    renderApp();

    expect(await screen.findByText('Chưa có danh mục')).toBeTruthy();
    expect(screen.getByText('Chưa có sản phẩm nổi bật')).toBeTruthy();
  });

  it('shows an error and retries both requests', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response(categories))
      .mockResolvedValueOnce(response(products))
      .mockResolvedValueOnce(response({ items: [], page: 1, pageSize: 1, totalItems: 42, totalPages: 42 }));
    vi.stubGlobal('fetch', fetchMock);
    renderApp();

    const retry = await screen.findByRole('button', { name: 'Thử lại' });
    expect(screen.getByRole('alert').textContent).toContain('Không thể tải dữ liệu trang chủ');
    fireEvent.click(retry);
    expect((await screen.findAllByRole('link', { name: 'Phones' })).some(link => link.getAttribute('href') === '/category/phones')).toBe(true);
    expect(await screen.findByRole('link', { name: 'Sample Phone' })).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  });
});


it('renders the storefront and opens the saved products page', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(response(categories))
    .mockResolvedValueOnce(response(products))
    .mockResolvedValueOnce(response({ items: [], page: 1, pageSize: 1, totalItems: 42, totalPages: 42 })));
  renderApp();

  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('So sánh giá');
  fireEvent.click(screen.getAllByRole('link', { name: /Yêu thích/ })[0]);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sản phẩm yêu thích');
  expect(screen.getByText('Chưa có sản phẩm yêu thích')).toBeTruthy();
});

const detail = {
  id: 1,
  slug: 'sample-product-01',
  name: 'Sample Product 01',
  brand: 'Example',
  description: 'A product from the catalog API.',
  category: { id: 7, slug: 'phones', name: 'Phones' },
  offerSummary: { minPrice: 1200000, maxPrice: 1500000, offerCount: 1 },
  specificationGroups: [{ name: 'Main', items: [{ name: 'Storage', value: '128 GB' }] }],
};

function detailFetch({ offers = [{ id: 9, price: 1200000, url: null, updatedAt: '2026-10-19T08:00:00Z', shopId: 2, shopSlug: 'shop-two', shopName: 'Shop Two' }], history = [{ date: '2026-09-01T00:00:00Z', minPrice: 1300000, shopId: 2 }], related = [] } = {}) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/products/sample-product-01')) return response(detail);
    if (url.endsWith('/products/1/offers')) return response({ items: offers });
    if (url.includes('/products/1/price-history')) return response({ items: history });
    if (url.includes('/products?categoryId=7')) return response({ items: related });
    return response({}, false);
  });
}

describe('Product Detail API data', () => {
  it('opens the API product selected from the Home product link', async () => {
    const product = { id: 5, slug: 'sample-product-01', name: 'Sample Product 01', brand: 'Example', category: { id: 7, slug: 'phones', name: 'Phones' }, offerSummary: { minPrice: 1200000, maxPrice: 1500000, offerCount: 1 } };
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 7, slug: 'phones', name: 'Phones' }] });
      if (url.includes('/products?categoryId=7')) return response({ items: [product], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
      if (url.includes('/products?page=1&pageSize=10')) return response({ items: [product], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
      if (url.endsWith('/products/sample-product-01')) return response(detail);
      if (url.endsWith('/products/1/offers')) return response({ items: [] });
      if (url.includes('/products/1/price-history')) return response({ items: [] });
      return response({ items: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/');

    fireEvent.click(await screen.findByRole('link', { name: 'Sample Product 01' }));
    expect(await screen.findByRole('heading', { name: 'Sample Product 01' })).toBeTruthy();
    expect(window.location.pathname).toBe('/product/sample-product-01');
  });

  it('loads a valid slug directly and requests detail, offers, history, and related products', async () => {
    const fetchMock = detailFetch();
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/product/sample-product-01');

    expect(await screen.findByRole('heading', { name: 'Sample Product 01' })).toBeTruthy();
    expect(screen.getAllByText(/1\.200\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText('Shop Two')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Xem ngay ↗' }).getAttribute('href')).toBe('https://api-compareshop-dev.giamha.online/api/v1/go/9');
    expect(screen.getByText('Storage')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/products/sample-product-01');
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/products/1/offers');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/products/1/price-history?from='))).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/products?categoryId=7&page=1&pageSize=5');
    expect(screen.getByRole('img', { name: 'Biểu đồ lịch sử giá' })).toBeTruthy();
  });

  it('shows empty offers and price history from empty API responses', async () => {
    vi.stubGlobal('fetch', detailFetch({ offers: [], history: [] }));
    renderAppAt('/product/sample-product-01');

    expect(await screen.findByText('Chưa có cửa hàng niêm yết giá')).toBeTruthy();
    expect(screen.getByText('Chưa có dữ liệu lịch sử giá.')).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Biểu đồ lịch sử giá' })).toBeNull();
  });

  it('keeps a loading state, reports request errors, and retries', async () => {
    let resolveDetail: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input).endsWith('/products/sample-product-01') && !resolveDetail) {
        return new Promise<Response>(resolve => { resolveDetail = resolve; });
      }
      if (String(input).endsWith('/products/sample-product-01')) return response(detail);
      if (String(input).endsWith('/products/1/offers')) return response({ items: [] });
      if (String(input).includes('/products/1/price-history')) return response({ items: [] });
      return response({ items: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/product/sample-product-01');
    expect(screen.getByRole('status').textContent).toContain('Đang tải');
    void response(detail).then(result => resolveDetail?.(result));
    expect(await screen.findByText('Chưa có cửa hàng niêm yết giá')).toBeTruthy();

    const failingFetch = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', failingFetch);
    window.history.pushState({}, '', '/product/sample-product-01');
    cleanup();
    renderAppAt('/product/sample-product-01');
    const retry = await screen.findByRole('button', { name: 'Thử lại' });
    expect(screen.getByRole('alert').textContent).toContain('Không thể tải');
    vi.stubGlobal('fetch', detailFetch({ offers: [], history: [] }));
    fireEvent.click(retry);
    expect(await screen.findByText('Chưa có cửa hàng niêm yết giá')).toBeTruthy();
  });
});
