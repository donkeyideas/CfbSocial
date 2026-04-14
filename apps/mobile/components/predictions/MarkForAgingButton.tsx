import { useState, useMemo } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';

interface MarkForAgingButtonProps {
  postId: string;
}

export function MarkForAgingButton({ postId }: MarkForAgingButtonProps) {
  const colors = useColors();
  const { session, profile } = useAuth();
  const userId = profile?.id ?? null;
  const router = useRouter();
  const { showAlert } = useThemedAlert();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    button: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'flex-start',
    },
    submitted: {
      borderColor: colors.success,
      backgroundColor: colors.success,
    },
    text: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textSecondary,
      letterSpacing: 1,
    },
    submittedText: {
      color: '#f4efe4',
    },
  }), [colors]);

  const handlePress = async () => {
    if (!session || !userId) {
      router.push('/(auth)/login' as never);
      return;
    }

    if (submitting || submitted) return;

    setSubmitting(true);

    const revisitDate = new Date();
    revisitDate.setDate(revisitDate.getDate() + 30);

    const { error } = await supabase.from('aging_takes').insert({
      post_id: postId,
      user_id: userId,
      revisit_date: revisitDate.toISOString(),
    });

    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        showAlert('Offsides', 'You already marked this take for review.');
        setSubmitted(true);
      } else {
        showAlert('Incomplete Pass', 'Failed to mark for aging. Please try again.');
      }
      return;
    }

    setSubmitted(true);
  };

  return (
    <Pressable
      style={[styles.button, submitted && styles.submitted]}
      onPress={handlePress}
      disabled={submitting || submitted}
    >
      <Text style={[styles.text, submitted && styles.submittedText]}>
        {submitted ? 'FILED' : submitting ? '...' : 'REVISIT'}
      </Text>
    </Pressable>
  );
}
