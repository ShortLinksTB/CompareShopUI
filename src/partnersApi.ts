const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';

export interface HomePartner {
  name: string;
  slug: string;
  websiteUrl: string | null;
}

export async function getHomePartners(): Promise<HomePartner[]> {
  const response = await fetch(`${API_BASE_URL}/partners`);
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  const result: unknown = await response.json();
  if (!Array.isArray(result) || !result.every(isHomePartner)) throw new Error('Invalid partners response');
  return result.slice(0, 12);
}

function isHomePartner(value: unknown): value is HomePartner {
  if (!value || typeof value !== 'object') return false;
  const partner = value as Record<string, unknown>;
  return typeof partner.name === 'string' && typeof partner.slug === 'string'
    && (typeof partner.websiteUrl === 'string' || partner.websiteUrl === null);
}
