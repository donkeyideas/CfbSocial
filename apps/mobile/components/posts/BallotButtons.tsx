import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme/ThemeProvider';
import { withAlpha } from '@/lib/theme/utils';
import { typography } from '@/lib/theme/typography';

interface BallotButtonsProps {
  postId: string;
  authorId: string;
  initialTdCount: number;
  initialFmCount: number;
  /** Pre-fetched user vote to avoid per-post query. undefined = not pre-fetched (will query). */
  prefetchedVote?: 'TOUCHDOWN' | 'FUMBLE' | null;
}

export function BallotButtons({
  postId,
  authorId,
  initialTdCount,
  initialFmCount,
  prefetchedVote,
}: BallotButtonsProps) {
  const colors = useColors();
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const { showAlert } = useThemedAlert();
  const [voted, setVoted] = useState<'TOUCHDOWN' | 'FUMBLE' | null>(null);
  const [tdCount, setTdCount] = useState(initialTdCount);
  const [fmCount, setFmCount] = useState(initialFmCount);
  const [voting, setVoting] = useState(false);
  const mountedRef = useRef(true);

  // Sync counts when props change (e.g. pull-to-refresh)
  useEffect(() => {
    setTdCount(initialTdCount);
    setFmCount(initialFmCount);
  }, [initialTdCount, initialFmCount]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    button: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    buttonText: {
      fontFamily: typography.mono,
      fontSize: 12,
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    tdActive: {
      backgroundColor: withAlpha(colors.success, 0.15),
      borderColor: colors.success,
    },
    tdActiveText: {
      color: colors.success,
    },
    fmActive: {
      backgroundColor: withAlpha(colors.crimson, 0.15),
      borderColor: colors.crimson,
    },
    fmActiveText: {
      color: colors.crimson,
    },
  }), [colors]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Use pre-fetched vote if available, otherwise query on mount
  useEffect(() => {
    if (prefetchedVote !== undefined) {
      setVoted(prefetchedVote);
      return;
    }
    if (!userId) return;

    supabase
      .from('reactions')
      .select('reaction_type')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (mountedRef.current && data) {
          setVoted(data.reaction_type as 'TOUCHDOWN' | 'FUMBLE');
        }
      });
  }, [userId, postId, prefetchedVote]);

  const handleVote = useCallback(
    async (type: 'TOUCHDOWN' | 'FUMBLE') => {
      if (!userId) {
        showAlert('Bench Warmer', 'You must be signed in to vote.');
        return;
      }
      if (voting) return;
      setVoting(true);

      const previousVoted = voted;
      const previousTd = tdCount;
      const previousFm = fmCount;

      try {
        if (voted === type) {
          // Un-vote: remove reaction
          setVoted(null);
          if (type === 'TOUCHDOWN') setTdCount((c) => c - 1);
          else setFmCount((c) => c - 1);

          const { error } = await supabase
            .from('reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId);

          if (error) throw error;
        } else {
          // New vote or switch vote
          if (voted) {
            // Switching: adjust old count down
            if (voted === 'TOUCHDOWN') setTdCount((c) => c - 1);
            else setFmCount((c) => c - 1);
          }

          setVoted(type);
          if (type === 'TOUCHDOWN') setTdCount((c) => c + 1);
          else setFmCount((c) => c + 1);

          // Remove any existing reaction first
          if (voted) {
            await supabase
              .from('reactions')
              .delete()
              .eq('post_id', postId)
              .eq('user_id', userId);
          }

          const { error } = await supabase.from('reactions').insert({
            post_id: postId,
            user_id: userId,
            reaction_type: type,
          });

          if (error) throw error;

          // Send notification for TD votes
          if (type === 'TOUCHDOWN' && authorId !== userId) {
            await supabase.from('notifications').insert({
              type: 'TD',
              recipient_id: authorId,
              actor_id: userId,
              post_id: postId,
            });
          }
        }
      } catch (err) {
        // Rollback on error and notify user
        console.error('BallotButtons: vote failed:', err);
        if (mountedRef.current) {
          setVoted(previousVoted);
          setTdCount(previousTd);
          setFmCount(previousFm);
          showAlert('Incomplete Pass', 'Vote failed. Please try again.');
        }
      } finally {
        if (mountedRef.current) {
          setVoting(false);
        }
      }
    },
    [userId, voted, tdCount, fmCount, postId, authorId, voting]
  );

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.button,
          voted === 'TOUCHDOWN' && styles.tdActive,
        ]}
        onPress={() => handleVote('TOUCHDOWN')}
        disabled={voting}
      >
        <Text
          style={[
            styles.buttonText,
            voted === 'TOUCHDOWN' && styles.tdActiveText,
          ]}
        >
          TD {tdCount}
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.button,
          voted === 'FUMBLE' && styles.fmActive,
        ]}
        onPress={() => handleVote('FUMBLE')}
        disabled={voting}
      >
        <Text
          style={[
            styles.buttonText,
            voted === 'FUMBLE' && styles.fmActiveText,
          ]}
        >
          FMB {fmCount}
        </Text>
      </Pressable>
    </View>
  );
}
