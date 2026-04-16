import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { analyzeContent } from '@cfb-social/moderation';
import { getToxicityScores } from '@/lib/providers/perspective';

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

    // Run AI moderation + Perspective in parallel. Perspective returns null when key missing.
    const [result, perspectiveScores] = await Promise.all([
      analyzeContent(post.content),
      getToxicityScores(post.content),
    ]);

    // Compute Perspective-implied action (severity escalates with toxicity)
    // Thresholds chosen conservatively: 0.8+ REJECT, 0.6+ FLAG.
    let perspectiveAction: 'ALLOW' | 'FLAG' | 'REJECT' = 'ALLOW';
    if (perspectiveScores) {
      const maxScore = Math.max(
        perspectiveScores.toxicity,
        perspectiveScores.severeToxicity,
        perspectiveScores.threat,
        perspectiveScores.identityAttack,
      );
      if (maxScore >= 0.8) perspectiveAction = 'REJECT';
      else if (maxScore >= 0.6) perspectiveAction = 'FLAG';
    }

    // Most-severe wins: REJECT > FLAG > ALLOW
    const severity = { ALLOW: 0, FLAG: 1, REJECT: 2 };
    const finalAction =
      severity[perspectiveAction] > severity[result.action]
        ? perspectiveAction
        : result.action;

    // Update post with moderation results. Merge Perspective scores into labels when present.
    const mergedLabels: Record<string, number> = { ...result.labels };
    if (perspectiveScores) {
      mergedLabels.perspective_toxicity = perspectiveScores.toxicity;
      mergedLabels.perspective_severe_toxicity = perspectiveScores.severeToxicity;
      mergedLabels.perspective_insult = perspectiveScores.insult;
      mergedLabels.perspective_threat = perspectiveScores.threat;
      mergedLabels.perspective_identity_attack = perspectiveScores.identityAttack;
      mergedLabels.perspective_profanity = perspectiveScores.profanity;
    }

    const updateData: Record<string, unknown> = {
      moderation_score: result.score,
      moderation_labels: mergedLabels,
      moderation_reason: result.reason,
    };

    // Auto-flag if merged action says FLAG or REJECT
    if (finalAction === 'FLAG' || finalAction === 'REJECT') {
      updateData.status = 'FLAGGED';
      updateData.flagged_at = new Date().toISOString();
    }

    await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId);

    // Log moderation event if flagged
    if (finalAction === 'FLAG' || finalAction === 'REJECT') {
      await supabase
        .from('moderation_events')
        .insert({
          post_id: postId,
          user_id: post.author_id,
          event_type: 'AUTO_FLAG',
          action_taken: finalAction,
          reason: result.reason,
        });
    }

    return NextResponse.json({
      action: finalAction,
      score: result.score,
      reason: result.reason,
      perspective: perspectiveScores,
    });
  } catch (err) {
    console.error('Moderation error:', err);
    // Don't block post creation if moderation fails
    return NextResponse.json({ error: 'Moderation failed' }, { status: 500 });
  }
}
