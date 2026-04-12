import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

interface ChaosLevel {
  label: string;
  description: string;
  color: string;
}

const CHAOS_LEVELS: ChaosLevel[] = [
  { label: 'CALM', description: 'Off-season vibes', color: '#4a7c59' },
  { label: 'MODERATE', description: 'Steady discourse', color: '#c9a84c' },
  { label: 'ELEVATED', description: 'Takes are flowing', color: '#d4880f' },
  { label: 'HIGH CHAOS', description: 'Rivalry week energy', color: '#8b1a1a' },
  { label: 'MAXIMUM CHAOS', description: 'The boards are on fire', color: '#5c0d0d' },
];

function getChaosLevel(score: number): ChaosLevel {
  if (score >= 80) return CHAOS_LEVELS[4];
  if (score >= 60) return CHAOS_LEVELS[3];
  if (score >= 40) return CHAOS_LEVELS[2];
  if (score >= 20) return CHAOS_LEVELS[1];
  return CHAOS_LEVELS[0];
}

export function ChaosMeter() {
  const colors = useColors();
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const barWidth = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontFamily: typography.serifBold,
      fontSize: 16,
      color: colors.ink,
      letterSpacing: 0.5,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    scoreNumber: {
      fontFamily: typography.serifBold,
      fontSize: 36,
    },
    scoreMax: {
      fontFamily: typography.mono,
      fontSize: 14,
      color: colors.textMuted,
      marginLeft: 2,
    },
    barBg: {
      width: '100%',
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 5,
    },
    levelBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 10,
      marginTop: 4,
    },
    levelText: {
      fontFamily: typography.sansBold,
      fontSize: 11,
      color: colors.textInverse,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    levelDescription: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
  }), [colors]);

  const fetchChaosData = useCallback(async () => {
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    try {
      const [postsRes, challengesRes, flaggedRes, portalRes] = await Promise.all([
        // Posts in last 24h
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PUBLISHED')
          .gte('created_at', twentyFourHoursAgo),

        // Challenges in last 24h
        supabase
          .from('challenges')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', twentyFourHoursAgo),

        // Flagged posts in last 24h
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'FLAGGED')
          .gte('flagged_at', twentyFourHoursAgo),

        // Portal moves in last 24h
        supabase
          .from('portal_players')
          .select('id', { count: 'exact', head: true })
          .in('status', ['IN_PORTAL', 'COMMITTED'])
          .gte('created_at', twentyFourHoursAgo),
      ]);

      const posts = postsRes.count ?? 0;
      const challenges = challengesRes.count ?? 0;
      const flags = flaggedRes.count ?? 0;
      const portal = portalRes.count ?? 0;

      // Calculate score (0-100)
      const postPoints = Math.min(30, (posts / 50) * 30);
      const challengePoints = Math.min(25, (challenges / 10) * 25);
      const flagPoints = Math.min(20, (flags / 5) * 20);
      const portalPoints = Math.min(25, (portal / 10) * 25);

      const total = Math.round(postPoints + challengePoints + flagPoints + portalPoints);
      setScore(total);
    } catch (err) {
      console.warn('ChaosMeter: failed to fetch:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchChaosData();
  }, [fetchChaosData]);

  // Animate bar width when score changes
  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score, barWidth]);

  if (loading) {
    return null;
  }

  const level = getChaosLevel(score);

  return (
    <View style={styles.card}>
      {/* Header */}
      <Text style={styles.title}>Chaos Meter</Text>

      {/* Score */}
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNumber, { color: level.color }]}>{score}</Text>
        <Text style={styles.scoreMax}>/100</Text>
      </View>

      {/* Bar */}
      <View style={styles.barBg}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: level.color,
              width: barWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Level label */}
      <View style={[styles.levelBadge, { backgroundColor: level.color }]}>
        <Text style={styles.levelText}>{level.label}</Text>
      </View>
      <Text style={styles.levelDescription}>{level.description}</Text>
    </View>
  );
}
