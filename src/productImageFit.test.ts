// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import stylesheet from './styles.css?inline';

afterEach(() => {
  document.head.querySelector('[data-product-image-fit-test]')?.remove();
  document.body.innerHTML = '';
});

it('preserves image proportions in featured, compare, and wishlist image boxes', () => {
  const style = document.createElement('style');
  style.dataset.productImageFitTest = 'true';
  style.textContent = stylesheet;
  document.head.append(style);
  document.body.innerHTML = `
    <main class="home-shell"><img class="hero-featured-image" /></main>
    <img class="compare-image-placeholder" />
    <main class="wishlist-page"><div class="wishlist-item"><img class="safe-image-fallback" /></div></main>
  `;

  const images = Array.from(document.querySelectorAll('img'));
  expect(images).toHaveLength(3);
  expect(images.map(image => getComputedStyle(image).objectFit)).toEqual(['cover', 'cover', 'cover']);
});
