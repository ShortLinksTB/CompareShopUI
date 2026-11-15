/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import stylesheet from './styles.css?inline';

describe('HomePartners fixed-light presentation', () => {
  it('keeps the warm section, white tiles, and readable text in every OS color scheme', () => {
    expect(stylesheet).toMatch(/\.home-shell \.partners \{[^}]*color-scheme:\s*light[^}]*background:\s*linear-gradient\(180deg,\s*#fff 0%,\s*#fffaf7 100%\)[^}]*color:\s*#171b24/);
    expect(stylesheet).toMatch(/\.home-shell \.partners-heading p \{[^}]*color:\s*#6b7280/);
    expect(stylesheet).toMatch(/\.home-shell \.partner-card \{[^}]*background:\s*#fff[^}]*box-shadow:/);
    expect(stylesheet).toMatch(/\.home-shell \.partner-wordmark \{[^}]*color:\s*#50545c/);
    expect(stylesheet).toMatch(/\.home-shell \.partner-card:hover \.partner-wordmark \{[^}]*color:\s*#c2410c/);
    expect(stylesheet).toMatch(/\.home-shell \.trust-grid > \.trust-card \{[^}]*background:\s*#fff[^}]*color:\s*#171b24/);
    expect(stylesheet).toMatch(/\.home-shell \.trust-card b \{[^}]*color:\s*#171b24/);
    expect(stylesheet).toMatch(/\.home-shell \.trust-card small \{[^}]*color:\s*#6b7280/);
    expect(stylesheet).toMatch(/\.home-shell \.trust-card \.trust-icon \{[^}]*background:\s*#fff3eb[^}]*color:\s*#c2410c/);
    expect(stylesheet).not.toMatch(/:root(?:\[data-theme="dark"\]|:not\(\[data-theme="light"\]\)) \.home-shell \.partners/);
  });
});
