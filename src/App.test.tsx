// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { App } from './App';
import { LanguageProvider } from './i18n';
import { CountryProvider } from './country';
import { AuthSessionProvider, type AuthSessionValue } from './auth/AuthSession';
import { ProductDetailPage } from './ProductDetailPage';
import stylesheet from './styles.css?inline';

const authMock = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(),
  clear: vi.fn<() => Promise<void>>(),
  signIn: vi.fn<(_: unknown) => Promise<void>>(),
}));
vi.mock('./auth/authClient', () => ({
  getAuthenticatedAccessToken: authMock.getToken,
  clearAuthenticatedSession: authMock.clear,
  startSignIn: authMock.signIn,
  completeSignInCallback: vi.fn(() => Promise.reject(new Error('callback failed'))),
  getPendingReturnPath: vi.fn(() => '/wishlist'),
}));

const categories = { items: [{ id: 1, slug: 'phones', name: 'Phones' }] };
const products = {
  items: [{ id: 5, slug: 'sample-phone', name: 'Sample Phone', brand: 'Example', category: { id: 1, slug: 'phones', name: 'Phones' }, offerSummary: { minPrice: 1200000, maxPrice: 1500000, offerCount: 2 } }],
  page: 1, pageSize: 10, totalItems: 1, totalPages: 1,
};

function renderApp(status: AuthSessionValue['status'] = window.location.pathname === '/account' ? 'authenticated' : 'anonymous') {
  const authSession: AuthSessionValue = { status, user: status === 'authenticated' ? { id: 'test-user', displayName: 'Trần Minh Quân', email: 'quanquan@example.test' } : null, getAccessToken: authMock.getToken, signIn: authMock.signIn, signOut: vi.fn() };
  return render(<CountryProvider><LanguageProvider><AuthSessionProvider value={authSession}><BrowserRouter><App /></BrowserRouter></AuthSessionProvider></LanguageProvider></CountryProvider>);
}

function renderAppAt(path: string, status?: AuthSessionValue['status']) {
  window.history.pushState({}, '', path);
  return renderApp(status);
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

function shellColorScheme(shellClass: string) {
  const rule = stylesheet.match(new RegExp(`\\.${shellClass}[^\\{]*\\{[^}]*color-scheme:\\s*(light|dark)`));
  return rule?.[1];
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    const rgb = color.match(/[\d.]+/g)?.map(Number);
    const channels = rgb?.length === 3 ? rgb : color.match(/[a-f\d]{2}/gi)?.map(channel => parseInt(channel, 16));
    const linear = (channels ?? []).map(channel => {
      const normalized = channel > 1 ? channel / 255 : channel;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function response(body: unknown, ok = true, status = ok ? 200 : 500) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) } as Response);
}

function cleanupTestEnvironment() {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  authMock.getToken.mockReset().mockResolvedValue(null);
  authMock.clear.mockReset().mockResolvedValue();
  authMock.signIn.mockReset().mockResolvedValue();
  localStorage.clear();
  document.title = 'GiaTot - So sánh giá thông minh';
  window.history.replaceState({}, '', '/');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
  vi.unstubAllGlobals();
}

afterEach(cleanupTestEnvironment);

describe('homepage document title localization', () => {
  it('updates the application title for English and restores Vietnamese when selected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [] })));
    renderAppAt('/');

    await waitFor(() => expect(document.title).toBe('GiaTot - So sánh giá thông minh'));
    fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
    fireEvent.click(screen.getByRole('option', { name: 'EN — English' }));
    await waitFor(() => expect(document.title).toBe('GiaTot - Smart Price Comparison'));
    expect(document.documentElement.lang).toBe('en');

    fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
    fireEvent.click(screen.getByRole('option', { name: 'VI — Tiếng Việt' }));
    await waitFor(() => expect(document.title).toBe('GiaTot - So sánh giá thông minh'));
    expect(document.documentElement.lang).toBe('vi');
  });

  it('restores the shared English application title when navigating away from the blog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [] })));
    renderAppAt('/blog');

    fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
    fireEvent.click(screen.getByRole('option', { name: 'EN — English' }));
    await waitFor(() => expect(document.title).toBe('GiaTot - Smart Price Comparison'));

    fireEvent.click(screen.getAllByRole('link', { name: 'Home' })[0]);
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
      expect(document.title).toBe('GiaTot - Smart Price Comparison');
    });
  });
});

