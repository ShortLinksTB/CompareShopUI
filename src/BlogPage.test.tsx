// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BlogPage } from './BlogPage';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function expectSelected(name: string) {
  const buttons = screen.getAllByRole('button').filter(button => button.closest('.category-pills'));
  expect(buttons).toHaveLength(4);
  for (const button of buttons) {
    expect(button.getAttribute('aria-pressed')).toBe(String(button.textContent === name));
    expect(button.classList.contains('active')).toBe(button.textContent === name);
  }
}

it.each(['pointer', 'Enter', 'Space'] as const)('updates selection via %s after an empty successful response', async input => {
  const user = userEvent.setup();
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [], totalItems: 0 }) });
  vi.stubGlobal('fetch', fetchMock);
  render(<MemoryRouter><BlogPage /></MemoryRouter>);
  await screen.findByText('Chưa có bài viết');
  expectSelected('Tất cả');
  const category = screen.getByRole('button', { name: 'Kinh nghiệm mua sắm' });
  if (input === 'pointer') await user.click(category);
  else {
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(category);
    await user.keyboard(input === 'Enter' ? '{Enter}' : ' ');
  }
  expectSelected('Kinh nghiệm mua sắm');
  expect(screen.getByText('Chưa có bài viết')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Đánh giá sản phẩm' }));
  expectSelected('Đánh giá sản phẩm');
  await user.click(screen.getByRole('button', { name: 'Xu hướng thị trường' }));
  expectSelected('Xu hướng thị trường');
  await user.click(screen.getByRole('button', { name: 'Tất cả' }));
  expectSelected('Tất cả');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('updates selection as soon as a pointer presses a category', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [], totalItems: 0 }) });
  vi.stubGlobal('fetch', fetchMock);
  render(<MemoryRouter><BlogPage /></MemoryRouter>);
  const category = screen.getByRole('button', { name: 'Kinh nghiệm mua sắm' });

  fireEvent.pointerDown(category);

  expectSelected('Kinh nghiệm mua sắm');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('preserves a selection made while the article request is pending', async () => {
  const user = userEvent.setup();
  let resolve!: (value: Response) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(done => { resolve = done; })));
  render(<MemoryRouter><BlogPage /></MemoryRouter>);
  expect(screen.getByRole('status')).toBeTruthy();
  expectSelected('Tất cả');
  await user.click(screen.getByRole('button', { name: 'Kinh nghiệm mua sắm' }));
  expectSelected('Kinh nghiệm mua sắm');
  expect(screen.getByRole('status')).toBeTruthy();
  await act(async () => { resolve({ ok: true, json: async () => ({ items: [] }) } as Response); });
  await screen.findByText('Chưa có bài viết');
  expectSelected('Kinh nghiệm mua sắm');
});
