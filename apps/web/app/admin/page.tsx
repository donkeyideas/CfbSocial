import { Suspense } from 'react';
import { StatCard } from '@/components/admin/shared/stat-card';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';
import {
  Users, FileText, Heart, AlertTriangle, Flag, Swords, Trophy, Activity,
  Crosshair, Globe, Award, Zap, GraduationCap, ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Overview' };

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="admin-section-title">Overview</h1>
      <Suspense fallback={<LoadingSkeleton type="cards" rows={8} />}>
        <StatsSection />
      </Suspense>
      <div className="admin-ornament">Platform Metrics</div>
      <Suspense fallback={<LoadingSkeleton type="chart" />}>
        <MetricsStrip />
      </Suspense>
      <hr className="admin-divider" />
      <Suspense fallback={<LoadingSkeleton type="chart" />}>
        <EngagementChartSection />
      </Suspense>
      <div className="admin-ornament">Recent Activity</div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<LoadingSkeleton rows={5} />}>
          <RecentSignups />
        </Suspense>
        <Suspense fallback={<LoadingSkeleton rows={5} />}>
          <SystemEventsFeed />
        </Suspense>
      </div>
      <div className="admin-ornament">Quick Actions</div>
      <QuickActions />
    </div>
  );
}

async function StatsSection() {
  const { getEnhancedOverviewStats } = await import('@/lib/admin/actions/overview');
  const stats = await getEnhancedOverviewStats();

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total Users" value={stats.totalUsers} icon={Users} trend="up" />
      <StatCard label="Active Users (7d)" value={stats.activeUsers} icon={Activity} trend="up" />
      <StatCard label="Published Posts" value={stats.publishedPosts} icon={FileText} trend="up" />
      <StatCard label="Total Reactions" value={stats.totalReactions} icon={Heart} trend="up" />
      <StatCard label="Flagged Posts" value={stats.flaggedPosts} icon={AlertTriangle} color={stats.flaggedPosts > 0 ? 'danger' : 'default'} />
      <StatCard label="Pending Reports" value={stats.pendingReports} icon={Flag} color={stats.pendingReports > 0 ? 'warning' : 'default'} />
      <StatCard label="Active Challenges" value={stats.activeChallenges} icon={Swords} />
      <StatCard label="Active Rivalries" value={stats.activeRivalries} icon={Trophy} />
    </div>
  );
}

async function MetricsStrip() {
  const { getPlatformMetrics } = await import('@/lib/admin/actions/overview');
  const metrics = await getPlatformMetrics();

  const items = [
    { label: 'Predictions', value: metrics.predictions, icon: Crosshair },
    { label: 'Portal Players', value: metrics.portalPlayers, icon: Globe },
    { label: 'Achievements', value: metrics.achievements, icon: Award },
    { label: 'XP Awarded (30d)', value: metrics.dailyXP.toLocaleString(), icon: Zap },
    { label: 'Active Schools', value: metrics.activeSchools, icon: GraduationCap },
    { label: 'Auto-Removes (30d)', value: metrics.autoRemoves, icon: ShieldAlert },
  ];

  return (
    <div className="admin-metrics-strip">
      {items.map((item) => (
        <div key={item.label}>
          <item.icon className="mx-auto mb-1 h-4 w-4 text-[var(--admin-text-muted)]" />
          <p className="text-lg font-bold">{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

async function EngagementChartSection() {
  const { getEngagementChart } = await import('@/lib/admin/actions/overview');
  const data = await getEngagementChart(30);

  // Dynamic import for Recharts (client-only)
  const { EngagementAreaChart } = await import('@/components/admin/dashboard/EngagementAreaChart');

  return (
    <div className="admin-card p-6">
      <h2 className="admin-subsection-title mb-4">
        Engagement - Last 30 Days
      </h2>
      <EngagementAreaChart data={data} />
    </div>
  );
}

async function RecentSignups() {
  const { getRecentSignups } = await import('@/lib/admin/actions/overview');
  const signups = await getRecentSignups(10);

  return (
    <div className="admin-card p-6">
      <h3 className="admin-subsection-title">
        Recent Signups
      </h3>
      {signups.length === 0 ? (
        <p className="text-sm text-[var(--admin-text-muted)]">No recent signups.</p>
      ) : (
        <div className="space-y-3">
          {signups.map((user: Record<string, unknown>) => (
            <div key={user.id as string} className="flex items-center justify-between pb-2" style={{ borderBottom: '1px dotted var(--admin-border)' }}>
              <div>
                <Link href={`/users/${user.id}`} className="text-sm font-medium hover:text-[var(--admin-accent)]">
                  {(user.display_name as string) || (user.username as string)}
                </Link>
                <p className="text-xs text-[var(--admin-text-muted)]">
                  @{user.username as string}
                  {(user.school as Record<string, string> | null)?.name ? ` - ${(user.school as Record<string, string>).name}` : ''}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold ${
                  user.role === 'ADMIN' ? 'text-[var(--admin-accent-light)]' : 'text-[var(--admin-text-secondary)]'
                }`}>
                  {user.role as string}
                </span>
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  {new Date(user.created_at as string).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function SystemEventsFeed() {
  const { getRecentModerationEvents } = await import('@/lib/admin/actions/overview');
  const events = await getRecentModerationEvents(10);

  const eventColors: Record<string, string> = {
    AUTO_FLAG: 'text-[var(--admin-warning)]',
    AUTO_REMOVE: 'text-[var(--admin-error)]',
    MANUAL_REMOVE: 'text-[var(--admin-error)]',
    MANUAL_FLAG: 'text-[var(--admin-warning)]',
    RESTORE: 'text-[var(--admin-success)]',
  };

  return (
    <div className="admin-card p-6">
      <h3 className="admin-subsection-title">
        System Events
      </h3>
      {events.length === 0 ? (
        <p className="text-sm text-[var(--admin-text-muted)]">No recent events.</p>
      ) : (
        <div className="space-y-3">
          {events.map((event: Record<string, unknown>) => (
            <div key={event.id as string} className="flex items-center gap-3 pb-2" style={{ borderBottom: '1px dotted var(--admin-border)' }}>
              <span className={`shrink-0 text-xs font-semibold ${
                eventColors[event.event_type as string] || 'text-[var(--admin-text-secondary)]'
              }`}>
                {(event.event_type as string).replace(/_/g, ' ')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{(event.action_taken as string).replace(/_/g, ' ')}</p>
                <p className="text-xs text-[var(--admin-text-muted)]">
                  {(event.moderator as Record<string, string> | null)?.username ? `by @${(event.moderator as Record<string, string>).username}` : 'System'}
                </p>
              </div>
              <p className="shrink-0 text-xs text-[var(--admin-text-muted)]">
                {new Date(event.created_at as string).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Users', href: '/users', icon: Users },
    { label: 'Moderation', href: '/moderation', icon: AlertTriangle },
    { label: 'Reports', href: '/reports', icon: Flag },
    { label: 'Schools', href: '/schools', icon: GraduationCap },
    { label: 'System', href: '/system', icon: Activity },
    { label: 'Analytics', href: '/analytics', icon: Trophy },
  ];

  return (
    <div className="admin-card-double p-6">
      <h3 className="admin-subsection-title">
        Quick Actions
      </h3>
      <div className="grid grid-cols-3 gap-3 pt-3 sm:grid-cols-6">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="admin-quick-action">
            <action.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
