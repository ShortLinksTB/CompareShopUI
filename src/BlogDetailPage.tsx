import { Link, useParams } from 'react-router-dom';
import { useLanguage } from './i18n';
import { uiText } from './uiCopy';
import { blogArticles, type BlogArticle } from './blogMockData';
import { formatBlogDate } from './blogFormatting';
import { BlogImage } from './components/BlogImage';

export function BlogDetailPage({ articles = blogArticles }: { articles?: BlogArticle[] }) {
  const { language } = useLanguage();
  const { slug = '' } = useParams();
  const article = articles.find(item => item.slug === slug);

  if (!article) return <div className="empty-state blog-not-found-state" role="status">
    <h1>{uiText(language, 'Không tìm thấy bài viết')}</h1>
    <p>{uiText(language, 'Bài viết này không tồn tại hoặc chưa được xuất bản.')}</p>
    <Link className="button button-primary" to="/blog">{uiText(language, 'Quay lại Blog')}</Link>
  </div>;

  const relatedArticles = articles.filter(item => item.slug !== article.slug).slice(0, 3);
  return <>
    <div className="blog-breadcrumbs"><Link to="/">{uiText(language, 'Trang chủ')}</Link><span>/</span><Link to="/blog">Blog</Link><span>/</span><Link to="/blog" className="blog-breadcrumb-category">{uiText(language, article.category)}</Link><span>/</span><strong>{article.title}</strong></div>
    <article className="blog-article">
      <span className="blog-category-chip">{uiText(language, article.category)}</span>
      <h1>{article.title}</h1>
      <div className="blog-byline">
        <span className="blog-avatar blog-byline-avatar" aria-hidden="true">{article.initials}</span>
        <div><strong>{article.author}</strong><small><time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt, language)}</time><span aria-hidden="true"> · </span>{article.readingMinutes} {uiText(language, 'phút đọc')}</small></div>
      </div>
      <BlogImage title={article.title} className="blog-cover-image" />
      <div className="blog-article-content">
        {article.content.map((block, index) => {
          if (block.type === 'heading') return <h2 key={`${block.type}-${index}`}>{block.text}</h2>;
          if (block.type === 'image') return <figure key={`${block.type}-${index}`}><BlogImage title={block.caption} className="blog-inline-image" /><figcaption>{block.caption}</figcaption></figure>;
          if (block.type === 'quote') return <blockquote key={`${block.type}-${index}`}>{block.text}</blockquote>;
          return <p key={`${block.type}-${index}`}>{block.text}</p>;
        })}
      </div>
      <div className="blog-tag-row" aria-label={uiText(language, 'Thẻ bài viết')}>
        {article.tags.map(tag => <span className="blog-tag" key={tag}>#{tag}</span>)}
      </div>
      <section className="blog-newsletter" aria-labelledby="blog-newsletter-title">
        <div><h2 id="blog-newsletter-title">{uiText(language, 'Nhận bài viết mới qua email')}</h2><p>{uiText(language, 'Mẹo mua sắm và đánh giá sản phẩm, gửi hàng tuần.')}</p></div>
        <button className="button button-primary" type="button">{uiText(language, 'Đăng ký')}</button>
      </section>
    </article>

    <section className="blog-related" aria-labelledby="blog-related-title">
      <h2 className="blog-section-title" id="blog-related-title">{uiText(language, 'Bài viết liên quan')}</h2>
      <div className="blog-related-grid">
        {relatedArticles.map(related => <Link className="blog-post-card" to={`/blog/${encodeURIComponent(related.slug)}`} key={related.slug}>
          <BlogImage title={related.title} className="blog-related-image" />
          <div className="blog-post-body"><span className="blog-category-chip">{uiText(language, related.category)}</span><h3>{related.title}</h3><div className="blog-post-meta"><span>{related.author}</span><span aria-hidden="true">·</span><time dateTime={related.publishedAt}>{formatBlogDate(related.publishedAt, language)}</time></div></div>
        </Link>)}
      </div>
    </section>
  </>;
}
