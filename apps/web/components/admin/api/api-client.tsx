'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { TabNav } from '@/components/admin/shared/tab-nav';
import { StatCard } from '@/components/admin/shared/stat-card';
import { EmptyState } from '@/components/admin/shared/empty-state';
import { useSortableTable, SortableHeader } from '@/components/admin/shared/sortable-header';
import { formatDollars, formatDuration, formatPercent, timeAgo } from '@/lib/admin/utils/formatters';
import type {
  APICallEntry,
  UsageStats,
  DailyActivity,
  ProviderConfigStatus,
  AnalyticsData,
} from '@/lib/admin/actions/api-management';
import {
  Zap,
  DollarSign,
  CheckCircle,
  Plug,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  PlayCircle,
  Loader2,
  Download,
  TrendingUp,
  Hash,
  Activity,
  BarChart3,
} from 'lucide-react';

/* ── Props ─────────────────────────────────────────────────────── */

interface Props {
  callHistory: APICallEntry[];
  usage: UsageStats;
  dailyActivity: DailyActivity[];
  providers: ProviderConfigStatus[];
}

const tabs = [
  { id: 'history', label: 'Call History' },
  { id: 'usage', label: 'Usage & Costs' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'config', label: 'API Configuration' },
];

/* ── Main Component ────────────────────────────────────────────── */

