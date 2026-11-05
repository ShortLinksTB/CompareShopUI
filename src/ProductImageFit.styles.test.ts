// @vitest-environment jsdom
/// <reference types="vite/client" />
import { afterEach, describe, expect, it } from 'vitest';

import stylesheet from './styles.css?inline';

describe('product image fit CSS', () => {
  afterEach(() => {
    document.getElementById('product-image-fit-test-styles')?.remove();
    document.body.replaceChildren();
  });

  it('crops homepage featured, compare, and wishlist images without changing their containers', () => {
    const style = document.createElement('style');
    style.id = 'product-image-fit-test-styles';
    style.textContent = stylesheet;
    document.head.append(style);

    document.body.innerHTML = `
      <div class="home-shell"><img class="hero-featured-image" /></div>
      <img class="compare-image-placeholder" />
      <div class="wishlist-page"><div class="wishlist-item"><img /></div></div>
    `;

    const [homeImage, compareImage, wishlistImage] = Array.from(document.querySelectorAll('img'));
    expect(getComputedStyle(homeImage).objectFit).toBe('cover');
    expect(getComputedStyle(compareImage).objectFit).toBe('cover');
    expect(getComputedStyle(wishlistImage).objectFit).toBe('cover');
    expect(getComputedStyle(homeImage).width).toBe('38px');
    expect(getComputedStyle(homeImage).height).toBe('38px');
    expect(getComputedStyle(compareImage).width).toBe('100px');
    expect(getComputedStyle(compareImage).height).toBe('95px');
    expect(getComputedStyle(wishlistImage).width).toBe('72px');
    expect(getComputedStyle(wishlistImage).height).toBe('72px');
  });
});
