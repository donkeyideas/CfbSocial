'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface Take {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  user: { id: string; username: string; display_name: string | null } | null;
  school: { id: string; abbreviation: string; primary_color: string; secondary_color?: string } | null;
}

interface RivalryDetailProps {
  rivalry: {
    id: string;
    name: string;
    subtitle: string | null;
    description: string | null;
    status: string;
    school_1_vote_count: number;
    school_2_vote_count: number;
    school_1: School | null;
    school_2: School | null;
  };
  takes: Take[];
}

export function RivalryDetail({ rivalry, takes }: RivalryDetailProps) {
  const router = useRouter();
  const s1 = rivalry.school_1;
  const s2 = rivalry.school_2;
  const isDark = getIsDark();
  const color1 = pickColor(s1, isDark) ?? 'var(--dark-brown)';
  const color2 = pickColor(s2, isDark) ?? 'var(--dark-brown)';
  const [votes1, setVotes1] = useState(rivalry.school_1_vote_count);
  const [votes2, setVotes2] = useState(rivalry.school_2_vote_count);
  const [voted, setVoted] = useState<string | null>(null);
  const [takeContent, setTakeContent] = useState('');
  const [submittingTake, setSubmittingTake] = useState(false);

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

  async function handleSubmitTake(e: React.FormEvent) {
    e.preventDefault();
    if (!takeContent.trim() || submittingTake) return;

    setSubmittingTake(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmittingTake(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();

    await supabase.from('rivalry_takes').insert({
      rivalry_id: rivalry.id,
      user_id: user.id,
      content: takeContent.trim(),
      school_id: profile?.school_id ?? null,
    });

    setTakeContent('');
    setSubmittingTake(false);
    router.refresh();
  }

  return (
    <div>
      {/* Rivalry header */}
      <div className="post-card post-rivalry">
        <div className="rivalry-header">
          <div className="rivalry-label">Rivalry Ring</div>
          <div className="rivalry-title">{rivalry.name}</div>
        </div>
        <div className="rivalry-body">
          {rivalry.description && (
            <p style={{ color: 'var(--faded-ink)', fontSize: '0.85rem', marginBottom: 16 }}>
              {rivalry.description}
            </p>
          )}

          {/* Vote buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '16px 0' }}>
            <button
              onClick={() => s1 && handleVote(s1.id)}
              disabled={!!voted}
              style={{
                background: voted === s1?.id ? color1 : 'transparent',
                color: voted === s1?.id ? '#fff' : color1,
                border: `2px solid ${color1}`,
                padding: '12px 28px',
                borderRadius: 2,
                cursor: voted ? 'default' : 'pointer',
                fontFamily: 'var(--serif)',
                fontWeight: 700,
                fontSize: '1rem',
                opacity: voted && voted !== s1?.id ? 0.5 : 1,
              }}
            >
              {s1?.name ?? 'Team A'}
            </button>

            <span style={{ fontFamily: 'var(--serif)', fontWeight: 800, color: 'var(--faded-ink)' }}>VS</span>

            <button
              onClick={() => s2 && handleVote(s2.id)}
              disabled={!!voted}
              style={{
                background: voted === s2?.id ? color2 : 'transparent',
                color: voted === s2?.id ? '#fff' : color2,
                border: `2px solid ${color2}`,
                padding: '12px 28px',
                borderRadius: 2,
                cursor: voted ? 'default' : 'pointer',
                fontFamily: 'var(--serif)',
                fontWeight: 700,
                fontSize: '1rem',
                opacity: voted && voted !== s2?.id ? 0.5 : 1,
              }}
            >
              {s2?.name ?? 'Team B'}
            </button>
          </div>

          <VoteBar
            votesA={votes1}
            votesB={votes2}
            labelA={s1?.abbreviation ?? 'A'}
            labelB={s2?.abbreviation ?? 'B'}
            colorA={color1}
            colorB={color2}
          />
        </div>
      </div>

      {/* Submit a take */}
      <form onSubmit={handleSubmitTake} className="composer" style={{ marginTop: 8 }}>
        <textarea
          value={takeContent}
          onChange={(e) => setTakeContent(e.target.value)}
          placeholder="Drop your take on this rivalry..."
          className="composer-input"
          rows={2}
          maxLength={500}
        />
        <div className="composer-footer">
          <div />
          <button
            type="submit"
            disabled={!takeContent.trim() || submittingTake}
            className="composer-submit"
            style={{ opacity: !takeContent.trim() || submittingTake ? 0.5 : 1 }}
          >
            {submittingTake ? 'Posting...' : 'Drop Take'}
          </button>
        </div>
      </form>

      {/* Takes list */}
      {takes.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.7rem',
            letterSpacing: 2,
            color: 'var(--faded-ink)',
            textTransform: 'uppercase',
            marginBottom: 12,
            paddingBottom: 4,
            borderBottom: '1px solid rgba(59,47,30,0.1)',
          }}>
            Hot Takes ({takes.length})
          </div>
          {takes.map((take) => (
            <div key={take.id} className="content-card" style={{ padding: '12px 12px 12px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', fontWeight: 600 }}>
                  @{take.user?.username ?? 'unknown'}
                </span>
                {take.school && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: isDark ? '#000' : '#fff',
                    background: pickColor(take.school, isDark) ?? take.school.primary_color,
                    padding: '1px 6px',
                    borderRadius: 2,
                  }}>
                    {take.school.abbreviation}
                  </span>
                )}
              </div>
              <p className="post-body" style={{ fontSize: '0.9rem' }}>{take.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
