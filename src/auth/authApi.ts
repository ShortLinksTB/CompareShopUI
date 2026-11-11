import { getAuthConfig } from './runtimeConfig';

export interface AuthUser { id: string; email: string; displayName: string; emailVerified: boolean }
export interface AuthResult { accessToken: string; user: AuthUser }
export type AuthOperation = 'register' | 'verify-email' | 'resend-verification' | 'login' | 'refresh' | 'logout' | 'forgot-password' | 'verify-reset-code' | 'reset-password' | 'me';

export class AuthApiError extends Error {
  constructor(readonly status: number, readonly code: string, message = 'Yêu cầu chưa thể hoàn tất. Vui lòng thử lại.') { super(message); this.name = 'AuthApiError'; }
}

let accessToken: string | null = null;
let refreshTask: Promise<string | null> | null = null;
const mockAccounts = new Map<string, { password: string; displayName: string; verified: boolean }>();
const MOCK_TOKEN = 'development-only-memory-token';
let mockPendingEmail = '';
let mockCurrentEmail = '';

function apiBase() {
  const { baseUrl, mockEnabled } = getAuthConfig();
  if (!baseUrl && !mockEnabled) throw new Error('Auth service is unavailable.');
  return baseUrl;
}

async function request<T>(operation: AuthOperation, method: 'GET' | 'POST', body?: Record<string, unknown>, retry = true): Promise<T> {
  const config = getAuthConfig();
  if (config.mockEnabled && !config.baseUrl) return mockRequest<T>(operation, body ?? {});
  const base = apiBase();
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/auth/${operation}`, {
      method, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch { throw new AuthApiError(0, 'service_unavailable', 'Không thể kết nối dịch vụ xác thực. Vui lòng thử lại.'); }
  if (response.status === 401 && retry && operation !== 'login' && operation !== 'refresh' && operation !== 'verify-reset-code') {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(operation, method, body, false);
    accessToken = null;
  }
  let data: Record<string, unknown> = {};
  try { data = await response.json() as Record<string, unknown>; } catch { /* use generic message */ }
  if (!response.ok) {
    const code = typeof data.code === 'string' ? data.code : 'request_failed';
    const messages: Record<string, string> = {
      invalid_credentials: 'Email hoặc mật khẩu chưa đúng.', email_not_verified: 'Bạn cần xác minh email trước khi đăng nhập.',
      account_locked: 'Tài khoản tạm thời bị khoá. Hãy đặt lại mật khẩu hoặc thử lại sau.', captcha_failed: 'Xác minh bảo mật chưa hoàn tất. Vui lòng thử lại.',
      invalid_or_expired_code: 'Mã không đúng hoặc đã hết hạn.', reset_session_expired: 'Phiên đặt lại mật khẩu đã hết hạn. Hãy yêu cầu mã mới.',
    };
    throw new AuthApiError(response.status, code, messages[code] ?? 'Yêu cầu chưa thể hoàn tất. Vui lòng thử lại.');
  }
  if (operation === 'login' || operation === 'refresh') {
    const token = typeof data.accessToken === 'string' ? data.accessToken : '';
    const user = data.user as Record<string, unknown> | undefined;
    if (!token || (operation === 'login' && (!user || typeof user.id !== 'string' || typeof user.email !== 'string' || typeof user.displayName !== 'string'))) {
      throw new AuthApiError(502, 'invalid_response', 'Không thể xác nhận phiên đăng nhập. Vui lòng thử lại.');
    }
    accessToken = token;
  }
  if ((operation === 'register' || operation === 'resend-verification' || operation === 'forgot-password') && data.accepted !== true) throw new AuthApiError(502, 'invalid_response');
  if (operation === 'verify-reset-code' && typeof data.resetToken !== 'string') throw new AuthApiError(502, 'invalid_response');
  if (operation === 'me' && (typeof data.id !== 'string' || typeof data.email !== 'string' || typeof data.displayName !== 'string')) throw new AuthApiError(502, 'invalid_response');
  return data as T;
}

async function mockRequest<T>(operation: AuthOperation, body: Record<string, unknown>): Promise<T> {
  await new Promise(resolve => window.setTimeout(resolve, 120));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const account = mockAccounts.get(email);
  switch (operation) {
    case 'register': mockPendingEmail = email; mockAccounts.set(email, { password: String(body.password ?? ''), displayName: String(body.displayName ?? email.split('@')[0]), verified: false }); return { accepted: true } as T;
    case 'verify-email': { const pending = mockAccounts.get(mockPendingEmail); if (pending) pending.verified = true; return { verified: true } as T; }
    case 'resend-verification': case 'forgot-password': return { accepted: true } as T;
    case 'login':
      if (!account || account.password !== body.password) throw new AuthApiError(401, 'invalid_credentials', 'Email hoặc mật khẩu chưa đúng.');
      if (!account.verified) throw new AuthApiError(403, 'email_not_verified', 'Bạn cần xác minh email trước khi đăng nhập.');
      accessToken = MOCK_TOKEN; mockCurrentEmail = email;
      return { accessToken: MOCK_TOKEN, user: { id: email, email, displayName: account.displayName, emailVerified: true } } as T;
    case 'refresh': if (accessToken) return { accessToken } as T; throw new AuthApiError(401, 'session_expired');
    case 'logout': accessToken = null; mockCurrentEmail = ''; return {} as T;
    case 'verify-reset-code': return { resetToken: 'development-only-reset-token' } as T;
    case 'reset-password': return { reset: true } as T;
    case 'me': { const current = mockAccounts.get(mockCurrentEmail); if (accessToken && current) return { id: mockCurrentEmail, email: mockCurrentEmail, displayName: current.displayName, emailVerified: true } as T; throw new AuthApiError(401, 'session_expired'); }
    default: throw new AuthApiError(0, 'service_unavailable', 'Dịch vụ xác thực chưa được cấu hình.');
  }
}

export const authApi = {
  register: (input: { email: string; password: string; displayName?: string; captchaToken?: string }) => request<{ accepted: true }>('register', 'POST', input),
  verifyEmail: (token: string) => request<{ verified: true }>('verify-email', 'POST', { token }),
  resendVerification: (email: string, captchaToken?: string) => request<{ accepted: true }>('resend-verification', 'POST', { email, ...(captchaToken ? { captchaToken } : {}) }),
  login: (input: { email: string; password: string; captchaToken?: string }) => request<AuthResult>('login', 'POST', input),
  refresh: () => request<{ accessToken: string }>('refresh', 'POST', {}),
  logout: () => request<Record<string, never>>('logout', 'POST', {}),
  forgotPassword: (email: string, captchaToken?: string) => request<{ accepted: true }>('forgot-password', 'POST', { email, ...(captchaToken ? { captchaToken } : {}) }),
  verifyResetCode: (email: string, code: string) => request<{ resetToken: string }>('verify-reset-code', 'POST', { email, code }),
  resetPassword: (resetToken: string, newPassword: string) => request<{ reset: true }>('reset-password', 'POST', { resetToken, newPassword }),
  me: () => request<AuthUser>('me', 'GET'),
  async getAccessToken() { if (accessToken) return accessToken; return refreshAccessToken(); },
  clear() { accessToken = null; },
};

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshTask) {
    refreshTask = authApi.refresh().then(result => { accessToken = result.accessToken; return accessToken; }).catch(() => { accessToken = null; return null; }).finally(() => { refreshTask = null; });
  }
  return refreshTask;
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit, initialToken: string): Promise<Response> {
  const token = accessToken ?? initialToken;
  const headers = mergeBearerHeader(init.headers, token);
  const response = await fetch(input, { ...init, headers });
  if (response.status !== 401) return response;
  const freshToken = await refreshAccessToken();
  if (!freshToken) return response;
  const retryHeaders = mergeBearerHeader(init.headers, freshToken);
  return fetch(input, { ...init, headers: retryHeaders });
}

function mergeBearerHeader(headers: HeadersInit | undefined, token: string): Record<string, string> {
  const values: Record<string, string> = {};
  if (headers instanceof Headers) headers.forEach((value, key) => { values[key] = value; });
  else if (Array.isArray(headers)) headers.forEach(([key, value]) => { values[key] = value; });
  else if (headers) Object.assign(values, headers);
  values.Authorization = `Bearer ${token}`;
  return values;
}

export function getSafeReturnPath(value: unknown, origin = window.location.origin): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  try { const url = new URL(value, origin); if (url.origin !== origin || ['/login', '/register', '/verify-email', '/forgot-password'].includes(url.pathname) || url.pathname.startsWith('/auth/')) return '/'; return `${url.pathname}${url.search}${url.hash}`; } catch { return '/'; }
}
