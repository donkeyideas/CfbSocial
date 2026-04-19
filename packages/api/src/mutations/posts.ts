// ============================================================
// Post Mutations
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreatePostInput, PostRow, ReactionRow, RepostRow, BookmarkRow } from '@cfb-social/types';

/**
 * Create a new post. The author_id is set from the current user session.
 */
export async function createPost(
  client: SupabaseClient,
  input: CreatePostInput
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('posts')
    .insert({
      author_id: user.id,
      content: input.content,
      post_type: input.postType,
      media_urls: input.mediaUrls ?? [],
      school_id: input.schoolId ?? null,
      parent_id: input.parentId ?? null,
      receipt_prediction: input.receiptPrediction ?? null,
      receipt_deadline: input.receiptDeadline ?? null,
      sideline_game: input.sidelineGame ?? null,
      sideline_quarter: input.sidelineQuarter ?? null,
      sideline_time: input.sidelineTime ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  // Award XP for creating a post (fire-and-forget, don't block)
  client.rpc('award_xp', {
    p_user_id: user.id,
    p_amount: 10,
    p_source: 'POST_CREATED',
    p_reference_id: data.id,
    p_description: 'Created a post',
  }).then(null, () => { /* silently ignore XP errors */ });

  return data as PostRow;
}

/**
 * Update an existing post (content only, marks as edited)
 */
export async function updatePost(
  client: SupabaseClient,
  id: string,
  updates: { content?: string; mediaUrls?: string[] }
) {
  const updatePayload: Record<string, unknown> = {
    is_edited: true,
    edited_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (updates.content !== undefined) {
    updatePayload.content = updates.content;
  }
  if (updates.mediaUrls !== undefined) {
    updatePayload.media_urls = updates.mediaUrls;
  }

  const { data, error } = await client
    .from('posts')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PostRow;
}

/**
 * Delete a post (RLS ensures only the author can delete)
 */
export async function deletePost(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * React to a post (TOUCHDOWN or FUMBLE).
 * Upserts - replaces any existing reaction by this user on this post.
 */
export async function reactToPost(
  client: SupabaseClient,
  postId: string,
  type: 'TOUCHDOWN' | 'FUMBLE'
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Remove existing reaction first (to handle switching from TOUCHDOWN to FUMBLE)
  await client
    .from('reactions')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', postId);

  const { data, error } = await client
    .from('reactions')
    .insert({
      user_id: user.id,
      post_id: postId,
      reaction_type: type,
    })
    .select()
    .single();

  if (error) throw error;

  // Award XP to the post author for receiving a TOUCHDOWN (fire-and-forget)
  if (type === 'TOUCHDOWN') {
    client.from('posts').select('author_id').eq('id', postId).single()
      .then(({ data: post }) => {
        if (post?.author_id && post.author_id !== user.id) {
          return client.rpc('award_xp', {
            p_user_id: post.author_id,
            p_amount: 5,
            p_source: 'TOUCHDOWN_RECEIVED',
            p_reference_id: postId,
            p_description: 'Received a touchdown',
          });
        }
      })
      .then(null, () => { /* silently ignore XP errors */ });
  }

  return data as ReactionRow;
}

/**
 * Remove a reaction from a post
 */
export async function removeReaction(client: SupabaseClient, postId: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await client
    .from('reactions')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', postId);

  if (error) throw error;
}

/**
 * Repost a post with an optional quote
 */
export async function repost(
  client: SupabaseClient,
  postId: string,
  quote?: string
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('reposts')
    .insert({
      user_id: user.id,
      post_id: postId,
      quote: quote ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as RepostRow;
}

/**
 * Bookmark a post
 */
export async function bookmark(client: SupabaseClient, postId: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('bookmarks')
    .insert({
      user_id: user.id,
      post_id: postId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BookmarkRow;
}

/**
 * Remove a bookmark
 */
export async function removeBookmark(client: SupabaseClient, postId: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await client
    .from('bookmarks')
    .delete()
    .eq('user_id', user.id)
    .eq('post_id', postId);

  if (error) throw error;
}
