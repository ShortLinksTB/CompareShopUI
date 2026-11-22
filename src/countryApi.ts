const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';

export interface ActiveCountry {
  id: number;
  code: string;
  name: string;
}

export function withCountryContext(path: string, country: string): string {
  const [pathname, query = ''] = path.split('?', 2);
  const params = new URLSearchParams(query);
  params.set('country', country);
  return `${pathname}?${params}`;
}

function isActiveCountry(value: unknown): value is ActiveCountry {
  if (!value || typeof value !== 'object') return false;
  const country = value as Record<string, unknown>;
  return Number.isInteger(country.id)
    && typeof country.code === 'string'
    && /^[A-Z]{2}$/.test(country.code)
    && typeof country.name === 'string'
    && country.name.trim().length > 0;
}

export async function getActiveCountries(): Promise<ActiveCountry[]> {
  const response = await fetch(`${API_BASE_URL}/countries`);
  if (!response.ok) throw new Error(`Country request failed (${response.status})`);
  const payload: unknown = await response.json();
  const countries = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)
      ? (payload as { items: unknown[] }).items
      : null;
  if (!countries || !countries.every(isActiveCountry)) throw new Error('Invalid countries response');

  const uniqueCodes = new Set(countries.map(country => country.code));
  if (uniqueCodes.size !== countries.length || countries.length === 0) throw new Error('No active countries are available');
  return countries;
}