export function APIClient({ callHistory, usage, dailyActivity, providers: initialProviders }: Props) {
  const [activeTab, setActiveTab] = useState('history');
  const [providers, setProviders] = useState(initialProviders);

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total API Calls" value={usage.totalCalls} icon={Zap} />
        <StatCard label="Total Cost" value={formatDollars(usage.totalCost)} icon={DollarSign} />
        <StatCard
          label="Success Rate"
          value={formatPercent(usage.successRate)}
          icon={CheckCircle}
          color={usage.successRate >= 0.95 ? 'success' : 'warning'}
        />
        <StatCard label="Active Providers" value={usage.activeProviders} icon={Plug} />
      </div>

      <TabNav
        tabs={tabs.map((t) => ({
          ...t,
          count: t.id === 'history' ? callHistory.length : undefined,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div>
        {activeTab === 'history' && <CallHistoryTab entries={callHistory} />}
        {activeTab === 'usage' && <UsageCostsTab usage={usage} dailyActivity={dailyActivity} />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'config' && <ConfigTab providers={providers} setProviders={setProviders} />}
      </div>
    </div>
  );
}

/* ── Tab 1: Call History ───────────────────────────────────────── */

function CallHistoryTab({ entries }: { entries: APICallEntry[] }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const accessors = useMemo(() => ({
    time: (e: APICallEntry) => e.created_at,
    provider: (e: APICallEntry) => e.provider,
    endpoint: (e: APICallEntry) => e.feature,
    status: (e: APICallEntry) => e.success ? 1 : 0,
    latency: (e: APICallEntry) => e.response_time_ms,
    tokens: (e: APICallEntry) => e.tokens_used,
    cost: (e: APICallEntry) => e.cost,
  }), []);
  const { sorted, sortConfig, requestSort } = useSortableTable(entries, accessors);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch('/api/admin/api-management/export');
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `api-call-history-${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setDownloading(false);
    }
  };

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="No API Call Logs"
        description="API call logs will appear here once external APIs are called."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--admin-text-muted)]">
          Showing the {entries.length} most recent calls. Download the full history as CSV (opens in Excel).
        </p>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--admin-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {downloading ? 'Preparing CSV...' : 'Download CSV'}
          </button>
          {downloadError && (
            <span className="text-xs text-[var(--admin-error)]">{downloadError}</span>
          )}
        </div>
      </div>
      <div className="admin-card overflow-hidden overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <SortableHeader label="Time" sortKey="time" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Provider" sortKey="provider" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Endpoint" sortKey="endpoint" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Latency" sortKey="latency" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Tokens" sortKey="tokens" sortConfig={sortConfig} onSort={requestSort} />
              <SortableHeader label="Cost" sortKey="cost" sortConfig={sortConfig} onSort={requestSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-xs text-[var(--admin-text-muted)]">
                  {timeAgo(e.created_at)}
                </td>
                <td>
                  <span className="text-xs font-semibold text-[var(--admin-accent-light)]">
                    {e.provider}
                  </span>
                </td>
                <td className="max-w-[200px] truncate text-xs text-[var(--admin-text-muted)]">
                  {e.feature.replace(/_/g, ' ')}{e.sub_type ? ` / ${e.sub_type.replace(/_/g, ' ')}` : ''}
                </td>
                <td>
                  <span
                    className={`text-xs font-semibold ${
                      e.success
                        ? 'text-[var(--admin-success)]'
                        : 'text-[var(--admin-error)]'
                    }`}
                  >
                    {e.success ? '200' : 'Error'}
                  </span>
                </td>
                <td className="text-xs">{formatDuration(e.response_time_ms)}</td>
                <td className="text-xs">{e.tokens_used.toLocaleString()}</td>
                <td className="text-xs">{formatDollars(e.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Tab 2: Usage & Costs ──────────────────────────────────────── */

function UsageCostsTab({ usage, dailyActivity }: { usage: UsageStats; dailyActivity: DailyActivity[] }) {
  const totalCalls = dailyActivity.reduce((s, d) => s + d.calls, 0);
  const peak = Math.max(...dailyActivity.map((d) => d.calls), 0);
  const activeDays = dailyActivity.filter((d) => d.calls > 0).length;
  const avg = activeDays > 0 ? Math.round(totalCalls / activeDays) : 0;

  type ByProvider = UsageStats['byProvider'][number];
  const provAccessors = useMemo(() => ({
    provider: (p: ByProvider) => p.provider,
    calls: (p: ByProvider) => p.calls,
    errors: (p: ByProvider) => p.errors,
    errorRate: (p: ByProvider) => p.errorRate,
    cost: (p: ByProvider) => p.cost,
    tokens: (p: ByProvider) => p.tokens,
    avgLatency: (p: ByProvider) => p.avgLatency,
  }), []);
  const { sorted: sortedProviders, sortConfig: provSortConfig, requestSort: requestProvSort } = useSortableTable(usage.byProvider, provAccessors);

  return (
    <div className="space-y-6">
      {/* Usage by Provider table */}
      {usage.byProvider.length > 0 && (
        <div className="admin-card overflow-hidden">
          <div className="border-b border-[var(--admin-border)] px-5 py-3">
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">Usage by Provider</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <SortableHeader label="Provider" sortKey="provider" sortConfig={provSortConfig} onSort={requestProvSort} />
                  <SortableHeader label="Calls" sortKey="calls" sortConfig={provSortConfig} onSort={requestProvSort} />
                  <SortableHeader label="Errors" sortKey="errors" sortConfig={provSortConfig} onSort={requestProvSort} />
                  <SortableHeader label="Error Rate" sortKey="errorRate" sortConfig={provSortConfig} onSort={requestProvSort} />
                  <SortableHeader label="Cost" sortKey="cost" sortConfig={provSortConfig} onSort={requestProvSort} />
                  <SortableHeader label="Tokens" sortKey="tokens" sortConfig={provSortConfig} onSort={requestProvSort} />
                  <SortableHeader label="Avg Latency" sortKey="avgLatency" sortConfig={provSortConfig} onSort={requestProvSort} />
                </tr>
              </thead>
              <tbody>
                {sortedProviders.map((p) => (
                  <tr key={p.provider}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[var(--admin-accent)]" />
                        <span className="font-medium">{p.provider}</span>
                      </div>
                    </td>
                    <td>{p.calls.toLocaleString()}</td>
                    <td className={p.errors > 0 ? 'text-[var(--admin-error)]' : ''}>
                      {p.errors}
                    </td>
                    <td className={p.errorRate > 0.05 ? 'text-[var(--admin-error)]' : ''}>
                      {formatPercent(p.errorRate)}
                    </td>
                    <td>{formatDollars(p.cost)}</td>
                    <td>{p.tokens.toLocaleString()}</td>
                    <td>{formatDuration(p.avgLatency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily Activity Chart */}
      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">
            Daily API Activity (Last 30 Days)
          </h3>
          <div className="flex gap-4 text-xs text-[var(--admin-text-muted)]">
            <span>Total: {totalCalls}</span>
            <span>Peak: {peak}/day</span>
            <span>Avg: {avg}/day</span>
            <span>Active: {activeDays} days</span>
          </div>
        </div>
        <div className="p-5">
          {totalCalls === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-sm text-[var(--admin-text-muted)]">
              No activity data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyActivity} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number) => [value, 'Calls']}
                />
                <Bar dataKey="calls" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tab 3: Analytics ──────────────────────────────────────────── */

type DateRangeOption = '7d' | '30d' | '90d' | 'month' | 'year' | 'all' | 'custom';

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#64748b'];

function formatDayLabel(isoDate: string): string {
  return isoDate.slice(5); // MM-DD
}

function formatMonthLabel(yyyymm: string): string {
  const parts = yyyymm.split('-');
  const year = parts[0] ?? '';
  const month = parts[1] ?? '01';
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(month, 10) - 1]} ${year}`;
}

function computeRange(option: DateRangeOption, customStart: string, customEnd: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  if (option === 'custom') {
    const startDate = customStart ? new Date(customStart + 'T00:00:00Z') : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = customEnd ? new Date(customEnd + 'T23:59:59Z') : now;
    return { start: startDate.toISOString(), end: endDate.toISOString() };
  }

  let daysBack = 30;
  if (option === '7d') daysBack = 7;
  else if (option === '30d') daysBack = 30;
  else if (option === '90d') daysBack = 90;
  else if (option === 'all') daysBack = 365 * 5;
  else if (option === 'month') {
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { start: first.toISOString(), end };
  } else if (option === 'year') {
    const first = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return { start: first.toISOString(), end };
  }

  const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end };
}

function AnalyticsTab() {
  const [range, setRange] = useState<DateRangeOption>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (opt: DateRangeOption, cs: string, ce: string) => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = computeRange(opt, cs, ce);
      const params = new URLSearchParams({ start, end });
      const res = await fetch(`/api/admin/api-management/analytics?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'Failed to load analytics' }));
        throw new Error(j.error || 'Failed to load analytics');
      }
      const json = (await res.json()) as AnalyticsData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (range !== 'custom') {
      loadData(range, customStart, customEnd);
    }
  }, [range, loadData, customStart, customEnd]);

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      loadData('custom', customStart, customEnd);
    }
  };

  const rangeButtons: { id: DateRangeOption; label: string }[] = [
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: 'Last 90 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="admin-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {rangeButtons.map((b) => (
            <button
              key={b.id}
              onClick={() => setRange(b.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                range === b.id
                  ? 'bg-[var(--admin-accent)] text-white'
                  : 'border border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-surface-raised)]'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--admin-text-muted)]">From</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--admin-text-muted)]">To</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
              />
            </div>
            <button
              onClick={handleApplyCustom}
              disabled={!customStart || !customEnd}
              className="rounded-md bg-[var(--admin-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="admin-card p-4 text-sm text-[var(--admin-error)]">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--admin-text-muted)]" />
        </div>
      )}

      {data && <AnalyticsContent data={data} loading={loading} />}
    </div>
  );
}

function AnalyticsContent({ data, loading }: { data: AnalyticsData; loading: boolean }) {
  const { kpis, daily, hourly, byFeature, byProvider, monthly, dailyByProvider, providers } = data;

  // Top 7 features for pie chart (others grouped as "Other")
  const topFeatures = useMemo(() => {
    if (byFeature.length <= 7) return byFeature;
    const top = byFeature.slice(0, 7);
    const other = byFeature.slice(7).reduce(
      (acc, f) => ({ feature: 'Other', calls: acc.calls + f.calls, cost: acc.cost + f.cost, tokens: acc.tokens + f.tokens }),
      { feature: 'Other', calls: 0, cost: 0, tokens: 0 },
    );
    return [...top, other];
  }, [byFeature]);

  const totalFeatureCalls = useMemo(
    () => topFeatures.reduce((s, f) => s + f.calls, 0),
    [topFeatures],
  );

  return (
    <div className={`space-y-6 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Calls" value={kpis.totalCalls.toLocaleString()} icon={Zap} />
        <StatCard label="Total Cost" value={formatDollars(kpis.totalCost)} icon={DollarSign} />
        <StatCard label="Total Tokens" value={kpis.totalTokens.toLocaleString()} icon={Hash} />
        <StatCard label="Avg Cost / Call" value={formatDollars(kpis.avgCostPerCall)} icon={TrendingUp} />
        <StatCard label="Avg Tokens / Call" value={kpis.avgTokensPerCall.toLocaleString()} icon={BarChart3} />
        <StatCard label="Avg Latency" value={formatDuration(kpis.avgLatency)} icon={Activity} />
        <StatCard
          label="Success Rate"
          value={formatPercent(kpis.successRate)}
          icon={CheckCircle}
          color={kpis.successRate >= 0.95 ? 'success' : 'warning'}
        />
        <StatCard
          label="Peak Day"
          value={kpis.peakDayCalls.toLocaleString()}
          change={kpis.peakDayDate ?? '--'}
          icon={TrendingUp}
        />
      </div>

      {/* Daily calls + cost combo chart */}
      <div className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-border)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">Daily Usage &amp; Cost</h3>
          <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">Calls per day (bars) and cost per day (line)</p>
        </div>
        <div className="p-5">
          {daily.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-[var(--admin-text-muted)]">
              No activity in selected range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={daily} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  tickFormatter={formatDayLabel}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="calls"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'cost') return [`$${value.toFixed(4)}`, 'Cost'];
                    return [value.toLocaleString(), 'Calls'];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar yAxisId="calls" dataKey="calls" name="Calls" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Daily cost area chart */}
      <div className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-border)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">Daily Cost</h3>
        </div>
        <div className="p-5">
          {daily.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-sm text-[var(--admin-text-muted)]">
              No cost data in selected range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  tickFormatter={formatDayLabel}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                />
                <Area type="monotone" dataKey="cost" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Daily tokens line chart */}
      <div className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-border)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">Daily Tokens</h3>
        </div>
        <div className="p-5">
          {daily.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-sm text-[var(--admin-text-muted)]">
              No token data in selected range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  tickFormatter={formatDayLabel}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
                />
                <Line type="monotone" dataKey="tokens" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Monthly trend (shown if range spans more than one month) */}
      {monthly.length > 1 && (
        <div className="admin-card overflow-hidden">
          <div className="border-b border-[var(--admin-border)] px-5 py-3">
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">Monthly Usage</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  tickFormatter={formatMonthLabel}
                />
                <YAxis
                  yAxisId="calls"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={false}
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8' }}
                  labelFormatter={(v: string) => formatMonthLabel(v)}
                  formatter={(value: number, name: string) => {
                    if (name === 'cost') return [`$${value.toFixed(4)}`, 'Cost'];
                    if (name === 'tokens') return [value.toLocaleString(), 'Tokens'];
                    return [value.toLocaleString(), 'Calls'];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar yAxisId="calls" dataKey="calls" name="Calls" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="cost" dataKey="cost" name="Cost" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Two-col: Feature pie + Provider breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-card overflow-hidden">
          <div className="border-b border-[var(--admin-border)] px-5 py-3">
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">Calls by Feature</h3>
          </div>
          <div className="p-5">
            {topFeatures.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-[var(--admin-text-muted)]">
                No data
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={topFeatures}
                        dataKey="calls"
                        nameKey="feature"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        labelLine={false}
                      >
                        {topFeatures.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#e2e8f0' }}
                        formatter={(value: number, _name, props: { payload?: { feature: string } }) => {
                          const name = props?.payload?.feature ?? 'feature';
                          return [value.toLocaleString(), name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2">
                  <ul className="space-y-2">
                    {topFeatures.map((f, idx) => {
                      const pct = totalFeatureCalls > 0 ? (f.calls / totalFeatureCalls) * 100 : 0;
                      return (
                        <li key={f.feature} className="flex items-center gap-2 text-xs">
                          <span
                            className="h-3 w-3 flex-shrink-0 rounded-sm"
                            style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                          />
                          <span className="flex-1 truncate font-medium text-[var(--admin-text)]">
                            {f.feature.replace(/_/g, ' ')}
                          </span>
                          <span className="tabular-nums text-[var(--admin-text-muted)]">
                            {f.calls.toLocaleString()}
                          </span>
                          <span className="w-12 text-right tabular-nums text-[var(--admin-text-muted)]">
                            {pct.toFixed(1)}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="border-b border-[var(--admin-border)] px-5 py-3">
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">Cost by Provider</h3>
          </div>
          <div className="overflow-x-auto">
            {byProvider.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-[var(--admin-text-muted)]">
                No data
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Calls</th>
                    <th>Tokens</th>
                    <th>Cost</th>
                    <th>% of Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {byProvider.map((p) => {
                    const pct = kpis.totalCost > 0 ? (p.cost / kpis.totalCost) * 100 : 0;
                    return (
                      <tr key={p.provider}>
                        <td>
                          <span className="font-medium">{p.provider}</span>
                        </td>
                        <td>{p.calls.toLocaleString()}</td>
                        <td>{p.tokens.toLocaleString()}</td>
                        <td>{formatDollars(p.cost)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--admin-surface-raised)]">
                              <div
                                className="h-full rounded-full bg-[var(--admin-accent)]"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs text-[var(--admin-text-muted)]">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Hourly distribution */}
      <div className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-border)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">Hourly Distribution (UTC)</h3>
          <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">When your API calls happen throughout the day</p>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                dataKey="hour"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={false}
                tickFormatter={(v) => `${v}:00`}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8' }}
                labelFormatter={(v: number) => `${v}:00 - ${v}:59 UTC`}
                formatter={(value: number) => [value.toLocaleString(), 'Calls']}
              />
              <Bar dataKey="calls" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost by feature table */}
      <div className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-border)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">Cost Breakdown by Feature</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Calls</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Avg Cost / Call</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {byFeature.map((f) => {
                const pct = kpis.totalCost > 0 ? (f.cost / kpis.totalCost) * 100 : 0;
                const avgCost = f.calls > 0 ? f.cost / f.calls : 0;
                return (
                  <tr key={f.feature}>
                    <td className="font-medium">{f.feature.replace(/_/g, ' ')}</td>
                    <td>{f.calls.toLocaleString()}</td>
                    <td>{f.tokens.toLocaleString()}</td>
                    <td>{formatDollars(f.cost)}</td>
                    <td>{formatDollars(avgCost)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--admin-surface-raised)]">
                          <div
                            className="h-full rounded-full bg-[var(--admin-accent)]"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-[var(--admin-text-muted)]">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost per Day by Provider table */}
      <div className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-border)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">Cost per Day by Provider</h3>
          <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">Daily cost breakdown across each provider (newest first)</p>
        </div>
        <div className="overflow-x-auto">
          {dailyByProvider.length === 0 ? (
            <div className="flex h-[150px] items-center justify-center text-sm text-[var(--admin-text-muted)]">
              No data in selected range
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {providers.map((p) => (
                    <th key={p}>{p}</th>
                  ))}
                  <th>Total Cost</th>
                  <th>Total Calls</th>
                </tr>
              </thead>
              <tbody>
                {dailyByProvider.map((row) => (
                  <tr key={row.date}>
                    <td className="whitespace-nowrap font-medium">{row.date}</td>
                    {providers.map((p) => {
                      const cell = row.perProvider[p];
                      return (
                        <td key={p} className="text-xs">
                          {cell ? (
                            <div className="flex flex-col">
                              <span className="font-semibold">{formatDollars(cell.cost)}</span>
                              <span className="text-[var(--admin-text-muted)]">
                                {cell.calls.toLocaleString()} calls
                              </span>
                            </div>
                          ) : (
                            <span className="text-[var(--admin-text-muted)]">--</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="font-semibold">{formatDollars(row.totalCost)}</td>
                    <td>{row.totalCalls.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--admin-border)]">
                  <td className="font-bold">Totals</td>
                  {providers.map((p) => {
                    const total = byProvider.find((bp) => bp.provider === p);
                    return (
                      <td key={p} className="text-xs font-bold">
                        {total ? formatDollars(total.cost) : '--'}
                      </td>
                    );
                  })}
                  <td className="font-bold">{formatDollars(kpis.totalCost)}</td>
                  <td className="font-bold">{kpis.totalCalls.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tab 4: API Configuration ──────────────────────────────────── */

function ConfigTab({
  providers,
  setProviders,
}: {
  providers: ProviderConfigStatus[];
  setProviders: React.Dispatch<React.SetStateAction<ProviderConfigStatus[]>>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {providers.map((p) => (
        <ProviderCard key={p.id} provider={p} onUpdate={(updated) => {
          setProviders((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        }} />
      ))}
    </div>
  );
}

function ProviderCard({
  provider,
  onUpdate,
}: {
  provider: ProviderConfigStatus;
  onUpdate: (p: ProviderConfigStatus) => void;
}) {
  const [keyValues, setKeyValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const k of provider.keys) init[k.key] = '';
    return init;
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testOk, setTestOk] = useState<boolean | null>(null);

  const handleSave = async () => {
    const filled = Object.fromEntries(
      Object.entries(keyValues).filter(([, v]) => v.trim()),
    );
    if (Object.keys(filled).length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/api-management/save-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filled),
      });
      if (res.ok) {
        onUpdate({
          ...provider,
          isConfigured: true,
          keys: provider.keys.map((k) => ({
            ...k,
            hasValue: k.hasValue || !!filled[k.key],
          })),
        });
        setKeyValues((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(filled)) next[k] = '';
          return next;
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestMsg(null);
    setTestOk(null);
    try {
      const res = await fetch('/api/admin/api-management/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id }),
      });
      const data = await res.json();
      setTestOk(!!data.success);
      setTestMsg(data.success ? (data.message ?? 'Connected') : (data.error ?? 'Failed'));
      if (data.success) {
        onUpdate({
          ...provider,
          lastTested: new Date().toISOString(),
          testResult: 'ok',
        });
      }
    } catch {
      setTestOk(false);
      setTestMsg('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="admin-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--admin-surface-raised)] text-sm font-bold text-[var(--admin-text-muted)]">
            {provider.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">{provider.name}</h3>
            <p className="text-xs text-[var(--admin-text-muted)]">{provider.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {provider.alwaysActive ? (
            <span className="text-xs font-semibold text-[var(--admin-success)]">
              ACTIVE
            </span>
          ) : provider.testResult === 'ok' ? (
            <span className="text-xs font-semibold text-[var(--admin-success)]">
              VERIFIED
            </span>
          ) : provider.isConfigured ? (
            <span className="text-xs font-semibold text-[var(--admin-warning)]">
              CONFIGURED
            </span>
          ) : (
            <span className="text-xs font-semibold text-[var(--admin-text-muted)]">
              NOT SET
            </span>
          )}
        </div>
      </div>

      {/* Key fields */}
      {provider.keys.length > 0 && (
        <div className="mt-4 space-y-3">
          {provider.keys.map((k) => (
            <div key={k.key}>
              <label className="mb-1 block text-xs font-medium text-[var(--admin-text-muted)]">
                {k.label}
                {k.hasValue && (
                  <span className="ml-1.5 text-[var(--admin-success)]">(saved)</span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type={showKeys[k.key] ? 'text' : 'password'}
                  value={keyValues[k.key] ?? ''}
                  onChange={(e) => setKeyValues((prev) => ({ ...prev, [k.key]: e.target.value }))}
                  placeholder={k.hasValue ? 'Enter new value to update' : 'Enter value'}
                  className="flex-1 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)]/50 focus:border-[var(--admin-accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowKeys((prev) => ({ ...prev, [k.key]: !prev[k.key] }))
                  }
                  className="rounded-md border border-[var(--admin-border)] p-1.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                >
                  {showKeys[k.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Last tested */}
      {provider.lastTested && (
        <p className="mt-3 text-xs text-[var(--admin-text-muted)]">
          Last tested: {timeAgo(provider.lastTested)}
        </p>
      )}

      {/* Test result message */}
      {testMsg && (
        <p className={`mt-2 text-xs ${testOk ? 'text-[var(--admin-success)]' : 'text-[var(--admin-error)]'}`}>
          {testMsg}
        </p>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex gap-2">
        {provider.keys.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--admin-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        )}
        <button
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--admin-border)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-raised)] disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
          Test
        </button>
      </div>
    </div>
  );
}
