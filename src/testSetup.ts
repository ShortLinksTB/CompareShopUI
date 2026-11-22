import { vi } from 'vitest';

vi.mock('./countryApi', async () => {
  const actual = await vi.importActual<typeof import('./countryApi')>('./countryApi');
  return {
    ...actual,
    getActiveCountries: vi.fn(async () => [
      { id: 1, code: 'VN', name: 'Vietnam' },
      { id: 2, code: 'ID', name: 'Indonesia' },
    ]),
  };
});
