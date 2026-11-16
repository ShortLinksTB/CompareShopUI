/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import stylesheet from './styles.css?inline';

describe('Product Detail presentation CSS', () => {
  it('keeps Product Detail in the fixed light native control scheme', () => {
    expect(stylesheet).toMatch(/\.light-shell, \.product-shell, \.shop-shell, \.blog-shell\s*\{\s*color-scheme:\s*light;/);
    expect(stylesheet).not.toContain('.product-shell {');
    expect(stylesheet).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)[\s\S]*?\.site-header/);
  });

  it('keeps the product error actions in a centered column with a 12px gap', () => {
    expect(stylesheet).toMatch(/\.product-error-state\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;\s*align-items:\s*center;\s*gap:\s*12px;?\s*\}/);
  });

  it('contains the main product image at tablet widths without changing other breakpoints', () => {
    const conflictingSelector = '.detail-gallery>.detail-image-placeholder:not(.safe-image-fallback)';
    const tabletSelector = '.detail-gallery>img.detail-image-placeholder:not(.safe-image-fallback)';
    const specificity = (selector: string) => [
      (selector.match(/#[\w-]+/g) ?? []).length,
      (selector.match(/\.[\w-]+|:[\w-]+/g) ?? []).length,
      (selector.match(/(?:^|[>+~\s])(?:[a-z][\w-]*)/gi) ?? []).length,
    ];
    const conflictingSpecificity = specificity(conflictingSelector);
    const tabletSpecificity = specificity(tabletSelector);
    const tabletRulePattern = /@media\s*\(min-width:\s*640px\)\s*and\s*\(max-width:\s*900px\)\s*\{\s*\.detail-gallery>img\.detail-image-placeholder:not\(\.safe-image-fallback\)\s*\{\s*object-fit:\s*contain;?\s*\}\s*\}/;

    expect(stylesheet).toMatch(tabletRulePattern);
    expect(stylesheet).toMatch(/\.detail-gallery>\.detail-image-placeholder:not\(\.safe-image-fallback\)\s*\{\s*object-fit:\s*cover/);
    expect(tabletSpecificity).toEqual([conflictingSpecificity[0], conflictingSpecificity[1], conflictingSpecificity[2] + 1]);
    expect(stylesheet).toMatch(/\.detail-gallery img\s*\{[^}]*object-fit:\s*cover/);
  });
});
