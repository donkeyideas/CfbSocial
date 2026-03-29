'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { createClient } from '@/lib/supabase/client';

interface NotificationActor {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Notification {
  id: string;
  type: string;
  recipient_id: string;
  actor_id: string | null;
  post_id: string | null;
  challenge_id: string | null;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown> | null;
  actor: NotificationActor | null;
}

interface NotificationsClientProps {
  notifications: Notification[];
  userId: string;
}

export default function NotificationsClient({
  notifications,
  userId,
}: NotificationsClientProps) {
  const router = useRouter();
  const [markingAll, setMarkingAll] = useState(false);

  const hasUnread = notifications.some((n) => !n.is_read);

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      const supabase = createClient();
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);
      router.refresh();
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleMarkOneRead(notificationId: string) {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    router.refresh();
  }

  return (
    <div>
      {/* Mark all read bar */}
      {hasUnread && (
        <div
          className="content-card"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '8px 16px',
            marginBottom: 4,
          }}
        >
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.8rem',
              color: 'var(--crimson)',
              background: 'none',
              border: 'none',
              cursor: markingAll ? 'default' : 'pointer',
              opacity: markingAll ? 0.5 : 1,
              textDecoration: 'underline',
              padding: '4px 0',
            }}
          >
            {markingAll ? 'Marking...' : 'Mark all as read'}
          </button>
        </div>
      )}

      {/* Notification list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {notifications.map((notification) => (
          <div key={notification.id} className="content-card">
            <NotificationCard
              id={notification.id}
              type={notification.type}
              actorUsername={notification.actor?.username}
              actorDisplayName={notification.actor?.display_name}
              actorAvatarUrl={notification.actor?.avatar_url}
              postId={notification.post_id}
              challengeId={notification.challenge_id}
              isRead={notification.is_read}
              createdAt={notification.created_at}
              data={notification.data}
              onMarkRead={handleMarkOneRead}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
