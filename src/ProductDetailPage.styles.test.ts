/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import stylesheet from './styles.css?inline';

describe('Product Detail presentation CSS', () => {
  it('uses a light GiaTot wordmark color in the dark theme', () => {
    expect(stylesheet).toMatch(/\.product-shell \.brand\s*\{\s*color:\s*#f3f4f6;\s*\}/);
  });

  it('keeps the product error actions in a centered column with a 12px gap', () => {
    expect(stylesheet).toMatch(/\.product-error-state\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;\s*align-items:\s*center;\s*gap:\s*12px;?\s*\}/);
  });
});
