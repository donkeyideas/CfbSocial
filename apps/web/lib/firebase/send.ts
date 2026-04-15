import { getMessagingInstance } from './admin';
import { sendExpoPush } from './expo-push';
import { createAdminClient } from '@/lib/admin/supabase/admin';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface SendResult {
  sent: number;
  failed: number;
}

/** Check if a token is an Expo push token */
function isExpoToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

/**
 * Send a push notification to a single FCM token.
 * Returns success/failure and error code if applicable.
 */
async function sendToFcmToken(
  token: string,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    console.warn('[FCM] Messaging not configured — skipping push to token');
    return { success: false, error: 'FCM not configured' };
  }

  try {
    const data: Record<string, string> = {};
    if (payload.data) {
      for (const [k, v] of Object.entries(payload.data)) {
        if (v != null) data[k] = String(v);
      }
    }

    await messaging.send({
      token,
      notification: { title: payload.title, body: payload.body },
      data,
      android: {
        priority: 'high',
        notification: { channelId: 'default', sound: 'default' },
      },
      apns: {
        payload: {
          aps: {
            alert: { title: payload.title, body: payload.body },
            sound: 'default',
          },
        },
      },
    });

    return { success: true };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    const code = err.code || '';
    const msg = (err.message || '').toLowerCase();

    // Detect invalid/expired tokens — check both error code and message
    const isInvalidToken =
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/registration-token-not-registered' ||
      msg.includes('not a valid fcm registration token') ||
      msg.includes('not registered') ||
      msg.includes('invalid registration');

    if (isInvalidToken) {
      return { success: false, error: 'INVALID_TOKEN' };
    }
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Send push notifications to all active device tokens for a user.
 * Supports both Expo push tokens and FCM tokens.
 * Logs each attempt to push_notification_log.
 * Deactivates invalid tokens automatically.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  meta?: { notificationId?: string; systemNotificationId?: string }
): Promise<SendResult> {
  const supabase = createAdminClient();
  const result: SendResult = { sent: 0, failed: 0 };

  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('id, token, platform')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!tokens || tokens.length === 0) return result;

  // Separate Expo tokens from FCM tokens
  const expoTokens = tokens.filter((t) => isExpoToken(t.token));
  const fcmTokens = tokens.filter((t) => !isExpoToken(t.token));

  // Send to Expo tokens in batch
  if (expoTokens.length > 0) {
    const expoResult = await sendExpoPush(
      expoTokens.map((t) => t.token),
      payload
    );

    // Log results for each Expo token
    for (const t of expoTokens) {
      const isInvalid = expoResult.invalidTokens.includes(t.token);
      const success = !isInvalid && expoResult.sent > 0;

      await supabase.from('push_notification_log').insert({
        notification_id: meta?.notificationId ?? null,
        system_notification_id: meta?.systemNotificationId ?? null,
        user_id: userId,
        device_token: t.token.substring(0, 50),
        platform: t.platform,
        status: success ? 'sent' : 'failed',
        error_message: isInvalid ? 'DeviceNotRegistered' : null,
        sent_at: new Date().toISOString(),
      });

      if (isInvalid) {
        await supabase
          .from('device_tokens')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', t.id);
      }
    }

    result.sent += expoResult.sent;
    result.failed += expoResult.failed;
  }

  // Send to FCM tokens individually
  for (const t of fcmTokens) {
    const sendResult = await sendToFcmToken(t.token, payload);

    await supabase.from('push_notification_log').insert({
      notification_id: meta?.notificationId ?? null,
      system_notification_id: meta?.systemNotificationId ?? null,
      user_id: userId,
      device_token: t.token,
      platform: t.platform,
      status: sendResult.success ? 'sent' : 'failed',
      error_message: sendResult.error ?? null,
      sent_at: new Date().toISOString(),
    });

    if (sendResult.success) {
      result.sent++;
    } else {
      result.failed++;
      if (sendResult.error === 'INVALID_TOKEN') {
        await supabase
          .from('device_tokens')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', t.id);
      }
    }
  }

  return result;
}

/**
 * Send a push notification to all users (for system broadcasts).
 * Can be filtered by school_id or conference.
 */
export async function sendPushToAudience(
  payload: PushPayload,
  options: {
    systemNotificationId: string;
    targetAudience: 'all' | 'school' | 'conference';
    targetId?: string;
  }
): Promise<SendResult> {
  const supabase = createAdminClient();
  const result: SendResult = { sent: 0, failed: 0 };

  // Get target user IDs based on audience (exclude bots)
  let userQuery = supabase.from('profiles').select('id').or('is_bot.is.null,is_bot.eq.false');

  if (options.targetAudience === 'school' && options.targetId) {
    userQuery = userQuery.eq('school_id', options.targetId);
  } else if (options.targetAudience === 'conference' && options.targetId) {
    // Get schools in conference first, then users
    const { data: schools } = await supabase
      .from('schools')
      .select('id')
      .eq('conference', options.targetId);

    if (schools && schools.length > 0) {
      const schoolIds = schools.map((s) => s.id);
      userQuery = userQuery.in('school_id', schoolIds);
    } else {
      return result;
    }
  }

  const { data: users } = await userQuery;
  if (!users || users.length === 0) return result;

  // Check each user's notification preferences and send
  for (const user of users) {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('push_enabled, marketing_notifications')
      .eq('user_id', user.id)
      .single();

    // Default to enabled if no preferences set
    const pushEnabled = prefs?.push_enabled !== false;
    const marketingEnabled = prefs?.marketing_notifications !== false;

    if (!pushEnabled || !marketingEnabled) continue;

    const userResult = await sendPushToUser(user.id, payload, {
      systemNotificationId: options.systemNotificationId,
    });

    result.sent += userResult.sent;
    result.failed += userResult.failed;
  }

  return result;
}
