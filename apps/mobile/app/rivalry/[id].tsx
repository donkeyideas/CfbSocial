import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useThemedAlert } from '@/lib/AlertProvider';
import { FightCard, type RivalryData } from '@/components/rivalry/FightCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { SchoolBadge } from '@/components/ui/SchoolBadge';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';

const RIVALRY_SELECT = `
  *,
  school_1:schools!rivalries_school_1_id_fkey(id, name, abbreviation, primary_color, secondary_color, slug, logo_url),
  school_2:schools!rivalries_school_2_id_fkey(id, name, abbreviation, primary_color, secondary_color, slug, logo_url)
`;

interface RivalryTake {
  id: string;
  content: string;
  upvotes: number | null;
  downvotes: number | null;
  created_at: string | null;
  user: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  school: {
    abbreviation: string;
    primary_color: string;
    slug: string | null;
  } | null;
}

export default function RivalryDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useAuth();
  const { showAlert } = useThemedAlert();
  const { dark } = useSchoolTheme();

  const [rivalry, setRivalry] = useState<RivalryData | null>(null);
  const [takes, setTakes] = useState<RivalryTake[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    backButton: {
      paddingTop: 50,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    backText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 15,
      color: colors.crimson,
    },
    fightCardWrapper: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    listContent: {
      paddingBottom: 40,
    },
    takesHeader: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 2,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    takeCard: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 10,
    },
    takeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    takeAuthor: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    takeAuthorName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.ink,
    },
    takeContent: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    takeFooter: {
      flexDirection: 'row',
      marginTop: 8,
    },
    takeVotes: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textMuted,
    },
  }), [colors]);

  const fetchRivalry = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('rivalries')
      .select(RIVALRY_SELECT)
      .eq('id', id)
      .single();
    if (data) {
      setRivalry(data as unknown as RivalryData);
    }
  }, [id]);

  const fetchTakes = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('rivalry_takes')
      .select(`
        id, content, upvotes, downvotes, created_at,
        user:profiles!rivalry_takes_user_id_fkey(id, username, display_name, avatar_url),
        school:schools!rivalry_takes_school_id_fkey(abbreviation, primary_color, slug)
      `)
      .eq('rivalry_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setTakes(data as unknown as RivalryTake[]);
    }
  }, [id]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRivalry(), fetchTakes()]);
    } catch (err) {
      console.warn('Rivalry: failed to load:', err);
    }
    setLoading(false);
    setRefreshing(false);
  }, [fetchRivalry, fetchTakes]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const handleVote = async (rivalryId: string, schoolId: string) => {
    if (!userId) {
      router.push('/(auth)/login' as never);
      return;
    }

    const { data: existing } = await supabase
      .from('rivalry_votes')
      .select('id')
      .eq('rivalry_id', rivalryId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      showAlert('Offsides', 'You have already cast your vote in this rivalry.');
      return;
    }

    const { error } = await supabase.from('rivalry_votes').insert({
      rivalry_id: rivalryId,
      school_id: schoolId,
      user_id: userId,
    });

    if (error) {
      showAlert('Incomplete Pass', 'Could not record your vote. Try again.');
      return;
    }

    // Refresh to get updated counts
    fetchRivalry();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!rivalry) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: dark }]}>Back</Text>
        </Pressable>
        <EmptyState title="Rivalry not found" />
      </View>
    );
  }

  const renderTake = ({ item }: { item: RivalryTake }) => (
    <View style={styles.takeCard}>
      <View style={styles.takeHeader}>
        <Avatar
          url={item.user?.avatar_url}
          name={item.user?.display_name ?? item.user?.username}
          size={32}
        />
        <View style={styles.takeAuthor}>
          <Text style={styles.takeAuthorName}>
            {item.user?.display_name ?? item.user?.username ?? 'Unknown'}
          </Text>
          {item.school && (
            <SchoolBadge
              abbreviation={item.school.abbreviation}
              color={item.school.primary_color}
              slug={item.school.slug}
              small
            />
          )}
        </View>
      </View>
      <Text style={styles.takeContent}>{item.content}</Text>
      <View style={styles.takeFooter}>
        <Text style={styles.takeVotes}>
          +{item.upvotes ?? 0} / -{item.downvotes ?? 0}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={[styles.backText, { color: dark }]}>Back</Text>
            </Pressable>

            <View style={styles.fightCardWrapper}>
              <FightCard rivalry={rivalry} onVote={handleVote} expanded />
            </View>

            {takes.length > 0 && (
              <Text style={styles.takesHeader}>RIVALRY TAKES</Text>
            )}
          </View>
        }
        data={takes}
        keyExtractor={(item) => item.id}
        renderItem={renderTake}
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
            title="No takes yet"
            subtitle="Be the first to weigh in on this rivalry."
          />
        }
      />
    </View>
  );
}
