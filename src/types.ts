export type Availability = 'in_stock' | 'out_of_stock' | 'unknown';
export type OfferStatus = 'active' | 'stale' | 'outlier' | 'disabled';
export interface SpecificationGroup { name: string; items: { key: string; label: string; value: string }[] }
export interface PartnerShop { id: string; slug: string; name: string; logoUrl: string; rating: number; status: 'active' | 'paused' | 'disabled' }
export interface ProductOffer { id: string; productId: string; shop: PartnerShop; price: number; originalPrice?: number; shippingFee?: number | null; couponValue?: number | null; finalPrice?: number | null; availability: Availability; promotionText?: string; updatedAt: string; status: OfferStatus }
export interface Product { id: string; slug: string; name: string; brand: string; categoryId: string; categoryName: string; images: string[]; description: string; rating: number; reviewCount: number; minPrice: number; maxPrice: number; offerCount: number; specifications: SpecificationGroup[]; status: 'active' | 'draft'; updatedAt: string }
export interface Category { id: string; name: string; icon: string; count: number }
