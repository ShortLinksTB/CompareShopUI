const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';

export interface PublicArticleSummary {
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  authorName: string;
  readingMinutes: number;
  publishedAtUtc: string;
}

export interface PublicArticle extends PublicArticleSummary {
  authorAvatarUrl: string | null;
  content: string;
  seo: { title: string | null; description: string | null; canonicalUrl: string | null; ogImage: string | null; index: boolean };
  updatedAtUtc: string;
  relatedProductIds: number[];
}

interface ArticlePage {
  items: PublicArticleSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export async function getArticles(page = 1, pageSize = 10): Promise<PublicArticleSummary[]> {
  const response = await fetch(`${API_BASE_URL}/articles?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) throw new Error(`Articles request failed (${response.status})`);

  const result = await response.json() as ArticlePage;
  if (!result || !Array.isArray(result.items)) throw new Error('Invalid articles response');
  return result.items;
}

export async function getArticle(slug: string): Promise<PublicArticle | null> {
  const response = await fetch(`${API_BASE_URL}/articles/${encodeURIComponent(slug)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Article request failed (${response.status})`);

  const article = await response.json() as PublicArticle;
  if (!article || typeof article.slug !== 'string' || typeof article.title !== 'string' || typeof article.content !== 'string') {
    throw new Error('Invalid article response');
  }
  return article;
}
