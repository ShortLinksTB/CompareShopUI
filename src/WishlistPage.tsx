import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSession } from './auth/AuthSession';
import { useLanguage } from './i18n';
import { uiText } from './uiCopy';
import { SafeImage } from './components/SafeImage';
import { useWishlist } from './wishlist/WishlistContext';

function WishlistSkeleton() {
  const { language } = useLanguage();
  return <div className="wishlist-list" aria-label={uiText(language, 'Đang tải sản phẩm yêu thích')} aria-busy="true">
    {[0, 1].map(item => <div className="wishlist-item" key={item}>
      <div className="wishlist-skeleton-thumb skeleton" />
      <div className="wishlist-skeleton-copy"><span className="skeleton" /><span className="skeleton" /></div>
    </div>)}
  </div>;
}

export function WishlistPage() {
  const { language } = useLanguage();
  const { status, items, busyIds, signInBusy: sharedSignInBusy, remove, reload } = useWishlist();
  const { signIn } = useAuthSession();
  const [signInStarting, setSignInStarting] = useState(false);
  const [signInFailed, setSignInFailed] = useState(false);

  const startSignIn = async () => {
    if (signInStarting || sharedSignInBusy) return;
    setSignInStarting(true);
    setSignInFailed(false);
    try { await signIn('/wishlist'); }
    catch { setSignInStarting(false); setSignInFailed(true); }
  };

  return <div className="wishlist-page">
    <div className="page-title"><div><span className="eyebrow">{uiText(language, 'Cá nhân')}</span><h1>{uiText(language, 'Sản phẩm yêu thích')}</h1><p className="muted">{uiText(language, 'Theo dõi giá và nhận thông báo khi sản phẩm giảm giá.')}</p></div></div>
    <div className="wishlist-tabs"><button className="active" type="button">{uiText(language, 'Sản phẩm đã lưu')} ({status === 'loading' ? '…' : status === 'loaded' ? items.length : 0})</button><button type="button" disabled>{uiText(language, 'Theo dõi giá')}</button></div>
    {status === 'loading' && <WishlistSkeleton />}
    {status === 'anonymous' && <div className="empty-state wishlist-unauthenticated-state"><span>♡</span><h3>{uiText(language, 'Đăng nhập để xem sản phẩm đã lưu')}</h3><div className="wishlist-unauthenticated__actions"><p>{uiText(language, 'Danh sách yêu thích chỉ hiển thị cho tài khoản đã xác thực.')}</p>{signInFailed && <p role="alert">{uiText(language, 'Không thể mở đăng nhập. Vui lòng thử lại.')}</p>}<button className="button button-primary wishlist-unauthenticated__cta" type="button" onClick={() => void startSignIn()} disabled={signInStarting}>{signInStarting ? uiText(language, 'Đang chuyển đến đăng nhập…') : uiText(language, 'Đăng nhập')}</button></div></div>}
    {status === 'error' && <div className="empty-state" role="alert"><h3>{uiText(language, 'Không thể tải sản phẩm yêu thích')}</h3><p>{uiText(language, 'Vui lòng thử lại.')}</p><button className="button button-primary" type="button" onClick={reload}>{uiText(language, 'Thử lại')}</button></div>}
    {status === 'loaded' && (items.length ? <div className="wishlist-list">{items.map(item => <div className="wishlist-item" key={item.productId}>
      {item.imageUrl ? <SafeImage className="safe-image-fallback" src={item.imageUrl} alt={item.name} fallbackLabel={uiText(language, 'Chưa có hình ảnh')} /> : <div className="safe-image-fallback" role="img" aria-label={item.name}><span>{uiText(language, 'Chưa có hình ảnh')}</span></div>}
      <div><Link to={`/product/${item.slug}`}><strong>{item.name}</strong></Link><span className="price">{uiText(language, 'Giá hiện tại chưa có dữ liệu')}</span></div>
      <button className="button button-ghost" type="button" onClick={() => void remove(item.productId)} disabled={busyIds.has(item.productId)} aria-label={`${uiText(language, 'Xóa')} ${item.name}`}>{busyIds.has(item.productId) ? '…' : '×'}</button>
    </div>)}</div> : <div className="empty-state"><span>♡</span><h3>{uiText(language, 'Chưa có sản phẩm yêu thích')}</h3><p>{uiText(language, 'Nhấn biểu tượng trái tim trên sản phẩm để lưu lại.')}</p><Link className="button button-primary" to="/search">{uiText(language, 'Khám phá sản phẩm')}</Link></div>)}
  </div>;
}
