import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getCategories, getProducts, type ProductPage, type SearchCategory } from './searchApi';

const PAGE_SIZE = 12;
const WISHLIST_API = 'https://api-compareshop-dev.giamha.online/api/v1/wishlist';
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

function ProductCard({ product, liked, busy, onToggle }: { product: ProductPage['items'][number]; liked: boolean; busy: boolean; onToggle: (id: number) => void }) {
  const { minPrice, offerCount } = product.offerSummary;
  return <article className="product-card"><div className="product-image"><span className="muted">Chưa có hình ảnh</span><button className={`heart ${liked ? 'liked' : ''}`} onClick={() => onToggle(product.id)} disabled={busy} aria-label={liked ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}>{liked ? '♥' : '♡'}</button></div><div className="product-card-body"><Link to={`/product/${product.slug}`} className="product-name">{product.name}</Link>{product.brand && <span className="muted">{product.brand}</span>}{minPrice !== null && <strong className="price">Từ {money(minPrice)}</strong>}<span className="offer-count"><span className="shop-dot" />{offerCount} cửa hàng đang bán</span><div className="card-actions"><Link className="button button-primary" to={`/product/${product.slug}`}>Xem giá</Link><button className="button button-ghost" onClick={() => { const saved = JSON.parse(localStorage.getItem('compare-products') || '[]') as string[]; if (!saved.includes(product.slug) && saved.length < 4) localStorage.setItem('compare-products', JSON.stringify([...saved, product.slug])); }}>+ So sánh</button></div></div></article>;
}

function PriceFilters({ minPrice, maxPrice, setPrice }: { minPrice?: number; maxPrice?: number; setPrice: (min?: number, max?: number) => void }) {
  return <aside className="filter-panel"><div className="filter-heading"><strong>Bộ lọc</strong><button onClick={() => setPrice()}>Xóa tất cả</button></div><fieldset><legend>Khoảng giá</legend><label><input type="checkbox" checked={maxPrice === 10000000 && minPrice === undefined} onChange={() => setPrice(undefined, maxPrice === 10000000 ? undefined : 10000000)} /> Dưới 10 triệu</label><label><input type="checkbox" checked={minPrice === 10000000 && maxPrice === 20000000} onChange={() => setPrice(minPrice === 10000000 && maxPrice === 20000000 ? undefined : 10000000, 20000000)} /> 10 - 20 triệu</label><label><input type="checkbox" checked={minPrice === 20000000 && maxPrice === 30000000} onChange={() => setPrice(minPrice === 20000000 && maxPrice === 30000000 ? undefined : 20000000, 30000000)} /> 20 - 30 triệu</label><label><input type="checkbox" checked={minPrice === 30000000 && maxPrice === undefined} onChange={() => setPrice(minPrice === 30000000 ? undefined : 30000000, undefined)} /> Trên 30 triệu</label></fieldset><p className="muted">Hãng, đánh giá và sắp xếp chưa được API hỗ trợ.</p></aside>;
}

