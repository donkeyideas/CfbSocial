// ============================================================
// ESPN provider (consolidated)
// Wraps all unofficial ESPN endpoints in one place so caching,
// timeouts, and retries stay consistent across callers.
// No API key required.
// ============================================================

import { getJson } from './http';
import { cached } from './cache';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football';

// ============================================================
// Types
// ============================================================

export interface ESPNCompetitor {
  team: {
    id?: string;
    abbreviation: string;
    displayName: string;
    location?: string;
    logo?: string;
  };
  score: string;
  homeAway: 'home' | 'away';
}

export interface ESPNCompetition {
  competitors: ESPNCompetitor[];
  status: {
    type: { state: 'pre' | 'in' | 'post'; shortDetail?: string; completed?: boolean };
    displayClock: string;
    period: number;
  };
  venue?: {
    fullName?: string;
    address?: { city?: string; state?: string };
  };
}

export interface ESPNEvent {
  id: string;
  name?: string;
  shortName?: string;
  date?: string;
  competitions: ESPNCompetition[];
  status?: Record<string, unknown>;
}

export interface ESPNScoreboardResponse {
  events?: ESPNEvent[];
}

export interface ESPNArticleLink {
  name: string;
  url: string;
  type: 'article' | 'team' | 'athlete';
}

export interface ESPNArticle {
  headline: string;
  description: string;
  teams: string[];
  athletes: string[];
  published: string;
  url: string;
  links: ESPNArticleLink[];
  source: string;
}

// ============================================================
// Scoreboard
// ============================================================

/**
 * Fetch today's CFB scoreboard. Cached 60s.
 */
export async function getScoreboard(): Promise<ESPNEvent[]> {
  const data = await cached('espn:scoreboard', 60_000, () =>
    getJson<ESPNScoreboardResponse>(`${BASE}/scoreboard`, { timeoutMs: 5000 }),
  );
  return data?.events ?? [];
}

// ============================================================
// News
// ============================================================

interface ESPNNewsArticleRaw {
  headline?: string;
  description?: string;
  published?: string;
  links?: {
    web?: { href?: string; self?: { href?: string } };
  };
  categories?: Array<{
    type?: string;
    description?: string;
    team?: { description?: string; links?: { web?: { teams?: { href?: string } } } };
    athlete?: { description?: string; links?: { web?: { athletes?: { href?: string } } } };
  }>;
}

/**
 * Fetch ESPN CFB news articles. Cached 10 min.
 */
export async function getNews(limit = 20): Promise<ESPNArticle[]> {
  const data = await cached(`espn:news:${limit}`, 10 * 60_000, () =>
    getJson<{ articles?: ESPNNewsArticleRaw[] }>(`${BASE}/news?limit=${limit}`, { timeoutMs: 8000 }),
  );
  const articles = data?.articles ?? [];
  return articles.map((a) => {
    const categories = a.categories ?? [];
    const extractedLinks: ESPNArticleLink[] = [];
    const articleUrl = a.links?.web?.href || a.links?.web?.self?.href || '';
    if (articleUrl) {
      extractedLinks.push({ name: a.headline || 'Article', url: articleUrl, type: 'article' });
    }
    for (const cat of categories) {
      if (cat.type === 'team' && cat.team?.links?.web?.teams?.href) {
        extractedLinks.push({
          name: cat.description || cat.team?.description || '',
          url: cat.team.links.web.teams.href,
          type: 'team',
        });
      }
      if (cat.type === 'athlete' && cat.athlete?.links?.web?.athletes?.href) {
        extractedLinks.push({
          name: cat.description || cat.athlete?.description || '',
          url: cat.athlete.links.web.athletes.href,
          type: 'athlete',
        });
      }
    }
    return {
      headline: a.headline ?? '',
      description: (a.description ?? '').substring(0, 300),
      teams: categories
        .filter((c) => c.type === 'team')
        .map((c) => c.description ?? '')
        .filter((d) => d.length > 0),
      athletes: categories
        .filter((c) => c.type === 'athlete')
        .map((c) => c.description ?? '')
        .filter((d) => d.length > 0),
      published: a.published ?? '',
      url: articleUrl,
      links: extractedLinks,
      source: 'ESPN',
    };
  });
}

// ============================================================
// Find a specific game by ESPN id (used by War Room)
// ============================================================

export async function getEventById(espnId: string): Promise<ESPNEvent | null> {
  const events = await getScoreboard();
  return events.find((e) => e.id === espnId) ?? null;
}

// ============================================================
// Connection test
// ============================================================

export async function pingScoreboard(): Promise<{ ok: boolean; message: string }> {
  const data = await getJson<ESPNScoreboardResponse>(`${BASE}/scoreboard?limit=1`, { timeoutMs: 5000 });
  if (!data) return { ok: false, message: 'ESPN API unreachable' };
  return { ok: true, message: `ESPN API reachable (${data.events?.length ?? 0} events)` };
}
