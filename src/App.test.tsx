// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { LanguageProvider } from './i18n';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

test('renders the storefront and opens the saved products page', () => {
  render(<LanguageProvider><MemoryRouter><App /></MemoryRouter></LanguageProvider>);

  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('So sánh giá');
  fireEvent.click(screen.getAllByRole('link', { name: /Yêu thích/ })[0]);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sản phẩm yêu thích');
  expect(screen.getByText('Chưa có sản phẩm yêu thích')).toBeTruthy();
});
