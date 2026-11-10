// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from './i18n';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BlogPage } from './BlogPage';
import { BlogDetailPage } from './BlogDetailPage';
import * as fixtures from './blogMockData';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function renderBlog(path = '/blog') { return render(<LanguageProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="/blog" element={<BlogPage />} /><Route path="/blog/:slug" element={<BlogDetailPage />} /></Routes></MemoryRouter></LanguageProvider>); }

it('shows the approved listing sections, 12 latest cards, and page navigation to detail', () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  renderBlog();
  expect(screen.getByRole('heading', { name: 'Tin tức & kinh nghiệm' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Bài viết mới nhất' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /Nổi bật/ }).getAttribute('href')).toContain('/blog/');
  expect(document.querySelectorAll('.blog-post-grid .blog-post-card')).toHaveLength(12);
  expect(screen.getByRole('link', { name: /tai nghe không dây/ }).getAttribute('href')).toBe('/blog/blog-1');
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  expect(document.querySelectorAll('.blog-post-grid .blog-post-card')).toHaveLength(12);
  expect(screen.getByRole('link', { name: /robot hút bụi/ })).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});

it('filters by category and resets pagination', () => {
  renderBlog();
  fireEvent.click(screen.getByRole('button', { name: 'Kinh nghiệm mua sắm' }));
  expect(screen.getByRole('button', { name: 'Kinh nghiệm mua sắm' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByRole('link', { name: /Nổi bật/ })).toBeNull();
  expect([...document.querySelectorAll('.blog-post-card h3')].every(card => card.closest('.blog-post-card')?.textContent?.includes('Kinh nghiệm mua sắm'))).toBe(true);
});

it('keeps the empty state available when the shared static fixture is empty', () => {
  vi.spyOn(fixtures, 'getBlogPosts').mockReturnValue([]);
  renderBlog();
  expect(screen.getByRole('heading', { name: 'Chưa có bài viết' })).toBeTruthy();
});

it('renders detail content, tags, newsletter CTA, related posts, and unknown slug state', () => {
  renderBlog('/blog/blog-5');
  expect(screen.getByRole('heading', { level: 1, name: /mẹo so sánh giá/ })).toBeTruthy();
  expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(1);
  expect(screen.getByText(/Mua sắm thông minh bắt đầu/)).toBeTruthy();
  expect(screen.getByText('Nhận bài viết mới qua email')).toBeTruthy();
  expect(document.querySelectorAll('.blog-related-grid .blog-post-card')).toHaveLength(3);
  cleanup();
  renderBlog('/blog/no-such-story');
  expect(screen.getByRole('heading', { name: 'Không tìm thấy bài viết' })).toBeTruthy();
});
