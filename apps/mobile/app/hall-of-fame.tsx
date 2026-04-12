import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Avatar } from '@/components/ui/Avatar';
import { SchoolBadge } from '@/components/ui/SchoolBadge';
import { DynastyBadge } from '@/components/ui/DynastyBadge';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { OrnamentDivider } from '@/components/ui/OrnamentDivider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { withAlpha } from '@/lib/theme/utils';
import { typography } from '@/lib/theme/typography';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';

interface LeaderEntry {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  dynasty_tier: string | null;
  xp: number;
  level: number;
  touchdown_count: number;
  follower_count: number;
  post_count: number;
  correct_predictions: number;
  prediction_count: number;
  school: {
    abbreviation: string;
    primary_color: string;
    slug: string | null;
  } | null;
}

const RANK_COLORS: Record<number, string> = {
  1: '#c9a84c',  // gold
  2: '#8b1a1a',  // crimson
  3: '#8b1a1a',  // crimson
};

export default function HallOfFameScreen() {
  const colors = useColors();
  const { dark } = useSchoolTheme();
  const router = useRouter();
  const [dynastyLeaders, setDynastyLeaders] = useState<LeaderEntry[]>([]);
  const [tdLeaders, setTdLeaders] = useState<LeaderEntry[]>([]);
  const [followedLeaders, setFollowedLeaders] = useState<LeaderEntry[]>([]);
  const [ironMen, setIronMen] = useState<LeaderEntry[]>([]);
  const [oracleBoard, setOracleBoard] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    pageTitle: {
      fontFamily: typography.serifBold,
      fontSize: 28,
      color: colors.ink,
      textAlign: 'center',
      letterSpacing: 1,
    },
    section: {
      paddingHorizontal: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: withAlpha(colors.border, 0.5),
    },
    rowHighlighted: {
      backgroundColor: withAlpha(colors.secondary, 0.06),
    },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: {
      fontFamily: typography.sansBold,
      fontSize: 13,
    },
    nameSection: {
      flex: 1,
      gap: 3,
    },
    rowName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    rowBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metricValue: {
      fontFamily: typography.mono,
      fontSize: 14,
      color: colors.textSecondary,
      letterSpacing: 0.5,
      minWidth: 40,
      textAlign: 'right',
    },
    emptyText: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 16,
    },
  }), [colors]);

  const selectFields = `
    id, username, display_name, avatar_url, dynasty_tier,
    xp, level, touchdown_count, follower_count, post_count,
    correct_predictions, prediction_count,
    school:schools!profiles_school_id_fkey(
      abbreviation, primary_color, slug
    )
  `;

  const fetchLeaderboards = useCallback(async () => {
    try {
      const [dynasty, td, followed, iron, oracle] = await Promise.all([
        // Dynasty Leaders: top 15 by xp
        supabase
          .from('profiles')
          .select(selectFields)
          .order('xp', { ascending: false })
          .limit(15),

        // Touchdown Leaders: top 10 by touchdown_count
        supabase
          .from('profiles')
          .select(selectFields)
          .order('touchdown_count', { ascending: false })
          .limit(10),

        // Most Followed: top 10 by follower_count
        supabase
          .from('profiles')
          .select(selectFields)
          .order('follower_count', { ascending: false })
          .limit(10),

        // Iron Men: top 10 by post_count
        supabase
          .from('profiles')
          .select(selectFields)
          .order('post_count', { ascending: false })
          .limit(10),

        // Oracle Board: top 10 by correct_predictions (filter prediction_count > 0)
        supabase
          .from('profiles')
          .select(selectFields)
          .gt('prediction_count', 0)
          .order('correct_predictions', { ascending: false })
          .limit(10),
      ]);

      if (dynasty.data) setDynastyLeaders(dynasty.data as unknown as LeaderEntry[]);
      if (td.data) setTdLeaders(td.data as unknown as LeaderEntry[]);
      if (followed.data) setFollowedLeaders(followed.data as unknown as LeaderEntry[]);
      if (iron.data) setIronMen(iron.data as unknown as LeaderEntry[]);
      if (oracle.data) setOracleBoard(oracle.data as unknown as LeaderEntry[]);
    } catch (err) {
      console.warn('HallOfFame: failed to fetch leaderboards:', err);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaderboards();
  }, [fetchLeaderboards]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchLeaderboards();
    setRefreshing(false);
  }

  function navigateToProfile(username: string) {
    router.push(`/profile/${username}` as never);
  }

  function renderLeaderRow(entry: LeaderEntry, rank: number, metric: string | number) {
    const isTop3 = rank <= 3;
    const rankColor = RANK_COLORS[rank] || colors.textMuted;
    const displayName = entry.display_name || entry.username;

    return (
      <View key={entry.id} style={[styles.row, isTop3 && styles.rowHighlighted]}>
        {/* Rank badge */}
        <View
          style={[
            styles.rankBadge,
            { backgroundColor: isTop3 ? rankColor : colors.surface },
          ]}
        >
          <Text
            style={[
              styles.rankText,
              { color: isTop3 ? colors.textInverse : colors.textMuted },
            ]}
          >
            {rank}
          </Text>
        </View>

        {/* Avatar */}
        <Avatar url={entry.avatar_url} name={displayName} size={36} />

        {/* Name + badges */}
        <Pressable
          style={styles.nameSection}
          onPress={() => navigateToProfile(entry.username)}
        >
          <Text style={styles.rowName} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.rowBadges}>
            {entry.school && (
              <SchoolBadge
                abbreviation={entry.school.abbreviation}
                color={entry.school.primary_color}
                slug={entry.school.slug}
                small
              />
            )}
            <DynastyBadge tier={entry.dynasty_tier} />
          </View>
        </Pressable>

        {/* Metric */}
        <Text style={[styles.metricValue, isTop3 && { color: rankColor }]}>
          {metric}
        </Text>
      </View>
    );
  }

  function renderSection(
    title: string,
    data: LeaderEntry[],
    getMetric: (entry: LeaderEntry) => string | number,
  ) {
    return (
      <View style={styles.section}>
        <SectionLabel text={title} />
        {data.length === 0 ? (
          <Text style={styles.emptyText}>No data yet</Text>
        ) : (
          data.map((entry, index) =>
            renderLeaderRow(entry, index + 1, getMetric(entry))
          )
        )}
      </View>
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={dark}
          />
        }
      >
        <Text style={styles.pageTitle}>Hall of Fame</Text>
        <OrnamentDivider />

        {/* Dynasty Leaders */}
        {renderSection('Dynasty Leaders', dynastyLeaders, (e) => `Lvl ${e.level}`)}
        <OrnamentDivider />

        {/* Touchdown Leaders */}
        {renderSection('Touchdown Leaders', tdLeaders, (e) => e.touchdown_count)}
        <OrnamentDivider />

        {/* Most Followed */}
        {renderSection('Most Followed', followedLeaders, (e) => e.follower_count)}
        <OrnamentDivider />

        {/* Iron Men */}
        {renderSection('Iron Men', ironMen, (e) => e.post_count)}
        <OrnamentDivider />

        {/* Oracle Board */}
        {renderSection('Oracle Board', oracleBoard, (e) => e.correct_predictions)}
      </ScrollView>
    </View>
  );
}
