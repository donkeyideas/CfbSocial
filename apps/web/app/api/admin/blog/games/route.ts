import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin/auth-guard';
import { getWeekScoreboard } from '@/lib/providers/espn';

export const runtime = 'nodejs';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [events, schoolsRes] = await Promise.all([
    getWeekScoreboard(),
    sb
      .from('schools')
      .select('slug, name, short_name, abbreviation, is_fbs')
      .eq('is_active', true)
      .order('name'),
  ]);

  const rows = schoolsRes.data ?? [];
  const schools = rows.map((s) => ({ slug: String(s.slug), name: String(s.name), abbr: String(s.abbreviation ?? '') }));

  // Multi-key index: match ESPN teams by abbreviation, then by normalized
  // location / short name / full name (ESPN abbreviations often differ from ours).
  type S = { slug: string; name: string; abbr: string };
  const byAbbr = new Map<string, S>();
  const byName = new Map<string, S>();
  for (const s of rows) {
    const entry: S = { slug: String(s.slug), name: String(s.name), abbr: String(s.abbreviation ?? '') };
    if (s.abbreviation) byAbbr.set(String(s.abbreviation).toUpperCase(), entry);
    if (s.name) byName.set(norm(String(s.name)), entry);
    if (s.short_name) byName.set(norm(String(s.short_name)), entry);
  }

  function matchTeam(team: { abbreviation?: string; displayName?: string; location?: string }): S | undefined {
    const abbr = (team.abbreviation || '').toUpperCase();
    if (abbr && byAbbr.has(abbr)) return byAbbr.get(abbr);
    const loc = norm(team.location || '');
    if (loc && byName.has(loc)) return byName.get(loc);
    const dn = norm(team.displayName || '');
    if (dn && byName.has(dn)) return byName.get(dn);
    return undefined;
  }

  const games: Array<{
    espnGameId: string;
    date: string | null;
    name: string;
    home: S;
    away: S;
  }> = [];

  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) continue;
    const hs = matchTeam(home.team);
    const as = matchTeam(away.team);
    if (!hs || !as) continue; // only games where BOTH teams map to our schools
    games.push({
      espnGameId: ev.id,
      date: ev.date ?? null,
      name: ev.shortName || ev.name || `${away.team.displayName} at ${home.team.displayName}`,
      home: hs,
      away: as,
    });
  }

  return NextResponse.json({ games, schools });
}
