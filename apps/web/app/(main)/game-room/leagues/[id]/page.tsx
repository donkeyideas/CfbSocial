import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd, VideoGameJsonLd, JsonLd } from '@/components/seo/JsonLd';
import { GameRoomCta } from '@/components/game-room/GameRoomCta';
import { GAME } from '@/lib/constants/game';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

interface PageProps { params: Promise<{ id: string }> }

interface League {
  id: string; name: string; platform: string; max_users: number; filled_count: number;
  sim_schedule: string | null; style: string; open_schools: string | null; status: string;
  is_private: boolean; cross_play: boolean; rules: string | null; join_code: string | null;
  commissioner: { username: string; display_name: string | null } | null;
}

async function load(id: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const { getLeagueById } = await import('@cfb-social/api');
  const supabase = await createClient();
  return (await getLeagueById(supabase, id).catch(() => null)) as League | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const lg = await load(id);
  if (!lg) return { title: 'League not found | CFB Social' };
  const styleLabel = lg.style === 'CASUAL' ? 'casual' : 'competitive';
  const open = Math.max(0, lg.max_users - lg.filled_count);
  const title = `${lg.name} — ${GAME.name} Online Dynasty (${lg.platform}) | CFB Social`;
  const desc = `Join ${lg.name}, a ${styleLabel} ${lg.platform} ${GAME.name} online dynasty${lg.cross_play ? ' with cross-play' : ''}. ${open > 0 ? `${open} of ${lg.max_users} spots open.` : 'Currently full.'}${lg.open_schools ? ` Open schools: ${lg.open_schools}.` : ''}${lg.sim_schedule ? ` Sims ${lg.sim_schedule}.` : ''}`;
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, type: 'website', images: [{ url: 'https://www.cfbsocial.com/logo.png' }] },
    twitter: { card: 'summary', title, description: desc },
    alternates: { canonical: `https://www.cfbsocial.com/game-room/leagues/${id}` },
  };
}

export default async function LeaguePage({ params }: PageProps) {
  const { id } = await params;
  const lg = await load(id);
  if (!lg) notFound();

  const styleLabel = lg.style === 'CASUAL' ? 'Casual' : 'Competitive';
  const open = Math.max(0, lg.max_users - lg.filled_count);
  const full = lg.status === 'FULL' || lg.filled_count >= lg.max_users;
  const pct = Math.min(100, Math.round((lg.filled_count / Math.max(1, lg.max_users)) * 100));

  const rows: Array<[string, string]> = [
    ['Platform', lg.platform],
    ['Cross-play', lg.cross_play ? 'On' : 'Off'],
    ['Style', styleLabel],
    ['League size', `${lg.max_users} users`],
    ['Spots open', full ? 'Full' : `${open} of ${lg.max_users}`],
    ...(lg.sim_schedule ? [['Sim schedule', lg.sim_schedule] as [string, string]] : []),
    ...(lg.open_schools ? [['Open schools', lg.open_schools] as [string, string]] : []),
    ...(lg.is_private ? [['Visibility', 'Private — request to join'] as [string, string]] : []),
  ];

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: 'CFB Social', url: 'https://www.cfbsocial.com' },
          { name: 'Game Room', url: 'https://www.cfbsocial.com/game-room' },
          { name: 'Leagues', url: 'https://www.cfbsocial.com/game-room/leagues' },
          { name: lg.name, url: `https://www.cfbsocial.com/game-room/leagues/${id}` },
        ]}
      />
      <VideoGameJsonLd url={`https://www.cfbsocial.com/game-room/leagues/${id}`} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${lg.name} — ${GAME.name} Online Dynasty`,
          url: `https://www.cfbsocial.com/game-room/leagues/${id}`,
          about: { '@type': 'VideoGame', name: GAME.full, alternateName: [GAME.name, GAME.abbr] },
          isPartOf: { '@type': 'WebSite', name: 'CFB Social', url: 'https://www.cfbsocial.com' },
        }}
      />

      <div style={{ marginBottom: 14 }}>
        <Link href="/game-room/leagues" style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'var(--faded-ink)', textDecoration: 'none' }}>&larr; All leagues</Link>
      </div>

      <div className="feed-header">
        <h1 className="feed-title">{lg.name}</h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--faded-ink)', textAlign: 'center', marginTop: 4 }}>
          {GAME.name} Online Dynasty · {lg.platform} · {styleLabel}
        </p>
      </div>

      <section className="content-card" style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', lineHeight: 1.6 }}>
          <strong>{lg.name}</strong> is a {styleLabel.toLowerCase()} <strong>{lg.platform}</strong> {GAME.full} online dynasty
          {lg.cross_play ? ' with cross-play enabled' : ''}. {full ? 'It is currently full.' : `There ${open === 1 ? 'is' : 'are'} ${open} open ${open === 1 ? 'spot' : 'spots'} of ${lg.max_users}.`}
          {lg.commissioner?.username ? <> Commissioner: <Link href={`/profile/${lg.commissioner.username}`}>@{lg.commissioner.username}</Link>.</> : null}
        </p>
        {lg.rules && <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--faded-ink)', marginTop: 8 }}>{lg.rules}</p>}

        <div className="gr-lf-bar" style={{ marginTop: 12 }}><div className="gr-lf-fill" style={{ width: `${pct}%` }} /></div>
        <div className="gr-lf-slots">{lg.filled_count} / {lg.max_users} filled</div>

        <table style={{ width: '100%', marginTop: 14, borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} style={{ borderTop: '1px solid rgba(59,47,30,0.1)' }}>
                <th style={{ textAlign: 'left', fontFamily: 'var(--mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--faded-ink)', padding: '8px 0', width: 140 }}>{k}</th>
                <td style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', padding: '8px 0' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.74rem', color: 'var(--faded-ink)', marginTop: 12 }}>
          Open the Game Room to copy the in-game League Name + password{lg.is_private ? ' (request to join private leagues)' : ''}.
        </p>
      </section>

      <GameRoomCta
        intent="join"
        leagueName={lg.name}
        redirect="/game-room?tab=leagues"
        stats={[full ? 'Full' : `${open} ${open === 1 ? 'spot' : 'spots'} open`, lg.platform, styleLabel]}
      />

      <p style={{ fontFamily: 'var(--sans)', fontSize: '0.74rem', color: 'var(--faded-ink)', textAlign: 'center' }}>
        Not affiliated with or endorsed by EA Sports. <Link href="/game-room/leagues">Browse more {GAME.abbr} leagues →</Link>
      </p>
    </div>
  );
}
