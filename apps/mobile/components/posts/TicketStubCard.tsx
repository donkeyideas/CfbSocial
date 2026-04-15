import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PostHeader } from './PostHeader';
import { BallotButtons } from './BallotButtons';
import { PostActions } from './PostActions';
import { ReportModal } from '../moderation/ReportModal';
import { LinkPreview, extractFirstUrl, stripFirstUrl } from './LinkPreview';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { timeAgo } from '@/lib/utils/timeAgo';
import type { PostData } from './PostCard';

interface TicketStubCardProps {
  post: PostData;
  isDetailView?: boolean;
}

export const TicketStubCard = memo(function TicketStubCard({ post, isDetailView }: TicketStubCardProps) {
  const colors = useColors();
  const router = useRouter();
  const schoolColor = post.author?.school?.primary_color || colors.crimson;
  const [reportVisible, setReportVisible] = useState(false);

  const navigate = () => {
    if (!isDetailView) router.push(`/post/${post.id}` as never);
  };

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 6,
      borderLeftWidth: 4,
      padding: 12,
      marginHorizontal: 12,
      marginVertical: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    content: {
      fontFamily: typography.sans,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textPrimary,
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

  return (
    <View style={[styles.card, { borderLeftColor: schoolColor }]}>
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

      {/* Header is tappable — navigates to post detail */}
      <Pressable onPress={navigate}>
        <PostHeader
          author={post.author ?? null}
          createdAt={post.created_at}
        />
      </Pressable>

      {/* Post text — tap navigates, long-press selects */}
      <Text style={styles.content} selectable onPress={navigate}>{extractFirstUrl(post.content) ? stripFirstUrl(post.content) : post.content}</Text>

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
  );
});
