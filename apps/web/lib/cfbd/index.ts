/**
 * CollegeFootballData (CFBD) fetch helpers.
 *
 * CFBD's free tier allows 1,000 calls/month. We do NOT call it from page
 * requests — a daily Vercel cron (/api/cron/cfbd) calls these helpers once a
 * day and stores the result in the `cfbd_cache` table, which the sidebar reads.
 * That caps usage at ~2 calls/day and never exhausts the quota.
 */

const CFBD_BASE = 'https://api.collegefootballdata.com';

export interface CFBDRecruit {
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

export interface CFBDTransfer {
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

export class CFBDQuotaError extends Error {
  constructor() {
    super('CFBD monthly call quota exceeded');
    this.name = 'CFBDQuotaError';
  }
}

/** Raw CFBD GET. Throws CFBDQuotaError on 429 so callers can preserve old data. */
async function fetchCFBD(path: string): Promise<unknown[]> {
  const apiKey = process.env.CFBD_API_KEY;
  if (!apiKey) {
    console.error('CFBD: CFBD_API_KEY is not set');
    return [];
  }

  const res = await fetch(`${CFBD_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    cache: 'no-store',
  });

  if (res.status === 429) throw new CFBDQuotaError();
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`CFBD API error: ${res.status} ${res.statusText} for ${path} — ${body}`);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function trimRecruits(raw: unknown[]): CFBDRecruit[] {
  return (raw as CFBDRecruit[])
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

function trimTransfers(raw: unknown[]): CFBDTransfer[] {
  return (raw as CFBDTransfer[])
    .sort((a, b) => new Date(b.transferDate || 0).getTime() - new Date(a.transferDate || 0).getTime())
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

// Below this count we blend in the previous year so off-season widgets aren't
// near-empty (e.g. mid-2026 querying the barely-populated 2027 class).
const SPARSE_THRESHOLD = 5;

/** Recruiting class year: classes sign in Feb, so Mar–Dec target next year. */
export function recruitingYear(now = new Date()): number {
  return now.getMonth() >= 2 ? now.getFullYear() + 1 : now.getFullYear();
}

export async function getRecruiting(year = recruitingYear()): Promise<CFBDRecruit[]> {
  let data = trimRecruits(await fetchCFBD(`/recruiting/players?year=${year}`));
  if (data.length < SPARSE_THRESHOLD) {
    const prev = trimRecruits(await fetchCFBD(`/recruiting/players?year=${year - 1}`));
    data = [...data, ...prev].slice(0, 10);
  }
  return data;
}

export async function getPortal(year = new Date().getFullYear()): Promise<CFBDTransfer[]> {
  let data = trimTransfers(await fetchCFBD(`/player/portal?year=${year}`));
  if (data.length < SPARSE_THRESHOLD) {
    const prev = trimTransfers(await fetchCFBD(`/player/portal?year=${year - 1}`));
    data = [...data, ...prev].slice(0, 10);
  }
  return data;
}
