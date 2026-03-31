'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

const categories = [
  { value: 'GAME_OUTCOME', label: 'Game Outcome' },
  { value: 'SEASON_RECORD', label: 'Season Record' },
  { value: 'PLAYER_PERFORMANCE', label: 'Player Performance' },
  { value: 'RECRUITING', label: 'Recruiting' },
  { value: 'AWARD', label: 'Award' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function CreatePrediction() {
  const router = useRouter();
  const { profile } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('GAME_OUTCOME');
  const [targetDate, setTargetDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'var(--ink)',
          color: 'var(--cream)',
          border: 'none',
          borderRadius: 2,
          fontFamily: 'var(--sans)',
          fontSize: '0.8rem',
          fontWeight: 600,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        File a Prediction
      </button>
    );
  }

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);

    try {
      if (!profile?.id) return;
      const supabase = createClient();

      // Create the post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: profile.id,
          content: text.trim(),
          post_type: 'PREDICTION',
          school_id: profile.school_id ?? null,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Create the prediction record
      const { error: predError } = await supabase
        .from('predictions')
        .insert({
          user_id: profile.id,
          post_id: post.id,
          prediction_text: text.trim(),
          category,
          target_date: targetDate || null,
        });

      if (predError) throw predError;

      setText('');
      setCategory('GAME_OUTCOME');
      setTargetDate('');
      setExpanded(false);
      router.refresh();
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="gridiron-card"
      style={{
        padding: 16,
        marginBottom: 16,
        borderLeft: '4px solid var(--gold)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          marginBottom: 12,
        }}
      >
        File Your Prediction
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's your call? e.g., 'Alabama finishes 10-2 this season'"
        maxLength={500}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontFamily: 'var(--mono, monospace)',
          fontSize: '0.85rem',
          background: 'var(--warm-white, #faf8f0)',
          border: '1px solid var(--border)',
          borderRadius: 2,
          minHeight: 80,
          resize: 'vertical',
          color: 'var(--ink)',
        }}
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: '6px 10px',
            fontFamily: 'var(--sans)',
            fontSize: '0.8rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 2,
            color: 'var(--ink)',
          }}
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          style={{
            padding: '6px 10px',
            fontFamily: 'var(--sans)',
            fontSize: '0.8rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 2,
            color: 'var(--ink)',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: text.trim() ? 'var(--crimson)' : 'var(--text-muted)',
            color: 'var(--cream)',
            border: 'none',
            borderRadius: 2,
            fontFamily: 'var(--sans)',
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Filing...' : 'Publish Prediction'}
        </button>
        <button
          onClick={() => setExpanded(false)}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: 2,
            fontFamily: 'var(--sans)',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
