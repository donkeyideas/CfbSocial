// ============================================================
// Bot Admin Actions (Server-side)
// ============================================================

import { createAdminClient } from '@/lib/admin/supabase/admin';
import { BOT_PRESETS } from '@/lib/admin/bots/personalities';

export interface BotRow {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  banner_color: string | null;
  is_bot: boolean | null;
  bot_active: boolean | null;
  bot_personality: Record<string, unknown> | null;
  school_id: string | null;
  post_count: number | null;
  last_active_at: string | null;
  created_at: string | null;
  status: string;
  bot_mood: number | null;
  bot_mood_expires_at: string | null;
  bot_region: string | null;
  bot_age_bracket: string | null;
  bot_post_count_today: number | null;
  bot_last_post_at: string | null;
  school: {
    id: string;
    name: string;
    abbreviation: string;
    mascot: string;
    conference: string;
    primary_color: string;
    secondary_color: string;
    slug: string;
  } | null;
}

/**
 * Get all bots with school info.
 */
export async function getAllBots(): Promise<{ bots: BotRow[]; error?: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, banner_url, banner_color, is_bot, bot_active, bot_personality, school_id, post_count, last_active_at, created_at, status, bot_mood, bot_mood_expires_at, bot_region, bot_age_bracket, bot_post_count_today, bot_last_post_at, school:schools!profiles_school_id_fkey(id, name, abbreviation, mascot, conference, primary_color, secondary_color, slug)')
    .eq('is_bot', true)
    .order('created_at', { ascending: false });

  if (error) return { bots: [], error: error.message };

  const bots = (data ?? []).map((b: Record<string, unknown>) => ({
    ...b,
    school: Array.isArray(b.school) ? b.school[0] ?? null : b.school ?? null,
  })) as BotRow[];

  return { bots };
}

/**
 * Create a new bot user via Supabase Auth + profile update.
 */
export async function createBot(params: {
  username: string;
  displayName: string;
  schoolId: string;
  personalityType: string;
  bio?: string;
}): Promise<{ botId?: string; error?: string }> {
  const supabase = createAdminClient();

  // Check username uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', params.username)
    .limit(1);

  if (existing?.length) {
    return { error: 'Username already taken' };
  }

  const email = `bot-${params.username.toLowerCase().replace(/[^a-z0-9]/g, '')}@cfbsocial.com`;
  const password = crypto.randomUUID() + crypto.randomUUID();

  // Create auth user (trigger will create profile)
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: params.username,
      display_name: params.displayName,
    },
  });

  if (authError) return { error: authError.message };
  if (!authUser?.user) return { error: 'Failed to create auth user' };

  const botId = authUser.user.id;

  // Wait for trigger to create profile (poll up to 3 seconds)
  let profileExists = false;
  for (let i = 0; i < 6; i++) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', botId)
      .single();
    if (profile) {
      profileExists = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!profileExists) {
    // Trigger may not have fired; create profile manually
    await supabase.from('profiles').insert({
      id: botId,
      username: params.username,
      display_name: params.displayName,
    });
  }

  // Get personality preset
  const personality = BOT_PRESETS[params.personalityType] || BOT_PRESETS.homer;

  // Fetch school for banner_color
  const { data: school } = await supabase
    .from('schools')
    .select('primary_color')
    .eq('id', params.schoolId)
    .single();

  // Update profile with bot fields
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      username: params.username,
      display_name: params.displayName,
      bio: params.bio || null,
      is_bot: true,
      bot_active: false,
      bot_personality: personality as unknown as Record<string, unknown>,
      school_id: params.schoolId,
      banner_color: school?.primary_color || null,
      role: 'USER',
      status: 'ACTIVE',
    })
    .eq('id', botId);

  if (updateError) return { error: updateError.message };

  return { botId };
}

/**
 * Update a bot's profile.
 */
export async function updateBot(
  botId: string,
  updates: {
    displayName?: string;
    bio?: string;
    schoolId?: string;
    personalityType?: string;
    botActive?: boolean;
    avatarUrl?: string;
    bannerUrl?: string;
    bannerColor?: string;
  }
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const payload: Record<string, unknown> = {};
  if (updates.displayName !== undefined) payload.display_name = updates.displayName;
  if (updates.bio !== undefined) payload.bio = updates.bio || null;
  if (updates.schoolId !== undefined) payload.school_id = updates.schoolId;
  if (updates.botActive !== undefined) payload.bot_active = updates.botActive;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
  if (updates.bannerUrl !== undefined) payload.banner_url = updates.bannerUrl;
  if (updates.bannerColor !== undefined) payload.banner_color = updates.bannerColor;
  if (updates.personalityType !== undefined) {
    const personality = BOT_PRESETS[updates.personalityType] || BOT_PRESETS.homer;
    payload.bot_personality = personality as unknown as Record<string, unknown>;
  }

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', botId)
    .eq('is_bot', true);

  return { error: error?.message };
}

