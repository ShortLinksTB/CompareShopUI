/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import stylesheet from './styles.css?inline';

describe('Product Detail presentation CSS', () => {
  it('uses the fixed light color scheme independently of OS preference', () => {
    expect(stylesheet).toMatch(/\.light-shell\{[^}]*color-scheme:light/);
    expect(stylesheet).not.toMatch(/prefers-color-scheme/);
  });

  it('keeps the product error actions in a centered column with a 12px gap', () => {
    expect(stylesheet).toMatch(/\.product-error-state\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;\s*align-items:\s*center;\s*gap:\s*12px;?\s*\}/);
  });
});
