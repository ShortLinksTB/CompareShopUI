import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getArticle, type PublicArticle } from './blogApi';
import { SafeImage } from './components/SafeImage';

const formatPublishedDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
};

function getContentBlocks(content: string) {
  return content.split(/\n\s*\n/).map((text, index) => {
    const heading = text.trim().match(/^(#{1,3})\s+(.+)$/);
    return heading
      ? { id: `article-section-${index}`, heading: heading[2], level: heading[1].length as 1 | 2 | 3 }
      : { text: text.trim() };
  }).filter(block => ('heading' in block ? block.heading : block.text));
}

export function BlogDetailPage() {
  const { id: slug = '' } = useParams();
  const [article, setArticle] = useState<PublicArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadedSlug, setLoadedSlug] = useState('');
  const contentBlocks = useMemo(() => article ? getContentBlocks(article.content) : [], [article]);
  const headings = contentBlocks.filter((block): block is { id: string; heading: string; level: 1 | 2 | 3 } => 'heading' in block);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setArticle(null);
    setLoadedSlug('');
    getArticle(slug)
      .then(result => { if (active) setArticle(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) { setLoading(false); setLoadedSlug(slug); } });
    return () => { active = false; };
  }, [slug, attempt]);

  if (loading || loadedSlug !== slug) return <p className="detail-state" role="status">Đang tải bài viết...</p>;
  if (error) return <div className="empty-state" role="alert"><h1>Không thể tải bài viết</h1><p>Vui lòng thử lại sau.</p><button className="button button-primary" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div>;
  if (!article) return <div className="empty-state" role="status"><h1>Không tìm thấy bài viết</h1><p>Bài viết này không tồn tại hoặc chưa được xuất bản.</p><Link className="button button-primary" to="/blog">Quay lại Blog</Link></div>;

  const publishedDate = formatPublishedDate(article.publishedAtUtc);
  const hasRelatedProducts = Array.isArray(article.relatedProductIds) && article.relatedProductIds.length > 0;
  return <article className="article-page">
    <div className="article-main">
      <div className="breadcrumbs"><Link to="/">Trang chủ</Link><span>/</span><Link to="/blog">Blog</Link><span>/</span><strong>{article.title}</strong></div>
      <span className="article-category">Bài viết</span>
      <h1>{article.title}</h1>
      {article.excerpt && <p className="article-lead">{article.excerpt}</p>}
      <div className="author-row">
        {article.authorAvatarUrl ? <SafeImage className="author-avatar-image" src={article.authorAvatarUrl} alt={article.authorName || 'Tác giả'} fallbackLabel="" /> : <span className="author-avatar" aria-hidden="true">{(article.authorName || '').trim().charAt(0).toLocaleUpperCase() || '•'}</span>}
        <span><strong>{article.authorName || 'Tác giả chưa cập nhật'}</strong><small>{[publishedDate, Number.isFinite(article.readingMinutes) && article.readingMinutes > 0 ? `${article.readingMinutes} phút đọc` : 'Thời gian đọc chưa có dữ liệu'].filter(Boolean).join(' · ')}</small></span>
      </div>
      {article.coverImageUrl ? <SafeImage className="article-cover" src={article.coverImageUrl} alt={article.title} fallbackLabel="Chưa có hình ảnh" /> : <div className="article-cover safe-image-fallback" role="img" aria-label="Chưa có hình ảnh"><span>Chưa có hình ảnh</span></div>}
      <div className="article-content">
        {contentBlocks.length ? contentBlocks.map((block, index) => 'heading' in block
          ? block.level === 1 ? <h2 id={block.id} key={block.id}>{block.heading}</h2> : <h3 id={block.id} key={block.id}>{block.heading}</h3>
          : <p key={index}>{block.text}</p>)
          : <p>Nội dung bài viết chưa có sẵn.</p>}
      </div>
    </div>
    <aside className="article-sidebar">
      {headings.length > 0 && <div className="info-card"><strong>Mục lục bài viết</strong><ol>{headings.map(heading => <li key={heading.id}><a href={`#${heading.id}`}>{heading.heading}</a></li>)}</ol></div>}
      {hasRelatedProducts && <div className="info-card"><strong>Sản phẩm được nhắc đến</strong><p>{article.relatedProductIds.length} sản phẩm liên quan</p></div>}
    </aside>
  </article>;
}
