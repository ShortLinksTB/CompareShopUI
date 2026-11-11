import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSession } from './auth/AuthSession';
import { getWishlist } from './wishlistApi';
import { useLanguage } from './i18n';
import { uiText } from './uiCopy';

export function AccountPage() {
  const { status, user, getAccessToken, signIn, signOut } = useAuthSession();
  const { language } = useLanguage();
  const [wishlistCount, setWishlistCount] = useState<number | null>(null);
  const [wishlistFailed, setWishlistFailed] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const signInStarted = useRef(false);

  useEffect(() => {
    if (status !== 'anonymous' || signInStarted.current) return;
    signInStarted.current = true;
    void signIn('/account');
  }, [signIn, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !user) {
      setWishlistCount(null);
      setWishlistFailed(false);
      return;
    }
    let active = true;
    setWishlistCount(null);
    setWishlistFailed(false);
    void getAccessToken().then(token => {
      if (!token) throw new Error('No access token available');
      return getWishlist(token);
    }).then(items => {
      if (active) setWishlistCount(items.length);
    }).catch(() => {
      if (active) setWishlistFailed(true);
    });
    return () => { active = false; };
  }, [getAccessToken, status, user]);

  if (status === 'loading') return <div className="account-page account-state" role="status">{uiText(language, 'Đang tải tài khoản…')}</div>;
  if (status === 'error') return <div className="account-page account-state" role="alert">{uiText(language, 'Không thể tải tài khoản. Vui lòng thử lại.')}</div>;
  if (status !== 'authenticated' || !user) return <div className="account-page account-state" role="status">{uiText(language, 'Đang chuyển đến đăng nhập…')}</div>;

  const actions = [
    { icon: '♡', title: 'Sản phẩm yêu thích', description: 'Các sản phẩm bạn đã lưu', value: wishlistCount === null ? uiText(language, 'Đang tải…') : language === 'en' ? `${wishlistCount} ${wishlistCount === 1 ? 'product' : 'products'}` : `${wishlistCount} sản phẩm`, to: '/wishlist', visible: true },
    { icon: '⌁', title: 'Theo dõi giá', description: 'Nhận thông báo khi giá giảm', value: '', to: '/wishlist', visible: false },
    { icon: '◷', title: 'Lịch sử xem', description: 'Xem lại các sản phẩm gần đây', value: '', to: '/search', visible: false },
    { icon: '▤', title: 'Bài viết đã lưu', description: 'Nội dung bạn muốn đọc lại', value: '', to: '/blog', visible: false },
    { icon: '♢', title: 'Thông báo', description: 'Cập nhật mới nhất cho bạn', value: '', to: '/wishlist', visible: false },
    { icon: '⚙', title: 'Cài đặt tài khoản', description: 'Thông tin cá nhân và bảo mật', value: '', to: '/account', visible: false },
  ].filter(action => action.visible).map(action => ({ ...action, title: uiText(language, action.title), description: uiText(language, action.description) }));

  return <div className="account-page">
    <section className="account-hero"><div className="account-profile"><div className="account-avatar" aria-hidden="true">{user.displayName.trim().charAt(0).toLocaleUpperCase(language)}<span className="avatar-status" /></div><div><span className="eyebrow">{uiText(language, 'Tài khoản cá nhân')}</span><h1>{uiText(language, 'Xin chào,')} {user.displayName}</h1><p className="muted">{user.email}</p></div></div></section>
    <section className="account-stats account-stats-live"><div><span className="stat-icon orange">♡</span><span><b>{wishlistFailed ? '—' : wishlistCount ?? '…'}</b><small>{uiText(language, 'Sản phẩm yêu thích')}</small></span></div></section>
    {wishlistFailed && <p className="account-inline-error" role="status">{uiText(language, 'Không thể tải số sản phẩm yêu thích.')}</p>}
    <div className="account-content"><section><div className="account-section-heading"><div><span className="eyebrow">{uiText(language, 'Quản lý tài khoản')}</span><h2>{uiText(language, 'Truy cập nhanh')}</h2></div></div><div className="account-action-grid">{actions.map(action => <Link className="account-action-card" to={action.to} key={action.title}><span className="account-action-icon">{action.icon}</span><span className="account-action-copy"><strong>{action.title}</strong><small>{action.description}</small>{action.value && <em>{wishlistFailed ? '—' : action.value}</em>}</span><span className="account-arrow">→</span></Link>)}</div></section><aside className="account-side"><div className="account-tip"><span className="tip-icon">✦</span><div><strong>{uiText(language, 'Mẹo mua sắm thông minh')}</strong><p>{uiText(language, 'Lưu sản phẩm để GiaTot thông báo ngay khi có giá tốt hơn.')}</p><Link to="/search">{uiText(language, 'Khám phá sản phẩm →')}</Link></div></div></aside></div>
    <div className="account-logout-row">{signOutFailed && <p className="account-inline-error" role="alert">{uiText(language, 'Không thể đăng xuất. Vui lòng thử lại.')}</p>}<button className="logout-button" onClick={() => { setSignOutFailed(false); void Promise.resolve(signOut()).catch(() => setSignOutFailed(true)); }}>{uiText(language, '⇥ Đăng xuất khỏi tài khoản')}</button></div>
  </div>;
}