describe('browser storage failures', () => {
  it('keeps language selection usable when storage reads and writes throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('read blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('write blocked'); });
    vi.stubGlobal('navigator', { languages: ['id-ID'], language: 'id-ID' });

    renderAppAt('/');

    expect(screen.queryByRole('combobox', { name: 'Country' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Change language' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('vi');
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
    fireEvent.click(screen.getByRole('option', { name: 'EN — English' }));
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('button', { name: 'Change language' }).textContent).toContain('EN');
  });

  it('keeps the stored country preference untouched by language selection', () => {
    localStorage.setItem('compareshop.country', 'VN');
    localStorage.setItem('giatot-language', 'en');
    renderAppAt('/');

    expect(screen.queryByRole('combobox', { name: 'Country' })).toBeNull();
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('button', { name: 'Change language' }).textContent).toContain('EN');
    fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
    fireEvent.click(screen.getByRole('option', { name: 'ID — Bahasa Indonesia' }));
    expect(document.documentElement.lang).toBe('id');
    expect(localStorage.getItem('compareshop.country')).toBe('VN');
    expect(localStorage.getItem('giatot-language')).toBe('id');
  });

  it('renders the approved header actions in order and selects English through the language provider', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [] })));
    renderAppAt('/');

    const actions = screen.getByRole('navigation', { name: 'Header actions' });
    const controls = Array.from(actions.children);
    expect(controls[0].textContent).toContain('Yêu thích');
    expect(controls[0].querySelector('svg')).toBeTruthy();
    expect(controls[1].textContent).toContain('Tài khoản');
    expect(controls[1].querySelector('svg')).toBeTruthy();
    expect((controls[0] as HTMLAnchorElement).getAttribute('href')).toBe('/wishlist');
    expect((controls[1] as HTMLAnchorElement).getAttribute('href')).toBe('/account');
    expect(controls[2].className).toContain('header-actions-divider');
    expect(controls[3].querySelector('[aria-label="Country"]')).toBeNull();
    const languageControl = actions.querySelector('.header-language-control');
    expect(languageControl).toBeTruthy();
    expect(languageControl?.querySelector('button[aria-label="Change language"]')).toBeTruthy();
    expect(languageControl?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
    expect(screen.getByRole('listbox', { name: 'Choose language' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'VI — Tiếng Việt' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('VN')).toBeTruthy();
    expect(screen.getByText('EN')).toBeTruthy();
    expect(screen.getByText('ID')).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: 'EN — English' }));
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('link', { name: 'Wishlist' })).toBeTruthy();
    expect(localStorage.getItem('giatot-language')).toBe('en');
    expect(screen.queryByRole('listbox', { name: 'Choose language' })).toBeNull();
  });

  it('closes the language selector with Escape or an outside click without changing the selection', () => {
    renderAppAt('/');
    const trigger = screen.getByRole('button', { name: 'Change language' });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: 'Choose language' })).toBeNull();
    expect(trigger.textContent).toContain('VI');

    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox', { name: 'Choose language' })).toBeNull();
    expect(localStorage.getItem('giatot-language')).toBeNull();
  });

  it('marks only the matching top navigation route and uses the approved search placeholder', () => {
    const cases = [
      ['/', 'Trang chủ'],
      ['/category/phone', 'Danh mục'],
      ['/search', 'Sản phẩm nổi bật'],
      ['/blog', 'Blog'],
    ];
    for (const [path, activeLabel] of cases) {
      cleanup();
      renderAppAt(path);
      const nav = document.querySelector('.desktop-nav') as HTMLElement;
      expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
      expect(nav.querySelector('[aria-current="page"]')?.textContent).toContain(activeLabel);
      expect(screen.getByPlaceholderText('Tìm sản phẩm, thương hiệu, mã SKU…')).toBeTruthy();
    }
    cleanup();
    renderAppAt('/compare');
    expect(document.querySelector('.desktop-nav')?.querySelector('[aria-current="page"]')).toBeNull();
  });

  it('shows the search suggestion error in English when English is selected', async () => {
    localStorage.setItem('giatot-language', 'en');
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => String(input).includes('/search/suggestions?')
      ? Promise.reject(new Error('offline'))
      : response({ items: [] })));
    renderAppAt('/');

    fireEvent.change(screen.getByRole('textbox', { name: 'Search products, brands...' }), { target: { value: 'phone' } });

    expect(await screen.findByText('Search suggestions are currently unavailable.')).toBeTruthy();
    expect(screen.queryByText('Gợi ý tìm kiếm hiện không khả dụng.')).toBeNull();
  });

  it('collapses desktop navigation at 1024px and styles the action controls consistently', () => {
    expect(stylesheet).toMatch(/@media\s*\(max-width:\s*1024px\)[\s\S]*?\.desktop-nav\s*\{\s*display:\s*none/);
    expect(stylesheet).toMatch(/\.header-links \.header-action[\s\S]*?height:\s*36px/);
    expect(stylesheet).toMatch(/\.header-links \.header-action svg[\s\S]*?fill:\s*none/);
    expect(stylesheet).toMatch(/\.language-trigger\s*\{[^}]*height:\s*36px/);
    expect(stylesheet).toMatch(/\.language-menu\s*\{[^}]*width:\s*260px/);
    expect(stylesheet).toMatch(/\.header-brand-divider\s*\{[^}]*height:\s*24px/);
    expect(stylesheet).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/);
    expect(stylesheet).toMatch(/@media\s*\(max-width:\s*639px\)[\s\S]*?\.header-links \.header-action\s*\{\s*display:\s*none/);
    expect(stylesheet).not.toMatch(/\.header-links \.header-language-control\s*\{[^}]*display:\s*none/);
  });
});

