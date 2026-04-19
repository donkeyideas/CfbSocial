'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Ban,
  RotateCcw,
  Star,
  Trash2,
  Calendar,
  Mail,
  User,
  School,
  Trophy,
  Zap,
  FileText,
  AlertTriangle,
  Clock,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { DetailModal } from '@/components/admin/shared/detail-modal';
import { TabNav } from '@/components/admin/shared/tab-nav';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import { ConfirmDialog } from '@/components/admin/shared/confirm-dialog';
import { createClient } from '@/lib/supabase/client';

interface UserBasic {
  id: string;
  username: string;
  display_name: string | null;
  email?: string;
  auth_provider?: string;
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
  school: {
    id: string;
    name: string;
    abbreviation: string;
    conference: string | null;
  } | null;
}

interface ProfileDetail {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  auth_provider: string | null;
  last_sign_in_at: string | null;
  avatar_url: string | null;
  bio: string | null;
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
  correct_predictions: number | null;
  challenge_wins: number | null;
  challenge_losses: number | null;
  created_at: string;
  last_active_at: string | null;
  ban_reason: string | null;
  banned_until: string | null;
  school: {
    id: string;
    name: string;
    abbreviation: string;
    conference: string | null;
    primary_color: string | null;
    logo_url: string | null;
  } | null;
}

interface PostItem {
  id: string;
  content: string;
  post_type: string;
  status: string;
  created_at: string;
  touchdown_count: number | null;
  fumble_count: number | null;
}

interface ModerationEvent {
  id: string;
  event_type: string;
  action_taken: string | null;
  severity: string | null;
  ai_labels: Record<string, unknown> | null;
  created_at: string;
}

interface Report {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: { username: string } | null;
}

interface Appeal {
  id: string;
  reason: string;
  status: string;
  created_at: string;
}

