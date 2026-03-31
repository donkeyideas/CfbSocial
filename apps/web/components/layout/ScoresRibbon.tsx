'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Game {
  id: string;
  away: string;
  awayScore: string;
  home: string;
  homeScore: string;
  status: string;
  isFinal: boolean;
  isLive: boolean;
}

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';

const FALLBACK_ITEMS: Game[] = [
  {
    id: '',
    away: 'CFB SOCIAL',
    awayScore: '',
    home: '',
    homeScore: '',
    status: "College Football's Social Home",
    isFinal: false,
    isLive: false,
  },
  {
    id: '',
    away: '',
    awayScore: '',
    home: '',
    homeScore: '',
    status: 'Scores will appear here on game day',
    isFinal: false,
    isLive: false,
  },
  {
    id: '',
    away: '',
    awayScore: '',
    home: '',
    homeScore: '',
    status: 'Stay tuned for live updates',
    isFinal: false,
    isLive: false,
  },
];

function parseGames(data: any): Game[] {
  try {
    const events = data?.events;
    if (!Array.isArray(events) || events.length === 0) return [];

    return events.map((event: any) => {
      const competitors = event.competitions?.[0]?.competitors ?? [];
      const homeTeam = competitors.find((c: any) => c.homeAway === 'home');
      const awayTeam = competitors.find((c: any) => c.homeAway === 'away');
      const statusDetail =
        event.status?.type?.shortDetail ?? event.status?.type?.description ?? '';
      const statusState = event.status?.type?.state ?? '';

      return {
        id: event.id ?? '',
        away: awayTeam?.team?.abbreviation ?? '???',
        awayScore: awayTeam?.score ?? '',
        home: homeTeam?.team?.abbreviation ?? '???',
        homeScore: homeTeam?.score ?? '',
        status: statusDetail,
        isFinal: statusDetail.toLowerCase().includes('final'),
        isLive: statusState === 'in',
      };
    });
  } catch {
    return [];
  }
}

function formatGame(game: Game): string {
  // Fallback/placeholder items have no scores
  if (!game.awayScore && !game.homeScore) {
    return [game.away, game.status].filter(Boolean).join(' -- ');
  }
  return `${game.away} ${game.awayScore} @ ${game.home} ${game.homeScore}`;
}

function GameItem({ game }: { game: Game }) {
  const text = formatGame(game);
  const isFallback = !game.awayScore && !game.homeScore;

  const content = (
    <span className="score-item">
      <span className="score-divider">&diams;</span>
      {!isFallback && (game.isFinal || game.isLive) && (
        <span className={`score-label ${game.isFinal ? 'final' : 'live'}`}>
          {game.isFinal ? 'FINAL' : 'LIVE'}
        </span>
      )}
      <span className="score-teams">
        {isFallback ? (
          text
        ) : (
          <>
            <strong>{game.away}</strong> {game.awayScore} @{' '}
            <strong>{game.home}</strong> {game.homeScore}
            {game.status ? ` -- ${game.status}` : ''}
          </>
        )}
      </span>
    </span>
  );

  if (game.id) {
    return (
      <Link href={`/war-room/${game.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </Link>
    );
  }

  return content;
}

export function ScoresRibbon() {
  const [games, setGames] = useState<Game[]>(FALLBACK_ITEMS);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchScores() {
      try {
        const res = await fetch(ESPN_URL);
        if (!res.ok) return;
        const data = await res.json();
        const parsed = parseGames(data);
        if (mounted && parsed.length > 0) {
          setGames(parsed);
        }
      } catch {
        // ESPN unreachable — keep existing state (fallback or last good data)
      }
    }

    function startPolling() {
      fetchScores();
      interval = setInterval(fetchScores, 60_000);
    }

    function stopPolling() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    // Only poll when tab is visible
    function handleVisibility() {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    }

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Duplicate items for seamless infinite scroll loop
  return (
    <div className="scores-ribbon">
      <div className="scores-track">
        {games.map((game, i) => (
          <GameItem key={i} game={game} />
        ))}
        {games.map((game, i) => (
          <GameItem key={`dup-${i}`} game={game} />
        ))}
      </div>
    </div>
  );
}
