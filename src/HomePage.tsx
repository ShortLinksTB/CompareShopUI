import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHomeData, type HomeCategory, type HomeProduct } from './homeApi';
import { useLanguage } from './i18n';

const money = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value);

function HomeProductCard({ product }: { product: HomeProduct }) {
  const { t } = useLanguage();
  const { minPrice, offerCount } = product.offerSummary;

  return <article className="product-card">
    <div className="product-image" role="img" aria-label={t('noImage')}>
      <span className="muted">{t('noImage')}</span>
    </div>
    <div className="product-card-body">
      <Link to={`/product/${product.slug}`} className="product-name">{product.name}</Link>
      <span className="muted">{product.brand}</span>
      {minPrice > 0 && <strong className="price">{t('from')} {money(minPrice)}</strong>}
      {offerCount > 0 && <span className="offer-count"><span className="shop-dot"></span>{offerCount} {t('storesSelling')}</span>}
      <div className="card-actions">
        <Link className="button button-primary" to={`/product/${product.slug}`}>{t('viewPrice')}</Link>
      </div>
    </div>
  </article>;
}

function HeroFeaturedProduct({ product }: { product: HomeProduct }) {
  const { t } = useLanguage();
  const { minPrice } = product.offerSummary;

  return <div className="hero-featured-product">
    <span className="hero-featured-image" role="img" aria-label={t('noImage')}><span>{t('noImage')}</span></span>
    <span className="hero-featured-name">{product.name}</span>
    {minPrice > 0 && <strong className="hero-featured-price">{money(minPrice)}</strong>}
  </div>;
}

export function HomePage({ partners, footer }: { partners: React.ReactNode; footer: React.ReactNode }) {
  const { language, t } = useLanguage();
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    getHomeData()
      .then(data => {
        setCategories(data.categories);
        setProducts(data.products);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const computerProducts = products.filter(product => product.category.slug === 'computers').slice(0, 5);
  const heroProducts = products.slice(0, 3);
  const productCount = (count: number) => t(count === 1 ? 'oneProduct' : 'manyProducts')
    .replace('{count}', count.toLocaleString(language));
  const submitHeroSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = (event.currentTarget.elements.namedItem('q') as HTMLInputElement).value;
    if (value) window.location.href = `/search?q=${encodeURIComponent(value)}`;
  };

  return <>
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><span className="hero-eyebrow-rule" aria-hidden="true" />{t('smartShopping')}</span>
        <h1>{t('heroTitle')}<br /><em>{t('heroAccent')}</em></h1>
        <p>{t('heroDescription')}</p>
        <form className="hero-search" onSubmit={submitHeroSearch}>
          <input name="q" placeholder={t('searchPlaceholder')} aria-label={t('homeSearchPlaceholder')} />
          <button aria-label={t('search')}>⌕</button>
        </form>
        <div className="popular-searches">
          <span>{t('popularSearch')}</span>
          {categories.slice(0, 3).map(category => <Link to={`/category/${category.slug}`} key={category.id}>{category.name}</Link>)}
        </div>
      </div>

      <div className="hero-featured-card">
        <h2>🔥 {t('featuredProducts')}</h2>
        {loading ? <p role="status">{t('loadingProducts')}</p> : !error && heroProducts.map(product => <HeroFeaturedProduct key={product.id} product={product} />)}
      </div>
    </section>

    <section className="section">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><span className="hero-eyebrow-rule" aria-hidden="true" />{t('discover')}</span>
          <h2>{t('popularCategories')}</h2>
        </div>
        <Link to="/search">{t('viewAll')} →</Link>
      </div>
      {loading ? <p role="status">{t('loadingCategories')}</p> : error ? null : categories.length ? <div className="category-grid">
        {categories.map(category => <Link className="category-card" to={`/category/${category.slug}`} key={category.id}>
          <span className="category-icon" aria-hidden="true">◇</span>
          <span className="category-copy">
            <strong>{category.name}</strong>
            <small>{productCount(category.productCount)}</small>
          </span>
          <span className="category-arrow" aria-hidden="true">→</span>
        </Link>)}
      </div> : <div className="empty-state"><span>◇</span><h3>{t('noCategories')}</h3></div>}
    </section>

    <section className="section">
      <div className="section-heading">
        <div><span className="eyebrow">{t('featuredEyebrow')}</span><h2>{t('featuredProducts')}</h2></div>
        <Link to="/search">{t('viewAll')} →</Link>
      </div>
      {loading ? <p role="status">{t('loadingProducts')}</p> : error ? null : products.length ? <div className="product-grid">
        {products.slice(0, 5).map(product => <HomeProductCard key={product.id} product={product} />)}
      </div> : <div className="empty-state"><span>⌕</span><h3>{t('noFeaturedProducts')}</h3></div>}
    </section>

    <section className="promo-banner">
      <div>
        <span className="eyebrow">{t('promoEyebrow')}</span>
        <h2>{t('promoTitle')}</h2>
        <p>{t('promoDescription')}</p>
        <Link className="button button-primary" to="/search">{t('exploreNow')} →</Link>
      </div>
      <div className="promo-bag">%</div>
    </section>

    <section className="section">
      <div className="section-heading">
        <div><span className="eyebrow">{t('forYou')}</span><h2>{t('featuredComputers')}</h2></div>
        <Link to="/category/computers">{t('viewAll')} →</Link>
      </div>
      {loading ? <p role="status">{t('loadingProducts')}</p> : error ? null : computerProducts.length ? <div className="product-grid">
        {computerProducts.map(product => <HomeProductCard key={product.id} product={product} />)}
      </div> : <div className="empty-state"><span>⌕</span><h3>{t('noCategoryProducts')}</h3></div>}
    </section>

    {error && <div className="empty-state" role="alert">
      <h3>{t('homeLoadError')}</h3>
      <p>{t('tryAgain')}.</p>
      <button className="button button-primary" onClick={load}>{t('tryAgain')}</button>
    </div>}
    {partners}
    {footer}
  </>;
}
