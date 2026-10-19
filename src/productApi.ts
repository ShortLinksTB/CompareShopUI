const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';

export interface ProductDetail {
  id: number;
  slug: string;
  name: string;
  brand: string | null;
  description: string | null;
  category: { id: number; slug: string; name: string };
  offerSummary: { minPrice: number | null; maxPrice: number | null; offerCount: number };
  specificationGroups: { name: string; items: { name: string; value: string }[] }[];
}

export interface DetailOffer {
  id: number;
  price: number;
  url: string | null;
  updatedAt: string;
  shopId: number;
  shopSlug: string;
  shopName: string;
}

export interface PriceHistoryPoint {
  date: string;
  minPrice: number;
  shopId: number | null;
}

export interface RelatedProduct {
  id: number;
  slug: string;
  name: string;
  brand: string | null;
  category: { id: number; slug: string; name: string };
  offerSummary: { minPrice: number | null; maxPrice: number | null; offerCount: number };
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getProductDetail(slug: string) {
  const product = await get<ProductDetail>(`/products/${encodeURIComponent(slug)}`);
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  const query = `?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(new Date().toISOString())}`;
  const [offers, history, related] = await Promise.all([
    get<{ items: DetailOffer[] }>(`/products/${product.id}/offers`),
    get<{ items: PriceHistoryPoint[] }>(`/products/${product.id}/price-history${query}`),
    get<{ items: RelatedProduct[] }>(`/products?categoryId=${product.category.id}&page=1&pageSize=5`).catch(() => ({ items: [] as RelatedProduct[] })),
  ]);

  return {
    product,
    offers: offers.items,
    history: history.items,
    related: related.items.filter(item => item.id !== product.id),
  };
}

export const productApiBaseUrl = API_BASE_URL;