describe('fixed route themes', () => {
  it.each([
    ['/', 'home-shell', 'light'],
    ['/search', 'light-shell', 'light'],
    ['/category/phones', 'light-shell', 'light'],
    ['/product/sample-phone', 'product-shell', 'light'],
    ['/compare', 'light-shell', 'light'],
    ['/blog', 'blog-shell', 'light'],
    ['/blog/article-1', 'blog-shell', 'light'],
    ['/shops/sample-shop', 'shop-shell', 'light'],
    ['/wishlist', 'light-shell', 'light'],
    ['/login', 'light-shell', 'light'],
    ['/account', 'light-shell', 'light'],
  ] as const)('%s always uses the %s %s scheme independent of OS preference', async (path, shellClass, scheme) => {
    setColorScheme('dark');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [] })));
    renderAppAt(path);

    expect(document.querySelector(`.${shellClass}`)).toBeTruthy();
    expect(shellColorScheme(shellClass)).toBe(scheme);
    expect(stylesheet).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)[\s\S]*?\.site-header/);
    if (path === '/') {
      expect((await screen.findAllByText('Chưa có sản phẩm nổi bật')).length).toBeGreaterThan(0);
    }
  });

  it('provides visible focus indicators for the fixed light theme', () => {
    expect(stylesheet).toMatch(/\.home-shell :focus-visible\s*\{[^}]*outline:\s*3px solid #b93800;\s*outline-offset:\s*2px/);
    expect(stylesheet).toMatch(/\.light-shell :focus-visible[^\{]*\{[^}]*outline:\s*3px solid #b93800/);
    expect(contrastRatio('#b93800', '#fff8f2')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio('#b93800', '#ffffff')).toBeGreaterThanOrEqual(3);
  });

  it('keeps the dark 72px header override scoped to the home shell', () => {
    expect(stylesheet).toMatch(/\.home-shell \.site-header\s*\{[^}]*color-scheme:\s*dark[^}]*height:\s*72px[^}]*background:\s*#15171c/);
    expect(stylesheet).toMatch(/\.home-shell \.site-header \.desktop-nav a\.active\s*\{[^}]*background:\s*#ff5a00[^}]*color:\s*#fff/);
    expect(stylesheet).toContain('.home-shell .site-header .header-links .header-language-control');
    expect(stylesheet).toContain('background: #15171c;');
    expect(stylesheet).not.toMatch(/(?:^|})\s*\.site-header\s*\{[^}]*background:\s*#15171c/);
  });

  it('keeps popular category cards in a contained mobile grid', () => {
    expect(stylesheet).toMatch(/\.home-shell \.category-grid\s*\{[^}]*grid-template-columns:\s*repeat\(8,\s*minmax\(0,\s*1fr\)\)/);
    expect(stylesheet).toMatch(/@media\s*\(min-width:\s*640px\) and \(max-width:\s*980px\)[\s\S]*?\.home-shell \.category-grid\s*\{[^}]*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(stylesheet).toMatch(/@media\s*\(max-width:\s*639px\)[\s\S]*?\.home-shell \.category-grid\s*\{[^}]*display:\s*flex[^}]*overflow-x:\s*auto/);
    expect(stylesheet).toMatch(/\.home-shell \.category-card\s*\{[^}]*min-width:\s*0/);
    expect(stylesheet).toContain('.home-shell .category-icon');
    expect(stylesheet).toMatch(/\.home-shell \.category-arrow\s*\{\s*display:\s*none/);
  });

  it('keeps mobile home content clear of the bottom nav and wraps hero content', () => {
    expect(stylesheet).toMatch(/\.home-shell \.container\s*\{[^}]*padding-bottom:\s*calc\(128px \+ env\(safe-area-inset-bottom\)\)/);
    expect(stylesheet).toMatch(/\.home-shell \.hero \+ \.section\s*\{[^}]*padding-bottom:\s*calc\(88px \+ env\(safe-area-inset-bottom\)\)/);
    expect(stylesheet).toMatch(/\.home-shell \.hero \+ \.section\s*\{[^}]*padding-top:\s*8px/);
    expect(stylesheet).toMatch(/\.home-shell \.hero \+ \.section \.section-heading\s*\{[^}]*margin-bottom:\s*8px/);
    expect(stylesheet).toMatch(/\.home-shell \.hero-featured-product\s*\{[^}]*grid-template-columns:\s*38px minmax\(0,\s*1fr\) auto[^}]*min-height:\s*42px;\s*padding:\s*5px 0/);
    expect(stylesheet).toMatch(/\.bottom-nav\s*\{[^}]*position:\s*fixed/);
    expect(stylesheet).toMatch(/\.home-shell \.category-grid\s*\{[^}]*display:\s*flex[^}]*overflow-x:\s*auto/);
    expect(stylesheet).toMatch(/\.home-shell \.hero-copy > h1\s*\{[^}]*line-height:\s*1\.2/);
    expect(stylesheet).toMatch(/\.home-shell \.popular-searches > a\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(stylesheet).toMatch(/\.home-shell \.hero-featured-product\s*\{[^}]*grid-template-columns:\s*38px minmax\(0,\s*1fr\)/);
    expect(stylesheet).toMatch(/\.home-shell \.hero-featured-price\s*\{[^}]*white-space:\s*nowrap/);
  });

  it('renders Account identity without invented membership or verification claims', () => {
    const style = document.createElement('style');
    style.textContent = stylesheet;
    document.head.appendChild(style);
    try {
      renderAppAt('/account');
      expect(screen.getByText('quanquan@example.test')).toBeTruthy();
      expect(screen.queryByText('Thành viên từ tháng 09/2024')).toBeNull();
      expect(screen.queryByText('✓ Đã xác thực')).toBeNull();
      expect(screen.getByText('quanquan@example.test').closest('.light-shell')).not.toBeNull();
    } finally {
      style.remove();
    }
  });

  it('keeps shared text and control colors above WCAG AA contrast thresholds', () => {
    expect(contrastRatio('#c2410c', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#15803d', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#b45309', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#8b8b8b', '#f8f9fa')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio('#6b7280', '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('sends unknown routes to the fixed light Home route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [] })));
    renderAppAt('/not-a-real-route');

    await waitFor(() => expect(document.querySelector('.home-shell')).toBeTruthy());
    expect(window.location.pathname).toBe('/');
    expect(shellColorScheme('home-shell')).toBe('light');
    expect((await screen.findAllByText('Chưa có sản phẩm nổi bật')).length).toBeGreaterThan(0);
  });
});

describe('Home API data', () => {
  it('renders complete English home copy while preserving source-provided catalog names', async () => {
    localStorage.setItem('giatot-language', 'en');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ items: [{ ...categories.items[0], productCount: 1 }] }))
      .mockResolvedValueOnce(response(products))
      .mockResolvedValueOnce(response({ items: [], page: 1, pageSize: 1, totalItems: 1, totalPages: 1 })));
    renderApp();

    expect((await screen.findAllByRole('link', { name: 'Phones' })).length).toBeGreaterThan(0);
    expect(await screen.findByRole('link', { name: 'Sample Phone' })).toBeTruthy();
    expect(screen.getByText('Shop smarter')).toBeTruthy();
    expect(screen.getByText('Compare prices, buy better,')).toBeTruthy();
    expect(screen.getByText('Popular categories')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See price' })).toBeTruthy();
    expect(screen.getByText('No products in this category yet')).toBeTruthy();
    expect(screen.getByText('Our partners')).toBeTruthy();
    expect(screen.getByText('Compare faster')).toBeTruthy();
    expect(document.querySelector('.bottom-nav')?.textContent).toContain('Home');
    expect(document.querySelector('.bottom-nav')?.textContent).toContain('Categories');
    expect(document.querySelector('.bottom-nav')?.textContent).not.toContain('Trang chủ');
    expect(document.querySelector('.footer-newsletter')).toBeNull();
    expect(document.querySelectorAll('.footer-main > div')).toHaveLength(4);
    expect(screen.getByText(/All rights reserved\./)).toBeTruthy();
    expect(screen.queryByText('Danh mục phổ biến')).toBeNull();
    expect(screen.queryByText('Đang tải danh mục...')).toBeNull();
    expect(screen.queryByText('Chưa có sản phẩm trong danh mục này')).toBeNull();
  });

  it('shows English empty states when home collections contain no data', async () => {
    localStorage.setItem('giatot-language', 'en');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(response({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 })));
    renderApp();

    expect(await screen.findByText('No categories yet')).toBeTruthy();
    expect(screen.getAllByText('No featured products yet').length).toBeGreaterThan(0);
    expect(screen.queryByText('Chưa có danh mục')).toBeNull();
    expect(screen.queryByText('Chưa có sản phẩm nổi bật')).toBeNull();
  });

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
    expect(screen.getByText(/Từ 1\.200\.000/)).toBeTruthy();
    expect(screen.queryByText('2 cửa hàng đang bán')).toBeNull();
    expect(screen.getAllByText('Chưa có hình ảnh').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('img', { name: 'Chưa có hình ảnh' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('Apple')).toBeNull();
    expect(screen.queryByText(/★/)).toBeNull();
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api-compareshop-dev.giamha.online/api/v1/categories');
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api-compareshop-dev.giamha.online/api/v1/products?page=1&pageSize=15');
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://api-compareshop-dev.giamha.online/api/v1/products?categoryId=1&page=1&pageSize=1');
  });

  it('renders API product images in both homepage featured surfaces', async () => {
    const withImage = { ...products.items[0], imageUrl: 'https://cdn.example/phone.jpg' };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response(categories);
      if (url.endsWith('/products?page=1&pageSize=15')) return response({ ...products, items: [withImage] });
      return response({ items: [], page: 1, pageSize: 1, totalItems: 0, totalPages: 0 });
    }));
    renderAppAt('/');

    const images = await screen.findAllByRole('img', { name: 'Sample Phone' });
    expect(images).toHaveLength(2);
    expect(images.every(image => image instanceof HTMLImageElement && image.src === 'https://cdn.example/phone.jpg')).toBe(true);
    expect(screen.queryByText('Chưa có hình ảnh')).toBeNull();
  });

  it('renders the first three hero products and vertical wireframe category cards', async () => {
    const featuredItems = [1, 2, 3, 4].map(id => ({
      ...products.items[0],
      id,
      slug: `sample-phone-${id}`,
      name: `Sample Phone ${id}`,
      offerSummary: { ...products.items[0].offerSummary, minPrice: id === 2 ? 0 : id * 1000 },
    }));
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [
        { id: 1, slug: 'phones', name: 'Phones' },
        { id: 2, slug: 'audio', name: 'Audio' },
        { id: 3, slug: 'computers', name: 'Computers' },
        { id: 4, slug: 'home-goods', name: 'Home goods' },
      ] });
      if (url.endsWith('/products?page=1&pageSize=15')) return response({ ...products, items: featuredItems });
      if (url.includes('categoryId=1')) return response({ ...products, items: [], totalItems: 0 });
      if (url.includes('categoryId=2')) return response({ ...products, items: [], totalItems: 7 });
      if (url.includes('categoryId=')) return response({ ...products, items: [], totalItems: 3 });
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/');

    const featuredCard = document.querySelector('.hero-featured-card') as HTMLElement;
    expect((await screen.findAllByRole('link', { name: 'Sample Phone 1' })).length).toBeGreaterThan(0);
    expect(featuredCard.querySelectorAll('.hero-featured-product')).toHaveLength(3);
    expect(featuredCard.querySelectorAll('.hero-featured-name')[0].textContent).toBe('Sample Phone 1');
    expect(featuredCard.querySelectorAll('.hero-featured-name')[2].textContent).toBe('Sample Phone 3');
    expect(Array.from(featuredCard.querySelectorAll('.hero-featured-name')).some(name => name.textContent === 'Sample Phone 4')).toBe(false);
    expect(featuredCard.querySelectorAll('.hero-featured-image')).toHaveLength(3);
    expect(featuredCard.querySelectorAll('.hero-featured-product')[1].querySelector('.hero-featured-price')).toBeNull();
    expect((await screen.findAllByRole('link', { name: 'Phones' })).length).toBeGreaterThan(0);
    const categoryIcons = Array.from(document.querySelectorAll('.category-card svg')).map(icon => icon.getAttribute('data-category-icon'));
    expect(categoryIcons).toEqual(['phone', 'audio', 'computer', 'category']);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('featured'))).toBe(false);
  });

  it('loads up to fifteen computers independently from a mixed catalog', async () => {
    const mixedCatalog = Array.from({ length: 15 }, (_, index) => {
      const isComputer = index % 5 === 0;
      return {
        ...products.items[0], id: index + 1, slug: `catalog-product-${index + 1}`, name: `Catalog product ${index + 1}`,
        category: { id: isComputer ? 2 : 1, slug: isComputer ? 'computers' : 'phones', name: isComputer ? 'Computers' : 'Phones' },
      };
    });
    const computers = Array.from({ length: 15 }, (_, index) => ({
      ...products.items[0], id: index + 101, slug: `computer-${index + 1}`, name: `Computer ${index + 1}`,
      category: { id: 2, slug: 'computers', name: 'Computers' },
    }));
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [
        { id: 1, slug: 'phones', name: 'Phones' }, { id: 2, slug: 'computers', name: 'Computers' },
      ] });
      if (url.endsWith('/products?page=1&pageSize=15')) return response({ ...products, items: mixedCatalog });
      if (url.endsWith('/products?categoryId=2&page=1&pageSize=15')) return response({ ...products, items: computers });
      return response({ ...products, items: [], totalItems: 0 });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/');

    await waitFor(() => expect(document.querySelectorAll('.product-grid').length).toBe(2));
    const grids = Array.from(document.querySelectorAll('.product-grid'));
    expect(grids.map(grid => grid.querySelectorAll('.product-card').length)).toEqual([15, 15]);
    expect(grids[0].querySelectorAll('.product-name')).toHaveLength(15);
    expect(grids[1].querySelectorAll('.product-name')).toHaveLength(15);
    expect(Array.from(grids[1].querySelectorAll('.product-name')).map(node => node.textContent)).toEqual(
      Array.from({ length: 15 }, (_, index) => `Computer ${index + 1}`),
    );
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/products?categoryId=2&page=1&pageSize=15');
    expect(grids[0].querySelector('.product-card')?.querySelectorAll('.product-card-body > *')).toHaveLength(3);
    expect(grids[0].querySelector('.product-card')?.querySelector('.product-name')).toBeTruthy();
    expect(grids[0].querySelector('.product-card')?.querySelector('.price')).toBeTruthy();
    expect(grids[0].querySelector('.product-card')?.querySelector('.product-cta')).toBeTruthy();
    const featuredHeading = screen.getByRole('heading', { name: 'Sản phẩm nổi bật' });
    expect(featuredHeading.parentElement?.querySelector('.eyebrow')).toBeNull();
    expect(document.querySelectorAll('.partner-card')).toHaveLength(12);
    expect(document.querySelectorAll('.trust-card')).toHaveLength(4);
  });

  it('shows empty states when both API collections are empty', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(response({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 })));
    renderApp();

    expect(await screen.findByText('Chưa có danh mục')).toBeTruthy();
    expect(screen.getAllByText('Chưa có sản phẩm nổi bật').length).toBeGreaterThan(0);
    const heroCard = document.querySelector('.hero-featured-card');
    expect(heroCard?.querySelector('.hero-featured-empty')?.textContent).toBe('Chưa có sản phẩm nổi bật');
    expect(heroCard?.querySelectorAll('.hero-featured-product')).toHaveLength(0);
  });

  it('shows an error and retries both requests', async () => {
    let categoryRequests = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/categories')) {
        categoryRequests += 1;
        return categoryRequests === 1
          ? Promise.reject(new Error('offline'))
          : response(categories);
      }
      if (url.endsWith('/products?page=1&pageSize=15')) return response(products);
      if (url.endsWith('/products?categoryId=1&page=1&pageSize=1')) {
        return response({ items: [], page: 1, pageSize: 1, totalItems: 42, totalPages: 42 });
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderApp();

    const retry = await screen.findByRole('button', { name: 'Thử lại' });
    expect(screen.getByRole('alert').textContent).toContain('Không thể tải dữ liệu trang chủ');
    fireEvent.click(retry);
    expect((await screen.findAllByRole('link', { name: 'Phones' })).some(link => link.getAttribute('href') === '/category/phones')).toBe(true);
    expect(await screen.findByRole('link', { name: 'Sample Phone' })).toBeTruthy();
    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.filter(url => url.endsWith('/categories')).length).toBeGreaterThanOrEqual(2);
    expect(requestedUrls).toContain('https://api-compareshop-dev.giamha.online/api/v1/products?page=1&pageSize=15');
    expect(requestedUrls).toContain('https://api-compareshop-dev.giamha.online/api/v1/products?categoryId=1&page=1&pageSize=1');
  });
});

