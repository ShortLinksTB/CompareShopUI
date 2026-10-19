const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';

export interface SearchCategory {
  id: number;
  slug: string;
  name: string;
}

export interface SearchProduct {
  id: number;
  slug: string;
  name: string;
  brand: string | null;
  category: { id: number; slug: string; name: string };
  offerSummary: { minPrice: number | null; maxPrice: number | null; offerCount: number };
}

export interface ProductPage {
  items: SearchProduct[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getCategories(): Promise<SearchCategory[]> {
  const result = await get<{ items: SearchCategory[] }>('/categories');
  if (!result || !Array.isArray(result.items)) throw new Error('Invalid categories response');
  return result.items;
}

export async function getProducts(options: {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
}): Promise<ProductPage> {
  const params = new URLSearchParams({ page: String(options.page), pageSize: String(options.pageSize) });
  if (options.search) params.set('search', options.search);
  if (options.categoryId !== undefined) params.set('categoryId', String(options.categoryId));
  if (options.minPrice !== undefined) params.set('minPrice', String(options.minPrice));
  if (options.maxPrice !== undefined) params.set('maxPrice', String(options.maxPrice));
  const result = await get<ProductPage>(`/products?${params}`);
  if (!result || !Array.isArray(result.items)) throw new Error('Invalid products response');
  return result;
}

export async function getSearchSuggestions(query: string, limit = 5): Promise<string[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const result = await get<{ items: string[] }>(`/search/suggestions?${params}`);
  if (!result || !Array.isArray(result.items)) throw new Error('Invalid suggestions response');
  return result.items;
}

