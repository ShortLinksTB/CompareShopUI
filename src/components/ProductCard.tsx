import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { SafeImage } from './SafeImage';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

export function ProductCard({ product, onCompare }: { product: Product; onCompare?: (p: Product) => void }) {
  const [liked, setLiked] = useState(() => JSON.parse(localStorage.getItem('wishlist-products') || '[]').includes(product.id));
  const toggleLike = () => {
    const current = JSON.parse(localStorage.getItem('wishlist-products') || '[]') as string[];
    const next = current.includes(product.id) ? current.filter(id => id !== product.id) : [...current, product.id];
    localStorage.setItem('wishlist-products', JSON.stringify(next));
    setLiked(next.includes(product.id));
  };
  return <article className="product-card"><div className="product-image"><span className="product-badge">Giá tốt</span><SafeImage src={product.images[0]} alt={product.name} fallbackLabel={product.brand} /><button className={`heart ${liked ? 'liked' : ''}`} onClick={toggleLike} aria-label={liked ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}>{liked ? '♥' : '♡'}</button></div><div className="product-card-body"><Link to={`/product/${product.slug}`} className="product-name">{product.name}</Link><span className="muted">{product.brand} <span className="rating-inline">★ {product.rating}</span> ({product.reviewCount})</span><strong className="price">Từ {money(product.minPrice)}</strong><span className="offer-count"><span className="shop-dot"></span>{product.offerCount} cửa hàng đang bán</span><div className="card-actions"><Link className="button button-primary" to={`/product/${product.slug}`}>Xem giá</Link>{onCompare && <button className="button button-ghost" onClick={() => onCompare(product)}>+ So sánh</button>}</div></div></article>;
}
