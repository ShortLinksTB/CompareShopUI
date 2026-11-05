import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHomeData, type HomeCategory, type HomeProduct } from './homeApi';
import { useLanguage } from './i18n';
import { SafeImage } from './components/SafeImage';

const money = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value);

function HomeProductCard({ product }: { product: HomeProduct }) {
  const { t } = useLanguage();
  const { minPrice, offerCount } = product.offerSummary;

  return <article className="product-card">
    <div className="product-image">{product.imageUrl ? <SafeImage src={product.imageUrl} alt={product.name} fallbackLabel={t('noImage')} /> : <div role="img" aria-label={t('noImage')}><span className="muted">{t('noImage')}</span></div>}</div>
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
    {product.imageUrl ? <SafeImage className="hero-featured-image" src={product.imageUrl} alt={product.name} fallbackLabel={t('noImage')} /> : <span className="hero-featured-image" role="img" aria-label={t('noImage')}><span>{t('noImage')}</span></span>}
    <span className="hero-featured-name">{product.name}</span>
    {minPrice > 0 && <strong className="hero-featured-price">{money(minPrice)}</strong>}
  </div>;
}

function CategoryIcon({ slug }: { slug: string }) {
  const normalizedSlug = slug.toLowerCase();
  const icon = /audio|headphone|sound|speaker/.test(normalizedSlug)
    ? 'audio'
    : /computer|laptop|desktop|pc/.test(normalizedSlug)
      ? 'computer'
      : /phone|mobile/.test(normalizedSlug)
        ? 'phone'
        : 'category';

  return <svg data-category-icon={icon} aria-hidden="true" viewBox="0 0 24 24">
    {icon === 'audio' ? <>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M3 18a2 2 0 0 0 2 2h1v-7H3v5Zm18 0a2 2 0 0 1-2 2h-1v-7h3v5Z" />
    </> : icon === 'computer' ? <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </> : icon === 'phone' ? <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </> : <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>}
  </svg>;
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
        {loading ? <p role="status">{t('loadingProducts')}</p> : !error && (heroProducts.length
          ? heroProducts.map(product => <HeroFeaturedProduct key={product.id} product={product} />)
          : <p className="hero-featured-empty">{t('noFeaturedProducts')}</p>)}
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
          <span className="category-icon"><CategoryIcon slug={category.slug} /></span>
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
