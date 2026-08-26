'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LandingMagazine } from '@/lib/landing/data';

const ROTATE_MS = 7000;

export function LandingMagazineRotator({ magazines }: { magazines: LandingMagazine[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (magazines.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % magazines.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [magazines.length]);

  const cap = (
    <span className="lpmag-cap">
      Publish your season.
      <br />
      Recruit real rivals.
    </span>
  );

  // No published magazines yet — neutral placeholder cover, no crash.
  if (magazines.length === 0) {
    return (
      <div className="lpmag-wrap">
        <div className="lpmag-card" aria-hidden="true">
          <div className="lpmag-cover lpmag-cover-empty">
            <div className="lpmag-veil" />
            <div className="lpmag-plate">
              <div className="lpmag-masthead">Your Dynasty</div>
              <div className="lpmag-issue">Issue No. 1</div>
            </div>
          </div>
        </div>
        {cap}
      </div>
    );
  }

  const mag = magazines[index % magazines.length]!;
  const accent = mag.coverAccent ?? 'var(--crimson)';

  return (
    <div className="lpmag-wrap">
      <Link
        href={`/game-room/m/${mag.id}`}
        className="lpmag-card"
        style={{ ['--cm' as string]: accent }}
      >
        <div className="lpmag-cover">
          {mag.coverUrl ? (
            <img
              src={mag.coverUrl}
              alt={mag.title}
              className="lpmag-img"
              loading="lazy"
            />
          ) : null}
          <div className="lpmag-veil" />
          {mag.school ? <span className="lpmag-tag">{mag.school}</span> : null}
          <div className="lpmag-plate">
            <div className="lpmag-masthead">{mag.title}</div>
            <div className="lpmag-issue">Issue No. {mag.issueNumber}</div>
          </div>
        </div>
        <div className="lpmag-meta">
          <span className="lpmag-by">@{mag.ownerUsername}</span>
          <span className="lpmag-pages">
            {mag.pageCount} {mag.pageCount === 1 ? 'page' : 'pages'}
          </span>
        </div>
      </Link>
      {cap}
    </div>
  );
}
