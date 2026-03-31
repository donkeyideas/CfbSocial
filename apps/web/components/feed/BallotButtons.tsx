'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface BallotButtonsProps {
  postId: string;
  authorId?: string;
  touchdownCount: number;
  fumbleCount: number;
}

export function BallotButtons({ postId, authorId, touchdownCount, fumbleCount }: BallotButtonsProps) {
  const router = useRouter();
  const { isLoggedIn, profile } = useAuth();
  const profileId = profile?.id ?? null;
  const [tdCount, setTdCount] = useState(touchdownCount);
  const [fmCount, setFmCount] = useState(fumbleCount);
  const [voted, setVoted] = useState<'TOUCHDOWN' | 'FUMBLE' | null>(null);
  const [voting, setVoting] = useState(false);

  // Load current user's existing reaction on mount
  useEffect(() => {
    if (!profileId) return;

    const supabase = createClient();
    supabase
      .from('reactions')
      .select('reaction_type')
      .eq('post_id', postId)
      .eq('user_id', profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setVoted(data.reaction_type as 'TOUCHDOWN' | 'FUMBLE');
        }
      });
  }, [postId, profileId]);

  async function handleVote(type: 'TOUCHDOWN' | 'FUMBLE') {
    if (isLoggedIn === false) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!profileId || voting) return;
    setVoting(true);

    const supabase = createClient();
    const prevVoted = voted;
    const prevTd = tdCount;
    const prevFm = fmCount;

    try {
      if (voted === type) {
        // Un-vote: remove reaction
        if (type === 'TOUCHDOWN') setTdCount((c) => c - 1);
        else setFmCount((c) => c - 1);
        setVoted(null);

        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('user_id', profileId)
          .eq('post_id', postId);
        if (error) throw error;
        return;
      }

      // Optimistic update
      if (voted) {
        if (voted === 'TOUCHDOWN') setTdCount((c) => c - 1);
        else setFmCount((c) => c - 1);
      }
      if (type === 'TOUCHDOWN') setTdCount((c) => c + 1);
      else setFmCount((c) => c + 1);
      setVoted(type);

      // Delete existing then insert new (handles switching)
      await supabase
        .from('reactions')
        .delete()
        .eq('user_id', profileId)
        .eq('post_id', postId);

      const { error } = await supabase.from('reactions').insert({
        post_id: postId,
        user_id: profileId,
        reaction_type: type,
      });
      if (error) throw error;

      // Create notification for post author
      if (authorId && authorId !== profileId) {
        await supabase.from('notifications').insert({
          recipient_id: authorId,
          actor_id: profileId,
          type: type === 'TOUCHDOWN' ? 'TOUCHDOWN' : 'FUMBLE',
          post_id: postId,
        });
      }
    } catch {
      // Rollback optimistic update
      setVoted(prevVoted);
      setTdCount(prevTd);
      setFmCount(prevFm);
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="post-reactions">
      <button
        className="ballot-btn"
        onClick={() => handleVote('TOUCHDOWN')}
        style={voted === 'TOUCHDOWN' ? { background: 'var(--dark-brown)', color: 'var(--cream)' } : undefined}
      >
        <span className="vote-symbol">&#x2713;</span>
        <span className="vote-label">Touchdown</span>
        <span className="vote-count">{tdCount}</span>
      </button>
      <button
        className="ballot-btn"
        onClick={() => handleVote('FUMBLE')}
        style={voted === 'FUMBLE' ? { background: 'var(--dark-brown)', color: 'var(--cream)' } : undefined}
      >
        <span className="vote-symbol">&#x2717;</span>
        <span className="vote-label">Fumble</span>
        <span className="vote-count">{fmCount}</span>
      </button>
    </div>
  );
}
