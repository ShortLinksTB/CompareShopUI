import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCompareCandidates, getCompareProduct, type CompareProduct } from './compareApi';

const STORAGE_KEY = 'compare-products';
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

function readSavedSlugs(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((slug): slug is string => typeof slug === 'string' && slug.length > 0).slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function ComparePage() {
  const [slugs, setSlugs] = useState(readSavedSlugs);
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [candidates, setCandidates] = useState<{ slug: string; name: string }[]>([]);
  const [candidatesError, setCandidatesError] = useState(false);
  const request = useRef(0);

  const load = useCallback(() => {
    const current = ++request.current;
    const saved = readSavedSlugs();
    setSlugs(saved);
    setProducts([]);
    setError(false);
    setLoading(true);
    Promise.all(saved.map(slug => getCompareProduct(slug).then(product => ({ slug, product }))))
      .then(results => {
        if (current === request.current) setProducts(results.map(({ product }) => product));
      })
      .catch(() => {
        if (current === request.current) setError(true);
      })
      .finally(() => {
        if (current === request.current) setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);
  const loadCandidates = useCallback(() => {
    setCandidatesError(false);
    getCompareCandidates().then(setCandidates).catch(() => { setCandidates([]); setCandidatesError(true); });
  }, []);
  useEffect(() => { loadCandidates(); }, [loadCandidates]);

  const add = (slug: string) => {
    if (!slug || slugs.includes(slug) || slugs.length >= 4) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...slugs, slug]));
    load();
  };

  const remove = (slug: string) => {
    const next = slugs.filter(item => item !== slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSlugs(next);
    setProducts(current => current.filter(product => product.slug !== slug));
  };

  return <>
    <div className="page-title"><div><span className="eyebrow">Quyết định tốt hơn</span><h1>So sánh sản phẩm</h1><p className="muted">Chọn tối đa 4 sản phẩm để xem điểm khác biệt.</p></div></div>
    {slugs.length < 4 && <div className="compare-add"><select aria-label="Thêm sản phẩm để so sánh" defaultValue="" onChange={event => { add(event.target.value); event.currentTarget.value = ''; }}><option value="">+ Thêm sản phẩm để so sánh</option>{candidates.filter(candidate => !slugs.includes(candidate.slug)).map(candidate => <option key={candidate.slug} value={candidate.slug}>{candidate.name}</option>)}</select></div>}
    {candidatesError && <p className="muted" role="alert">Không thể tải danh sách sản phẩm. <button className="button button-ghost" onClick={loadCandidates}>Thử lại</button></p>}
    {loading && <p className="detail-state" role="status">Đang tải sản phẩm so sánh...</p>}
    {!loading && error && <div className="empty-state" role="alert"><h3>Không thể tải sản phẩm so sánh</h3><p>Vui lòng kiểm tra kết nối rồi thử lại.</p><button className="button button-primary" onClick={load}>Thử lại</button></div>}
    {!loading && !error && slugs.length === 0 && <div className="empty-state compare-empty-state"><span>⇄</span><h3>Chưa có sản phẩm để so sánh</h3><p>Thêm sản phẩm từ danh sách để bắt đầu so sánh.</p><Link className="button button-primary compare-empty-state__cta" to="/search">Khám phá sản phẩm</Link></div>}
    {!loading && !error && slugs.length > 0 && products.length === 0 && <div className="empty-state"><h3>Không tìm thấy sản phẩm đã lưu</h3><p>Hãy xóa sản phẩm không còn khả dụng hoặc thử lại.</p><button className="button button-primary" onClick={load}>Thử lại</button></div>}
    {!loading && !error && products.length > 0 && <div className="compare-table"><div className="compare-row compare-head"><div>Thông tin</div>{products.map(product => <div key={product.slug}><button onClick={() => remove(product.slug)} aria-label={`Xóa ${product.name}`}>×</button><div className="compare-image-placeholder" role="img" aria-label="Chưa có hình ảnh">Ảnh chưa có</div><strong>{product.name}</strong><small>{product.brand || 'Chưa có thương hiệu'}</small></div>)}</div>
      {[
        ['Giá tốt nhất', ...products.map(product => product.offerSummary.minPrice === null ? 'Chưa có giá' : money(product.offerSummary.minPrice))],
        ['Số cửa hàng', ...products.map(product => `${product.offerSummary.offerCount} cửa hàng`)],
        ['Thương hiệu', ...products.map(product => product.brand || 'Chưa có thông tin')],
        ['Danh mục', ...products.map(product => product.category?.name || 'Chưa có thông tin')],
        ['Thông số kỹ thuật', ...products.map(product => product.specificationGroups.flatMap(group => group.items).map(item => `${item.name}: ${item.value}`).join(' · ') || 'Chưa có thông tin')],
      ].map((row, index) => <div className={`compare-row ${index === 0 ? 'highlight' : ''}`} key={String(row[0])}>{row.map((cell, i) => <div key={i}>{i === 0 ? <strong>{cell}</strong> : cell}</div>)}</div>)}</div>}
  </>;
}
