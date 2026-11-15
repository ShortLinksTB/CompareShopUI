const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';

export interface HomeCategory {
  id: number;
  slug: string;
  name: string;
  productCount: number;
}

export interface HomeProduct {
  id: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  brand: string;
  category: { id: number; slug: string; name: string };
  offerSummary: { minPrice: number; maxPrice: number; offerCount: number };
}

interface PageDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface HomeShowcaseDto {
  featured: HomeProduct[];
  interestedComputers: HomeProduct[];
}

async function get<T>(path: string, fetcher: typeof fetch, init?: RequestInit): Promise<T> {
  const response = init ? await fetcher(`${API_BASE_URL}${path}`, init) : await fetcher(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

async function getHomeShowcase(previewToken: string | undefined, fetcher: typeof fetch): Promise<HomeShowcaseDto> {
  if (!previewToken) return get<HomeShowcaseDto>('/home/showcase', fetcher);

  return get<HomeShowcaseDto>('/home/showcase/preview', fetcher, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: previewToken }),
    cache: 'no-store',
  });
}

export async function getHomeData(previewToken?: string) {
  const fetcher = globalThis.fetch.bind(globalThis);
  const categoryResponse = await get<{ items: Omit<HomeCategory, 'productCount'>[] }>('/categories', fetcher);
  const [showcase, ...categoryCounts] = await Promise.all([
    getHomeShowcase(previewToken, fetcher),
    ...categoryResponse.items.map(category => get<PageDto<HomeProduct>>(`/products?categoryId=${category.id}&page=1&pageSize=1`, fetcher)),
  ]);
  const categories = categoryResponse.items.map((category, index) => ({
    ...category,
    productCount: categoryCounts[index].totalItems,
  }));
  return {
    categories,
    products: Array.isArray(showcase.featured) ? showcase.featured : [],
    computerProducts: Array.isArray(showcase.interestedComputers) ? showcase.interestedComputers : [],
  };
}
