import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { getGames } from '@/lib/providers/cfbd';
import { createAdminClient } from '@/lib/admin/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

// POST { years?: number[] } — backfill game_results from CFBD /games.
// Requires CFBD_API_KEY and available quota. Idempotent (upsert on cfbd_id).
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  let body: { years?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const now = new Date().getFullYear();
  const years = Array.isArray(body.years) && body.years.length
    ? (body.years as unknown[]).map((y) => Number(y)).filter((y) => y >= 1900 && y <= now).slice(0, 10)
    : [now];

  const admin = createAdminClient();
  let upserted = 0;
  const errors: string[] = [];

  for (const year of years) {
    const games = await getGames(year);
    if (!games.length) {
      errors.push(`No games returned for ${year} (CFBD key missing, empty, or quota exceeded).`);
      continue;
    }
    const rows = games.map((g) => ({
      cfbd_id: g.id,
      season: g.season,
      week: g.week ?? null,
      season_type: g.seasonType ?? null,
      home_team: g.homeTeam,
      away_team: g.awayTeam,
      home_points: g.homePoints ?? null,
      away_points: g.awayPoints ?? null,
      winner:
        g.homePoints != null && g.awayPoints != null
          ? g.homePoints > g.awayPoints
            ? g.homeTeam
            : g.awayPoints > g.homePoints
              ? g.awayTeam
              : null
          : null,
      neutral_site: !!g.neutralSite,
      game_date: g.startDate ?? null,
    }));

    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await admin.from('game_results').upsert(chunk, { onConflict: 'cfbd_id' });
      if (error) errors.push(`${year}: ${error.message}`);
      else upserted += chunk.length;
    }
  }

  return NextResponse.json({ ok: errors.length === 0, upserted, years, errors });
}
