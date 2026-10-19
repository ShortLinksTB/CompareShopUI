const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';

export interface Shop {
  id: number;
  slug: string;
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
}

export interface ShopProduct {
  id: number;
  slug: string;
  name: string;
  brand: string | null;
  category: { id: number; slug: string; name: string };
  offerSummary: { minPrice: number | null; maxPrice: number | null; offerCount: number };
}

export interface ShopProductPage {
  items: ShopProduct[];
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

export async function getShop(slug: string): Promise<Shop> {
  const shop = await get<Shop>(`/shops/${encodeURIComponent(slug)}`);
  if (!shop || typeof shop.id !== 'number' || typeof shop.name !== 'string') throw new Error('Invalid shop response');
  return shop;
}

export async function getShopProducts(shopId: number, page = 1, pageSize = 12): Promise<ShopProductPage> {
  const params = new URLSearchParams({ shopId: String(shopId), page: String(page), pageSize: String(pageSize) });
  const result = await get<ShopProductPage>(`/products?${params}`);
  if (!result || !Array.isArray(result.items)) throw new Error('Invalid shop products response');
  return result;
}
