import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BLOG_CATEGORIES, FEATURED_POST, formatBlogDate, getBlogPosts } from './blogMockData';
import { uiText } from './uiCopy';
import { useLanguage } from './i18n';
import { getApplicationTitle } from './pageMetadata';

const PAGE_SIZE = 12;

export function BlogPage() {
  const { language } = useLanguage();
  const [category, setCategory] = useState<string>('Tất cả');
  const [page, setPage] = useState(1);
  useEffect(() => { document.title = getApplicationTitle(language); }, [language]);
  const filtered = useMemo(() => category === 'Tất cả' ? getBlogPosts() : getBlogPosts().filter(post => post.category === category), [category]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pagePosts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectCategory = (value: string) => { setCategory(value); setPage(1); };
  return <div className="blog-listing-page">
    <header className="blog-page-head"><span className="eyebrow">Kiến thức mua sắm</span><h1>Tin tức &amp; kinh nghiệm</h1><p>Chia sẻ kinh nghiệm, đánh giá sản phẩm và mẹo mua sắm thông minh.</p></header>
    <nav className="blog-tabs" aria-label="Lọc chuyên mục">{['Tất cả', ...BLOG_CATEGORIES].map(value => <button key={value} type="button" className={category === value ? 'active' : ''} aria-pressed={category === value} onClick={() => selectCategory(value)}>{uiText(language, value)}</button>)}</nav>
    {filtered.length === 0 ? <div className="empty-state"><span>▤</span><h3>{uiText(language, 'Chưa có bài viết')}</h3><p>{uiText(language, 'Các bài viết mới sẽ xuất hiện tại đây.')}</p></div> : <>
      {category === 'Tất cả' && <Link className="blog-featured" to={`/blog/${FEATURED_POST.slug}`}><div className="blog-featured-image" role="img" aria-label={FEATURED_POST.title}><span>▧</span></div><div className="blog-featured-copy"><span className="blog-chip">Nổi bật</span><h2>{FEATURED_POST.title}</h2><p>{FEATURED_POST.excerpt}</p><div className="blog-meta"><span className="blog-avatar">{FEATURED_POST.initials}</span><span>{FEATURED_POST.author}</span><span>·</span><span>{formatBlogDate(FEATURED_POST.publishedAt)}</span><span>·</span><span>{FEATURED_POST.readingMinutes} phút đọc</span></div></div></Link>}
      <h2 className="blog-section-title">Bài viết mới nhất</h2><div className="blog-post-grid">{pagePosts.map(post => <Link className="blog-post-card" to={`/blog/${post.slug}`} key={post.slug}><div className="blog-post-image" role="img" aria-label={post.title}>▧</div><div className="blog-post-copy"><span className="blog-chip">{post.category}</span><h3>{post.title}</h3><p>{post.excerpt}</p><div className="blog-meta"><span className="blog-avatar">{post.initials}</span><span>{post.author}</span><span>·</span><span>{formatBlogDate(post.publishedAt)}</span></div></div></Link>)}</div>
      {pageCount > 1 && <nav className="blog-pagination" aria-label="Phân trang">{Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <button key={number} type="button" className={page === number ? 'active' : ''} aria-current={page === number ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}</nav>}
    </>}
  </div>;
}
