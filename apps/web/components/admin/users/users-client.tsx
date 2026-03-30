'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  ShieldCheck,
  ShieldAlert,
  Ban,
  RotateCcw,
  Star,
  Users,
  ChevronDown,
} from 'lucide-react';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import { EmptyState } from '@/components/admin/shared/empty-state';
import { ConfirmDialog } from '@/components/admin/shared/confirm-dialog';
import { UserDetailModal } from '@/components/admin/users/user-detail-modal';
import { createClient } from '@/lib/supabase/client';

interface UserSchool {
  id: string;
  name: string;
  abbreviation: string;
  conference: string | null;
}

interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
  status: string;
  dynasty_tier: string | null;
  xp: number | null;
  level: number | null;
  post_count: number | null;
  follower_count: number | null;
  following_count: number | null;
  touchdown_count: number | null;
  fumble_count: number | null;
  created_at: string;
  last_active_at: string | null;
  school: UserSchool | null;
}

interface UsersClientProps {
  users: UserRow[];
  total: number;
}

function getRoleBadgeVariant(role: string): 'purple' | 'warning' | 'muted' {
  switch (role) {
    case 'ADMIN':
      return 'purple';
    case 'MODERATOR':
      return 'warning';
    default:
      return 'muted';
  }
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'muted' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'SUSPENDED':
      return 'warning';
    case 'BANNED':
      return 'danger';
    default:
      return 'muted';
  }
}

