// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { App } from './App';

const product = {
  id: 1,
  slug: 'sample-product-01',
  name: 'Sample Product',
  brand: 'Example',
  category: { id: 2, slug: 'phones', name: 'Phones' },
  images: [],
  description: 'A sample product',
  rating: 4.5,
  reviewCount: 10,
  offerSummary: { minPrice: 1200000, maxPrice: 1500000, offerCount: 2 },
  specifications: [],
};
const offer = {
  id: 11,
  productId: 1,
  shop: { id: 3, slug: 'shop', name: 'Sample Shop', logoUrl: 'SS', rating: 4.7, status: 'active' },
  price: 1300000,
  finalPrice: 1250000,
  availability: 'in_stock',
  status: 'active',
  updatedAt: '2026-10-19T10:00:00.000Z',
};

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) } as Response);
}

function renderAtProductRoute() {
  return render(<LanguageProvider><MemoryRouter initialEntries={['/product/sample-product-01']}><App /></MemoryRouter></LanguageProvider>);
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Product detail API route', () => {
  it('resolves the requested slug and loads offers and history using the numeric product ID', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(product))
      .mockResolvedValueOnce(response({ items: [offer] }))
      .mockResolvedValueOnce(response({ items: [{ date: '2026-10-18', price: 1200000 }] }));
    vi.stubGlobal('fetch', fetchMock);

    renderAtProductRoute();
    expect(screen.getByRole('status').textContent).toContain('Đang tải');
    expect(await screen.findByRole('heading', { name: 'Sample Product' })).toBeTruthy();
    expect(screen.getByText('Sample Shop')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Biểu đồ lịch sử giá' })).toBeTruthy();
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api-compareshop-dev.giamha.online/api/v1/products/sample-product-01');
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api-compareshop-dev.giamha.online/api/v1/products/1/offers');
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://api-compareshop-dev.giamha.online/api/v1/products/1/price-history');
  });

  it('keeps the detail route and renders empty offer and history states', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(product))
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(response({ items: [] })));

    renderAtProductRoute();
    expect(await screen.findByRole('heading', { name: 'Sample Product' })).toBeTruthy();
    expect(screen.getByText('Chưa có giá từ cửa hàng')).toBeTruthy();
    expect(screen.getByText('Chưa có dữ liệu lịch sử giá.')).toBeTruthy();
    expect(screen.queryByText('Không thể tải thông tin sản phẩm')).toBeNull();
  });

  it('shows an error and retries the slug lookup and dependent data requests', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({}, false))
      .mockResolvedValueOnce(response(product))
      .mockResolvedValueOnce(response({ items: [offer] }))
      .mockResolvedValueOnce(response({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);

    renderAtProductRoute();
    const retry = await screen.findByRole('button', { name: 'Thử lại' });
    expect(screen.getByRole('alert').textContent).toContain('Không thể tải thông tin sản phẩm');
    fireEvent.click(retry);
    expect(await screen.findByRole('heading', { name: 'Sample Product' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
