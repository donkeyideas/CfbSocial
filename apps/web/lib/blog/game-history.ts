// ============================================================
// All-time head-to-head computed from our own game_results table
// (backfilled from CFBD). Lets the blog generator get series history
// without calling CFBD on every generation. Same shape as CfbdMatchup
// so the context builder can use it as a drop-in.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { CfbdMatchup } from '@/lib/providers/cfbd';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

interface ResultRow {
  season: number;
  home_team: string;
  away_team: string;
  home_points: number | null;
  away_points: number | null;
  winner: string | null;
}

export async function getSeriesFromResults(team1: string, team2: string): Promise<CfbdMatchup | null> {
  try {
    const t1 = team1.replace(/"/g, '');
    const { data, error } = await sb()
      .from('game_results')
      .select('season, home_team, away_team, home_points, away_points, winner')
      .or(`home_team.eq."${t1}",away_team.eq."${t1}"`)
      .order('season', { ascending: true })
      .limit(1000);
    if (error || !data) return null;

    const rows = (data as ResultRow[]).filter(
      (g) => g.home_team === team2 || g.away_team === team2,
    );
    if (rows.length === 0) return null;

    let team1Wins = 0;
    let team2Wins = 0;
    let ties = 0;
    for (const g of rows) {
      const hp = g.home_points;
      const ap = g.away_points;
      let winTeam: string | null = g.winner ?? null;
      if (!winTeam && hp != null && ap != null) {
        if (hp > ap) winTeam = g.home_team;
        else if (ap > hp) winTeam = g.away_team;
      }
      if (!winTeam) ties++;
      else if (winTeam === team1) team1Wins++;
      else if (winTeam === team2) team2Wins++;
      else ties++;
    }

    return {
      team1,
      team2,
      team1Wins,
      team2Wins,
      ties,
      startYear: rows[0]?.season,
      endYear: rows[rows.length - 1]?.season,
      games: rows.map((g) => ({
        season: g.season,
        homeTeam: g.home_team,
        homeScore: g.home_points,
        awayTeam: g.away_team,
        awayScore: g.away_points,
        winner: g.winner,
      })),
    };
  } catch {
    return null;
  }
}
