import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWeekScoreboard } from '@/lib/providers/espn';
import { generateMatchupBlog } from '@/lib/blog/generate';
import { adminCreatePost } from '@/lib/blog/queries';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { matchupSlug } from '@/lib/seo/matchups';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Auto-generates DRAFT matchup previews for a few of this week's games that map
// to our schools. Always DRAFTs — an admin reviews and publishes.
export async function GET(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production';
  const vercelCron = req.headers.get('x-vercel-cron');
  const authHeader = req.headers.get('authorization');
  if (!isDev && !vercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = Math.min(3, Math.max(1, Number(new URL(req.url).searchParams.get('limit') ?? 2)));

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [events, schoolsRes] = await Promise.all([
    getWeekScoreboard(),
    anon.from('schools').select('id, slug, abbreviation, name, short_name').eq('is_active', true),
  ]);

  type S = { id: string; slug: string; name: string };
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const byAbbr = new Map<string, S>();
  const byName = new Map<string, S>();
  for (const s of schoolsRes.data ?? []) {
    const entry: S = { id: String(s.id), slug: String(s.slug), name: String(s.name) };
    if (s.abbreviation) byAbbr.set(String(s.abbreviation).toUpperCase(), entry);
    if (s.name) byName.set(norm(String(s.name)), entry);
    if (s.short_name) byName.set(norm(String(s.short_name)), entry);
  }
  const matchTeam = (team: { abbreviation?: string; displayName?: string; location?: string }): S | undefined => {
    const abbr = (team.abbreviation || '').toUpperCase();
    if (abbr && byAbbr.has(abbr)) return byAbbr.get(abbr);
    const loc = norm(team.location || '');
    if (loc && byName.has(loc)) return byName.get(loc);
    const dn = norm(team.displayName || '');
    if (dn && byName.has(dn)) return byName.get(dn);
    return undefined;
  };

  const candidates: Array<{ espnGameId: string; home: S; away: S }> = [];
  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp || comp.status?.type?.state !== 'pre') continue; // upcoming only
    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) continue;
    const hs = matchTeam(home.team);
    const as = matchTeam(away.team);
    if (!hs || !as) continue;
    candidates.push({ espnGameId: ev.id, home: hs, away: as });
  }

  const admin = createAdminClient();
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const since = new Date(Date.now() - 10 * 86_400_000).toISOString();

  for (const c of candidates) {
    if (created.length >= limit) break;
    const mslug = matchupSlug(c.home.slug, c.away.slug);
    const { data: existing } = await admin
      .from('blog_posts')
      .select('id')
      .eq('matchup_slug', mslug)
      .gte('created_at', since)
      .limit(1);
    if (existing && existing.length) {
      skipped.push(mslug);
      continue;
    }
    try {
      const { blog } = await generateMatchupBlog(c.home.slug, c.away.slug, { espnGameId: c.espnGameId });
      const cover = `/api/blog/cover?home=${encodeURIComponent(c.home.slug)}&away=${encodeURIComponent(c.away.slug)}&title=${encodeURIComponent(blog.title)}`;
      await adminCreatePost({
        title: blog.title,
        content: blog.content,
        excerpt: blog.excerpt,
        metaDescription: blog.metaDescription,
        keywords: blog.keywords,
        tags: blog.tags,
        faqs: blog.faqs,
        postType: 'MATCHUP',
        homeSchoolId: c.home.id,
        awaySchoolId: c.away.id,
        matchupSlug: mslug,
        coverImageUrl: cover,
        status: 'DRAFT',
      });
      created.push(mslug);
    } catch (e) {
      errors.push(`${mslug}: ${e instanceof Error ? e.message : 'generation failed'}`);
    }
  }

  return NextResponse.json({ ok: true, created, skipped, errors });
}
