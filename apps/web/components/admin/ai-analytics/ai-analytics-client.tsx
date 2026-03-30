'use client';

import { useState } from 'react';
import { TabNav } from '@/components/admin/shared/tab-nav';
import { StatCard } from '@/components/admin/shared/stat-card';
import { ChartWrapper } from '@/components/admin/shared/chart-wrapper';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { CHART_COLORS, getChartConfig, SERIES_COLORS } from '@/lib/admin/utils/chart-theme';
import { formatPercent } from '@/lib/admin/utils/formatters';
import { Shield, AlertTriangle, Ban, Eye, CheckCircle } from 'lucide-react';

interface Props {
  overview: {
    totalModerated: number;
    autoFlagged: number;
    autoRemoved: number;
    manualReviewed: number;
    restored: number;
    falsePositiveRate: number;
  };
  trend: { date: string; flags: number; removes: number; restores: number }[];
  categories: { name: string; count: number; avgScore: number }[];
  discovery: {
    topPosts: Record<string, unknown>[];
    typeDistribution: { name: string; value: number }[];
  };
}

const tabs = [
  { id: 'overview', label: 'Moderation Overview' },
  { id: 'categories', label: 'Category Breakdown' },
  { id: 'discovery', label: 'Content Discovery' },
];

export function AIAnalyticsClient({ overview, trend, categories, discovery }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const cfg = getChartConfig();

  return (
    <div>
      <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <StatCard label="Total Moderated" value={overview.totalModerated} icon={Shield} />
              <StatCard label="Auto-Flagged" value={overview.autoFlagged} icon={AlertTriangle} color="warning" />
              <StatCard label="Auto-Removed" value={overview.autoRemoved} icon={Ban} color="danger" />
              <StatCard label="Manually Reviewed" value={overview.manualReviewed} icon={Eye} />
              <StatCard label="Restored" value={overview.restored} icon={CheckCircle} color="success" />
              <StatCard label="False Positive Rate" value={formatPercent(overview.falsePositiveRate)} icon={Shield} />
            </div>

            <ChartWrapper title="Moderation Volume - 30 Days">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={cfg.gridColor} />
                  <XAxis dataKey="date" tick={{ fill: cfg.axisColor, fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: cfg.axisColor, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }} />
                  <Area type="monotone" dataKey="flags" name="Flags" stroke={CHART_COLORS.warning} fill={CHART_COLORS.warning} fillOpacity={0.1} />
                  <Area type="monotone" dataKey="removes" name="Removes" stroke={CHART_COLORS.danger} fill={CHART_COLORS.danger} fillOpacity={0.1} />
                  <Area type="monotone" dataKey="restores" name="Restores" stroke={CHART_COLORS.success} fill={CHART_COLORS.success} fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            {categories.length === 0 ? (
              <div className="admin-card p-8 text-center text-[var(--admin-text-muted)]">No moderation data yet.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <ChartWrapper title="Category Distribution">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={categories} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                          {categories.map((_, i) => <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartWrapper>

                  <div className="admin-card p-6">
                    <h3 className="mb-4 text-base font-semibold">Category Details</h3>
                    <div className="space-y-3">
                      {categories.map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between">
                          <span className="text-sm">{cat.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-[var(--admin-text-muted)]">{cat.count} flags</span>
                            <span className="text-sm text-[var(--admin-text-muted)]">avg: {cat.avgScore.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'discovery' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartWrapper title="Post Type Distribution">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={discovery.typeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {discovery.typeDistribution.map((_, i) => <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartWrapper>

              <div className="admin-card p-6">
                <h3 className="mb-4 text-base font-semibold">Top Posts by Touchdowns</h3>
                {discovery.topPosts.length === 0 ? (
                  <p className="text-sm text-[var(--admin-text-muted)]">No posts yet.</p>
                ) : (
                  <div className="space-y-2">
                    {discovery.topPosts.slice(0, 8).map((post) => (
                      <div key={post.id as string} className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{((post.content as string) || '').slice(0, 60)}</p>
                          <p className="text-xs text-[var(--admin-text-muted)]">
                            by @{(post.author as Record<string, string> | null)?.username ?? 'unknown'}
                          </p>
                        </div>
                        <span className="ml-2 shrink-0 text-sm font-bold text-[var(--admin-success)]">
                          {(post.touchdown_count as number) ?? 0} TD
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
