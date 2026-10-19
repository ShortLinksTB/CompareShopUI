import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProductDetail, productApiBaseUrl, type DetailOffer, type PriceHistoryPoint, type ProductDetail, type RelatedProduct } from './productApi';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
const age = (value: string) => {
  const hours = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 3600000));
  return hours < 2 ? 'Vừa cập nhật' : `${hours} giờ trước`;
};

interface DetailData {
  product: ProductDetail;
  offers: DetailOffer[];
  history: PriceHistoryPoint[];
  related: RelatedProduct[];
}

function OfferRow({ offer }: { offer: DetailOffer }) {
  return <div className="offer-row">
    <div className="shop-avatar" aria-hidden="true">{offer.shopName.slice(0, 2).toUpperCase()}</div>
    <div className="offer-shop"><strong>{offer.shopName}</strong><span>{age(offer.updatedAt)}</span></div>
    <div className="offer-price"><strong>{money(offer.price)}</strong></div>
    <div className="offer-status"><span className="muted">Giá tham khảo</span><small>{new Date(offer.updatedAt).toLocaleDateString('vi-VN')}</small></div>
    <a className="button button-primary" href={`${productApiBaseUrl}/go/${offer.id}`} target="_blank" rel="noreferrer">Xem ngay ↗</a>
  </div>;
}

function ProductDetailContent({ data }: { data: DetailData }) {
  const { product, offers, history, related } = data;
  const minPrice = product.offerSummary.minPrice;
  const sortedOffers = [...offers].sort((a, b) => a.price - b.price);
  const maxHistory = Math.max(...history.map(point => point.minPrice), 0);
  return <>
    <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to={`/category/${product.category.slug}`}>{product.category.name}</Link><span>/</span><strong>{product.name}</strong></div>
    <section className="product-detail">
      <div className="detail-gallery"><div className="gallery-thumbs"><div className="product-image-placeholder" aria-label="Chưa có hình ảnh">Ảnh sản phẩm</div><div className="product-image-placeholder" aria-hidden="true">Ảnh sản phẩm</div><div className="product-image-placeholder" aria-hidden="true">Ảnh sản phẩm</div></div><div className="product-image-placeholder detail-image-placeholder" role="img" aria-label="Chưa có hình ảnh">Chưa có hình ảnh</div><span className="gallery-count">Ảnh chưa có</span></div>
      <div className="detail-copy"><span className="eyebrow">{product.brand || product.category.name}</span><h1>{product.name}</h1><p>{product.description || 'Thông tin mô tả chưa được cung cấp.'}</p><div className="detail-price"><small>Giá tham khảo từ</small>{minPrice !== null ? <strong>{money(minPrice)}</strong> : <strong>Chưa có giá</strong>}<span>· {product.offerSummary.offerCount} cửa hàng</span></div><div className="detail-actions"><button className="button button-primary button-large" onClick={() => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' })}>Xem giá tốt nhất ↓</button></div></div>
    </section>
    <div className="detail-tabs"><a className="active" href="#offers">So sánh giá ({product.offerSummary.offerCount})</a><a href="#specs">Thông số kỹ thuật</a><a href="#reviews">Đánh giá</a><a href="#questions">Hỏi đáp</a></div>
    <section id="offers" className="detail-section"><div className="section-heading"><div><span className="eyebrow">So sánh giá</span><h2>Giá từ các cửa hàng</h2></div><span className="muted">Cập nhật theo thời gian thực</span></div>{sortedOffers.length ? <div className="offer-list">{sortedOffers.map(offer => <OfferRow key={offer.id} offer={offer} />)}</div> : <div className="empty-state"><h3>Chưa có cửa hàng niêm yết giá</h3><p>Thông tin giá sẽ xuất hiện khi có ưu đãi.</p></div>}</section>
    <section id="specs" className="detail-section spec-layout"><div><span className="eyebrow">Chi tiết</span><h2>Thông số sản phẩm</h2>{product.specificationGroups.length ? product.specificationGroups.map(group => <div className="spec-table" key={group.name}>{group.items.map(item => <div key={`${group.name}-${item.name}`}><span>{item.name}</span><strong>{item.value}</strong></div>)}</div>) : <p className="muted">Chưa có thông số kỹ thuật cho sản phẩm này.</p>}<div className="price-history"><div><span className="eyebrow">Theo dõi biến động</span><h3>Lịch sử giá 6 tháng</h3></div>{history.length ? <div className="history-chart" role="img" aria-label="Biểu đồ lịch sử giá">{history.map(point => <i key={`${point.date}-${point.shopId}`} title={`${new Date(point.date).toLocaleDateString('vi-VN')}: ${money(point.minPrice)}`} style={{ height: `${Math.max(8, (point.minPrice / maxHistory) * 100)}%` }} />)}</div> : <p className="muted">Chưa có dữ liệu lịch sử giá.</p>}</div></div><aside className="info-card"><strong>Giá được cập nhật</strong><p>Giá có thể thay đổi theo từng cửa hàng. Hãy kiểm tra lại giá cuối cùng trước khi mua.</p><span>🛡️ Minh bạch & an toàn</span></aside></section>
    <section id="reviews" className="detail-section"><div className="section-heading"><div><span className="eyebrow">Đánh giá</span><h2>Đánh giá sản phẩm</h2></div></div><div className="empty-state"><h3>Chưa có dữ liệu đánh giá</h3></div></section>
    <section className="detail-section related-section"><div className="section-heading"><div><span className="eyebrow">Có thể bạn quan tâm</span><h2>Sản phẩm liên quan</h2></div></div>{related.length ? <div className="product-grid">{related.map(item => <article className="product-card" key={item.id}><div className="product-image"><span className="muted">Chưa có hình ảnh</span></div><div className="product-card-body"><Link to={`/product/${item.slug}`} className="product-name">{item.name}</Link>{item.brand && <span className="muted">{item.brand}</span>}{item.offerSummary.minPrice !== null && <strong className="price">Từ {money(item.offerSummary.minPrice)}</strong>}<span className="offer-count">{item.offerSummary.offerCount} cửa hàng đang bán</span><Link className="button button-primary" to={`/product/${item.slug}`}>Xem giá</Link></div></article>)}</div> : <div className="empty-state"><h3>Chưa có sản phẩm liên quan</h3></div>}</section>
    {minPrice !== null && <div className="mobile-sticky-cta"><span>Từ <b>{money(minPrice)}</b></span><button className="button button-primary" onClick={() => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' })}>Xem giá tốt nhất</button></div>}
  </>;
}

export function ProductDetailPage() {
  const { slug = '' } = useParams();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);
  const load = () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(false);
    getProductDetail(slug).then(result => {
      if (currentRequestId === requestId.current) setData(result);
    }).catch(() => {
      if (currentRequestId === requestId.current) { setData(null); setError(true); }
    }).finally(() => {
      if (currentRequestId === requestId.current) setLoading(false);
    });
  };
  useEffect(() => { load(); }, [slug]);

  if (loading) return <p className="detail-state" role="status">Đang tải thông tin sản phẩm...</p>;
  if (error || !data) return <div className="empty-state product-error-state" role="alert"><h2>{error ? 'Không thể tải thông tin sản phẩm' : 'Không tìm thấy sản phẩm'}</h2><p>Vui lòng thử lại sau.</p><button className="button button-primary" onClick={load}>Thử lại</button><Link to="/search">Quay lại tìm kiếm</Link></div>;
  return <ProductDetailContent data={data} />;
}
