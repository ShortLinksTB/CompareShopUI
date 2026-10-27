/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import stylesheet from './styles.css?inline';

describe('Product Detail presentation CSS', () => {
  it('keeps Product Detail in the fixed light native control scheme', () => {
    expect(stylesheet).toMatch(/\.light-shell, \.product-shell, \.shop-shell, \.blog-shell\s*\{\s*color-scheme:\s*light;/);
    expect(stylesheet).not.toContain('.product-shell {');
    expect(stylesheet).not.toContain('prefers-color-scheme');
  });

  it('keeps the product error actions in a centered column with a 12px gap', () => {
    expect(stylesheet).toMatch(/\.product-error-state\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;\s*align-items:\s*center;\s*gap:\s*12px;?\s*\}/);
  });
});
