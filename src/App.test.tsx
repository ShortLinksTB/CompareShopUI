// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { App } from './App';
import { LanguageProvider } from './i18n';
import { ProductDetailPage } from './ProductDetailPage';
import stylesheet from './styles.css?inline';

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
    .mockResolvedValueOnce(response({ items: [], page: 1, pageSize: 1, totalItems: 42, totalPages: 42 }))
    .mockResolvedValueOnce(response({ items: [] })));
  renderApp();

  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('So sánh giá');
  fireEvent.click(screen.getAllByRole('link', { name: /Yêu thích/ })[0]);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sản phẩm yêu thích');
  expect(await screen.findByText('Chưa có sản phẩm yêu thích')).toBeTruthy();
});

describe('Wishlist API data', () => {
  it('keeps the page loading until the authenticated wishlist request resolves', async () => {
    let resolveRequest!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>(resolve => { resolveRequest = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/wishlist');

    expect(screen.getByRole('status').textContent).toBe('Đang tải sản phẩm yêu thích...');
    expect(screen.queryByText('Chưa có sản phẩm yêu thích')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/wishlist');
    resolveRequest(await response({ items: [{ productId: 12, slug: 'real-phone', name: 'Real Phone', createdAtUtc: '2026-10-19T00:00:00Z' }] }));
    expect(await screen.findByRole('link', { name: 'Real Phone' })).toBeTruthy();
    expect(screen.getByText('Giá hiện tại chưa có dữ liệu')).toBeTruthy();
    expect(screen.queryByText(/200\.000/)).toBeNull();
  });

  it('removes an item through the API and renders the empty state after success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ items: [{ productId: 12, slug: 'real-phone', name: 'Real Phone', createdAtUtc: '2026-10-19T00:00:00Z' }] }))
      .mockResolvedValueOnce(response(null));
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/wishlist');

    fireEvent.click(await screen.findByRole('button', { name: 'Xóa Real Phone' }));
    expect(await screen.findByText('Chưa có sản phẩm yêu thích')).toBeTruthy();
    expect(fetchMock).toHaveBeenLastCalledWith('https://api-compareshop-dev.giamha.online/api/v1/wishlist/12', { method: 'DELETE' });
  });

  it('shows the unauthenticated state for an unauthorized response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response));
    renderAppAt('/wishlist');

    expect(await screen.findByRole('heading', { name: 'Đăng nhập để xem sản phẩm đã lưu' })).toBeTruthy();
    const loginCta = screen.getByRole('link', { name: 'Đăng nhập' });
    expect(loginCta.getAttribute('href')).toBe('/login');
    expect(loginCta.classList.contains('wishlist-unauthenticated__cta')).toBe(true);
    const promptFlow = loginCta.parentElement;
    expect(promptFlow?.classList.contains('wishlist-unauthenticated__actions')).toBe(true);
    expect(promptFlow?.firstElementChild?.textContent).toBe('Danh sách yêu thích chỉ hiển thị cho tài khoản đã xác thực.');
    expect(stylesheet).toMatch(/\.wishlist-unauthenticated__actions\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;\s*align-items:\s*center;\s*gap:\s*24px;\s*\}/);
  });

  it('shows an error and retries the wishlist request', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/wishlist');

    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có sản phẩm yêu thích')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

it('renders product-object suggestions without crashing the search route', async () => {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/categories')) return response({ items: [] });
    if (url.includes('/search/suggestions')) return response({ items: [{ id: 3, slug: 'sample-product-03', name: 'Sample Product 03' }, { id: 4, name: 42 }, null] });
    return response({ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 });
  });
  vi.stubGlobal('fetch', fetchMock);
  const { container } = renderAppAt('/search');

  fireEvent.change(screen.getByRole('textbox', { name: 'Tìm sản phẩm, thương hiệu...' }), { target: { value: 'Sample Product 03' } });
  expect(await screen.findByRole('option', { name: 'Sample Product 03' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Tất cả sản phẩm' })).toBeTruthy();
  expect(container.textContent).toContain('Tất cả sản phẩm');
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
    expect(await screen.findByText('Chọn laptop phù hợp')).toBeTruthy();
    expect(document.querySelector('.article-card a')).toBeNull();
  });

  it('renders API article fields without sending API slugs to the fixture-backed detail route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(articlePage)));
    renderBlog();

    expect(await screen.findByText('Chọn laptop phù hợp')).toBeTruthy();
    expect(document.querySelector('.article-card')).toBeTruthy();
    expect(document.querySelector('.article-card a')).toBeNull();
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
    expect(await screen.findByText('Chọn laptop phù hợp')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

const catalogPage = {
  items: [{ id: 17, slug: 'api-phone', name: 'API Phone', brand: 'Real Brand', category: { id: 42, slug: 'phones', name: 'Phones' }, offerSummary: { minPrice: 1200000, maxPrice: 1600000, offerCount: 3 } }],
  page: 1, pageSize: 12, totalItems: 1, totalPages: 1,
};

describe('Search and Category API data', () => {
  it('adds a product to the authenticated wishlist through the API heart action', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 42, slug: 'phones', name: 'Phones' }] });
      if (url.endsWith('/wishlist') && !init) return response({ items: [] });
      if (url.endsWith('/wishlist') && init?.method === 'POST') return response(null);
      if (url.endsWith('/wishlist/17') && init?.method === 'DELETE') return response(null);
      return response(catalogPage);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/category/phones');

    const addButton = await screen.findByRole('button', { name: 'Thêm vào yêu thích' });
    await waitFor(() => expect(addButton.hasAttribute('disabled')).toBe(false));
    fireEvent.click(addButton);
    expect(await screen.findByRole('button', { name: 'Bỏ khỏi yêu thích' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/wishlist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: 17, operation: 'add' }),
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Bỏ khỏi yêu thích' }));
    expect(await screen.findByRole('button', { name: 'Thêm vào yêu thích' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/wishlist/17', { method: 'DELETE' });
    expect(localStorage.getItem('wishlist-products')).toBeNull();
  });

  it('rolls back the optimistic heart state when a wishlist update fails', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 42, slug: 'phones', name: 'Phones' }] });
      if (url.endsWith('/wishlist') && !init) return response({ items: [] });
      if (url.endsWith('/wishlist') && init?.method === 'POST') return Promise.reject(new Error('offline'));
      return response(catalogPage);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/category/phones');

    fireEvent.click(await screen.findByRole('button', { name: 'Thêm vào yêu thích' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Thêm vào yêu thích' })).toBeTruthy();
  });

  it('prompts unauthenticated users to log in when saving a product is unauthorized', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 42, slug: 'phones', name: 'Phones' }] });
      if (url.endsWith('/wishlist') && !init) return response({ items: [] });
      if (url.endsWith('/wishlist') && init?.method === 'POST') return Promise.resolve({ ok: false, status: 401 } as Response);
      return response(catalogPage);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/category/phones');

    fireEvent.click(await screen.findByRole('button', { name: 'Thêm vào yêu thích' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Đăng nhập để lưu sản phẩm yêu thích.');
    expect(screen.getByRole('link', { name: 'Đăng nhập' }).getAttribute('href')).toBe('/login');
    expect(await screen.findByRole('button', { name: 'Thêm vào yêu thích' })).toBeTruthy();
  });

  it('resolves a category slug to its numeric ID before requesting its products', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 42, slug: 'phones', name: 'Phones' }] });
      return response(catalogPage);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/category/phones');

    expect(await screen.findByRole('link', { name: 'API Phone' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/categories');
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/products?page=1&pageSize=12&categoryId=42');
    expect(screen.getByText('Real Brand')).toBeTruthy();
    expect(screen.queryByText(/★/)).toBeNull();
  });

  it('searches by query and sends price filters and page to the catalog API', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => String(input).endsWith('/categories') ? response({ items: [] }) : response(catalogPage));
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/search?q=phone');

    expect(await screen.findByRole('link', { name: 'API Phone' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/products?page=1&pageSize=12&search=phone');
    fireEvent.click(screen.getByLabelText('Dưới 10 triệu'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/products?page=1&pageSize=12&search=phone&maxPrice=10000000'));
  });

  it('keeps unknown category slugs empty without querying products', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ items: [{ id: 42, slug: 'phones', name: 'Phones' }] }));
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/category/not-a-category');

    expect(await screen.findByText('Không tìm thấy danh mục')).toBeTruthy();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain('https://api-compareshop-dev.giamha.online/api/v1/products?page=1&pageSize=12');
  });

  it('shows retry after a catalog error and requests API suggestions from header search', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [] });
      if (url.includes('/search/suggestions')) return response({ items: ['phone suggestion'] });
      return response({}, false);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/search');
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm sản phẩm, thương hiệu...' }), { target: { value: 'phone' } });
    expect(await screen.findByRole('option', { name: 'phone suggestion' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/search/suggestions?q=phone&limit=5');
    expect(await screen.findByRole('alert')).toBeTruthy();
    fetchMock.mockImplementation((input: RequestInfo | URL) => String(input).endsWith('/categories') ? response({ items: [] }) : response(catalogPage));
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('link', { name: 'API Phone' })).toBeTruthy();
  });
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
  it.each(['light', 'dark'] as const)('applies Product Detail shell for direct navigation in %s theme', async theme => {
    setColorScheme(theme);
    vi.stubGlobal('fetch', detailFetch());

    renderAppAt('/product/sample-product-01');
    expect(await screen.findByRole('heading', { name: 'Sample Product 01' })).toBeTruthy();
    expect(document.querySelector('.product-shell')).toBeTruthy();
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(theme === 'dark');
    expect(screen.getByText('Ảnh chưa có')).toBeTruthy();
    expect(screen.getByText('Giá có thể thay đổi theo từng cửa hàng. Hãy kiểm tra lại giá cuối cùng trước khi mua.')).toBeTruthy();
  });

  it.each(['light', 'dark'] as const)('preserves Product Detail shell after opening a Home product link in %s theme', async theme => {
    setColorScheme(theme);
    const product = { id: 5, slug: 'sample-product-01', name: 'Sample Product 01', brand: 'Example', category: { id: 7, slug: 'phones', name: 'Phones' }, offerSummary: { minPrice: 1200000, maxPrice: 1500000, offerCount: 1 } };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 7, slug: 'phones', name: 'Phones' }] });
      if (url.includes('/products?categoryId=7')) return response({ items: [product], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
      if (url.includes('/products?page=1&pageSize=10')) return response({ items: [product], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
      if (url.endsWith('/products/sample-product-01')) return response(detail);
      if (url.endsWith('/products/1/offers')) return response({ items: [] });
      if (url.includes('/products/1/price-history')) return response({ items: [] });
      return response({ items: [] });
    }));

    renderAppAt('/');
    expect(document.querySelector('.home-shell')).toBeTruthy();
    fireEvent.click(await screen.findByRole('link', { name: 'Sample Product 01' }));
    expect(await screen.findByRole('heading', { name: 'Sample Product 01' })).toBeTruthy();
    expect(document.querySelector('.product-shell')).toBeTruthy();
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(theme === 'dark');
  });

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

  it('ignores a late response after navigating to a different product slug', async () => {
    let resolveFirst: ((value: Response) => void) | undefined;
    const otherProduct = { ...detail, id: 2, slug: 'other-product', name: 'Other Product' };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/products/sample-product-01')) return new Promise<Response>(resolve => { resolveFirst = resolve; });
      if (url.endsWith('/products/other-product')) return response(otherProduct);
      if (url.endsWith('/products/2/offers') || url.includes('/products/2/price-history')) return response({ items: [] });
      if (url.includes('/products?categoryId=7')) return response({ items: [] });
      return response({}, false);
    }));
    render(<LanguageProvider><MemoryRouter initialEntries={['/product/sample-product-01']}><Link to="/product/other-product">Open other product</Link><Routes><Route path="/product/:slug" element={<ProductDetailPage />} /></Routes></MemoryRouter></LanguageProvider>);

    fireEvent.click(screen.getByRole('link', { name: 'Open other product' }));
    expect(await screen.findByRole('heading', { name: 'Other Product' })).toBeTruthy();
    resolveFirst?.(await response(detail));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Other Product' })).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'Sample Product 01' })).toBeNull();
  });
});
