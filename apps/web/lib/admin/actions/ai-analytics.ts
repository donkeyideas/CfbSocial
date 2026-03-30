import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function getModerationOverview() {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [totalModerated, autoFlagged, autoRemoved, manualReviewed, restored] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).gt('moderation_score', 0),
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('moderation_score', 0.4).lt('moderation_score', 0.7),
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('moderation_score', 0.7),
    supabase.from('moderation_events').select('*', { count: 'exact', head: true }).in('event_type', ['MANUAL_FLAG', 'MANUAL_REMOVE']),
    supabase.from('moderation_events').select('*', { count: 'exact', head: true }).eq('event_type', 'RESTORE'),
  ]);

  const flaggedCount = (autoFlagged.count ?? 0) + (autoRemoved.count ?? 0);
  const falsePositiveRate = flaggedCount > 0 ? (restored.count ?? 0) / flaggedCount : 0;

  return {
    totalModerated: totalModerated.count ?? 0,
    autoFlagged: autoFlagged.count ?? 0,
    autoRemoved: autoRemoved.count ?? 0,
    manualReviewed: manualReviewed.count ?? 0,
    restored: restored.count ?? 0,
    falsePositiveRate,
  };
}

export async function getModerationTrend(days: number = 30) {
  const supabase = createAdminClient();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const { data: events } = await supabase
    .from('moderation_events')
    .select('event_type, created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at');

  const daily: Record<string, { date: string; flags: number; removes: number; restores: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    daily[key] = { date: key, flags: 0, removes: 0, restores: 0 };
  }

  for (const e of events ?? []) {
    const key = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!daily[key]) continue;
    if (e.event_type?.includes('FLAG')) daily[key].flags++;
    else if (e.event_type?.includes('REMOVE')) daily[key].removes++;
    else if (e.event_type === 'RESTORE') daily[key].restores++;
  }

  return Object.values(daily);
}

export async function getCategoryBreakdown() {
  const supabase = createAdminClient();

  const { data: posts } = await supabase
    .from('posts')
    .select('moderation_labels')
    .not('moderation_labels', 'is', null);

  const categories: Record<string, { count: number; totalScore: number }> = {};

  for (const p of posts ?? []) {
    const labels = p.moderation_labels as Record<string, number> | null;
    if (!labels) continue;
    for (const [cat, score] of Object.entries(labels)) {
      if (!categories[cat]) categories[cat] = { count: 0, totalScore: 0 };
      if (score > 0.3) {
        categories[cat].count++;
        categories[cat].totalScore += score;
      }
    }
  }

  return Object.entries(categories).map(([name, data]) => ({
    name,
    count: data.count,
    avgScore: data.count > 0 ? data.totalScore / data.count : 0,
  })).sort((a, b) => b.count - a.count);
}

export async function getContentDiscovery() {
  const supabase = createAdminClient();

  const [topPosts, postTypes] = await Promise.all([
    supabase.from('posts').select('id, content, touchdown_count, fumble_count, view_count, post_type, author:profiles!posts_author_id_fkey(username)')
      .eq('status', 'PUBLISHED').order('touchdown_count', { ascending: false }).limit(10),
    supabase.from('posts').select('post_type').eq('status', 'PUBLISHED'),
  ]);

  const typeCount: Record<string, number> = {};
  for (const p of postTypes.data ?? []) {
    const t = p.post_type || 'STANDARD';
    typeCount[t] = (typeCount[t] || 0) + 1;
  }

  return {
    topPosts: topPosts.data ?? [],
    typeDistribution: Object.entries(typeCount).map(([name, value]) => ({ name, value })),
  };
}
