'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
        {activeTab === 'config' && <ConfigTab providers={providers} setProviders={setProviders} />}
      </div>
    </div>
  );
}

/* ── Tab 1: Call History ───────────────────────────────────────── */

function CallHistoryTab({ entries }: { entries: APICallEntry[] }) {
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

/* ── Tab 3: API Configuration ──────────────────────────────────── */

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
