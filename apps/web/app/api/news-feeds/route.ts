import { NextResponse } from 'next/server';

/**
 * /api/news-feeds — Multi-source CFB news aggregator.
 * Fetches from ESPN API, CBS Sports RSS, Yahoo Sports RSS in parallel.
 * Categorizes articles into: recruiting, portal, trending (general).
 * Returns deduplicated, source-attributed results.
 */

export const runtime = 'nodejs';

// ── Types ──────────────────────────────────────────────────────

interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  imageUrl: string | null;
  articleUrl: string;
  byline: string;
  published: string;
  source: string;             // e.g., "ESPN", "CBS Sports", "Yahoo Sports"
  category: 'recruiting' | 'portal' | 'trending';
}

interface CacheEntry {
  data: { recruiting: NewsArticle[]; portal: NewsArticle[]; trending: NewsArticle[] };
  fetchedAt: number;
}

// ── Cache ──────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cached: CacheEntry | null = null;

// ── Keyword categorization ─────────────────────────────────────

const RECRUITING_KEYWORDS = /\b(recruit|recruiting|commitment|commits?|decommit|signing|class of|five.?star|four.?star|three.?star|top.?prospect|flip|crystal ball|offer|visit|nsd|national signing day|early enrollee)\b/i;
const PORTAL_KEYWORDS = /\b(transfer portal|portal|entered the portal|transfer|transferred|destination|leaving|departs|portal entry|portal tracker)\b/i;

function isGarbageText(text: string): boolean {
  const words = text.split(/\s+/);
  if (words.some((w) => w.length > 40)) return true;
  const avgWordLen = text.replace(/\s+/g, '').length / Math.max(words.length, 1);
  if (avgWordLen > 15) return true;
  for (const w of words) {
    if (w.length < 15) continue;
    let transitions = 0;
    for (let i = 1; i < w.length; i++) {
      if (/[a-z]/.test(w[i - 1]) && /[A-Z]/.test(w[i])) transitions++;
    }
    if (transitions >= 3) return true;
  }
  if (/^(Search|Menu|Navigation|Home|About|Contact)/i.test(text) && text.length < 300) return true;
  return false;
}

function categorize(headline: string, description: string): 'recruiting' | 'portal' | 'trending' {
  const text = `${headline} ${description}`;
  if (PORTAL_KEYWORDS.test(text)) return 'portal';
  if (RECRUITING_KEYWORDS.test(text)) return 'recruiting';
  return 'trending';
}

// ── ESPN API fetch ─────────────────────────────────────────────

