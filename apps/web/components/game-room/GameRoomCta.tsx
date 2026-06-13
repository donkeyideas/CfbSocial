'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { GAME } from '@/lib/constants/game';

type Intent = 'leagues' | 'join' | 'moments' | 'general';

interface Props {
  intent: Intent;
  /** Where to send the user after sign-up/login (and where the in-app button points). */
  redirect: string;
  /** League name, for the 'join' intent. */
  leagueName?: string;
  /** Short social-proof chips, e.g. ["12 open leagues", "340 moments shared"]. */
  stats?: string[];
}

const COPY: Record<Intent, { out: { title: string; sub: string; primary: string }; in: { title: string; primary: string } }> = {
  leagues: {
    out: { title: `Find your ${GAME.name} online dynasty`, sub: 'Create a free account to request a spot, or list your own league in seconds.', primary: 'Join free' },
    in: { title: 'Ready to join a league?', primary: 'Open the Leagues finder' },
  },
  join: {
    out: { title: 'Want in on this league?', sub: 'Create a free account to request a spot. Takes about 30 seconds.', primary: 'Sign up to request a spot' },
    in: { title: 'Request your spot', primary: 'Open in the Game Room' },
  },
  moments: {
    out: { title: `Share your ${GAME.name} dynasty`, sub: 'Create a free account to post your screenshots and build your magazine.', primary: 'Post your first moment free' },
    in: { title: 'Post a moment', primary: 'Open the Game Room' },
  },
  general: {
    out: { title: `Join the ${GAME.name} community`, sub: 'Free account — share moments, build a magazine, find a league.', primary: 'Create a free account' },
    in: { title: 'Jump in', primary: 'Open the Game Room' },
  },
};

export function GameRoomCta({ intent, redirect, leagueName, stats }: Props) {
  const { isLoggedIn } = useAuth();
  const [googlePlayUrl, setGooglePlayUrl] = useState('');
  const [appStoreUrl, setAppStoreUrl] = useState('');

  useEffect(() => {
    fetch('/api/admin/app-links')
      .then((r) => r.json())
      .then((d) => {
        setGooglePlayUrl(d.links?.app_google_play_url || '');
        setAppStoreUrl(d.links?.app_apple_store_url || '');
      })
      .catch(() => {});
  }, []);

  const c = COPY[intent];
  const enc = encodeURIComponent(redirect);

  return (
    <div className="gr-cta">
      {isLoggedIn ? (
        <>
          <div className="gr-cta-title">{c.in.title}</div>
          <div className="gr-cta-actions">
            <Link className="gr-cta-primary" href={redirect}>{c.in.primary}</Link>
          </div>
        </>
      ) : (
        <>
          <div className="gr-cta-title">{intent === 'join' && leagueName ? `Want in on ${leagueName}?` : c.out.title}</div>
          <div className="gr-cta-sub">{c.out.sub}</div>
          <div className="gr-cta-actions">
            <Link className="gr-cta-primary" href={`/register?redirect=${enc}`}>{c.out.primary}</Link>
            <Link className="gr-cta-secondary" href={`/login?redirect=${enc}`}>Log in</Link>
          </div>
          {(googlePlayUrl || appStoreUrl) && (
            <div className="gr-cta-apps">
              <span className="gr-cta-apps-label">Or get the app:</span>
              {appStoreUrl && <a href={appStoreUrl} target="_blank" rel="noopener noreferrer" className="gr-cta-app">App Store</a>}
              {googlePlayUrl && <a href={googlePlayUrl} target="_blank" rel="noopener noreferrer" className="gr-cta-app">Google Play</a>}
            </div>
          )}
        </>
      )}
      {stats && stats.length > 0 && (
        <div className="gr-cta-stats">
          {stats.map((s) => <span key={s} className="gr-cta-stat">{s}</span>)}
        </div>
      )}
    </div>
  );
}
