import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { articleCoverUrl, getArticle, getArticles, recordArticleView, type ArticleCategory, type PublicArticle, type PublicArticleSummary } from './blogApi';
import { formatBlogDate } from './blogFormatting';
import { useLanguage, type Language } from './i18n';
import { uiText } from './uiCopy';
import { BlogImage } from './components/BlogImage';
import { SafeMarkdown } from './SafeMarkdown';

const categories: Record<ArticleCategory, string> = {
  'shopping-tips': 'Kinh nghiệm mua sắm',
  'product-reviews': 'Đánh giá sản phẩm',
  'market-trends': 'Xu hướng thị trường',
};

const initialsOf = (name: string) => name.trim().split(/\s+/).slice(-2).map(part => part[0]?.toUpperCase() ?? '').join('');
const readingMinutes = (markdown: string) => Math.max(1, Math.ceil(markdown.trim().split(/\s+/).filter(Boolean).length / 200));
const knownBot = () => /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|facebot|twitterbot|linkedinbot|embedly|quora link preview|pinterest|whatsapp/i.test(navigator.userAgent);

function markViewOnce(slug: string) {
  if (knownBot()) return false;
  const day = new Date().toISOString().slice(0, 10);
  const key = `compareshop:article-view:${slug}:${day}`;
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // If session storage is unavailable, avoid a potentially duplicate analytics request.
    return false;
  }
  return true;
}

function RelatedPosts({ posts, language }: { posts: PublicArticleSummary[]; language: Language }) {
  if (!posts.length) return null;
  return <section className="blog-detail-related" aria-labelledby="blog-related-title">
    <h2 id="blog-related-title">{uiText(language, 'Bài viết liên quan')}</h2>
    <div className="blog-detail-related-grid">{posts.map(post => <Link className="blog-post-card" to={`/blog/${encodeURIComponent(post.slug)}`} key={post.slug}>
      <BlogImage title={post.title} src={articleCoverUrl(post.coverFileId)} className="blog-detail-related-image" />
      <div className="blog-post-body"><span className="blog-category-chip">{uiText(language, categories[post.category])}</span><h3>{post.title}</h3><div className="blog-post-meta"><span className="blog-avatar" aria-hidden="true">{initialsOf(post.authorName)}</span><span>{post.authorName}</span><span aria-hidden="true">·</span><time dateTime={post.publishedAtUtc}>{formatBlogDate(post.publishedAtUtc, language)}</time></div></div>
    </Link>)}</div>
  </section>;
}

export function BlogDetailPage() {
  const { slug = '' } = useParams();
  const { language } = useLanguage();
  const [article, setArticle] = useState<PublicArticle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [relatedPosts, setRelatedPosts] = useState<PublicArticleSummary[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setArticle(null);
    setNotFound(false);
    setFailed(false);
    setRelatedPosts([]);
    getArticle(slug, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        if (!result) { setNotFound(true); return; }
        setArticle(result);
        if (markViewOnce(result.slug)) void recordArticleView(result.slug).catch(() => undefined);
        return getArticles(1, 12, result.category, controller.signal)
          .then(page => {
            if (!controller.signal.aborted) setRelatedPosts(page.items.filter(post => post.slug !== result.slug).slice(0, 3));
          })
          .catch(() => undefined);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [slug, attempt]);

  if (failed) return <div className="empty-state blog-not-found-state" role="alert">
    <h1>{uiText(language, 'Không thể tải bài viết')}</h1>
    <p>{uiText(language, 'Vui lòng thử lại sau.')}</p>
    <button className="button button-primary" type="button" onClick={() => setAttempt(value => value + 1)}>{uiText(language, 'Thử lại')}</button>
  </div>;
  if (!article && !notFound) return <div className="empty-state blog-not-found-state" role="status" aria-live="polite"><p>{uiText(language, 'Đang tải bài viết...')}</p></div>;
  if (notFound) return <div className="empty-state blog-not-found-state" role="status">
    <h1>{uiText(language, 'Không tìm thấy bài viết')}</h1>
    <p>{uiText(language, 'Bài viết này không tồn tại hoặc chưa được xuất bản.')}</p>
    <Link className="button button-primary" to="/blog">{uiText(language, 'Quay lại Blog')}</Link>
  </div>;
  if (!article) return null;

  const category = categories[article.category];
  return <>
    <nav className="blog-detail-breadcrumb" aria-label={uiText(language, 'Điều hướng')}>
      <Link to="/blog">{uiText(language, 'Blog')}</Link><span aria-hidden="true">/</span>
      <Link to={`/blog?category=${encodeURIComponent(article.category)}`}>{uiText(language, category)}</Link><span aria-hidden="true">/</span>
      <span aria-current="page">{article.title}</span>
    </nav>
    <article className="blog-detail-article">
      <span className="blog-category-chip">{uiText(language, category)}</span>
      <h1>{article.title}</h1>
      <p className="blog-detail-lead">{article.excerptText}</p>
      <div className="blog-detail-byline">
        <span className="blog-avatar" aria-hidden="true">{initialsOf(article.authorName)}</span>
        <div><strong>{article.authorName}</strong><small><time dateTime={article.publishedAtUtc}>{formatBlogDate(article.publishedAtUtc, language)}</time> · {readingMinutes(article.contentMarkdown)} {uiText(language, 'phút đọc')}</small></div>
      </div>
      <BlogImage title={article.title} src={articleCoverUrl(article.coverFileId)} className="blog-detail-cover" />
      <div className="blog-detail-prose"><SafeMarkdown content={article.contentMarkdown} /></div>
      {!!article.tags?.length && <div className="blog-detail-tags" aria-label={uiText(language, 'Thẻ bài viết')}>
        {article.tags.map(tag => <span key={tag}>#{tag}</span>)}
      </div>}
      <section className="blog-detail-subscribe" aria-labelledby="blog-subscribe-title">
        <div><h2 id="blog-subscribe-title">{uiText(language, 'Nhận bài viết mới qua email')}</h2><p>{uiText(language, 'Mẹo mua sắm và đánh giá sản phẩm, gửi hàng tuần.')}</p></div>
        <button type="button" className="button button-primary">{uiText(language, 'Đăng ký')}</button>
      </section>
    </article>
    <RelatedPosts posts={relatedPosts} language={language} />
  </>;
}
