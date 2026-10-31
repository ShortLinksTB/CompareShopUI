// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

const oidc = vi.hoisted(() => ({
  signinRedirect: vi.fn<(args: unknown) => Promise<void>>(),
  signinCallback: vi.fn<() => Promise<{ state?: unknown; profile?: { nonce?: string } }>>(),
  constructor: vi.fn(),
  storageStore: vi.fn(),
}));

vi.mock('oidc-client-ts', () => ({
  WebStorageStateStore: class {
    constructor(settings: unknown) {
      oidc.storageStore(settings);
    }
  },
  UserManager: class {
    constructor(settings: unknown) {
      oidc.constructor(settings);
    }
    signinRedirect = oidc.signinRedirect;
    signinCallback = oidc.signinCallback;
  },
}));

import { completeSignInCallback, getSafeReturnPath, startSignIn } from './authClient';

describe('auth callback return path validation', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    delete window.__APP_CONFIG__;
    vi.clearAllMocks();
  });

  it.each([
    ['/wishlist?tab=saved#items', '/wishlist?tab=saved#items'],
    ['https://attacker.example/steal', '/'],
    ['//attacker.example/steal', '/'],
    ['/\\\\attacker.example/steal', '/'],
    ['/auth/callback?code=leak', '/'],
    [null, '/'],
  ])('maps %s to a same-origin app path', (input, expected) => {
    expect(getSafeReturnPath(input, 'https://compareshop.example')).toBe(expected);
  });

  it('rejects runtime config whose authority does not match its realm', async () => {
    window.__APP_CONFIG__ = {
      KEYCLOAK_URL: 'https://keycloak.example/realms/another-realm',
      KEYCLOAK_REALM: 'shortlink',
      KEYCLOAK_CLIENT_ID: 'compareshop-public-ui',
    };

    await expect(startSignIn('/wishlist')).rejects.toThrow('does not match the approved realm');
    expect(oidc.signinRedirect).not.toHaveBeenCalled();
  });

  it('uses approved runtime config and starts a PKCE redirect with the validated return path', async () => {
    window.__APP_CONFIG__ = {
      KEYCLOAK_URL: 'https://keycloak.example/realms/shortlink',
      KEYCLOAK_REALM: 'shortlink',
      KEYCLOAK_CLIENT_ID: 'compareshop-public-ui',
    };
    oidc.signinRedirect.mockResolvedValue();

    await startSignIn('/wishlist');

    expect(oidc.constructor).toHaveBeenCalledWith(expect.objectContaining({
      authority: 'https://keycloak.example/realms/shortlink',
      client_id: 'compareshop-public-ui',
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: 'code',
      filterProtocolClaims: false,
    }));
    const request = oidc.signinRedirect.mock.calls.at(-1)?.[0] as { nonce: string; state: { returnTo: string; nonce: string } };
    expect(request.nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(request.state).toEqual({ returnTo: '/wishlist', nonce: request.nonce });
    expect(window.sessionStorage.getItem('compareshop.auth.returnTo')).toBe('/wishlist');
  });

  it('accepts a confirmed callback and clears the saved return path', async () => {
    window.__APP_CONFIG__ = {
      KEYCLOAK_URL: 'https://keycloak.example/realms/shortlink',
      KEYCLOAK_REALM: 'shortlink',
      KEYCLOAK_CLIENT_ID: 'compareshop-public-ui',
    };
    window.sessionStorage.setItem('compareshop.auth.returnTo', '/wishlist');
    oidc.signinCallback.mockResolvedValue({ state: { returnTo: '/wishlist', nonce: 'verified-nonce' }, profile: { nonce: 'verified-nonce' } });

    await expect(completeSignInCallback()).resolves.toBe('/wishlist');
    expect(window.sessionStorage.getItem('compareshop.auth.returnTo')).toBeNull();
  });

  it('rejects a callback when the ID-token nonce does not match the sign-in transaction', async () => {
    window.__APP_CONFIG__ = {
      KEYCLOAK_URL: 'https://keycloak.example/realms/shortlink',
      KEYCLOAK_REALM: 'shortlink',
      KEYCLOAK_CLIENT_ID: 'compareshop-public-ui',
    };
    oidc.signinCallback.mockResolvedValue({ state: { returnTo: '/wishlist', nonce: 'expected-nonce' }, profile: { nonce: 'different-nonce' } });

    await expect(completeSignInCallback()).rejects.toThrow('nonce could not be confirmed');
  });
});
