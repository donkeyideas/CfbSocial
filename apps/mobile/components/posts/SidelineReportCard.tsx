import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { PostHeader } from './PostHeader';
import { BallotButtons } from './BallotButtons';
import { PostActions } from './PostActions';
import { ReportModal } from '../moderation/ReportModal';
import { LinkPreview, extractFirstUrl, stripFirstUrl } from './LinkPreview';
import { PostContent } from './PostContent';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { timeAgo } from '@/lib/utils/timeAgo';
import type { PostData } from './PostCard';

interface SidelineReportCardProps {
  post: PostData;
  isDetailView?: boolean;
}

export const SidelineReportCard = memo(function SidelineReportCard({ post, isDetailView }: SidelineReportCardProps) {
  const colors = useColors();
  const router = useRouter();
  const [dotVisible, setDotVisible] = useState(true);
  const [reportVisible, setReportVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Blinking green dot
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDotVisible((v) => !v);
    }, 800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    card: {
      borderRadius: 6,
      overflow: 'hidden',
      marginHorizontal: 12,
      marginVertical: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    headerBar: {
      backgroundColor: colors.ink,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success,
    },
    liveText: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.success,
      letterSpacing: 2,
    },
    body: {
      backgroundColor: colors.paper,
      padding: 12,
    },
    content: {
      fontFamily: typography.sans,
      fontSize: 15,
      lineHeight: 22,
      color: colors.ink,
    },
    repostStamp: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1.5,
      borderColor: colors.crimson,
      borderRadius: 3,
      paddingVertical: 2,
      paddingHorizontal: 8,
      alignSelf: 'flex-start',
      marginBottom: 6,
      transform: [{ rotate: '-1.5deg' }],
      opacity: 0.7,
    },
    repostStampText: {
      fontFamily: typography.mono,
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 2,
      color: colors.crimson,
      textTransform: 'uppercase',
    },
    repostStampUser: {
      fontFamily: typography.mono,
      fontSize: 8,
      fontWeight: '600',
      color: colors.crimson,
    },
  }), [colors]);

  const navigate = () => {
    if (!isDetailView) router.push(`/post/${post.id}` as never);
  };

  return (
    <View style={styles.card}>
      {/* Header bar is tappable — navigates to post detail */}
      <Pressable onPress={navigate}>
        <View style={styles.headerBar}>
          <View style={styles.liveIndicator}>
            <View
              style={[styles.liveDot, { opacity: dotVisible ? 1 : 0.2 }]}
            />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.body}>
        {post._repostedBy && (
          <Pressable
            style={styles.repostStamp}
            onPress={() => router.push(`/profile/${post._repostedBy!.username}` as never)}
          >
            <Text style={styles.repostStampText}>REPOSTED</Text>
            <Text style={styles.repostStampUser}>@{post._repostedBy.username}</Text>
            {post._repostTime && <Text style={styles.repostStampUser}>{timeAgo(post._repostTime)} ago</Text>}
          </Pressable>
        )}

        {/* Author header is tappable */}
        <Pressable onPress={navigate}>
          <PostHeader
            author={post.author ?? null}
            createdAt={post.created_at}
          />
        </Pressable>

        {/* Post text — tap navigates, long-press selects */}
        <Pressable onPress={navigate}>
          <PostContent content={extractFirstUrl(post.content) ? stripFirstUrl(post.content) : post.content} style={styles.content} />
        </Pressable>

        <LinkPreview content={post.content} />

        <BallotButtons
          postId={post.id}
          authorId={post.author_id}
          initialTdCount={post.touchdown_count}
          initialFmCount={post.fumble_count}
          prefetchedVote={post._userVote}
        />

        <PostActions
          postId={post.id}
          postAuthorId={post.author_id}
          postContent={post.content}
          prefetchedReposted={post._userReposted}
          prefetchedSaved={post._userSaved}
          repostCount={post.repost_count}
          replyCount={post.reply_count}
          onReport={() => setReportVisible(true)}
        />

        <ReportModal
          visible={reportVisible}
          postId={post.id}
          postAuthorId={post.author_id}
          onClose={() => setReportVisible(false)}
        />
      </View>
    </View>
  );
});
