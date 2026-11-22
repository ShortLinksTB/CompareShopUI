import { afterEach, describe, expect, it, vi } from 'vitest';

const api = 'https://api-compareshop-dev.giamha.online/api/v1/countries';
const countries = [
  { id: 1, code: 'VN', name: 'Vietnam' },
  { id: 2, code: 'ID', name: 'Indonesia' },
];

afterEach(() => vi.unstubAllGlobals());

describe('public country API', () => {
  it('loads a validated active country list from the API envelope', async () => {
    const { getActiveCountries } = await vi.importActual<typeof import('./countryApi')>('./countryApi');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: countries }) }));

    await expect(getActiveCountries()).resolves.toEqual(countries);
    expect(fetch).toHaveBeenCalledWith(api);
  });

  it('accepts a direct list and rejects malformed, duplicate, or empty country data', async () => {
    const { getActiveCountries } = await vi.importActual<typeof import('./countryApi')>('./countryApi');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => countries });
    vi.stubGlobal('fetch', fetchMock);
    await expect(getActiveCountries()).resolves.toEqual(countries);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ ...countries[0], code: 'vietnam' }] }) });
    await expect(getActiveCountries()).rejects.toThrow('Invalid countries response');
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [countries[0], countries[0]] }) });
    await expect(getActiveCountries()).rejects.toThrow('No active countries are available');
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
    await expect(getActiveCountries()).rejects.toThrow('No active countries are available');
  });

  it('surfaces failed responses and includes country context without dropping existing query values', async () => {
    const { getActiveCountries, withCountryContext } = await vi.importActual<typeof import('./countryApi')>('./countryApi');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));

    await expect(getActiveCountries()).rejects.toThrow('Country request failed (503)');
    expect(withCountryContext('/products?categoryId=12&page=2', 'ID')).toBe('/products?categoryId=12&page=2&country=ID');
    expect(withCountryContext('/products?country=VN&page=1', 'ID')).toBe('/products?country=ID&page=1');
  });
});
