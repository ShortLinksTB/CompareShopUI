// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { BlogPage } from './BlogPage';
import { LanguageProvider, useLanguage } from './i18n';
import { blogArticles } from './blogMockData';

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

function renderBlog(articles = blogArticles) {
  return render(<LanguageProvider><MemoryRouter initialEntries={['/blog']}>
    <Routes><Route path="/blog" element={<BlogPage articles={articles} />} /></Routes>
  </MemoryRouter></LanguageProvider>);
}

function LanguageControl() {
  const { setLanguage } = useLanguage();
  return <><button onClick={() => setLanguage('en')}>Select English</button><button onClick={() => setLanguage('vi')}>Select Vietnamese</button></>;
}

it('renders the featured post and 12 latest posts from local fixtures without fetching', () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  renderBlog();

  expect(screen.getByRole('heading', { name: 'Tin tức & kinh nghiệm' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /Nổi bật.*10 mẹo so sánh giá/ }).getAttribute('href')).toBe('/blog/10-meo-so-sanh-gia');
  expect(document.querySelectorAll('.blog-post-grid .blog-post-card')).toHaveLength(12);
  expect(screen.getByRole('navigation', { name: 'Phân trang' })).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('filters categories and resets pagination to the first page', () => {
  renderBlog();
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-current')).toBe('page');

  fireEvent.click(screen.getByRole('button', { name: 'Đánh giá sản phẩm' }));

  expect(screen.getByRole('button', { name: 'Đánh giá sản phẩm' }).getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector('.blog-pagination')).toBeNull();
  const cards = Array.from(document.querySelectorAll('.blog-post-grid .blog-post-card'));
  expect(cards.length).toBeGreaterThan(0);
  for (const card of cards) expect(within(card as HTMLElement).getByText('Đánh giá sản phẩm')).toBeTruthy();
});

it('shows the existing empty state when the mock list is empty', () => {
  renderBlog([]);

  expect(screen.getByRole('heading', { name: 'Chưa có bài viết' })).toBeTruthy();
  expect(document.querySelector('.blog-featured-card')).toBeNull();
  expect(document.querySelector('.blog-post-grid')).toBeNull();
});

it('updates the document title for the selected language and restores it after leaving Blog', () => {
  render(<LanguageProvider><MemoryRouter initialEntries={['/blog']}>
    <LanguageControl />
    <Link to="/home">Leave blog</Link>
    <Routes><Route path="/blog" element={<BlogPage />} /><Route path="/home" element={<p>Home</p>} /></Routes>
  </MemoryRouter></LanguageProvider>);

  fireEvent.click(screen.getByRole('button', { name: 'Select English' }));
  expect(document.title).toBe('GiaTot - Smart Price Comparison');
  fireEvent.click(screen.getByRole('button', { name: 'Select Vietnamese' }));
  fireEvent.click(screen.getByRole('link', { name: 'Leave blog' }));
  expect(screen.getByText('Home')).toBeTruthy();
  expect(document.title).toBe('GiaTot - So sánh giá thông minh');
});
