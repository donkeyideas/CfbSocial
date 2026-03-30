'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface UserActionsProps {
  userId: string;
  currentRole: string;
  currentStatus: string;
}

export function UserActions({ userId, currentRole, currentStatus }: UserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRoleChange(newRole: string) {
    if (newRole === currentRole) return;

    if (newRole === 'ADMIN') {
      const confirmed = window.confirm(
        'Are you sure you want to promote this user to ADMIN? This grants full administrative privileges.',
      );
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    if (newStatus === 'SUSPENDED') {
      const confirmed = window.confirm(
        'Are you sure you want to suspend this user? They will lose access to the platform.',
      );
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <select
        value={currentRole}
        onChange={(e) => handleRoleChange(e.target.value)}
        disabled={loading}
        className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1 text-xs text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
        style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        <option value="USER">USER</option>
        <option value="MODERATOR">MODERATOR</option>
        <option value="ADMIN">ADMIN</option>
      </select>

      <button
        onClick={handleToggleStatus}
        disabled={loading}
        className={`rounded-md border border-[var(--admin-border)] px-3 py-1 text-xs font-semibold ${
          currentStatus === 'ACTIVE'
            ? 'text-[var(--admin-warning)]'
            : 'text-[var(--admin-success)]'
        }`}
        style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {currentStatus === 'ACTIVE' ? 'Suspend' : 'Activate'}
      </button>
    </div>
  );
}
