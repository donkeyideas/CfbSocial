import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { PostCard, type PostData } from '@/components/posts/PostCard';
import { ReplyComposer } from '@/components/posts/ReplyComposer';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';

const POST_SELECT = `
  *,
  author:profiles!posts_author_id_fkey(
    id, username, display_name, avatar_url, dynasty_tier,
    school:schools!profiles_school_id_fkey(abbreviation, primary_color, slug)
  )
`;

export default function PostDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dark } = useSchoolTheme();
  const [post, setPost] = useState<PostData | null>(null);
  const [replies, setReplies] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.paper,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 50,
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceRaised,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      alignItems: 'flex-start',
    },
    backArrow: {
      fontFamily: typography.sansBold,
      fontSize: 20,
      color: colors.textPrimary,
    },
    headerTitle: {
      fontFamily: typography.serifBold,
      fontSize: 18,
      color: colors.textPrimary,
    },
    listContent: {
      paddingBottom: 8,
    },
    repliesHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
    },
    repliesLabel: {
      fontFamily: typography.serifBold,
      fontSize: 15,
      color: colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    noReplies: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    noRepliesText: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textMuted,
    },
    errorText: {
      fontFamily: typography.serif,
      fontSize: 18,
      color: colors.textSecondary,
    },
    backLink: {
      fontFamily: typography.sansSemiBold,
      fontSize: 14,
      color: colors.crimson,
    },
  }), [colors]);

  const fetchPost = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', id)
      .single();

    if (!error && data) {
      setPost(data as unknown as PostData);
    }
  }, [id]);

  const fetchReplies = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('parent_id', id)
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      setReplies(data as unknown as PostData[]);
    }
  }, [id]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPost(), fetchReplies()]);
    } catch (err) {
      console.warn('PostDetail: failed to load:', err);
    }
    setLoading(false);
  }, [fetchPost, fetchReplies]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const renderItem = useCallback(
    ({ item }: { item: PostData }) => <PostCard post={item} />,
    []
  );

  const handleReplySent = () => {
    fetchReplies();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={dark} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Post not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: dark }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={0}
    >
      {/* Header bar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main post + replies list */}
      <FlatList
        data={replies}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        removeClippedSubviews
        maxToRenderPerBatch={8}
        initialNumToRender={6}
        windowSize={5}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <PostCard post={post} isDetailView />
            {replies.length > 0 && (
              <View style={styles.repliesHeader}>
                <Text style={styles.repliesLabel}>
                  {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.noReplies}>
            <Text style={styles.noRepliesText}>No replies yet. Be the first.</Text>
          </View>
        }
      />

      {/* Reply composer pinned to bottom */}
      <ReplyComposer postId={id ?? ''} onReplySent={handleReplySent} />
    </KeyboardAvoidingView>
  );
}
