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

afterEach(() => { cleanup(); localStorage.clear(); window.history.replaceState({}, '', '/'); vi.unstubAllGlobals(); });

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

const articlePage = {
  items: [{
    slug: 'buying-a-laptop',
    title: 'Chọn laptop phù hợp',
    excerpt: 'Một số kinh nghiệm chọn laptop.',
    coverImageUrl: 'https://cdn.example.test/laptop.jpg',
    authorName: 'GiaTot Editorial',
    readingMinutes: 6,
    publishedAtUtc: '2025-03-04T00:00:00Z',
  }],
  page: 1,
  pageSize: 10,
  totalItems: 1,
  totalPages: 1,
};

function renderBlog() {
  window.history.pushState({}, '', '/blog');
  return renderApp();
}

describe('Blog Listing API data', () => {
  it('shows loading state until the Articles API resolves', async () => {
    let resolveRequest!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>(resolve => { resolveRequest = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    renderBlog();

    expect(screen.getByRole('status').textContent).toBe('Đang tải bài viết...');
    expect(screen.queryByRole('link', { name: /Chọn laptop phù hợp/ })).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/articles?page=1&pageSize=10');
    resolveRequest(await response(articlePage));
    expect(await screen.findByRole('link', { name: /Chọn laptop phù hợp/ })).toBeTruthy();
  });

  it('renders API article fields and links by the API slug', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(articlePage)));
    renderBlog();

    const article = await screen.findByRole('link', { name: /Chọn laptop phù hợp/ });
    expect(article.getAttribute('href')).toBe('/blog/buying-a-laptop');
    expect(screen.getByText('Một số kinh nghiệm chọn laptop.')).toBeTruthy();
    expect(document.querySelector('.article-card small')?.textContent).toBe('04/03/2025 · 6 phút đọc');
    expect(screen.queryByText(/2024/)).toBeNull();
    fireEvent.error(screen.getByRole('img', { name: 'Chọn laptop phù hợp' }));
    expect(screen.getByText('Chưa có hình ảnh')).toBeTruthy();
  });

  it('renders the empty state without static sample cards for an empty page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ...articlePage, items: [], totalItems: 0, totalPages: 0 }));
    vi.stubGlobal('fetch', fetchMock);
    renderBlog();

    expect(await screen.findByText('Chưa có bài viết')).toBeTruthy();
    expect(document.querySelector('.article-card')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/articles?page=1&pageSize=10');
  });

  it('uses a neutral image fallback when an API article has no cover', async () => {
    const articleWithoutCover = { ...articlePage, items: [{ ...articlePage.items[0], coverImageUrl: null }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(articleWithoutCover)));
    renderBlog();

    expect(await screen.findByRole('img', { name: 'Chọn laptop phù hợp' })).toBeTruthy();
    expect(screen.getByText('Chưa có hình ảnh')).toBeTruthy();
    expect(document.querySelector('.article-card img')).toBeNull();
  });

  it('shows an error and retries the Articles API request', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response(articlePage));
    vi.stubGlobal('fetch', fetchMock);
    renderBlog();

    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('link', { name: /Chọn laptop phù hợp/ })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
