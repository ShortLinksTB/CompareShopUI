import { Link, useParams } from 'react-router-dom';
import { blogArticles } from './blogMockData';
import { formatBlogDate } from './blogFormatting';
import { useLanguage } from './i18n';
import { uiText } from './uiCopy';
import { BlogImage } from './components/BlogImage';

export function BlogDetailPage() {
  const { slug = '' } = useParams();
  const { language } = useLanguage();
  const article = blogArticles.find(item => item.slug === slug);

  if (!article) return <div className="empty-state blog-not-found-state" role="status">
    <h1>{uiText(language, 'Không tìm thấy bài viết')}</h1>
    <p>{uiText(language, 'Bài viết này không tồn tại hoặc chưa được xuất bản.')}</p>
    <Link className="button button-primary" to="/blog">{uiText(language, 'Quay lại Blog')}</Link>
  </div>;

  const related = blogArticles.filter(item => item.slug !== article.slug && item.category === article.category).slice(0, 3);
  const fallbackRelated = blogArticles.filter(item => item.slug !== article.slug && !related.some(post => post.slug === item.slug));
  const relatedPosts = [...related, ...fallbackRelated].slice(0, 3);

  return <>
    <nav className="blog-detail-breadcrumb" aria-label={uiText(language, 'Điều hướng') }>
      <Link to="/blog">{uiText(language, 'Blog')}</Link><span aria-hidden="true">/</span>
      <Link to={`/blog?category=${encodeURIComponent(article.category)}`}>{uiText(language, article.category)}</Link><span aria-hidden="true">/</span>
      <span aria-current="page">{article.title}</span>
    </nav>
    <article className="blog-detail-article">
      <span className="blog-category-chip">{uiText(language, article.category)}</span>
      <h1>{article.title}</h1>
      <p className="blog-detail-lead">{article.excerpt}</p>
      <div className="blog-detail-byline">
        <span className="blog-avatar" aria-hidden="true">{article.initials}</span>
        <div><strong>{article.author}</strong><small><time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt, language)}</time> · {article.readingMinutes} {uiText(language, 'phút đọc')}</small></div>
      </div>
      <BlogImage title={article.title} className="blog-detail-cover" />
      <div className="blog-detail-prose">
        {article.content?.map((block, index) => {
          if (block.type === 'heading') return <h2 key={index}>{block.text}</h2>;
          if (block.type === 'image') return <figure key={index}><BlogImage title={block.caption} className="blog-detail-inline-image" /><figcaption>{block.caption}</figcaption></figure>;
          if (block.type === 'quote') return <blockquote key={index}>{block.text}</blockquote>;
          return <p key={index}>{block.text}</p>;
        })}
      </div>
      {!!article.tags?.length && <div className="blog-detail-tags" aria-label={uiText(language, 'Thẻ bài viết')}>
        {article.tags.map(tag => <span key={tag}>#{tag}</span>)}
      </div>}
      <section className="blog-detail-subscribe" aria-labelledby="blog-subscribe-title">
        <div><h2 id="blog-subscribe-title">{uiText(language, 'Nhận bài viết mới qua email')}</h2><p>{uiText(language, 'Mẹo mua sắm và đánh giá sản phẩm, gửi hàng tuần.')}</p></div>
        <button type="button" className="button button-primary">{uiText(language, 'Đăng ký')}</button>
      </section>
    </article>
    <section className="blog-detail-related" aria-labelledby="blog-related-title">
      <h2 id="blog-related-title">{uiText(language, 'Bài viết liên quan')}</h2>
      <div className="blog-detail-related-grid">{relatedPosts.map(post => <Link className="blog-post-card" to={`/blog/${encodeURIComponent(post.slug)}`} key={post.slug}>
        <BlogImage title={post.title} className="blog-detail-related-image" />
        <div className="blog-post-body"><span className="blog-category-chip">{uiText(language, post.category)}</span><h3>{post.title}</h3><div className="blog-post-meta"><span className="blog-avatar" aria-hidden="true">{post.initials}</span><span>{post.author}</span><span aria-hidden="true">·</span><time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt, language)}</time></div></div>
      </Link>)}</div>
    </section>
  </>;
}
