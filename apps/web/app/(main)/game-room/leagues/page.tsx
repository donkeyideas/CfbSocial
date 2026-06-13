import Link from 'next/link';
import type { Metadata } from 'next';
import {
  CollectionPageJsonLd, ItemListJsonLd, BreadcrumbJsonLd, VideoGameJsonLd, FAQPageJsonLd,
} from '@/components/seo/JsonLd';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

const TITLE = 'College Football 26 Online Dynasty Leagues — Find & Join | CFB Social';
const DESC =
  'Browse open EA Sports College Football 26 online dynasty leagues to join — PS5, Xbox, and PC. Filter by platform, cross-play, sim schedule, and open schools. Free league finder for CFB 26 commissioners and coaches.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    'College Football 26 online dynasty', 'CFB 26 leagues', 'CFB 26 online dynasty to join',
    'college football 26 league finder', 'CFB 26 PS5 league', 'CFB 26 Xbox league', 'EA college football online dynasty',
  ],
  openGraph: { title: TITLE, description: DESC, type: 'website', images: [{ url: 'https://www.cfbsocial.com/logo.png' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
  alternates: { canonical: 'https://www.cfbsocial.com/game-room/leagues' },
};

interface League {
  id: string; name: string; platform: string; max_users: number; filled_count: number;
  sim_schedule: string | null; style: string; open_schools: string | null; status: string;
  is_private: boolean; cross_play: boolean; rules: string | null;
}

const FAQS = [
  { question: 'How do I find a College Football 26 online dynasty league to join?', answer: 'Browse the open leagues on this page, pick one that matches your platform (PS5, Xbox, or PC) and schedule, then open it in the CFB Social Game Room to get the join code and request a spot.' },
  { question: 'Are these CFB 26 leagues free to join?', answer: 'Yes. CFB Social is a free college football community. Listing a league and requesting to join cost nothing.' },
  { question: 'Can I list my own College Football 26 online dynasty?', answer: 'Yes. Open the Game Room, go to the Leagues tab, and tap "List your league" to post your league name, platform, max users, sim schedule, and open schools for coaches to find.' },
];

export default async function LeaguesDirectoryPage() {
  const { createClient } = await import('@/lib/supabase/server');
  const { getLeagues } = await import('@cfb-social/api');
  const supabase = await createClient();
  const leagues = (await getLeagues(supabase, { limit: 200 }).catch(() => [])) as League[];

  const open = leagues.filter((l) => l.status !== 'FULL' && l.filled_count < l.max_users);

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: 'CFB Social', url: 'https://www.cfbsocial.com' },
          { name: 'Game Room', url: 'https://www.cfbsocial.com/game-room' },
          { name: 'Leagues', url: 'https://www.cfbsocial.com/game-room/leagues' },
        ]}
      />
      <CollectionPageJsonLd name="College Football 26 Online Dynasty Leagues" description={DESC} url="https://www.cfbsocial.com/game-room/leagues" />
      <VideoGameJsonLd url="https://www.cfbsocial.com/game-room/leagues" />
      <ItemListJsonLd name="Open CFB 26 Online Dynasty Leagues" items={leagues.map((l) => ({ name: l.name, url: `https://www.cfbsocial.com/game-room/leagues/${l.id}` }))} />
      <FAQPageJsonLd questions={FAQS} />

      <div className="feed-header">
        <h1 className="feed-title">College Football 26 Online Dynasty Leagues</h1>
      </div>

      <section className="content-card" style={{ marginBottom: 16 }}>
        <p style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', lineHeight: 1.6 }}>
          Find an open <strong>EA Sports College Football 26</strong> online dynasty to join, or list your own. Every league below
          shows its platform, user count, cross-play, sim schedule, and which schools are still open. Open it in the{' '}
          <Link href="/game-room?tab=leagues">Game Room</Link> to get the join code and request a spot. Free for commissioners and coaches.
        </p>
      </section>

      <div className="gr-lf-head" style={{ marginBottom: 10 }}>
        <div className="gr-lf-eyebrow">League Finder</div>
        <h2 className="gr-lf-title">{open.length} open {open.length === 1 ? 'league' : 'leagues'}</h2>
      </div>

      {leagues.length === 0 ? (
        <div className="content-card gr-placeholder"><p>No leagues listed yet. <Link href="/game-room?tab=leagues">List the first one</Link> in the Game Room.</p></div>
      ) : (
        <div className="gr-leagues">
          {leagues.map((lg) => {
            const pct = Math.min(100, Math.round((lg.filled_count / Math.max(1, lg.max_users)) * 100));
            const full = lg.status === 'FULL' || lg.filled_count >= lg.max_users;
            const styleLabel = lg.style === 'CASUAL' ? 'Casual' : 'Competitive';
            return (
              <Link key={lg.id} href={`/game-room/leagues/${lg.id}`} className="gr-league-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                <div className="gr-league-top">
                  <div>
                    <div className="gr-league-name">{lg.name}</div>
                    <div className="gr-league-meta">{lg.platform} · {lg.max_users}-user · {lg.cross_play ? 'Cross-play' : 'No cross-play'} · {styleLabel}{lg.is_private ? ' · Private' : ''}</div>
                  </div>
                  <span className={`gr-league-badge ${full ? 'full' : 'open'}`}>{full ? 'Full' : `${lg.max_users - lg.filled_count} open`}</span>
                </div>
                {lg.sim_schedule && <div className="gr-league-line">Sims: <strong>{lg.sim_schedule}</strong></div>}
                {lg.open_schools && <div className="gr-league-line">Open schools: <strong>{lg.open_schools}</strong></div>}
                {lg.rules && <div className="gr-league-rules">{lg.rules}</div>}
                <div className="gr-lf-bar"><div className="gr-lf-fill" style={{ width: `${pct}%` }} /></div>
                <div className="gr-lf-slots">{lg.filled_count} / {lg.max_users} filled · View details</div>
              </Link>
            );
          })}
        </div>
      )}

      <section className="content-card" style={{ marginTop: 20 }}>
        <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--dark-brown)', marginBottom: 10 }}>Frequently asked questions</h2>
        {FAQS.map((f) => (
          <div key={f.question} style={{ marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'var(--sans)', fontWeight: 700, color: 'var(--ink)', fontSize: '0.95rem' }}>{f.question}</h3>
            <p style={{ fontFamily: 'var(--sans)', color: 'var(--faded-ink)', lineHeight: 1.55 }}>{f.answer}</p>
          </div>
        ))}
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'var(--faded-ink)', marginTop: 8 }}>
          CFB Social is a fan community and is not affiliated with or endorsed by EA Sports or Electronic Arts.
        </p>
      </section>
    </div>
  );
}
