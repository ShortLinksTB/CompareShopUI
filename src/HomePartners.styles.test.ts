/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import stylesheet from './styles.css?inline';

describe('HomePartners fixed-light presentation', () => {
  it('keeps the partners section, heading, wordmarks, and benefit cards on fixed-light tokens', () => {
    expect(stylesheet).toMatch(/\.home-shell \.partners \{[^}]*background:\s*#fff8f3[^}]*color:\s*#171b24/);
    expect(stylesheet).toMatch(/\.home-shell \.partners \.eyebrow \{[^}]*color:\s*#c2410c/);
    expect(stylesheet).toMatch(/\.home-shell \.partners > \.partners-heading \{[^}]*display:\s*block[^}]*text-align:\s*center/);
    expect(stylesheet).toMatch(/\.home-shell \.partners-heading p \{[^}]*color:\s*#6b7280/);
    expect(stylesheet).toMatch(/\.home-shell \.partner-card \{[^}]*background:\s*#fff/);
    expect(stylesheet).toMatch(/\.home-shell \.partner-wordmark \{[^}]*color:\s*#626873[^}]*filter:\s*grayscale\(1\)/);
    expect(stylesheet).toMatch(/\.home-shell \.partner-card:hover \.partner-wordmark \{[^}]*color:\s*#c2410c[^}]*filter:\s*none/);
    expect(stylesheet).toMatch(/\.home-shell \.trust-grid > \.trust-card \{[^}]*background:\s*#fff/);
    expect(stylesheet).toMatch(/\.home-shell \.trust-card > span:not\(\.trust-icon\) \{[^}]*border:\s*0/);
    expect(stylesheet).toMatch(/\.home-shell \.trust-card small \{[^}]*color:\s*#6b7280/);
    const homepageStyles = stylesheet.slice(stylesheet.indexOf('.home-shell .partners {'), stylesheet.indexOf('.detail-wishlist-heart'));
    expect(homepageStyles).not.toMatch(/prefers-color-scheme:\s*dark/);
  });
});