function formatTier(tier: string | null): string {
  if (!tier) return '-';
  return tier
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function UsersClient({ users, total }: UsersClientProps) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'default';
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    title: '',
    message: '',
    variant: 'default',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  // XP award state
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [xpUserId, setXpUserId] = useState<string | null>(null);
  const [xpAmount, setXpAmount] = useState('100');
  const [xpReason, setXpReason] = useState('');

  // Suspend duration state
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendUserId, setSuspendUserId] = useState<string | null>(null);
  const [suspendDuration, setSuspendDuration] = useState('24');
  const [suspendReason, setSuspendReason] = useState('');

  const handleRowClick = useCallback((user: UserRow) => {
    setSelectedUser(user);
    setDetailOpen(true);
  }, []);

  const closeDropdown = useCallback(() => {
    setOpenDropdown(null);
  }, []);

  const toggleDropdown = useCallback((userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdown((prev) => (prev === userId ? null : userId));
  }, []);

  async function handleRoleChange(userId: string, newRole: string) {
    closeDropdown();
    setActionLoading(true);
    try {
      const supabase = createClient();
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  function promptRoleChange(userId: string, targetRole: string) {
    closeDropdown();
    const labels: Record<string, string> = {
      ADMIN: 'Promote to Admin',
      MODERATOR: 'Promote to Moderator',
      USER: 'Demote to User',
    };
    setConfirmConfig({
      title: labels[targetRole] ?? `Change Role to ${targetRole}`,
      message:
        targetRole === 'ADMIN'
          ? 'This grants full administrative privileges. Are you sure?'
          : `Change this user's role to ${targetRole}?`,
      variant: targetRole === 'ADMIN' ? 'warning' : 'default',
      confirmLabel: labels[targetRole] ?? 'Change Role',
      onConfirm: () => {
        setConfirmOpen(false);
        handleRoleChange(userId, targetRole);
      },
    });
    setConfirmOpen(true);
  }

  function promptSuspend(userId: string) {
    closeDropdown();
    setSuspendUserId(userId);
    setSuspendDuration('24');
    setSuspendReason('');
    setSuspendModalOpen(true);
  }

  async function executeSuspend() {
    if (!suspendUserId) return;
    setSuspendModalOpen(false);
    setActionLoading(true);
    try {
      const hours = parseInt(suspendDuration, 10) || 24;
      const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      const supabase = createClient();
      await supabase
        .from('profiles')
        .update({
          status: 'SUSPENDED',
          banned_until: until,
          ban_reason: suspendReason || 'Suspended by admin',
        })
        .eq('id', suspendUserId);
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  function promptBan(userId: string) {
    closeDropdown();
    setConfirmConfig({
      title: 'Ban User',
      message:
        'This will permanently ban the user from the platform. They will not be able to access any features. This action can be reversed later.',
      variant: 'danger',
      confirmLabel: 'Ban User',
      onConfirm: async () => {
        setConfirmOpen(false);
        setActionLoading(true);
        try {
          const supabase = createClient();
          await supabase
            .from('profiles')
            .update({ status: 'BANNED', ban_reason: 'Banned by admin' })
            .eq('id', userId);
          router.refresh();
        } finally {
          setActionLoading(false);
        }
      },
    });
    setConfirmOpen(true);
  }

  function promptRestore(userId: string) {
    closeDropdown();
    setConfirmConfig({
      title: 'Restore User',
      message: 'This will restore the user to active status, removing any suspension or ban.',
      variant: 'default',
      confirmLabel: 'Restore User',
      onConfirm: async () => {
        setConfirmOpen(false);
        setActionLoading(true);
        try {
          const supabase = createClient();
          await supabase
            .from('profiles')
            .update({
              status: 'ACTIVE',
              ban_reason: null,
              banned_until: null,
              banned_by: null,
            })
            .eq('id', userId);
          router.refresh();
        } finally {
          setActionLoading(false);
        }
      },
    });
    setConfirmOpen(true);
  }

  function promptAwardXP(userId: string) {
    closeDropdown();
    setXpUserId(userId);
    setXpAmount('100');
    setXpReason('');
    setXpModalOpen(true);
  }

  async function executeAwardXP() {
    if (!xpUserId) return;
    setXpModalOpen(false);
    setActionLoading(true);
    try {
      const amount = parseInt(xpAmount, 10) || 100;
      const supabase = createClient();
      await supabase.from('xp_log').insert({
        user_id: xpUserId,
        xp_amount: amount,
        source: 'ADMIN_AWARD',
        description: xpReason || 'Awarded by admin',
      });
      await supabase.rpc('increment_xp', { user_id: xpUserId, amount });
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No users found"
        description="Try adjusting your search or filter criteria."
      />
    );
  }

  return (
    <>
      <div className="text-sm text-[var(--admin-text-muted)]">
        Showing {users.length} of {total} users
      </div>

      <div className="admin-card overflow-hidden overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>School</th>
              <th>Role</th>
              <th>Status</th>
              <th>Tier</th>
              <th>XP</th>
              <th>Level</th>
              <th>Posts</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="cursor-pointer hover:bg-[var(--admin-surface-raised)]/50 transition-colors"
                onClick={() => handleRowClick(user)}
              >
                <td>
                  <div>
                    <p className="font-medium text-[var(--admin-text)]">
                      {user.display_name ?? user.username}
                    </p>
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      @{user.username}
                    </p>
                  </div>
                </td>
                <td className="text-sm text-[var(--admin-text-secondary)]">
                  {user.school?.abbreviation ?? '-'}
                </td>
                <td>
                  <StatusBadge
                    status={user.role}
                    variant={getRoleBadgeVariant(user.role)}
                  />
                </td>
                <td>
                  <StatusBadge
                    status={user.status}
                    variant={getStatusBadgeVariant(user.status)}
                  />
                </td>
                <td className="text-xs uppercase text-[var(--admin-text-muted)]">
                  {formatTier(user.dynasty_tier)}
                </td>
                <td className="text-sm">{user.xp ?? 0}</td>
                <td className="text-sm">{user.level ?? 0}</td>
                <td className="text-sm">{user.post_count ?? 0}</td>
                <td className="text-xs text-[var(--admin-text-muted)]">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div
                    className="relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => toggleDropdown(user.id, e)}
                      disabled={actionLoading}
                      className="rounded-md p-1.5 text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-raised)] hover:text-[var(--admin-text)] transition-colors"
                      style={{
                        opacity: actionLoading ? 0.5 : 1,
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {openDropdown === user.id && (
                      <>
                        {/* Backdrop to close dropdown */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={closeDropdown}
                        />
                        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] py-1 shadow-xl">
                          {/* Role changes */}
                          <div className="px-3 py-1.5 text-xs font-semibold uppercase text-[var(--admin-text-muted)]">
                            Role
                          </div>
                          {user.role !== 'ADMIN' && (
                            <button
                              onClick={() => promptRoleChange(user.id, 'ADMIN')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-raised)] hover:text-[var(--admin-text)]"
                            >
                              <ShieldCheck className="h-4 w-4 text-purple-400" />
                              Promote to Admin
                            </button>
                          )}
                          {user.role !== 'MODERATOR' && (
                            <button
                              onClick={() => promptRoleChange(user.id, 'MODERATOR')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-raised)] hover:text-[var(--admin-text)]"
                            >
                              <ShieldAlert className="h-4 w-4 text-[var(--admin-warning)]" />
                              {user.role === 'ADMIN' ? 'Demote to Moderator' : 'Promote to Moderator'}
                            </button>
                          )}
                          {user.role !== 'USER' && (
                            <button
                              onClick={() => promptRoleChange(user.id, 'USER')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-raised)] hover:text-[var(--admin-text)]"
                            >
                              <ChevronDown className="h-4 w-4" />
                              Demote to User
                            </button>
                          )}

                          <div className="my-1 border-t border-[var(--admin-border)]" />

                          {/* Status actions */}
                          <div className="px-3 py-1.5 text-xs font-semibold uppercase text-[var(--admin-text-muted)]">
                            Status
                          </div>
                          {user.status === 'ACTIVE' && (
                            <button
                              onClick={() => promptSuspend(user.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--admin-warning)] hover:bg-[var(--admin-surface-raised)]"
                            >
                              <ShieldAlert className="h-4 w-4" />
                              Suspend
                            </button>
                          )}
                          {user.status !== 'BANNED' && (
                            <button
                              onClick={() => promptBan(user.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--admin-error)] hover:bg-[var(--admin-surface-raised)]"
                            >
                              <Ban className="h-4 w-4" />
                              Ban
                            </button>
                          )}
                          {user.status !== 'ACTIVE' && (
                            <button
                              onClick={() => promptRestore(user.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--admin-success)] hover:bg-[var(--admin-surface-raised)]"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restore
                            </button>
                          )}

                          <div className="my-1 border-t border-[var(--admin-border)]" />

                          {/* XP */}
                          <button
                            onClick={() => promptAwardXP(user.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-raised)] hover:text-[var(--admin-text)]"
                          >
                            <Star className="h-4 w-4 text-[var(--admin-warning)]" />
                            Award XP
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        confirmLabel={confirmConfig.confirmLabel}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Suspend duration modal */}
      {suspendModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSuspendModalOpen(false)}
        >
          <div
            className="admin-card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--admin-text)]">Suspend User</h3>
            <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
              Choose suspension duration and provide a reason.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">
                  Duration (hours)
                </label>
                <select
                  value={suspendDuration}
                  onChange={(e) => setSuspendDuration(e.target.value)}
                  className="admin-select w-full"
                >
                  <option value="1">1 hour</option>
                  <option value="6">6 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                  <option value="72">3 days</option>
                  <option value="168">7 days</option>
                  <option value="720">30 days</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Reason for suspension..."
                  className="admin-input w-full"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSuspendModalOpen(false)}
                className="rounded-md border border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-raised)]"
              >
                Cancel
              </button>
              <button
                onClick={executeSuspend}
                className="rounded-md bg-[var(--admin-warning)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* XP award modal */}
      {xpModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setXpModalOpen(false)}
        >
          <div
            className="admin-card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--admin-text)]">Award XP</h3>
            <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
              Grant bonus XP to this user.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={xpAmount}
                  onChange={(e) => setXpAmount(e.target.value)}
                  min="1"
                  max="10000"
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={xpReason}
                  onChange={(e) => setXpReason(e.target.value)}
                  placeholder="Reason for awarding XP..."
                  className="admin-input w-full"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setXpModalOpen(false)}
                className="rounded-md border border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-raised)]"
              >
                Cancel
              </button>
              <button
                onClick={executeAwardXP}
                className="rounded-md bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-accent-light)]"
              >
                Award XP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User detail modal */}
      <UserDetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onRefresh={() => router.refresh()}
      />
    </>
  );
}
