import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useRealtimeFeed } from '@/lib/hooks/useRealtimeFeed';
import { AppHeader } from '@/components/navigation/AppHeader';
import { ScoresBanner } from '@/components/feed/ScoresBanner';
import { FeedTabs, type FeedTab } from '@/components/feed/FeedTabs';
import { NewPostsBanner } from '@/components/feed/NewPostsBanner';
import { DynastyWidget } from '@/components/feed/DynastyWidget';
import { NewsSection } from '@/components/feed/NewsSection';
import { PostCard, type PostData } from '@/components/posts/PostCard';
import { PostComposer } from '@/components/posts/PostComposer';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

const PAGE_SIZE = 20;

const POST_SELECT = `
  *,
  author:profiles!posts_author_id_fkey(
    id, username, display_name, avatar_url, dynasty_tier,
    school:schools!profiles_school_id_fkey(abbreviation, primary_color, slug)
  ),
  aging_takes(id, user_id, revisit_date, is_surfaced, community_verdict)
`;

// Sentinel items injected into the FlatList data to render widgets inline
const DYNASTY_SENTINEL = '__DYNASTY_WIDGET__';
const NEWS_SENTINEL = '__NEWS_SECTION__';
type FeedItem = PostData | typeof DYNASTY_SENTINEL | typeof NEWS_SENTINEL;

