'use client';

import { useEffect, useState } from 'react';
import type { LandingGame, LandingHotTake } from '@/lib/landing/data';

interface LandingHeroLiveProps {
  initialGames: LandingGame[];
  initialHotTakes: LandingHotTake[];
}

export function LandingHeroLive({ initialGames, initialHotTakes }: LandingHeroLiveProps) {
  const [games, setGames] = useState<LandingGame[]>(initialGames);
  const [takes, setTakes] = useState<LandingHotTake[]>(initialHotTakes);
  const [gameIndex, setGameIndex] = useState(0);
  const [takeIndex, setTakeIndex] = useState(0);

  // Rotate the game and the hot take on separate, intentionally different
  // cadences so they don't flip in lockstep. The hot take lingers longer so
  // there's time to actually read it.
  useEffect(() => {
    const rotateGame = setInterval(() => {
      setGameIndex((i) => (games.length ? (i + 1) % games.length : 0));
    }, 6000);
    return () => clearInterval(rotateGame);
  }, [games.length]);

  useEffect(() => {
    const rotateTake = setInterval(() => {
      setTakeIndex((i) => (takes.length ? (i + 1) % takes.length : 0));
    }, 13000);
    return () => clearInterval(rotateTake);
  }, [takes.length]);

  // Refresh live data every 60s
  useEffect(() => {
    let mounted = true;
    const refresh = setInterval(async () => {
      try {
        const res = await fetch('/api/landing');
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data.games)) {
          setGames(data.games);
          setGameIndex((i) => (data.games.length ? i % data.games.length : 0));
        }
        if (Array.isArray(data.hotTakes)) {
          setTakes(data.hotTakes);
          setTakeIndex((i) => (data.hotTakes.length ? i % data.hotTakes.length : 0));
        }
      } catch {
        // Keep existing data
      }
    }, 60000);
    return () => {
      mounted = false;
      clearInterval(refresh);
    };
  }, []);

  const game = games.length ? games[gameIndex % games.length] : null;
  const take = takes.length ? takes[takeIndex % takes.length] : null;

  return (
    <>
      {game ? <BoxScore game={game} /> : <BoxScorePlaceholder />}
      {take ? <HeroTake take={take} /> : null}
    </>
  );
}

function BoxScore({ game }: { game: LandingGame }) {
  const isLive = game.statusState === 'in';
  const isUpcoming = game.statusState === 'pre';
  const away = game.away;
  const home = game.home;
  // Determine winner highlight for final/live games
  const awayNum = Number(away.score);
  const homeNum = Number(home.score);
  const showScores = !isUpcoming && (away.score !== '' || home.score !== '');
  const awayWin = showScores && !Number.isNaN(awayNum) && !Number.isNaN(homeNum) && awayNum > homeNum;
  const homeWin = showScores && !Number.isNaN(awayNum) && !Number.isNaN(homeNum) && homeNum > awayNum;

  return (
    <div
      className="boxscore"
      role="figure"
      aria-label={`Box score, ${away.name} versus ${home.name}`}
    >
      <div className="boxscore-head">
        <span>War Room &middot; Game Thread</span>
        {isLive ? (
          <span className="live">
            <span className="live-dot"></span>Live
          </span>
        ) : (
          <span className="live" style={{ color: 'inherit' }}>
            {isUpcoming ? 'Upcoming' : 'Final'}
          </span>
        )}
      </div>
      <div className="boxscore-body">
        <div className="score-row">
          <span className="team-badge" style={{ background: away.color }}>
            {away.abbr}
          </span>
          <span className="team-name">
            {away.name}
            {away.record ? <small>{away.record}</small> : null}
          </span>
          <span className={`team-score${awayWin ? ' win' : ''}`}>
            {isUpcoming ? '' : away.score}
          </span>
        </div>
        <div className="score-row">
          <span className="team-badge" style={{ background: home.color }}>
            {home.abbr}
          </span>
          <span className="team-name">
            {home.name}
            {home.record ? <small>{home.record}</small> : null}
          </span>
          <span className={`team-score${homeWin ? ' win' : ''}`}>
            {isUpcoming ? '' : home.score}
          </span>
        </div>
        <div className="boxscore-foot">
          <span className="quarter-clock">
            {isUpcoming ? game.kickoffLabel : game.statusLabel}
          </span>
          <span>{isUpcoming ? 'Kickoff scheduled' : 'In the game thread'}</span>
        </div>
      </div>
    </div>
  );
}

function BoxScorePlaceholder() {
  return (
    <div className="boxscore" role="figure" aria-label="Game threads">
      <div className="boxscore-head">
        <span>War Room &middot; Game Thread</span>
        <span className="live" style={{ color: 'inherit' }}>
          Off Season
        </span>
      </div>
      <div className="boxscore-body">
        <div className="boxscore-foot">
          <span className="quarter-clock">No games right now</span>
          <span>Check back on game day</span>
        </div>
      </div>
    </div>
  );
}

function HeroTake({ take }: { take: LandingHotTake }) {
  const initials = deriveInitials(take.author.username, take.school.abbr);
  const schoolLabel = take.school.name || take.school.abbr || 'CFB Social';

  return (
    <div className="hero-take">
      <div className="stamp" aria-hidden="true">
        <svg className="stamp-svg" width="70" height="70" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r="32" fill="none" stroke="#8b1a1a" strokeWidth="2" />
          <circle cx="35" cy="35" r="27" fill="none" stroke="#8b1a1a" strokeWidth="1" />
          <text x="35" y="30" textAnchor="middle" fill="#8b1a1a" fontFamily="Zilla Slab, serif" fontWeight="700" fontSize="9" letterSpacing="1">HOT</text>
          <text x="35" y="42" textAnchor="middle" fill="#8b1a1a" fontFamily="Zilla Slab, serif" fontWeight="700" fontSize="9" letterSpacing="1">TAKE</text>
          <path d="M12 35a23 23 0 0 1 46 0" fill="none" stroke="#8b1a1a" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      </div>
      <div className="row">
        <span className="avatar" style={{ background: take.school.color }}>
          {initials}
        </span>
        <span className="meta">
          <b>@{take.author.username}</b> &middot; {schoolLabel}
          {take.timeLabel ? ` · ${take.timeLabel}` : ''}
        </span>
      </div>
      <p>&quot;{take.content}&quot;</p>
      <div className="vote-widget">
        <button className="vote-btn td" type="button">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1v10M2 5l4-4 4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Touchdown <span className="count">{take.td.toLocaleString()}</span>
        </button>
        <button className="vote-btn fumble" type="button">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 11V1M2 7l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Fumble <span className="count">{take.fumble.toLocaleString()}</span>
        </button>
      </div>
    </div>
  );
}

function deriveInitials(username: string, abbr: string): string {
  if (abbr) return abbr.slice(0, 2).toUpperCase();
  const clean = (username || '').replace(/[^a-zA-Z]/g, '');
  if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
  if (clean.length === 1) return clean.toUpperCase();
  return 'CF';
}
