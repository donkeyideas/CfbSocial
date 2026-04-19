import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { dispatchPushNotification } from '@/lib/firebase/dispatcher';

/**
 * POST /api/push/dispatch
 * Called by client components after they insert a notification row.
 * Triggers push notification delivery for that notification.
 * Supports both cookie-based auth (web) and Bearer token auth (mobile).
 */
export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;

    // Try cookie-based auth (web)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    }

    // Fallback: Bearer token auth (mobile app sends access_token as Bearer)
    if (!userId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const admin = createAdminClient();
        const { data: { user: tokenUser } } = await admin.auth.getUser(token);
        if (tokenUser) {
          userId = tokenUser.id;
        }
      }
    }

    if (!userId) {
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