async function fetchESPN(): Promise<NewsArticle[]> {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/college-football/news?limit=10',
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return [];

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const data = await res.json() as { articles?: any[] };
    return (data.articles || []).map((a: any) => {
      const images = a.images as Array<{ url: string }> | undefined;
      const links = a.links as { web?: { href?: string } } | undefined;
      const headline = (a.headline as string) || '';
      const description = ((a.description as string) || '').substring(0, 300);
      return {
        id: `espn-${a.id}`,
        headline,
        description,
        imageUrl: images?.[0]?.url ?? null,
        articleUrl: links?.web?.href ?? '',
        byline: (a.byline as string) ?? '',
        published: (a.published as string) ?? '',
        source: 'ESPN',
        category: categorize(headline, description),
      };
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch {
    return [];
  }
}

// ── HTML entity decoder ────────────────────────────────────────

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// ── RSS feed parser ────────────────────────────────────────────

function parseRSS(xml: string, source: string, limit = 10): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && articles.length < limit) {
    const block = match[1] || '';

    // Title
    const titleCdata = block.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/);
    const titlePlain = block.match(/<title>([^<]+)<\/title>/);
    const headline = decodeEntities((titleCdata?.[1] || titlePlain?.[1] || '').trim());
    if (!headline || headline.length < 10) continue;

    // Description
    const descCdata = block.match(/<description><!\[CDATA\[(.+?)\]\]><\/description>/s);
    const descPlain = block.match(/<description>([^<]+)<\/description>/);
    let description = decodeEntities(
      (descCdata?.[1] || descPlain?.[1] || '')
        .replace(/<[^>]+>/g, '')
        .trim()
        .substring(0, 500)
    );
    // Strip garbage nav text from RSS descriptions
    if (isGarbageText(description)) {
      description = '';
    }

    // Link
    const linkMatch = block.match(/<link>([^<]+)<\/link>/) || block.match(/<link><!\[CDATA\[(.+?)\]\]><\/link>/);
    const articleUrl = (linkMatch?.[1] || '').trim();

    // pubDate
    const pubMatch = block.match(/<pubDate>([^<]+)<\/pubDate>/);
    const published = (pubMatch?.[1] || '').trim();

    // Author/creator
    const creatorMatch = block.match(/<dc:creator><!\[CDATA\[(.+?)\]\]><\/dc:creator>/)
      || block.match(/<dc:creator>([^<]+)<\/dc:creator>/)
      || block.match(/<author>([^<]+)<\/author>/);
    const byline = decodeEntities((creatorMatch?.[1] || '').trim());

    // Image: try enclosure, media:content, media:thumbnail
    const enclosureMatch = block.match(/<enclosure[^>]+url="([^"]+)"/);
    const mediaMatch = block.match(/<media:content[^>]+url="([^"]+)"/);
    const thumbMatch = block.match(/<media:thumbnail[^>]+url="([^"]+)"/);
    // Also try to extract image from description HTML (some feeds embed <img>)
    const descImgMatch = (descCdata?.[1] || '').match(/<img[^>]+src="([^"]+)"/);
    const imageUrl = enclosureMatch?.[1] || mediaMatch?.[1] || thumbMatch?.[1] || descImgMatch?.[1] || null;

    articles.push({
      id: `${source.toLowerCase().replace(/\s/g, '-')}-${articles.length}`,
      headline,
      description,
      imageUrl,
      articleUrl,
      byline,
      published,
      source,
      category: categorize(headline, description),
    });
  }
  return articles;
}

// ── Individual RSS source fetchers ─────────────────────────────

async function fetchCBSSports(): Promise<NewsArticle[]> {
  try {
    const res = await fetch('https://www.cbssports.com/rss/headlines/college-football/', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    return parseRSS(await res.text(), 'CBS Sports');
  } catch {
    return [];
  }
}

async function fetchYahooSports(): Promise<NewsArticle[]> {
  try {
    const res = await fetch('https://sports.yahoo.com/college-football/rss/', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    return parseRSS(await res.text(), 'Yahoo Sports');
  } catch {
    return [];
  }
}

async function fetch247Sports(): Promise<NewsArticle[]> {
  try {
    const res = await fetch('https://247sports.com/college/football/rss/', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    return parseRSS(await res.text(), '247Sports');
  } catch {
    return [];
  }
}

// ── Deduplication ──────────────────────────────────────────────

function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter(a => {
    const key = a.headline.toLowerCase().replace(/[^a-z0-9 ]/g, '').substring(0, 45);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main handler ───────────────────────────────────────────────

export async function GET() {
  // Return cached if fresh
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' },
    });
  }

  // Fetch all sources in parallel
  const [espn, cbs, yahoo, two47] = await Promise.all([
    fetchESPN(),
    fetchCBSSports(),
    fetchYahooSports(),
    fetch247Sports(),
  ]);

  // Combine and deduplicate
  const all = deduplicateArticles([...espn, ...cbs, ...yahoo, ...two47]);

  // Categorize
  const recruiting: NewsArticle[] = [];
  const portal: NewsArticle[] = [];
  const trending: NewsArticle[] = [];

  for (const article of all) {
    if (article.category === 'recruiting') recruiting.push(article);
    else if (article.category === 'portal') portal.push(article);
    else trending.push(article);
  }

  // Sort each by published date (newest first), then limit
  const sortByDate = (a: NewsArticle, b: NewsArticle) =>
    new Date(b.published || 0).getTime() - new Date(a.published || 0).getTime();

  recruiting.sort(sortByDate);
  portal.sort(sortByDate);
  trending.sort(sortByDate);

  const data = {
    recruiting: recruiting.slice(0, 5),
    portal: portal.slice(0, 5),
    trending: trending.slice(0, 8),
  };

  cached = { data, fetchedAt: Date.now() };

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' },
  });
}
