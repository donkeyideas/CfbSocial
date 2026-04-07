'use client';

import { useState, useMemo } from 'react';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import { EmptyState } from '@/components/admin/shared/empty-state';
import { useSortableTable, SortableHeader } from '@/components/admin/shared/sortable-header';
import { timeAgo } from '@/lib/admin/utils/formatters';
import { Send, ChevronLeft, ChevronRight } from 'lucide-react';

interface PushLogEntry {
  id: string;
  notification_id: string | null;
  system_notification_id: string | null;
  user_id: string;
  device_token: string;
  platform: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  recipient?: { username: string | null; display_name: string | null } | null;
  notification_type?: string | null;
}

interface Props {
  initialData: PushLogEntry[];
  initialTotal: number;
}

export function PushLogTab({ initialData, initialTotal }: Props) {
  const [data, setData] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  const pushAccessors = useMemo(() => ({
    time: (e: PushLogEntry) => e.created_at,
    recipient: (e: PushLogEntry) => e.recipient?.display_name || e.recipient?.username || '',
    type: (e: PushLogEntry) => e.notification_type || '',
    platform: (e: PushLogEntry) => e.platform,
    status: (e: PushLogEntry) => e.status,
    error: (e: PushLogEntry) => e.error_message ?? '',
  }), []);
  const { sorted, sortConfig, requestSort } = useSortableTable(data, pushAccessors);

  async function fetchPage(p: number, status?: string, platform?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (status) params.set('status', status);
      if (platform) params.set('platform', platform);

      const res = await fetch(`/api/admin/push-log?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
        setTotal(result.total);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(status: string, platform: string) {
    setStatusFilter(status);
    setPlatformFilter(platform);
    fetchPage(1, status, platform);
  }

  return (
    <div className="push-log-tab">
      <div className="push-log-filters">
        <select
          className="admin-input push-log-select"
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value, platformFilter)}
        >
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <select
          className="admin-input push-log-select"
          value={platformFilter}
          onChange={(e) => handleFilterChange(statusFilter, e.target.value)}
        >
          <option value="">All Platforms</option>
          <option value="android">Android</option>
          <option value="ios">iOS</option>
          <option value="web">Web</option>
        </select>
        <span className="push-log-count">{total.toLocaleString()} entries</span>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No Push Logs"
          description="Push notification delivery logs will appear here once notifications are sent."
        />
      ) : (
        <>
          <div className="push-log-table-wrap">
            <table className="push-log-table">
              <thead>
                <tr>
                  <SortableHeader label="Time" sortKey="time" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Recipient" sortKey="recipient" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Type" sortKey="type" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Platform" sortKey="platform" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Error" sortKey="error" sortConfig={sortConfig} onSort={requestSort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry) => (
                  <tr key={entry.id} style={{ opacity: loading ? 0.5 : 1 }}>
                    <td className="push-log-time">{timeAgo(entry.created_at)}</td>
                    <td>
                      {entry.recipient?.display_name || entry.recipient?.username || 'Unknown'}
                    </td>
                    <td>
                      <span className="push-log-type">
                        {entry.notification_type || (entry.system_notification_id ? 'SYSTEM' : '--')}
                      </span>
                    </td>
                    <td>
                      <span className="push-log-platform">{entry.platform}</span>
                    </td>
                    <td>
                      <StatusBadge
                        status={entry.status}
                        variant={entry.status === 'sent' ? 'success' : entry.status === 'failed' ? 'error' : 'warning'}
                      />
                    </td>
                    <td className="push-log-error">
                      {entry.error_message || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="push-log-pagination">
              <button
                className="btn-admin btn-admin-sm"
                disabled={page <= 1}
                onClick={() => fetchPage(page - 1, statusFilter, platformFilter)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="push-log-page-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn-admin btn-admin-sm"
                disabled={page >= totalPages}
                onClick={() => fetchPage(page + 1, statusFilter, platformFilter)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
