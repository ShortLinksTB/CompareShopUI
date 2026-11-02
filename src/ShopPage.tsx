import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from './i18n';
import { uiText } from './uiCopy';
import { Link, useParams } from 'react-router-dom';
import { getShop, getShopProducts, type Shop, type ShopProduct, type ShopProductPage } from './shopApi';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

function ShopProductCard({ product }: { product: ShopProduct }) {
  const { language } = useLanguage();
  const minPrice = product.offerSummary.minPrice;
  return <article className="product-card">
    <div className="product-image"><span className="muted" role="img" aria-label={uiText(language, 'Chưa có hình ảnh')}>{uiText(language, 'Chưa có hình ảnh')}</span></div>
    <div className="product-card-body">
      <Link to={`/product/${product.slug}`} className="product-name">{product.name}</Link>
      {product.brand && <span className="muted">{product.brand}</span>}
      {minPrice !== null && <strong className="price">{uiText(language, 'Từ')} {money(minPrice)}</strong>}
      <span className="offer-count"><span className="shop-dot" />{product.offerSummary.offerCount} {uiText(language, 'cửa hàng đang bán')}</span>
      <div className="card-actions"><Link className="button button-primary" to={`/product/${product.slug}`}>{uiText(language, 'Xem giá')}</Link></div>
    </div>
  </article>;
}

function ShopContent({ shop, products }: { shop: Shop; products: ShopProductPage }) {
  const { language } = useLanguage();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const categories = useMemo(() => [...new Map(products.items.map(product => [product.category.id, product.category])).values()], [products.items]);
  const visibleProducts = categoryId === null ? products.items : products.items.filter(product => product.category.id === categoryId);
  const statusLabel = shop.status ? ({ active: uiText(language, 'Đang hoạt động'), paused: uiText(language, 'Tạm dừng'), disabled: uiText(language, 'Ngừng hoạt động') }[shop.status.toLowerCase()] ?? shop.status) : uiText(language, 'Trạng thái chưa được cung cấp');
  return <>
    <div className="shop-hero">
      <div className="shop-logo">{shop.logoUrl ? <img src={shop.logoUrl} alt="" /> : shop.name.slice(0, 2).toUpperCase()}</div>
      <div>
        <h1>{shop.name}</h1>
        <div className="rating">{shop.rating !== null && shop.rating !== undefined ? `★ ${shop.rating}` : uiText(language, 'Chưa có đánh giá')} <span>{shop.reviewCount !== null && shop.reviewCount !== undefined ? `(${shop.reviewCount.toLocaleString(language === 'en' ? 'en-US' : language === 'id' ? 'id-ID' : 'vi-VN')} ${uiText(language, 'đánh giá')})` : `(${uiText(language, 'Số lượt đánh giá chưa có')})`}</span></div>
        <p className="muted">{uiText(language, 'Cửa hàng đối tác')} · {statusLabel}</p>
      </div>
      {shop.websiteUrl ? <a className="button button-primary" href={shop.websiteUrl} target="_blank" rel="noreferrer">{uiText(language, 'Xem website')} ↗</a> : <button className="button button-primary" type="button" disabled title={uiText(language, 'Website chưa được cung cấp')}>{uiText(language, 'Xem website')} ↗</button>}
    </div>
    <div className="category-pills"><button className={categoryId === null ? 'active' : ''} onClick={() => setCategoryId(null)}>{uiText(language, 'Tất cả')} ({products.totalItems})</button>{categories.map(category => <button className={categoryId === category.id ? 'active' : ''} key={category.id} onClick={() => setCategoryId(category.id)}>{category.name}</button>)}</div>
    {visibleProducts.length ? <div className="product-grid">{visibleProducts.map(product => <ShopProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><span>⌕</span><h3>{uiText(language, products.items.length ? 'Không có sản phẩm trong danh mục này' : 'Chưa có sản phẩm tại cửa hàng này')}</h3><p>{uiText(language, products.items.length ? 'Chọn danh mục khác để xem sản phẩm.' : 'Sản phẩm sẽ xuất hiện khi cửa hàng có mặt hàng được niêm yết.')}</p></div>}
  </>;
}

export function ShopPage() {
  const { language } = useLanguage();
  const { slug = '' } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ShopProductPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const load = () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(false);
    getShop(slug).then(async result => {
      const shopProducts = await getShopProducts(result.id);
      if (currentRequestId === requestId.current) { setShop(result); setProducts(shopProducts); }
    }).catch(() => {
      if (currentRequestId === requestId.current) { setShop(null); setProducts(null); setError(true); }
    }).finally(() => {
      if (currentRequestId === requestId.current) setLoading(false);
    });
  };

  useEffect(() => { load(); return () => { requestId.current += 1; }; }, [slug]);

  if (loading) return <p className="detail-state" role="status">{uiText(language, 'Đang tải thông tin cửa hàng...')}</p>;
  if (error) return <div className="empty-state" role="alert"><h2>{uiText(language, 'Không thể tải thông tin cửa hàng')}</h2><p>{uiText(language, 'Vui lòng thử lại sau.')}</p><button className="button button-primary" onClick={load}>{uiText(language, 'Thử lại')}</button></div>;
  if (!shop || !products) return <div className="empty-state"><h2>{uiText(language, 'Không tìm thấy cửa hàng')}</h2><p>{uiText(language, 'Kiểm tra lại đường dẫn cửa hàng.')}</p><Link className="button button-primary" to="/">{uiText(language, 'Về trang chủ')}</Link></div>;
  return <ShopContent shop={shop} products={products} />;
}
