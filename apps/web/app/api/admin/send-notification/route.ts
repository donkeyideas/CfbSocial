import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { sendPushToAudience } from '@/lib/firebase/send';

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('cookie');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the regular client to check auth
    const { createClient } = await import('@/lib/supabase/server');
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { title, body, targetAudience, targetId } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body required' }, { status: 400 });
    }

    // Create system notification record
    const { data: sysNotif, error: insertError } = await supabase
      .from('system_notifications')
      .insert({
        title,
        body,
        target_audience: targetAudience || 'all',
        target_id: targetId || null,
        created_by: user.id,
        status: 'sending',
      })
      .select()
      .single();

    if (insertError || !sysNotif) {
      console.error('[Send Notification] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    // Send push notifications to audience
    const result = await sendPushToAudience(
      { title, body, data: { type: 'SYSTEM' } },
      {
        systemNotificationId: sysNotif.id,
        targetAudience: targetAudience || 'all',
        targetId: targetId || undefined,
      }
    );

    // Also create in-app SYSTEM notifications for the target audience
    let userQuery = supabase.from('profiles').select('id');
    if (targetAudience === 'school' && targetId) {
      userQuery = userQuery.eq('school_id', targetId);
    } else if (targetAudience === 'conference' && targetId) {
      const { data: schools } = await supabase
        .from('schools')
        .select('id')
        .eq('conference', targetId);
      if (schools && schools.length > 0) {
        userQuery = userQuery.in('school_id', schools.map((s) => s.id));
      }
    }

    const { data: targetUsers } = await userQuery;
    if (targetUsers && targetUsers.length > 0) {
      // Batch insert in-app notifications (max 1000 at a time)
      const batches = [];
      for (let i = 0; i < targetUsers.length; i += 1000) {
        const batch = targetUsers.slice(i, i + 1000).map((u) => ({
          recipient_id: u.id,
          type: 'SYSTEM',
          data: { message: body, title, system_notification_id: sysNotif.id },
        }));
        batches.push(batch);
      }

      for (const batch of batches) {
        await supabase.from('notifications').insert(batch);
      }
    }

    // Update system notification with results
    await supabase
      .from('system_notifications')
      .update({
        status: 'sent',
        sent_count: result.sent,
        failed_count: result.failed,
        sent_at: new Date().toISOString(),
      })
      .eq('id', sysNotif.id);

    return NextResponse.json({
      success: true,
      id: sysNotif.id,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err) {
    console.error('[Send Notification] Error:', err);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
