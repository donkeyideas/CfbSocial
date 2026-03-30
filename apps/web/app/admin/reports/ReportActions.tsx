'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ReportActionsProps {
  reportId: string;
  postId: string | null;
  reportedUserId: string | null;
}

export function ReportActions({ reportId, postId, reportedUserId }: ReportActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: 'action' | 'dismiss') {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/report-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, postId, reportedUserId, action }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button
        onClick={() => handleAction('action')}
        disabled={loading}
        className="rounded-md border border-[var(--admin-border)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-error)]"
        style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        Action
      </button>
      <button
        onClick={() => handleAction('dismiss')}
        disabled={loading}
        className="rounded-md bg-[var(--admin-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text-muted)]"
        style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        Dismiss
      </button>
    </div>
  );
}
