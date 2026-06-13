import { GameRoomClient } from '@/components/game-room/GameRoomClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Game Room — Share Your CFB Dynasty Moments | CFB Social',
  description:
    'The home for your College Football video-game saves. Post screenshots from your dynasty, build a season timeline, and find an online league to join.',
  openGraph: {
    title: 'Game Room | CFB Social',
    description:
      'Post screenshots from your College Football dynasty, build a save timeline, and find an online league.',
    images: [{ url: 'https://www.cfbsocial.com/logo.png', width: 256, height: 256, alt: 'CFB Social' }],
  },
  alternates: { canonical: 'https://www.cfbsocial.com/game-room' },
};

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
    <GameRoomClient
      initialTab={tab}
      moments={moments as unknown[]}
      leagues={safeLeagues as unknown[]}
      issues={issues as unknown[]}
      requests={requests as unknown[]}
    />
  );
}
