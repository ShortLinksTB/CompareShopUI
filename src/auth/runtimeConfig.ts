export interface PublicRuntimeConfig {
  AUTH_API_URL?: string;
  TURNSTILE_ENABLED?: boolean;
  TURNSTILE_SITE_KEY?: string;
  AUTH_MOCK_ENABLED?: boolean;
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
  const baseUrl = readConfigValue(runtime?.AUTH_API_URL, import.meta.env.VITE_AUTH_API_URL);
  const turnstileEnabled = runtime?.TURNSTILE_ENABLED ?? import.meta.env.VITE_TURNSTILE_ENABLED === 'true';
  const siteKey = readConfigValue(runtime?.TURNSTILE_SITE_KEY, import.meta.env.VITE_TURNSTILE_SITE_KEY);
  const mockEnabled = import.meta.env.DEV && (runtime?.AUTH_MOCK_ENABLED ?? import.meta.env.VITE_AUTH_MOCK_ENABLED === 'true');
  return { baseUrl: baseUrl.replace(/\/$/, ''), turnstileEnabled, turnstileSiteKey: siteKey, mockEnabled };
}
