// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

const keycloak = vi.hoisted(() => ({
  init: vi.fn<() => Promise<boolean>>(),
  login: vi.fn<() => Promise<void>>(),
  constructor: vi.fn(),
}));

vi.mock('keycloak-js', () => ({
  default: vi.fn(function (this: unknown, config: unknown) {
    keycloak.constructor(config);
    return { init: keycloak.init, login: keycloak.login, token: 'valid-access-token' };
  }),
}));

import { beginSignIn, consumeReturnPath, getAccessToken, getSafeReturnPath, initializeAuthCallback } from './authClient';

describe('getSafeReturnPath', () => {
  it('keeps local application paths including query and fragment', () => {
    expect(getSafeReturnPath('/wishlist?sort=recent#saved', 'https://shop.example')).toBe('/wishlist?sort=recent#saved');
  });

  it.each([null, undefined, '', 'https://attacker.example/path', '//attacker.example/path', '/\\attacker.example', 'javascript:alert(1)'])(
    'falls back to home for unsafe or missing return path %s', value => {
      expect(getSafeReturnPath(value, 'https://shop.example')).toBe('/');
    },
  );

  it('initializes the standards-based client with PKCE and the exact callback URI', async () => {
    window.__APP_CONFIG__ = {
      VITE_KEYCLOAK_URL: 'https://keycloak-shortlink-dev.giamha.online/realms/shortlink',
      VITE_KEYCLOAK_REALM: 'shortlink',
      VITE_KEYCLOAK_CLIENT_ID: 'compareshop-public-ui',
    };
    keycloak.init.mockResolvedValue(true);
    await expect(initializeAuthCallback()).resolves.toBe(true);
    expect(keycloak.constructor).toHaveBeenCalledWith({
      url: 'https://keycloak-shortlink-dev.giamha.online/realms/shortlink',
      realm: 'shortlink',
      clientId: 'compareshop-public-ui',
    });
    expect(keycloak.init).toHaveBeenCalledWith({
      pkceMethod: 'S256',
      responseMode: 'query',
      redirectUri: 'http://localhost:3000/auth/callback',
      checkLoginIframe: false,
    });
    expect(getAccessToken()).toBe('valid-access-token');
  });

  it('stores a sanitized return path, starts sign-in, and consumes it once', async () => {
    keycloak.login.mockResolvedValue();
    await beginSignIn('/wishlist?tab=saved');
    expect(keycloak.login).toHaveBeenCalledWith({ redirectUri: 'http://localhost:3000/auth/callback' });
    expect(consumeReturnPath()).toBe('/wishlist?tab=saved');
    expect(consumeReturnPath()).toBe('/');
  });
});
