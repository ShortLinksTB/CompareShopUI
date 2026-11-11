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
import { AuthPages } from './auth/AuthPages';
import { WishlistPage } from './WishlistPage';
import { getApplicationTitle } from './pageMetadata';
import { AccountPage } from './AccountPage';
import { WishlistProvider } from './wishlist/WishlistContext';
import { useAuthSession } from './auth/AuthSession';

function HeaderSessionActions() {
  const session = useAuthSession();
  const location = useLocation();
  const { language, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  if (session.status === 'anonymous') {
    return <button className="header-action header-sign-in" type="button" onClick={() => void session.signIn(`${location.pathname}${location.search}${location.hash}`)}>{uiText(language, 'Đăng nhập')}</button>;
  }
  if (session.status !== 'authenticated' || !session.user) return null;

  return <div className="header-user-menu">
    <button className="header-action header-user-trigger" type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
      <span className="header-user-avatar" aria-hidden="true">{session.user.displayName.trim().charAt(0).toUpperCase()}</span><span className="header-user-name">{session.user.displayName}</span>
    </button>
    {menuOpen && <div className="header-user-dropdown" role="menu">
      <Link className="header-action" role="menuitem" to="/wishlist">{t('wishlist')}</Link>
      <Link className="header-action" role="menuitem" to="/account">{t('account')}</Link>
      {signOutFailed && <span className="auth-header-error" role="alert">{uiText(language, 'Không thể đăng xuất. Vui lòng thử lại.')}</span>}
      <button className="header-action" role="menuitem" type="button" onClick={() => { setSignOutFailed(false); void Promise.resolve(session.signOut()).catch(() => setSignOutFailed(true)); }}>{uiText(language, 'Đăng xuất')}</button>
    </div>}
  </div>;
}

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
  return <header className="site-header"><div className="header-inner"><Link className="brand" to="/"><span className="brand-mark">G</span><span>GiaTot<small>{language === 'vi' ? 'So sánh giá thông minh' : language === 'id' ? 'Perbandingan harga cerdas' : 'Smart price comparison'}</small></span></Link><span className="header-brand-divider" aria-hidden="true" /><nav className="desktop-nav" aria-label="Primary navigation"><Link className={activeRoute('home')} aria-current={activeRoute('home') ? 'page' : undefined} to="/">{t('home')}</Link><Link className={activeRoute('category')} aria-current={activeRoute('category') ? 'page' : undefined} to="/category/phone">{t('categories')}<svg className="nav-chevron" aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></Link><Link className={activeRoute('featured')} aria-current={activeRoute('featured') ? 'page' : undefined} to="/search">{t('featured')}</Link><Link className={activeRoute('blog')} aria-current={activeRoute('blog') ? 'page' : undefined} to="/blog">{t('blog')}</Link></nav><div className="header-search-wrap"><form className="header-search" onSubmit={submit}><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm sản phẩm, thương hiệu, mã SKU…" aria-label={t('searchPlaceholder')} aria-expanded={suggestions.length > 0} aria-controls="search-suggestions" /><button>⌘ K</button></form>{suggestions.length > 0 && <div className="search-suggestions" id="search-suggestions" role="listbox">{suggestions.map((item, index) => <button type="button" role="option" key={`${item}-${index}`} onClick={() => chooseSuggestion(item)}>{item}</button>)}</div>}{suggestionsError && <span className="suggestion-error" role="status">{t('searchSuggestionsUnavailable')}</span>}</div><nav className="header-links" aria-label="Header actions"><HeaderSessionActions /><span className="header-actions-divider" aria-hidden="true" /><div className="header-language-control" ref={languageControlRef}><button className="language-trigger" type="button" aria-label="Change language" aria-haspopup="listbox" aria-expanded={languageMenuOpen} aria-controls="header-language-options" onClick={() => setLanguageMenuOpen(open => !open)}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg><b>{language.toUpperCase()}</b><svg className={`language-chevron${languageMenuOpen ? ' is-open' : ''}`} aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></button>{languageMenuOpen && <div className="language-menu" id="header-language-options" role="listbox" aria-label="Choose language">{options.map(option => <button className={`language-option${language === option.value ? ' selected' : ''}`} type="button" role="option" aria-selected={language === option.value} key={option.value} onClick={() => { setLanguage(option.value); setLanguageMenuOpen(false); }}><span className={`language-marker language-marker-${option.value}`} aria-hidden="true">{option.marker}</span><span>{option.label}</span>{language === option.value && <span className="language-check" aria-hidden="true">✓</span>}</button>)}</div>}</div></nav><button className="mobile-search" onClick={() => navigate('/search')}>⌕</button></div></header>;
}
function BottomNav() {
  const location = useLocation(); const { t } = useLanguage(); return <nav className="bottom-nav" aria-label="Primary navigation"><Link className={location.pathname === '/' ? 'active' : ''} to="/">⌂<span>{t('home')}</span></Link><Link className={location.pathname.startsWith('/category') ? 'active' : ''} to="/category/phone">◫<span>{t('categories')}</span></Link><Link className={location.pathname === '/wishlist' ? 'active' : ''} to="/wishlist">♡<span>{t('wishlist')}</span></Link><Link className={location.pathname.startsWith('/blog') ? 'active' : ''} to="/blog">▤<span>{t('blog')}</span></Link><Link className={location.pathname === '/account' ? 'active' : ''} to="/account">♙<span>{t('account')}</span></Link></nav>; }
