import { useEffect, useState } from 'react';
import { useLanguage } from './i18n';
import { uiText } from './uiCopy';
import { Link } from 'react-router-dom';
import { getArticles, type PublicArticleSummary } from './blogApi';
import { SafeImage } from './components/SafeImage';

const formatPublishedDate = (value: string, language: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-US' : language === 'id' ? 'id-ID' : 'vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date(value));

const categories = ['Tất cả', 'Kinh nghiệm mua sắm', 'Đánh giá sản phẩm', 'Xu hướng thị trường'];

export function BlogPage() {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [articles, setArticles] = useState<PublicArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    document.title = language === 'en'
      ? 'GiaTot - Smart price comparison'
      : language === 'id'
        ? 'GiaTot - Perbandingan harga cerdas'
        : 'GiaTot - So sánh giá thông minh';

    return () => { document.title = 'GiaTot - So sánh giá thông minh'; };
  }, [language]);

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
    <div className="page-title"><div><span className="eyebrow">{uiText(language, 'Kiến thức mua sắm')}</span><h1>{uiText(language, 'Tin tức & kinh nghiệm')}</h1><p className="muted">{uiText(language, 'Chia sẻ kinh nghiệm, đánh giá sản phẩm và mẹo mua sắm thông minh.')}</p></div></div>
    <div className="category-pills">{categories.map(category => {
      const selectCategory = () => setSelectedCategory(category);
      return <button type="button" key={category} className={selectedCategory === category ? 'active' : undefined} aria-pressed={selectedCategory === category} onPointerDownCapture={selectCategory} onClick={selectCategory}>{uiText(language, category)}</button>;
    })}</div>
    {loading ? <p className="blog-loading" role="status">{uiText(language, 'Đang tải bài viết...')}</p> : error ? <div className="empty-state" role="alert"><h3>{uiText(language, 'Không thể tải bài viết')}</h3><p>{uiText(language, 'Vui lòng thử lại sau.')}</p><button className="button button-primary" onClick={() => setAttempt(value => value + 1)}>{uiText(language, 'Thử lại')}</button></div> : articles.length ? <div className="blog-grid">{articles.map(article => <Link className="article-card" to={`/blog/${encodeURIComponent(article.slug)}`} key={article.slug}>{article.coverImageUrl ? <SafeImage className="article-image" src={article.coverImageUrl} alt={article.title} fallbackLabel={uiText(language, 'Chưa có hình ảnh')} /> : <div className="article-image safe-image-fallback" role="img" aria-label={article.title}><span>{uiText(language, 'Chưa có hình ảnh')}</span></div>}<div><span className="article-category">{uiText(language, 'Bài viết')}</span><h3>{article.title}</h3><p>{article.excerpt}</p><small>{formatPublishedDate(article.publishedAtUtc, language)} · {article.readingMinutes} {uiText(language, 'phút đọc')}</small></div></Link>)}</div> : <div className="empty-state"><span>▤</span><h3>{uiText(language, 'Chưa có bài viết')}</h3><p>{uiText(language, 'Các bài viết mới sẽ xuất hiện tại đây.')}</p></div>}
  </>;
}
