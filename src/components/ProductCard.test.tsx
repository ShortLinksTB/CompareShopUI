// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import type { Product } from '../types';

const product: Product = {
  id: 'product-1', slug: 'sample-product', name: 'Sample Product', brand: 'Example',
  categoryId: 'phones', categoryName: 'Phones', images: [], description: '', rating: 4.5,
  reviewCount: 10, minPrice: 1200000, maxPrice: 1500000, offerCount: 2,
  specifications: [], status: 'active', updatedAt: '',
};

afterEach(() => { cleanup(); localStorage.clear(); });

describe('ProductCard', () => {
  it('keeps the product link and toggles the saved state', () => {
    render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Sample Product' }).getAttribute('href')).toBe('/product/sample-product');
    const save = screen.getByRole('button', { name: 'Thêm vào yêu thích' });
    fireEvent.click(save);
    expect(localStorage.getItem('wishlist-products')).toBe('["product-1"]');
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ khỏi yêu thích' }));
    expect(localStorage.getItem('wishlist-products')).toBe('[]');
  });

  it('calls the optional compare action with its product', () => {
    const onCompare = vi.fn();
    render(<MemoryRouter><ProductCard product={product} onCompare={onCompare} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '+ So sánh' }));
    expect(onCompare).toHaveBeenCalledWith(product);
  });
});
