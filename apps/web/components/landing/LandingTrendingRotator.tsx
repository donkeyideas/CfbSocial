'use client';

import { useEffect, useState } from 'react';

interface TrendingStory {
  headline: string;
  description: string;
  articleUrl: string;
  byline: string;
  published: string;
  source: string;
}

const ROTATE_MS = 6000;
const REFETCH_MS = 5 * 60 * 1000;

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

export function LandingTrendingRotator() {
  const [stories, setStories] = useState<TrendingStory[] | null>(null);
  const [index, setIndex] = useState(0);

  // Fetch on mount + refresh every 5 minutes.
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch('/api/news-feeds');
        if (!res.ok) throw new Error('bad status');
        const data = await res.json();
        const trending = Array.isArray(data?.trending) ? (data.trending as TrendingStory[]) : [];
        if (active) {
          setStories(trending);
          setIndex(0);
        }
      } catch {
        if (active) setStories([]);
      }
    }

    load();
    const refetch = setInterval(load, REFETCH_MS);
    return () => {
      active = false;
      clearInterval(refetch);
    };
  }, []);

  // Rotate the displayed story.
  useEffect(() => {
    if (!stories || stories.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % stories.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [stories]);

  if (stories === null) {
    return (
      <div className="lptrend">
        <div className="lptrend-meta">Loading trending stories&hellip;</div>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="lptrend">
        <div className="lptrend-meta">Trending stories from across college football appear here.</div>
      </div>
    );
  }

  const story = stories[index % stories.length]!;
  const when = relativeTime(story.published);
  const bylineParts = [story.byline, when].filter(Boolean);

  return (
    <div className="lptrend">
      <span className="lptrend-source">{story.source}</span>
      <a
        className="lptrend-headline"
        href={story.articleUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {story.headline}
      </a>
      {bylineParts.length > 0 ? (
        <div className="lptrend-meta">{bylineParts.join(' · ')}</div>
      ) : null}
    </div>
  );
}