describe('English route copy', () => {
  it.each([
    ['/search', 'All products'],
    ['/category/unknown-category', 'Category not found'],
    ['/product/unknown-product', 'Could not load product details'],
    ['/compare', 'No products to compare yet'],
    ['/blog', 'News and advice'],
    ['/blog/unknown-article', 'Article not found'],
    ['/shops/unknown-shop', 'Could not load shop details'],
    ['/wishlist', 'Sign in to view saved products'],
    ['/login', 'Sign in for a better experience'],
    ['/account', 'Personal account'],
  ])('%s renders English application copy', async (path, expectedCopy) => {
    localStorage.setItem('giatot-language', 'en');
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => String(input).endsWith('/articles/unknown-article')
      ? response(null, false, 404)
      : response({ items: [] })));
    renderAppAt(path);

    expect(await screen.findByText(expectedCopy)).toBeTruthy();
    expect(document.title).toBe('GiaTot - Smart Price Comparison');
    expect(screen.queryByText('Đang tải sản phẩm...')).toBeNull();
  });

  it('preserves the session account name diacritics when rendering English copy', () => {
    localStorage.setItem('giatot-language', 'en');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ items: [] })));
    renderAppAt('/account');

    expect(screen.getByRole('heading', { name: 'Hello, Trần Minh Quân' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Hello, Tran Minh Quan' })).toBeNull();
  });
});

