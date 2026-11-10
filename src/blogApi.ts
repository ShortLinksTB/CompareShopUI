const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';

export type ArticleCategory = 'shopping-tips' | 'product-reviews' | 'market-trends';

export interface PublicArticleSummary {
  slug: string;
  title: string;
  category: ArticleCategory;
  excerptText: string;
  coverFileId: string | null;
  tags: string[];
  authorName: string;
  publishedAtUtc: string;
  totalViews: number;
}

export interface PublicArticle extends PublicArticleSummary {
  contentMarkdown: string;
  updatedAtUtc: string;
}

export const articleCoverUrl = (fileId: string | null) => fileId ? `${API_BASE_URL}/files/${encodeURIComponent(fileId)}` : null;

export interface ArticlePage {
  items: PublicArticleSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export async function getArticles(page = 1, pageSize = 12, category?: ArticleCategory, signal?: AbortSignal): Promise<ArticlePage> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (category) query.set('category', category);
  const response = await fetch(`${API_BASE_URL}/articles?${query}`, { signal });
  if (!response.ok) throw new Error(`Articles request failed (${response.status})`);

  const result = await response.json() as ArticlePage;
  if (!result || !Array.isArray(result.items) || typeof result.totalPages !== 'number') throw new Error('Invalid articles response');
  return result;
}

export async function getArticle(slug: string, signal?: AbortSignal): Promise<PublicArticle | null> {
  const response = await fetch(`${API_BASE_URL}/articles/${encodeURIComponent(slug)}`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Article request failed (${response.status})`);

  const article = await response.json() as PublicArticle;
  if (!article || typeof article.slug !== 'string' || typeof article.title !== 'string' || typeof article.contentMarkdown !== 'string') {
    throw new Error('Invalid article response');
  }
  return article;
}

export async function recordArticleView(slug: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/articles/${encodeURIComponent(slug)}/view`, { method: 'POST' });
  if (!response.ok) throw new Error(`Article view request failed (${response.status})`);
}
