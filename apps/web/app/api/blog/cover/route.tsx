import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// 1200x630 branded cover image for a blog post.
//   Matchup:   /api/blog/cover?home={slug}&away={slug}&title=...
//   Editorial: /api/blog/cover?kicker=Weekly+Recap&title=...
// Colours for matchup covers are looked up from the schools table.

const PAPER = '#f4efe3';
const INK = '#1a1712';
const CRIMSON = '#8b1a1a';
const GOLD = '#b8892b';

function norm(hex: string | null | undefined, fallback: string): string {
  if (!hex) return fallback;
  const t = String(hex).trim();
  if (!t) return fallback;
  return t.startsWith('#') ? t : `#${t}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') || 'College Football').slice(0, 120);
  const homeSlug = searchParams.get('home');
  const awaySlug = searchParams.get('away');
  const kicker = (searchParams.get('kicker') || 'The Wire').toUpperCase().slice(0, 40);

  let homeName = '';
  let awayName = '';
  let homeColor = CRIMSON;
  let awayColor = INK;

  if (homeSlug && awaySlug) {
    try {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await sb
        .from('schools')
        .select('slug, short_name, name, abbreviation, primary_color')
        .in('slug', [homeSlug, awaySlug]);
      const rows = data ?? [];
      const home = rows.find((r) => r.slug === homeSlug);
      const away = rows.find((r) => r.slug === awaySlug);
      homeName = String(home?.abbreviation || home?.short_name || home?.name || '').toUpperCase();
      awayName = String(away?.abbreviation || away?.short_name || away?.name || '').toUpperCase();
      homeColor = norm(home?.primary_color as string, CRIMSON);
      awayColor = norm(away?.primary_color as string, INK);
    } catch {
      /* fall back to defaults */
    }
  }

  const isMatchup = !!(homeSlug && awaySlug);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: PAPER,
          position: 'relative',
          fontFamily: 'Georgia, serif',
        }}
      >
        {isMatchup ? (
          <div style={{ display: 'flex', height: '250px', width: '100%' }}>
            <div style={{ display: 'flex', flex: 1, background: awayColor, alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 72, fontWeight: 900, letterSpacing: 2 }}>{awayName}</span>
            </div>
            <div style={{ display: 'flex', width: '110px', background: PAPER, alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: CRIMSON, fontSize: 40, fontWeight: 900 }}>VS</span>
            </div>
            <div style={{ display: 'flex', flex: 1, background: homeColor, alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 72, fontWeight: 900, letterSpacing: 2 }}>{homeName}</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', height: '14px', width: '100%', background: CRIMSON }} />
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '46px 64px',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: CRIMSON, fontSize: 24, fontWeight: 700, letterSpacing: 6, marginBottom: 18 }}>
            {(isMatchup ? 'MATCHUP PREVIEW' : kicker)}
          </span>
          <span style={{ color: INK, fontSize: 60, fontWeight: 900, lineHeight: 1.05, letterSpacing: -1 }}>{title}</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 64px 40px',
          }}
        >
          <span style={{ color: INK, fontSize: 30, fontWeight: 900, letterSpacing: 1 }}>
            <span style={{ color: CRIMSON }}>CFB</span> SOCIAL
          </span>
          <span style={{ color: GOLD, fontSize: 18, fontWeight: 700, letterSpacing: 3 }}>THE WIRE</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
