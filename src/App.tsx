import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from './i18n';
import { uiText } from './uiCopy';
import { HomePage } from './HomePage';
import { BlogPage } from './BlogPage';
import { BlogDetailPage } from './BlogDetailPage';
import { ProductDetailPage } from './ProductDetailPage';
import { SearchPage } from './SearchPage';
import { ShopPage } from './ShopPage';
import { getSearchSuggestions } from './searchApi';
import { ComparePage } from './ComparePage';
import { AuthCallbackPage } from './AuthCallbackPage';
import { WishlistPage } from './WishlistPage';
import { getApplicationTitle } from './pageMetadata';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const languageControlRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (query.trim()) { setSuggestions([]); navigate(`/search?q=${encodeURIComponent(query.trim())}`); } };
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) { setSuggestions([]); setSuggestionsError(false); return; }
    let active = true;
    const timer = window.setTimeout(() => getSearchSuggestions(value).then(items => { if (active) { setSuggestions(items); setSuggestionsError(false); } }).catch(() => { if (active) { setSuggestions([]); setSuggestionsError(true); } }), 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);
  const chooseSuggestion = (item: string) => { setQuery(item); setSuggestions([]); navigate(`/search?q=${encodeURIComponent(item)}`); };
  useEffect(() => {
    if (!languageMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !languageControlRef.current?.contains(event.target)) setLanguageMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setLanguageMenuOpen(false); };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [languageMenuOpen]);
  const activeRoute = (route: 'home' | 'category' | 'featured' | 'blog') => {
    const path = location.pathname;
    if (route === 'home') return path === '/' ? 'active' : undefined;
    if (route === 'category') return path.startsWith('/category/') ? 'active' : undefined;
    if (route === 'featured') return path === '/search' ? 'active' : undefined;
    return path === '/blog' || path.startsWith('/blog/') ? 'active' : undefined;
  };
  const options = [
    { value: 'vi', code: 'VI', label: 'VI — Tiếng Việt', marker: 'VN' },
    { value: 'en', code: 'EN', label: 'EN — English', marker: 'EN' },
    { value: 'id', code: 'ID', label: 'ID — Bahasa Indonesia', marker: 'ID' },
  ] as const;
  return <header className="site-header"><div className="header-inner"><Link className="brand" to="/"><span className="brand-mark">G</span><span>GiaTot<small>{language === 'vi' ? 'So sánh giá thông minh' : language === 'id' ? 'Perbandingan harga cerdas' : 'Smart price comparison'}</small></span></Link><span className="header-brand-divider" aria-hidden="true" /><nav className="desktop-nav" aria-label="Primary navigation"><Link className={activeRoute('home')} aria-current={activeRoute('home') ? 'page' : undefined} to="/">{t('home')}</Link><Link className={activeRoute('category')} aria-current={activeRoute('category') ? 'page' : undefined} to="/category/phone">{t('categories')}<svg className="nav-chevron" aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></Link><Link className={activeRoute('featured')} aria-current={activeRoute('featured') ? 'page' : undefined} to="/search">{t('featured')}</Link><Link className={activeRoute('blog')} aria-current={activeRoute('blog') ? 'page' : undefined} to="/blog">{t('blog')}</Link></nav><div className="header-search-wrap"><form className="header-search" onSubmit={submit}><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm sản phẩm, thương hiệu, mã SKU…" aria-label={t('searchPlaceholder')} aria-expanded={suggestions.length > 0} aria-controls="search-suggestions" /><button>⌘ K</button></form>{suggestions.length > 0 && <div className="search-suggestions" id="search-suggestions" role="listbox">{suggestions.map((item, index) => <button type="button" role="option" key={`${item}-${index}`} onClick={() => chooseSuggestion(item)}>{item}</button>)}</div>}{suggestionsError && <span className="suggestion-error" role="status">{t('searchSuggestionsUnavailable')}</span>}</div><nav className="header-links" aria-label="Header actions"><Link className="header-action" to="/wishlist"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>{t('wishlist')}</Link><Link className="header-action" to="/account"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>{t('account')}</Link><span className="header-actions-divider" aria-hidden="true" /><div className="header-language-control" ref={languageControlRef}><button className="language-trigger" type="button" aria-label="Change language" aria-haspopup="listbox" aria-expanded={languageMenuOpen} aria-controls="header-language-options" onClick={() => setLanguageMenuOpen(open => !open)}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg><b>{language.toUpperCase()}</b><svg className={`language-chevron${languageMenuOpen ? ' is-open' : ''}`} aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></button>{languageMenuOpen && <div className="language-menu" id="header-language-options" role="listbox" aria-label="Choose language">{options.map(option => <button className={`language-option${language === option.value ? ' selected' : ''}`} type="button" role="option" aria-selected={language === option.value} key={option.value} onClick={() => { setLanguage(option.value); setLanguageMenuOpen(false); }}><span className={`language-marker language-marker-${option.value}`} aria-hidden="true">{option.marker}</span><span>{option.label}</span>{language === option.value && <span className="language-check" aria-hidden="true">✓</span>}</button>)}</div>}</div></nav><button className="mobile-search" onClick={() => navigate('/search')}>⌕</button></div></header>;
}
function BottomNav() {
  const location = useLocation(); const { t } = useLanguage(); return <nav className="bottom-nav" aria-label="Primary navigation"><Link className={location.pathname === '/' ? 'active' : ''} to="/">⌂<span>{t('home')}</span></Link><Link className={location.pathname.startsWith('/category') ? 'active' : ''} to="/category/phone">◫<span>{t('categories')}</span></Link><Link className={location.pathname === '/wishlist' ? 'active' : ''} to="/wishlist">♡<span>{t('wishlist')}</span></Link><Link className={location.pathname.startsWith('/blog') ? 'active' : ''} to="/blog">▤<span>{t('blog')}</span></Link><Link className={location.pathname === '/account' ? 'active' : ''} to="/account">♙<span>{t('account')}</span></Link></nav>; }
