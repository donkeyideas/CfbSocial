import { createClient } from '@supabase/supabase-js';
import {
  XP_THRESHOLDS,
  getTierForLevel,
  getXPToNextLevel,
  getLevelProgress,
} from '@cfb-social/types';

/* ── Types ─────────────────────────────────────────────────────── */

export interface LandingTeam {
  abbr: string;
  name: string;
  record: string;
  score: string;
  color: string;
}

export interface LandingGame {
  id: string;
  statusState: 'in' | 'pre' | 'post';
  statusLabel: string;
  kickoffLabel: string;
  home: LandingTeam;
  away: LandingTeam;
}

export interface LandingHotTake {
  id: string;
  content: string;
  timeLabel: string;
  td: number;
  fumble: number;
  author: { username: string; tier: string };
  school: { abbr: string; name: string; slug: string; color: string };
}

export interface LandingStats {
  schools: number;
  liveThreads: number;
  posts: number;
}

export interface LandingTickerItem {
  tag: string;
  text: string;
  live?: boolean;
}

/* ── Feature-card snapshot types (server-rendered, no rotation) ── */

export interface LandingRivalry {
  a: { name: string; abbr: string; color: string; votes: number };
  b: { name: string; abbr: string; color: string; votes: number };
  pctA: number;
  pctB: number;
  totalVotes: number;
  footLabel: string;
}

export interface LandingAgingTake {
  content: string;
  daysLabel: string;
  progressPct: number;
}

export interface LandingPortalPlayer {
  name: string;
  position: string;
  starRating: number;
  meta: string;
  fromAbbr: string;
  toLabel: string;
  statusLabel: string;
}

export interface LandingMascotBracket {
  pairs: Array<{ a: string; b: string; winner: 'a' | 'b' | null }>;
  champ: string | null;
}

export interface LandingMagazine {
  id: string;
  title: string;
  issueNumber: number;
  coverUrl: string | null;
  coverAccent: string | null;
  ownerUsername: string;
  school: string | null;
  pageCount: number;
}

export interface LandingHeatEntry {
  abbr: string;
  widthPct: number;
}

export interface LandingDynastyLeader {
  tierLabel: string;
  level: number;
  xp: number;
  nextThreshold: number;
  progressPct: number;
}

export interface LandingSchoolHubs {
  schools: Array<{ name: string; slug: string }>;
  moreCount: number;
}

export interface LandingData {
  games: LandingGame[];
  hotTakes: LandingHotTake[];
  stats: LandingStats;
  ticker: LandingTickerItem[];
  // Feature-card snapshots
  featureTake: LandingHotTake;
  featureGame: LandingGame | null;
  rivalry: LandingRivalry;
  agingTake: LandingAgingTake;
  portalPlayer: LandingPortalPlayer;
  mascotBracket: LandingMascotBracket;
  magazines: LandingMagazine[];
  recruitingHeat: LandingHeatEntry[];
  dynastyLeader: LandingDynastyLeader;
  schoolHubs: LandingSchoolHubs;
}

/* ── Constants ─────────────────────────────────────────────────── */

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';

const FALLBACK_GAMES: LandingGame[] = [
  {
    id: 'fallback-1',
    statusState: 'pre',
    statusLabel: 'UPCOMING',
    kickoffLabel: 'Game day kickoffs appear here',
    home: { abbr: 'OSU', name: 'Ohio State', record: '', score: '', color: '#bb0000' },
    away: { abbr: 'MICH', name: 'Michigan', record: '', score: '', color: '#00274c' },
  },
];

const FALLBACK_HOT_TAKES: LandingHotTake[] = [
  {
    id: 'fallback-take-1',
    content:
      "Georgia's defense is the best unit in the sport and it isn't close. Book it.",
    timeLabel: '12m',
    td: 842,
    fumble: 137,
    author: { username: 'dawgpound_jd', tier: 'ALL_AMERICAN' },
    school: { abbr: 'UGA', name: 'Georgia', slug: 'georgia-bulldogs', color: '#ba0c2f' },
  },
];