describe('English copy for route controls and accessible labels', () => {
  beforeEach(() => localStorage.setItem('giatot-language', 'en'));

  it('renders the product offer action and price-history chart label in English', async () => {
    vi.stubGlobal('fetch', detailFetch());
    renderAppAt('/product/sample-product-01');

    expect(await screen.findByRole('link', { name: 'View now ↗' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Price history chart' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Xem ngay ↗' })).toBeNull();
    expect(screen.queryByRole('img', { name: 'Biểu đồ lịch sử giá' })).toBeNull();
  });

  it('renders the missing shop review-count fallback in English', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => String(input).endsWith('/shops/sample-shop')
      ? response({ id: 2, slug: 'sample-shop', name: 'Sample Shop', rating: null, reviewCount: null })
      : response({ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 })));
    renderAppAt('/shops/sample-shop');

    expect(await screen.findByText('(Review count unavailable)')).toBeTruthy();
    expect(screen.queryByText(/Số lượt đánh giá chưa có/)).toBeNull();
  });

  it('renders the wishlist loading region label in English until the request resolves', async () => {
    authMock.getToken.mockResolvedValue('access-token');
    let resolveRequest!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { resolveRequest = resolve; })));
    renderAppAt('/wishlist', 'authenticated');

    const loadingRegion = screen.getByLabelText('Loading wishlist products');
    expect(loadingRegion.getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByLabelText('Đang tải sản phẩm yêu thích')).toBeNull();
    await waitFor(() => expect(resolveRequest).toBeTruthy());
    resolveRequest(await response({ items: [] }));
    expect(await screen.findByText('Your wishlist is empty')).toBeTruthy();
  });
});


it('renders the storefront and opens the saved products page', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response(categories))
    .mockResolvedValueOnce(response(products))
    .mockResolvedValueOnce(response({ items: [], page: 1, pageSize: 1, totalItems: 42, totalPages: 42 }))
    .mockResolvedValueOnce(response({ items: [] }));
  vi.stubGlobal('fetch', fetchMock);
  renderApp();

  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('So sánh giá');
  expect(await screen.findByRole('link', { name: 'Sample Phone' })).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  fireEvent.click(screen.getAllByRole('link', { name: /Yêu thích/ })[0]);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sản phẩm yêu thích');
  expect(await screen.findByRole('heading', { name: 'Đăng nhập để xem sản phẩm đã lưu' })).toBeTruthy();
});

