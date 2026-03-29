import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { analyzeContent } from '@cfb-social/moderation';

export async function POST(req: NextRequest) {
  try {
    // Verify the caller is authenticated
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { postId } = await req.json();
    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    }

    // Use service role to bypass RLS for moderation updates
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Fetch the post
    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select('id, content, author_id, status')
      .eq('id', postId)
      .single();

    if (fetchErr || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Only moderate PUBLISHED posts
    if (post.status !== 'PUBLISHED') {
      return NextResponse.json({ skipped: true });
    }

    // Run AI moderation
    const result = await analyzeContent(post.content);

    // Update post with moderation results
    const updateData: Record<string, unknown> = {
      moderation_score: result.score,
      moderation_labels: result.labels,
      moderation_reason: result.reason,
    };

    // Auto-flag if AI says FLAG or REJECT
    if (result.action === 'FLAG' || result.action === 'REJECT') {
      updateData.status = 'FLAGGED';
      updateData.flagged_at = new Date().toISOString();
    }

    await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId);

    // Log moderation event if flagged
    if (result.action === 'FLAG' || result.action === 'REJECT') {
      await supabase
        .from('moderation_events')
        .insert({
          post_id: postId,
          user_id: post.author_id,
          event_type: 'AUTO_FLAG',
          action_taken: result.action,
          reason: result.reason,
        });
    }

    return NextResponse.json({
      action: result.action,
      score: result.score,
      reason: result.reason,
    });
  } catch (err) {
    console.error('Moderation error:', err);
    // Don't block post creation if moderation fails
    return NextResponse.json({ error: 'Moderation failed' }, { status: 500 });
  }
}
