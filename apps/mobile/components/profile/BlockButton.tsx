import { useState, useEffect, useCallback, useMemo } from 'react';
import { Pressable, Text, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

interface BlockButtonProps {
  targetUserId: string;
}

export function BlockButton({ targetUserId }: BlockButtonProps) {
  const colors = useColors();
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    button: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    blockedButton: {
      borderColor: colors.crimson,
    },
    buttonText: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    blockedText: {
      color: colors.crimson,
    },
  }), [colors]);

  const checkBlocked = useCallback(async () => {
    if (!userId || userId === targetUserId) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', userId)
      .eq('blocked_id', targetUserId)
      .maybeSingle();

    setIsBlocked(!!data);
    setLoading(false);
  }, [userId, targetUserId]);

  useEffect(() => {
    checkBlocked();
  }, [checkBlocked]);

  if (!userId || userId === targetUserId || loading) {
    return null;
  }

  async function handleToggle() {
    if (toggling || !userId) return;

    if (!isBlocked) {
      Alert.alert(
        'Block User',
        'Blocking this user will remove them from your feed and prevent them from interacting with you. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              setToggling(true);
              // Remove follows in both directions
              await supabase
                .from('follows')
                .delete()
                .eq('follower_id', userId)
                .eq('following_id', targetUserId);
              await supabase
                .from('follows')
                .delete()
                .eq('follower_id', targetUserId)
                .eq('following_id', userId);
              // Insert block
              await supabase.from('user_blocks').insert({
                blocker_id: userId,
                blocked_id: targetUserId,
              });
              setIsBlocked(true);
              setToggling(false);
            },
          },
        ],
      );
    } else {
      setToggling(true);
      await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', userId)
        .eq('blocked_id', targetUserId);
      setIsBlocked(false);
      setToggling(false);
    }
  }

  return (
    <Pressable
      style={[styles.button, isBlocked && styles.blockedButton]}
      onPress={handleToggle}
      disabled={toggling}
    >
      <Text style={[styles.buttonText, isBlocked && styles.blockedText]}>
        {isBlocked ? 'Unblock' : 'Block'}
      </Text>
    </Pressable>
  );
}
