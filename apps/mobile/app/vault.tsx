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
import { DynastyBadge } from '@/components/ui/DynastyBadge';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { timeAgo } from '@/lib/utils/timeAgo';

interface BookmarkPost {
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
      secondary_color?: string;
      slug: string | null;
    } | null;
  } | null;
}

interface Bookmark {
  id: string;
  created_at: string;
  post: BookmarkPost | null;
}

const BOOKMARK_SELECT = `
  id, created_at,
  post:posts!bookmarks_post_id_fkey(
    id, content, post_type, status, author_id,
    touchdown_count, fumble_count, reply_count, created_at,
    author:profiles!posts_author_id_fkey(
      id, username, display_name, avatar_url, dynasty_tier,
      school:schools!profiles_school_id_fkey(abbreviation, primary_color, secondary_color, slug)
    )
  )
`;

export default function VaultScreen() {
  const colors = useColors();
  const router = useRouter();
  const { session, profile } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
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
      gap: 10,
      paddingBottom: 40,
    },
    bookmarkCard: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
    },
    colorStripe: {
      width: 4,
    },
    bookmarkContent: {
      flex: 1,
      padding: 12,
      gap: 8,
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    authorName: {
      fontFamily: typography.sansSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
      flex: 1,
    },
    postPreview: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    stat: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    statDivider: {
      fontFamily: typography.sans,
      fontSize: 10,
      color: colors.border,
    },
    spacer: {
      flex: 1,
    },
    savedDate: {
      fontFamily: typography.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
  }), [colors]);

  const fetchBookmarks = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('bookmarks')
      .select(BOOKMARK_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setBookmarks(data as unknown as Bookmark[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchBookmarks();
    } else {
      setLoading(false);
    }
  }, [fetchBookmarks, userId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookmarks();
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <SectionLabel text="The Vault" />
        <AuthGate message="Sign in to access your saved posts" />
      </View>
    );
  }

  const validBookmarks = bookmarks.filter((b) => b.post != null);

  const renderBookmark = useCallback(({ item }: { item: Bookmark }) => {
    const post = item.post;
    if (!post) return null;

    const author = post.author;
    const school = author?.school;
    const displayName = author?.display_name || author?.username || 'Unknown';
    const preview = post.content?.length > 200
      ? post.content.substring(0, 200) + '...'
      : post.content;

    return (
      <Pressable
        style={styles.bookmarkCard}
        onPress={() => router.push(`/post/${post.id}` as never)}
      >
        {/* School color left border */}
        {school && (
          <View
            style={[styles.colorStripe, { backgroundColor: school.primary_color }]}
          />
        )}

        <View style={styles.bookmarkContent}>
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
            <Text style={styles.authorName} numberOfLines={1}>
              {displayName}
            </Text>
            {author?.dynasty_tier && (
              <DynastyBadge tier={author.dynasty_tier} />
            )}
          </View>

          {/* Post preview */}
          <Text style={styles.postPreview} numberOfLines={3}>
            {preview}
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <Text style={styles.stat}>TD {post.touchdown_count}</Text>
            <Text style={styles.statDivider}>|</Text>
            <Text style={styles.stat}>FMB {post.fumble_count}</Text>
            <Text style={styles.statDivider}>|</Text>
            <Text style={styles.stat}>{post.reply_count} replies</Text>
            <View style={styles.spacer} />
            <Text style={styles.savedDate}>Saved {timeAgo(item.created_at)}</Text>
          </View>
        </View>
      </Pressable>
    );
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader />
      <SectionLabel text="The Vault" />

      {/* Counter header */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {validBookmarks.length} saved post{validBookmarks.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={dark} />
        </View>
      ) : (
        <FlatList
          data={validBookmarks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookmark}
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
              title="Nothing in the vault yet"
              subtitle="Bookmark posts from the feed to save them here."
            />
          }
        />
      )}
    </View>
  );
}