export function SearchPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const categoryQuery = params.get('category') || '';
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [wishlistBusyIds, setWishlistBusyIds] = useState<number[]>([]);
  const [wishlistError, setWishlistError] = useState<'unauthenticated' | 'request' | null>(null);

  useEffect(() => {
    let active = true;
    fetch(WISHLIST_API).then(async response => {
      if (response.status === 401 || response.status === 403) throw new Error('unauthenticated');
      if (!response.ok) throw new Error('wishlist request failed');
      const result = await response.json() as { items?: Array<{ productId?: number }> };
      if (active) setWishlistIds(Array.isArray(result.items) ? result.items.flatMap(item => Number.isInteger(item.productId) ? [item.productId as number] : []) : []);
    }).catch(reason => { if (active) { setWishlistIds([]); if (reason instanceof Error && reason.message === 'unauthenticated') setWishlistError('unauthenticated'); } }).finally(() => { if (active) setWishlistLoading(false); });
    return () => { active = false; };
  }, []);

  const toggleWishlist = async (productId: number) => {
    if (wishlistLoading || wishlistBusyIds.includes(productId)) return;
    const adding = !wishlistIds.includes(productId);
    setWishlistError(null);
    setWishlistBusyIds(ids => [...ids, productId]);
    setWishlistIds(ids => adding ? [...ids, productId] : ids.filter(id => id !== productId));
    try {
      const response = await fetch(adding ? WISHLIST_API : `${WISHLIST_API}/${productId}`, adding
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, operation: 'add' }) }
        : { method: 'DELETE' });
      if (response.status === 401 || response.status === 403) throw new Error('unauthenticated');
      if (!response.ok) throw new Error('wishlist update failed');
    } catch (reason) {
      setWishlistIds(ids => adding ? ids.filter(id => id !== productId) : [...ids, productId]);
      setWishlistError(reason instanceof Error && reason.message === 'unauthenticated' ? 'unauthenticated' : 'request');
    } finally {
      setWishlistBusyIds(ids => ids.filter(id => id !== productId));
    }
  };

  useEffect(() => { setPage(1); }, [query, slug, categoryQuery, minPrice, maxPrice]);
  useEffect(() => {
    let active = true;
    getCategories().then(items => { if (active) { setCategories(items); setCategoriesLoaded(true); setCategoryError(false); } }).catch(() => { if (active) { setCategoriesLoaded(true); setCategoryError(true); } });
    return () => { active = false; };
  }, []);

  const selectedCategory = useMemo(() => {
    const routeSlug = slug || categoryQuery;
    return routeSlug ? categories.find(category => category.slug === routeSlug) : undefined;
  }, [categories, slug, categoryQuery]);
  const categoryResolved = !(slug || categoryQuery) || categoriesLoaded;

  useEffect(() => {
    if (!categoryResolved) return;
    if ((slug || categoryQuery) && !selectedCategory && !categoryError) {
      setError(false);
      setLoading(false);
      setData({ items: [], page, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 0 });
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    getProducts({ page, pageSize: PAGE_SIZE, ...(query ? { search: query } : {}), ...(selectedCategory ? { categoryId: selectedCategory.id } : {}), ...(minPrice !== undefined ? { minPrice } : {}), ...(maxPrice !== undefined ? { maxPrice } : {}) })
      .then(result => { if (active) setData(result); })
      .catch(() => { if (active) { setData(null); setError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, selectedCategory, categoryResolved, slug, categoryQuery, categoryError, minPrice, maxPrice]);

  const totalPages = Math.max(1, data?.totalPages || 0);
  const filterProps = { minPrice, maxPrice, setPrice: (min?: number, max?: number) => { setMinPrice(min); setMaxPrice(max); } };
  const retry = () => {
    if (categoryError) {
      setCategoryError(false);
      setCategories([]);
      setCategoriesLoaded(false);
      getCategories().then(items => { setCategories(items); setCategoriesLoaded(true); }).catch(() => { setCategoriesLoaded(true); setCategoryError(true); });
    } else {
      setError(false);
      setLoading(true);
      getProducts({ page, pageSize: PAGE_SIZE, ...(query ? { search: query } : {}), ...(selectedCategory ? { categoryId: selectedCategory.id } : {}), ...(minPrice !== undefined ? { minPrice } : {}), ...(maxPrice !== undefined ? { maxPrice } : {}) }).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
    }
  };

  return <>
    <div className="page-title"><div><span className="eyebrow">{selectedCategory?.name || 'Tìm kiếm'}</span><h1>{query ? `Kết quả cho “${query}”` : selectedCategory?.name || 'Tất cả sản phẩm'}</h1><p className="muted">{data?.totalItems || 0} sản phẩm phù hợp</p></div></div>
    <div className="category-pills"><Link className={!selectedCategory ? 'active' : ''} to={query ? `/search?q=${encodeURIComponent(query)}` : '/search'}>Tất cả</Link>{categories.map(category => <Link className={selectedCategory?.id === category.id ? 'active' : ''} key={category.id} to={`/category/${category.slug}${query ? `?q=${encodeURIComponent(query)}` : ''}`}>{category.name}</Link>)}</div>
    <div className="catalog-layout"><PriceFilters {...filterProps} /><div className="catalog-results"><div className="results-toolbar"><span>{data?.totalItems || 0} sản phẩm · Trang {page}/{totalPages}</span><button className="filter-mobile-button" onClick={() => setMobileFiltersOpen(true)}>☷ Bộ lọc</button><span className="view-toggle">▦ ▦</span></div>
      {wishlistError === 'unauthenticated' ? <p className="suggestion-error" role="alert">Đăng nhập để lưu sản phẩm yêu thích. <Link to="/login">Đăng nhập</Link></p> : wishlistError === 'request' && <p className="suggestion-error" role="alert">Không thể cập nhật sản phẩm yêu thích. Vui lòng thử lại.</p>}
      {loading ? <p className="detail-state" role="status">Đang tải sản phẩm...</p> : error || categoryError ? <div className="empty-state" role="alert"><h3>Không thể tải dữ liệu tìm kiếm</h3><p>Vui lòng thử lại.</p><button className="button button-primary" onClick={retry}>Thử lại</button></div> : data?.items.length ? <div className="product-grid">{data.items.map(product => <ProductCard key={product.id} product={product} liked={wishlistIds.includes(product.id)} busy={wishlistLoading || wishlistBusyIds.includes(product.id)} onToggle={toggleWishlist} />)}</div> : <div className="empty-state"><span>⌕</span><h3>{slug && !selectedCategory ? 'Không tìm thấy danh mục' : 'Không tìm thấy sản phẩm'}</h3><p>Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p></div>}
      {data && !loading && !error && totalPages > 1 && <nav className="pagination" aria-label="Phân trang sản phẩm"><button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Trang trước">←</button>{Array.from({ length: totalPages }, (_, index) => index + 1).map(item => <button className={item === page ? 'active' : ''} key={item} onClick={() => setPage(item)} aria-current={item === page ? 'page' : undefined}>{item}</button>)}<button disabled={page === totalPages} onClick={() => setPage(page + 1)} aria-label="Trang sau">→</button></nav>}
    </div></div>
    {mobileFiltersOpen && <div className="mobile-filter-drawer"><div className="mobile-filter-header"><strong>Bộ lọc</strong><button onClick={() => setMobileFiltersOpen(false)}>×</button></div><PriceFilters {...filterProps} /><button className="button button-primary mobile-filter-apply" onClick={() => setMobileFiltersOpen(false)}>Xem kết quả</button></div>}
  </>;
}
