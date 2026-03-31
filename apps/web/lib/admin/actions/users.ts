import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function getAllUsers(params: {
  search?: string;
  role?: string;
  status?: string;
  school_id?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}) {
  const supabase = createAdminClient();
  const { search, role, status, school_id, sort = 'created_at', order = 'desc', limit = 100, offset = 0 } = params;

  let query = supabase
    .from('profiles')
    .select('id, username, display_name, role, status, dynasty_tier, xp, level, post_count, follower_count, following_count, touchdown_count, fumble_count, created_at, last_active_at, school:schools!profiles_school_id_fkey(id, name, abbreviation, conference)', { count: 'exact' })
    .or('is_bot.is.null,is_bot.eq.false')
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);

  if (search) query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
  if (role) query = query.eq('role', role);
  if (status) query = query.eq('status', status);
  if (school_id) query = query.eq('school_id', school_id);

  const { data, count, error } = await query;
  return { users: data ?? [], total: count ?? 0, error };
}

export async function getUserDetail(userId: string) {
  const supabase = createAdminClient();

  const [authUser, profile, posts, modEvents, reports, appeals, xpLog, achievements] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    supabase.from('profiles').select('*, school:schools!profiles_school_id_fkey(id, name, abbreviation, conference, primary_color, logo_url)').eq('id', userId).single(),
    supabase.from('posts').select('id, content, post_type, status, created_at, touchdown_count, fumble_count').eq('author_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('moderation_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(username)').eq('reported_user_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('appeals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('xp_log').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('user_achievements').select('*, achievement:achievements(*)').eq('user_id', userId).order('unlocked_at', { ascending: false }),
  ]);

  // Merge email + auth provider from auth.users into profile
  const profileData = profile.data ? {
    ...profile.data,
    email: authUser.data?.user?.email ?? null,
    auth_provider: authUser.data?.user?.app_metadata?.provider ?? 'email',
    last_sign_in_at: authUser.data?.user?.last_sign_in_at ?? null,
  } : null;

  return {
    profile: profileData,
    posts: posts.data ?? [],
    moderationEvents: modEvents.data ?? [],
    reports: reports.data ?? [],
    appeals: appeals.data ?? [],
    xpLog: xpLog.data ?? [],
    achievements: achievements.data ?? [],
  };
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  return { error };
}

export async function suspendUser(userId: string, until: string, reason: string, adminId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('profiles').update({
    status: 'SUSPENDED',
    banned_until: until,
    ban_reason: reason,
    banned_by: adminId,
  }).eq('id', userId);

  if (!error) {
    await supabase.from('moderation_events').insert({
      user_id: userId,
      event_type: 'SUSPEND',
      action_taken: 'SUSPEND',
      moderator_id: adminId,
      ai_labels: { reason, until },
    });
  }
  return { error };
}

export async function banUser(userId: string, reason: string, adminId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('profiles').update({
    status: 'BANNED',
    ban_reason: reason,
    banned_by: adminId,
  }).eq('id', userId);

  if (!error) {
    await supabase.from('moderation_events').insert({
      user_id: userId,
      event_type: 'BAN',
      action_taken: 'BAN',
      moderator_id: adminId,
      ai_labels: { reason },
    });
  }
  return { error };
}

export async function restoreUser(userId: string, adminId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('profiles').update({
    status: 'ACTIVE',
    ban_reason: null,
    banned_until: null,
    banned_by: null,
  }).eq('id', userId);

  if (!error) {
    await supabase.from('moderation_events').insert({
      user_id: userId,
      event_type: 'RESTORE_USER',
      action_taken: 'RESTORE',
      moderator_id: adminId,
    });
  }
  return { error };
}

export async function deleteUser(userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  return { error };
}

export async function awardUserXP(userId: string, amount: number, reason: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('xp_log').insert({
    user_id: userId,
    xp_amount: amount,
    source: 'ADMIN_AWARD',
    description: reason,
  });

  if (!error) {
    await supabase.rpc('increment_xp', { user_id: userId, amount });
  }
  return { error };
}