it('renders the auth callback outside the storefront shell', async () => {
  renderAppAt('/auth/callback');
  expect(await screen.findByRole('button', { name: 'Thử đăng nhập lại' })).toBeTruthy();
  expect(document.querySelector('.site-header')).toBeNull();
});

describe('Wishlist API data', () => {
  it('keeps the page loading until the authenticated wishlist request resolves', async () => {
    authMock.getToken.mockResolvedValue('access-token');
    let resolveRequest!: (value: Response) => void;
    const fetchMock = vi.fn((..._args: Parameters<typeof fetch>) => new Promise<Response>(resolve => { resolveRequest = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/wishlist', 'authenticated');

    expect(screen.getByLabelText('Đang tải sản phẩm yêu thích').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText('Chưa có sản phẩm yêu thích')).toBeNull();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/wishlist', { headers: { Authorization: 'Bearer access-token' } }));
    resolveRequest(await response({ items: [{ productId: 12, slug: 'real-phone', name: 'Real Phone', createdAtUtc: '2026-10-19T00:00:00Z' }] }));
    expect(await screen.findByRole('link', { name: 'Real Phone' }, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('Giá hiện tại chưa có dữ liệu')).toBeTruthy();
    expect(screen.queryByText(/200\.000/)).toBeNull();
  });

  it('removes an item through the API and renders the empty state after success', async () => {
    authMock.getToken.mockResolvedValue('access-token');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ items: [{ productId: 12, slug: 'real-phone', name: 'Real Phone', createdAtUtc: '2026-10-19T00:00:00Z' }] }))
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response)
      .mockResolvedValueOnce(response({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/wishlist', 'authenticated');

    fireEvent.click(await screen.findByRole('button', { name: 'Xóa Real Phone' }));
    expect(await screen.findByText('Chưa có sản phẩm yêu thích')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/wishlist', {
      method: 'POST', headers: { Authorization: 'Bearer access-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 12, operation: 'remove' }),
    });
  });

  it('offers sign-in after the wishlist API rejects the current token', async () => {
    authMock.getToken.mockResolvedValue('expired-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response));
    renderAppAt('/wishlist', 'authenticated');

    expect(await screen.findByRole('heading', { name: 'Đăng nhập để xem sản phẩm đã lưu' })).toBeTruthy();
    const loginCta = screen.getByRole('button', { name: 'Đăng nhập' });
    expect(loginCta.classList.contains('wishlist-unauthenticated__cta')).toBe(true);
    const promptFlow = loginCta.parentElement;
    expect(promptFlow?.classList.contains('wishlist-unauthenticated__actions')).toBe(true);
    expect(promptFlow?.firstElementChild?.textContent).toBe('Danh sách yêu thích chỉ hiển thị cho tài khoản đã xác thực.');
    expect(stylesheet).toMatch(/\.wishlist-unauthenticated__actions\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;\s*align-items:\s*center;\s*gap:\s*24px;\s*\}/);
    fireEvent.click(loginCta);
    await waitFor(() => expect(authMock.signIn).toHaveBeenCalledWith('/wishlist'));
  });

  it('shows an error and retries the wishlist request', async () => {
    authMock.getToken.mockResolvedValue('access-token');
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response({ items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/wishlist', 'authenticated');

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

it('renders the catalog image in search results', async () => {
  const imageUrl = 'https://cdn.example/search-result.jpg';
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/categories')) return response(categories);
    if (url.endsWith('/wishlist')) return response({ items: [] });
    if (url.includes('/products?')) return response({ ...products, items: [{ ...products.items[0], imageUrl }] });
    return response({ items: [] });
  }));
  renderAppAt('/search');

  expect((await screen.findByRole('img', { name: 'Sample Phone' }) as HTMLImageElement).src).toBe(imageUrl);
});

describe('Blog listing route', () => {
  it('renders the listing with slug links from GET /articles', async () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ slug: `bai-${i + 1}`, title: `Bài viết ${i + 1}`, category: 'shopping-tips', excerptText: 'Tóm tắt', coverFileId: null, tags: [], authorName: 'Minh Anh', totalViews: 0, publishedAtUtc: '2026-11-12T00:00:00Z' }));
    const fetchMock = vi.fn().mockResolvedValue(response({ items, page: 1, pageSize: 12, totalItems: 12, totalPages: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/blog');

    expect(screen.getByRole('heading', { name: 'Tin tức & kinh nghiệm' })).toBeTruthy();
    expect(document.querySelector('.desktop-nav a[aria-current="page"]')?.textContent).toContain('Blog');
    expect((await screen.findByRole('link', { name: /Nổi bật.*Bài viết 1/ })).getAttribute('href')).toBe('/blog/bai-1');
    expect(document.querySelectorAll('.blog-post-grid .blog-post-card')).toHaveLength(11);
    expect((document.querySelector('.blog-post-grid .blog-post-card') as HTMLAnchorElement).getAttribute('href')).toBe('/blog/bai-2');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/articles?page=1&pageSize=12');
  });

  it('keeps the listing readable at mobile widths and light in OS dark mode', async () => {
    setColorScheme('dark');
    renderAppAt('/blog');

    expect(stylesheet).toMatch(/\.blog-post-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/);
    expect(stylesheet).toMatch(/@media\(max-width:760px\)[\s\S]*?\.blog-post-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    expect(stylesheet).toMatch(/@media\(max-width:520px\)[\s\S]*?\.blog-post-grid\{grid-template-columns:1fr\}/);
    expect(document.querySelector('.blog-shell')).toBeTruthy();
    expect(stylesheet).toMatch(/:root\{[^}]*color:#171b24;background:#fff/);
    expect(stylesheet).toMatch(/body\{[^}]*background:#fff/);
    expect(shellColorScheme('blog-shell')).toBe('light');
    expect(stylesheet).not.toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)[^{]*\{[^}]*\.blog-shell/);
    expect(stylesheet).toMatch(/\.blog-list-heading h1\{[^}]*color:#171b24/);
    expect(stylesheet).toMatch(/\.blog-detail-subscribe\{[^}]*background:#fff3eb/);
    expect(contrastRatio('#595959', '#fff3eb')).toBeGreaterThanOrEqual(4.5);
    expect(stylesheet).toMatch(/@media \(prefers-color-scheme: dark\)[\s\S]*?\.site-header \{/);

    cleanup();
    const article = { slug: '10-meo-so-sanh-gia', title: 'A real published article', category: 'shopping-tips', excerptText: 'Excerpt', coverFileId: null, tags: [], authorName: 'Minh Anh', publishedAtUtc: '2026-11-12T00:00:00Z', totalViews: 0, contentMarkdown: 'Published content', updatedAtUtc: '2026-11-12T00:00:00Z' };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => String(input).endsWith('/articles/10-meo-so-sanh-gia')
      ? response(article)
      : response({ items: [] })));
    renderAppAt('/blog/10-meo-so-sanh-gia');
    expect(document.querySelector('.blog-shell')).toBeTruthy();
    expect(shellColorScheme('blog-shell')).toBe('light');
    expect(await screen.findByRole('heading', { name: 'A real published article' })).toBeTruthy();
  });
});

const catalogPage = {
  items: [{ id: 17, slug: 'api-phone', name: 'API Phone', brand: 'Real Brand', category: { id: 42, slug: 'phones', name: 'Phones' }, offerSummary: { minPrice: 1200000, maxPrice: 1600000, offerCount: 3 } }],
  page: 1, pageSize: 12, totalItems: 1, totalPages: 1,
};

describe('Search and Category API data', () => {
  it('adds a product to the authenticated wishlist through the API heart action', async () => {
    authMock.getToken.mockResolvedValue('access-token');
    let wishlistItems: Array<{ productId: number; slug: string; name: string; createdAtUtc: string }> = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 42, slug: 'phones', name: 'Phones' }] });
      if (url.endsWith('/wishlist') && init?.method !== 'POST') return response({ items: wishlistItems });
      if (url.endsWith('/wishlist') && init?.method === 'POST') {
        const operation = (JSON.parse(String(init.body)) as { operation: string }).operation;
        wishlistItems = operation === 'remove' ? [] : [{ productId: 17, slug: 'api-phone', name: 'API Phone', createdAtUtc: '2026-11-11T00:00:00Z' }];
        return Promise.resolve({ ok: true, status: 204 } as Response);
      }
      return response(catalogPage);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/category/phones', 'authenticated');

    const addButton = await screen.findByRole('button', { name: 'Thêm vào yêu thích' });
    await waitFor(() => expect(addButton.hasAttribute('disabled')).toBe(false));
    fireEvent.click(addButton);
    expect(await screen.findByRole('button', { name: 'Bỏ khỏi yêu thích' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/wishlist', {
      headers: { Authorization: 'Bearer access-token' },
    });
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/wishlist', {
      method: 'POST', headers: { Authorization: 'Bearer access-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: 17, operation: 'add' }),
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Bỏ khỏi yêu thích' }));
    expect(await screen.findByRole('button', { name: 'Thêm vào yêu thích' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/wishlist', {
      method: 'POST', headers: { Authorization: 'Bearer access-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: 17, operation: 'remove' }),
    });
    expect(localStorage.getItem('wishlist-products')).toBeNull();
  });

  it('rolls back the optimistic heart state when a wishlist update fails', async () => {
    authMock.getToken.mockResolvedValue('access-token');
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 42, slug: 'phones', name: 'Phones' }] });
      if (url.endsWith('/wishlist') && init?.method !== 'POST') return response({ items: [] });
      if (url.endsWith('/wishlist') && init?.method === 'POST') return Promise.reject(new Error('offline'));
      return response(catalogPage);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/category/phones', 'authenticated');

    fireEvent.click(await screen.findByRole('button', { name: 'Thêm vào yêu thích' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Thêm vào yêu thích' })).toBeTruthy();
  });

  it('starts sign-in when a signed-out user saves a product', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 42, slug: 'phones', name: 'Phones' }] });
      return response(catalogPage);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/category/phones');

    fireEvent.click(await screen.findByRole('button', { name: 'Thêm vào yêu thích' }));
    await waitFor(() => expect(authMock.signIn).toHaveBeenCalledWith('/category/phones'));
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/wishlist'))).toBe(false);
  });

  it('rechecks the session at click time and never posts with a token cleared after wishlist load', async () => {
    let accessToken: string | null = 'stale-token';
    authMock.getToken.mockImplementation(async () => accessToken);
    authMock.clear.mockResolvedValue();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 42, slug: 'phones', name: 'Phones' }] });
      if (url.endsWith('/wishlist') && init?.method !== 'POST') return response({ items: [] });
      if (url.endsWith('/wishlist') && init?.method === 'POST') return response(null);
      return response(catalogPage);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/search?q=phone', 'authenticated');

    const heart = await screen.findByRole('button', { name: 'Thêm vào yêu thích' });
    await waitFor(() => expect(heart.hasAttribute('disabled')).toBe(false));
    expect(fetchMock).toHaveBeenCalledWith('https://api-compareshop-dev.giamha.online/api/v1/wishlist', {
      headers: { Authorization: 'Bearer stale-token' },
    });

    accessToken = null;
    fireEvent.click(heart);
    await waitFor(() => expect(authMock.signIn).toHaveBeenCalledWith('/search?q=phone'));
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/wishlist') && init?.method === 'POST')).toBe(false);
  });

  it('starts OIDC from the current Search URL after the wishlist session is rejected', async () => {
    authMock.getToken.mockResolvedValueOnce('revoked-token').mockResolvedValue(null);
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 42, slug: 'phones', name: 'Phones' }] });
      if (url.endsWith('/wishlist')) return Promise.resolve({ ok: false, status: 401 } as Response);
      return response(catalogPage);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/search?q=Apple', 'authenticated');

    const heart = await screen.findByRole('button', { name: 'Thêm vào yêu thích' });
    await waitFor(() => expect(heart.hasAttribute('disabled')).toBe(false));
    fireEvent.click(heart);

    await waitFor(() => expect(authMock.signIn).toHaveBeenCalledWith('/search?q=Apple'));
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
  });

  it('starts OIDC when session lookup fails and never posts to wishlist', async () => {
    authMock.getToken.mockResolvedValueOnce('valid-token').mockRejectedValueOnce(new Error('session storage unavailable'));
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 42, slug: 'phones', name: 'Phones' }] });
      if (url.endsWith('/wishlist') && init?.method !== 'POST') return response({ items: [] });
      return response(catalogPage);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAppAt('/search?q=Apple', 'authenticated');

    const heart = await screen.findByRole('button', { name: 'Thêm vào yêu thích' });
    await waitFor(() => expect(heart.hasAttribute('disabled')).toBe(false));
    fireEvent.click(heart);

    await waitFor(() => expect(authMock.signIn).toHaveBeenCalledWith('/search?q=Apple'));
    expect(authMock.clear).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
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

