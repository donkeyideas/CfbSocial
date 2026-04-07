import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dispatchPushNotification } from '@/lib/firebase/dispatcher';

/**
 * POST /api/push/dispatch
 * Called by client components after they insert a notification row.
 * Triggers push notification delivery for that notification.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId } = await req.json();
    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId required' }, { status: 400 });
    }

    // Fetch the notification row
    const { data: notification } = await supabase
      .from('notifications')
      .select('id, recipient_id, actor_id, type, post_id, challenge_id, data')
      .eq('id', notificationId)
      .single();

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Dispatch push (fire-and-forget)
    dispatchPushNotification({
      id: notification.id,
      recipient_id: notification.recipient_id,
      actor_id: notification.actor_id,
      type: notification.type,
      post_id: notification.post_id,
      challenge_id: notification.challenge_id,
      data: notification.data as Record<string, unknown> | null,
    }).catch((err) => console.error('[Push Dispatch] Error:', err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Push Dispatch] Error:', err);
    return NextResponse.json({ error: 'Failed to dispatch' }, { status: 500 });
  }
}
