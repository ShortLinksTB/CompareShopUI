// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { BlogDetailPage } from './BlogDetailPage';
import { blogArticles } from './blogMockData';

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

function renderDetail(path: string) {
  return render(<LanguageProvider><MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/blog/:slug" element={<BlogDetailPage />} /></Routes>
  </MemoryRouter></LanguageProvider>);
}

it('renders the mock article structure and three related links without calling an API', () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const article = blogArticles[0];
  renderDetail(`/blog/${article.slug}`);

  expect(screen.getByRole('heading', { level: 1, name: article.title })).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Điều hướng' })).toBeTruthy();
  expect(screen.getByText('Bắt đầu từ nhu cầu của bạn')).toBeTruthy();
  expect(screen.getByText('So sánh thông tin giúp bạn tự tin hơn trước khi quyết định.')).toBeTruthy();
  expect(screen.getByRole('blockquote').textContent).toContain('Lựa chọn tốt');
  expect(screen.getAllByRole('link').filter(link => link.getAttribute('href')?.startsWith('/blog/'))).toHaveLength(3);
  expect(screen.getByRole('heading', { name: 'Nhận bài viết mới qua email' })).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('shows a not-found state for an unknown slug', () => {
  renderDetail('/blog/not-a-real-post');
  expect(screen.getByRole('heading', { name: 'Không tìm thấy bài viết' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Quay lại Blog' }).getAttribute('href')).toBe('/blog');
});
