import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { products } from './mockData';
import { ProductCard } from './components/ProductCard';
import { getProductDetailData } from './productApi';
import type { Product, ProductOffer } from './types';
import { SafeImage } from './components/SafeImage';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
const age = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ thời điểm';
  const hours = Math.round((Date.now() - date.getTime()) / 3600000);
  return hours < 2 ? 'Vừa cập nhật' : `${hours} giờ trước`;
};

function OfferRow({ offer }: { offer: ProductOffer }) {
  const canVisit = offer.availability === 'in_stock' && offer.status !== 'disabled';
  return <div className="offer-row"><div className="shop-avatar">{offer.shop.logoUrl}</div><div className="offer-shop"><strong>{offer.shop.name}</strong><span>★ {offer.shop.rating} · {offer.promotionText || 'Giá niêm yết'}</span></div><div className="offer-price"><strong>{money(offer.finalPrice ?? offer.price)}</strong>{offer.originalPrice && <del>{money(offer.originalPrice)}</del>}</div><div className="offer-status"><span className={offer.availability === 'in_stock' ? 'in-stock' : 'out-stock'}>{offer.availability === 'in_stock' ? 'Còn hàng' : 'Hết hàng'}</span><small className={offer.status === 'stale' ? 'stale' : ''}>{offer.status === 'stale' ? 'Dữ liệu cũ · ' : ''}{age(offer.updatedAt)}</small></div><button className="button button-primary" disabled={!canVisit} onClick={() => alert(`Mock affiliate redirect đến ${offer.shop.name}`)}>{canVisit ? 'Xem ngay ↗' : 'Không khả dụng'}</button></div>;
}

function RelatedProducts({ product }: { product: Product }) {
  const related = products.filter(item => item.categoryId === product.categoryId && item.id !== product.id).slice(0, 4);
  return <section className="detail-section related-section"><div className="section-heading"><div><span className="eyebrow">Có thể bạn quan tâm</span><h2>Sản phẩm liên quan</h2></div></div><div className="product-grid">{related.map(item => <ProductCard key={item.id} product={item} />)}</div></section>;
}

export function ProductDetailPage() {
  const { slug = '' } = useParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof getProductDetailData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setData(null);
    getProductDetailData(slug)
      .then(result => { if (active) { setData(result); setLoading(false); } })
      .catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, [slug, retry]);

  if (loading) return <div className="empty-state" role="status">Đang tải thông tin sản phẩm…</div>;
  if (error) return <div className="empty-state" role="alert"><h2>Không thể tải thông tin sản phẩm</h2><p>Vui lòng kiểm tra kết nối và thử lại.</p><button className="button button-primary" onClick={() => setRetry(count => count + 1)}>Thử lại</button></div>;
  if (!data) return null;

  const { product, offers, priceHistory } = data;
  const historyValues = priceHistory.map(item => Number(item.price ?? item.minPrice ?? item.value ?? 0)).filter(value => value > 0);
  const minHistory = Math.min(...historyValues);
  const maxHistory = Math.max(...historyValues);
  const chartHeight = (value: number) => maxHistory === minHistory ? '50%' : `${25 + ((value - minHistory) / (maxHistory - minHistory)) * 65}%`;
  const image = product.images[0] ?? '';
  const galleryImages = Array.from({ length: 3 }, (_, index) => product.images[index] ?? image);

  return <><div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to={`/category/${product.categoryId}`}>{product.categoryName}</Link><span>/</span><strong>{product.name}</strong></div><section className="product-detail"><div className="detail-gallery"><div className="gallery-thumbs">{galleryImages.map((src, index) => src ? <SafeImage key={index} src={src} alt="" fallbackLabel={product.brand} /> : <div key={index} className="safe-image-fallback" role="img" aria-label={`${product.name} thumbnail`}>{product.brand || product.name}</div>)}</div>{image ? <SafeImage src={image} alt={product.name} fallbackLabel={product.brand} /> : <div role="img" aria-label={product.name} className="safe-image-fallback">{product.brand || product.name}</div>}<span className="gallery-count">1 / 3</span></div><div className="detail-copy"><span className="eyebrow">{product.brand}</span><h1>{product.name}</h1>{product.rating > 0 && <div className="rating">★ {product.rating} <span>({product.reviewCount} đánh giá)</span></div>}<p>{product.description}</p><div className="detail-price"><small>Giá tham khảo từ</small><strong>{product.minPrice > 0 ? money(product.minPrice) : 'Đang cập nhật'}</strong><span>· {product.offerCount} cửa hàng</span></div><div className="detail-actions"><button className="button button-primary button-large" onClick={() => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' })}>Xem giá tốt nhất ↓</button><button className="button button-ghost button-large">♡ Lưu sản phẩm</button></div></div></section><div className="detail-tabs"><a className="active" href="#offers">So sánh giá ({product.offerCount})</a><a href="#specs">Thông số kỹ thuật</a><a href="#reviews">Đánh giá ({product.reviewCount})</a><a href="#questions">Hỏi đáp</a></div><section id="offers" className="detail-section"><div className="section-heading"><div><span className="eyebrow">So sánh giá</span><h2>Giá từ các cửa hàng</h2></div><span className="muted">Cập nhật theo thời gian thực</span></div>{offers.length ? <div className="offer-list">{offers.map(offer => <OfferRow key={offer.id} offer={offer} />)}</div> : <div className="empty-state"><h3>Chưa có giá từ cửa hàng</h3><p>Hãy quay lại sau để xem các mức giá mới nhất.</p></div>}</section><section id="specs" className="detail-section spec-layout"><div><span className="eyebrow">Chi tiết</span><h2>Thông số sản phẩm</h2>{product.specifications.map(group => <div className="spec-table" key={group.name}>{group.items.map(item => <div key={item.key}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>)}<div className="price-history"><div><span className="eyebrow">Theo dõi biến động</span><h3>Lịch sử giá 6 tháng</h3></div>{historyValues.length ? <div className="history-chart" role="img" aria-label="Biểu đồ lịch sử giá">{historyValues.map((value, index) => <i key={index} title={money(value)} style={{ height: chartHeight(value) }} />)}</div> : <p className="muted">Chưa có dữ liệu lịch sử giá.</p>}</div></div><aside className="info-card"><strong>Giá được cập nhật</strong><p>Giá có thể thay đổi theo từng cửa hàng. Hãy kiểm tra lại giá cuối cùng trước khi mua.</p><span>🛡️ Minh bạch & an toàn</span></aside></section><RelatedProducts product={product} /><div className="mobile-sticky-cta"><span>Từ <b>{money(product.minPrice)}</b></span><button className="button button-primary" onClick={() => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' })}>Xem giá tốt nhất</button></div></>;
}