const FALLBACK_RIVALRY: LandingRivalry = {
  a: { name: 'Texas', abbr: 'TEX', color: '#bf5700', votes: 0 },
  b: { name: 'Oklahoma', abbr: 'OU', color: '#841617', votes: 0 },
  pctA: 58,
  pctB: 42,
  totalVotes: 0,
  footLabel: 'Vote in the Rivalry Ring',
};

const FALLBACK_AGING_TAKE: LandingAgingTake = {
  content: 'This team makes the Playoff. Screenshot this.',
  daysLabel: 'aging 214 days',
  progressPct: 40,
};

const FALLBACK_PORTAL_PLAYER: LandingPortalPlayer = {
  name: 'Marcus Ellery',
  position: 'QB',
  starRating: 5,
  meta: "6'3\" · Jr. · 41 offers",
  fromAbbr: 'Miami',
  toLabel: 'Undecided',
  statusLabel: 'In The Portal',
};

const FALLBACK_MASCOT_BRACKET: LandingMascotBracket = {
  pairs: [
    { a: 'BUCKY', b: 'SMOKEY', winner: 'a' },
    { a: 'RALPHIE', b: 'TRADITION', winner: 'a' },
  ],
  champ: 'CHAMP',
};

const FALLBACK_MAGAZINES: LandingMagazine[] = [];

const FALLBACK_HEAT: LandingHeatEntry[] = [
  { abbr: 'UGA', widthPct: 92 },
  { abbr: 'OSU', widthPct: 81 },
  { abbr: 'TEX', widthPct: 74 },
  { abbr: 'ORE', widthPct: 63 },
];

const FALLBACK_DYNASTY_LEADER: LandingDynastyLeader = {
  tierLabel: 'All-American',
  level: 7,
  xp: 3200,
  nextThreshold: 5000,
  progressPct: 64,
};

const FALLBACK_SCHOOL_HUBS: LandingSchoolHubs = {
  schools: [
    { name: 'Georgia', slug: 'georgia-bulldogs' },
    { name: 'Michigan', slug: 'michigan-wolverines' },
    { name: 'LSU', slug: 'lsu-tigers' },
    { name: 'Texas', slug: 'texas-longhorns' },
    { name: 'Oregon', slug: 'oregon-ducks' },
  ],
  moreCount: 648,
};

/* ── Anon Supabase client (same pattern as /api/sidebar) ───────── */

function getAnonSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/* ── Helpers ───────────────────────────────────────────────────── */

const ET = 'America/New_York';

function formatKickoff(iso: string): string {
  if (!iso) return 'UPCOMING';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'UPCOMING';
  // e.g. "Sat Aug 30 · 12:00 PM ET"
  const day = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: ET,
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: ET,
  });
  return `${day} · ${time} ET`;
}

