import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from './notifications';

interface NotificationInput {
  recipient_id: string;
  actor_id?: string | null;
  type: string;
  post_id?: string | null;
  challenge_id?: string | null;
  data?: Record<string, unknown> | null;
}

/**
 * Create an in-app notification and dispatch a push notification.
 * The push dispatch is fire-and-forget so it never blocks the calling code.
 *
 * @param client - Supabase client (user's or admin)
 * @param notification - The notification to create
 * @param dispatchPush - Optional push dispatcher function (injected from web app)
 */
export async function createAndPushNotification(
  client: SupabaseClient,
  notification: NotificationInput,
  dispatchPush?: (notification: { id: string; recipient_id: string; actor_id: string | null; type: string; post_id: string | null; challenge_id: string | null; data: Record<string, unknown> | null }) => Promise<void>
) {
  // 1. Insert notification row
  const row = await createNotification(client, notification);

  // 2. Dispatch push (fire-and-forget)
  if (dispatchPush && row) {
    dispatchPush({
      id: row.id,
      recipient_id: row.recipient_id,
      actor_id: row.actor_id ?? null,
      type: row.type,
      post_id: row.post_id ?? null,
      challenge_id: row.challenge_id ?? null,
      data: (row.data as Record<string, unknown>) ?? null,
    }).catch((err) => {
      console.error('[Push] Dispatch failed:', err);
    });
  }

  return row;
}
