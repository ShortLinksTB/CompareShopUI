// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ShopPage } from './ShopPage';

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
    expect(screen.getByRole('link', { name: 'Sample Product' }).getAttribute('href')).toBe('/product/sample-product');
    expect(screen.getByText((_content, element) => element?.className === 'price' && element.textContent?.includes('1.200.000') === true)).toBeTruthy();
    expect(screen.queryByText(/★|đánh giá|1\.2K/)).toBeNull();
    expect(fetchMock).toHaveBeenNthCalledWith(1, `${api}/shops/sample-shop`);
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${api}/products?shopId=24&page=1&pageSize=12`);
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