function normalizeColor(hex: string | undefined | null, fallback: string): string {
  if (!hex) return fallback;
  const trimmed = String(hex).trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/* ── ESPN games ────────────────────────────────────────────────── */

function parseTeam(competitor: any, fallbackColor: string): LandingTeam {
  const team = competitor?.team ?? {};
  const records = competitor?.records;
  const record =
    Array.isArray(records) && records[0]?.summary ? String(records[0].summary) : '';
  return {
    abbr: team.abbreviation ?? '???',
    name: team.shortDisplayName ?? team.displayName ?? team.name ?? '',
    record,
    score: competitor?.score != null ? String(competitor.score) : '',
    color: normalizeColor(team.color, fallbackColor),
  };
}

async function fetchGames(): Promise<LandingGame[]> {
  try {
    const res = await fetch(ESPN_URL, { next: { revalidate: 60 } });
    if (!res.ok) return FALLBACK_GAMES;
    const data = await res.json();
    const events = data?.events;
    if (!Array.isArray(events) || events.length === 0) return FALLBACK_GAMES;

    const games: LandingGame[] = events.map((event: any) => {
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors ?? [];
      const homeC = competitors.find((c: any) => c.homeAway === 'home');
      const awayC = competitors.find((c: any) => c.homeAway === 'away');
      const statusType = event.status?.type ?? {};
      const rawState = statusType.state ?? '';
      const statusState: LandingGame['statusState'] =
        rawState === 'in' ? 'in' : rawState === 'post' ? 'post' : 'pre';
      const shortDetail = statusType.shortDetail ?? statusType.description ?? '';

      const home = parseTeam(homeC, '#1f2a44');
      const away = parseTeam(awayC, '#8b1a1a');

      let statusLabel: string;
      let kickoffLabel: string;
      if (statusState === 'in') {
        statusLabel = shortDetail || 'LIVE';
        kickoffLabel = '';
      } else if (statusState === 'post') {
        statusLabel = shortDetail || 'FINAL';
        kickoffLabel = '';
      } else {
        statusLabel = 'UPCOMING';
        kickoffLabel = formatKickoff(event.date ?? '');
        // Upcoming games have no meaningful score yet
        home.score = '';
        away.score = '';
      }

      return { id: String(event.id ?? ''), statusState, statusLabel, kickoffLabel, home, away };
    });

    // "Smart" ordering: LIVE first, then UPCOMING, then FINAL.
    const order: Record<LandingGame['statusState'], number> = { in: 0, pre: 1, post: 2 };
    games.sort((a, b) => order[a.statusState] - order[b.statusState]);

    return games.length > 0 ? games : FALLBACK_GAMES;
  } catch {
    return FALLBACK_GAMES;
  }
}

/* ── Hot takes ─────────────────────────────────────────────────── */

async function fetchHotTakes(sb: ReturnType<typeof getAnonSupabase>): Promise<LandingHotTake[]> {
  try {
    const { data, error } = await sb
      .from('posts')
      .select(`
        id,
        content,
        created_at,
        touchdown_count,
        fumble_count,
        author:profiles!posts_author_id_fkey(username, dynasty_tier),
        school:schools!posts_school_id_fkey(abbreviation, name, slug, primary_color)
      `)
      .eq('status', 'PUBLISHED')
      .not('content', 'is', null)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error || !Array.isArray(data)) return FALLBACK_HOT_TAKES;

    const takes: LandingHotTake[] = data
      .filter((row: any) => typeof row.content === 'string' && row.content.trim().length > 20)
      .map((row: any) => {
        const author = Array.isArray(row.author) ? row.author[0] : row.author;
        const school = Array.isArray(row.school) ? row.school[0] : row.school;
        return {
          id: String(row.id),
          content: String(row.content),
          timeLabel: relativeTime(row.created_at),
          td: Number(row.touchdown_count ?? 0),
          fumble: Number(row.fumble_count ?? 0),
          author: {
            username: author?.username ?? 'anonymous',
            tier: author?.dynasty_tier ?? 'WALK_ON',
          },
          school: {
            abbr: school?.abbreviation ?? '',
            name: school?.name ?? '',
            slug: school?.slug ?? '',
            color: normalizeColor(school?.primary_color, '#8b1a1a'),
          },
        };
      });

    // One take per author so the rotation shows a variety of voices rather
    // than the same prolific user repeatedly.
    const seenAuthors = new Set<string>();
    const varied = takes.filter((t) => {
      const key = (t.author.username || '').toLowerCase();
      if (seenAuthors.has(key)) return false;
      seenAuthors.add(key);
      return true;
    }).slice(0, 12);

    return varied.length > 0 ? varied : FALLBACK_HOT_TAKES;
  } catch {
    return FALLBACK_HOT_TAKES;
  }
}

/* ── Portal moves (for ticker) ─────────────────────────────────── */

async function fetchPortalMoves(sb: ReturnType<typeof getAnonSupabase>) {
  try {
    const { data, error } = await sb
      .from('portal_players')
      .select('name, position, status, star_rating')
      .order('created_at', { ascending: false })
      .limit(3);
    if (error || !Array.isArray(data)) return [];
    return data as Array<{
      name: string;
      position: string;
      status: string | null;
      star_rating: number | null;
    }>;
  } catch {
    return [];
  }
}

/* ── Stats ─────────────────────────────────────────────────────── */

