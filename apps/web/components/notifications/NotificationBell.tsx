'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRealtimeNotifications } from '@cfb-social/api';
import { NotificationCard } from './NotificationCard';

interface NotificationItem {
  id: string;
  type: string;
  actor_username?: string | null;
  actor_display_name?: string | null;
  actor_avatar_url?: string | null;
  post_id?: string | null;
  challenge_id?: string | null;
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown> | null;
}

export function NotificationBell() {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const { notifications: realtimeNotifs, unreadCount: realtimeUnread } = useRealtimeNotifications(userId);

  // Load initial unread count once userId is available
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .then(({ count }) => {
        setUnreadCount(count ?? 0);
      });
  }, [userId]);

  // Track realtime notifications — use ref to compute delta so count doesn't inflate
  const lastRealtimeUnread = useRef(0);
  useEffect(() => {
    const delta = realtimeUnread - lastRealtimeUnread.current;
    if (delta > 0) {
      setUnreadCount((prev) => prev + delta);
    }
    lastRealtimeUnread.current = realtimeUnread;
  }, [realtimeUnread]);

  // Prepend realtime notifications to list when dropdown is open
  useEffect(() => {
    if (realtimeNotifs.length > 0 && open) {
      const mapped: NotificationItem[] = realtimeNotifs.map((n) => ({
        id: n.id,
        type: n.type,
        post_id: n.post_id,
        is_read: n.is_read,
        created_at: n.created_at,
        data: n.data,
      }));
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newOnes = mapped.filter((m) => !existingIds.has(m.id));
        return [...newOnes, ...prev];
      });
    }
  }, [realtimeNotifs, open]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('click', handleClickOutside, true);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [open]);

  // Fetch notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const supabase = createClient();

    const { data } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        post_id,
        challenge_id,
        is_read,
        created_at,
        data,
        actor:profiles!notifications_actor_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const mapped: NotificationItem[] = data.map((row: Record<string, unknown>) => {
        const actor = row.actor as Record<string, unknown> | null;
        return {
          id: row.id as string,
          type: row.type as string,
          post_id: row.post_id as string | null,
          challenge_id: row.challenge_id as string | null,
          is_read: row.is_read as boolean,
          created_at: row.created_at as string,
          data: row.data as Record<string, unknown> | null,
          actor_username: actor?.username as string | null ?? null,
          actor_display_name: actor?.display_name as string | null ?? null,
          actor_avatar_url: actor?.avatar_url as string | null ?? null,
        };
      });
      setNotifications(mapped);
    }

    setLoading(false);
  }, [userId]);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchNotifications();
    }
  }

  async function handleMarkAllRead() {
    if (!userId) return;

    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleMarkRead(notifId: string) {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId);

    setUnreadCount((prev) => Math.max(0, prev - 1));
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
  }

  return (
    <div ref={bellRef} style={{ position: 'relative' }}>
      <button
        className="masthead-btn"
        aria-label="Notifications"
        onClick={handleToggle}
        style={{ position: 'relative' }}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: 'var(--crimson)',
              color: '#fff',
              fontSize: '10px',
              fontFamily: 'var(--sans)',
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            width: 360,
            maxHeight: 480,
            overflowY: 'auto',
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderRadius: 2,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 100,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--ink)',
              }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--crimson)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          {loading ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                fontFamily: 'var(--sans)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
              }}
            >
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                fontFamily: 'var(--sans)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
              }}
            >
              No notifications yet
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <div key={n.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <NotificationCard
                    id={n.id}
                    type={n.type}
                    actorUsername={n.actor_username}
                    actorDisplayName={n.actor_display_name}
                    actorAvatarUrl={n.actor_avatar_url}
                    postId={n.post_id}
                    challengeId={n.challenge_id}
                    isRead={n.is_read}
                    createdAt={n.created_at}
                    data={n.data}
                    onMarkRead={handleMarkRead}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border)',
              textAlign: 'center',
            }}
          >
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--crimson)',
                textDecoration: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
