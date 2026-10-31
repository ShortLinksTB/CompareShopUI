import Keycloak, { type KeycloakInstance } from 'keycloak-js';

declare global {
  interface Window {
    __APP_CONFIG__?: {
      VITE_KEYCLOAK_URL?: string;
      VITE_KEYCLOAK_REALM?: string;
      VITE_KEYCLOAK_CLIENT_ID?: string;
    };
  }
}

const RETURN_TO_KEY = 'compareshop.auth.returnTo';
const CALLBACK_PATH = '/auth/callback';

export function getSafeReturnPath(value: string | null | undefined, origin = window.location.origin): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f]/.test(value)) return '/';
  try {
    const target = new URL(value, origin);
    return target.origin === origin && target.pathname.startsWith('/') ? `${target.pathname}${target.search}${target.hash}` : '/';
  } catch {
    return '/';
  }
}

function getAuthConfig() {
  const runtime = window.__APP_CONFIG__;
  const url = runtime?.VITE_KEYCLOAK_URL || import.meta.env.VITE_KEYCLOAK_URL;
  const realm = runtime?.VITE_KEYCLOAK_REALM || import.meta.env.VITE_KEYCLOAK_REALM;
  const clientId = runtime?.VITE_KEYCLOAK_CLIENT_ID || import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
  if (!url || !realm || !clientId) throw new Error('Sign-in is not configured.');
  return { url, realm, clientId };
}

let client: KeycloakInstance | undefined;
let initialization: Promise<boolean> | undefined;

function getClient() {
  if (!client) client = new Keycloak(getAuthConfig());
  return client;
}

export function initializeAuthCallback() {
  if (!initialization) {
    initialization = getClient().init({
      pkceMethod: 'S256',
      responseMode: 'query',
      redirectUri: `${window.location.origin}${CALLBACK_PATH}`,
      checkLoginIframe: false,
    });
  }
  return initialization;
}

export async function beginSignIn(returnPath: string) {
  const safePath = getSafeReturnPath(returnPath);
  window.sessionStorage.setItem(RETURN_TO_KEY, safePath);
  await getClient().login({ redirectUri: `${window.location.origin}${CALLBACK_PATH}` });
}

export function consumeReturnPath() {
  const saved = window.sessionStorage.getItem(RETURN_TO_KEY);
  window.sessionStorage.removeItem(RETURN_TO_KEY);
  return getSafeReturnPath(saved);
}

export function getAccessToken() {
  return client?.token ?? null;
}
