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
      automaticSilentRenew: false,
      monitorSession: false,
      loadUserInfo: false,
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    });
  }
  return manager;
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
  window.sessionStorage.setItem(RETURN_TO_KEY, safePath);
  await getManager().signinRedirect({ state: { returnTo: safePath } });
}

export function getPendingReturnPath(): string {
  return getSafeReturnPath(window.sessionStorage.getItem(RETURN_TO_KEY));
}

export function completeSignInCallback(): Promise<string> {
  if (!callbackTask) {
    let task: Promise<string>;
    task = Promise.resolve().then(() => getManager().signinCallback()).then(user => {
      if (!user) throw new Error('The sign-in response could not be confirmed.');
      const state = user.state as { returnTo?: unknown } | undefined;
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
