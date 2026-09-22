// ============================================================
// Matchup context builder for the AI blog generator.
//
// Given two school slugs, assembles a structured "brief" of REAL data —
// this week's game (ESPN), all-time head-to-head + recent meetings (CFBD),
// current records and rankings (CFBD), and recent news — that gets injected
// into the LLM prompt as ground truth. The model supplies narrative/history
// from its own knowledge; the numbers come from here so they aren't invented.
// Every source degrades gracefully (missing CFBD key, offseason, etc.).
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { getWeekScoreboard, getNews, type ESPNEvent } from '@/lib/providers/espn';
import {
  getMatchupHistory,
  getRecords,
  getTeamHighlights,
} from '@/lib/providers/cfbd';
import { getSeriesFromResults } from './game-history';

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export interface MatchupSchool {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  mascot: string | null;
  conference: string | null;
  city: string | null;
  state: string | null;
  stadium: string | null;
  abbreviation: string;
  /** Name CFBD uses (e.g. "Miami", "Florida State"). */
  cfbdName: string;
}

export interface MatchupContext {
  home: MatchupSchool;
  away: MatchupSchool;
  game: {
    date: string | null;
    venue: string | null;
    location: string | null;
    statusDetail: string | null;
    isThisWeek: boolean;
  } | null;
  seriesText: string | null;
  homeRecordText: string | null;
  awayRecordText: string | null;
  homeHighlights: string | null;
  awayHighlights: string | null;
  newsHeadlines: string[];
  /** Pre-formatted data block for the LLM prompt. */
  promptText: string;
}

async function fetchSchool(slug: string): Promise<MatchupSchool | null> {
  const { data } = await sb()
    .from('schools')
    .select('id, name, short_name, slug, mascot, conference, city, state, stadium, abbreviation')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  const shortName = (data.short_name as string) || (data.name as string);
  return {
    id: String(data.id),
    name: String(data.name),
    shortName,
    slug: String(data.slug),
    mascot: (data.mascot as string) ?? null,
    conference: (data.conference as string) ?? null,
    city: (data.city as string) ?? null,
    state: (data.state as string) ?? null,
    stadium: (data.stadium as string) ?? null,
    abbreviation: String(data.abbreviation ?? ''),
    cfbdName: shortName,
  };
}

const normName = (s: string | undefined | null) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function teamMatchesSchool(
  team: { abbreviation?: string; displayName?: string; location?: string },
  school: MatchupSchool,
): boolean {
  const abbr = (team.abbreviation || '').toUpperCase();
  if (abbr && school.abbreviation && abbr === school.abbreviation.toUpperCase()) return true;
  const keys = new Set([normName(school.name), normName(school.shortName)].filter(Boolean));
  if (keys.has(normName(team.location))) return true;
  if (keys.has(normName(team.displayName))) return true;
  return false;
}

function findGameEvent(events: ESPNEvent[], home: MatchupSchool, away: MatchupSchool): ESPNEvent | null {
  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp || comp.competitors.length < 2) continue;
    const matchHome = comp.competitors.some((c) => teamMatchesSchool(c.team, home));
    const matchAway = comp.competitors.some((c) => teamMatchesSchool(c.team, away));
    if (matchHome && matchAway) return ev;
  }
  return null;
}

function buildSeriesText(
  matchup: Awaited<ReturnType<typeof getMatchupHistory>>,
  home: MatchupSchool,
  away: MatchupSchool,
): string | null {
  if (!matchup) return null;
  const t1 = matchup.team1;
  const t2 = matchup.team2;
  const w1 = matchup.team1Wins ?? 0;
  const w2 = matchup.team2Wins ?? 0;
  const ties = matchup.ties ?? 0;
  const total = w1 + w2 + ties;
  if (total === 0) return `${home.shortName} and ${away.shortName} have no recorded head-to-head meetings.`;

  const leader = w1 === w2 ? null : w1 > w2 ? t1 : t2;
  const lead = w1 === w2 ? `The all-time series is tied ${w1}-${w2}${ties ? `-${ties}` : ''}` : `${leader} leads the all-time series ${Math.max(w1, w2)}-${Math.min(w1, w2)}${ties ? `-${ties}` : ''}`;
  const span = matchup.startYear && matchup.endYear ? ` (${matchup.startYear}-${matchup.endYear}, ${total} meetings)` : ` (${total} meetings)`;

  const recent = (matchup.games ?? [])
    .slice(-4)
    .reverse()
    .map((g) => {
      const hs = g.homeScore ?? null;
      const as = g.awayScore ?? null;
      const score = hs != null && as != null ? `${g.homeTeam} ${hs}, ${g.awayTeam} ${as}` : `${g.homeTeam} vs ${g.awayTeam}`;
      return `  - ${g.season}: ${score}${g.winner ? ` (${g.winner} won)` : ''}`;
    });

  return `${lead}${span}.` + (recent.length ? `\nMost recent meetings:\n${recent.join('\n')}` : '');
}

