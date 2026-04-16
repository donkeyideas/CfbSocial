'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { PostCard } from '@/components/feed/PostCard';
import { trackSchoolVisit } from '@/lib/analytics/track';

interface SchoolHubProps {
  school: {
    id: string;
    name: string;
    short_name: string;
    abbreviation: string;
    slug: string;
    mascot: string;
    conference: string;
    primary_color: string;
    secondary_color: string;
    logo_url: string | null;
    stadium: string | null;
    city: string | null;
    state: string | null;
  };
  fanCount: number;
  postCount: number;
  portalCount: number;
  posts: Array<Record<string, unknown>>;
  topFans: Array<{
    username: string;
    display_name: string | null;
    xp: number;
    dynasty_tier: string;
    post_count: number;
  }>;
  highlights?: Array<{
    videoId: string;
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnail: string;
    url: string;
  }>;
}

const tierLabels: Record<string, string> = {
  WALK_ON: 'Walk-On',
  STARTER: 'Starter',
  ALL_CONFERENCE: 'All-Conf',
  ALL_AMERICAN: 'All-American',
  HEISMAN: 'Heisman',
  DYNASTY: 'Dynasty',
};

export function SchoolHub({ school, fanCount, postCount, portalCount, posts, topFans, highlights = [] }: SchoolHubProps) {
  useEffect(() => {
    trackSchoolVisit(school.id, school.slug);
  }, [school.id, school.slug]);

  return (
    <div>
      {/* School Header */}
      <div
        className="school-header"
        style={{
          '--school-bg': school.primary_color,
          '--school-accent': school.secondary_color,
        } as React.CSSProperties}
      >
        <div className="school-header-top">
          <div className="school-avatar" style={{ backgroundColor: school.primary_color }}>
            {school.abbreviation}
          </div>
          <div className="school-info">
            <div className="school-name">{school.name}</div>
            <div className="school-meta">
              {school.conference}
              {school.stadium && ` \u2014 ${school.stadium}`}
            </div>
            {school.city && school.state && (
              <div className="school-location">{school.city}, {school.state}</div>
            )}
          </div>
        </div>

        <div className="school-stats-row">
          <div className="school-stat">
            <span className="school-stat-value">{fanCount.toLocaleString()}</span>
            <span className="school-stat-label">Fans</span>
          </div>
          <div className="school-stat">
            <span className="school-stat-value">{postCount.toLocaleString()}</span>
            <span className="school-stat-label">Takes</span>
          </div>
          <div className="school-stat">
            <span className="school-stat-value">{portalCount}</span>
            <span className="school-stat-label">Portal</span>
          </div>
        </div>

        <div
          className="school-color-bar"
          style={{
            background: `linear-gradient(90deg, ${school.primary_color} 60%, ${school.secondary_color} 100%)`,
          }}
        />
      </div>

      {/* Content Grid */}
      <div className="school-content">
        {/* School Feed */}
        <div className="school-feed">
          <div className="school-section-title">Latest from {school.abbreviation}</div>
          {posts.length === 0 ? (
            <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
              <p className="post-body">No takes filed yet for {school.short_name}.</p>
              <p style={{ color: 'var(--faded-ink)', fontSize: '0.85rem', marginTop: 8 }}>
                Be the first to rep your school.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id as string} post={post as never} />
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="school-sidebar">
          {/* YouTube Highlights */}
          {highlights.length > 0 && (
            <div className="school-highlights-card">
              <div className="school-section-title">Recent Highlights</div>
              <div className="school-highlights-strip">
                {highlights.map((v) => (
                  <a
                    key={v.videoId}
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="school-highlight-item"
                    title={v.title}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.thumbnail} alt={v.title} loading="lazy" />
                    <div className="school-highlight-title">{v.title}</div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Top Fans */}
          <div className="school-fans-card">
            <div className="school-section-title">Top {school.abbreviation} Fans</div>
            {topFans.length === 0 ? (
              <p style={{ color: 'var(--faded-ink)', fontSize: '0.82rem' }}>
                No fans have claimed {school.short_name} yet.
              </p>
            ) : (
              topFans.map((fan, i) => (
                <div key={fan.username} className="school-fan-row">
                  <span className="school-fan-rank">{i + 1}</span>
                  <div className="school-fan-info">
                    <Link
                      href={`/profile/${fan.username}`}
                      className="school-fan-name"
                    >
                      @{fan.username}
                    </Link>
                    <span className="school-fan-tier">
                      {tierLabels[fan.dynasty_tier] ?? 'Walk-On'}
                    </span>
                  </div>
                  <span className="school-fan-xp">
                    {fan.xp.toLocaleString()} XP
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick Links */}
          <div className="school-links-card">
            <div className="school-section-title">Quick Links</div>
            <Link href="/portal" className="school-link">
              Portal Wire
            </Link>
            <Link href="/predictions" className="school-link">
              Predictions
            </Link>
            <Link href="/rivalry" className="school-link">
              Rivalry Ring
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