async function fetchStats(
  sb: ReturnType<typeof getAnonSupabase>,
  games: LandingGame[],
): Promise<LandingStats> {
  let schools = 653;
  let posts = 0;

  try {
    const { count } = await sb.from('schools').select('id', { count: 'exact', head: true });
    if (typeof count === 'number' && count > 0) schools = count;
  } catch {
    /* keep fallback */
  }

  try {
    const { count } = await sb
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PUBLISHED');
    if (typeof count === 'number') posts = count;
  } catch {
    /* keep 0 */
  }

  // Total games on this week's scoreboard — truthful whether any are live yet
  // or all are still upcoming (labelled "Games This Week" in the UI).
  const liveThreads = games.length;

  return { schools, posts, liveThreads };
}

/* ── Ticker assembly ───────────────────────────────────────────── */

function buildTicker(
  games: LandingGame[],
  hotTakes: LandingHotTake[],
  portal: Awaited<ReturnType<typeof fetchPortalMoves>>,
): LandingTickerItem[] {
  const items: LandingTickerItem[] = [];

  // 1-2 games
  for (const g of games.slice(0, 2)) {
    if (g.statusState === 'in') {
      items.push({
        tag: 'WAR ROOM',
        live: true,
        text: `${g.away.name || g.away.abbr} ${g.away.score} — ${
          g.home.name || g.home.abbr
        } ${g.home.score} · ${g.statusLabel}`,
      });
    } else if (g.statusState === 'pre') {
      items.push({
        tag: 'KICKOFF',
        text: `${g.away.name || g.away.abbr} vs ${g.home.name || g.home.abbr} · ${
          g.kickoffLabel
        }`,
      });
    } else {
      items.push({
        tag: 'FINAL',
        text: `${g.away.name || g.away.abbr} ${g.away.score} — ${
          g.home.name || g.home.abbr
        } ${g.home.score} · Final`,
      });
    }
  }

  // 1-2 hot takes
  for (const t of hotTakes.slice(0, 2)) {
    items.push({
      tag: 'TAKE',
      text: `"${truncate(t.content, 70)}" · ${t.td} TD`,
    });
  }

  // 1-2 portal moves
  for (const p of portal.slice(0, 2)) {
    const stars = p.star_rating ? `${p.star_rating}-star ` : '';
    const statusText =
      p.status === 'COMMITTED' ? 'commits' : 'enters the wire';
    items.push({
      tag: 'PORTAL',
      text: `${stars}${p.position} ${p.name} ${statusText}`,
    });
  }

  // Fill remaining with derived RIVALRY / RECEIPT items
  const top = hotTakes[0];
  if (top && top.school.name) {
    items.push({
      tag: 'RIVALRY',
      text: `${top.school.name} fans are filing takes · join the debate`,
    });
  }
  if (hotTakes.length > 2) {
    items.push({
      tag: 'RECEIPT',
      text: 'Predictions aging into receipts · kept forever',
    });
  }

  // Ensure at least a few items so the marquee never looks empty
  if (items.length === 0) {
    items.push(
      { tag: 'WAR ROOM', text: 'Live game threads every game day' },
      { tag: 'PORTAL', text: 'Transfer portal wire updates in real time' },
      { tag: 'TAKE', text: 'File your hottest college football takes' },
    );
  }

  return items.slice(0, 8);
}

/* ── Feature: Rivalry vote bar ─────────────────────────────────── */