async function recordText(cfbdName: string, year: number): Promise<string | null> {
  let recs = await getRecords(year, cfbdName);
  let y = year;
  if (recs.length === 0) {
    recs = await getRecords(year - 1, cfbdName);
    y = year - 1;
  }
  const r = recs.find((x) => x.team?.toLowerCase() === cfbdName.toLowerCase()) ?? recs[0];
  const t = r?.total;
  if (!t) return null;
  return `${y}: ${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;
}

export async function buildMatchupContext(
  homeSlug: string,
  awaySlug: string,
  espnGameId?: string,
): Promise<MatchupContext | null> {
  const [home, away] = await Promise.all([fetchSchool(homeSlug), fetchSchool(awaySlug)]);
  if (!home || !away) return null;

  const year = new Date().getFullYear();

  const [event, matchup, homeRecordText, awayRecordText, homeHighlights, awayHighlights, news] =
    await Promise.all([
      (async () => {
        const events = await getWeekScoreboard();
        if (espnGameId) return events.find((e) => e.id === espnGameId) ?? findGameEvent(events, home, away);
        return findGameEvent(events, home, away);
      })(),
      // Prefer our own backfilled history (no CFBD quota); fall back to live CFBD.
      (async () =>
        (await getSeriesFromResults(home.cfbdName, away.cfbdName)) ??
        (await getMatchupHistory(home.cfbdName, away.cfbdName)))(),
      recordText(home.cfbdName, year),
      recordText(away.cfbdName, year),
      getTeamHighlights(home.cfbdName, year),
      getTeamHighlights(away.cfbdName, year),
      getNews(30),
    ]);

  let game: MatchupContext['game'] = null;
  if (event) {
    const comp = event.competitions?.[0];
    game = {
      date: event.date ?? null,
      venue: comp?.venue?.fullName ?? null,
      location: [comp?.venue?.address?.city, comp?.venue?.address?.state].filter(Boolean).join(', ') || null,
      statusDetail: comp?.status?.type?.shortDetail ?? null,
      isThisWeek: true,
    };
  }

  const seriesText = buildSeriesText(matchup, home, away);

  const nameNeedles = [home.shortName, away.shortName, home.mascot, away.mascot, home.name, away.name]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  const newsHeadlines = news
    .filter((a) => {
      const h = `${a.headline} ${a.teams.join(' ')}`.toLowerCase();
      return nameNeedles.some((n) => n.length > 2 && h.includes(n));
    })
    .slice(0, 5)
    .map((a) => a.headline)
    .filter(Boolean);

  // Assemble the ground-truth data block for the prompt.
  const lines: string[] = [];
  lines.push(`MATCHUP: ${away.name} at ${home.name}`);
  lines.push(`${home.name} — mascot: ${home.mascot ?? 'n/a'}; conference: ${home.conference ?? 'n/a'}; home: ${home.stadium ?? 'n/a'}${home.city ? `, ${home.city}` : ''}${home.state ? `, ${home.state}` : ''}.`);
  lines.push(`${away.name} — mascot: ${away.mascot ?? 'n/a'}; conference: ${away.conference ?? 'n/a'}; home: ${away.stadium ?? 'n/a'}${away.city ? `, ${away.city}` : ''}${away.state ? `, ${away.state}` : ''}.`);
  if (game) {
    lines.push(`THIS GAME: ${game.date ? `Kickoff ${game.date}` : 'date TBD'}${game.venue ? ` at ${game.venue}` : ''}${game.location ? ` (${game.location})` : ''}${game.statusDetail ? ` — ${game.statusDetail}` : ''}.`);
  } else {
    lines.push(`THIS GAME: Not on this week's scoreboard — treat as an evergreen matchup preview, do not invent a specific date, time, or score.`);
  }
  if (homeRecordText) lines.push(`${home.shortName} current record — ${homeRecordText}.`);
  if (awayRecordText) lines.push(`${away.shortName} current record — ${awayRecordText}.`);
  if (homeHighlights) lines.push(`${home.shortName} rankings — ${homeHighlights}.`);
  if (awayHighlights) lines.push(`${away.shortName} rankings — ${awayHighlights}.`);
  if (seriesText) lines.push(`ALL-TIME SERIES:\n${seriesText}`);
  if (newsHeadlines.length) lines.push(`RECENT HEADLINES:\n${newsHeadlines.map((h) => `  - ${h}`).join('\n')}`);

  return {
    home,
    away,
    game,
    seriesText,
    homeRecordText,
    awayRecordText,
    homeHighlights,
    awayHighlights,
    newsHeadlines,
    promptText: lines.join('\n'),
  };
}
