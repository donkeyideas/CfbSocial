// ============================================================
// Dynasty Mode Mutations
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { XP_VALUES } from '../constants/xp';
import type { XPAction } from '../constants/xp';
import { createNotification } from './notifications';

/**
 * Award XP to the current user.
 * Updates profiles.xp, logs to xp_log, checks for level up.
 */
export async function awardXP(
  client: SupabaseClient,
  action: XPAction,
  referenceId?: string,
  description?: string
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const amount = XP_VALUES[action];
  if (amount === 0) return null;

  // Log the XP event
  const { error: logError } = await client
    .from('xp_log')
    .insert({
      user_id: user.id,
      amount,
      source: action,
      reference_id: referenceId ?? null,
      description: description ?? null,
    });

  if (logError) throw logError;

  // Get current profile XP
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('xp, level')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;

  const currentXP = (profile?.xp ?? 0) + amount;
  const currentLevel = profile?.level ?? 1;

  // Calculate new level from XP thresholds
  // Thresholds imported from types are read-only; replicate logic here
  const thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600, 8200, 10000, 12500, 15500, 19000, 23000, 28000, 34000, 41000, 50000];
  let newLevel = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (currentXP >= thresholds[i]!) {
      newLevel = i + 1;
      break;
    }
  }

  // Determine tier
  let newTier = 'WALK_ON';
  if (newLevel >= 18) newTier = 'HALL_OF_FAME';
  else if (newLevel >= 14) newTier = 'HEISMAN';
  else if (newLevel >= 10) newTier = 'ALL_AMERICAN';
  else if (newLevel >= 7) newTier = 'ALL_CONFERENCE';
  else if (newLevel >= 4) newTier = 'STARTER';

  // Update profile
  const { error: updateError } = await client
    .from('profiles')
    .update({
      xp: currentXP,
      level: newLevel,
      dynasty_tier: newTier,
    })
    .eq('id', user.id);

  if (updateError) throw updateError;

  // Notify user on level up
  if (newLevel > currentLevel) {
    const tierNames: Record<string, string> = {
      WALK_ON: 'Walk-On',
      STARTER: 'Starter',
      ALL_CONFERENCE: 'All-Conference',
      ALL_AMERICAN: 'All-American',
      HEISMAN: 'Heisman',
      HALL_OF_FAME: 'Hall of Fame',
    };
    await createNotification(client, {
      recipient_id: user.id,
      type: 'LEVEL_UP',
      data: { level: newLevel, level_name: tierNames[newTier] || newTier },
    });
  }

  return {
    amount,
    newXP: currentXP,
    newLevel,
    newTier,
    leveledUp: newLevel > currentLevel,
  };
}

/**
 * Unlock an achievement for the current user
 */
export async function unlockAchievement(
  client: SupabaseClient,
  achievementId: string
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if already unlocked
  const { data: existing } = await client
    .from('user_achievements')
    .select('id')
    .eq('user_id', user.id)
    .eq('achievement_id', achievementId)
    .maybeSingle();

  if (existing) return null; // Already unlocked

  // Get achievement for XP reward
  const { data: achievement } = await client
    .from('achievements')
    .select('xp_reward, name')
    .eq('id', achievementId)
    .single();

  // Unlock
  const { error } = await client
    .from('user_achievements')
    .insert({
      user_id: user.id,
      achievement_id: achievementId,
    });

  if (error) throw error;

  // Award XP if achievement has a reward
  if (achievement && achievement.xp_reward > 0) {
    await client.from('xp_log').insert({
      user_id: user.id,
      amount: achievement.xp_reward,
      source: 'ACHIEVEMENT_UNLOCKED',
      reference_id: achievementId,
      description: `Achievement: ${achievement.name}`,
    });

    // Update profile XP
    const { data: profile } = await client
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single();

    const newXP = (profile?.xp ?? 0) + achievement.xp_reward;

    await client
      .from('profiles')
      .update({ xp: newXP })
      .eq('id', user.id);
  }

  // Notify user of achievement unlock
  await createNotification(client, {
    recipient_id: user.id,
    type: 'ACHIEVEMENT_UNLOCKED',
    data: { achievement_name: achievement?.name || 'Unknown' },
  });

  return { achievementId, name: achievement?.name };
}
