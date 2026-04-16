// ============================================================
// CollegeFootballData provider
// Free w/ account at https://collegefootballdata.com
// Bearer token auth: Authorization: Bearer <CFBD_API_KEY>
//
// Responds with null / [] when key is not configured —
// callers fall back to existing data sources.
// ============================================================

import { getJson } from './http';
import { cached } from './cache';

const BASE = 'https://api.collegefootballdata.com';

function authHeaders(): Record<string, string> | null {
  const key = process.env.CFBD_API_KEY;
  if (!key) return null;
  return { Authorization: `Bearer ${key}`, Accept: 'application/json' };
}

// ============================================================
// Types (only fields we actually use)
// ============================================================

export interface CfbdTeam {
  id: number;
  school: string;
  mascot?: string;
  abbreviation?: string;
  conference?: string;
  classification?: string;
  color?: string;
  alt_color?: string;
  logos?: string[];
}

export interface CfbdRosterPlayer {
  id: number;
  first_name?: string;
  last_name?: string;
  position?: string;
  jersey?: number;
  year?: number;
  height?: number;
  weight?: number;
  home_city?: string;
  home_state?: string;
}

export interface CfbdRecruitingRank {
  year: number;
  rank: number;
  team: string;
  points: number;
}

export interface CfbdSpPlus {
  year: number;
  team: string;
  conference?: string;
  rating: number;
  ranking?: number;
  offense?: { rating: number; ranking: number };
  defense?: { rating: number; ranking: number };
}

export interface CfbdBettingLine {
  homeTeam: string;
  awayTeam: string;
  lines?: Array<{
    provider: string;
    spread?: string;
    formattedSpread?: string;
    overUnder?: string;
  }>;
}

// ============================================================
// API wrappers
// ============================================================

export async function getTeams(year?: number): Promise<CfbdTeam[]> {
  const h = authHeaders();
  if (!h) return [];
  const url = year ? `${BASE}/teams/fbs?year=${year}` : `${BASE}/teams/fbs`;
  const data = await cached(`cfbd:teams:${year ?? 'current'}`, 24 * 60 * 60_000, () =>
    getJson<CfbdTeam[]>(url, { headers: h, timeoutMs: 8000 }),
  );
  return data ?? [];
}

export async function getRoster(team: string, year?: number): Promise<CfbdRosterPlayer[]> {
  const h = authHeaders();
  if (!h) return [];
  const qs = new URLSearchParams({ team });
  if (year) qs.set('year', String(year));
  const data = await cached(`cfbd:roster:${team}:${year ?? 'current'}`, 6 * 60 * 60_000, () =>
    getJson<CfbdRosterPlayer[]>(`${BASE}/roster?${qs.toString()}`, { headers: h, timeoutMs: 8000 }),
  );
  return data ?? [];
}

export async function getRecruitingRanks(year: number): Promise<CfbdRecruitingRank[]> {
  const h = authHeaders();
  if (!h) return [];
  const data = await cached(`cfbd:recruiting:${year}`, 24 * 60 * 60_000, () =>
    getJson<CfbdRecruitingRank[]>(`${BASE}/recruiting/teams?year=${year}`, { headers: h, timeoutMs: 8000 }),
  );
  return data ?? [];
}

export async function getSpPlus(year: number): Promise<CfbdSpPlus[]> {
  const h = authHeaders();
  if (!h) return [];
  const data = await cached(`cfbd:sp:${year}`, 24 * 60 * 60_000, () =>
    getJson<CfbdSpPlus[]>(`${BASE}/ratings/sp?year=${year}`, { headers: h, timeoutMs: 8000 }),
  );
  return data ?? [];
}

export async function getBettingLines(year: number, week?: number): Promise<CfbdBettingLine[]> {
  const h = authHeaders();
  if (!h) return [];
  const qs = new URLSearchParams({ year: String(year) });
  if (week) qs.set('week', String(week));
  const data = await cached(`cfbd:lines:${year}:${week ?? 'all'}`, 60 * 60_000, () =>
    getJson<CfbdBettingLine[]>(`${BASE}/lines?${qs.toString()}`, { headers: h, timeoutMs: 8000 }),
  );
  return data ?? [];
}

/**
 * Get a quick 1-line summary for a team: SP+ rank + recruiting class rank.
 * Returns null when CFBD key is missing or data unavailable.
 */
export async function getTeamHighlights(teamName: string, year?: number): Promise<string | null> {
  const y = year ?? new Date().getFullYear();
  // Fetch current cycle; fall back one year when empty (early in the year before data is published).
  let [sp, recruits] = await Promise.all([getSpPlus(y), getRecruitingRanks(y)]);
  let effectiveYear = y;
  if (sp.length === 0 && recruits.length === 0) {
    [sp, recruits] = await Promise.all([getSpPlus(y - 1), getRecruitingRanks(y - 1)]);
    effectiveYear = y - 1;
  }
  const spEntry = sp.find((s) => s.team.toLowerCase() === teamName.toLowerCase());
  const recruitEntry = recruits.find((r) => r.team.toLowerCase() === teamName.toLowerCase());
  const parts: string[] = [];
  if (spEntry?.ranking) parts.push(`SP+ #${spEntry.ranking}`);
  if (recruitEntry?.rank) parts.push(`${effectiveYear} recruiting class #${recruitEntry.rank}`);
  return parts.length > 0 ? parts.join(' | ') : null;
}
