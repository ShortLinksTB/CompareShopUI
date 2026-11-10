import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage, type Language } from './i18n';
import { uiText } from './uiCopy';
import { getArticles, type ArticlePage, type PublicArticleSummary } from './blogApi';
import { formatBlogDate } from './blogFormatting';
import { BlogImage } from './components/BlogImage';
import { getApplicationTitle } from './pageMetadata';

export const blogPageSize = 12;

const initialsOf = (name: string) => name.trim().split(/\s+/).slice(-2).map(part => part[0]?.toUpperCase() ?? '').join('');

function PostMeta({ article, language, showReading }: { article: PublicArticleSummary; language: Language; showReading?: boolean }) {
  return <div className="blog-post-meta"><span className="blog-avatar" aria-hidden="true">{initialsOf(article.authorName)}</span><span>{article.authorName}</span><span aria-hidden="true">·</span><time dateTime={article.publishedAtUtc}>{formatBlogDate(article.publishedAtUtc, language)}</time>{showReading && <><span aria-hidden="true">·</span><span>{article.readingMinutes} {uiText(language, 'phút đọc')}</span></>}</div>;
}

export function BlogPage() {
  const { language } = useLanguage();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ArticlePage | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    document.title = language === 'en'
      ? 'GiaTot - Smart Price Comparison'
      : language === 'id'
        ? 'GiaTot - Perbandingan harga cerdas'
        : 'GiaTot - So sánh giá thông minh';
    return () => { document.title = getApplicationTitle(language); };
  }, [language]);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setFailed(false);
    getArticles(page, blogPageSize, controller.signal)
      .then(setResult)
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [page, attempt]);

  const featuredArticle = page === 1 ? result?.items[0] : undefined;
  const gridArticles = result ? (featuredArticle ? result.items.slice(1) : result.items) : [];
  const pageCount = result ? Math.max(1, result.totalPages) : 1;

  return <div className="blog-list-page">
    <div className="blog-list-heading">
      <span className="eyebrow">{uiText(language, 'Kiến thức mua sắm')}</span>
      <h1>{uiText(language, 'Tin tức & kinh nghiệm')}</h1>
      <p>{uiText(language, 'Chia sẻ kinh nghiệm, đánh giá sản phẩm và mẹo mua sắm thông minh.')}</p>
    </div>

    {failed ? <div className="empty-state blog-empty-state" role="alert"><span aria-hidden="true">!</span><h2>{uiText(language, 'Không thể tải bài viết')}</h2><p>{uiText(language, 'Vui lòng thử lại sau.')}</p><button type="button" className="button button-primary" onClick={() => setAttempt(current => current + 1)}>{uiText(language, 'Thử lại')}</button></div>
      : !result ? <div className="empty-state blog-empty-state" role="status" aria-live="polite"><p>{uiText(language, 'Đang tải bài viết...')}</p></div>
      : !result.items.length && page === 1 ? <div className="empty-state blog-empty-state"><span aria-hidden="true">▤</span><h2>{uiText(language, 'Chưa có bài viết')}</h2><p>{uiText(language, 'Các bài viết mới sẽ xuất hiện tại đây.')}</p></div> : <>
      {featuredArticle && <Link className="blog-featured-card" to={`/blog/${encodeURIComponent(featuredArticle.slug)}`}>
        <BlogImage title={featuredArticle.title} src={featuredArticle.coverImageUrl} className="blog-featured-image" />
        <div className="blog-featured-body">
          <span className="blog-featured-label">{uiText(language, 'Nổi bật')}</span>
          <h2>{featuredArticle.title}</h2>
          <p>{featuredArticle.excerpt}</p>
          <PostMeta article={featuredArticle} language={language} showReading />
        </div>
      </Link>}

      <section className="blog-latest-section" aria-labelledby="blog-latest-title">
        <h2 className="blog-section-title" id="blog-latest-title">{uiText(language, 'Bài viết mới nhất')}</h2>
        <div className="blog-post-grid">
          {gridArticles.map(article => <Link className="blog-post-card" to={`/blog/${encodeURIComponent(article.slug)}`} key={article.slug}>
            <BlogImage title={article.title} src={article.coverImageUrl} className="blog-post-image" />
            <div className="blog-post-body">
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
