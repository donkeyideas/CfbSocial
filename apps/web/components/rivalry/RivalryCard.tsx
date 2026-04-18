'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { VoteBar } from './VoteBar';
import { readableSchoolColor } from '@/lib/utils/color-contrast';

function getIsDark(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/** In dark mode: prefer secondary_color, but if it's still too dark, lighten it */
function pickColor(school: { primary_color: string; secondary_color?: string } | null, isDark: boolean): string | null {
  if (!school) return null;
  const raw = isDark && school.secondary_color ? school.secondary_color : school.primary_color;
  if (!isDark) return raw;
  return readableSchoolColor(raw, true);
}

interface School {
  id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
  secondary_color?: string;
  logo_url: string | null;
  mascot?: string;
}

interface RivalryCardProps {
  rivalry: {
    id: string;
    name: string;
    subtitle: string | null;
    status: string;
    school_1_vote_count: number;
    school_2_vote_count: number;
    is_featured: boolean;
    school_1: School | null;
    school_2: School | null;
  };
}

export function RivalryCard({ rivalry }: RivalryCardProps) {
  const s1 = rivalry.school_1;
  const s2 = rivalry.school_2;
  const isDark = getIsDark();
  const color1 = pickColor(s1, isDark) ?? 'var(--dark-brown)';
  const color2 = pickColor(s2, isDark) ?? 'var(--dark-brown)';
  const [votes1, setVotes1] = useState(rivalry.school_1_vote_count);
  const [votes2, setVotes2] = useState(rivalry.school_2_vote_count);
  const [voted, setVoted] = useState<string | null>(null);

  async function handleVote(schoolId: string) {
    if (voted) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setVoted(schoolId);
    if (schoolId === s1?.id) setVotes1((c) => c + 1);
    else setVotes2((c) => c + 1);

    await supabase.from('rivalry_votes').insert({
      rivalry_id: rivalry.id,
      user_id: user.id,
      school_id: schoolId,
    });
  }

  return (
    <div className="post-card post-rivalry">
      <div className="rivalry-header">
        <div className="rivalry-label">
          {rivalry.is_featured ? 'Featured Rivalry' : 'Rivalry Ring'}
        </div>
        <div className="rivalry-title">{rivalry.name}</div>
      </div>
      <div className="rivalry-body">
        {rivalry.subtitle && (
          <p style={{ color: 'var(--faded-ink)', fontSize: '0.85rem', marginBottom: 12, fontStyle: 'italic' }}>
            {rivalry.subtitle}
          </p>
        )}

        {/* School vs School */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '16px 0' }}>
          <button
            onClick={() => s1 && handleVote(s1.id)}
            disabled={!!voted}
            style={{
              background: voted === s1?.id ? color1 : 'transparent',
              color: voted === s1?.id ? '#fff' : color1,
              border: `2px solid ${color1}`,
              padding: '10px 20px',
              borderRadius: 2,
              cursor: voted ? 'default' : 'pointer',
              fontFamily: 'var(--serif)',
              fontWeight: 700,
              fontSize: '0.9rem',
              opacity: voted && voted !== s1?.id ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {s1?.abbreviation ?? 'Team A'}
          </button>

          <span style={{
            fontFamily: 'var(--serif)',
            fontSize: '0.8rem',
            fontWeight: 800,
            color: 'var(--faded-ink)',
            letterSpacing: 2,
          }}>
            VS
          </span>

          <button
            onClick={() => s2 && handleVote(s2.id)}
            disabled={!!voted}
            style={{
              background: voted === s2?.id ? color2 : 'transparent',
              color: voted === s2?.id ? '#fff' : color2,
              border: `2px solid ${color2}`,
              padding: '10px 20px',
              borderRadius: 2,
              cursor: voted ? 'default' : 'pointer',
              fontFamily: 'var(--serif)',
              fontWeight: 700,
              fontSize: '0.9rem',
              opacity: voted && voted !== s2?.id ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {s2?.abbreviation ?? 'Team B'}
          </button>
        </div>

        {/* Vote bar */}
        <VoteBar
          votesA={votes1}
          votesB={votes2}
          labelA={s1?.abbreviation ?? 'A'}
          labelB={s2?.abbreviation ?? 'B'}
          colorA={color1}
          colorB={color2}
        />

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link
            href={`/rivalry/${rivalry.id}`}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.75rem',
              color: isDark ? 'var(--school-secondary, var(--crimson))' : 'var(--crimson)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              textDecoration: 'none',
            }}
          >
            View Debate &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
