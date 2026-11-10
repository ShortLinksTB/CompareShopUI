import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from './i18n';
import { uiText } from './uiCopy';
import { blogArticles, blogCategories, blogPageSize, type BlogArticle } from './blogMockData';
import { formatBlogDate } from './blogFormatting';
import { BlogImage } from './components/BlogImage';
import { getApplicationTitle } from './pageMetadata';

function PostMeta({ article, language }: { article: BlogArticle; language: string }) {
  return <div className="blog-post-meta"><span className="blog-avatar" aria-hidden="true">{article.initials}</span><span>{article.author}</span><span aria-hidden="true">·</span><time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt, language)}</time></div>;
}

export function BlogPage({ articles = blogArticles }: { articles?: BlogArticle[] }) {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>(blogCategories[0]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = language === 'en'
      ? 'GiaTot - Smart Price Comparison'
      : language === 'id'
        ? 'GiaTot - Perbandingan harga cerdas'
        : 'GiaTot - So sánh giá thông minh';
    return () => { document.title = getApplicationTitle(language); };
  }, [language]);

  const categoryArticles = useMemo(() => selectedCategory === 'Tất cả'
    ? articles
    : articles.filter(article => article.category === selectedCategory), [articles, selectedCategory]);
  const featuredArticle = categoryArticles.find(article => article.featured) ?? categoryArticles[0];
  const latestArticles = categoryArticles.filter(article => article.slug !== featuredArticle?.slug);
  const pageCount = Math.max(1, Math.ceil(latestArticles.length / blogPageSize));
  const visibleArticles = latestArticles.slice((page - 1) * blogPageSize, page * blogPageSize);

  const selectCategory = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
  };

  return <div className="blog-list-page">
    <div className="blog-list-heading">
      <span className="eyebrow">{uiText(language, 'Kiến thức mua sắm')}</span>
      <h1>{uiText(language, 'Tin tức & kinh nghiệm')}</h1>
      <p>{uiText(language, 'Chia sẻ kinh nghiệm, đánh giá sản phẩm và mẹo mua sắm thông minh.')}</p>
    </div>

    <div className="category-pills blog-category-pills" role="group" aria-label={uiText(language, 'Lọc theo chuyên mục')}>
      {blogCategories.map(category => <button type="button" key={category} className={selectedCategory === category ? 'active' : undefined} aria-pressed={selectedCategory === category} onClick={() => selectCategory(category)}>{uiText(language, category)}</button>)}
    </div>

    {!categoryArticles.length ? <div className="empty-state blog-empty-state"><span aria-hidden="true">▤</span><h2>{uiText(language, 'Chưa có bài viết')}</h2><p>{uiText(language, 'Các bài viết mới sẽ xuất hiện tại đây.')}</p></div> : <>
      {featuredArticle && <Link className="blog-featured-card" to={`/blog/${encodeURIComponent(featuredArticle.slug)}`}>
        <BlogImage title={featuredArticle.title} className="blog-featured-image" />
        <div className="blog-featured-body">
          <span className="blog-featured-label">{uiText(language, 'Nổi bật')}</span>
          <span className="blog-category-chip">{uiText(language, featuredArticle.category)}</span>
          <h2>{featuredArticle.title}</h2>
          <p>{featuredArticle.excerpt}</p>
          <PostMeta article={featuredArticle} language={language} />
        </div>
      </Link>}

      <section className="blog-latest-section" aria-labelledby="blog-latest-title">
        <h2 className="blog-section-title" id="blog-latest-title">{uiText(language, 'Bài viết mới nhất')}</h2>
        <div className="blog-post-grid">
          {visibleArticles.map(article => <Link className="blog-post-card" to={`/blog/${encodeURIComponent(article.slug)}`} key={article.slug}>
            <BlogImage title={article.title} className="blog-post-image" />
            <div className="blog-post-body">
              <span className="blog-category-chip">{uiText(language, article.category)}</span>
              <h3>{article.title}</h3>
              <p>{article.excerpt}</p>
              <PostMeta article={article} language={language} />
            </div>
          </Link>)}
        </div>
        {pageCount > 1 && <nav className="blog-pagination" aria-label={uiText(language, 'Phân trang')}>
          <button type="button" aria-label={uiText(language, 'Trang trước')} disabled={page === 1} onClick={() => setPage(current => current - 1)}>‹</button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(pageNumber => <button type="button" key={pageNumber} className={pageNumber === page ? 'active' : undefined} aria-current={pageNumber === page ? 'page' : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}
          <button type="button" aria-label={uiText(language, 'Trang sau')} disabled={page === pageCount} onClick={() => setPage(current => current + 1)}>›</button>
        </nav>}
      </section>
    </>}
  </div>;
}