function getShellClass(pathname: string) {
  if (/^\/product\/[^/]+$/.test(pathname)) return 'product-shell';
  if (/^\/shops\/[^/]+$/.test(pathname)) return 'shop-shell';
  if (pathname === '/blog' || /^\/blog\/[^/]+$/.test(pathname)) return 'blog-shell';
  if (pathname === '/' || pathname === '/search' || /^\/category\/[^/]+$/.test(pathname) || ['/compare', '/wishlist', '/login', '/account'].includes(pathname)) {
    return pathname === '/' ? 'home-shell' : 'light-shell';
  }
  return 'home-shell';
}
function Shell({ children }: { children: React.ReactNode }) { const location = useLocation(); return <div className={getShellClass(location.pathname)}><Header /><main className="container">{children}</main><BottomNav /></div>; }
function Partners() {
  const { t } = useLanguage(); const partners = [{ name: 'Shopee', mark: 'S', tone: 'orange', note: t('marketplace') }, { name: 'Lazada', mark: 'L', tone: 'purple', note: t('marketplace') }, { name: 'Tiki', mark: 'T', tone: 'blue', note: t('ecommerce') }, { name: 'FPT Shop', mark: 'F', tone: 'slate', note: t('technology') }, { name: 'CellphoneS', mark: 'C', tone: 'red', note: t('technology') }, { name: 'Viettel Store', mark: 'V', tone: 'slate', note: t('technology') }, { name: 'Hoàng Hà Mobile', mark: 'H', tone: 'green', note: t('technology') }]; return <section className="partners"><div className="partners-heading"><span className="eyebrow">{t('trustedPlaces')}</span><h2>{t('partnersTitle')}</h2><p>{t('partnerDescription')}</p></div><div className="partner-grid">{partners.map(partner => <Link className="partner-card" to={`/shops/${partner.name.toLowerCase().replaceAll(' ', '-')}`} key={partner.name}><span className={`partner-mark ${partner.tone}`}>{partner.mark}</span><span><strong>{partner.name}</strong><small>{partner.note}</small></span><b>↗</b></Link>)}</div><div className="trust-grid"><div><span className="trust-icon">⌕</span><span><b>{t('trustFast')}</b><small>{t('trustFastDesc')}</small></span></div><div><span className="trust-icon">✓</span><span><b>{t('trustClear')}</b><small>{t('trustClearDesc')}</small></span></div><div><span className="trust-icon">◷</span><span><b>{t('trustTime')}</b><small>{t('trustTimeDesc')}</small></span></div><div><span className="trust-icon">♡</span><span><b>{t('trustFree')}</b><small>{t('trustFreeDesc')}</small></span></div></div></section>; }
