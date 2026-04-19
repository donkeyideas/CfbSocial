import { useState, useEffect, useCallback, useMemo } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { WEB_API_URL } from '@/lib/constants';

interface FollowButtonProps {
  targetUserId: string;
}

export function FollowButton({ targetUserId }: FollowButtonProps) {
  const colors = useColors();
  const { profile, session } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    button: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 100,
    },
    followButton: {
      backgroundColor: colors.crimson,
    },
    followingButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
    },
    followText: {
      color: '#f4efe4',
    },
    followingText: {
      color: colors.ink,
    },
  }), [colors]);

  const checkFollowing = useCallback(async () => {
    if (!userId || userId === targetUserId) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', targetUserId)
      .maybeSingle();

    setIsFollowing(!!data);
    setLoading(false);
  }, [userId, targetUserId]);

  useEffect(() => {
    checkFollowing();
  }, [checkFollowing]);

  // Don't show on own profile
  if (!userId || userId === targetUserId) {
    return null;
  }

  async function handleToggle() {
    if (toggling || !userId) return;
    setToggling(true);

    if (isFollowing) {
      // Unfollow
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', targetUserId);
      setIsFollowing(false);
    } else {
      // Follow
      await supabase.from('follows').insert({
        follower_id: userId,
        following_id: targetUserId,
      });

      // Insert FOLLOW notification + dispatch push
      const { data: notifRow } = await supabase.from('notifications').insert({
        recipient_id: targetUserId,
        actor_id: userId,
        type: 'FOLLOW',
      }).select('id').single();

      if (notifRow && session?.access_token) {
        fetch(`${WEB_API_URL}/api/push/dispatch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ notificationId: notifRow.id }),
        }).catch(() => {});
      }

      setIsFollowing(true);
    }

    setToggling(false);
  }

  if (loading) {
    return (
      <Pressable style={[styles.button, styles.followingButton]} disabled>
        <ActivityIndicator size="small" color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[
        styles.button,
        isFollowing ? styles.followingButton : { backgroundColor: dark },
      ]}
      onPress={handleToggle}
      disabled={toggling}
    >
      {toggling ? (
        <ActivityIndicator
          size="small"
          color={isFollowing ? colors.ink : '#f4efe4'}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isFollowing ? styles.followingText : styles.followText,
          ]}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </Pressable>
  );
}
