const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';

export interface SearchCategory {
  id: number;
  slug: string;
  name: string;
  parentId?: number | null;
}

export interface SearchProduct {
  id: number;
  slug: string;
  name: string;
  imageUrl: string | null;
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

  // The API returns root categories by default. Category pages can target
  // nested categories, so walk each parent's children before resolving slugs.
  const categories: SearchCategory[] = [];
  const visited = new Set<number>();
  let pending = result.items;
  while (pending.length) {
    const level = pending.filter(category => !visited.has(category.id));
    if (!level.length) break;
    level.forEach(category => {
      visited.add(category.id);
      categories.push(category);
    });
    const childResults = await Promise.all(level.map(async category => {
      const children = await get<{ items: SearchCategory[] }>(`/categories?parentId=${category.id}`);
      if (!children || !Array.isArray(children.items)) throw new Error('Invalid categories response');
      return children.items.filter(child => child.parentId === category.id
        && Number.isInteger(child.id)
        && typeof child.slug === 'string'
        && typeof child.name === 'string');
    }));
    pending = childResults.flat();
  }
  return categories;
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
  const result = await get<{ items: unknown[] }>(`/search/suggestions?${params}`);
  if (!result || !Array.isArray(result.items)) throw new Error('Invalid suggestions response');
  // The API returns product objects for matching products; older responses may
  // still contain plain strings. Keep the header UI's display model consistent.
  return result.items.flatMap(item => {
    if (typeof item === 'string') return [item];
    if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') return [item.name];
    return [];
  });
}

