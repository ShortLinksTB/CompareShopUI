export interface WishlistItemDto {
  productId: number;
  slug: string;
  name: string;
  createdAtUtc: string;
}

export class WishlistApiError extends Error {
  constructor(readonly status: number) {
    super(`Wishlist request failed with status ${status}.`);
    this.name = 'WishlistApiError';
  }
}

const WISHLIST_API = 'https://api-compareshop-dev.giamha.online/api/v1/wishlist';

function mapItem(value: unknown): WishlistItemDto | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<WishlistItemDto>;
  if (!Number.isInteger(item.productId) || typeof item.slug !== 'string' || typeof item.name !== 'string' || typeof item.createdAtUtc !== 'string') return null;
  return { productId: item.productId!, slug: item.slug, name: item.name, createdAtUtc: item.createdAtUtc };
}

export async function getWishlist(accessToken: string): Promise<WishlistItemDto[]> {
  const response = await fetch(WISHLIST_API, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new WishlistApiError(response.status);

  const payload = await response.json() as { items?: unknown };
  if (!Array.isArray(payload.items)) throw new Error('Wishlist response is invalid.');
  return payload.items.map(mapItem).filter((item): item is WishlistItemDto => item !== null);
}

export async function removeWishlistItem(accessToken: string, productId: number): Promise<void> {
  const response = await fetch(WISHLIST_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productId, operation: 'remove' }),
  });
  if (response.status !== 204) throw new WishlistApiError(response.status);
}