function detailFetch({ productResponse = detail, offers = [{ id: 9, price: 1200000, url: null, updatedAt: '2026-10-19T08:00:00Z', shopId: 2, shopSlug: 'shop-two', shopName: 'Shop Two' }], history = [{ date: '2026-09-01T00:00:00Z', minPrice: 1300000, shopId: 2 }], related = [] }: { productResponse?: unknown; offers?: unknown[]; history?: unknown[]; related?: unknown[] } = {}) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/products/sample-product-01')) return response(productResponse);
    if (url.endsWith('/products/1/offers')) return response({ items: offers });
    if (url.includes('/products/1/price-history')) return response({ items: history });
    if (url.includes('/products?categoryId=7')) return response({ items: related });
    return response({}, false);
  });
}

describe('Product Detail API data', () => {
  it('renders the product and related product API images', async () => {
    const productImage = 'https://cdn.example/product-detail.jpg';
    const relatedImage = 'https://cdn.example/related.jpg';
    vi.stubGlobal('fetch', detailFetch({
      productResponse: { ...detail, imageUrl: productImage },
      related: [{ ...detail, id: 2, slug: 'related-product', name: 'Related Product', imageUrl: relatedImage }],
    }));
    renderAppAt('/product/sample-product-01');

    expect((await screen.findByRole('img', { name: 'Sample Product 01' }) as HTMLImageElement).src).toBe(productImage);
    expect((screen.getByRole('img', { name: 'Related Product' }) as HTMLImageElement).src).toBe(relatedImage);
  });

  it.each(['light', 'dark'] as const)('applies fixed light Product Detail shell for direct navigation in %s OS preference', async theme => {
    setColorScheme(theme);
    vi.stubGlobal('fetch', detailFetch());

    renderAppAt('/product/sample-product-01');
    expect(await screen.findByRole('heading', { name: 'Sample Product 01' })).toBeTruthy();
    expect(document.querySelector('.product-shell')).toBeTruthy();
    expect(shellColorScheme('product-shell')).toBe('light');
    expect(screen.getByText('Ảnh chưa có')).toBeTruthy();
    expect(screen.getByText('Giá có thể thay đổi theo từng cửa hàng. Hãy kiểm tra lại giá cuối cùng trước khi mua.')).toBeTruthy();
  });

  it.each(['light', 'dark'] as const)('preserves fixed route themes after opening a Home product link in %s OS preference', async theme => {
    setColorScheme(theme);
    const product = { id: 5, slug: 'sample-product-01', name: 'Sample Product 01', brand: 'Example', category: { id: 7, slug: 'phones', name: 'Phones' }, offerSummary: { minPrice: 1200000, maxPrice: 1500000, offerCount: 1 } };
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 7, slug: 'phones', name: 'Phones' }] });
      if (url.includes('/products?categoryId=7')) return response({ items: [product], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
      if (url.includes('/products?page=1&pageSize=15')) return response({ items: [product], page: 1, pageSize: 15, totalItems: 1, totalPages: 1 });
      if (url.endsWith('/products/sample-product-01')) return response(detail);
      if (url.endsWith('/products/1/offers')) return response({ items: [] });
      if (url.includes('/products/1/price-history')) return response({ items: [] });
      return response({ items: [] });
    }));

    renderAppAt('/');
    expect(document.querySelector('.home-shell')).toBeTruthy();
    expect(shellColorScheme('home-shell')).toBe('light');
    fireEvent.click(await screen.findByRole('link', { name: 'Sample Product 01' }));
    expect(await screen.findByRole('heading', { name: 'Sample Product 01' })).toBeTruthy();
    expect(document.querySelector('.product-shell')).toBeTruthy();
    expect(shellColorScheme('product-shell')).toBe('light');
  });

  it('opens the API product selected from the Home product link', async () => {
    const product = { id: 5, slug: 'sample-product-01', name: 'Sample Product 01', brand: 'Example', category: { id: 7, slug: 'phones', name: 'Phones' }, offerSummary: { minPrice: 1200000, maxPrice: 1500000, offerCount: 1 } };
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/categories')) return response({ items: [{ id: 7, slug: 'phones', name: 'Phones' }] });
      if (url.includes('/products?categoryId=7')) return response({ items: [product], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
      if (url.includes('/products?page=1&pageSize=15')) return response({ items: [product], page: 1, pageSize: 15, totalItems: 1, totalPages: 1 });
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
    render(<CountryProvider><LanguageProvider><MemoryRouter initialEntries={['/product/sample-product-01']}><Link to="/product/other-product">Open other product</Link><Routes><Route path="/product/:slug" element={<ProductDetailPage />} /></Routes></MemoryRouter></LanguageProvider></CountryProvider>);

    fireEvent.click(screen.getByRole('link', { name: 'Open other product' }));
    expect(await screen.findByRole('heading', { name: 'Other Product' })).toBeTruthy();
    resolveFirst?.(await response(detail));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Other Product' })).toBeTruthy());
    expect(screen.queryByRole('heading', { name: 'Sample Product 01' })).toBeNull();
  });
});
