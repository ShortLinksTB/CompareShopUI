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

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) } as Response);
}

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

describe('Home API data', () => {
  it('loads categories and products from the catalog endpoints and renders API fields', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(categories))
      .mockResolvedValueOnce(response(products));
    vi.stubGlobal('fetch', fetchMock);
    renderApp();

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect((await screen.findAllByRole('link', { name: 'Phones' })).some(link => link.getAttribute('href') === '/category/phones')).toBe(true);
    expect(await screen.findByRole('link', { name: 'Sample Phone' })).toBeTruthy();
    expect(screen.getByText(/Từ 1\.200\.000/)).toBeTruthy();
    expect(screen.getByText('2 cửa hàng đang bán')).toBeTruthy();
    expect(screen.queryByText(/★/)).toBeNull();
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api-compareshop-dev.giamha.online/api/v1/categories');
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api-compareshop-dev.giamha.online/api/v1/products?page=1&pageSize=10');
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
      .mockResolvedValueOnce(response(products))
      .mockResolvedValueOnce(response(categories))
      .mockResolvedValueOnce(response(products));
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
    .mockResolvedValueOnce(response(products)));
  renderApp();

  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('So sánh giá');
  fireEvent.click(screen.getAllByRole('link', { name: /Yêu thích/ })[0]);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sản phẩm yêu thích');
  expect(screen.getByText('Chưa có sản phẩm yêu thích')).toBeTruthy();
});
