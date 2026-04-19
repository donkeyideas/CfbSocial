import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PostHeader } from './PostHeader';
import { BallotButtons } from './BallotButtons';
import { PostActions } from './PostActions';
import { ReportModal } from '../moderation/ReportModal';
import { LinkPreview, extractFirstUrl, stripFirstUrl } from './LinkPreview';
import { PostContent } from './PostContent';
import { PostImages } from './PostImages';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';
import { withAlpha } from '@/lib/theme/utils';
import { timeAgo } from '@/lib/utils/timeAgo';
import type { PostData } from './PostCard';

interface NewspaperClippingCardProps {
  post: PostData;
  isAgingReceipt?: boolean;
  isDetailView?: boolean;
}

export const NewspaperClippingCard = memo(function NewspaperClippingCard({ post, isAgingReceipt, isDetailView }: NewspaperClippingCardProps) {
  const colors = useColors();
  const router = useRouter();
  const isReceipt = post.post_type === 'RECEIPT';
  const hasAgingTake = isAgingReceipt || (post.aging_takes && post.aging_takes.length > 0);
  const [reportVisible, setReportVisible] = useState(false);

  const navigate = () => {
    if (!isDetailView) router.push(`/post/${post.id}` as never);
  };

  // Format the revisit date from the first aging take
  const receiptDate = hasAgingTake && post.aging_takes?.[0]
    ? new Date(post.aging_takes[0].revisit_date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      padding: 10,
      marginHorizontal: 12,
      marginVertical: 4,
    },
    receiptCard: {
      backgroundColor: withAlpha('#d4a574', 0.06),
      borderColor: withAlpha('#c0392b', 0.3),
    },
    sectionLabelWrap: {
      marginVertical: 10,
      gap: 4,
    },
    ruleLine: {
      height: 1,
      backgroundColor: colors.borderStrong,
    },
    sectionLabel: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textSecondary,
      letterSpacing: 2,
      textAlign: 'center',
      paddingVertical: 2,
    },
    headline: {
      fontFamily: typography.serifBold,
      fontSize: 18,
      lineHeight: 24,
      color: colors.ink,
      marginBottom: 6,
    },
    content: {
      fontFamily: typography.sans,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    stampWrap: {
      alignItems: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    stamp: {
      backgroundColor: colors.ink,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 3,
    },
    receiptStamp: {
      borderWidth: 2,
      borderColor: colors.crimson,
      backgroundColor: 'transparent',
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 3,
      transform: [{ rotate: '-2deg' }],
    },
    stampText: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.paper,
      letterSpacing: 2,
    },
    receiptStampText: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.crimson,
      letterSpacing: 2,
    },
    // Receipt seal badge (top-right circle)
    sealContainer: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 1,
    },
    seal: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.crimson,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 1, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
      transform: [{ rotate: '12deg' }],
    },
    sealText: {
      fontFamily: typography.serifBold,
      fontSize: 7,
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      lineHeight: 10,
      textTransform: 'uppercase',
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

  // Strip URL from displayed text (link preview card shows it instead)
  const displayContent = extractFirstUrl(post.content) ? stripFirstUrl(post.content) : post.content;

  // Split content into headline (first sentence) and body
  const dotIdx = displayContent.indexOf('.');
  const headline = dotIdx > 0 && dotIdx < 80 ? displayContent.slice(0, dotIdx + 1) : null;
  const body = headline ? displayContent.slice(dotIdx + 1).trim() : displayContent;

  return (
    <View style={[styles.card, hasAgingTake && styles.receiptCard]}>
      {/* Repost stamp */}
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

      {/* Receipt seal badge */}
      {hasAgingTake && (
        <View style={styles.sealContainer}>
          <View style={styles.seal}>
            <Text style={styles.sealText}>{'Receipt\nFiled'}</Text>
          </View>
        </View>
      )}

      {/* Header is tappable — navigates to post detail */}
      <Pressable onPress={navigate}>
        <PostHeader
          author={post.author ?? null}
          createdAt={post.created_at}
        />
      </Pressable>

      {/* Section label with rules */}
      <Pressable onPress={navigate}>
        <View style={styles.sectionLabelWrap}>
          <View style={styles.ruleLine} />
          <Text style={styles.sectionLabel}>
            {hasAgingTake ? 'RECEIPT FILED' : 'THE SATURDAY EDITION'}
          </Text>
          <View style={[styles.ruleLine, { backgroundColor: colors.crimson, height: 2 }]} />
        </View>
      </Pressable>

      {/* Post text — tap navigates, long-press selects */}
      {headline && (
        <Pressable onPress={navigate}>
          <PostContent content={headline} style={styles.headline} />
        </Pressable>
      )}
      {body ? (
        <Pressable onPress={navigate}>
          <PostContent content={body} style={styles.content} />
        </Pressable>
      ) : null}

      <LinkPreview content={post.content} />
      {post.media_urls && post.media_urls.length > 0 && <PostImages urls={post.media_urls} />}

      {/* Receipt stamp with date for aging takes */}
      {hasAgingTake && receiptDate && (
        <View style={styles.stampWrap}>
          <View style={styles.receiptStamp}>
            <Text style={styles.receiptStampText}>RECEIPT FILED — Review {receiptDate}</Text>
          </View>
        </View>
      )}

      {/* Receipt stamp for RECEIPT post type */}
      {isReceipt && !hasAgingTake && (
        <View style={styles.stampWrap}>
          <View style={styles.stamp}>
            <Text style={styles.stampText}>RECEIPT FILED</Text>
          </View>
        </View>
      )}

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
