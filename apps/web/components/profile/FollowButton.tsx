'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface FollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
}

export function FollowButton({ userId, initialFollowing }: FollowButtonProps) {
  const { userId: currentUserId } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialFollowing ?? false);
  const [loading, setLoading] = useState(!initialFollowing && initialFollowing === undefined);

  const supabase = createClient();

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    if (currentUserId === userId) {
      setLoading(false);
      return;
    }

    if (initialFollowing === undefined) {
      supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          setIsFollowing(!!data);
          setLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentUserId]);

  // Don't show button for own profile or when not logged in
  if (currentUserId === userId || (!currentUserId && !loading)) return null;

  async function handleToggle() {
    if (!currentUserId) return;
    setLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId);

      if (!error) setIsFollowing(false);
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: userId });

      if (!error) {
        setIsFollowing(true);
        // Send follow notification
        await supabase.from('notifications').insert({
          recipient_id: userId,
          actor_id: currentUserId,
          type: 'FOLLOW',
        });
      }
    }

    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
        isFollowing
          ? 'border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:border-[var(--error)] hover:text-[var(--error)]'
          : 'btn-school'
      }`}
    >
      {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
