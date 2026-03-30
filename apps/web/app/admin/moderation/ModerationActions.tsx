'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ModerationActions({ postId }: { postId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: 'restore' | 'remove') {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action }),
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
        onClick={() => handleAction('restore')}
        disabled={loading}
        className="rounded-md border border-[var(--admin-border)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-success)]"
        style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        Restore
      </button>
      <button
        onClick={() => handleAction('remove')}
        disabled={loading}
        className="rounded-md border border-[var(--admin-border)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-error)]"
        style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        Remove
      </button>
    </div>
  );
}
