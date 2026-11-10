// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { BlogDetailPage } from './BlogDetailPage';

afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); });

const article = {
  slug: 'real-article', title: 'A real article', category: 'shopping-tips', excerptText: 'A real excerpt',
  coverFileId: 'cover-1', tags: ['saving'], authorName: 'Minh Anh', publishedAtUtc: '2026-11-12T00:00:00Z',
  totalViews: 0, contentMarkdown: '# Safe content\n\nA **bold** idea with [a link](https://example.com).\n\n> A useful quote.\n\n<script>alert(1)</script>\n\n![Chart](javascript:alert(1))', updatedAtUtc: '2026-11-12T00:00:00Z',
};

function response(body: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);
}

function renderDetail(path = '/blog/real-article') {
  return render(<LanguageProvider><MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/blog/:slug" element={<BlogDetailPage />} /></Routes>
  </MemoryRouter></LanguageProvider>);
}

it('loads real public content, related posts, and records one view for the session/day', async () => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/articles/real-article')) return response(article);
    if (url.endsWith('/articles/real-article/view') && init?.method === 'POST') return response({});
    if (url.includes('/articles?page=1&pageSize=12')) return response({ items: [{ ...article, slug: 'related', title: 'Related story', contentMarkdown: undefined }], page: 1, pageSize: 12, totalItems: 1, totalPages: 1 });
    return response(null, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  renderDetail();

  expect(await screen.findByRole('heading', { level: 1, name: 'A real article' })).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Điều hướng' })).toBeTruthy();
  expect(document.querySelector('img.blog-detail-cover')?.getAttribute('src')).toContain('/files/cover-1');
  fireEvent.error(document.querySelector('img.blog-detail-cover')!);
  expect(document.querySelector('.blog-detail-cover.blog-image-placeholder')?.getAttribute('aria-label')).toBe('A real article');
  expect(screen.getByText('Safe content')).toBeTruthy();
  expect(document.querySelector('.blog-detail-prose p')?.textContent).toContain('A bold idea with a link.');
  expect(screen.getByRole('link', { name: 'a link' }).getAttribute('href')).toBe('https://example.com');
  expect(document.querySelector('.blog-detail-prose blockquote')?.textContent).toContain('A useful quote.');
  expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy();
  expect(document.querySelector('.blog-detail-prose img')).toBeNull();
  expect(await screen.findByRole('link', { name: /related/i })).toBeTruthy();
  await waitFor(() => expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1));
  expect(fetchMock.mock.calls.some(([url]) => String(url) === 'https://api-compareshop-dev.giamha.online/api/v1/articles/real-article')).toBe(true);
});

it('does not submit a second view for the same article and UTC day in this browser session', async () => {
  sessionStorage.setItem(`compareshop:article-view:real-article:${new Date().toISOString().slice(0, 10)}`, '1');
  const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => String(input).endsWith('/articles/real-article') ? response(article) : response({ items: [] }));
  vi.stubGlobal('fetch', fetchMock);
  renderDetail();
  await screen.findByRole('heading', { name: 'A real article' });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
});

it('skips analytics requests for known bots', async () => {
  vi.stubGlobal('navigator', { userAgent: 'Googlebot/2.1' });
  const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => String(input).endsWith('/articles/real-article') ? response(article) : response({ items: [] }));
  vi.stubGlobal('fetch', fetchMock);
  renderDetail();
  await screen.findByRole('heading', { name: 'A real article' });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
});

it('shows not-found for a missing or unpublished slug', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(null, 404)));
  renderDetail('/blog/draft-or-missing');
  expect(await screen.findByRole('heading', { name: 'Không tìm thấy bài viết' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Quay lại Blog' }).getAttribute('href')).toBe('/blog');
});

it('shows an error state and retry action when the article request fails', async () => {
  const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
  vi.stubGlobal('fetch', fetchMock);
  renderDetail();
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy();
});
