import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';
import { StatCard } from '@/components/admin/shared/stat-card';
import { ChartWrapper } from '@/components/admin/shared/chart-wrapper';
import { Users, FileText, Heart, TrendingUp, Swords, UserPlus } from 'lucide-react';

export const metadata = { title: 'Platform Analytics' };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Analytics</h1>
      <Suspense fallback={<LoadingSkeleton type="cards" rows={8} />}>
        <KeyMetrics />
      </Suspense>
      <Suspense fallback={<LoadingSkeleton type="chart" />}>
        <GrowthCharts />
      </Suspense>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<LoadingSkeleton type="chart" />}>
          <ContentBreakdown />
        </Suspense>
        <Suspense fallback={<LoadingSkeleton type="chart" />}>
          <DynastyStats />
        </Suspense>
      </div>
    </div>
  );
}

async function KeyMetrics() {
  const { getKeyMetrics } = await import('@/lib/admin/actions/analytics');
  const m = await getKeyMetrics();
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total Users" value={m.totalUsers} icon={Users} />
      <StatCard label="DAU (Today)" value={m.dau} icon={TrendingUp} />
      <StatCard label="MAU (30d)" value={m.mau} icon={TrendingUp} />
      <StatCard label="Posts Today" value={m.postsToday} icon={FileText} />
      <StatCard label="Reactions Today" value={m.reactionsToday} icon={Heart} />
      <StatCard label="Challenges Active" value={m.activeChallenges} icon={Swords} />
      <StatCard label="New Users (7d)" value={m.newUsers7d} icon={UserPlus} />
      <StatCard label="DAU/MAU" value={m.mau > 0 ? `${((m.dau / m.mau) * 100).toFixed(1)}%` : '0%'} icon={TrendingUp} />
    </div>
  );
}

async function GrowthCharts() {
  const { getGrowthTimeSeries } = await import('@/lib/admin/actions/analytics');
  const data = await getGrowthTimeSeries(6);
  const { GrowthChart } = await import('@/components/admin/analytics/GrowthChart');

  return (
    <ChartWrapper title="Growth - Last 6 Months" subtitle="Monthly new signups, posts, and reactions">
      <GrowthChart data={data} />
    </ChartWrapper>
  );
}

async function ContentBreakdown() {
  const { getContentBreakdown } = await import('@/lib/admin/actions/analytics');
  const content = await getContentBreakdown();
  const { ContentPieChart } = await import('@/components/admin/analytics/ContentPieChart');

  return (
    <ChartWrapper title="Content Type Distribution">
      <ContentPieChart data={content.typeDistribution} />
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold">{content.totalPosts.toLocaleString()}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">Total Posts</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--admin-success)]">{content.totalTD.toLocaleString()}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">Touchdowns</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--admin-error)]">{content.totalFumble.toLocaleString()}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">Fumbles</p>
        </div>
      </div>
    </ChartWrapper>
  );
}

async function DynastyStats() {
  const { getDynastyAnalytics } = await import('@/lib/admin/actions/analytics');
  const dynasty = await getDynastyAnalytics();

  return (
    <div className="admin-card p-6">
      <h3 className="mb-4 text-base font-semibold text-[var(--admin-text)]">Dynasty Analytics</h3>

      <div className="mb-6">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">Tier Distribution</h4>
        <div className="space-y-2">
          {dynasty.tierDistribution.map((tier: { name: string; value: number }) => {
            const total = dynasty.tierDistribution.reduce((s: number, t: { value: number }) => s + t.value, 0);
            const pct = total > 0 ? (tier.value / total) * 100 : 0;
            return (
              <div key={tier.name} className="flex items-center gap-3">
                <span className="w-24 text-xs text-[var(--admin-text-secondary)]">{tier.name.replace('_', ' ')}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--admin-surface-raised)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--admin-accent)]" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-10 text-right text-xs text-[var(--admin-text-muted)]">{tier.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">Top Achievements</h4>
        {dynasty.topAchievements.length === 0 ? (
          <p className="text-sm text-[var(--admin-text-muted)]">No achievements unlocked yet.</p>
        ) : (
          <div className="space-y-1">
            {dynasty.topAchievements.slice(0, 5).map((a: { name: string; count: number }, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{a.name}</span>
                <span className="text-[var(--admin-text-muted)]">{a.count} unlocks</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