export default function FeedScreen() {
  const colors = useColors();
  const { session, profile } = useAuth();
  const userId = profile?.id ?? null;
  const { dark } = useSchoolTheme();
  const { newPostCount, resetCount } = useRealtimeFeed(profile?.school_id ?? undefined);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<FeedTab>('latest');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [composerVisible, setComposerVisible] = useState(false);
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  const offsetRef = useRef(0);

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
    listContent: {
      paddingBottom: 80,
    },
    loadingMore: {
      paddingVertical: 16,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyTitle: {
      fontFamily: typography.serif,
      fontSize: 20,
      color: colors.textSecondary,
    },
    emptySubtitle: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    authGate: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 16,
    },
    authGateTitle: {
      fontFamily: typography.serif,
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    authGateButton: {
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 6,
    },
    authGateButtonText: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: '#f4efe4',
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      left: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 5,
    },
    fabText: {
      fontFamily: typography.sansBold,
      fontSize: 28,
      color: '#f4efe4',
      marginTop: -2,
    },
  }), [colors]);

  // ------------------------------------------------------------------
  // Fetch followed user IDs (only when Following tab is active)
  // ------------------------------------------------------------------
  const followingFetchedRef = useRef(false);

  const fetchFollowing = useCallback(async () => {
    if (!userId) {
      setFollowedIds([]);
      return;
    }
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    if (data) {
      setFollowedIds(data.map((f: { following_id: string }) => f.following_id));
      followingFetchedRef.current = true;
    }
  }, [userId]);

  // Lazy-load: only fetch following IDs when user switches to Following tab
  useEffect(() => {
    if (activeTab === 'following' && !followingFetchedRef.current) {
      fetchFollowing();
    }
  }, [activeTab, fetchFollowing]);

  // ------------------------------------------------------------------
  // Build query for the active tab
  // receiptPostIds is passed in for the receipts tab (pre-queried from aging_takes)
  // ------------------------------------------------------------------
  const buildQuery = useCallback(
    (offset: number, receiptPostIds?: string[]) => {
      let query = supabase
        .from('posts')
        .select(POST_SELECT)
        .in('status', ['PUBLISHED', 'FLAGGED'])
        .is('parent_id', null);

      switch (activeTab) {
        case 'latest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'top':
          query = query.order('touchdown_count', { ascending: false });
          break;
        case 'receipts':
          // Match web: show RECEIPT posts + any post with aging_takes filed
          if (receiptPostIds && receiptPostIds.length > 0) {
            query = query.or(`post_type.eq.RECEIPT,id.in.(${receiptPostIds.join(',')})`);
          } else {
            query = query.eq('post_type', 'RECEIPT');
          }
          query = query.order('created_at', { ascending: false });
          break;
        case 'following':
          if (followedIds.length > 0) {
            query = query.in('author_id', followedIds);
          } else {
            // Return impossible filter to get empty result
            query = query.eq('author_id', 'no-results');
          }
          query = query.order('created_at', { ascending: false });
          break;
        case 'mySchool':
          if (profile?.school_id) {
            query = query.eq('school_id', profile.school_id);
          } else {
            query = query.eq('school_id', 'no-results');
          }
          query = query.order('created_at', { ascending: false });
          break;
      }

      query = query.range(offset, offset + PAGE_SIZE - 1);
      return query;
    },
    [activeTab, followedIds, profile?.school_id]
  );

  // ------------------------------------------------------------------
  // Batch-fetch user status for posts (votes, reposts, bookmarks)
  // Eliminates N+1 queries: 3 batch queries instead of 3*N individual
  // ------------------------------------------------------------------
  const enrichPostsWithUserStatus = useCallback(
    async (rawPosts: PostData[]): Promise<PostData[]> => {
      if (!userId || rawPosts.length === 0) return rawPosts;

      const postIds = rawPosts.map((p) => p.id);

      let reactionsRes, repostsRes, bookmarksRes;
      try {
        [reactionsRes, repostsRes, bookmarksRes] = await Promise.all([
          supabase
            .from('reactions')
            .select('post_id, reaction_type')
            .eq('user_id', userId)
            .in('post_id', postIds),
          supabase
            .from('reposts')
            .select('post_id')
            .eq('user_id', userId)
            .in('post_id', postIds),
          supabase
            .from('bookmarks')
            .select('post_id')
            .eq('user_id', userId)
            .in('post_id', postIds),
        ]);
      } catch (err) {
        console.warn('Feed: failed to enrich posts:', err);
        return rawPosts;
      }

      const voteMap = new Map<string, 'TOUCHDOWN' | 'FUMBLE'>();
      if (reactionsRes?.data) {
        for (const r of reactionsRes.data) {
          voteMap.set(r.post_id, r.reaction_type as 'TOUCHDOWN' | 'FUMBLE');
        }
      }

      const repostSet = new Set<string>();
      if (repostsRes?.data) {
        for (const r of repostsRes.data) repostSet.add(r.post_id);
      }

      const bookmarkSet = new Set<string>();
      if (bookmarksRes?.data) {
        for (const b of bookmarksRes.data) bookmarkSet.add(b.post_id);
      }

      return rawPosts.map((post) => ({
        ...post,
        _userVote: voteMap.get(post.id) ?? null,
        _userReposted: repostSet.has(post.id),
        _userSaved: bookmarkSet.has(post.id),
      }));
    },
    [userId]
  );

  // ------------------------------------------------------------------
  // Fetch posts
  // ------------------------------------------------------------------
  const fetchPosts = useCallback(
    async (reset = true) => {
      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      }

      try {
        // For receipts tab, fetch aging_takes IDs in parallel with main query
        let data: unknown[] | null = null;
        let error: unknown = null;

        if (activeTab === 'receipts') {
          // Parallel: get aging_takes IDs and RECEIPT posts simultaneously
          const [agingRes, receiptRes] = await Promise.all([
            supabase.from('aging_takes').select('post_id'),
            supabase
              .from('posts')
              .select(POST_SELECT)
              .in('status', ['PUBLISHED', 'FLAGGED'])
              .is('parent_id', null)
              .eq('post_type', 'RECEIPT')
              .order('created_at', { ascending: false })
              .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1),
          ]);
          const receiptPostIds = agingRes.data?.map((a: { post_id: string }) => a.post_id) ?? [];

          // If we have aging take IDs, fetch those posts too
          if (receiptPostIds.length > 0) {
            const { data: agingPosts } = await supabase
              .from('posts')
              .select(POST_SELECT)
              .in('status', ['PUBLISHED', 'FLAGGED'])
              .is('parent_id', null)
              .in('id', receiptPostIds)
              .order('created_at', { ascending: false });

            // Merge and deduplicate
            const receiptIds = new Set((receiptRes.data ?? []).map((p: { id: string }) => p.id));
            const uniqueAging = (agingPosts ?? []).filter((p: { id: string }) => !receiptIds.has(p.id));
            data = [...(receiptRes.data ?? []), ...uniqueAging]
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, PAGE_SIZE);
          } else {
            data = receiptRes.data;
          }
          error = receiptRes.error;
        } else {
          const result = await buildQuery(offsetRef.current);
          data = result.data;
          error = result.error;
        }

        if (!error && data) {
          const typed = data as unknown as PostData[];
          const enriched = await enrichPostsWithUserStatus(typed);

          // Fetch reposts and merge into feed (matching web behavior)
          let merged: PostData[] = enriched.map((p) => ({
            ...p,
            _feedKey: `post-${p.id}`,
          }));

          if (activeTab === 'latest' || activeTab === 'following') {
            // Step 1: Get recent reposts (just IDs + reposter info)
            const { data: reposts } = await supabase
              .from('reposts')
              .select('id, created_at, user_id, post_id')
              .order('created_at', { ascending: false })
              .limit(10);

            if (reposts && reposts.length > 0) {
              const repostPostIds = reposts.map((r) => r.post_id);

              // Step 2: Fetch reposter profiles and reposted posts in parallel
              const [repostersRes, repostedPostsRes] = await Promise.all([
                supabase
                  .from('profiles')
                  .select('id, username, display_name')
                  .in('id', reposts.map((r) => r.user_id)),
                supabase
                  .from('posts')
                  .select(POST_SELECT)
                  .in('id', repostPostIds)
                  .in('status', ['PUBLISHED', 'FLAGGED'])
                  .is('parent_id', null),
              ]);

              const reposterMap = new Map<string, { username: string; display_name: string | null }>();
              if (repostersRes.data) {
                for (const p of repostersRes.data) {
                  reposterMap.set(p.id, { username: p.username ?? '', display_name: p.display_name });
                }
              }

              const postMap = new Map<string, PostData>();
              if (repostedPostsRes.data) {
                for (const p of repostedPostsRes.data as unknown as PostData[]) {
                  postMap.set(p.id, p);
                }
              }

              // Step 3: Build repost feed items
              const repostItems: PostData[] = [];
              for (const r of reposts) {
                const post = postMap.get(r.post_id);
                if (!post) continue;
                const reposter = reposterMap.get(r.user_id) ?? null;
                repostItems.push({
                  ...post,
                  _feedKey: `repost-${r.id}`,
                  _repostedBy: reposter,
                  _repostTime: r.created_at,
                  created_at: r.created_at, // Use repost time for sorting
                });
              }

              // Enrich repost items with user status
              const enrichedReposts = await enrichPostsWithUserStatus(repostItems);

              // Merge and sort by created_at descending
              // Deduplicate: if a post appears as both original and repost, keep original
              const existingPostIds = new Set(enriched.map((p) => p.id));
              const uniqueReposts = enrichedReposts.filter((r) => !existingPostIds.has(r.id));

              merged = [...merged, ...uniqueReposts]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }
          }

          if (reset) {
            setPosts(merged);
          } else {
            setPosts((prev) => [...prev, ...merged]);
          }
          setHasMore(typed.length >= PAGE_SIZE);
          offsetRef.current += typed.length;
        }
      } catch (err) {
        console.warn('Feed: failed to fetch posts:', err);
      }

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [activeTab, buildQuery, enrichPostsWithUserStatus]
  );

  useEffect(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  // ------------------------------------------------------------------
  // Tab change
  // ------------------------------------------------------------------
  const handleTabChange = (tab: FeedTab) => {
    setActiveTab(tab);
    // fetchPosts will be triggered by the useEffect on fetchPosts changing
  };

  // ------------------------------------------------------------------
  // Pull to refresh
  // ------------------------------------------------------------------
  const handleRefresh = () => {
    setRefreshing(true);
    resetCount();
    fetchPosts(true);
  };

  // ------------------------------------------------------------------
  // New posts banner tap
  // ------------------------------------------------------------------
  const handleNewPostsBannerPress = () => {
    resetCount();
    fetchPosts(true);
  };

  // ------------------------------------------------------------------
  // Load more
  // ------------------------------------------------------------------
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchPosts(false);
  };

  // ------------------------------------------------------------------
  // Post created callback
  // ------------------------------------------------------------------
  const handlePostCreated = () => {
    fetchPosts(true);
  };

  // ------------------------------------------------------------------
  // Auth gate for Following / My School
  // ------------------------------------------------------------------
  const needsAuth = (activeTab === 'following' || activeTab === 'mySchool') && !session;

  // ------------------------------------------------------------------
  // Build FlatList data with dynasty widget sentinel after 3rd post
  // ------------------------------------------------------------------
  const feedData: FeedItem[] = useMemo(() => {
    const data: FeedItem[] = [];
    for (let i = 0; i < posts.length; i++) {
      data.push(posts[i]);
      if (i === 2) {
        data.push(DYNASTY_SENTINEL);
      }
      if (i === 6) {
        data.push(NEWS_SENTINEL);
      }
    }
    // If fewer than 3 posts, still add dynasty widget at the end
    if (posts.length > 0 && posts.length <= 3 && !data.includes(DYNASTY_SENTINEL)) {
      data.push(DYNASTY_SENTINEL);
    }
    // If fewer than 7 posts, add news section at the end
    if (posts.length > 0 && posts.length <= 6 && !data.includes(NEWS_SENTINEL)) {
      data.push(NEWS_SENTINEL);
    }
    return data;
  }, [posts]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item === DYNASTY_SENTINEL) {
      return <DynastyWidget />;
    }
    if (item === NEWS_SENTINEL) {
      return <NewsSection />;
    }
    return <PostCard post={item} />;
  }, []);

  const keyExtractor = useCallback((item: FeedItem) => {
    if (item === DYNASTY_SENTINEL) return 'dynasty-widget';
    if (item === NEWS_SENTINEL) return 'news-section';
    return item._feedKey ?? item.id;
  }, []);

  const ListFooter = loadingMore ? (
    <ActivityIndicator
      size="small"
      color={dark}
      style={styles.loadingMore}
    />
  ) : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader />
      <ScoresBanner />
      <FeedTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {newPostCount > 0 && (
        <NewPostsBanner count={newPostCount} onPress={handleNewPostsBannerPress} />
      )}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={dark} />
        </View>
      ) : needsAuth ? (
        <View style={styles.authGate}>
          <Text style={styles.authGateTitle}>
            {activeTab === 'following' ? 'Follow fans to see their takes' : 'Pick a school to see its takes'}
          </Text>
          <Pressable
            style={[styles.authGateButton, { backgroundColor: dark }]}
            onPress={() => router.push('/(auth)/login' as never)}
          >
            <Text style={styles.authGateButtonText}>Log In</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={feedData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={dark}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>CFB Social is quiet...</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to post and stake your claim.
              </Text>
            </View>
          }
          removeClippedSubviews
          maxToRenderPerBatch={8}
          initialNumToRender={6}
          windowSize={5}
        />
      )}

      {/* Floating compose button - bottom left */}
      {session && (
        <Pressable
          style={[styles.fab, { backgroundColor: dark }]}
          onPress={() => setComposerVisible(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}

      <PostComposer
        visible={composerVisible}
        onClose={() => setComposerVisible(false)}
        onPostCreated={handlePostCreated}
      />
    </KeyboardAvoidingView>
  );
}

