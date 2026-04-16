'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface SchoolStats {
  schoolId: string;
  schoolName: string;
  abbreviation: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  conference: string;
  mascot: string;
  playersLost: number;
  playersGained: number;
  totalClaims: number;
  avgStarRating: number;
  netMovement: number;
  activityLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  recruitingRank?: number | null;
}

type SortBy = 'activity' | 'net' | 'stars' | 'name';

const CONFERENCES = ['All', 'SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12', 'American', 'Mountain West', 'Sun Belt', 'MAC', 'Conference USA'];

const ACTIVITY_COLORS: Record<string, string> = {
  LOW: '#556b2f',
  MODERATE: '#b8860b',
  HIGH: '#cc7722',
  VERY_HIGH: 'var(--crimson)',
};

const ACTIVITY_WIDTHS: Record<string, number> = {
  LOW: 20,
  MODERATE: 45,
  HIGH: 70,
  VERY_HIGH: 95,
};

export function RecruitingClient({ stats }: { stats: SchoolStats[] }) {
  const [conference, setConference] = useState('All');
  const [sortBy, setSortBy] = useState<SortBy>('activity');

  const filtered = useMemo(() => {
    let result = stats;

    if (conference !== 'All') {
      result = result.filter((s) => s.conference === conference);
    }

    switch (sortBy) {
      case 'activity':
        result = [...result].sort((a, b) =>
          (b.playersLost + b.playersGained + b.totalClaims) - (a.playersLost + a.playersGained + a.totalClaims)
        );
        break;
      case 'net':
        result = [...result].sort((a, b) => b.netMovement - a.netMovement);
        break;
      case 'stars':
        result = [...result].sort((a, b) => b.avgStarRating - a.avgStarRating);
        break;
      case 'name':
        result = [...result].sort((a, b) => a.schoolName.localeCompare(b.schoolName));
        break;
    }

    return result;
  }, [stats, conference, sortBy]);

  return (
    <div>
      {/* Filters */}
      <div className="recruiting-filters">
        <div className="recruiting-filter-row">
          {CONFERENCES.map((conf) => (
            <button
              key={conf}
              className={`recruiting-filter-btn ${conference === conf ? 'active' : ''}`}
              onClick={() => setConference(conf)}
            >
              {conf}
            </button>
          ))}
        </div>
        <div className="recruiting-sort">
          <label className="recruiting-sort-label">Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="recruiting-sort-select"
          >
            <option value="activity">Activity</option>
            <option value="net">Net Movement</option>
            <option value="stars">Avg Stars</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="recruiting-grid">
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', color: 'var(--faded-ink)', fontFamily: 'var(--sans)', fontSize: '0.85rem', textAlign: 'center', padding: 32 }}>
            No programs found for this conference.
          </div>
        ) : (
          filtered.map((school) => (
            <SchoolCard key={school.schoolId} school={school} />
          ))
        )}
      </div>
    </div>
  );
}

function SchoolCard({ school }: { school: SchoolStats }) {
  const activityColor = ACTIVITY_COLORS[school.activityLevel] ?? '#556b2f';
  const activityWidth = ACTIVITY_WIDTHS[school.activityLevel] ?? 20;

  return (
    <Link
      href={`/school/${school.slug}`}
      className="recruiting-card"
      style={{ textDecoration: 'none' }}
    >
      <div className="recruiting-card-header">
        <div className="recruiting-card-avatar" style={{ backgroundColor: school.primaryColor }}>
          {school.abbreviation}
        </div>
        <div className="recruiting-card-info">
          <div className="recruiting-card-name">{school.schoolName}</div>
          <div className="recruiting-card-meta">
            {school.mascot} &middot; {school.conference}
          </div>
        </div>
      </div>

      <div className="recruiting-stats-row">
        <div className="recruiting-stat">
          <span className="recruiting-stat-value stat-negative">-{school.playersLost}</span>
          <span className="recruiting-stat-label">Lost</span>
        </div>
        <div className="recruiting-stat">
          <span className="recruiting-stat-value stat-positive">+{school.playersGained}</span>
          <span className="recruiting-stat-label">Gained</span>
        </div>
        <div className="recruiting-stat">
          <span className={`recruiting-stat-value ${school.netMovement >= 0 ? 'stat-positive' : 'stat-negative'}`}>
            {school.netMovement >= 0 ? '+' : ''}{school.netMovement}
          </span>
          <span className="recruiting-stat-label">Net</span>
        </div>
        <div className="recruiting-stat">
          <span className="recruiting-stat-value">{school.totalClaims}</span>
          <span className="recruiting-stat-label">Claims</span>
        </div>
      </div>

      {school.avgStarRating > 0 && (
        <div className="recruiting-stars">
          Avg Rating: {school.avgStarRating}
        </div>
      )}

      {school.recruitingRank && (
        <div className="recruiting-rank-badge">
          <span>{new Date().getFullYear()} Class Rank</span>
          <strong>#{school.recruitingRank}</strong>
        </div>
      )}

      <div className="recruiting-activity">
        <div className="recruiting-activity-bar">
          <div
            className="recruiting-activity-fill"
            style={{ width: `${activityWidth}%`, backgroundColor: activityColor }}
          />
        </div>
        <span className="recruiting-activity-label" style={{ color: activityColor }}>
          {school.activityLevel.replace('_', ' ')}
        </span>
      </div>
    </Link>
  );
}
