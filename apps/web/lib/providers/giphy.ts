// ============================================================
// Giphy provider
// Free tier API. Needs GIPHY_API_KEY.
// This module runs server-side only; clients reach it via
// /api/gifs/search so the key never ships to the browser.
// ============================================================

import { getJson } from './http';
import { cached } from './cache';

export interface GiphyGif {
  id: string;
  title: string;
  /** Canonical web page URL (giphy.com/gifs/...). */
  url: string;
  /** Direct GIF URL usable in an <img> tag. */
  mediaUrl: string;
  /** Preview thumbnail URL (smaller). */
  previewUrl: string;
  width: number;
  height: number;
}

interface GiphyImage {
  url?: string;
  width?: string;
  height?: string;
}

interface GiphySearchResponse {
  data?: Array<{
    id?: string;
    title?: string;
    url?: string;
    images?: {
      original?: GiphyImage;
      fixed_height?: GiphyImage;
      fixed_height_small?: GiphyImage;
    };
  }>;
}

export async function searchGifs(query: string, limit = 12): Promise<GiphyGif[]> {
  const key = process.env.GIPHY_API_KEY;
  if (!key || !query.trim()) return [];

  const qs = new URLSearchParams({
    api_key: key,
    q: query.trim(),
    limit: String(limit),
    rating: 'pg-13',
    lang: 'en',
  });

  const cacheKey = `giphy:${query.trim().toLowerCase()}:${limit}`;
  const data = await cached(cacheKey, 10 * 60_000, () =>
    getJson<GiphySearchResponse>(`https://api.giphy.com/v1/gifs/search?${qs.toString()}`, {
      timeoutMs: 5000,
    }),
  );

  return (data?.data ?? [])
    .filter((g) => g.id && g.images?.fixed_height?.url)
    .map((g) => {
      const img = g.images!.fixed_height!;
      const preview = g.images?.fixed_height_small ?? img;
      return {
        id: g.id!,
        title: g.title ?? '',
        url: g.url ?? `https://giphy.com/gifs/${g.id}`,
        mediaUrl: img.url ?? '',
        previewUrl: preview.url ?? img.url ?? '',
        width: parseInt(img.width ?? '0', 10),
        height: parseInt(img.height ?? '0', 10),
      };
    });
}
