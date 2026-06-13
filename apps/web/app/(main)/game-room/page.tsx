import Link from 'next/link';
import { GameRoomClient } from '@/components/game-room/GameRoomClient';
import {
  VideoGameJsonLd, CollectionPageJsonLd, FAQPageJsonLd, BreadcrumbJsonLd,
} from '@/components/seo/JsonLd';

export const dynamic = 'force-dynamic';

const TITLE = 'Game Room — College Football 26 Dynasty Moments & Online Leagues | CFB Social';
const DESC =
  'Share EA Sports College Football 26 dynasty screenshots, build a flip-magazine of your season, and find online dynasty leagues to join (PS5, Xbox, PC). The free CFB 26 community for moments, magazines, and leagues.';

export const metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    'College Football 26', 'CFB 26', 'College Football 26 dynasty', 'CFB 26 screenshots',
    'College Football 26 online dynasty', 'CFB 26 leagues', 'EA Sports College Football',
    'college football video game community', 'dynasty moments', 'CFB 26 magazine',
  ],
  openGraph: {
    title: TITLE,
    description: DESC,
    type: 'website',
    images: [{ url: 'https://www.cfbsocial.com/logo.png', width: 256, height: 256, alt: 'CFB Social Game Room' }],
  },
  twitter: { card: 'summary_large_image' as const, title: TITLE, description: DESC },
  alternates: { canonical: 'https://www.cfbsocial.com/game-room' },
};

const HUB_FAQS = [
  { question: 'What is the CFB Social Game Room?', answer: 'The Game Room is a free hub for EA Sports College Football 26 players to share dynasty screenshots ("moments"), curate them into a flip-magazine of their season, and find online dynasty leagues to join.' },
  { question: 'Where can I share my College Football 26 dynasty screenshots?', answer: 'Open the Game Room Moments tab and upload your screenshots. Each moment posts to your CFB Social feed and can be added to your own magazine issue.' },
  { question: 'How do I find a College Football 26 online dynasty league?', answer: 'Use the Game Room Leagues directory to browse open CFB 26 leagues by platform, sim schedule, and open schools, then request to join.' },
];

interface GameRoomPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function GameRoomPage({ searchParams }: GameRoomPageProps) {
  const params = await searchParams;
  const tab = params.tab ?? 'thisweek';

  const { createClient } = await import('@/lib/supabase/server');
  const { getMoments, getLeagues, getOwnerIssues, getCommissionerRequests, getMyLeagueIds } = await import('@cfb-social/api');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [moments, leagues, issues, requests, myLeagueIds] = await Promise.all([
    getMoments(supabase, { limit: 24 }).catch(() => []),
    getLeagues(supabase, { limit: 50 }).catch(() => []),
    user ? getOwnerIssues(supabase, user.id).catch(() => []) : Promise.resolve([]),
    user ? getCommissionerRequests(supabase, user.id).catch(() => []) : Promise.resolve([]),
    user ? getMyLeagueIds(supabase, user.id).catch(() => []) : Promise.resolve([]),
  ]);

  // Reveal a private league's password only to its members (commissioner + approved coaches).
  const memberOf = new Set(myLeagueIds as string[]);
  const safeLeagues = (leagues as Array<Record<string, unknown>>).map((l) =>
    l.is_private && !memberOf.has(l.id as string) ? { ...l, join_password: null } : l
  );

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'CFB Social', url: 'https://www.cfbsocial.com' },
          { name: 'Game Room', url: 'https://www.cfbsocial.com/game-room' },
        ]}
      />
      <CollectionPageJsonLd name="CFB Social Game Room" description={DESC} url="https://www.cfbsocial.com/game-room" />
      <VideoGameJsonLd url="https://www.cfbsocial.com/game-room" />
      <FAQPageJsonLd questions={HUB_FAQS} />

      <GameRoomClient
        initialTab={tab}
        moments={moments as unknown[]}
        leagues={safeLeagues as unknown[]}
        issues={issues as unknown[]}
        requests={requests as unknown[]}
      />

      {/* Crawlable SEO content — internal links + answer-engine text */}
      <section className="content-card" style={{ marginTop: 24 }}>
        <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--dark-brown)', marginBottom: 8 }}>
          The College Football 26 dynasty community
        </h2>
        <p style={{ fontFamily: 'var(--sans)', color: 'var(--ink)', lineHeight: 1.6 }}>
          The Game Room is where <strong>EA Sports College Football 26</strong> players share their best dynasty moments,
          turn a season into a flip-magazine, and find <Link href="/game-room/leagues">online dynasty leagues to join</Link> on
          PS5, Xbox, and PC. Post a screenshot, file it into an issue, and share it to the feed. New to it? Read the{' '}
          <Link href="/game-room/guide">Game Room guide</Link>.
        </p>
        <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--dark-brown)', margin: '14px 0 8px' }}>Frequently asked questions</h2>
        {HUB_FAQS.map((f) => (
          <div key={f.question} style={{ marginBottom: 10 }}>
            <h3 style={{ fontFamily: 'var(--sans)', fontWeight: 700, color: 'var(--ink)', fontSize: '0.95rem' }}>{f.question}</h3>
            <p style={{ fontFamily: 'var(--sans)', color: 'var(--faded-ink)', lineHeight: 1.55 }}>{f.answer}</p>
          </div>
        ))}
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.74rem', color: 'var(--faded-ink)', marginTop: 8 }}>
          CFB Social is a fan community and is not affiliated with or endorsed by EA Sports or Electronic Arts.
        </p>
      </section>
    </>
  );
}
