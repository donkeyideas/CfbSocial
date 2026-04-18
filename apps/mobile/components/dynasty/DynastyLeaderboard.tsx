import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { SchoolBadge } from '@/components/ui/SchoolBadge';
import { DynastyBadge } from '@/components/ui/DynastyBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';

interface LeaderboardEntry {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  dynasty_tier: string | null;
  xp: number;
  level: number;
  school: {
    abbreviation: string;
    primary_color: string;
    slug: string | null;
  } | null;
}

export function DynastyLeaderboard() {
  const colors = useColors();
  const router = useRouter();
  const { dark } = useSchoolTheme();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    listContent: {
      padding: 16,
      gap: 8,
      paddingBottom: 80,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
    },
    topRow: {
      borderColor: colors.secondary,
    },
    rank: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      width: 30,
      textAlign: 'center',
    },
    info: {
      flex: 1,
      gap: 4,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    name: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    xpAmount: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.secondary,
      letterSpacing: 0.3,
    },
    levelText: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 0.3,
    },
  }), [colors]);

  const fetchLeaderboard = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, dynasty_tier, xp, level, school:schools!profiles_school_id_fkey(abbreviation, primary_color, secondary_color, slug)')
      .order('xp', { ascending: false })
      .limit(25);

    if (!error && data) {
      setEntries(data as unknown as LeaderboardEntry[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={dark} />
      </View>
    );
  }

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { color: colors.secondary };
    if (rank <= 3) return { color: dark };
    return { color: colors.textMuted };
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;

    return (
      <Pressable
        style={[styles.row, rank <= 3 && styles.topRow]}
        onPress={() => {
          if (item.username) {
            router.push(`/profile/${item.username}` as never);
          }
        }}
      >
        <Text style={[styles.rank, getRankStyle(rank)]}>
          {rank}
        </Text>
        <Avatar
          url={item.avatar_url}
          name={item.display_name || item.username}
          size={40}
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.display_name || item.username || 'Anonymous'}
            </Text>
            <DynastyBadge tier={item.dynasty_tier} />
          </View>
          <View style={styles.statsRow}>
            {item.school && (
              <SchoolBadge
                abbreviation={item.school.abbreviation}
                color={item.school.primary_color}
                slug={item.school.slug}
                small
              />
            )}
            <Text style={styles.xpAmount}>{item.xp.toLocaleString()} XP</Text>
            <Text style={styles.levelText}>Lv. {item.level}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={dark}
        />
      }
      ListEmptyComponent={
        <EmptyState
          title="No dynasty leaders yet"
          subtitle="Start earning XP to climb the ranks."
        />
      }
    />
  );
}