function Footer() {
  const { t } = useLanguage(); return <footer className="site-footer"><div className="footer-newsletter"><div><span className="eyebrow">{t('newsletterEyebrow')}</span><h3>{t('newsletterTitle')}</h3><p>{t('newsletterDesc')}</p></div><form className="newsletter"><input placeholder={t('emailAddress')} aria-label={t('emailAddress')} type="email" /><button className="button button-primary">{t('subscribe')} <span>→</span></button></form></div><div className="footer-main"><div className="footer-brand"><Link className="brand" to="/"><span className="brand-mark">G</span><span>GiaTot<small>{t('newsletterStoreTagline')}</small></span></Link><p>{t('footerTagline')}</p><div className="social-links"><span>f</span><span>◎</span><span>in</span></div></div><div><strong>{t('about')}</strong><Link to="/blog">{t('blog')}</Link><Link to="/account">{t('account')}</Link><Link to="/shops/techmart">{t('partnerLink')}</Link></div><div><strong>{t('exploreMenu')}</strong><Link to="/search">{t('categories')}</Link><Link to="/compare">{t('compareProducts')}</Link><Link to="/wishlist">{t('trackPrices')}</Link></div><div><strong>{t('support')}</strong><Link to="/search">{t('helpCenter')}</Link><Link to="/account">{t('terms')}</Link><Link to="/account">{t('privacyPolicy')}</Link></div></div><div className="footer-bottom"><span>© 2026 GiaTot. {t('allRightsReserved')}</span><span>{t('madeForSmarterShopping')} <b>♥</b></span></div></footer>; }
function LoginPage() {
  const { language } = useLanguage(); return <div className="auth-page"><div className="auth-panel"><Link className="brand" to="/"><span className="brand-mark">G</span><span>GiaTot</span></Link><h1>{uiText(language, 'Đăng nhập để trải nghiệm tốt hơn')}</h1><p className="muted">{uiText(language, 'Lưu sản phẩm, theo dõi giá và nhận ưu đãi.')}</p><button className="social-button">{uiText(language, '🌐 Tiếp tục với Google')}</button><button className="social-button">{uiText(language, '● Tiếp tục với Apple')}</button><div className="auth-divider">{uiText(language, 'hoặc')}</div><input placeholder={uiText(language, 'Nhập email của bạn')} type="email" /><input placeholder={uiText(language, 'Nhập mật khẩu')} type="password" /><button className="button button-primary button-large">{uiText(language, 'Đăng nhập')}</button><p className="muted">{uiText(language, 'Chưa có tài khoản?')}<Link to="/account">{uiText(language, 'Đăng ký ngay')}</Link></p></div><div className="auth-art"><div className="promo-bag">%</div><h2>{uiText(language, 'Mua sắm thông minh,')}<br />{uiText(language, 'tiết kiệm hơn.')}</h2></div></div>; }
