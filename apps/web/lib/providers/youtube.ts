// ============================================================
// YouTube Data v3 provider
// Free tier: 10,000 units/day. search.list costs 100 units →
// 100 unique searches/day. We cache each team's highlights 2 hours.
// Needs YOUTUBE_API_KEY.
// ============================================================

import { getJson } from './http';
import { cached } from './cache';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
  url: string;
}

interface SearchResponse {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
    };
  }>;
}

/**
 * Search YouTube for team highlights. Returns [] when key is missing.
 */
export async function searchHighlights(
  teamName: string,
  maxResults = 5,
): Promise<YouTubeVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  const q = `${teamName} football highlights`;
  const cacheKey = `youtube:highlights:${teamName.toLowerCase()}:${maxResults}`;

  const data = await cached(cacheKey, 2 * 60 * 60_000, () =>
    getJson<SearchResponse>(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&order=date&maxResults=${maxResults}&key=${key}`,
      { timeoutMs: 8000 },
    ),
  );

  return (data?.items ?? [])
    .filter((i) => i.id?.videoId && i.snippet?.title)
    .map((i) => ({
      videoId: i.id!.videoId!,
      title: i.snippet!.title!,
      channelTitle: i.snippet?.channelTitle ?? '',
      thumbnail: i.snippet?.thumbnails?.high?.url ?? i.snippet?.thumbnails?.medium?.url ?? '',
      publishedAt: i.snippet?.publishedAt ?? '',
      url: `https://www.youtube.com/watch?v=${i.id!.videoId}`,
    }));
}
