import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { AppealForm } from '@/components/moderation/AppealForm';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import type { PostData } from './PostCard';

const LABEL_MAP: Record<string, string> = {
  SPAM: 'Illegal Formation',
  HARASSMENT: 'Unsportsmanlike Conduct',
  HATE_SPEECH: 'Targeting',
  OFF_TOPIC: 'Delay of Game',
  POLITICS: 'Unsportsmanlike Conduct',
  MISINFORMATION: 'False Start',
  OTHER: 'Personal Foul',
};

interface PenaltyFlagCardProps {
  post: PostData;
}

export const PenaltyFlagCard = memo(function PenaltyFlagCard({ post }: PenaltyFlagCardProps) {
  const colors = useColors();
  const { userId } = useAuth();

  const label = post.moderation_labels?.[0];
  const penaltyName = label ? (LABEL_MAP[label] || 'Personal Foul') : 'Unsportsmanlike Conduct';
  const isOwnPost = userId === post.author_id;

  const styles = useMemo(() => StyleSheet.create({
    outerBorder: {
      marginHorizontal: 12,
      marginVertical: 4,
      borderWidth: 3,
      borderColor: colors.borderStrong,
      borderStyle: 'dashed',
      borderRadius: 6,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 3,
      padding: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 12,
    },
    flagIcon: {
      fontSize: 32,
      color: colors.borderStrong,
      marginTop: -4,
    },
    headerTextWrap: {
      flex: 1,
    },
    penaltyLabel: {
      fontFamily: typography.serifBold,
      fontSize: 18,
      color: colors.ink,
      letterSpacing: 1,
    },
    penaltyName: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: colors.crimson,
      letterSpacing: 1,
      marginTop: 2,
    },
    reason: {
      fontFamily: typography.sans,
      fontSize: 14,
      lineHeight: 21,
      color: colors.ink,
      marginBottom: 10,
    },
    warning: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: 4,
    },
  }), [colors]);

  return (
    <View style={styles.outerBorder}>
      <View style={styles.card}>
        {/* Penalty header */}
        <View style={styles.headerRow}>
          <Text style={styles.flagIcon}>{'\u2691'}</Text>
          <View style={styles.headerTextWrap}>
            <Text style={styles.penaltyLabel}>PENALTY --</Text>
            <Text style={styles.penaltyName}>{penaltyName.toUpperCase()}</Text>
          </View>
        </View>

        {/* Moderation reason */}
        <Text style={styles.reason}>
          {post.moderation_reason || 'This post has been flagged for review by moderation. This post has been assessed a 15-yard penalty and loss of visibility.'}
        </Text>

        {/* Warning */}
        <Text style={styles.warning}>
          Repeated violations may result in ejection from the thread.
        </Text>

        {/* Appeal link for post owner */}
        {isOwnPost && <AppealForm postId={post.id} />}
      </View>
    </View>
  );
});
