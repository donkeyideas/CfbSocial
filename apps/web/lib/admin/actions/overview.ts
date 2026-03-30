import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function getEnhancedOverviewStats() {
  const supabase = createAdminClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    usersResult,
    postsResult,
    reactionsResult,
    flaggedResult,
    reportsResult,
    challengesResult,
    rivalriesResult,
    activePostersResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
    supabase.from('reactions').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'FLAGGED'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('rivalries').select('*', { count: 'exact', head: true }).in('status', ['ACTIVE', 'VOTING']),
    supabase.from('posts').select('author_id').gte('created_at', sevenDaysAgo),
  ]);

  const activeUserIds = new Set(activePostersResult.data?.map((p: { author_id: string }) => p.author_id) ?? []);

  return {
    totalUsers: usersResult.count ?? 0,
    activeUsers: activeUserIds.size,
    publishedPosts: postsResult.count ?? 0,
    totalReactions: reactionsResult.count ?? 0,
    flaggedPosts: flaggedResult.count ?? 0,
    pendingReports: reportsResult.count ?? 0,
    activeChallenges: challengesResult.count ?? 0,
    activeRivalries: rivalriesResult.count ?? 0,
  };
}

export async function getPlatformMetrics() {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [predictions, portalPlayers, achievements, xpLog, schoolUsers, autoRemoves] = await Promise.all([
    supabase.from('predictions').select('*', { count: 'exact', head: true }),
    supabase.from('portal_players').select('*', { count: 'exact', head: true }),
    supabase.from('achievements').select('*', { count: 'exact', head: true }),
    supabase.from('xp_log').select('xp_amount').gte('created_at', thirtyDaysAgo),
    supabase.from('profiles').select('school_id').not('school_id', 'is', null),
    supabase.from('moderation_events').select('*', { count: 'exact', head: true })
      .eq('event_type', 'AUTO_REMOVE').gte('created_at', thirtyDaysAgo),
  ]);

  const dailyXP = xpLog.data?.reduce((sum: number, row: { xp_amount: number }) => sum + (row.xp_amount || 0), 0) ?? 0;
  const uniqueSchools = new Set(schoolUsers.data?.map((u: { school_id: string }) => u.school_id) ?? []);

  return {
    predictions: predictions.count ?? 0,
    portalPlayers: portalPlayers.count ?? 0,
    achievements: achievements.count ?? 0,
    dailyXP,
    activeSchools: uniqueSchools.size,
    autoRemoves: autoRemoves.count ?? 0,
  };
}

export async function getEngagementChart(days: number = 30) {
  const supabase = createAdminClient();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result: { date: string; posts: number; reactions: number; newUsers: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      posts: 0,
      reactions: 0,
      newUsers: 0,
    });
  }

  const [posts, reactions, users] = await Promise.all([
    supabase.from('posts').select('created_at').gte('created_at', startDate.toISOString()).eq('status', 'PUBLISHED'),
    supabase.from('reactions').select('created_at').gte('created_at', startDate.toISOString()),
    supabase.from('profiles').select('created_at').gte('created_at', startDate.toISOString()),
  ]);

  for (const p of posts.data ?? []) {
    const label = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const day = result.find((d) => d.date === label);
    if (day) day.posts++;
  }

  for (const r of reactions.data ?? []) {
    const label = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const day = result.find((d) => d.date === label);
    if (day) day.reactions++;
  }

  for (const u of users.data ?? []) {
    const label = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const day = result.find((d) => d.date === label);
    if (day) day.newUsers++;
  }

  return result;
}

export async function getRecentSignups(limit: number = 10) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, role, dynasty_tier, created_at, school:schools!profiles_school_id_fkey(name, abbreviation)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getRecentModerationEvents(limit: number = 10) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('moderation_events')
    .select('id, event_type, action_taken, ai_score, created_at, post_id, moderator:profiles!moderation_events_moderator_id_fkey(username)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
