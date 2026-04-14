import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

interface DynastyPlaqueProps {
  level: number;
  xp: number;
  tier: string | null;
  accentColor?: string;
  posts: number;
  touchdowns: number;
  predictions: number;
}

const TIER_LABELS: Record<string, string> = {
  WALK_ON: 'Walk-On',
  STARTER: 'Starter',
  ALL_CONFERENCE: 'All-Conference',
  ALL_AMERICAN: 'All-American',
  HEISMAN: 'Heisman',
  HALL_OF_FAME: 'Hall of Fame',
};

export function DynastyPlaque({
  level,
  xp,
  tier,
  accentColor,
  posts,
  touchdowns,
  predictions,
}: DynastyPlaqueProps) {
  const colors = useColors();
  const accent = accentColor || colors.crimson;
  const xpForNext = level * 500;
  const xpPct = Math.min((xp / xpForNext) * 100, 100);
  const tierLabel = tier ? TIER_LABELS[tier] || tier.replace(/_/g, ' ') : 'Walk-On';

  const styles = useMemo(() => StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: colors.surfaceRaised,
    },
    header: {
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    headerText: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: '#f4efe4',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    body: {
      padding: 14,
      gap: 14,
    },
    levelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    levelText: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: colors.textPrimary,
    },
    tierText: {
      fontFamily: typography.mono,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    xpSection: {
      gap: 6,
    },
    xpLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    xpLabel: {
      fontFamily: typography.sansSemiBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    xpValue: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 0.3,
    },
    xpBarBg: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    xpBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: 4,
    },
    statItem: {
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      fontFamily: typography.sansBold,
      fontSize: 16,
      color: colors.textPrimary,
    },
    statLabel: {
      fontFamily: typography.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
  }), [colors]);

  return (
    <View style={styles.card}>
      {/* Header bar */}
      <View style={[styles.header, { backgroundColor: accent }]}>
        <Text style={styles.headerText}>Dynasty Stats</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Level and Tier */}
        <View style={styles.levelRow}>
          <Text style={styles.levelText}>Level {level}</Text>
          <Text style={[styles.tierText, { color: accent }]}>{tierLabel}</Text>
        </View>

        {/* XP Progress */}
        <View style={styles.xpSection}>
          <View style={styles.xpLabelRow}>
            <Text style={styles.xpLabel}>XP Progress</Text>
            <Text style={styles.xpValue}>
              {xp} / {xpForNext}
            </Text>
          </View>
          <View style={styles.xpBarBg}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${xpPct}%`, backgroundColor: accent },
              ]}
            />
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{posts}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{touchdowns}</Text>
            <Text style={styles.statLabel}>TDs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{predictions}</Text>
            <Text style={styles.statLabel}>Predictions</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