function AccountPage() {
  const accountName = 'Trần Minh Quân';
  const { language } = useLanguage(); const actions = [{ icon: '♡', title: 'Sản phẩm yêu thích', description: 'Các sản phẩm bạn đã lưu', value: '3 sản phẩm', to: '/wishlist' }, { icon: '⌁', title: 'Theo dõi giá', description: 'Nhận thông báo khi giá giảm', value: '2 sản phẩm', to: '/wishlist' }, { icon: '◷', title: 'Lịch sử xem', description: 'Xem lại các sản phẩm gần đây', value: '12 sản phẩm', to: '/search' }, { icon: '▤', title: 'Bài viết đã lưu', description: 'Nội dung bạn muốn đọc lại', value: '4 bài viết', to: '/blog' }, { icon: '♢', title: 'Thông báo', description: 'Cập nhật mới nhất cho bạn', value: '2 tin mới', to: '/wishlist' }, { icon: '⚙', title: 'Cài đặt tài khoản', description: 'Thông tin cá nhân và bảo mật', value: '', to: '/account' }].map(action => ({ ...action, title: uiText(language, action.title), description: uiText(language, action.description), value: uiText(language, action.value) })); return <div className="account-page"><section className="account-hero"><div className="account-profile"><div className="account-avatar">T<span className="avatar-status"></span></div><div><span className="eyebrow">{uiText(language, 'Tài khoản cá nhân')}</span><h1>{uiText(language, 'Xin chào,')} {accountName}</h1><p className="muted">quanquan@gmail.com <span className="verified">{uiText(language, '✓ Đã xác thực')}</span></p><small>{uiText(language, 'Thành viên từ tháng 09/2024')}</small></div></div><button className="button button-outline">{uiText(language, 'Chỉnh sửa hồ sơ')}</button></section><section className="account-stats"><div><span className="stat-icon orange">♡</span><span><b>3</b><small>{uiText(language, 'Sản phẩm yêu thích')}</small></span></div><div><span className="stat-icon green">⌁</span><span><b>2</b><small>{uiText(language, 'Đang theo dõi giá')}</small></span></div><div><span className="stat-icon blue">◷</span><span><b>12</b><small>{uiText(language, 'Lượt xem gần đây')}</small></span></div><div><span className="stat-icon purple">▤</span><span><b>4</b><small>{uiText(language, 'Bài viết đã lưu')}</small></span></div></section><div className="account-content"><section><div className="account-section-heading"><div><span className="eyebrow">{uiText(language, 'Quản lý tài khoản')}</span><h2>{uiText(language, 'Truy cập nhanh')}</h2></div></div><div className="account-action-grid">{actions.map(action => <Link className="account-action-card" to={action.to} key={action.title}><span className="account-action-icon">{action.icon}</span><span className="account-action-copy"><strong>{action.title}</strong><small>{action.description}</small>{action.value && <em>{action.value}</em>}</span><span className="account-arrow">→</span></Link>)}</div></section><aside className="account-side"><div className="account-tip"><span className="tip-icon">✦</span><div><strong>{uiText(language, 'Mẹo mua sắm thông minh')}</strong><p>{uiText(language, 'Lưu sản phẩm để GiaTot thông báo ngay khi có giá tốt hơn.')}</p><Link to="/search">{uiText(language, 'Khám phá sản phẩm →')}</Link></div></div><div className="account-security"><div><span className="security-icon">✓</span><span><strong>{uiText(language, 'Tài khoản an toàn')}</strong><small>{uiText(language, 'Email đã được xác thực')}</small></span></div><Link to="/account">{uiText(language, 'Quản lý bảo mật →')}</Link></div></aside></div><div className="account-logout-row"><button className="logout-button" onClick={() => { window.location.href = '/'; }}>{uiText(language, '⇥ Đăng xuất khỏi tài khoản')}</button></div></div>; }
export function App() {
  const location = useLocation();
  const { language } = useLanguage();
  useEffect(() => {
    document.title = getApplicationTitle(language);
  }, [language]);
  if (location.pathname === '/auth/callback') return <AuthCallbackPage />;
  return <Shell><Routes><Route path="/" element={<HomePage partners={<Partners />} footer={<Footer />} />} /><Route path="/search" element={<SearchPage />} /><Route path="/category/:slug" element={<SearchPage />} /><Route path="/product/:slug" element={<ProductDetailPage />} /><Route path="/compare" element={<ComparePage />} /><Route path="/blog" element={<BlogPage />} /><Route path="/blog/:id" element={<BlogDetailPage />} /><Route path="/shops/:slug" element={<ShopPage />} /><Route path="/wishlist" element={<WishlistPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/account" element={<AccountPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Shell>;
}
