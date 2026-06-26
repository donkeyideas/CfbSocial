import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { isPostIndexable, isProfileIndexable } from '@/lib/seo/indexable';
import { curatedMatchupSlugs } from '@/lib/seo/matchups';

const BASE_URL = 'https://www.cfbsocial.com';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // regenerate at most every hour

/**
 * Supabase caps every response at 1000 rows (PostgREST `max-rows`), so a plain
 * `.limit(50000)` silently returns only 1000. This pages through with `.range()`
 * until the table is exhausted (or `hardCap` is hit, as a safety valve).
 */
async function fetchAll<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  makeQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  { pageSize = 1000, hardCap = 50000 }: { pageSize?: number; hardCap?: number } = {},
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < hardCap; from += pageSize) {
    const { data, error } = await makeQuery(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

interface SitemapPost {
  id: string;
  created_at: string;
  status: string | null;
  removed_at: string | null;
  post_type: string | null;
  media_urls: string[] | null;
  content: string | null;
  reply_count: number | null;
  view_count: number | null;
  author: { is_bot: boolean | null } | { is_bot: boolean | null }[] | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages (always included, no DB dependency)
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/feed`, lastModified: new Date(), changeFrequency: 'always', priority: 1.0 },
    { url: `${BASE_URL}/rivalry`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/portal`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/predictions`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/war-room`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE_URL}/mascot-wars`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/recruiting`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/dynasty`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/hall-of-fame`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
    { url: `${BASE_URL}/vault`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/delete-account`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE_URL}/schools`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/game-room`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/game-room/leagues`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/game-room/guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Conference hub pages
  const conferencePages: MetadataRoute.Sitemap = [
    'sec', 'big-ten', 'big-12', 'acc', 'pac-12', 'american',
    'sun-belt', 'conference-usa', 'mac', 'mountain-west', 'independents',
  ].map((conf) => ({
    url: `${BASE_URL}/conferences/${conf}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Curated rivalry matchup hubs (durable, high-intent, always indexable).
  // Auto-grow matchup pages are discovered via internal links, not the sitemap.
  const matchupPages: MetadataRoute.Sitemap = curatedMatchupSlugs().map((slug) => ({
    url: `${BASE_URL}/matchup/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Dynamic pages from Supabase — wrapped in try/catch so the build
  // doesn't fail when Supabase is slow or unreachable.
  let schoolPages: MetadataRoute.Sitemap = [];
  let postPages: MetadataRoute.Sitemap = [];
  let profilePages: MetadataRoute.Sitemap = [];
  let leaguePages: MetadataRoute.Sitemap = [];
  let issuePages: MetadataRoute.Sitemap = [];
  let rivalryPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const [schools, posts, profiles, leagues, issues, rivalries] = await Promise.all([
      // Schools: ~653, comfortably under one page.
      fetchAll<{ slug: string; updated_at: string | null }>((from, to) =>
        supabase.from('schools').select('slug, updated_at').not('slug', 'is', null).range(from, to),
      ),
      // Posts: page through ALL top-level published posts, then keep only the
      // ones the shared policy says are worth indexing (moments + substantive
      // human takes). This replaces the old silent limit(1000).
      fetchAll<SitemapPost>((from, to) =>
        supabase
          .from('posts')
          .select('id, created_at, status, removed_at, post_type, media_urls, content, reply_count, view_count, author:profiles!posts_author_id_fkey(is_bot)')
          .eq('status', 'PUBLISHED')
          .is('parent_id', null)
          .order('created_at', { ascending: false })
          .range(from, to),
      ),
      // Profiles: only real, active users with a track record.
      fetchAll<{ username: string; updated_at: string | null; is_bot: boolean | null; post_count: number | null; status: string | null }>((from, to) =>
        supabase
          .from('profiles')
          .select('username, updated_at, is_bot, post_count, status')
          .eq('is_bot', false)
          .gte('post_count', 3)
          .range(from, to),
      ),
      fetchAll<{ id: string; created_at: string | null }>((from, to) =>
        supabase.from('online_leagues').select('id, created_at').order('created_at', { ascending: false }).range(from, to),
        { hardCap: 5000 },
      ),
      fetchAll<{ feed_post_id: string; updated_at: string | null }>((from, to) =>
        supabase.from('game_room_issues').select('feed_post_id, updated_at').not('feed_post_id', 'is', null).range(from, to),
        { hardCap: 5000 },
      ),
      fetchAll<{ id: string; updated_at: string | null }>((from, to) =>
        supabase.from('rivalries').select('id, updated_at').range(from, to), { hardCap: 1000 },
      ),
    ]);

    schoolPages = schools.map((school) => ({
      url: `${BASE_URL}/school/${school.slug}`,
      lastModified: school.updated_at ? new Date(school.updated_at) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    postPages = posts
      .map((post) => {
        // Normalise the embedded author (PostgREST may return an object or array).
        const author = Array.isArray(post.author) ? post.author[0] ?? null : post.author;
        return { ...post, author };
      })
      .filter((post) => isPostIndexable(post))
      .map((post) => {
        const img = post.post_type === 'MOMENT' ? post.media_urls?.[0] : undefined;
        return {
          url: `${BASE_URL}/post/${post.id}`,
          lastModified: new Date(post.created_at),
          changeFrequency: 'weekly' as const,
          priority: post.post_type === 'MOMENT' ? 0.7 : 0.6,
          ...(img ? { images: [img] } : {}),
        };
      });

    profilePages = profiles
      .filter((p) => isProfileIndexable(p))
      .map((p) => ({
        url: `${BASE_URL}/profile/${p.username}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      }));

    leaguePages = leagues.map((lg) => ({
      url: `${BASE_URL}/game-room/leagues/${lg.id}`,
      lastModified: lg.created_at ? new Date(lg.created_at) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));

    issuePages = issues.map((iss) => ({
      url: `${BASE_URL}/game-room/issue/${iss.feed_post_id}`,
      lastModified: iss.updated_at ? new Date(iss.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    rivalryPages = rivalries.map((r) => ({
      url: `${BASE_URL}/rivalry/${r.id}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.warn('Sitemap: Supabase query failed, returning static pages only:', err);
  }

  return [
    ...staticPages,
    ...conferencePages,
    ...matchupPages,
    ...schoolPages,
    ...postPages,
    ...profilePages,
    ...leaguePages,
    ...issuePages,
    ...rivalryPages,
  ];
}
