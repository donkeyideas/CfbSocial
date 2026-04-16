// ============================================================
// NewsAPI.org provider
// Free tier: 100 req/day. We cache for 1 hour → 24 calls/day max.
// Needs NEWSAPI_KEY. Returns [] when key is missing.
// Docs: https://newsapi.org/docs/endpoints/everything
// ============================================================

import { getJson } from './http';
import { cached } from './cache';

export interface NewsApiArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
}

interface NewsApiResponse {
  articles?: Array<{
    title?: string;
    description?: string | null;
    url?: string;
    publishedAt?: string;
    source?: { name?: string };
  }>;
}

/**
 * Fetch CFB news. Cached 1 hour per query.
 */
export async function getCollegeFootballNews(
  query = 'college football',
  pageSize = 10,
): Promise<NewsApiArticle[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];

  const qs = new URLSearchParams({
    q: query,
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: String(pageSize),
    apiKey: key,
  });

  const cacheKey = `newsapi:${query}:${pageSize}`;
  const data = await cached(cacheKey, 60 * 60_000, () =>
    getJson<NewsApiResponse>(`https://newsapi.org/v2/everything?${qs.toString()}`, {
      timeoutMs: 6000,
    }),
  );

  return (data?.articles ?? [])
    .filter((a) => a.title && a.url)
    .map((a) => ({
      title: a.title!,
      description: (a.description ?? '').substring(0, 240),
      url: a.url!,
      publishedAt: a.publishedAt ?? '',
      source: a.source?.name ?? 'NewsAPI',
    }));
}
