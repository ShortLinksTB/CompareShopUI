/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import stylesheet from './styles.css?inline';

describe('HomePartners dark theme presentation', () => {
  it('keeps the heading, description, logos, and benefit cards readable on dark surfaces', () => {
    expect(stylesheet).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)[\s\S]*?\.home-shell \.partners \{[^}]*color:#f3f4f6/);
    expect(stylesheet).toMatch(/\.home-shell \.partners \.eyebrow[^}]*color:#fb923c/);
    expect(stylesheet).toMatch(/\.home-shell \.partners-heading p[^}]*color:#c3cad5/);
    expect(stylesheet).toMatch(/\.home-shell \.partner-wordmark[^}]*color:#d1d5db/);
    expect(stylesheet).toMatch(/\.home-shell \.trust-card b[^}]*color:#f3f4f6/);
    expect(stylesheet).toMatch(/\.home-shell \.trust-card small[^}]*color:#c3cad5/);
    expect(stylesheet).toMatch(/\.home-shell \.trust-card \.trust-icon[^}]*color:#fdba74/);
  });

  it('retains the light theme surfaces and foreground defaults', () => {
    expect(stylesheet).toMatch(/\.home-shell \.partner-card \{[^}]*background:\s*#fff/);
    expect(stylesheet).toMatch(/\.home-shell \.trust-grid > \.trust-card \{[^}]*background:\s*#fff/);
    expect(stylesheet).toMatch(/\.home-shell \.partner-wordmark \{[^}]*color:\s*#50545c/);
  });
});
