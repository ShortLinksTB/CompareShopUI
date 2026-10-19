import type { Product, ProductOffer } from './types';

const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';

export interface PriceHistoryItem {
  date?: string;
  recordedAt?: string;
  price?: number;
  minPrice?: number;
  value?: number;
}

export interface ProductDetailData {
  product: Product;
  offers: ProductOffer[];
  priceHistory: PriceHistoryItem[];
}

type ApiRecord = Record<string, unknown>;
interface ProductDto extends ApiRecord {
  id: number;
  slug: string;
  name: string;
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  const items = asRecord(value).items;
  return Array.isArray(items) ? items as T[] : [];
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

function mapProduct(dto: ProductDto): Product {
  const category = asRecord(dto.category);
  const summary = asRecord(dto.offerSummary);
  const specificationGroups = Array.isArray(dto.specifications) ? dto.specifications : [];
  return {
    id: String(dto.id),
    slug: dto.slug,
    name: dto.name,
    brand: String(dto.brand ?? ''),
    categoryId: String(category.slug ?? category.id ?? ''),
    categoryName: String(category.name ?? ''),
    images: Array.isArray(dto.images) ? dto.images.map(String) : dto.imageUrl ? [String(dto.imageUrl)] : [],
    description: String(dto.description ?? ''),
    rating: Number(dto.rating ?? 0),
    reviewCount: Number(dto.reviewCount ?? 0),
    minPrice: Number(summary.minPrice ?? dto.minPrice ?? 0),
    maxPrice: Number(summary.maxPrice ?? dto.maxPrice ?? 0),
    offerCount: Number(summary.offerCount ?? dto.offerCount ?? 0),
    specifications: specificationGroups as Product['specifications'],
    status: String(dto.status ?? 'active') === 'draft' ? 'draft' : 'active',
    updatedAt: String(dto.updatedAt ?? ''),
  };
}

function mapOffer(value: unknown): ProductOffer {
  const dto = asRecord(value);
  const shopDto = asRecord(dto.shop);
  const availability = String(dto.availability ?? 'unknown');
  const status = String(dto.status ?? 'active');
  return {
    id: String(dto.id ?? ''),
    productId: String(dto.productId ?? ''),
    shop: {
      id: String(shopDto.id ?? dto.shopId ?? ''),
      slug: String(shopDto.slug ?? ''),
      name: String(shopDto.name ?? 'Cửa hàng'),
      logoUrl: String(shopDto.logoUrl ?? shopDto.name ?? '店'),
      rating: Number(shopDto.rating ?? 0),
      status: shopDto.status === 'paused' || shopDto.status === 'disabled' ? shopDto.status : 'active',
    },
    price: Number(dto.price ?? dto.finalPrice ?? 0),
    originalPrice: dto.originalPrice == null ? undefined : Number(dto.originalPrice),
    shippingFee: dto.shippingFee == null ? null : Number(dto.shippingFee),
    couponValue: dto.couponValue == null ? null : Number(dto.couponValue),
    finalPrice: dto.finalPrice == null ? null : Number(dto.finalPrice),
    availability: availability === 'in_stock' || availability === 'out_of_stock' ? availability : 'unknown',
    promotionText: dto.promotionText == null ? undefined : String(dto.promotionText),
    updatedAt: String(dto.updatedAt ?? ''),
    status: status === 'stale' || status === 'outlier' || status === 'disabled' ? status : 'active',
  };
}

export async function getProductDetailData(slug: string): Promise<ProductDetailData> {
  const productResponse = await get<ProductDto>(`/products/${encodeURIComponent(slug)}`);
  const product = mapProduct(productResponse);
  const [offerResponse, historyResponse] = await Promise.all([
    get<unknown>(`/products/${product.id}/offers`),
    get<unknown>(`/products/${product.id}/price-history`),
  ]);
  return {
    product,
    offers: asArray(offerResponse).map(mapOffer).sort((a, b) => (a.finalPrice ?? a.price) - (b.finalPrice ?? b.price)),
    priceHistory: asArray<PriceHistoryItem>(historyResponse),
  };
}
