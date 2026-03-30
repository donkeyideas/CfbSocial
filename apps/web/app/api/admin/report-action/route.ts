import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { reportId, postId, reportedUserId, action } = await req.json();
    if (!reportId || !action) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const admin = createAdminClient();

    if (action === 'action') {
      await admin
        .from('reports')
        .update({
          status: 'ACTIONED',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (postId) {
        await admin
          .from('posts')
          .update({ status: 'FLAGGED', flagged_at: new Date().toISOString() })
          .eq('id', postId);

        await admin
          .from('moderation_events')
          .insert({
            post_id: postId,
            user_id: reportedUserId,
            moderator_id: user.id,
            event_type: 'MANUAL_FLAG',
            action_taken: 'FLAG',
          });
      }
    } else if (action === 'dismiss') {
      await admin
        .from('reports')
        .update({
          status: 'DISMISSED',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Report action error:', err);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
