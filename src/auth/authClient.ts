import { authApi, getSafeReturnPath } from './authApi';
import { setAuthSessionUser } from './AuthSession';

export { getSafeReturnPath };
export async function startSignIn(returnTo: unknown): Promise<void> {
  window.location.assign(`/login?returnTo=${encodeURIComponent(getSafeReturnPath(returnTo))}`);
}
export async function getAuthenticatedAccessToken(): Promise<string | null> { return authApi.getAccessToken(); }
export async function clearAuthenticatedSession(): Promise<void> { authApi.clear(); setAuthSessionUser(null); }
export function getPendingReturnPath(): string { return getSafeReturnPath(new URLSearchParams(window.location.search).get('returnTo')); }
export async function completeSignInCallback(): Promise<string> { throw new Error('No external sign-in callback is used by CompareShopAuthAPI.'); }
