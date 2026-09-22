// ============================================================
// Data contexts for the non-matchup blog post types.
// Each returns a pre-formatted ground-truth block for the LLM prompt,
// built from free sources (ESPN + our own DB) so it doesn't burn CFBD quota.
// All degrade gracefully to a minimal block when a source is empty.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { getScoreboard, getRankings, getNews } from '@/lib/providers/espn';

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export interface BlogContext {
  promptText: string;
  /** Optional suggested working title / topic label. */
  label: string;
}

function rankingsBlock(rk: Awaited<ReturnType<typeof getRankings>>): string | null {
  if (!rk || !rk.entries.length) return null;
  const lines = rk.entries
    .slice(0, 25)
    .map((e) => `  ${e.current}. ${e.team}${e.record ? ` (${e.record})` : ''}`);
  return `${rk.poll}:\n${lines.join('\n')}`;
}

/* ── Weekly recap / "This week in CFB" ─────────────────────────── */

export async function buildWeekContext(): Promise<BlogContext> {
  const [events, rankings, news] = await Promise.all([getScoreboard(), getRankings(), getNews(25)]);

  const finals: string[] = [];
  const upcoming: string[] = [];
  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) continue;
    const state = comp.status?.type?.state;
    const label = `${away.team.displayName} ${away.score} at ${home.team.displayName} ${home.score}`;
    if (state === 'post') finals.push(`  - FINAL: ${label}`);
    else if (state === 'pre') upcoming.push(`  - ${away.team.displayName} at ${home.team.displayName}${ev.date ? ` (${ev.date})` : ''}`);
  }

  const lines: string[] = [];
  const rb = rankingsBlock(rankings);
  if (rb) lines.push(`CURRENT RANKINGS\n${rb}`);
  if (finals.length) lines.push(`RECENT / FINAL RESULTS\n${finals.slice(0, 20).join('\n')}`);
  if (upcoming.length) lines.push(`UPCOMING GAMES\n${upcoming.slice(0, 15).join('\n')}`);
  if (news.length) lines.push(`HEADLINES\n${news.slice(0, 10).map((n) => `  - ${n.headline}`).join('\n')}`);
  if (!lines.length) lines.push('No live games or rankings available right now; write an evergreen "state of college football" column and do NOT invent specific scores or rankings.');

  return { promptText: lines.join('\n\n'), label: 'This Week in College Football' };
}

/* ── Transfer portal roundup ───────────────────────────────────── */

export async function buildPortalContext(): Promise<BlogContext> {
  const [{ data: players }, news] = await Promise.all([
    sb()
      .from('portal_players')
      .select(`
        name, position, star_rating, status, total_claims, entered_portal_at,
        previous_school:previous_school_id(name, abbreviation),
        committed_school:committed_school_id(name, abbreviation)
      `)
      .order('entered_portal_at', { ascending: false })
      .limit(25),
    getNews(25),
  ]);

  const moves: string[] = [];
  for (const p of (players as unknown[]) ?? []) {
    const row = p as Record<string, unknown>;
    const prev = Array.isArray(row.previous_school) ? row.previous_school[0] : row.previous_school;
    const comm = Array.isArray(row.committed_school) ? row.committed_school[0] : row.committed_school;
    const from = (prev as { name?: string })?.name ?? 'Unknown';
    const to = (comm as { name?: string })?.name ?? (String(row.status) === 'COMMITTED' ? 'Committed' : 'Undecided');
    const stars = row.star_rating ? `${row.star_rating}-star ` : '';
    moves.push(`  - ${stars}${row.position ?? ''} ${row.name}: ${from} -> ${to} (${row.status})`);
  }

  const portalNews = news.filter((n) => /portal|transfer|commit|decommit/i.test(n.headline)).slice(0, 8);

  const lines: string[] = [];
  if (moves.length) lines.push(`RECENT TRANSFER PORTAL MOVES (from our tracker)\n${moves.slice(0, 20).join('\n')}`);
  else lines.push('No recent portal moves in the tracker; keep this to a general portal-landscape piece and do NOT invent specific player movements.');
  if (portalNews.length) lines.push(`PORTAL HEADLINES\n${portalNews.map((n) => `  - ${n.headline}`).join('\n')}`);

  return { promptText: lines.join('\n\n'), label: 'Transfer Portal Roundup' };
}

/* ── Power rankings reaction ───────────────────────────────────── */

export async function buildRankingsContext(): Promise<BlogContext> {
  const [rankings, news] = await Promise.all([getRankings(), getNews(20)]);
  const lines: string[] = [];
  const rb = rankingsBlock(rankings);
  if (rb) lines.push(`OFFICIAL POLL (ground truth for all ranking numbers)\n${rb}`);
  else lines.push('No poll data available; write an evergreen power-rankings-style column and do NOT invent specific ranking numbers.');
  if (news.length) lines.push(`HEADLINES\n${news.slice(0, 8).map((n) => `  - ${n.headline}`).join('\n')}`);
  return { promptText: lines.join('\n\n'), label: 'Power Rankings Reaction' };
}

/* ── Freeform (admin-provided topic, argufight-style) ──────────── */

export async function buildFreeformContext(topic: string): Promise<BlogContext> {
  const news = await getNews(20);
  const relevant = news
    .filter((n) => {
      const t = topic.toLowerCase();
      const words = t.split(/\s+/).filter((w) => w.length > 3);
      const h = n.headline.toLowerCase();
      return words.some((w) => h.includes(w));
    })
    .slice(0, 6);
  const lines: string[] = [`TOPIC: ${topic}`];
  if (relevant.length) {
    lines.push(`RELATED RECENT HEADLINES (for topicality; only cite if relevant)\n${relevant.map((n) => `  - ${n.headline}`).join('\n')}`);
  }
  return { promptText: lines.join('\n\n'), label: topic };
}
