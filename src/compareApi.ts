const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';
import { withCountryContext } from './countryApi';

export interface CompareProduct {
  id: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  brand: string | null;
  description: string | null;
  category: { id: number; slug: string; name: string };
  offerSummary: { minPrice: number | null; maxPrice: number | null; offerCount: number };
  specificationGroups: { name: string; items: { name: string; value: string }[] }[];
}

export async function getCompareCandidates(country = 'VN'): Promise<{ slug: string; name: string }[]> {
  const response = await fetch(`${API_BASE_URL}${withCountryContext('/products?page=1&pageSize=20', country)}`);
  if (!response.ok) throw new Error(`Product list request failed (${response.status})`);
  const page = await response.json() as { items: { slug: string; name: string }[] };
  return Array.isArray(page.items) ? page.items.filter(item => typeof item?.slug === 'string' && typeof item?.name === 'string') : [];
}

export async function getCompareProduct(slug: string, country = 'VN'): Promise<CompareProduct> {
  const response = await fetch(`${API_BASE_URL}${withCountryContext(`/products/${encodeURIComponent(slug)}`, country)}`);
  if (!response.ok) throw new Error(`Product request failed (${response.status})`);
  return response.json() as Promise<CompareProduct>;
}
