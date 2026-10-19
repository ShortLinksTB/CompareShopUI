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

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getHomeData() {
  const categoryResponse = await get<{ items: Omit<HomeCategory, 'productCount'>[] }>('/categories');
  const [productResponse, ...categoryCounts] = await Promise.all([
    get<PageDto<HomeProduct>>('/products?page=1&pageSize=10'),
    ...categoryResponse.items.map(category => get<PageDto<HomeProduct>>(`/products?categoryId=${category.id}&page=1&pageSize=1`)),
  ]);
  const categories = categoryResponse.items.map((category, index) => ({
    ...category,
    productCount: categoryCounts[index].totalItems,
  }));
  return { categories, products: productResponse.items };
}
