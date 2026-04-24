import Link from 'next/link';
import Image from 'next/image';
import { DynastyTierBadge } from './DynastyTierBadge';

interface LeaderboardUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number | null;
  level: number | null;
  dynasty_tier: string | null;
}

export function DynastyLeaderboard({ users }: { users: LeaderboardUser[] }) {
  if (users.length === 0) {
    return (
      <div style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
        No dynasty rankings yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {users.map((user, index) => {
        const name = user.display_name ?? user.username;
        return (
          <div
            key={user.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: index < 3 ? 'var(--surface)' : 'transparent',
              borderRadius: 2,
              borderLeft: index === 0 ? '3px solid var(--gold)' : index < 3 ? '3px solid var(--crimson)' : 'none',
            }}
          >
            {/* Rank */}
            <span
              style={{
                width: 28,
                fontFamily: 'var(--serif)',
                fontSize: index < 3 ? '1.1rem' : '0.85rem',
                fontWeight: 700,
                color: index === 0 ? 'var(--gold)' : index < 3 ? 'var(--crimson)' : 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              {index + 1}
            </span>

            {/* Avatar */}
            <Link
              href={`/profile/${user.username}`}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--cream)',
                textDecoration: 'none',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {user.avatar_url ? (
                <Image src={user.avatar_url} alt={name} width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
              ) : (
                name[0]?.toUpperCase()
              )}
            </Link>

            {/* Name + Tier */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link
                href={`/profile/${user.username}`}
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  textDecoration: 'none',
                }}
              >
                @{user.username}
              </Link>
              {user.dynasty_tier && (
                <span style={{ marginLeft: 6 }}>
                  <DynastyTierBadge tier={user.dynasty_tier} size="sm" />
                </span>
              )}
            </div>

            {/* Stats */}
            <div style={{ textAlign: 'right', fontFamily: 'var(--sans)', fontSize: '0.75rem', flexShrink: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>
                {(user.xp ?? 0).toLocaleString()} XP
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                Lvl {user.level ?? 1}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
