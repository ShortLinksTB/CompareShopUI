import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { getAuthConfig } from './runtimeConfig';

const RETURN_TO_KEY = 'compareshop.auth.returnTo';
let manager: UserManager | undefined;
let callbackTask: Promise<string> | undefined;

function getManager() {
  if (!manager) {
    const config = getAuthConfig();
    manager = new UserManager({
      authority: config.authority,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      // Keep nonce available for the adapter assertion while retaining
      // oidc-client-ts filtering for the other optional protocol claims.
      filterProtocolClaims: ['nbf', 'jti', 'auth_time', 'acr', 'amr', 'azp', 'at_hash'],
      automaticSilentRenew: false,
      monitorSession: false,
      loadUserInfo: false,
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    });
  }
  return manager;
}

function createNonce(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function getSafeReturnPath(value: unknown, origin = window.location.origin): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.pathname === '/auth/callback' || url.pathname.startsWith('/auth/callback/')) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

export async function startSignIn(returnTo: unknown): Promise<void> {
  const safePath = getSafeReturnPath(returnTo);
  const nonce = createNonce();
  window.sessionStorage.setItem(RETURN_TO_KEY, safePath);
  await getManager().signinRedirect({ nonce, state: { returnTo: safePath, nonce } });
}

export function getPendingReturnPath(): string {
  return getSafeReturnPath(window.sessionStorage.getItem(RETURN_TO_KEY));
}

export function completeSignInCallback(): Promise<string> {
  if (!callbackTask) {
    let task: Promise<string>;
    task = Promise.resolve().then(() => getManager().signinCallback()).then(user => {
      if (!user) throw new Error('The sign-in response could not be confirmed.');
      const state = user.state as { returnTo?: unknown; nonce?: unknown } | undefined;
      if (typeof state?.nonce !== 'string' || !state.nonce || user.profile.nonce !== state.nonce) {
        throw new Error('The sign-in response nonce could not be confirmed.');
      }
      const returnTo = getSafeReturnPath(state?.returnTo ?? window.sessionStorage.getItem(RETURN_TO_KEY));
      window.sessionStorage.removeItem(RETURN_TO_KEY);
      return returnTo;
    }).finally(() => {
      queueMicrotask(() => { if (callbackTask === task) callbackTask = undefined; });
    });
    callbackTask = task;
  }
  return callbackTask;
}
