import { createAdminClient } from '@/lib/admin/supabase/admin';

export async function getPlatformInsights() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('platform_insights')
    .select('*')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function calculateHealthScore() {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsers,
    newUsers,
    flaggedPosts,
    totalPosts,
    totalReactions,
    pendingReports,
    restoredEvents,
    totalFlaggedEvents,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'FLAGGED'),
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('reactions').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('moderation_events').select('*', { count: 'exact', head: true }).eq('event_type', 'RESTORE').gte('created_at', thirtyDaysAgo),
    supabase.from('moderation_events').select('*', { count: 'exact', head: true }).in('event_type', ['AUTO_FLAG', 'AUTO_REMOVE']).gte('created_at', thirtyDaysAgo),
  ]);

  const users = totalUsers.count ?? 0;
  const posts = totalPosts.count ?? 0;
  const reactions = totalReactions.count ?? 0;
  const flagged = flaggedPosts.count ?? 0;
  const pending = pendingReports.count ?? 0;
  const newU = newUsers.count ?? 0;
  const restored = restoredEvents.count ?? 0;
  const totalFlagged = totalFlaggedEvents.count ?? 0;

  // Community Health: low toxicity, low bans
  const communityHealth = Math.max(0, Math.min(100, 100 - (flagged / Math.max(posts, 1)) * 500 - pending * 2));

  // Engagement Quality: reactions per post
  const engagementQuality = Math.min(100, posts > 0 ? (reactions / posts) * 20 : 0);

  // Growth Trajectory: new users this week
  const growthTrajectory = Math.min(100, newU * 10);

  // Moderation Efficiency: low false positive rate, quick resolution
  const falsePositiveRate = totalFlagged > 0 ? restored / totalFlagged : 0;
  const moderationEfficiency = Math.max(0, Math.min(100, 80 - falsePositiveRate * 100 - pending * 3));

  // Content Diversity: based on post count
  const contentDiversity = Math.min(100, posts * 2);

  const overall = Math.round((communityHealth + engagementQuality + growthTrajectory + moderationEfficiency + contentDiversity) / 5);

  return {
    overall,
    categories: {
      communityHealth: Math.round(communityHealth),
      engagementQuality: Math.round(engagementQuality),
      growthTrajectory: Math.round(growthTrajectory),
      moderationEfficiency: Math.round(moderationEfficiency),
      contentDiversity: Math.round(contentDiversity),
    },
  };
}

export async function generatePlatformInsights() {
  const supabase = createAdminClient();

  // For now, generate basic rule-based insights (can be enhanced with DeepSeek later)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [flagged, pending, totalPosts, totalUsers] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'FLAGGED'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ]);

  const insights = [];

  if ((pending.count ?? 0) > 5) {
    insights.push({
      insight_type: 'anomaly',
      category: 'moderation',
      title: 'Reports Backlog Growing',
      description: `There are ${pending.count} pending reports awaiting review. Consider reviewing them to maintain community trust.`,
      severity: 'warning',
      confidence: 90,
      recommendations: JSON.stringify(['Review pending reports', 'Consider adding moderators']),
      data: JSON.stringify({ pending_count: pending.count }),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  if ((flagged.count ?? 0) > 10) {
    insights.push({
      insight_type: 'trend',
      category: 'content',
      title: 'High Flagged Content Volume',
      description: `${flagged.count} posts are currently flagged. Review moderation thresholds if false positive rate is high.`,
      severity: 'warning',
      confidence: 80,
      recommendations: JSON.stringify(['Review flagged posts', 'Adjust moderation score thresholds']),
      data: JSON.stringify({ flagged_count: flagged.count }),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  if ((totalPosts.count ?? 0) > 50) {
    insights.push({
      insight_type: 'summary',
      category: 'engagement',
      title: 'Active Content Creation',
      description: `${totalPosts.count} posts created in the last 30 days. Platform engagement is healthy.`,
      severity: 'positive',
      confidence: 95,
      recommendations: JSON.stringify(['Continue monitoring engagement metrics']),
      data: JSON.stringify({ post_count: totalPosts.count }),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Clear old insights and insert new ones
  await supabase.from('platform_insights').delete().lt('expires_at', new Date().toISOString());
  if (insights.length > 0) {
    await supabase.from('platform_insights').insert(insights);
  }

  return insights;
}
