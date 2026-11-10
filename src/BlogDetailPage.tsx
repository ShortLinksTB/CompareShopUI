import { Link, useParams } from 'react-router-dom';
import { formatBlogDate, getBlogPosts } from './blogMockData';
import { uiText } from './uiCopy';
import { useLanguage } from './i18n';

export function BlogDetailPage() {
  const { language } = useLanguage();
  const { slug = '' } = useParams();
  const article = getBlogPosts().find(post => post.slug === slug);
  if (!article) return <div className="empty-state blog-not-found-state"><h1>{uiText(language, 'Không tìm thấy bài viết')}</h1><p>{uiText(language, 'Bài viết này không tồn tại hoặc chưa được xuất bản.')}</p><Link className="button button-primary" to="/blog">Quay lại Blog</Link></div>;
  const related = getBlogPosts().filter(post => post.slug !== article.slug).slice(0, 3);
  return <>
    <div className="blog-breadcrumb"><Link to="/blog">Blog</Link><span>/</span><Link to="/blog">{article.category}</Link><span>/</span><strong>{article.title}</strong></div>
    <article className="blog-detail"><span className="blog-chip">{article.category}</span><h1>{article.title}</h1><div className="blog-byline"><span className="blog-avatar">{article.initials}</span><div><strong>{article.author}</strong><small>{formatBlogDate(article.publishedAt)} · {article.readingMinutes} phút đọc</small></div><span className="blog-byline-actions" aria-hidden="true">↗　♡</span></div>
      <div className="blog-cover" role="img" aria-label={article.title}>▧</div><div className="blog-prose">{article.content.map((block, index) => block.type === 'heading' ? <h2 key={index}>{block.text}</h2> : block.type === 'image' ? <figure key={index}><div className="blog-inline-image" role="img" aria-label={block.text}>▧</div><figcaption>{block.text}</figcaption></figure> : block.type === 'quote' ? <blockquote key={index}>{block.text}</blockquote> : <p key={index}>{block.text}</p>)}</div>
      <div className="blog-tags">{article.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>
      <section className="blog-newsletter"><div><strong>Nhận bài viết mới qua email</strong><p>Mẹo mua sắm và đánh giá sản phẩm, gửi hàng tuần.</p></div><button type="button">Đăng ký</button></section>
    </article>
    <section className="blog-related"><h2 className="blog-section-title">Bài viết liên quan</h2><div className="blog-related-grid">{related.map(post => <Link className="blog-post-card" to={`/blog/${post.slug}`} key={post.slug}><div className="blog-post-image">▧</div><div className="blog-post-copy"><h3>{post.title}</h3><div className="blog-meta"><span>{post.author}</span><span>·</span><span>{formatBlogDate(post.publishedAt)}</span></div></div></Link>)}</div></section>
  </>;
}
