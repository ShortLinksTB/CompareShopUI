const API_BASE_URL = 'https://api-compareshop-dev.giamha.online/api/v1';

export interface PublicArticle {
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  authorName: string;
  readingMinutes: number;
  publishedAtUtc: string;
}

interface ArticlePage {
  items: PublicArticle[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export async function getArticles(page = 1, pageSize = 10): Promise<PublicArticle[]> {
  const response = await fetch(`${API_BASE_URL}/articles?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) throw new Error(`Articles request failed (${response.status})`);

  const result = await response.json() as ArticlePage;
  if (!result || !Array.isArray(result.items)) throw new Error('Invalid articles response');
  return result.items;
}