async function fetchRivalry(
  sb: ReturnType<typeof getAnonSupabase>,
): Promise<LandingRivalry> {
  try {
    const { data, error } = await sb
      .from('rivalries')
      .select(`
        school_1_id,
        school_2_id,
        school_1_vote_count,
        school_2_vote_count,
        status,
        is_featured,
        starts_at,
        ends_at,
        created_at,
        school_1:school_1_id(name, abbreviation, primary_color),
        school_2:school_2_id(name, abbreviation, primary_color)
      `)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12);

    if (error || !Array.isArray(data) || data.length === 0) return FALLBACK_RIVALRY;

    // Prefer a rivalry whose voting is still OPEN (status ACTIVE or ends_at in
    // the future), then featured, then the one with the most votes — so the
    // card doesn't lead with a long-closed debate.
    const now = Date.now();
    const ranked = [...(data as any[])].sort((x, y) => {
      const openX = String(x.status ?? '').toUpperCase() === 'ACTIVE' || !x.ends_at || new Date(x.ends_at).getTime() > now;
      const openY = String(y.status ?? '').toUpperCase() === 'ACTIVE' || !y.ends_at || new Date(y.ends_at).getTime() > now;
      if (openX !== openY) return openX ? -1 : 1;
      if (!!x.is_featured !== !!y.is_featured) return x.is_featured ? -1 : 1;
      const totX = Number(x.school_1_vote_count ?? 0) + Number(x.school_2_vote_count ?? 0);
      const totY = Number(y.school_1_vote_count ?? 0) + Number(y.school_2_vote_count ?? 0);
      return totY - totX;
    });
    const chosen: any = ranked[0];

    const s1: any = Array.isArray(chosen.school_1) ? chosen.school_1[0] : chosen.school_1;
    const s2: any = Array.isArray(chosen.school_2) ? chosen.school_2[0] : chosen.school_2;
    if (!s1 || !s2) return FALLBACK_RIVALRY;

    const votesA = Number(chosen.school_1_vote_count ?? 0);
    const votesB = Number(chosen.school_2_vote_count ?? 0);
    const total = votesA + votesB;
    const pctA = total > 0 ? Math.round((votesA / total) * 100) : 50;
    const pctB = total > 0 ? 100 - pctA : 50;

    let footLabel: string;
    if (total > 0) {
      const judges = total.toLocaleString();
      const closing = chosen.ends_at ? closesLabel(String(chosen.ends_at)) : '';
      footLabel = `${judges} judges have ruled${closing ? ` · ${closing}` : ''}`;
    } else {
      footLabel = 'Be the first to vote in the Rivalry Ring';
    }

    return {
      a: {
        name: s1.name ?? '',
        abbr: s1.abbreviation ?? '',
        color: normalizeColor(s1.primary_color, '#bf5700'),
        votes: votesA,
      },
      b: {
        name: s2.name ?? '',
        abbr: s2.abbreviation ?? '',
        color: normalizeColor(s2.primary_color, '#841617'),
        votes: votesB,
      },
      pctA,
      pctB,
      totalVotes: total,
      footLabel,
    };
  } catch {
    return FALLBACK_RIVALRY;
  }
}

