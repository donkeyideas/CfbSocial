// ============================================================
// Challenge Mutations
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChallengeRow, ChallengeVoteRow } from '@cfb-social/types';
import { createNotification } from './notifications';

/**
 * Create a new challenge against another user.
 * Optionally references a post that sparked the challenge.
 */
export async function createChallenge(
  client: SupabaseClient,
  challengedId: string,
  topic: string,
  postId?: string
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (user.id === challengedId) {
    throw new Error('Cannot challenge yourself');
  }

  const { data, error } = await client
    .from('challenges')
    .insert({
      challenger_id: user.id,
      challenged_id: challengedId,
      topic,
      post_id: postId ?? null,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error) throw error;

  // Notify the challenged user
  await createNotification(client, {
    recipient_id: challengedId,
    actor_id: user.id,
    type: 'CHALLENGE',
    challenge_id: data.id,
    data: { topic },
  });

  return data as ChallengeRow;
}

/**
 * Respond to a challenge with an argument.
 * If the current user is the challenged user, this activates the challenge.
 * If the current user is the challenger, this sets their argument.
 */
export async function respondToChallenge(
  client: SupabaseClient,
  id: string,
  argument: string
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch the challenge to determine which party is responding
  const { data: challenge, error: fetchError } = await client
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (challenge.challenger_id === user.id) {
    updates.challenger_argument = argument;
  } else if (challenge.challenged_id === user.id) {
    updates.challenged_argument = argument;
    // When challenged user responds, move to ACTIVE status
    if (challenge.status === 'PENDING') {
      updates.status = 'ACTIVE';
    }
  } else {
    throw new Error('Not a participant in this challenge');
  }

  // If both arguments are now set, move to voting phase
  const hasChallenger = challenge.challenger_id === user.id ? true : !!challenge.challenger_argument;
  const hasChallenged = challenge.challenged_id === user.id ? true : !!challenge.challenged_argument;

  if (hasChallenger && hasChallenged) {
    updates.status = 'VOTING';
    // Set voting deadline to 24 hours from now
    updates.voting_ends_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  const { data, error } = await client
    .from('challenges')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Notify the other party
  const otherUserId = challenge.challenger_id === user.id
    ? challenge.challenged_id
    : challenge.challenger_id;
  await createNotification(client, {
    recipient_id: otherUserId,
    actor_id: user.id,
    type: 'CHALLENGE_RESPONSE',
    challenge_id: id,
  });

  return data as ChallengeRow;
}

/**
 * Vote on a challenge for one of the two participants.
 * Each user can only vote once per challenge (enforced by UNIQUE constraint).
 */
export async function voteOnChallenge(
  client: SupabaseClient,
  id: string,
  votedForId: string
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('challenge_votes')
    .insert({
      challenge_id: id,
      user_id: user.id,
      voted_for: votedForId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ChallengeVoteRow;
}

/**
 * Resolve a VOTING challenge whose voting period has ended.
 * Determines the winner, updates the challenge, and creates a CHALLENGE_RESULT post.
 */
export async function resolveChallenge(
  client: SupabaseClient,
  challengeId: string
) {
  // Fetch the challenge
  const { data: challenge, error: fetchError } = await client
    .from('challenges')
    .select('*, challenger:profiles!challenges_challenger_id_fkey(id, username, display_name), challenged:profiles!challenges_challenged_id_fkey(id, username, display_name)')
    .eq('id', challengeId)
    .single();

  if (fetchError) throw fetchError;
  if (challenge.status !== 'VOTING') {
    throw new Error('Challenge is not in voting phase');
  }

  // Check if voting has ended
  if (challenge.voting_ends_at && new Date(challenge.voting_ends_at) > new Date()) {
    throw new Error('Voting period has not ended yet');
  }

  const challengerVotes = challenge.challenger_votes ?? 0;
  const challengedVotes = challenge.challenged_votes ?? 0;
  const totalVotes = challengerVotes + challengedVotes;

  // Determine winner (tie goes to challenged — defender's advantage)
  const winnerId = challengerVotes > challengedVotes
    ? challenge.challenger_id
    : challenge.challenged_id;

  const xpAward = Math.max(50, totalVotes * 5);

  // Update challenge to COMPLETED
  const { error: updateError } = await client
    .from('challenges')
    .update({
      status: 'COMPLETED',
      winner_id: winnerId,
      xp_awarded: xpAward,
      updated_at: new Date().toISOString(),
    })
    .eq('id', challengeId);

  if (updateError) throw updateError;

  // Notify both participants of the result
  const loserId = winnerId === challenge.challenger_id
    ? challenge.challenged_id
    : challenge.challenger_id;
  await createNotification(client, {
    recipient_id: winnerId,
    type: 'CHALLENGE_WON',
    challenge_id: challengeId,
  });
  await createNotification(client, {
    recipient_id: loserId,
    type: 'CHALLENGE_LOST',
    challenge_id: challengeId,
  });

  // Build result content
  const challengerName = (challenge.challenger as Record<string, string>)?.display_name
    ?? (challenge.challenger as Record<string, string>)?.username ?? 'Challenger';
  const challengedName = (challenge.challenged as Record<string, string>)?.display_name
    ?? (challenge.challenged as Record<string, string>)?.username ?? 'Challenged';

  const winnerName = winnerId === challenge.challenger_id ? challengerName : challengedName;
  const challengerPct = totalVotes > 0 ? Math.round((challengerVotes / totalVotes) * 100) : 50;
  const challengedPct = totalVotes > 0 ? Math.round((challengedVotes / totalVotes) * 100) : 50;

  const content = [
    `${challenge.topic}`,
    ``,
    `${challengerName} (${challengerPct}%) vs ${challengedName} (${challengedPct}%)`,
    `${totalVotes} total votes`,
    ``,
    `Winner: ${winnerName}`,
  ].join('\n');

  // Create the CHALLENGE_RESULT post (authored by the winner)
  const { error: postError } = await client
    .from('posts')
    .insert({
      content,
      post_type: 'CHALLENGE_RESULT',
      author_id: winnerId,
      status: 'PUBLISHED',
    });

  if (postError) throw postError;

  // Award XP to winner
  await client
    .from('profiles')
    .update({
      xp: (await client.from('profiles').select('xp').eq('id', winnerId).single()).data?.xp + xpAward,
    })
    .eq('id', winnerId);

  return { winnerId, xpAward, totalVotes };
}
