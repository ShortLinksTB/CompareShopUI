// @vitest-environment jsdom
/// <reference types="vite/client" />
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ComparePage } from './ComparePage';
import stylesheet from './styles.css?inline';

const product = (slug: string, name: string) => ({
  id: slug.length, slug, name, brand: null, description: null,
  category: { id: 1, slug: 'electronics', name: 'Điện tử' },
  offerSummary: { minPrice: 1200000, maxPrice: 1500000, offerCount: 2 },
  specificationGroups: [{ name: 'Cấu hình', items: [{ name: 'Dung lượng', value: '128 GB' }] }],
});
const response = (body: unknown, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) } as Response);
const renderPage = () => render(<MemoryRouter><ComparePage /></MemoryRouter>);

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

describe('Compare page', () => {
  it('loads each saved slug separately and renders only API product fields', async () => {
    localStorage.setItem('compare-products', JSON.stringify(['phone-one', 'phone-two']));
    const fetchMock = vi.fn((input: string) => input.endsWith('/products?page=1&pageSize=20')
      ? response({ items: [{ slug: 'candidate', name: 'Candidate' }] })
      : response(product(input.split('/').at(-1)!, `Product ${input.split('/').at(-1)}`)));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(screen.getByRole('status').textContent).toContain('Đang tải');
    expect(await screen.findByText('Product phone-one')).toBeTruthy();
    expect(screen.getByText('Product phone-two')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/products/phone-one');
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/products?page=1&pageSize=20');
    expect(screen.getAllByText(/1\.200\.000/)).toHaveLength(2);
    expect(screen.getAllByText('Dung lượng: 128 GB')).toHaveLength(2);
    expect(screen.getAllByText('Chưa có thương hiệu')).toHaveLength(2);
    expect(screen.queryByText(/★|đánh giá/)).toBeNull();
  });

  it('handles no saved products without making a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    expect(await screen.findByText('Chưa có sản phẩm để so sánh')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Khám phá sản phẩm' }).classList.contains('compare-empty-state__cta')).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/products?page=1&pageSize=20');
  });

  it('keeps the empty-state CTA in its own block below the description', () => {
    expect(stylesheet).toMatch(/\.compare-empty-state__cta\s*\{\s*display:\s*block;\s*width:\s*fit-content;\s*margin:\s*16px auto 0;\s*\}/);
  });

  it('adds extra separation to the Compare empty-state CTA on mobile', () => {
    expect(stylesheet).toMatch(/@media\s*\(max-width:\s*639px\)\s*\{\.compare-empty-state__cta\s*\{margin-top:\s*32px\}\}/);
  });

  it('handles malformed saved data without crashing', async () => {
    localStorage.setItem('compare-products', '{invalid');
    vi.stubGlobal('fetch', vi.fn());
    renderPage();
    expect(await screen.findByText('Chưa có sản phẩm để so sánh')).toBeTruthy();
  });

  it('shows retry when the API product selector fails', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const retry = await screen.findByRole('button', { name: 'Thử lại' });
    fireEvent.click(retry);
    expect(await screen.findByText('Chưa có sản phẩm để so sánh')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows API failures and retries saved product lookups', async () => {
    localStorage.setItem('compare-products', JSON.stringify(['phone-one']));
    let detailCalls = 0;
    const fetchMock = vi.fn((input: string) => {
      if (input.endsWith('/products?page=1&pageSize=20')) return response({ items: [] });
      detailCalls += 1;
      return detailCalls === 1 ? response({}, false) : response(product('phone-one', 'Retry Product'));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Retry Product')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('removes a product from the table and saved slug list', async () => {
    localStorage.setItem('compare-products', JSON.stringify(['phone-one']));
    vi.stubGlobal('fetch', vi.fn((input: string) => input.endsWith('/products?page=1&pageSize=20')
      ? response({ items: [] })
      : response(product('phone-one', 'Removable Product'))));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa Removable Product' }));
    expect(localStorage.getItem('compare-products')).toBe('[]');
    expect(await screen.findByText('Chưa có sản phẩm để so sánh')).toBeTruthy();
  });
});
