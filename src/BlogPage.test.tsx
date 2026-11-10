// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { BlogPage } from './BlogPage';
import { LanguageProvider, useLanguage } from './i18n';

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

const article = (n: number) => ({ slug: `bai-${n}`, title: `Bài viết ${n}`, category: 'product-reviews', excerptText: `Tóm tắt ${n}`, coverFileId: n === 1 ? 'file-1' : null, tags: [], authorName: 'Minh Anh', totalViews: 3, publishedAtUtc: '2026-11-12T00:00:00Z' });
const pageOf = (page: number, count: number, totalPages: number) => ({ items: Array.from({ length: count }, (_, i) => article((page - 1) * 12 + i + 1)), page, pageSize: 12, totalItems: totalPages * 12, totalPages });
const respond = (body: unknown, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) });

function renderBlog() {
  return render(<LanguageProvider><MemoryRouter initialEntries={['/blog']}>
    <Routes><Route path="/blog" element={<BlogPage />} /></Routes>
  </MemoryRouter></LanguageProvider>);
}

function LanguageControl() {
  const { setLanguage } = useLanguage();
  return <><button onClick={() => setLanguage('en')}>Select English</button><button onClick={() => setLanguage('id')}>Select Indonesian</button><button onClick={() => setLanguage('vi')}>Select Vietnamese</button></>;
}

it('shows loading, then the featured post and latest posts from GET /articles', async () => {
  const fetchMock = vi.fn(() => respond(pageOf(1, 12, 2)));
  vi.stubGlobal('fetch', fetchMock);
  renderBlog();

  expect(screen.getByRole('status').textContent).toContain('Đang tải bài viết');
  expect(document.querySelector('.blog-featured-card')).toBeNull();
  await screen.findByRole('heading', { name: 'Bài viết mới nhất' });

  expect(String((fetchMock.mock.calls as unknown[][])[0][0])).toContain('/articles?page=1&pageSize=12');
  expect(screen.queryByRole('status')).toBeNull();
  const featured = document.querySelector('.blog-featured-card') as HTMLAnchorElement;
  expect(featured.getAttribute('href')).toBe('/blog/bai-1');
  expect(featured.querySelector('img')?.getAttribute('src')).toBe('https://api-compareshop-dev.giamha.online/api/v1/files/file-1');
  expect(featured.querySelector('.blog-category-chip')?.textContent).toBe('Đánh giá sản phẩm');
  expect(document.querySelector('.blog-post-card .blog-category-chip')?.textContent).toBe('Đánh giá sản phẩm');
  expect(document.querySelectorAll('.blog-post-grid .blog-post-card')).toHaveLength(11);
  expect(document.querySelector('.blog-post-grid .blog-post-card')?.getAttribute('href')).toBe('/blog/bai-2');
});

it('filters by category on the server and resets to page 1', async () => {
  const fetchMock = vi.fn((url: string) => respond(url.includes('page=2') ? pageOf(2, 3, 2) : pageOf(1, 12, 2)));
  vi.stubGlobal('fetch', fetchMock);
  renderBlog();
  await screen.findByRole('navigation', { name: 'Phân trang' });
  expect(screen.getByRole('button', { name: 'Tất cả' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  await waitFor(() => expect(document.querySelector('.blog-featured-card')).toBeNull());

  fireEvent.click(screen.getByRole('button', { name: 'Xu hướng thị trường' }));
  await waitFor(() => expect(document.querySelector('.blog-featured-card')).not.toBeNull());

  const urls = (fetchMock.mock.calls as unknown[][]).map(call => String(call[0]));
  expect(urls.at(-1)).toContain('page=1&pageSize=12&category=market-trends');
  expect(urls.slice(0, -1).some(url => url.includes('category='))).toBe(false);
  expect(screen.getByRole('button', { name: 'Xu hướng thị trường' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getAllByRole('button', { name: 'Tất cả' })[0].getAttribute('aria-pressed')).toBe('false');
});

it('requests the next server page and drops the featured card after page 1', async () => {
  const fetchMock = vi.fn((url: string) => respond(url.includes('page=2') ? pageOf(2, 3, 2) : pageOf(1, 12, 2)));
  vi.stubGlobal('fetch', fetchMock);
  renderBlog();
  await screen.findByRole('navigation', { name: 'Phân trang' });

  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  await waitFor(() => expect(document.querySelectorAll('.blog-post-grid .blog-post-card')).toHaveLength(3));

  expect(String((fetchMock.mock.calls as unknown[][])[1][0])).toContain('page=2&pageSize=12');
  expect(document.querySelector('.blog-featured-card')).toBeNull();
  expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('button', { name: 'Trang sau' }).hasAttribute('disabled')).toBe(true);
});

it('hides pagination when there is a single page', async () => {
  vi.stubGlobal('fetch', vi.fn(() => respond(pageOf(1, 4, 1))));
  renderBlog();
  await screen.findByRole('heading', { name: 'Bài viết mới nhất' });
  expect(document.querySelector('.blog-pagination')).toBeNull();
});

it('shows the empty state when the API returns no published articles', async () => {
  vi.stubGlobal('fetch', vi.fn(() => respond({ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 })));
  renderBlog();

  expect(await screen.findByRole('heading', { name: 'Chưa có bài viết' })).toBeTruthy();
  expect(document.querySelector('.blog-featured-card')).toBeNull();
  expect(document.querySelector('.blog-post-grid')).toBeNull();
});

it('shows an error state without any mock fallback and retries on demand', async () => {
  const fetchMock = vi.fn()
    .mockImplementationOnce(() => respond({}, false))
    .mockImplementation(() => respond(pageOf(1, 2, 1)));
  vi.stubGlobal('fetch', fetchMock);
  renderBlog();

  expect((await screen.findByRole('alert')).textContent).toContain('Không thể tải bài viết');
  expect(document.querySelector('.blog-featured-card')).toBeNull();
  expect(document.querySelector('.blog-post-grid')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findByRole('heading', { name: 'Bài viết mới nhất' });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('updates the document title for the selected language and restores it after leaving Blog', () => {
  vi.stubGlobal('fetch', vi.fn(() => respond(pageOf(1, 1, 1))));
  render(<LanguageProvider><MemoryRouter initialEntries={['/blog']}>
    <LanguageControl />
    <Link to="/home">Leave blog</Link>
    <Routes><Route path="/blog" element={<BlogPage />} /><Route path="/home" element={<p>Home</p>} /></Routes>
  </MemoryRouter></LanguageProvider>);

  fireEvent.click(screen.getByRole('button', { name: 'Select English' }));
  expect(document.title).toBe('GiaTot - Smart Price Comparison');
  fireEvent.click(screen.getByRole('button', { name: 'Select Indonesian' }));
  expect(document.title).toBe('GiaTot - Perbandingan harga cerdas');
  fireEvent.click(screen.getByRole('button', { name: 'Select Vietnamese' }));
  fireEvent.click(screen.getByRole('link', { name: 'Leave blog' }));
  expect(screen.getByText('Home')).toBeTruthy();
  expect(document.title).toBe('GiaTot - So sánh giá thông minh');
});
