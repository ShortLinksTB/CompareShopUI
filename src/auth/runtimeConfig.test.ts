// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthConfig } from './runtimeConfig';

afterEach(() => {
  delete window.__APP_CONFIG__;
  vi.unstubAllEnvs();
});

describe('public auth runtime configuration', () => {
  it('prefers Helm runtime values and derives the callback from the current origin', () => {
    window.__APP_CONFIG__ = {
      KEYCLOAK_URL: 'https://keycloak.example/realms/shortlink',
      KEYCLOAK_REALM: 'shortlink',
      KEYCLOAK_CLIENT_ID: 'runtime-public-client',
    };
    vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', 'local-fallback-client');

    expect(getAuthConfig()).toEqual({
      authority: 'https://keycloak.example/realms/shortlink',
      clientId: 'runtime-public-client',
      redirectUri: `${window.location.origin}/auth/callback`,
    });
  });

  it('uses Vite values as the local-development fallback', () => {
    vi.stubEnv('VITE_KEYCLOAK_URL', 'https://keycloak.example/realms/shortlink');
    vi.stubEnv('VITE_KEYCLOAK_REALM', 'shortlink');
    vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', 'local-public-client');

    expect(getAuthConfig().clientId).toBe('local-public-client');
  });

  it('rejects missing or incomplete public config', () => {
    vi.stubEnv('VITE_KEYCLOAK_URL', '');
    vi.stubEnv('VITE_KEYCLOAK_REALM', '');
    vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', '');

    expect(() => getAuthConfig()).toThrow('Public sign-in configuration is unavailable');
  });

  it('rejects malformed authority URLs and realm mismatches', () => {
    window.__APP_CONFIG__ = {
      KEYCLOAK_URL: 'not-a-url',
      KEYCLOAK_REALM: 'shortlink',
      KEYCLOAK_CLIENT_ID: 'runtime-public-client',
    };
    expect(() => getAuthConfig()).toThrow();

    window.__APP_CONFIG__.KEYCLOAK_URL = 'https://keycloak.example/realms/other';
    expect(() => getAuthConfig()).toThrow('does not match the approved realm');
  });
});
