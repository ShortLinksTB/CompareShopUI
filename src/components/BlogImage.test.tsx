// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BlogImage } from './BlogImage';

afterEach(cleanup);

it('shows the placeholder immediately after an image fails', () => {
  const { container } = render(<BlogImage title="Article cover" src="/cover.jpg" />);
  fireEvent.error(container.querySelector('img')!);

  expect(screen.getByRole('img', { name: 'Article cover' }).tagName).toBe('DIV');
});

it('tries a new source after the previous source failed', () => {
  const { container, rerender } = render(<BlogImage title="Article cover" src="/first.jpg" />);
  fireEvent.error(container.querySelector('img')!);

  rerender(<BlogImage title="Article cover" src="/second.jpg" />);
  expect(container.querySelector('img')?.getAttribute('src')).toBe('/second.jpg');
});
