// ============================================================
// Moderation Mutations
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from './notifications';

/**
 * Submit a user report against a post
 */
export async function reportPost(
  client: SupabaseClient,
  postId: string,
  reason: string,
  description?: string
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the post's author for reported_user_id
  const { data: post } = await client
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single();

  const { data, error } = await client
    .from('reports')
    .insert({
      reporter_id: user.id,
      post_id: postId,
      reported_user_id: post?.author_id ?? null,
      reason,
      description: description ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Submit an appeal for a flagged post
 */
export async function appealPost(
  client: SupabaseClient,
  postId: string,
  reason: string
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('appeals')
    .insert({
      post_id: postId,
      user_id: user.id,
      reason,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Moderator: restore a flagged post
 */
export async function restorePost(client: SupabaseClient, postId: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Update post status
  const { error: postError } = await client
    .from('posts')
    .update({ status: 'PUBLISHED', flagged_at: null })
    .eq('id', postId);

  if (postError) throw postError;

  // Log moderation event
  const { error: eventError } = await client
    .from('moderation_events')
    .insert({
      post_id: postId,
      moderator_id: user.id,
      event_type: 'RESTORE',
      action_taken: 'RESTORE',
    });

  if (eventError) throw eventError;
}

/**
 * Moderator: remove a flagged post
 */
export async function removePost(client: SupabaseClient, postId: string, reason?: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the post's author
  const { data: post } = await client
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single();

  // Update post status
  const { error: postError } = await client
    .from('posts')
    .update({ status: 'REMOVED', removed_at: new Date().toISOString() })
    .eq('id', postId);

  if (postError) throw postError;

  // Log moderation event
  const { error: eventError } = await client
    .from('moderation_events')
    .insert({
      post_id: postId,
      user_id: post?.author_id ?? null,
      moderator_id: user.id,
      event_type: 'MANUAL_REMOVE',
      action_taken: 'REMOVE',
      moderator_notes: reason ?? null,
    });

  if (eventError) throw eventError;
}

/**
 * Moderator: dismiss a report
 */
export async function dismissReport(client: SupabaseClient, reportId: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await client
    .from('reports')
    .update({
      status: 'DISMISSED',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (error) throw error;
}

/**
 * Moderator: action a report (flag or remove the post)
 */
export async function actionReport(
  client: SupabaseClient,
  reportId: string,
  action: 'FLAG' | 'REMOVE'
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the report to find the post
  const { data: report, error: reportFetchError } = await client
    .from('reports')
    .select('post_id, reported_user_id')
    .eq('id', reportId)
    .single();

  if (reportFetchError || !report) throw new Error('Report not found');

  // Update report status
  const { error: reportError } = await client
    .from('reports')
    .update({
      status: 'ACTIONED',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (reportError) throw reportError;

  if (report.post_id) {
    // Update the post
    const newStatus = action === 'REMOVE' ? 'REMOVED' : 'FLAGGED';
    const updateData: Record<string, unknown> = { status: newStatus };
    if (action === 'REMOVE') updateData.removed_at = new Date().toISOString();
    if (action === 'FLAG') updateData.flagged_at = new Date().toISOString();

    await client
      .from('posts')
      .update(updateData)
      .eq('id', report.post_id);

    // Log moderation event
    await client
      .from('moderation_events')
      .insert({
        post_id: report.post_id,
        user_id: report.reported_user_id,
        moderator_id: user.id,
        event_type: action === 'REMOVE' ? 'MANUAL_REMOVE' : 'MANUAL_FLAG',
        action_taken: action,
      });
  }
}

/**
 * Moderator: approve an appeal (restore the post)
 */
export async function approveAppeal(client: SupabaseClient, appealId: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the appeal
  const { data: appeal } = await client
    .from('appeals')
    .select('post_id, user_id')
    .eq('id', appealId)
    .single();

  if (!appeal) throw new Error('Appeal not found');

  // Update appeal
  await client
    .from('appeals')
    .update({
      status: 'APPROVED',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', appealId);

  // Restore the post
  await client
    .from('posts')
    .update({ status: 'PUBLISHED', flagged_at: null })
    .eq('id', appeal.post_id);

  // Log event
  await client
    .from('moderation_events')
    .insert({
      post_id: appeal.post_id,
      moderator_id: user.id,
      event_type: 'RESTORE',
      action_taken: 'RESTORE',
      moderator_notes: 'Appeal approved',
    });

  // Notify user their appeal was approved
  if (appeal.user_id) {
    await createNotification(client, {
      recipient_id: appeal.user_id,
      type: 'MODERATION_APPEAL_RESULT',
      post_id: appeal.post_id,
      data: { result: 'approved' },
    });
  }
}

/**
 * Moderator: deny an appeal
 */
export async function denyAppeal(client: SupabaseClient, appealId: string, notes?: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the appeal to find the user
  const { data: appeal } = await client
    .from('appeals')
    .select('user_id, post_id')
    .eq('id', appealId)
    .single();

  await client
    .from('appeals')
    .update({
      status: 'DENIED',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes ?? null,
    })
    .eq('id', appealId);

  // Notify user their appeal was denied
  if (appeal?.user_id) {
    await createNotification(client, {
      recipient_id: appeal.user_id,
      type: 'MODERATION_APPEAL_RESULT',
      post_id: appeal.post_id,
      data: { result: 'denied' },
    });
  }
}