/**
 * Delete a bot (removes auth user, profile cascades).
 */
export async function deleteBot(botId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  // Soft delete: deactivate and mark suspended
  const { error } = await supabase
    .from('profiles')
    .update({ bot_active: false, status: 'SUSPENDED' })
    .eq('id', botId)
    .eq('is_bot', true);
  return { error: error?.message };
}

/**
 * Toggle all bots on/off globally.
 */
export async function toggleAllBots(active: boolean): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  // Update global setting
  await supabase
    .from('admin_settings')
    .upsert({ key: 'bots_global_active', value: String(active), updated_at: new Date().toISOString() }, { onConflict: 'key' });

  // Bulk update all bot profiles
  const { error } = await supabase
    .from('profiles')
    .update({ bot_active: active })
    .eq('is_bot', true)
    .eq('status', 'ACTIVE');

  return { error: error?.message };
}

/**
 * Get global bot status.
 */
export async function getGlobalBotStatus(): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'bots_global_active')
    .single();
  return data?.value === 'true';
}

/**
 * Trigger a manual post from a specific bot.
 */
export async function triggerBotPost(botId: string): Promise<{ postId?: string; error?: string }> {
  const { postBotTake } = await import('@/lib/admin/bots/engine');
  const result = await postBotTake(botId);
  return { postId: result.postId, error: result.error };
}

/**
 * Diversify bot personalities, regions, and age brackets.
 */
export async function diversifyBots(): Promise<{ updated: number; errors: string[] }> {
  const { diversifyBotPersonalities } = await import('@/lib/admin/bots/seed');
  return diversifyBotPersonalities();
}

/**
 * Seed bots for all uncovered Power 5 schools.
 */
export async function seedPowerFive(): Promise<{ created: number; skipped: number; errors: string[] }> {
  const { seedPowerFiveBots } = await import('@/lib/admin/bots/seed');
  return seedPowerFiveBots();
}

/**
 * Seed local knowledge for top schools.
 */
export async function seedKnowledge(): Promise<{ inserted: number; error?: string }> {
  const { seedLocalKnowledge } = await import('@/lib/admin/bots/seed-local-knowledge');
  return seedLocalKnowledge();
}

/**
 * Get active event queue items.
 */
export async function getEventQueue(limit = 30): Promise<{ events: Record<string, unknown>[]; error?: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bot_event_queue')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { events: (data ?? []) as Record<string, unknown>[], error: error?.message };
}

/**
 * Get personality distribution of bots.
 */
export async function getPersonalityDistribution(): Promise<Record<string, number>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('bot_personality')
    .eq('is_bot', true)
    .eq('status', 'ACTIVE');

  const dist: Record<string, number> = {};
  for (const b of data ?? []) {
    const p = b.bot_personality as Record<string, unknown> | null;
    const type = (p?.type as string) || 'unknown';
    dist[type] = (dist[type] || 0) + 1;
  }
  return dist;
}

/**
 * Get bot activity log.
 */
export async function getBotActivityLog(params?: {
  botId?: string;
  limit?: number;
}): Promise<{ logs: Record<string, unknown>[]; error?: string }> {
  const supabase = createAdminClient();
  let query = supabase
    .from('bot_activity_log')
    .select('id, bot_id, action_type, target_post_id, created_post_id, content_preview, tokens_used, success, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(params?.limit ?? 50);

  if (params?.botId) {
    query = query.eq('bot_id', params.botId);
  }

  const { data, error } = await query;
  return { logs: (data ?? []) as Record<string, unknown>[], error: error?.message };
}

/**
 * Get bot stats.
 */
export async function getBotStats(): Promise<{
  totalBots: number;
  activeBots: number;
  totalBotPosts: number;
  postsToday: number;
}> {
  const supabase = createAdminClient();

  const { count: totalBots } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_bot', true);

  const { count: activeBots } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_bot', true)
    .eq('bot_active', true);

  // Get all bot IDs
  const { data: botIds } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_bot', true);

  const ids = (botIds ?? []).map((b) => b.id);

  let totalBotPosts = 0;
  let postsToday = 0;

  if (ids.length > 0) {
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .in('author_id', ids)
      .eq('status', 'PUBLISHED');
    totalBotPosts = totalPosts ?? 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: todayPosts } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .in('author_id', ids)
      .eq('status', 'PUBLISHED')
      .gte('created_at', todayStart.toISOString());
    postsToday = todayPosts ?? 0;
  }

  return {
    totalBots: totalBots ?? 0,
    activeBots: activeBots ?? 0,
    totalBotPosts,
    postsToday,
  };
}
