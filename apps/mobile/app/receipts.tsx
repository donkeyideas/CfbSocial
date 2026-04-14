import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { AppHeader } from '@/components/navigation/AppHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { AuthGate } from '@/components/ui/AuthGate';
import { EmptyState } from '@/components/ui/EmptyState';
import { SchoolBadge } from '@/components/ui/SchoolBadge';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

interface ReceiptPost {
  id: string;
  content: string;
  post_type: string;
  status: string;
  author_id: string;
  touchdown_count: number;
  fumble_count: number;
  reply_count: number;
  created_at: string;
  author: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    dynasty_tier: string | null;
    school: {
      abbreviation: string;
      primary_color: string;
      slug: string | null;
    } | null;
  } | null;
}

interface AgingTake {
  id: string;
  created_at: string;
  revisit_date: string;
  post: ReceiptPost | null;
}

const AGING_SELECT = `
  id, created_at, revisit_date,
  post:posts!aging_takes_post_id_fkey(
    id, content, post_type, status, author_id,
    touchdown_count, fumble_count, reply_count, created_at,
    author:profiles!posts_author_id_fkey(
      id, username, display_name, avatar_url, dynasty_tier,
      school:schools!profiles_school_id_fkey(abbreviation, primary_color, slug)
    )
  )
`;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

function daysRemaining(revisitDate: string): number {
  const now = Date.now();
  const target = new Date(revisitDate).getTime();
  const diff = target - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function ReceiptsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { session, profile } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();
  const [receipts, setReceipts] = useState<AgingTake[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    loaderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterRow: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    counterText: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    listContent: {
      padding: 16,
      gap: 14,
      paddingBottom: 40,
    },
    clipping: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 2,
      overflow: 'hidden',
    },
    colorStripe: {
      width: 4,
    },
    clippingInner: {
      flex: 1,
      padding: 14,
      gap: 6,
    },
    overline: {
      fontFamily: typography.mono,
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    ruleLine: {
      height: 1,
      backgroundColor: colors.ink,
      marginBottom: 2,
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    authorName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    headline: {
      fontFamily: typography.serifBold,
      fontSize: 15,
      lineHeight: 21,
      color: colors.ink,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    stat: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    statSep: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textMuted,
    },
    stampRow: {
      alignItems: 'center',
      marginTop: 6,
    },
    stamp: {
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 2,
    },
    stampReady: {
      backgroundColor: colors.ink,
    },
    stampPending: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.textMuted,
      borderStyle: 'dashed',
    },
    stampText: {
      fontFamily: typography.mono,
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    stampReadyText: {
      color: '#f4efe4',
    },
    stampPendingText: {
      color: colors.textMuted,
    },
  }), [colors]);

  const fetchReceipts = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('aging_takes')
      .select(AGING_SELECT)
      .eq('user_id', userId)
      .order('revisit_date', { ascending: true });

    if (!error && data) {
      setReceipts(data as unknown as AgingTake[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchReceipts();
    } else {
      setLoading(false);
    }
  }, [fetchReceipts, userId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReceipts();
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <SectionLabel text="My Receipts" />
        <AuthGate message="Sign in to view your receipts" />
      </View>
    );
  }

  const validReceipts = receipts.filter((r) => r.post != null);

  const renderReceipt = useCallback(({ item }: { item: AgingTake }) => {
    const post = item.post;
    if (!post) return null;

    const author = post.author;
    const school = author?.school;
    const displayName = author?.display_name || author?.username || 'Unknown';
    const username = author?.username ? `@${author.username}` : '';
    const preview = post.content?.length > 180
      ? post.content.substring(0, 180) + '...'
      : post.content;

    const remaining = daysRemaining(item.revisit_date);
    const isReady = remaining === 0;

    return (
      <Pressable
        style={styles.clipping}
        onPress={() => router.push(`/post/${post.id}` as never)}
      >
        {/* School color left border */}
        {school && (
          <View
            style={[styles.colorStripe, { backgroundColor: school.primary_color }]}
          />
        )}

        <View style={styles.clippingInner}>
          {/* Overline */}
          <Text style={styles.overline}>THE SATURDAY EDITION</Text>
          <View style={styles.ruleLine} />

          {/* Author row */}
          <View style={styles.authorRow}>
            {school && (
              <SchoolBadge
                abbreviation={school.abbreviation}
                color={school.primary_color}
                slug={school.slug}
                small
              />
            )}
            <Text style={styles.authorName}>{username || displayName}</Text>
          </View>

          {/* Headline / content */}
          <Text style={styles.headline} numberOfLines={3}>
            {preview}
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <Text style={styles.stat}>TD: {post.touchdown_count}</Text>
            <Text style={styles.statSep}>*</Text>
            <Text style={styles.stat}>FUM: {post.fumble_count}</Text>
          </View>

          {/* Receipt stamp */}
          <View style={styles.stampRow}>
            <View style={[styles.stamp, isReady ? styles.stampReady : styles.stampPending]}>
              <Text style={[styles.stampText, isReady ? styles.stampReadyText : styles.stampPendingText]}>
                {isReady
                  ? `RECEIPT FILED -- ${getWeekLabel(item.created_at)}`
                  : `${remaining}d REMAINING -- Review ${getWeekLabel(item.revisit_date)}`}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="My Receipts" />

      {/* Counter header */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {validReceipts.length} receipt{validReceipts.length !== 1 ? 's' : ''} filed
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={dark} />
        </View>
      ) : (
        <FlatList
          data={validReceipts}
          keyExtractor={(item) => item.id}
          renderItem={renderReceipt}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          initialNumToRender={6}
          windowSize={5}
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
              title="No receipts filed yet"
              subtitle="Mark posts for revisit to hold takes accountable."
            />
          }
        />
      )}
    </View>
  );
}
