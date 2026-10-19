import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getArticles, type PublicArticle } from './blogApi';
import { SafeImage } from './components/SafeImage';

const formatPublishedDate = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date(value));

export function BlogPage() {
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    getArticles().then(items => {
      if (active) setArticles(items);
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [attempt]);

  return <>
    <div className="page-title"><div><span className="eyebrow">Kiến thức mua sắm</span><h1>Tin tức &amp; kinh nghiệm</h1><p className="muted">Chia sẻ kinh nghiệm, đánh giá sản phẩm và mẹo mua sắm thông minh.</p></div></div>
    <div className="category-pills"><button className="active">Tất cả</button><button>Kinh nghiệm mua sắm</button><button>Đánh giá sản phẩm</button><button>Xu hướng thị trường</button></div>
    {loading ? <p className="blog-loading" role="status">Đang tải bài viết...</p> : error ? <div className="empty-state" role="alert"><h3>Không thể tải bài viết</h3><p>Vui lòng thử lại sau.</p><button className="button button-primary" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div> : articles.length ? <div className="blog-grid">{articles.map(article => <Link className="article-card" to={`/blog/${article.slug}`} key={article.slug}>{article.coverImageUrl ? <SafeImage className="article-image" src={article.coverImageUrl} alt={article.title} fallbackLabel="Chưa có hình ảnh" /> : <div className="article-image safe-image-fallback" role="img" aria-label={article.title}><span>Chưa có hình ảnh</span></div>}<div><span className="article-category">Bài viết</span><h3>{article.title}</h3><p>{article.excerpt}</p><small>{formatPublishedDate(article.publishedAtUtc)} · {article.readingMinutes} phút đọc</small></div></Link>)}</div> : <div className="empty-state"><span>▤</span><h3>Chưa có bài viết</h3><p>Các bài viết mới sẽ xuất hiện tại đây.</p></div>}
  </>;
}
