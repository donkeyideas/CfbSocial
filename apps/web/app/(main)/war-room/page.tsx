import { WarRoomClient } from './WarRoomClient';

export const metadata = {
  title: 'Live College Football Scores & Game Threads | War Room',
  description: 'Live college football scores and real-time game-day threads. Join the conversation during every CFB game with live chat, quick reactions, and fan commentary. Your digital tailgate.',
  openGraph: {
    title: 'Live College Football Scores & Game Threads | CFB Social',
    description: 'Live college football scores and game-day threads. Real-time chat and reactions.',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Live College Football Scores & Game Threads | CFB Social',
    description: 'Live college football scores and game-day threads. Real-time chat and reactions.',
  },
  alternates: {
    canonical: 'https://cfbsocial.com/war-room',
  },
};

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';

interface ESPNGame {
  id: string;
  away: string;
  awayFull: string;
  awayScore: string;
  home: string;
  homeFull: string;
  homeScore: string;
  status: string;
  statusState: string;
  gameDate: string;
}

async function fetchESPNGames(): Promise<ESPNGame[]> {
  try {
    const res = await fetch(ESPN_URL, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    const events = data?.events;
    if (!Array.isArray(events)) return [];

    return events.map((event: Record<string, unknown>) => {
      const competition = (event.competitions as Array<Record<string, unknown>>)?.[0];
      const competitors = (competition?.competitors as Array<Record<string, unknown>>) ?? [];
      const homeTeam = competitors.find((c) => c.homeAway === 'home');
      const awayTeam = competitors.find((c) => c.homeAway === 'away');
      const statusType = (event.status as Record<string, unknown>)?.type as Record<string, unknown> | undefined;
      const statusDetail = (statusType?.shortDetail ?? statusType?.description ?? '') as string;
      const statusState = (statusType?.state ?? '') as string;

      return {
        id: event.id as string,
        away: ((awayTeam?.team as Record<string, unknown>)?.abbreviation ?? '???') as string,
        awayFull: ((awayTeam?.team as Record<string, unknown>)?.displayName ?? '') as string,
        awayScore: (awayTeam?.score ?? '0') as string,
        home: ((homeTeam?.team as Record<string, unknown>)?.abbreviation ?? '???') as string,
        homeFull: ((homeTeam?.team as Record<string, unknown>)?.displayName ?? '') as string,
        homeScore: (homeTeam?.score ?? '0') as string,
        status: statusDetail,
        statusState,
        gameDate: (event.date ?? '') as string,
      };
    });
  } catch {
    return [];
  }
}

export default async function WarRoomPage() {
  const games = await fetchESPNGames();

  const liveGames = games.filter((g) => g.statusState === 'in');
  const upcomingGames = games.filter((g) => g.statusState === 'pre');
  const finalGames = games.filter((g) => g.statusState === 'post');

  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">War Room</h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--faded-ink)', marginTop: 4 }}>
          Live game-day headquarters. Pick a game and join the conversation.
        </p>
      </div>

      <WarRoomClient
        liveGames={liveGames}
        upcomingGames={upcomingGames}
        finalGames={finalGames}
      />
    </div>
  );
}
