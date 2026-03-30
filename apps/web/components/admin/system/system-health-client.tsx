'use client';

import { useState } from 'react';
import { TabNav } from '@/components/admin/shared/tab-nav';
import { EmptyState } from '@/components/admin/shared/empty-state';
import { formatDuration, timeAgo } from '@/lib/admin/utils/formatters';
import { Activity, Database, Server, Briefcase, RefreshCw } from 'lucide-react';

interface ServiceStatus {
  service: string;
  healthy: boolean;
  latency: number;
  details: string;
}

interface TableStat {
  table: string;
  count: number;
  error?: string;
}

interface Props {
  healthChecks: ServiceStatus[];
  tableStats: TableStat[];
  jobs: Record<string, unknown>[];
}

const tabs = [
  { id: 'status', label: 'Service Status' },
  { id: 'database', label: 'Database Metrics' },
  { id: 'jobs', label: 'Background Jobs' },
];

export function SystemHealthClient({ healthChecks, tableStats, jobs }: Props) {
  const [activeTab, setActiveTab] = useState('status');
  const [triggering, setTriggering] = useState<string | null>(null);

  async function handleTriggerJob(jobType: string) {
    setTriggering(jobType);
    try {
      await fetch('/api/admin/trigger-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType }),
      });
      window.location.reload();
    } catch {
      setTriggering(null);
    }
  }

  return (
    <div>
      <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {healthChecks.map((check) => (
              <div key={check.service} className="admin-card p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{check.service}</p>
                  <span className={`h-3 w-3 rounded-full ${
                    check.healthy ? 'bg-[var(--admin-success)]' : 'bg-[var(--admin-error)]'
                  }`} />
                </div>
                <p className="mt-2 text-xs text-[var(--admin-text-muted)]">{check.details}</p>
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">Latency: {formatDuration(check.latency)}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'database' && (
          <div className="admin-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Database Statistics</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {tableStats.map(({ table, count, error }) => (
                <div key={table} className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] p-4">
                  <p className="text-xs font-medium text-[var(--admin-text-muted)]">{table}</p>
                  {error ? (
                    <p className="mt-1 text-sm text-[var(--admin-error)]">Error</p>
                  ) : (
                    <p className="mt-1 text-xl font-bold">{count.toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {['leaderboard_snapshot', 'daily_stats'].map((jobType) => (
                <button
                  key={jobType}
                  onClick={() => handleTriggerJob(jobType)}
                  disabled={triggering === jobType}
                  className="btn-admin-outline flex items-center gap-2 btn-admin-sm"
                >
                  <RefreshCw className={`h-3 w-3 ${triggering === jobType ? 'animate-spin' : ''}`} />
                  Run {jobType.replace('_', ' ')}
                </button>
              ))}
            </div>

            {jobs.length === 0 ? (
              <EmptyState icon={Briefcase} title="No Jobs" description="Background jobs will appear here when triggered." />
            ) : (
              <div className="admin-card overflow-hidden overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Job Type</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Attempts</th>
                      <th>Created</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id as string}>
                        <td className="font-medium">{job.job_type as string}</td>
                        <td>
                          <span className={`text-xs font-semibold ${
                            job.status === 'completed' ? 'text-[var(--admin-success)]'
                            : job.status === 'failed' ? 'text-[var(--admin-error)]'
                            : job.status === 'processing' ? 'text-[var(--admin-info)]'
                            : 'text-[var(--admin-text-secondary)]'
                          }`}>
                            {job.status as string}
                          </span>
                        </td>
                        <td>{job.priority as number}</td>
                        <td>{job.attempts as number}/{job.max_attempts as number}</td>
                        <td className="text-xs text-[var(--admin-text-muted)]">{timeAgo(job.created_at as string)}</td>
                        <td className="max-w-[200px] truncate text-xs text-[var(--admin-error)]">{(job.last_error as string) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
