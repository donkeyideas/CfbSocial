import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function getKeyMetrics() {
  const supabase = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalUsers, postsToday, reactionsToday, newUsers7d, activeChallenges] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('reactions').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
  ]);

  // DAU - users who posted or reacted today
  const { data: todayPosters } = await supabase.from('posts').select('author_id').gte('created_at', todayISO);
  const { data: todayReactors } = await supabase.from('reactions').select('user_id').gte('created_at', todayISO);
  const dauSet = new Set([
    ...(todayPosters?.map((p: { author_id: string }) => p.author_id) ?? []),
    ...(todayReactors?.map((r: { user_id: string }) => r.user_id) ?? []),
  ]);

  // MAU
  const { data: monthPosters } = await supabase.from('posts').select('author_id').gte('created_at', thirtyDaysAgo);
  const { data: monthReactors } = await supabase.from('reactions').select('user_id').gte('created_at', thirtyDaysAgo);
  const mauSet = new Set([
    ...(monthPosters?.map((p: { author_id: string }) => p.author_id) ?? []),
    ...(monthReactors?.map((r: { user_id: string }) => r.user_id) ?? []),
  ]);

  return {
    totalUsers: totalUsers.count ?? 0,
    dau: dauSet.size,
    mau: mauSet.size,
    postsToday: postsToday.count ?? 0,
    reactionsToday: reactionsToday.count ?? 0,
    activeChallenges: activeChallenges.count ?? 0,
    newUsers7d: newUsers7d.count ?? 0,
  };
}

export async function getGrowthTimeSeries(months: number = 6) {
  const supabase = createAdminClient();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const [users, posts, reactions] = await Promise.all([
    supabase.from('profiles').select('created_at').gte('created_at', startDate.toISOString()).order('created_at'),
    supabase.from('posts').select('created_at').gte('created_at', startDate.toISOString()).eq('status', 'PUBLISHED').order('created_at'),
    supabase.from('reactions').select('created_at').gte('created_at', startDate.toISOString()).order('created_at'),
  ]);

  // Group by month
  const monthlyData: Record<string, { users: number; posts: number; reactions: number }> = {};
  for (let i = 0; i < months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthlyData[key] = { users: 0, posts: 0, reactions: 0 };
  }

  for (const u of users.data ?? []) {
    const key = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (monthlyData[key]) monthlyData[key].users++;
  }
  for (const p of posts.data ?? []) {
    const key = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (monthlyData[key]) monthlyData[key].posts++;
  }
  for (const r of reactions.data ?? []) {
    const key = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (monthlyData[key]) monthlyData[key].reactions++;
  }

  return Object.entries(monthlyData).map(([month, data]) => ({ month, ...data }));
}

export async function getContentBreakdown() {
  const supabase = createAdminClient();

  const { data: posts } = await supabase
    .from('posts')
    .select('post_type, school_id, touchdown_count, fumble_count')
    .eq('status', 'PUBLISHED');

  // Post type distribution
  const typeCount: Record<string, number> = {};
  const schoolCount: Record<string, number> = {};
  let totalTD = 0;
  let totalFumble = 0;

  for (const p of posts ?? []) {
    const t = p.post_type || 'STANDARD';
    typeCount[t] = (typeCount[t] || 0) + 1;
    if (p.school_id) schoolCount[p.school_id] = (schoolCount[p.school_id] || 0) + 1;
    totalTD += p.touchdown_count || 0;
    totalFumble += p.fumble_count || 0;
  }

  const typeDistribution = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

  return { typeDistribution, totalTD, totalFumble, totalPosts: posts?.length ?? 0 };
}

export async function getDynastyAnalytics() {
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('dynasty_tier, xp, level');

  const tierCount: Record<string, number> = {};
  for (const p of profiles ?? []) {
    const tier = p.dynasty_tier || 'WALK_ON';
    tierCount[tier] = (tierCount[tier] || 0) + 1;
  }

  const tierDistribution = Object.entries(tierCount).map(([name, value]) => ({ name, value }));

  // Top achievements
  const { data: achievementCounts } = await supabase
    .from('user_achievements')
    .select('achievement_id, achievement:achievements(name)');

  const achCount: Record<string, { name: string; count: number }> = {};
  for (const a of achievementCounts ?? []) {
    const id = a.achievement_id;
    const achRaw = a.achievement as unknown;
    const name = Array.isArray(achRaw) ? (achRaw[0] as { name: string } | undefined)?.name ?? 'Unknown' : (achRaw as { name: string } | null)?.name ?? 'Unknown';
    if (!achCount[id]) achCount[id] = { name, count: 0 };
    achCount[id].count++;
  }

  const topAchievements = Object.values(achCount).sort((a, b) => b.count - a.count).slice(0, 10);

  return { tierDistribution, topAchievements };
}
