import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { postId, reason, description } = await req.json();
    if (!postId || !reason) {
      return NextResponse.json({ error: 'Missing postId or reason' }, { status: 400 });
    }

    // Get the current user from the session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use service role client to bypass RLS for admin operations
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get the post author
    const { data: post } = await admin
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Prevent self-reporting
    if (post.author_id === user.id) {
      return NextResponse.json({ error: 'You cannot report your own post' }, { status: 400 });
    }

    // Insert the report
    const { error: insertError } = await admin
      .from('reports')
      .insert({
        reporter_id: user.id,
        post_id: postId,
        reported_user_id: post.author_id,
        reason,
        description: description || null,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already reported this post.' }, { status: 409 });
      }
      throw insertError;
    }

    // Flag the post (service role bypasses RLS)
    await admin
      .from('posts')
      .update({
        status: 'FLAGGED',
        flagged_at: new Date().toISOString(),
      })
      .eq('id', postId);

    // Notify post author their post was flagged (hide reporter identity)
    await admin.from('notifications').insert({
      recipient_id: post.author_id,
      type: 'POST_FLAGGED',
      post_id: postId,
    });

    // Log moderation event
    await admin
      .from('moderation_events')
      .insert({
        post_id: postId,
        user_id: post.author_id,
        moderator_id: user.id,
        event_type: 'USER_REPORT',
        action_taken: 'FLAG',
        reason: `${reason}${description ? ': ' + description : ''}`,
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Report error:', err);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
