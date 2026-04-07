'use client';

import { useState, useMemo, Fragment } from 'react';
import { TabNav } from '@/components/admin/shared/tab-nav';
import { StatCard } from '@/components/admin/shared/stat-card';
import { EmptyState } from '@/components/admin/shared/empty-state';
import { ChartWrapper } from '@/components/admin/shared/chart-wrapper';
import { useSortableTable, SortableHeader } from '@/components/admin/shared/sortable-header';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CHART_COLORS, getChartConfig, SERIES_COLORS } from '@/lib/admin/utils/chart-theme';
import { formatDollars, formatDuration, formatPercent, truncate, timeAgo } from '@/lib/admin/utils/formatters';
import { Sparkles, DollarSign, Cpu, Clock, Brain, Database, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface SummaryStats {
  totalInteractions: number;
  totalCost30d: number;
  totalTokens30d: number;
  avgResponseTime: number;
}

interface Interaction {
  id: string;
  feature: string;
  sub_type: string | null;
  provider: string;
  model: string | null;
  prompt_text: string | null;
  response_text: string | null;
  tokens_used: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  response_time_ms: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

interface FeatureUsage {
  feature: string;
  calls: number;
  tokens: number;
  cost: number;
  avgLatency: number;
  successRate: number;
}

interface ProviderStats {
  provider: string;
  calls: number;
  tokens: number;
  cost: number;
  avgLatency: number;
  successRate: number;
  errors: number;
}

interface CostDay {
  date: string;
  cost: number;
}

interface VolumeDay {
  date: string;
  total: number;
  [feature: string]: string | number;
}

interface Props {
  summary: SummaryStats;
  interactions: { interactions: Interaction[]; total: number };
  usageByFeature: FeatureUsage[];
  providerPerformance: ProviderStats[];
  costTrend: CostDay[];
  dailyVolume: VolumeDay[];
}

const tabs = [
  { id: 'knowledge', label: 'Knowledge Base', icon: Database },
  { id: 'usage', label: 'Usage Analytics', icon: Sparkles },
  { id: 'providers', label: 'Provider Performance', icon: Cpu },
  { id: 'cost', label: 'Cost Optimization', icon: DollarSign },
];

export function AIIntelligenceClient({ summary, interactions, usageByFeature, providerPerformance, costTrend, dailyVolume }: Props) {
  const [activeTab, setActiveTab] = useState('knowledge');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const cfg = getChartConfig();

  const maxFeatureCost = Math.max(...usageByFeature.map((f) => f.cost), 0.0001);

  // Knowledge Base sort
  const kbAccessors = useMemo(() => ({
    date: (r: Interaction) => r.created_at,
    feature: (r: Interaction) => r.feature,
    subType: (r: Interaction) => r.sub_type ?? '',
    provider: (r: Interaction) => r.provider,
    tokens: (r: Interaction) => r.tokens_used ?? 0,
    cost: (r: Interaction) => r.cost ?? 0,
    time: (r: Interaction) => r.response_time_ms ?? 0,
    status: (r: Interaction) => r.success ? 1 : 0,
  }), []);
  const { sorted: sortedInteractions, sortConfig: kbSortConfig, requestSort: requestKbSort } = useSortableTable(interactions.interactions, kbAccessors);

  // Feature Breakdown sort
  const featureAccessors = useMemo(() => ({
    feature: (f: FeatureUsage) => f.feature,
    calls: (f: FeatureUsage) => f.calls,
    tokens: (f: FeatureUsage) => f.tokens,
    avgMs: (f: FeatureUsage) => f.avgLatency,
    success: (f: FeatureUsage) => f.successRate,
  }), []);
  const { sorted: sortedFeatures, sortConfig: featureSortConfig, requestSort: requestFeatureSort } = useSortableTable(usageByFeature, featureAccessors);

  // Provider Performance sort
  const provAccessors = useMemo(() => ({
    provider: (p: ProviderStats) => p.provider,
    calls: (p: ProviderStats) => p.calls,
    cost: (p: ProviderStats) => p.cost,
    avgLatency: (p: ProviderStats) => p.avgLatency,
    successRate: (p: ProviderStats) => p.successRate,
    errors: (p: ProviderStats) => p.errors,
    tokens: (p: ProviderStats) => p.tokens,
  }), []);
  const { sorted: sortedProviders, sortConfig: provSortConfig, requestSort: requestProvSort } = useSortableTable(providerPerformance, provAccessors);

  return (
    <div className="space-y-6">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Interactions"
          value={summary.totalInteractions.toLocaleString()}
          icon={Sparkles}
        />
        <StatCard
          label="Total Cost (30d)"
          value={formatDollars(summary.totalCost30d)}
          icon={DollarSign}
        />
        <StatCard
          label="Total Tokens (30d)"
          value={summary.totalTokens30d.toLocaleString()}
          icon={Cpu}
        />
        <StatCard
          label="Avg Response"
          value={`${summary.avgResponseTime.toLocaleString()}ms`}
          icon={Clock}
        />
      </div>

      {/* Tab Navigation */}
      <TabNav tabs={tabs.map((t) => ({ id: t.id, label: t.label }))} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Knowledge Base Tab */}
      {activeTab === 'knowledge' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="admin-card p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts, responses, features, providers..."
                className="admin-input w-full pl-10"
              />
            </div>
          </div>

          {interactions.interactions.length === 0 ? (
            <EmptyState icon={Brain} title="No AI Interactions Yet" description="AI interactions will appear here once the platform starts using AI features." />
          ) : (
            <div className="admin-card overflow-hidden overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <SortableHeader label="Date" sortKey="date" sortConfig={kbSortConfig} onSort={requestKbSort} />
                    <SortableHeader label="Feature" sortKey="feature" sortConfig={kbSortConfig} onSort={requestKbSort} />
                    <SortableHeader label="Sub Type" sortKey="subType" sortConfig={kbSortConfig} onSort={requestKbSort} />
                    <SortableHeader label="Provider" sortKey="provider" sortConfig={kbSortConfig} onSort={requestKbSort} />
                    <SortableHeader label="Tokens" sortKey="tokens" sortConfig={kbSortConfig} onSort={requestKbSort} />
                    <SortableHeader label="Cost" sortKey="cost" sortConfig={kbSortConfig} onSort={requestKbSort} />
                    <SortableHeader label="Time" sortKey="time" sortConfig={kbSortConfig} onSort={requestKbSort} />
                    <SortableHeader label="Status" sortKey="status" sortConfig={kbSortConfig} onSort={requestKbSort} />
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInteractions
                    .filter((row) => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        row.feature?.toLowerCase().includes(q) ||
                        row.provider?.toLowerCase().includes(q) ||
                        row.sub_type?.toLowerCase().includes(q) ||
                        row.prompt_text?.toLowerCase().includes(q) ||
                        row.response_text?.toLowerCase().includes(q)
                      );
                    })
                    .map((row) => {
                      const isExpanded = expandedRow === row.id;
                      return (
                        <Fragment key={row.id}>
                          <tr
                            className="cursor-pointer"
                            onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                          >
                            <td className="whitespace-nowrap text-xs text-[var(--admin-text-muted)]">
                              {new Date(row.created_at).toLocaleDateString()}
                            </td>
                            <td className="font-medium">{row.feature.replace(/_/g, ' ')}</td>
                            <td className="text-sm text-[var(--admin-text-secondary)]">
                              {row.sub_type?.replace(/_/g, ' ') || '\u2014'}
                            </td>
                            <td>
                              <span className="text-xs font-semibold uppercase">
                                {row.provider.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="text-sm">{(row.tokens_used ?? 0).toLocaleString()}</td>
                            <td className="text-sm">{formatDollars(row.cost ?? 0)}</td>
                            <td className="text-sm">{(row.response_time_ms ?? 0).toLocaleString()}ms</td>
                            <td>
                              <span className={`text-xs font-semibold ${
                                row.success
                                  ? 'text-[var(--admin-success)]'
                                  : 'text-[var(--admin-error)]'
                              }`}>
                                {row.success ? '\u2713' : '\u2717'}
                              </span>
                            </td>
                            <td className="text-[var(--admin-text-muted)]">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} className="bg-[var(--admin-bg)] p-0">
                                <div className="grid grid-cols-2 gap-0 border-t border-[var(--admin-border)]">
                                  {/* Prompt */}
                                  <div className="border-r border-[var(--admin-border)] p-4">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">Prompt</p>
                                    <pre className="whitespace-pre-wrap rounded bg-[var(--admin-surface)] p-3 text-xs leading-relaxed text-[var(--admin-text-secondary)]">
                                      {row.prompt_text || 'N/A'}
                                    </pre>
                                  </div>
                                  {/* Response */}
                                  <div className="p-4">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">Response</p>
                                    <pre className="whitespace-pre-wrap rounded bg-[var(--admin-surface)] p-3 text-xs leading-relaxed text-[var(--admin-text-secondary)]">
                                      {truncate(row.response_text ?? 'N/A', 1000)}
                                    </pre>
                                  </div>
                                </div>
                                {/* Error row */}
                                {typeof row.error_message === 'string' && row.error_message && (
                                  <div className="border-t border-[var(--admin-border)] p-4">
                                    <p className="text-xs font-semibold text-[var(--admin-error)]">Error: {row.error_message}</p>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                </tbody>
              </table>
              <div className="border-t border-[var(--admin-border)] p-3 text-sm text-[var(--admin-text-muted)]">
                Showing {interactions.interactions.length} of {interactions.total} interactions
              </div>
            </div>
          )}
        </div>
      )}

      {/* Usage Analytics Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          {usageByFeature.length === 0 ? (
            <EmptyState icon={Database} title="No Usage Data" description="Usage analytics will populate as AI features are used." />
          ) : (
            <>
              {/* Calls by Feature Bar Chart */}
              <ChartWrapper title="Calls by Feature (Last 30 Days)">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={usageByFeature}>
                    <CartesianGrid strokeDasharray="3 3" stroke={cfg.gridColor} />
                    <XAxis
                      dataKey="feature"
                      tick={{ fill: cfg.axisColor, fontSize: 10 }}
                      tickLine={false}
                      tickFormatter={(v: string) => v.replace(/_/g, ' ')}
                      angle={-35}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fill: cfg.axisColor, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }}
                      formatter={(v: number) => [v.toLocaleString(), 'Calls']}
                    />
                    <Bar dataKey="calls" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>

              {/* Two-column: Pie Chart + Feature Breakdown Table */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Cost Distribution Pie */}
                <ChartWrapper title="Cost Distribution by Feature">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={usageByFeature.filter((f) => f.cost > 0)}
                        dataKey="cost"
                        nameKey="feature"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ feature, cost }: { feature: string; cost: number }) =>
                          `${feature.replace(/_/g, ' ')}: ${formatDollars(cost)}`
                        }
                        labelLine={{ stroke: cfg.axisColor }}
                      >
                        {usageByFeature.filter((f) => f.cost > 0).map((_, i) => (
                          <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }}
                        formatter={(v: number) => [formatDollars(v), 'Cost']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartWrapper>

                {/* Feature Breakdown Table */}
                <div className="admin-card overflow-hidden">
                  <div className="border-b border-[var(--admin-border)] p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">Feature Breakdown</h3>
                  </div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <SortableHeader label="Feature" sortKey="feature" sortConfig={featureSortConfig} onSort={requestFeatureSort} />
                        <SortableHeader label="Calls" sortKey="calls" sortConfig={featureSortConfig} onSort={requestFeatureSort} />
                        <SortableHeader label="Tokens" sortKey="tokens" sortConfig={featureSortConfig} onSort={requestFeatureSort} />
                        <SortableHeader label="Avg ms" sortKey="avgMs" sortConfig={featureSortConfig} onSort={requestFeatureSort} />
                        <SortableHeader label="Success" sortKey="success" sortConfig={featureSortConfig} onSort={requestFeatureSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFeatures.map((row) => (
                        <tr key={row.feature}>
                          <td className="font-medium">{row.feature.replace(/_/g, ' ')}</td>
                          <td>{row.calls.toLocaleString()}</td>
                          <td>{row.tokens.toLocaleString()}</td>
                          <td>{row.avgLatency.toLocaleString()}</td>
                          <td>
                            <span className={row.successRate >= 0.95 ? 'text-[var(--admin-success)]' : row.successRate >= 0.8 ? 'text-[var(--admin-warning)]' : 'text-[var(--admin-error)]'}>
                              {formatPercent(row.successRate)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Provider Performance Tab */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          {providerPerformance.length === 0 ? (
            <EmptyState icon={Cpu} title="No Provider Data" description="Provider performance data will appear once AI calls are made." />
          ) : (
            <ChartWrapper title="Provider Comparison (Last 30 Days)">
              <table className="admin-table">
                <thead>
                  <tr>
                    <SortableHeader label="Provider" sortKey="provider" sortConfig={provSortConfig} onSort={requestProvSort} />
                    <SortableHeader label="Calls" sortKey="calls" sortConfig={provSortConfig} onSort={requestProvSort} />
                    <SortableHeader label="Total Cost" sortKey="cost" sortConfig={provSortConfig} onSort={requestProvSort} />
                    <SortableHeader label="Avg Latency" sortKey="avgLatency" sortConfig={provSortConfig} onSort={requestProvSort} />
                    <SortableHeader label="Success Rate" sortKey="successRate" sortConfig={provSortConfig} onSort={requestProvSort} />
                    <SortableHeader label="Errors" sortKey="errors" sortConfig={provSortConfig} onSort={requestProvSort} />
                    <SortableHeader label="Total Tokens" sortKey="tokens" sortConfig={provSortConfig} onSort={requestProvSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedProviders.map((row) => (
                    <tr key={row.provider}>
                      <td>
                        <span className="text-xs font-bold uppercase">
                          {row.provider.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="font-medium">{row.calls.toLocaleString()}</td>
                      <td>{formatDollars(row.cost)}</td>
                      <td>{row.avgLatency.toLocaleString()}ms</td>
                      <td>
                        <span className={row.successRate >= 0.95 ? 'text-[var(--admin-success)]' : row.successRate >= 0.8 ? 'text-[var(--admin-warning)]' : 'text-[var(--admin-error)]'}>
                          {formatPercent(row.successRate)}
                        </span>
                      </td>
                      <td className="text-[var(--admin-error)]">{row.errors}</td>
                      <td>{row.tokens.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ChartWrapper>
          )}
        </div>
      )}

      {/* Cost Optimization Tab */}
      {activeTab === 'cost' && (
        <div className="space-y-6">
          {/* Daily Cost Trend */}
          <ChartWrapper title="Daily AI Cost Trend (Last 30 Days)">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={costTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={cfg.gridColor} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: cfg.axisColor, fontSize: 11 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: cfg.axisColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }}
                  formatter={(v: number) => [`$${v.toFixed(4)}`, 'Cost']}
                />
                <Area type="monotone" dataKey="cost" stroke={CHART_COLORS.danger} fill={CHART_COLORS.danger} fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrapper>

          {/* Cost Per Feature Horizontal Bars */}
          <div className="admin-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">Cost Per Feature</h3>
            {usageByFeature.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No cost data yet.</p>
            ) : (
              <div className="space-y-3">
                {usageByFeature.map((f) => {
                  const barWidth = maxFeatureCost > 0 ? (f.cost / maxFeatureCost) * 100 : 0;
                  return (
                    <div key={f.feature} className="flex items-center gap-4">
                      <span className="w-52 shrink-0 text-right text-sm text-[var(--admin-text-secondary)]">{f.feature.replace(/_/g, ' ')}</span>
                      <div className="flex-1">
                        <div className="h-5 overflow-hidden rounded bg-[var(--admin-surface)]">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${barWidth}%`,
                              background: `linear-gradient(90deg, ${CHART_COLORS.danger}, ${CHART_COLORS.warning})`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-20 text-right text-sm font-medium">{formatDollars(f.cost)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

