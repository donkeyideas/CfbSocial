// ============================================================
// Follow / Block Mutations
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from './notifications';

/**
 * Follow a user. Denormalized counts are updated by database trigger.
 */
export async function followUser(client: SupabaseClient, userId: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (user.id === userId) {
    throw new Error('Cannot follow yourself');
  }

  const { data, error } = await client
    .from('follows')
    .insert({
      follower_id: user.id,
      following_id: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Create follow notification (push dispatch handled by caller or API layer)
  await createNotification(client, {
    recipient_id: userId,
    actor_id: user.id,
    type: 'FOLLOW',
  });

  return data;
}

/**
 * Unfollow a user. Denormalized counts are updated by database trigger.
 */
export async function unfollowUser(client: SupabaseClient, userId: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await client
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', userId);

  if (error) throw error;
}

/**
 * Block a user. Also removes any existing follow relationship in both directions.
 */
export async function blockUser(client: SupabaseClient, userId: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (user.id === userId) {
    throw new Error('Cannot block yourself');
  }

  // Remove follows in both directions
  await client
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', userId);

  await client
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_id', user.id);

  // Create the block
  const { data, error } = await client
    .from('user_blocks')
    .insert({
      blocker_id: user.id,
      blocked_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Unblock a user
 */
export async function unblockUser(client: SupabaseClient, userId: string) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await client
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', userId);

  if (error) throw error;
}
