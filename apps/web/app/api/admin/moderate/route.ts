import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { postId, action } = await req.json();
    if (!postId || !action) {
      return NextResponse.json({ error: 'Missing postId or action' }, { status: 400 });
    }

    // Verify admin is authenticated
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const admin = createAdminClient();

    if (action === 'restore') {
      await admin
        .from('posts')
        .update({ status: 'PUBLISHED', flagged_at: null })
        .eq('id', postId);

      // Also dismiss any pending reports for this post
      await admin
        .from('reports')
        .update({
          status: 'DISMISSED',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('post_id', postId)
        .in('status', ['PENDING', 'REVIEWING']);

      await admin
        .from('moderation_events')
        .insert({
          post_id: postId,
          moderator_id: user.id,
          event_type: 'RESTORE',
          action_taken: 'RESTORE',
        });
    } else if (action === 'remove') {
      const { data: post } = await admin
        .from('posts')
        .select('author_id')
        .eq('id', postId)
        .single();

      await admin
        .from('posts')
        .update({ status: 'REMOVED', removed_at: new Date().toISOString() })
        .eq('id', postId);

      // Mark reports as actioned
      await admin
        .from('reports')
        .update({
          status: 'ACTIONED',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('post_id', postId)
        .in('status', ['PENDING', 'REVIEWING']);

      await admin
        .from('moderation_events')
        .insert({
          post_id: postId,
          user_id: post?.author_id ?? null,
          moderator_id: user.id,
          event_type: 'MANUAL_REMOVE',
          action_taken: 'REMOVE',
        });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Moderation action error:', err);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
