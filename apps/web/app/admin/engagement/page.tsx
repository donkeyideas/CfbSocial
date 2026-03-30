import { Suspense } from 'react';
import EngagementChart from '@/components/admin/dashboard/EngagementChart';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Engagement',
};

export default function EngagementPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Engagement Metrics</h1>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="admin-card p-6">
                  <div className="skeleton h-16 w-full" />
                </div>
              ))}
            </div>
            <div className="admin-card p-6">
              <div className="skeleton h-48 w-full" />
            </div>
            <div className="admin-card p-6">
              <div className="skeleton h-[300px] w-full" />
            </div>
          </div>
        }
      >
        <EngagementMetrics />
      </Suspense>
    </div>
  );
}

async function EngagementMetrics() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    reactionsResult,
    challengesResult,
    predictionsResult,
    touchdownResult,
    fumbleResult,
    recentReactionsResult,
  ] = await Promise.all([
    supabase.from('reactions').select('*', { count: 'exact', head: true }),
    supabase.from('challenges').select('*', { count: 'exact', head: true }),
    supabase.from('predictions').select('*', { count: 'exact', head: true }),
    supabase
      .from('reactions')
      .select('*', { count: 'exact', head: true })
      .eq('reaction_type', 'TOUCHDOWN'),
    supabase
      .from('reactions')
      .select('*', { count: 'exact', head: true })
      .eq('reaction_type', 'FUMBLE'),
    supabase
      .from('reactions')
      .select('created_at, reaction_type')
      .gte('created_at', sevenDaysAgo.toISOString()),
  ]);

  const totalReactions = reactionsResult.count ?? 0;
  const totalChallenges = challengesResult.count ?? 0;
  const totalPredictions = predictionsResult.count ?? 0;
  const tdCount = touchdownResult.count ?? 0;
  const fumbleCount = fumbleResult.count ?? 0;
  const tdFumbleTotal = tdCount + fumbleCount;
  const tdPercent = tdFumbleTotal > 0 ? (tdCount / tdFumbleTotal) * 100 : 0;
  const fumblePercent = tdFumbleTotal > 0 ? (fumbleCount / tdFumbleTotal) * 100 : 0;

  const stats = [
    { label: 'Total Reactions', value: totalReactions },
    { label: 'Total Challenges', value: totalChallenges },
    { label: 'Total Predictions', value: totalPredictions },
  ];

  // Build last 7 days chart data
  const chartDays: { date: string; touchdowns: number; fumbles: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    chartDays.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      touchdowns: 0,
      fumbles: 0,
    });
  }

  if (recentReactionsResult.data) {
    for (const reaction of recentReactionsResult.data) {
      const dayLabel = new Date(reaction.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const day = chartDays.find((d) => d.date === dayLabel);
      if (day) {
        if (reaction.reaction_type === 'TOUCHDOWN') {
          day.touchdowns++;
        } else if (reaction.reaction_type === 'FUMBLE') {
          day.fumbles++;
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-card p-6">
            <p className="text-sm text-[var(--admin-text-muted)]">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* TD / Fumble Ratio */}
      <div className="admin-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Touchdown / Fumble Ratio</h2>
        {tdFumbleTotal > 0 ? (
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[var(--admin-success)]">Touchdowns</span>
                <span className="font-semibold">
                  {tdCount.toLocaleString()} ({tdPercent.toFixed(1)}%)
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--admin-surface-raised)]">
                <div
                  className="h-full rounded-full bg-[var(--admin-success)]"
                  style={{ width: `${tdPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[var(--admin-error)]">Fumbles</span>
                <span className="font-semibold">
                  {fumbleCount.toLocaleString()} ({fumblePercent.toFixed(1)}%)
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--admin-surface-raised)]">
                <div
                  className="h-full rounded-full bg-[var(--admin-error)]"
                  style={{ width: `${fumblePercent}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-text-muted)]">No reactions recorded yet.</p>
        )}
      </div>

      {/* Engagement Chart */}
      <div className="admin-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Reactions Over Last 7 Days</h2>
        {recentReactionsResult.data && recentReactionsResult.data.length > 0 ? (
          <EngagementChart data={chartDays} />
        ) : (
          <p className="text-sm text-[var(--admin-text-muted)]">
            No reaction data available for the past 7 days.
          </p>
        )}
      </div>
    </div>
  );
}