function closesLabel(endsIso: string): string {
  const end = new Date(endsIso).getTime();
  if (Number.isNaN(end)) return '';
  const diffMs = end - Date.now();
  if (diffMs <= 0) return 'voting closed';
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'closes in under 1h';
  if (hours < 24) return `closes in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `closes in ${days}d`;
}

/* ── Feature: Aging take ───────────────────────────────────────── */

async function fetchAgingTake(
  sb: ReturnType<typeof getAnonSupabase>,
): Promise<LandingAgingTake> {
  try {
    const { data, error } = await sb
      .from('aging_takes')
      .select(`
        post_id,
        revisit_date,
        is_surfaced,
        created_at,
        post:post_id(content, created_at)
      `)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return FALLBACK_AGING_TAKE;

    const post: any = Array.isArray(data.post) ? data.post[0] : data.post;
    const content =
      post && typeof post.content === 'string' && post.content.trim().length > 0
        ? truncate(post.content, 90)
        : FALLBACK_AGING_TAKE.content;

    const createdIso = String(data.created_at ?? post?.created_at ?? '');
    const createdMs = createdIso ? new Date(createdIso).getTime() : NaN;
    const revisitMs = data.revisit_date ? new Date(String(data.revisit_date)).getTime() : NaN;
    const now = Date.now();

    let daysLabel: string;
    let progressPct: number;

    if (!Number.isNaN(revisitMs) && revisitMs > now) {
      // Aging toward a future revisit date
      const daysUntil = Math.max(1, Math.round((revisitMs - now) / 86_400_000));
      daysLabel = `${daysUntil} days`;
      if (!Number.isNaN(createdMs) && revisitMs > createdMs) {
        const elapsed = now - createdMs;
        const window = revisitMs - createdMs;
        progressPct = Math.min(100, Math.max(0, Math.round((elapsed / window) * 100)));
      } else {
        progressPct = 25;
      }
    } else if (!Number.isNaN(createdMs)) {
      const daysSince = Math.max(1, Math.round((now - createdMs) / 86_400_000));
      daysLabel = `aging ${daysSince} days`;
      progressPct = Math.min(100, daysSince);
    } else {
      return FALLBACK_AGING_TAKE;
    }

    return { content, daysLabel, progressPct };
  } catch {
    return FALLBACK_AGING_TAKE;
  }
}

/* ── Feature: Portal player ────────────────────────────────────── */

async function fetchPortalPlayer(
  sb: ReturnType<typeof getAnonSupabase>,
): Promise<LandingPortalPlayer> {
  try {
    const { data, error } = await sb
      .from('portal_players')
      .select(`
        name,
        position,
        star_rating,
        height,
        class_year,
        status,
        total_claims,
        is_featured,
        entered_portal_at,
        previous_school:previous_school_id(name, abbreviation),
        committed_school:committed_school_id(name, abbreviation)
      `)
      .order('is_featured', { ascending: false })
      .order('entered_portal_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return FALLBACK_PORTAL_PLAYER;

    const prev: any = Array.isArray(data.previous_school)
      ? data.previous_school[0]
      : data.previous_school;
    const committed: any = Array.isArray(data.committed_school)
      ? data.committed_school[0]
      : data.committed_school;

    const parts: string[] = [];
    if (data.height) parts.push(String(data.height));
    if (data.class_year) parts.push(String(data.class_year));
    const offers = Number(data.total_claims ?? 0);
    if (offers > 0) parts.push(`${offers} offers`);
    const meta = parts.length > 0 ? parts.join(' · ') : 'Transfer portal entry';

    const statusRaw = String(data.status ?? '').toUpperCase();
    const statusLabel =
      statusRaw === 'COMMITTED'
        ? 'Committed'
        : statusRaw === 'WITHDRAWN'
          ? 'Withdrew'
          : 'In The Portal';

    const toLabel = committed?.abbreviation || committed?.name || 'Undecided';

    return {
      name: data.name ?? FALLBACK_PORTAL_PLAYER.name,
      position: data.position ?? '',
      starRating: Number(data.star_rating ?? 0),
      meta,
      fromAbbr: prev?.abbreviation || prev?.name || '',
      toLabel,
      statusLabel,
    };
  } catch {
    return FALLBACK_PORTAL_PLAYER;
  }
}

/* ── Feature: Mascot bracket ───────────────────────────────────── */

async function fetchMascotBracket(
  sb: ReturnType<typeof getAnonSupabase>,
): Promise<LandingMascotBracket> {
  try {
    const { data: bracket, error: bErr } = await sb
      .from('mascot_brackets')
      .select('id, status, created_at, champion_school_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bErr || !bracket) return FALLBACK_MASCOT_BRACKET;

    const { data: matchups, error: mErr } = await sb
      .from('mascot_matchups')
      .select(`
        round,
        position,
        school_1_votes,
        school_2_votes,
        winner_id,
        school_1_id,
        school_2_id,
        school_1:schools!mascot_matchups_school_1_id_fkey(abbreviation, mascot),
        school_2:schools!mascot_matchups_school_2_id_fkey(abbreviation, mascot)
      `)
      .eq('bracket_id', bracket.id)
      .order('round', { ascending: true })
      .order('position', { ascending: true })
      .limit(4);

    // The 2x2 SVG needs exactly two pairs (four team slots).
    if (mErr || !Array.isArray(matchups) || matchups.length < 2) {
      return FALLBACK_MASCOT_BRACKET;
    }

    // Use the short school abbreviation (e.g. PUR, CAL) — the bracket cells are
    // tiny, so full mascot names get ugly mid-word truncation.
    const label = (s: any): string => {
      const m = Array.isArray(s) ? s[0] : s;
      const raw = m?.abbreviation || m?.mascot || '';
      return String(raw).toUpperCase().slice(0, 5);
    };

    const pairs = matchups.map((row: any) => {
      const a = label(row.school_1);
      const b = label(row.school_2);
      let winner: 'a' | 'b' | null = null;
      if (row.winner_id && row.winner_id === row.school_1_id) winner = 'a';
      else if (row.winner_id && row.winner_id === row.school_2_id) winner = 'b';
      else if (Number(row.school_1_votes ?? 0) > Number(row.school_2_votes ?? 0)) winner = 'a';
      else if (Number(row.school_2_votes ?? 0) > Number(row.school_1_votes ?? 0)) winner = 'b';
      return { a: a || '—', b: b || '—', winner };
    });

    // Any pair missing both labels means the layout would break; fall back.
    if (pairs.some((p) => p.a === '—' && p.b === '—')) return FALLBACK_MASCOT_BRACKET;

    // Champ: from the winners of the first two pairs, whichever we can show.
    const semiWinners = pairs.slice(0, 2).map((p) => (p.winner === 'b' ? p.b : p.a));
    const champ = semiWinners[0] || FALLBACK_MASCOT_BRACKET.champ;

    return { pairs: pairs.slice(0, 4), champ };
  } catch {
    return FALLBACK_MASCOT_BRACKET;
  }
}

/* ── Feature: Game Room magazines (Newsstand covers) ───────────── */

async function fetchMagazines(
  sb: ReturnType<typeof getAnonSupabase>,
): Promise<LandingMagazine[]> {
  try {
    // Reuse the exact same query the Newsstand grid uses so the landing
    // cards render real published covers (id/title/issueNumber/coverUrl/
    // coverAccent/school/ownerUsername/pageCount).
    const { getPublicIssues } = await import('@cfb-social/api');
    const issues = await getPublicIssues(sb, { limit: 6 });
    if (!Array.isArray(issues) || issues.length === 0) return FALLBACK_MAGAZINES;

    return issues.map((m) => ({
      id: String(m.id),
      title: String(m.title ?? 'Game Room Weekly'),
      issueNumber: Number(m.issueNumber ?? 1),
      coverUrl: m.coverUrl ?? null,
      coverAccent: m.coverAccent ?? null,
      ownerUsername: m.ownerUsername ?? 'coach',
      school: m.school ?? null,
      pageCount: Number(m.pageCount ?? 0),
    }));
  } catch {
    return FALLBACK_MAGAZINES;
  }
}

/* ── Feature: Recruiting heat map ──────────────────────────────── */

async function fetchRecruitingHeat(
  sb: ReturnType<typeof getAnonSupabase>,
): Promise<LandingHeatEntry[]> {
  try {
    const { data, error } = await sb
      .from('portal_players')
      .select(`
        previous_school:previous_school_id(abbreviation),
        committed_school:committed_school_id(abbreviation)
      `)
      .order('entered_portal_at', { ascending: false })
      .limit(400);

    if (error || !Array.isArray(data) || data.length === 0) return FALLBACK_HEAT;

    const tally = new Map<string, number>();
    for (const row of data as any[]) {
      const prev = Array.isArray(row.previous_school)
        ? row.previous_school[0]
        : row.previous_school;
      const committed = Array.isArray(row.committed_school)
        ? row.committed_school[0]
        : row.committed_school;
      for (const s of [prev, committed]) {
        const abbr = s?.abbreviation ? String(s.abbreviation) : '';
        if (!abbr) continue;
        tally.set(abbr, (tally.get(abbr) ?? 0) + 1);
      }
    }

    const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (sorted.length < 4) return FALLBACK_HEAT;

    const max = sorted[0]![1] || 1;
    return sorted.map(([abbr, count]) => ({
      abbr,
      widthPct: Math.max(20, Math.round((count / max) * 100)),
    }));
  } catch {
    return FALLBACK_HEAT;
  }
}

/* ── Feature: Dynasty leader ───────────────────────────────────── */

const TIER_LABELS: Record<string, string> = {
  WALK_ON: 'Walk-On',
  STARTER: 'Starter',
  ALL_CONFERENCE: 'All-Conference',
  ALL_AMERICAN: 'All-American',
  HEISMAN: 'Heisman',
  HALL_OF_FAME: 'Hall of Fame',
};

function levelForXP(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]!) level = i + 1;
    else break;
  }
  return level;
}

async function fetchDynastyLeader(
  sb: ReturnType<typeof getAnonSupabase>,
): Promise<LandingDynastyLeader> {
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('username, xp, level, dynasty_tier')
      .order('xp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return FALLBACK_DYNASTY_LEADER;

    const xp = Number(data.xp ?? 0);
    const level = Number(data.level ?? 0) > 0 ? Number(data.level) : levelForXP(xp);
    const tierKey = data.dynasty_tier
      ? String(data.dynasty_tier).toUpperCase()
      : getTierForLevel(level);
    const tierLabel = TIER_LABELS[tierKey] ?? 'Walk-On';

    const toNext = getXPToNextLevel(xp, level);
    const nextThreshold = toNext > 0 ? xp + toNext : xp;
    const progressPct = getLevelProgress(xp, level);

    return { tierLabel, level, xp, nextThreshold, progressPct };
  } catch {
    return FALLBACK_DYNASTY_LEADER;
  }
}

/* ── Feature: School hubs ──────────────────────────────────────── */

async function fetchSchoolHubs(
  sb: ReturnType<typeof getAnonSupabase>,
): Promise<LandingSchoolHubs> {
  try {
    const [{ count }, { data, error }] = await Promise.all([
      sb.from('schools').select('id', { count: 'exact', head: true }).eq('is_active', true),
      sb
        .from('schools')
        .select('name, slug')
        .eq('is_active', true)
        .eq('is_fbs', true)
        .limit(5),
    ]);

    if (error || !Array.isArray(data) || data.length === 0) return FALLBACK_SCHOOL_HUBS;

    const schools = data
      .filter((s: any) => s?.name && s?.slug)
      .map((s: any) => ({ name: String(s.name), slug: String(s.slug) }));
    if (schools.length === 0) return FALLBACK_SCHOOL_HUBS;

    const total = typeof count === 'number' && count > 0 ? count : schools.length;
    const moreCount = Math.max(0, total - schools.length);

    return { schools, moreCount };
  } catch {
    return FALLBACK_SCHOOL_HUBS;
  }
}

/* ── Main entry ────────────────────────────────────────────────── */

export async function getLandingData(): Promise<LandingData> {
  const sb = getAnonSupabase();

  const [
    games,
    hotTakes,
    portal,
    rivalry,
    agingTake,
    portalPlayer,
    mascotBracket,
    magazines,
    recruitingHeat,
    dynastyLeader,
    schoolHubs,
  ] = await Promise.all([
    fetchGames(),
    fetchHotTakes(sb),
    fetchPortalMoves(sb),
    fetchRivalry(sb),
    fetchAgingTake(sb),
    fetchPortalPlayer(sb),
    fetchMascotBracket(sb),
    fetchMagazines(sb),
    fetchRecruitingHeat(sb),
    fetchDynastyLeader(sb),
    fetchSchoolHubs(sb),
  ]);

  const stats = await fetchStats(sb, games);
  const ticker = buildTicker(games, hotTakes, portal);

  // Feature-card "Feed take": pick the hottest take by touchdown count, else first.
  const featureTake =
    hotTakes.length > 0
      ? [...hotTakes].sort((a, b) => b.td - a.td)[0]!
      : FALLBACK_HOT_TAKES[0]!;

  // Feature-card "War Room" game: first LIVE game, else first available.
  const featureGame =
    games.find((g) => g.statusState === 'in') ?? games[0] ?? null;

  return {
    games,
    hotTakes,
    stats,
    ticker,
    featureTake,
    featureGame,
    rivalry,
    agingTake,
    portalPlayer,
    mascotBracket,
    magazines,
    recruitingHeat,
    dynastyLeader,
    schoolHubs,
  };
}
