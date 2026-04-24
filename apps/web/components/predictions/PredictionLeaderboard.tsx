import Link from 'next/link';
import Image from 'next/image';

interface LeaderboardUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  dynasty_tier: string | null;
  correct_predictions: number | null;
  prediction_count: number | null;
}

export function PredictionLeaderboard({ users }: { users: LeaderboardUser[] }) {
  if (users.length === 0) {
    return (
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: 16,
        }}
      >
        No predictions filed yet. Be the first to make your call.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginBottom: 12,
        }}
      >
        Prediction Leaderboard
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map((user, index) => {
          const correct = user.correct_predictions ?? 0;
          const total = user.prediction_count ?? 0;
          const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
          const name = user.display_name ?? user.username;

          return (
            <div
              key={user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: index < 3 ? 'var(--surface)' : 'transparent',
                borderRadius: 2,
              }}
            >
              {/* Rank */}
              <span
                style={{
                  width: 24,
                  fontFamily: 'var(--serif)',
                  fontSize: index < 3 ? '1rem' : '0.85rem',
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
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--cream)',
                  textDecoration: 'none',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={name} width={28} height={28} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
                ) : (
                  name[0]?.toUpperCase()
                )}
              </Link>

              {/* Name */}
              <Link
                href={`/profile/${user.username}`}
                style={{
                  flex: 1,
                  fontFamily: 'var(--sans)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  textDecoration: 'none',
                }}
              >
                @{user.username}
              </Link>

              {/* Stats */}
              <div
                style={{
                  textAlign: 'right',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--success, #2d6a4f)' }}>{correct}</span>
                <span style={{ color: 'var(--text-muted)' }}>/{total}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
