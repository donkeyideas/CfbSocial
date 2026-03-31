'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface MarkForAgingButtonProps {
  postId: string;
}

export function MarkForAgingButton({ postId }: MarkForAgingButtonProps) {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [days, setDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <Link
        href="/receipts"
        className="post-action"
        style={{ textDecoration: 'none', color: 'var(--crimson)' }}
      >
        RECEIPT FILED
      </Link>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="post-action"
      >
        REVISIT
      </button>
    );
  }

  async function handleSubmit() {
    if (!userId) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Check if already filed
      const { data: existing } = await supabase
        .from('aging_takes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        setDone(true);
        setExpanded(false);
        return;
      }

      const revisitDate = new Date();
      revisitDate.setDate(revisitDate.getDate() + days);

      const { error: insertError } = await supabase
        .from('aging_takes')
        .insert({
          post_id: postId,
          user_id: userId,
          revisit_date: revisitDate.toISOString(),
        });

      if (insertError) throw insertError;
      setDone(true);
      setExpanded(false);
      router.refresh();
    } catch (err) {
      setError('Failed to file receipt');
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <select
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        style={{
          padding: '2px 6px',
          fontFamily: 'var(--sans)',
          fontSize: '0.7rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 2,
          color: 'var(--ink)',
        }}
      >
        <option value={7}>7 days</option>
        <option value={14}>14 days</option>
        <option value={30}>30 days</option>
        <option value={60}>60 days</option>
        <option value={90}>90 days</option>
      </select>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          padding: '2px 8px',
          fontFamily: 'var(--sans)',
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          background: 'var(--crimson)',
          color: 'var(--cream)',
          border: 'none',
          borderRadius: 2,
          cursor: 'pointer',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? '...' : 'Set'}
      </button>
      <button
        onClick={() => setExpanded(false)}
        style={{
          padding: '2px 6px',
          fontFamily: 'var(--sans)',
          fontSize: '0.7rem',
          background: 'transparent',
          color: 'var(--text-muted)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        x
      </button>
      {error && (
        <span style={{ fontSize: '0.65rem', color: '#c04040' }}>{error}</span>
      )}
    </div>
  );
}
