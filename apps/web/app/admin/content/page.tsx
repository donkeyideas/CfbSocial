import { Suspense } from 'react';
import { PostTypeChart } from '@/components/admin/dashboard/PostTypeChart';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Content Analytics',
};

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Analytics</h1>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="admin-card p-6">
                <div className="skeleton h-48 w-full" />
              </div>
            ))}
          </div>
        }
      >
        <ContentAnalytics />
      </Suspense>
    </div>
  );
}

async function ContentAnalytics() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  // Fetch post counts by type
  const { data: postsByType } = await supabase
    .from('posts')
    .select('post_type')
    .eq('status', 'PUBLISHED');

  const typeCounts: Record<string, number> = {};
  if (postsByType) {
    for (const post of postsByType) {
      typeCounts[post.post_type] = (typeCounts[post.post_type] ?? 0) + 1;
    }
  }

  const chartData = Object.entries(typeCounts).map(([type, count]) => ({
    type: type.replace('_', ' '),
    count,
  }));

  // Fetch reaction distribution
  const { data: reactions } = await supabase
    .from('reactions')
    .select('reaction_type');

  const tdCount = reactions?.filter((r) => r.reaction_type === 'TOUCHDOWN').length ?? 0;
  const fumbleCount = reactions?.filter((r) => r.reaction_type === 'FUMBLE').length ?? 0;
  const totalReactions = tdCount + fumbleCount;

  // Fetch top posts by touchdown count
  const { data: topPosts } = await supabase
    .from('posts')
    .select(`
      id, content, post_type, touchdown_count, fumble_count, reply_count, created_at,
      author:profiles!posts_author_id_fkey(username, display_name)
    `)
    .eq('status', 'PUBLISHED')
    .order('touchdown_count', { ascending: false })
    .limit(5);

  // Content velocity: posts per day last 7 days
  const velocityDays: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    velocityDays.push({
      date: d.toLocaleDateString('en-US', { weekday: 'short' }),
      count: 0,
    });
  }

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('created_at')
    .gte('created_at', sevenDaysAgo.toISOString())
    .eq('status', 'PUBLISHED');

  if (recentPosts) {
    for (const post of recentPosts) {
      const dayLabel = new Date(post.created_at).toLocaleDateString('en-US', { weekday: 'short' });
      const day = velocityDays.find((d) => d.date === dayLabel);
      if (day) day.count++;
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Posts by type chart */}
      <div className="admin-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Posts by Type</h2>
        {chartData.length > 0 ? (
          <PostTypeChart data={chartData} />
        ) : (
          <p className="text-sm text-[var(--admin-text-muted)]">No published content yet.</p>
        )}
      </div>

      {/* Reaction distribution */}
      <div className="admin-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Reaction Distribution</h2>
        {totalReactions > 0 ? (
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[var(--admin-success)]">Touchdowns</span>
                <span className="font-semibold">{tdCount.toLocaleString()}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--admin-surface-raised)]">
                <div
                  className="h-full rounded-full bg-[var(--admin-success)]"
                  style={{ width: `${(tdCount / totalReactions) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[var(--admin-error)]">Fumbles</span>
                <span className="font-semibold">{fumbleCount.toLocaleString()}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--admin-surface-raised)]">
                <div
                  className="h-full rounded-full bg-[var(--admin-error)]"
                  style={{ width: `${(fumbleCount / totalReactions) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-[var(--admin-text-muted)]">
              TD Rate: {((tdCount / totalReactions) * 100).toFixed(1)}%
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-text-muted)]">No reactions recorded yet.</p>
        )}
      </div>

      {/* Top posts */}
      <div className="admin-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Top Posts</h2>
        {topPosts && topPosts.length > 0 ? (
          <div className="space-y-3">
            {topPosts.map((post, i) => (
              <div key={post.id} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--admin-accent)]/20 text-xs font-bold text-[var(--admin-accent-light)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{post.content}</p>
                  <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">
                    @{(post.author as { username?: string } | null)?.username ?? 'unknown'} · {post.touchdown_count ?? 0} TDs · {post.reply_count ?? 0} replies
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-text-muted)]">No posts yet.</p>
        )}
      </div>

      {/* Content velocity */}
      <div className="admin-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Content Velocity</h2>
        <div className="space-y-2">
          {velocityDays.map((day) => (
            <div key={day.date} className="flex items-center gap-3">
              <span className="w-10 text-xs text-[var(--admin-text-muted)]">{day.date}</span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--admin-surface-raised)]">
                {day.count > 0 && (
                  <div
                    className="h-full rounded bg-[var(--admin-accent)]"
                    style={{
                      width: `${Math.max(4, (day.count / Math.max(...velocityDays.map((d) => d.count), 1)) * 100)}%`,
                    }}
                  />
                )}
              </div>
              <span className="w-8 text-right text-xs font-semibold">{day.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
