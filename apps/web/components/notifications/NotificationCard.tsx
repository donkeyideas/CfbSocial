'use client';

import Link from 'next/link';
import Image from 'next/image';

interface NotificationCardProps {
  id: string;
  type: string;
  actorUsername?: string | null;
  actorDisplayName?: string | null;
  actorAvatarUrl?: string | null;
  postId?: string | null;
  challengeId?: string | null;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown> | null;
  onMarkRead?: (id: string) => void;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getNotificationMessage(type: string, actor: string): string {
  switch (type) {
    case 'FOLLOW':
      return `${actor} started following you`;
    case 'TOUCHDOWN':
      return `${actor} gave your post a Touchdown`;
    case 'FUMBLE':
      return `${actor} fumbled your post`;
    case 'REPLY':
      return `${actor} replied to your post`;
    case 'REPOST':
      return `${actor} reposted your take`;
    case 'MENTION':
      return `${actor} mentioned you`;
    case 'CHALLENGE':
    case 'CHALLENGE_RECEIVED':
      return `${actor} challenged you`;
    case 'CHALLENGE_RESPONSE':
      return `${actor} responded to your challenge`;
    case 'CHALLENGE_WON':
      return 'You won your challenge!';
    case 'CHALLENGE_LOST':
      return 'Your challenge has been decided';
    case 'CHALLENGE_RESULT':
      return 'Your challenge has a result';
    case 'PREDICTION_RESULT':
      return 'Your prediction was resolved';
    case 'ACHIEVEMENT_UNLOCKED':
      return 'Achievement unlocked!';
    case 'LEVEL_UP':
      return 'You leveled up!';
    case 'POST_FLAGGED':
    case 'MODERATION_WARNING':
      return 'Your post was flagged for review';
    case 'MODERATION_APPEAL_RESULT':
      return 'Your appeal has been reviewed';
    case 'SYSTEM':
      return 'New message from CFB Social';
    case 'AGING_TAKE_SURFACED':
      return 'One of your aging takes has been surfaced';
    case 'RECEIPT_VERIFIED':
      return 'Your prediction aged well -- receipt confirmed';
    case 'PORTAL_COMMIT':
      return 'A portal player you claimed has committed';
    default:
      return 'New notification';
  }
}

export function NotificationCard({
  id,
  type,
  actorUsername,
  actorDisplayName,
  actorAvatarUrl,
  postId,
  challengeId,
  isRead,
  createdAt,
  data,
  onMarkRead,
}: NotificationCardProps) {
  const actor = actorDisplayName ?? actorUsername ?? 'Someone';
  const isSystem = type === 'SYSTEM';
  const message = isSystem
    ? (data?.title as string) || (data?.message as string) || getNotificationMessage(type, actor)
    : getNotificationMessage(type, actor);
  const systemBody = isSystem && data?.title && data?.message ? (data.message as string) : null;
  const timeAgo = getTimeAgo(new Date(createdAt));
  const initial = isSystem ? 'G' : (actor[0]?.toUpperCase() ?? '?');

  function handleClick() {
    if (!isRead && onMarkRead) {
      onMarkRead(id);
    }
  }

  const content = (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderLeft: !isRead ? '3px solid var(--crimson)' : '3px solid transparent',
        background: !isRead ? 'var(--surface)' : 'transparent',
        cursor: postId ? 'pointer' : 'default',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = !isRead ? 'var(--surface)' : 'transparent';
      }}
    >
      {/* Actor avatar */}
      {actorAvatarUrl ? (
        <Image
          src={actorAvatarUrl}
          alt={actor}
          width={36}
          height={36}
          style={{
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: isSystem ? 'var(--ink)' : 'var(--crimson)',
            color: isSystem ? 'var(--paper)' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--serif)',
            fontSize: isSystem ? '1.1rem' : '0.9rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
      )}

      {/* Message + time */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.85rem',
            color: 'var(--ink)',
            lineHeight: 1.4,
          }}
        >
          {message}
        </div>
        {systemBody && (
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.78rem',
              color: 'var(--faded-ink)',
              lineHeight: 1.3,
              marginTop: 2,
            }}
          >
            {systemBody}
          </div>
        )}
        <div
          suppressHydrationWarning
          style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            marginTop: 2,
          }}
        >
          {timeAgo}
        </div>
      </div>

      {/* Unread dot */}
      {!isRead && (
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--crimson)',
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );

  const href = challengeId
    ? `/rivalry/challenge/${challengeId}`
    : postId
      ? `/post/${postId}`
      : type === 'FOLLOW' && actorUsername
        ? `/profile/${actorUsername}`
        : null;

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </Link>
    );
  }

  return content;
}
