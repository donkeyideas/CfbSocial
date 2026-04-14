import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';

const CATEGORY_ABBREV: Record<string, string> = {
  SOCIAL: 'S',
  PREDICTION: 'P',
  RIVALRY: 'R',
  RECRUITING: 'RC',
  ENGAGEMENT: 'E',
  MILESTONE: 'M',
};

export interface AchievementData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  xp_reward: number;
  earned_at?: string | null;
  unlocked?: boolean;
}

interface AchievementCardProps {
  achievement: AchievementData;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const colors = useColors();
  const isUnlocked = achievement.unlocked !== false && !!achievement.earned_at;
  const abbrev = CATEGORY_ABBREV[achievement.category] || achievement.category?.[0] || '?';

  const styles = useMemo(() => StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
    },
    unlocked: {
      borderColor: colors.secondary,
      opacity: 1,
    },
    locked: {
      borderColor: colors.border,
      opacity: 0.6,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleUnlocked: {
      backgroundColor: colors.secondary,
    },
    iconText: {
      fontFamily: typography.sansBold,
      fontSize: 14,
      color: colors.textMuted,
    },
    iconTextUnlocked: {
      color: '#f4efe4',
    },
    content: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontFamily: typography.serifBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    description: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    earnedDate: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.success,
      marginTop: 2,
      letterSpacing: 0.3,
    },
    lockedText: {
      color: colors.textMuted,
    },
    xpBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    xpBadgeUnlocked: {
      borderColor: colors.secondary,
      backgroundColor: colors.secondary,
    },
    xpText: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    xpTextUnlocked: {
      color: '#f4efe4',
    },
  }), [colors]);

  return (
    <View style={[styles.card, isUnlocked ? styles.unlocked : styles.locked]}>
      {/* Icon circle */}
      <View style={[styles.iconCircle, isUnlocked && styles.iconCircleUnlocked]}>
        <Text style={[styles.iconText, isUnlocked && styles.iconTextUnlocked]}>
          {abbrev}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.name, !isUnlocked && styles.lockedText]}>
          {achievement.name}
        </Text>
        {achievement.description && (
          <Text style={[styles.description, !isUnlocked && styles.lockedText]}>
            {achievement.description}
          </Text>
        )}
        {isUnlocked && achievement.earned_at && (
          <Text style={styles.earnedDate}>
            Earned {formatDate(achievement.earned_at)}
          </Text>
        )}
      </View>

      {/* XP badge */}
      <View style={[styles.xpBadge, isUnlocked && styles.xpBadgeUnlocked]}>
        <Text style={[styles.xpText, isUnlocked && styles.xpTextUnlocked]}>
          +{achievement.xp_reward} XP
        </Text>
      </View>
    </View>
  );
}
