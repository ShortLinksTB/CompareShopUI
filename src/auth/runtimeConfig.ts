export interface PublicRuntimeConfig {
  KEYCLOAK_URL?: string;
  KEYCLOAK_REALM?: string;
  KEYCLOAK_CLIENT_ID?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: PublicRuntimeConfig;
  }
}

function readConfigValue(runtimeValue: string | undefined, localValue: string | undefined): string {
  return runtimeValue?.trim() || localValue?.trim() || '';
}

export function getAuthConfig() {
  const runtime = window.__APP_CONFIG__;
  const baseUrl = readConfigValue(runtime?.KEYCLOAK_URL, import.meta.env.VITE_KEYCLOAK_URL);
  const realm = readConfigValue(runtime?.KEYCLOAK_REALM, import.meta.env.VITE_KEYCLOAK_REALM);
  const clientId = readConfigValue(runtime?.KEYCLOAK_CLIENT_ID, import.meta.env.VITE_KEYCLOAK_CLIENT_ID);

  if (!baseUrl || !realm || !clientId) {
    throw new Error('Public sign-in configuration is unavailable.');
  }

  const authority = baseUrl.replace(/\/$/, '');
  if (new URL(authority).pathname.replace(/\/$/, '') !== `/realms/${realm}`) {
    throw new Error('Public sign-in configuration does not match the approved realm.');
  }

  return {
    authority,
    clientId,
    redirectUri: `${window.location.origin}/auth/callback`,
  };
}
