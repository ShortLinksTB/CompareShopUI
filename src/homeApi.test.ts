import { afterEach, expect, it, vi } from 'vitest';
import { getHomeData } from './homeApi';

afterEach(() => vi.unstubAllGlobals());

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

it('uses the same fetch function for requests in one home data load', async () => {
  let resolveCategories!: (response: Response) => void;
  const firstFetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/categories?country=VN')) return new Promise<Response>(resolve => { resolveCategories = resolve; });
    if (url.endsWith('/home/showcase?country=VN')) return Promise.resolve(jsonResponse({ featured: [], interestedComputers: [] }));
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  const replacementFetch = vi.fn(() => Promise.reject(new Error('A later fetch replacement must not receive this request')));
  vi.stubGlobal('fetch', firstFetch);

  const homeData = getHomeData(undefined, 'VN');
  vi.stubGlobal('fetch', replacementFetch);
  resolveCategories(jsonResponse({ items: [] }));

  await expect(homeData).resolves.toMatchObject({ products: [], computerProducts: [] });
  expect(firstFetch.mock.calls.map(([url]) => String(url).split('/').pop())).toEqual(['categories?country=VN', 'showcase?country=VN']);
  expect(replacementFetch).not.toHaveBeenCalled();
});
