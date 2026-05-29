import { NextRequest, NextResponse } from 'next/server';

/* ── Rate Limiting ─────────────────────────────────────────────── */

const MONTHLY_LIMIT = 950; // hard stop (50-call buffer under 1,000)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  data: unknown[];
  fetchedAt: number;
}

interface MonthlyCounter {
  month: string; // "YYYY-MM"
  count: number;
}

const cache = new Map<string, CacheEntry>();
const counter: MonthlyCounter = {
  month: new Date().toISOString().slice(0, 7),
  count: 0,
};

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function getCallsRemaining(): number {
  const now = getCurrentMonth();
  if (counter.month !== now) {
    counter.month = now;
    counter.count = 0;
  }
  return MONTHLY_LIMIT - counter.count;
}

function incrementCounter(): void {
  const now = getCurrentMonth();
  if (counter.month !== now) {
    counter.month = now;
    counter.count = 0;
  }
  counter.count++;
}

function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry;
}

/* ── CFBD API Fetch ────────────────────────────────────────────── */

const CFBD_BASE = 'https://api.collegefootballdata.com';

interface RecruitRaw {
  ranking?: number;
  name?: string;
  committedTo?: string | null;
  position?: string;
  stars?: number;
  rating?: number;
  city?: string;
  stateProvince?: string;
  year?: number;
}

interface TransferRaw {
  firstName?: string;
  lastName?: string;
  position?: string;
  origin?: string;
  destination?: string | null;
  transferDate?: string;
  stars?: number;
  rating?: number;
  eligibility?: string;
}

async function fetchCFBD(path: string): Promise<unknown[]> {
  const apiKey = process.env.CFBD_API_KEY;
  if (!apiKey) {
    console.error('CFBD: CFBD_API_KEY is not set');
    return [];
  }

  const url = `${CFBD_BASE}${path}`;
  console.log(`CFBD: fetching ${url}`);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`CFBD API error: ${res.status} ${res.statusText} for ${path} — ${body}`);
    return [];
  }

  const data = await res.json();
  console.log(`CFBD: got ${Array.isArray(data) ? data.length : 0} results for ${path}`);
  return Array.isArray(data) ? data : [];
}

/* ── Trim helpers — send only the fields the sidebar needs ──── */

function trimRecruits(raw: unknown[]): RecruitRaw[] {
  return (raw as RecruitRaw[])
    .filter((r) => r.committedTo)
    .sort((a, b) => (a.ranking || 9999) - (b.ranking || 9999))
    .slice(0, 10)
    .map((r) => ({
      ranking: r.ranking,
      name: r.name,
      committedTo: r.committedTo,
      position: r.position,
      stars: r.stars,
      rating: r.rating,
      city: r.city,
      stateProvince: r.stateProvince,
      year: r.year,
    }));
}

function trimTransfers(raw: unknown[]): TransferRaw[] {
  return (raw as TransferRaw[])
    .sort((a, b) =>
      new Date(b.transferDate || 0).getTime() - new Date(a.transferDate || 0).getTime(),
    )
    .slice(0, 10)
    .map((t) => ({
      firstName: t.firstName,
      lastName: t.lastName,
      position: t.position,
      origin: t.origin,
      destination: t.destination,
      transferDate: t.transferDate,
      stars: t.stars,
      rating: t.rating,
      eligibility: t.eligibility,
    }));
}

/* ── Route Handler ─────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  // Recruiting calendar: classes sign in Feb, so Mar-Dec = next year's class
  // Transfer portal uses current year since transfers happen year-round
  const now = new Date();
  const recruitingYear = now.getMonth() >= 2
    ? String(now.getFullYear() + 1)
    : String(now.getFullYear());
  const portalYear = String(now.getFullYear());
  const year = searchParams.get('year')
    || process.env.CFBD_YEAR
    || (type === 'recruiting' ? recruitingYear : portalYear);

  if (!type || !['recruiting', 'portal'].includes(type)) {
    return NextResponse.json(
      { error: 'Missing or invalid type param. Use ?type=recruiting or ?type=portal' },
      { status: 400 },
    );
  }

  const cacheKey = `${type}-${year}`;

  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
  };

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({
      data: cached.data,
      cached: true,
      callsRemaining: getCallsRemaining(),
    }, { headers: cacheHeaders });
  }

  // Check rate limit
  if (getCallsRemaining() <= 0) {
    // Return stale cache if available, otherwise empty
    const stale = cache.get(cacheKey);
    return NextResponse.json({
      data: stale?.data || [],
      cached: true,
      callsRemaining: 0,
      rateLimited: true,
    });
  }

  // SPARSE_THRESHOLD: below this we backfill from the previous year so off-season
  // widgets aren't near-empty (e.g. May 2026 querying the 2027 class).
  const SPARSE_THRESHOLD = 5;
  const pathFor = (y: string) => type === 'recruiting'
    ? `/recruiting/players?year=${y}`
    : `/player/portal?year=${y}`;

  const rawData = await fetchCFBD(pathFor(year));
  incrementCounter();

  let data = type === 'recruiting' ? trimRecruits(rawData) : trimTransfers(rawData);

  // Year fallback — primary year is sparse, blend in the previous year so users
  // see a populated list during off-season (a sparse upstream is the cause of the
  // "isn't updating daily" perception when the source legitimately has no new data).
  if (data.length < SPARSE_THRESHOLD && getCallsRemaining() > 0) {
    const prevYear = String(Number(year) - 1);
    const prevCacheKey = `${type}-${prevYear}`;
    const prevCached = getCached(prevCacheKey);
    let prevTrimmed: typeof data;
    if (prevCached) {
      prevTrimmed = prevCached.data as typeof data;
    } else {
      const prevRaw = await fetchCFBD(pathFor(prevYear));
      incrementCounter();
      prevTrimmed = type === 'recruiting' ? trimRecruits(prevRaw) : trimTransfers(prevRaw);
      if (prevTrimmed.length > 0) {
        cache.set(prevCacheKey, { data: prevTrimmed, fetchedAt: Date.now() });
      }
    }
    data = [...data, ...prevTrimmed].slice(0, 10);
  }

  // Only cache non-empty results — don't let a transient failure lock us out
  if (data.length > 0) {
    cache.set(cacheKey, { data, fetchedAt: Date.now() });
  }

  return NextResponse.json({
    data,
    cached: false,
    callsRemaining: getCallsRemaining(),
  }, { headers: cacheHeaders });
}
