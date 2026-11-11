import { fetchWithAuth } from './auth/authApi';

export interface PriceAlertDto {
  id: number;
  productId: number;
  slug: string;
  name: string;
  targetPrice: number;
  isActive: boolean;
  createdAtUtc: string;
}

export class PriceAlertApiError extends Error {
  constructor(readonly status: number) {
    super(`Price alert request failed with status ${status}.`);
    this.name = 'PriceAlertApiError';
  }
}

const PRICE_ALERTS_API = 'https://api-compareshop-dev.giamha.online/api/v1/price-alerts';

function isPriceAlert(value: unknown): value is PriceAlertDto {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PriceAlertDto>;
  return Number.isInteger(item.id)
    && Number.isInteger(item.productId)
    && typeof item.slug === 'string'
    && typeof item.name === 'string'
    && Number.isInteger(item.targetPrice)
    && typeof item.isActive === 'boolean'
    && typeof item.createdAtUtc === 'string';
}

export async function getPriceAlerts(accessToken: string): Promise<PriceAlertDto[]> {
  const response = await fetchWithAuth(PRICE_ALERTS_API, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }, accessToken);
  if (!response.ok) throw new PriceAlertApiError(response.status);

  const payload = await response.json() as { items?: unknown };
  if (!payload || !Array.isArray(payload.items) || !payload.items.every(isPriceAlert)) {
    throw new Error('Price alert response is invalid.');
  }
  return payload.items;
}
