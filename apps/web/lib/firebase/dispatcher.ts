import { createAdminClient } from '@/lib/admin/supabase/admin';
import { sendPushToUser } from './send';

interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  post_id: string | null;
  challenge_id: string | null;
  data: Record<string, unknown> | null;
}

// Map notification type to the preference category that controls it
const TYPE_TO_PREF: Record<string, string> = {
  FOLLOW: 'follow_notifications',
  TOUCHDOWN: 'reaction_notifications',
  FUMBLE: 'reaction_notifications',
  REPOST: 'reaction_notifications',
  REPLY: 'reply_notifications',
  CHALLENGE: 'challenge_notifications',
  CHALLENGE_RECEIVED: 'challenge_notifications',
  CHALLENGE_RESPONSE: 'challenge_notifications',
  CHALLENGE_WON: 'challenge_notifications',
  CHALLENGE_LOST: 'challenge_notifications',
  CHALLENGE_RESULT: 'challenge_notifications',
  RIVALRY_FEATURED: 'rivalry_notifications',
  RIVALRY_VOTE: 'rivalry_notifications',
  MODERATION_WARNING: 'moderation_notifications',
  POST_FLAGGED: 'moderation_notifications',
  MODERATION_APPEAL_RESULT: 'moderation_notifications',
  ACHIEVEMENT_UNLOCKED: 'follow_notifications', // gamification — default on
  LEVEL_UP: 'follow_notifications',
  SYSTEM: 'marketing_notifications',
};

/**
 * Build the push notification title and body based on notification type.
 */
function buildPushPayload(
  notification: NotificationRow,
  actorName: string | null
): { title: string; body: string; data: Record<string, string> } {
  const actor = actorName || 'Someone';
  const data: Record<string, string> = { type: notification.type };

  if (notification.post_id) data.postId = notification.post_id;
  if (notification.challenge_id) data.challengeId = notification.challenge_id;

  switch (notification.type) {
    case 'FOLLOW':
      return { title: 'New Follower', body: `${actor} started following you`, data };
    case 'TOUCHDOWN':
      return { title: 'Touchdown!', body: `${actor} gave your take a TD`, data };
    case 'FUMBLE':
      return { title: 'Fumble', body: `${actor} fumbled your take`, data };
    case 'REPOST':
      return { title: 'Repost', body: `${actor} reposted your take`, data };
    case 'REPLY':
      return { title: 'New Reply', body: `${actor} replied to your take`, data };
    case 'CHALLENGE':
    case 'CHALLENGE_RECEIVED':
      return { title: 'Challenge!', body: `${actor} challenged you`, data };
    case 'CHALLENGE_RESPONSE':
      return { title: 'Challenge Update', body: `${actor} responded to your challenge`, data };
    case 'CHALLENGE_WON':
      return { title: 'Victory!', body: `You won the challenge against ${actor}`, data };
    case 'CHALLENGE_LOST':
      return { title: 'Defeat', body: `You lost the challenge against ${actor}`, data };
    case 'CHALLENGE_RESULT':
      return { title: 'Challenge Result', body: `Your challenge against ${actor} has been decided`, data };
    case 'MODERATION_WARNING':
    case 'POST_FLAGGED':
      return { title: 'Post Flagged', body: 'Your post was flagged for review', data };
    case 'MODERATION_APPEAL_RESULT': {
      const result = (notification.data as Record<string, unknown>)?.result;
      const outcome = result === 'approved' ? 'approved' : 'denied';
      return { title: 'Appeal Update', body: `Your appeal was ${outcome}`, data };
    }
    case 'ACHIEVEMENT_UNLOCKED': {
      const name = (notification.data as Record<string, unknown>)?.achievement_name || 'a new achievement';
      return { title: 'Achievement Unlocked!', body: `You unlocked: ${name}`, data };
    }
    case 'LEVEL_UP': {
      const level = (notification.data as Record<string, unknown>)?.level_name || 'a new level';
      return { title: 'Level Up!', body: `You reached ${level}!`, data };
    }
    case 'PREDICTION_RESULT': {
      const verdict = (notification.data as Record<string, unknown>)?.verdict || 'resolved';
      return { title: 'Prediction Result', body: `Your prediction was marked as ${verdict}`, data };
    }
    case 'AGING_TAKE_SURFACED':
      return { title: 'Take Resurfaced', body: 'One of your aging takes has been surfaced for review', data };
    case 'RECEIPT_VERIFIED':
      return { title: 'Receipt Verified!', body: 'Your prediction aged well — receipt confirmed', data };
    case 'PORTAL_COMMIT':
      return { title: 'Portal Update', body: 'A player you claimed has committed', data };
    case 'SYSTEM': {
      const msg = (notification.data as Record<string, unknown>)?.message || 'You have a new message from CFB Social';
      return { title: 'CFB Social', body: String(msg), data };
    }
    default:
      return { title: 'CFB Social', body: 'You have a new notification', data };
  }
}

/**
 * Dispatch a push notification for a notification row.
 * Checks user preferences before sending.
 * This is meant to be called fire-and-forget after inserting a notification.
 */
export async function dispatchPushNotification(notification: NotificationRow): Promise<void> {
  const supabase = createAdminClient();

  // 1. Check user's notification preferences
  const prefKey = TYPE_TO_PREF[notification.type];
  if (prefKey) {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('push_enabled, ' + prefKey)
      .eq('user_id', notification.recipient_id)
      .single();

    if (prefs) {
      // If push is globally disabled, skip
      if (prefs.push_enabled === false) return;
      // If the specific category is disabled, skip
      if ((prefs as Record<string, unknown>)[prefKey] === false) return;
    }
    // If no prefs row, defaults are all enabled
  }

  // 2. Resolve actor name if there's an actor_id
  let actorName: string | null = null;
  if (notification.actor_id) {
    const { data: actor } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', notification.actor_id)
      .single();

    if (actor) {
      actorName = actor.display_name || actor.username || null;
    }
  }

  // 3. Build payload
  const payload = buildPushPayload(notification, actorName);

  // 4. Send push
  await sendPushToUser(notification.recipient_id, payload, {
    notificationId: notification.id,
  });
}
