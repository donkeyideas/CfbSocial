import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/utils/timeAgo';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { useColors } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

interface NotificationActor {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface NotificationData {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  post_id: string | null;
  challenge_id: string | null;
  message: string | null;
  data: { title?: string; message?: string } | null;
  is_read: boolean;
  created_at: string;
  actor: NotificationActor | null;
}

interface NotificationItemProps {
  notification: NotificationData;
  onRead: (id: string) => void;
}

function getNotificationMessage(notification: NotificationData): string {
  const actorName =
    notification.actor?.display_name ||
    notification.actor?.username ||
    'Someone';

  switch (notification.type) {
    case 'FOLLOW':
      return `${actorName} started following you`;
    case 'TD':
      return `${actorName} gave your post a TD`;
    case 'FUMBLE':
      return `${actorName} fumbled your post`;
    case 'REPLY':
      return `${actorName} replied to your post`;
    case 'CHALLENGE':
      return `${actorName} challenged you`;
    case 'POST_FLAGGED':
    case 'MODERATION_WARNING':
      return 'Your post was flagged for review';
    case 'RIVALRY_VOTE':
      return 'New vote on your rivalry';
    case 'REPOST':
      return `${actorName} reposted your take`;
    case 'CHALLENGE_RESPONSE':
      return `${actorName} responded to your challenge`;
    case 'CHALLENGE_WON':
      return 'You won your challenge!';
    case 'CHALLENGE_LOST':
      return 'Your challenge has been decided';
    case 'ACHIEVEMENT_UNLOCKED':
      return 'Achievement unlocked!';
    case 'LEVEL_UP':
      return 'You leveled up!';
    case 'MODERATION_APPEAL_RESULT':
      return 'Your appeal has been reviewed';
    case 'SYSTEM':
      return notification.data?.title || notification.data?.message || notification.message || 'New message from CFB Social';
    default:
      return notification.data?.message || notification.message || 'You have a new notification';
  }
}

function getNavigationTarget(notification: NotificationData): string | null {
  switch (notification.type) {
    case 'FOLLOW':
      return notification.actor?.username
        ? `/profile/${notification.actor.username}`
        : null;
    case 'TD':
    case 'FUMBLE':
    case 'REPLY':
    case 'REPOST':
    case 'POST_FLAGGED':
    case 'MODERATION_WARNING':
    case 'MODERATION_APPEAL_RESULT':
      return notification.post_id ? `/post/${notification.post_id}` : null;
    case 'CHALLENGE':
    case 'CHALLENGE_RESPONSE':
    case 'CHALLENGE_WON':
    case 'CHALLENGE_LOST':
      return notification.challenge_id
        ? `/rivalry/challenge/${notification.challenge_id}`
        : null;
    case 'RIVALRY_VOTE':
      return notification.post_id ? `/rivalry/${notification.post_id}` : null;
    default:
      return null;
  }
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const colors = useColors();
  const router = useRouter();
  const { dark } = useSchoolTheme();
  const message = getNotificationMessage(notification);
  const target = getNavigationTarget(notification);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.paper,
    },
    unreadContainer: {
      backgroundColor: colors.surfaceRaised,
    },
    avatarColumn: {
      marginRight: 12,
    },
    systemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: dark,
      justifyContent: 'center',
      alignItems: 'center',
    },
    systemIconText: {
      fontFamily: typography.serifBold,
      fontSize: 20,
      color: '#f4efe4',
    },
    content: {
      flex: 1,
      gap: 2,
    },
    message: {
      fontFamily: typography.sans,
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    unreadMessage: {
      fontFamily: typography.sansSemiBold,
    },
    systemBody: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    timestamp: {
      fontFamily: typography.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.crimson,
      marginLeft: 8,
    },
  }), [colors]);

  const handlePress = async () => {
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
      onRead(notification.id);
    }

    if (target) {
      router.push(target as never);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.container,
        !notification.is_read && styles.unreadContainer,
      ]}
    >
      <View style={styles.avatarColumn}>
        {notification.actor ? (
          <Avatar
            url={notification.actor.avatar_url}
            name={notification.actor.display_name || notification.actor.username}
            size={40}
          />
        ) : (
          <View style={styles.systemIcon}>
            <Text style={styles.systemIconText}>G</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.message,
            !notification.is_read && styles.unreadMessage,
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>
        {notification.type === 'SYSTEM' && notification.data?.message && notification.data?.title && (
          <Text style={styles.systemBody} numberOfLines={2}>
            {notification.data.message}
          </Text>
        )}
        <Text style={styles.timestamp}>{timeAgo(notification.created_at)}</Text>
      </View>

      {!notification.is_read && <View style={[styles.unreadDot, { backgroundColor: dark }]} />}
    </Pressable>
  );
}
