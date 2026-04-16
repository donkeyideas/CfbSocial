// ============================================================
// Reddit provider
// OAuth client-credentials flow (no user auth required).
// Create a "script" app at https://www.reddit.com/prefs/apps
// Needs REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT.
// Returns [] when credentials are missing.
// ============================================================

import { getJson } from './http';
import { cached } from './cache';

interface RedditPost {
  title: string;
  selftext?: string;
  url: string;
  permalink: string;
  score: number;
  num_comments: number;
  subreddit: string;
  created_utc: number;
}

interface RedditListing {
  data?: {
    children?: Array<{ data: RedditPost }>;
  };
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const ua = process.env.REDDIT_USER_AGENT;
  if (!clientId || !clientSecret || !ua) return null;

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.token;

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': ua,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    tokenCache = {
      token: json.access_token,
      expiresAt: now + (json.expires_in ?? 3600) * 1000,
    };
    return json.access_token;
  } catch {
    return null;
  }
}

export interface RedditSubredditPost {
  title: string;
  url: string;
  permalink: string;
  score: number;
  numComments: number;
  subreddit: string;
}

async function fetchListing(subreddit: string, sort: 'hot' | 'rising', limit: number): Promise<RedditSubredditPost[]> {
  const token = await getAccessToken();
  if (!token) return [];
  const ua = process.env.REDDIT_USER_AGENT!;

  const data = await cached(`reddit:${subreddit}:${sort}:${limit}`, 5 * 60_000, () =>
    getJson<RedditListing>(`https://oauth.reddit.com/r/${subreddit}/${sort}?limit=${limit}`, {
      timeoutMs: 5000,
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': ua,
      },
    }),
  );

  const children = data?.data?.children ?? [];
  return children
    .filter((c) => c.data.title && !c.data.title.toLowerCase().includes('[meta]'))
    .map((c) => ({
      title: c.data.title,
      url: c.data.url,
      permalink: `https://www.reddit.com${c.data.permalink}`,
      score: c.data.score,
      numComments: c.data.num_comments,
      subreddit: c.data.subreddit,
    }));
}

export function getSubredditHot(subreddit = 'CFB', limit = 10): Promise<RedditSubredditPost[]> {
  return fetchListing(subreddit, 'hot', limit);
}

export function getSubredditRising(subreddit = 'CFB', limit = 10): Promise<RedditSubredditPost[]> {
  return fetchListing(subreddit, 'rising', limit);
}
