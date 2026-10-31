import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearAuthenticatedSession, getAuthenticatedAccessToken, startSignIn } from './auth/authClient';
import { getWishlist, removeWishlistItem, WishlistApiError, type WishlistItemDto } from './wishlistApi';

type WishlistState = 'loading' | 'signed-out' | 'loaded' | 'load-error';

function WishlistSkeleton() {
  return <div className="wishlist-list" aria-label="Đang tải sản phẩm yêu thích" aria-busy="true">
    {[0, 1].map(item => <div className="wishlist-item" key={item}>
      <div className="wishlist-skeleton-thumb skeleton" />
      <div className="wishlist-skeleton-copy"><span className="skeleton" /><span className="skeleton" /></div>
    </div>)}
  </div>;
}

export function WishlistPage() {
  const [state, setState] = useState<WishlistState>('loading');
  const [items, setItems] = useState<WishlistItemDto[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [loadRetry, setLoadRetry] = useState(0);
  const [removing, setRemoving] = useState<number | null>(null);
  const [removeFailure, setRemoveFailure] = useState<number | null>(null);
  const [signInStarting, setSignInStarting] = useState(false);

  useEffect(() => {
    let active = true;
    setState('loading');
    setItems([]);
    setAccessToken(null);
    getAuthenticatedAccessToken().then(token => {
      if (!active) return;
      if (!token) { setState('signed-out'); return; }
      return getWishlist(token).then(result => {
        if (!active) return;
        setAccessToken(token);
        setItems(result);
        setState('loaded');
      });
    }).catch(async error => {
      if (!active) return;
      if (error instanceof WishlistApiError && error.status === 401) {
        await clearAuthenticatedSession().catch(() => undefined);
        if (!active) return;
        setExpired(true);
        setState('signed-out');
      } else {
        setState('load-error');
      }
    });
    return () => { active = false; };
  }, [loadRetry]);

  const signIn = async () => {
    setSignInStarting(true);
    try { await startSignIn('/wishlist'); }
    catch { setSignInStarting(false); }
  };

  const remove = useCallback(async (item: WishlistItemDto) => {
    if (!accessToken) return;
    setRemoving(item.productId);
    setRemoveFailure(null);
    try {
      await removeWishlistItem(accessToken, item.productId);
      setItems(current => current.filter(saved => saved.productId !== item.productId));
    } catch (error) {
      if (error instanceof WishlistApiError && error.status === 401) {
        await clearAuthenticatedSession().catch(() => undefined);
        setAccessToken(null);
        setItems([]);
        setExpired(true);
        setState('signed-out');
      } else {
        setRemoveFailure(item.productId);
      }
    } finally { setRemoving(null); }
  }, [accessToken]);

  return <div className="wishlist-page">
    <div className="page-title"><div><span className="eyebrow">Cá nhân</span><h1>Sản phẩm yêu thích</h1><p className="muted">Theo dõi giá và nhận thông báo khi sản phẩm giảm giá.</p></div></div>
    <div className="wishlist-tabs"><button className="active" type="button">Sản phẩm đã lưu ({state === 'loading' ? '…' : state === 'loaded' ? items.length : 0})</button><button type="button">Theo dõi giá (0)</button></div>
    {state === 'loading' && <WishlistSkeleton />}
    {state === 'signed-out' && <>
      {expired && <div className="alert wishlist-alert" role="alert"><span>Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.</span><button type="button" onClick={() => void signIn()} disabled={signInStarting}>Đăng nhập lại</button></div>}
      <div className="empty-state wishlist-unauthenticated-state"><span>♡</span><h3>Đăng nhập để xem sản phẩm đã lưu</h3><div className="wishlist-unauthenticated__actions"><p>Danh sách yêu thích chỉ hiển thị cho tài khoản đã xác thực.</p><button className="button button-primary wishlist-unauthenticated__cta" type="button" onClick={() => void signIn()} disabled={signInStarting}>{signInStarting ? 'Đang chuyển đến đăng nhập…' : 'Đăng nhập'}</button></div></div>
    </>}
    {state === 'load-error' && <div className="empty-state" role="alert"><h3>Không thể tải sản phẩm yêu thích</h3><p>Vui lòng thử lại.</p><button className="button button-primary" type="button" onClick={() => setLoadRetry(value => value + 1)}>Thử lại</button></div>}
    {state === 'loaded' && (items.length ? <div className="wishlist-list">{items.map(item => <div className="wishlist-item" key={item.productId}>
      <div className="safe-image-fallback" role="img" aria-label={item.name}><span>Chưa có hình ảnh</span></div>
      <div><Link to={`/product/${item.slug}`}><strong>{item.name}</strong></Link><span className="price">Giá hiện tại chưa có dữ liệu</span></div>
      <button className="button button-ghost" type="button" onClick={() => void remove(item)} disabled={removing === item.productId} aria-label={`Xóa ${item.name}`}>{removing === item.productId ? '…' : '×'}</button>
    </div>)}</div> : <div className="empty-state"><span>♡</span><h3>Chưa có sản phẩm yêu thích</h3><p>Nhấn biểu tượng trái tim trên sản phẩm để lưu lại.</p><Link className="button button-primary" to="/search">Khám phá sản phẩm</Link></div>)}
    {removeFailure !== null && state === 'loaded' && <div className="alert wishlist-alert" role="alert"><span>Không thể xóa sản phẩm yêu thích. Vui lòng thử lại.</span><button type="button" onClick={() => { const failedItem = items.find(item => item.productId === removeFailure); if (failedItem) void remove(failedItem); }}>Thử lại</button></div>}
  </div>;
}
