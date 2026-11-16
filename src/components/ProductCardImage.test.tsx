// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { ProductCardImage } from './ProductCardImage';

afterEach(cleanup);

describe('ProductCardImage', () => {
  it('uses the public imageUrl value directly for a card image', () => {
    const imageUrl = 'https://cdn.example/main-600x600.webp';
    render(<ProductCardImage imageUrl={imageUrl} productName="Sample product" noImageLabel="Chưa có hình ảnh" />);

    expect((screen.getByRole('img', { name: 'Sample product' }) as HTMLImageElement).src).toBe(imageUrl);
  });

  it('preserves the empty image label and card-specific placeholder markup', () => {
    render(<ProductCardImage imageUrl={null} productName="Sample product" noImageLabel="Chưa có hình ảnh" placeholderTag="span" placeholderClassName="muted" />);

    expect(screen.getByRole('img', { name: 'Chưa có hình ảnh' }).textContent).toBe('Chưa có hình ảnh');
    expect(screen.getByRole('img', { name: 'Chưa có hình ảnh' }).tagName).toBe('SPAN');
    expect(screen.getByRole('img', { name: 'Chưa có hình ảnh' }).className).toBe('muted');
  });

  it('keeps SafeImage fallback for an unavailable projected image', () => {
    render(<ProductCardImage imageUrl="https://cdn.example/main-600x600.webp" productName="Sample product" noImageLabel="Chưa có hình ảnh" />);
    fireEvent.error(screen.getByRole('img', { name: 'Sample product' }));

    expect(screen.getByRole('img', { name: 'Sample product' }).textContent).toBe('Chưa có hình ảnh');
  });
});