interface XpLogEntry {
  id: string;
  xp_amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

interface Achievement {
  id: string;
  unlocked_at: string;
  achievement: {
    id: string;
    name: string;
    description: string | null;
    xp_reward: number | null;
    icon: string | null;
  } | null;
}

interface UserDetailData {
  profile: ProfileDetail | null;
  posts: PostItem[];
  moderationEvents: ModerationEvent[];
  reports: Report[];
  appeals: Appeal[];
  xpLog: XpLogEntry[];
  achievements: Achievement[];
}

interface UserDetailModalProps {
  open: boolean;
  onClose: () => void;
  user: UserBasic | null;
  onRefresh: () => void;
}

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'activity', label: 'Activity' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'dynasty', label: 'Dynasty' },
];

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(displayName: string | null, username: string): string {
  const name = displayName ?? username;
  const parts = name.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getPostTypeBadge(postType: string): { label: string; variant: 'info' | 'warning' | 'purple' | 'muted' } {
  switch (postType) {
    case 'TAKE':
      return { label: 'Take', variant: 'info' };
    case 'PREDICTION':
      return { label: 'Prediction', variant: 'warning' };
    case 'CHALLENGE':
      return { label: 'Challenge', variant: 'purple' };
    default:
      return { label: postType, variant: 'muted' };
  }
}

function getSeverityBadge(severity: string | null): { variant: 'danger' | 'warning' | 'info' | 'muted' } {
  switch (severity?.toUpperCase()) {
    case 'HIGH':
    case 'CRITICAL':
      return { variant: 'danger' };
    case 'MEDIUM':
      return { variant: 'warning' };
    case 'LOW':
      return { variant: 'info' };
    default:
      return { variant: 'muted' };
  }
}

export function UserDetailModal({ open, onClose, user, onRefresh }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [detail, setDetail] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(false);
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

  // XP award modal
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [xpAmount, setXpAmount] = useState('100');
  const [xpReason, setXpReason] = useState('');

  // Suspend modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendDuration, setSuspendDuration] = useState('24');
  const [suspendReason, setSuspendReason] = useState('');

  // Role change
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState('USER');

  const fetchDetail = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && user) {
      setActiveTab('profile');
      setDetail(null);
      fetchDetail(user.id);
    }
  }, [open, user, fetchDetail]);

  const profile = detail?.profile;
  const userId = user?.id;

  // Build tabs with counts
  const tabsWithCounts = TABS.map((tab) => {
    if (!detail) return tab;
    switch (tab.id) {
      case 'activity':
        return { ...tab, count: detail.posts.length };
      case 'moderation':
        return { ...tab, count: detail.moderationEvents.length + detail.reports.length + detail.appeals.length };
      case 'dynasty':
        return { ...tab, count: detail.achievements.length };
      default:
        return tab;
    }
  });

  // --- Action handlers ---

  async function handleRoleChange() {
    if (!userId) return;
    setRoleModalOpen(false);
    setActionLoading(true);
    try {
      const supabase = createClient();
      await supabase.from('profiles').update({ role: targetRole }).eq('id', userId);
      onRefresh();
      fetchDetail(userId);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSuspend() {
    if (!userId) return;
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
        .eq('id', userId);
      onRefresh();
      fetchDetail(userId);
    } finally {
      setActionLoading(false);
    }
  }

  function promptBan() {
    setConfirmConfig({
      title: 'Ban User',
      message: 'This will permanently ban the user. They will lose access to all platform features. This can be reversed later.',
      variant: 'danger',
      confirmLabel: 'Ban User',
      onConfirm: async () => {
        if (!userId) return;
        setConfirmOpen(false);
        setActionLoading(true);
        try {
          const supabase = createClient();
          await supabase.from('profiles').update({ status: 'BANNED', ban_reason: 'Banned by admin' }).eq('id', userId);
          onRefresh();
          fetchDetail(userId);
        } finally {
          setActionLoading(false);
        }
      },
    });
    setConfirmOpen(true);
  }

  function promptRestore() {
    setConfirmConfig({
      title: 'Restore User',
      message: 'This will restore the user to active status, removing any suspension or ban.',
      variant: 'default',
      confirmLabel: 'Restore User',
      onConfirm: async () => {
        if (!userId) return;
        setConfirmOpen(false);
        setActionLoading(true);
        try {
          const supabase = createClient();
          await supabase
            .from('profiles')
            .update({ status: 'ACTIVE', ban_reason: null, banned_until: null, banned_by: null })
            .eq('id', userId);
          onRefresh();
          fetchDetail(userId);
        } finally {
          setActionLoading(false);
        }
      },
    });
    setConfirmOpen(true);
  }

  async function handleAwardXP() {
    if (!userId) return;
    setXpModalOpen(false);
    setActionLoading(true);
    try {
      const amount = parseInt(xpAmount, 10) || 100;
      const supabase = createClient();
      await supabase.from('xp_log').insert({
        user_id: userId,
        xp_amount: amount,
        source: 'ADMIN_AWARD',
        description: xpReason || 'Awarded by admin',
      });
      await supabase.rpc('increment_xp', { user_id: userId, amount });
      onRefresh();
      fetchDetail(userId);
    } finally {
      setActionLoading(false);
    }
  }

  function promptDelete() {
    setConfirmConfig({
      title: 'Delete User',
      message: 'This will permanently delete the user account and all associated data. This action CANNOT be undone.',
      variant: 'danger',
      confirmLabel: 'Delete Permanently',
      onConfirm: async () => {
        if (!userId) return;
        setConfirmOpen(false);
        setActionLoading(true);
        try {
          const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
          if (res.ok) {
            onClose();
            onRefresh();
          }
        } finally {
          setActionLoading(false);
        }
      },
    });
    setConfirmOpen(true);
  }

  // --- Tab content renderers ---

  function renderProfileTab() {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-5 w-full" />
          ))}
        </div>
      );
    }

    const p = profile ?? user;
    if (!p) return null;

    const displayName = ('display_name' in p ? p.display_name : null) ?? ('username' in p ? p.username : '');
    const username = 'username' in p ? p.username : '';

    return (
      <div className="space-y-6">
        {/* Avatar + basic info */}
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: profile?.school?.primary_color ?? 'var(--admin-accent)' }}
          >
            {getInitials(displayName as string | null, username)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[var(--admin-text)]">
                {displayName}
              </h3>
              <StatusBadge status={p.role} variant={getRoleBadgeVariant(p.role)} />
            </div>
            <p className="text-sm text-[var(--admin-text-muted)]">@{username}</p>
            {(profile?.email || user?.email) && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-[var(--admin-text-secondary)]">
                <Mail className="h-3.5 w-3.5" />
                {profile?.email || user?.email}
                {(profile?.auth_provider ?? user?.auth_provider) === 'google' && (
                  <svg className="ml-1 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-label="Google">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                {(profile?.auth_provider ?? user?.auth_provider) === 'apple' && (
                  <svg className="ml-1 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Apple">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                )}
                {(() => {
                  const prov = profile?.auth_provider ?? user?.auth_provider;
                  return prov && prov !== 'google' && prov !== 'apple' ? (
                    <span className="ml-1 text-[10px] font-semibold uppercase text-[var(--admin-text-muted)]">
                      {prov}
                    </span>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Stat cards -- like Optic Rank's Projects/Keywords/Site Audits row */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <StatCard label="POSTS" value={p.post_count ?? 0} />
          <StatCard label="TOUCHDOWNS" value={('touchdown_count' in p ? p.touchdown_count : null) ?? 0} />
          <StatCard label="FUMBLES" value={('fumble_count' in p ? p.fumble_count : null) ?? 0} />
          <StatCard label="FOLLOWERS" value={('follower_count' in p ? p.follower_count : null) ?? 0} />
          <StatCard label="FOLLOWING" value={('following_count' in p ? p.following_count : null) ?? 0} />
          <StatCard label="PREDICTIONS" value={profile?.correct_predictions ?? 0} />
        </div>

        {/* School section */}
        {p.school && (
          <div className="rounded-lg border border-[var(--admin-border)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--admin-text-muted)] mb-3">
              <School className="h-3.5 w-3.5" />
              SCHOOL
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--admin-text)]">{p.school.name}</p>
                <p className="text-sm text-[var(--admin-text-muted)]">{p.school.conference ?? '-'}</p>
              </div>
              {profile?.school?.primary_color && (
                <div
                  className="h-8 w-8 rounded-full border-2 border-[var(--admin-border)]"
                  style={{ backgroundColor: profile.school.primary_color }}
                />
              )}
            </div>
          </div>
        )}

        {/* Dynasty section */}
        <div className="rounded-lg border border-[var(--admin-border)] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--admin-text-muted)] mb-3">
            <Trophy className="h-3.5 w-3.5" />
            DYNASTY
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--admin-text-muted)]">Tier</p>
              <p className="font-semibold text-[var(--admin-text)]">{formatTier(p.dynasty_tier)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--admin-text-muted)]">Level</p>
              <p className="font-semibold text-[var(--admin-text)]">{p.level ?? 1}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--admin-text-muted)]">XP</p>
              <p className="font-semibold text-[var(--admin-text)]">{(p.xp ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--admin-text-muted)]">Challenges W/L</p>
              <p className="font-semibold text-[var(--admin-text)]">
                {profile?.challenge_wins ?? 0} / {profile?.challenge_losses ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Account Info + Status -- two-column like Optic Rank */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--admin-border)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--admin-text-muted)] mb-3">
              <User className="h-3.5 w-3.5" />
              ACCOUNT INFO
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--admin-text-secondary)]">Role</span>
                <span className="text-sm font-semibold text-[var(--admin-text)]">{p.role.toLowerCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--admin-text-secondary)]">Status</span>
                <StatusBadge status={p.status} variant={getStatusBadgeVariant(p.status)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--admin-text-secondary)]">Created</span>
                <span className="text-sm font-semibold text-[var(--admin-text)]">{formatDate(p.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--admin-text-secondary)]">Last Active</span>
                <span className="text-sm font-semibold text-[var(--admin-text)]">{formatDate(p.last_active_at)}</span>
              </div>
              {profile?.last_sign_in_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--admin-text-secondary)]">Last Sign In</span>
                  <span className="text-sm font-semibold text-[var(--admin-text)]">{formatDate(profile.last_sign_in_at)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--admin-border)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--admin-text-muted)] mb-3">
              <FileText className="h-3.5 w-3.5" />
              BIO
            </div>
            {profile?.bio ? (
              <p className="text-sm text-[var(--admin-text)]">{profile.bio}</p>
            ) : (
              <p className="text-sm text-[var(--admin-text-muted)]">No bio set.</p>
            )}
          </div>
        </div>

        {/* Ban info */}
        {profile?.ban_reason && (
          <div className="rounded-lg border border-[var(--admin-error)]/30 bg-[var(--admin-error)]/10 p-3">
            <h4 className="text-sm font-semibold text-[var(--admin-error)]">Ban/Suspension Info</h4>
            <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
              Reason: {profile.ban_reason}
            </p>
            {profile.banned_until && (
              <p className="text-sm text-[var(--admin-text-muted)]">
                Until: {formatDateTime(profile.banned_until)}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderActivityTab() {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      );
    }

    if (!detail || detail.posts.length === 0) {
      return (
        <div className="py-8 text-center text-[var(--admin-text-muted)]">
          No recent posts found.
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {detail.posts.map((post) => {
          const badge = getPostTypeBadge(post.post_type);
          return (
            <div
              key={post.id}
              className="rounded-lg border border-[var(--admin-border)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-[var(--admin-text)] line-clamp-2 flex-1">
                  {post.content}
                </p>
                <StatusBadge status={badge.label} variant={badge.variant} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-[var(--admin-text-muted)]">
                <span>{formatDateTime(post.created_at)}</span>
                {post.status !== 'PUBLISHED' && (
                  <StatusBadge
                    status={post.status}
                    variant={post.status === 'REMOVED' ? 'danger' : 'muted'}
                  />
                )}
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" /> {post.touchdown_count ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsDown className="h-3 w-3" /> {post.fumble_count ?? 0}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderModerationTab() {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-14 w-full" />
          ))}
        </div>
      );
    }

    const events = detail?.moderationEvents ?? [];
    const reports = detail?.reports ?? [];
    const appeals = detail?.appeals ?? [];
    const allItems = [
      ...events.map((e) => ({ type: 'event' as const, data: e, date: e.created_at })),
      ...reports.map((r) => ({ type: 'report' as const, data: r, date: r.created_at })),
      ...appeals.map((a) => ({ type: 'appeal' as const, data: a, date: a.created_at })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (allItems.length === 0) {
      return (
        <div className="py-8 text-center text-[var(--admin-text-muted)]">
          No moderation history.
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {allItems.map((item, idx) => {
          if (item.type === 'event') {
            const ev = item.data as ModerationEvent;
            const sev = getSeverityBadge(ev.severity);
            return (
              <div
                key={`ev-${ev.id ?? idx}`}
                className="rounded-lg border border-[var(--admin-border)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[var(--admin-warning)]" />
                    <span className="text-sm font-medium text-[var(--admin-text)]">
                      {ev.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.severity && (
                      <StatusBadge status={ev.severity} variant={sev.variant} />
                    )}
                    {ev.action_taken && (
                      <StatusBadge status={ev.action_taken} variant="muted" />
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  {formatDateTime(ev.created_at)}
                </p>
              </div>
            );
          }

          if (item.type === 'report') {
            const rpt = item.data as Report;
            return (
              <div
                key={`rpt-${rpt.id ?? idx}`}
                className="rounded-lg border border-[var(--admin-border)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[var(--admin-error)]" />
                    <span className="text-sm font-medium text-[var(--admin-text)]">
                      Report
                    </span>
                  </div>
                  <StatusBadge
                    status={rpt.status}
                    variant={
                      rpt.status === 'PENDING'
                        ? 'warning'
                        : rpt.status === 'ACTIONED'
                          ? 'danger'
                          : rpt.status === 'DISMISSED'
                            ? 'muted'
                            : 'info'
                    }
                  />
                </div>
                <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
                  {rpt.reason.replace(/_/g, ' ')}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
                  <span>{formatDateTime(rpt.created_at)}</span>
                  {rpt.reporter?.username && (
                    <span>by @{rpt.reporter.username}</span>
                  )}
                </div>
              </div>
            );
          }

          // Appeal
          const apl = item.data as Appeal;
          return (
            <div
              key={`apl-${apl.id ?? idx}`}
              className="rounded-lg border border-[var(--admin-border)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-[var(--admin-info)]" />
                  <span className="text-sm font-medium text-[var(--admin-text)]">
                    Appeal
                  </span>
                </div>
                <StatusBadge
                  status={apl.status}
                  variant={
                    apl.status === 'PENDING'
                      ? 'warning'
                      : apl.status === 'APPROVED'
                        ? 'success'
                        : 'danger'
                  }
                />
              </div>
              <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
                {apl.reason.replace(/_/g, ' ')}
              </p>
              <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                {formatDateTime(apl.created_at)}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  function renderDynastyTab() {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Achievements */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--admin-text)] mb-3">
            Achievements ({detail?.achievements.length ?? 0})
          </h4>
          {(!detail?.achievements || detail.achievements.length === 0) ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No achievements unlocked.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
              {detail.achievements.map((ach, idx) => (
                <div
                  key={ach.id ?? idx}
                  className="flex items-center gap-3 rounded-lg border border-[var(--admin-border)] p-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-accent)]/20">
                    <Trophy className="h-4 w-4 text-[var(--admin-accent-light)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--admin-text)]">
                      {ach.achievement?.name ?? 'Achievement'}
                    </p>
                    {ach.achievement?.description && (
                      <p className="text-xs text-[var(--admin-text-muted)] truncate">
                        {ach.achievement.description}
                      </p>
                    )}
                  </div>
                  {ach.achievement?.xp_reward && (
                    <span className="text-xs font-semibold text-[var(--admin-warning)]">
                      +{ach.achievement.xp_reward} XP
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* XP Log */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--admin-text)] mb-3">
            XP Log ({detail?.xpLog.length ?? 0})
          </h4>
          {(!detail?.xpLog || detail.xpLog.length === 0) ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No XP history.</p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {detail.xpLog.map((entry, idx) => (
                <div
                  key={entry.id ?? idx}
                  className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--admin-text)]">
                      {entry.description ?? entry.source.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      {formatDateTime(entry.created_at)} - {entry.source.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      entry.xp_amount >= 0
                        ? 'text-[var(--admin-success)]'
                        : 'text-[var(--admin-error)]'
                    }`}
                  >
                    {entry.xp_amount >= 0 ? '+' : ''}{entry.xp_amount} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <DetailModal
        open={open}
        title={user ? `${user.display_name ?? user.username}` : 'User Detail'}
        onClose={onClose}
        width="xl"
      >
        {/* Tab navigation */}
        <TabNav tabs={tabsWithCounts} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        <div className="mt-4">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'activity' && renderActivityTab()}
          {activeTab === 'moderation' && renderModerationTab()}
          {activeTab === 'dynasty' && renderDynastyTab()}
        </div>

        {/* Admin action buttons */}
        <div className="mt-6 border-t border-[var(--admin-border)] pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setTargetRole(
                  user?.role === 'ADMIN'
                    ? 'USER'
                    : user?.role === 'MODERATOR'
                      ? 'ADMIN'
                      : 'MODERATOR',
                );
                setRoleModalOpen(true);
              }}
              disabled={actionLoading}
              className="btn-admin-outline btn-admin-sm flex items-center gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Change Role
            </button>

            {user?.status === 'ACTIVE' && (
              <button
                onClick={() => {
                  setSuspendDuration('24');
                  setSuspendReason('');
                  setSuspendModalOpen(true);
                }}
                disabled={actionLoading}
                className="btn-admin-outline btn-admin-sm flex items-center gap-1.5 text-[var(--admin-warning)] border-[var(--admin-warning)]/30 hover:bg-[var(--admin-warning)]/10"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Suspend
              </button>
            )}

            {user?.status !== 'BANNED' && (
              <button
                onClick={promptBan}
                disabled={actionLoading}
                className="btn-admin-danger btn-admin-sm flex items-center gap-1.5"
              >
                <Ban className="h-3.5 w-3.5" />
                Ban
              </button>
            )}

            {user?.status !== 'ACTIVE' && (
              <button
                onClick={promptRestore}
                disabled={actionLoading}
                className="btn-admin-outline btn-admin-sm flex items-center gap-1.5 text-[var(--admin-success)] border-[var(--admin-success)]/30 hover:bg-[var(--admin-success)]/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </button>
            )}

            <button
              onClick={() => {
                setXpAmount('100');
                setXpReason('');
                setXpModalOpen(true);
              }}
              disabled={actionLoading}
              className="btn-admin-outline btn-admin-sm flex items-center gap-1.5"
            >
              <Star className="h-3.5 w-3.5 text-[var(--admin-warning)]" />
              Award XP
            </button>

            <button
              onClick={promptDelete}
              disabled={actionLoading}
              className="btn-admin-danger btn-admin-sm flex items-center gap-1.5 ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      </DetailModal>

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

      {/* Role change modal */}
      {roleModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setRoleModalOpen(false)}
        >
          <div
            className="admin-card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--admin-text)]">Change Role</h3>
            <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
              Select a new role for this user.
            </p>
            <div className="mt-4">
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="admin-select w-full"
              >
                <option value="USER">USER</option>
                <option value="MODERATOR">MODERATOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRoleModalOpen(false)}
                className="rounded-md border border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-raised)]"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                className="rounded-md bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-accent-light)]"
              >
                Change Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend modal */}
      {suspendModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
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
                  Duration
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
                onClick={handleSuspend}
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
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
                onClick={handleAwardXP}
                className="rounded-md bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-accent-light)]"
              >
                Award XP
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Stat card for the top row of user detail
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--admin-border)] p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[var(--admin-text)]">{value.toLocaleString()}</p>
    </div>
  );
}