function getShellClass(pathname: string) {
  if (/^\/product\/[^/]+$/.test(pathname)) return 'product-shell';
  if (/^\/shops\/[^/]+$/.test(pathname)) return 'shop-shell';
  if (pathname === '/blog' || /^\/blog\/[^/]+$/.test(pathname)) return 'blog-shell';
  if (pathname === '/' || pathname === '/search' || /^\/category\/[^/]+$/.test(pathname) || ['/compare', '/wishlist', '/login', '/register', '/verify-email', '/forgot-password', '/account'].includes(pathname)) {
    return pathname === '/' ? 'home-shell' : 'light-shell';
  }
  return 'home-shell';
}
function Shell({ children }: { children: React.ReactNode }) { const location = useLocation(); return <div className={getShellClass(location.pathname)}><Header /><main className="container">{children}</main><BottomNav /></div>; }
function Partners() {
  const { t } = useLanguage();
  const partners = ['Shopee', 'Lazada', 'Tiki', 'FPT', 'CellphoneS', 'Viettel', 'Hoàng Hà Mobile', 'Thế Giới Di Động', 'Điện Máy Xanh', 'Nguyễn Kim', 'Pico', 'Senheng'];
  return <section className="partners"><div className="partners-heading"><span className="eyebrow">{t('trustedPlaces')}</span><h2>{t('partnersTitle')}</h2><p>{t('partnerDescription')}</p></div><div className="partner-grid">{partners.map(name => <Link className="partner-card" to={`/shops/${name.toLowerCase().replaceAll(' ', '-')}`} key={name} aria-label={name}><span className="partner-wordmark" aria-hidden="true">{name}</span></Link>)}</div><div className="trust-grid"><div className="trust-card"><span className="trust-icon">⌕</span><span><b>{t('trustFast')}</b><small>{t('trustFastDesc')}</small></span></div><div className="trust-card"><span className="trust-icon">✓</span><span><b>{t('trustClear')}</b><small>{t('trustClearDesc')}</small></span></div><div className="trust-card"><span className="trust-icon">◷</span><span><b>{t('trustTime')}</b><small>{t('trustTimeDesc')}</small></span></div><div className="trust-card"><span className="trust-icon">♡</span><span><b>{t('trustFree')}</b><small>{t('trustFreeDesc')}</small></span></div></div></section>;
}
function Footer() {
  const { t } = useLanguage(); return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Link className="brand" to="/"><span className="brand-mark">G</span><span>GiaTot<small>{t('newsletterStoreTagline')}</small></span></Link><p>{t('footerTagline')}</p><div className="social-links"><span>f</span><span>◎</span><span>in</span></div></div><div><strong>{t('about')}</strong><Link to="/blog">{t('blog')}</Link><Link to="/account">{t('account')}</Link><Link to="/shops/techmart">{t('partnerLink')}</Link></div><div><strong>{t('exploreMenu')}</strong><Link to="/search">{t('categories')}</Link><Link to="/compare">{t('compareProducts')}</Link><Link to="/wishlist">{t('trackPrices')}</Link></div><div><strong>{t('support')}</strong><Link to="/search">{t('helpCenter')}</Link><Link to="/account">{t('terms')}</Link><Link to="/account">{t('privacyPolicy')}</Link></div></div><div className="footer-bottom"><span>© 2026 GiaTot. {t('allRightsReserved')}</span><span>{t('madeForSmarterShopping')} <b>♥</b></span></div></footer>; }
export function App() {
  const location = useLocation();
  const { language } = useLanguage();
  useEffect(() => {
    document.title = getApplicationTitle(language);
  }, [language]);
  if (['/login', '/register', '/verify-email', '/forgot-password'].includes(location.pathname)) return <Shell><AuthPages /></Shell>;
  return <WishlistProvider><Shell><Routes><Route path="/" element={<HomePage partners={<Partners />} footer={<Footer />} />} /><Route path="/search" element={<SearchPage />} /><Route path="/category/:slug" element={<SearchPage />} /><Route path="/product/:slug" element={<ProductDetailPage />} /><Route path="/compare" element={<ComparePage />} /><Route path="/blog" element={<BlogPage />} /><Route path="/blog/:slug" element={<BlogDetailPage />} /><Route path="/shops/:slug" element={<ShopPage />} /><Route path="/wishlist" element={<WishlistPage />} /><Route path="/login" element={<AuthPages />} /><Route path="/register" element={<AuthPages />} /><Route path="/verify-email" element={<AuthPages />} /><Route path="/forgot-password" element={<AuthPages />} /><Route path="/account" element={<AccountPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Shell></WishlistProvider>;
}
