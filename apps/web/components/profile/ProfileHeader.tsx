'use client';

import Link from 'next/link';
import { FollowButton } from './FollowButton';
import { SignOutButton } from './SignOutButton';
import Image from 'next/image';
import { readableSchoolColor } from '@/lib/utils/color-contrast';

function getIsDark(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

interface ProfileHeaderProps {
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    banner_color?: string | null;
    banner_url?: string | null;
    bio: string | null;
    school?: {
      name: string;
      abbreviation: string;
      primary_color: string;
      secondary_color: string;
    } | null;
    follower_count: number;
    following_count: number;
    dynasty_tier: string | null;
    xp: number;
    level: number;
  };
  isOwnProfile?: boolean;
}

const tierLabels: Record<string, string> = {
  WALK_ON: 'Walk-On',
  STARTER: 'Starter',
  ALL_CONFERENCE: 'All-Conference',
  ALL_AMERICAN: 'All-American',
  HEISMAN: 'Heisman',
  HALL_OF_FAME: 'Hall of Fame',
};

export function ProfileHeader({ user, isOwnProfile = false }: ProfileHeaderProps) {
  const isDark = getIsDark();
  const displayName = user.display_name ?? user.username;
  const initial = displayName[0]?.toUpperCase() ?? '?';
  const adjustedPrimary = user.school?.primary_color
    ? readableSchoolColor(user.school.primary_color, isDark)
    : null;
  const adjustedSecondary = user.school?.secondary_color
    ? readableSchoolColor(user.school.secondary_color, isDark)
    : null;

  return (
    <div className="gridiron-card overflow-hidden">
      {/* Profile banner */}
      <div
        className="relative h-36"
        style={{
          background: user.banner_color
            ? user.banner_color
            : user.school
              ? `linear-gradient(135deg, ${adjustedPrimary}, ${adjustedSecondary})`
              : 'var(--crimson)',
        }}
      >
        {user.banner_url && (
          <Image
            src={user.banner_url}
            alt="Profile banner"
            fill
            className="object-cover"
            unoptimized
          />
        )}
      </div>

      <div className="relative z-10 px-6 pb-6">
        {/* Avatar + Follow button row */}
        <div className="flex items-end justify-between">
          <div className="-mt-12">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={displayName}
                width={96}
                height={96}
                className="h-24 w-24 rounded-full border-4 border-[var(--surface-raised)] object-cover"
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--surface-raised)] font-serif text-3xl font-bold text-[var(--text-inverse)]"
                style={{ backgroundColor: adjustedPrimary ?? 'var(--crimson)' }}
              >
                {initial}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pb-1">
            {isOwnProfile && (
              <>
                <Link
                  href="/settings"
                  style={{
                    padding: '6px 14px',
                    fontFamily: 'var(--sans)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: 2,
                    textDecoration: 'none',
                  }}
                >
                  Edit Profile
                </Link>
                <SignOutButton accentColor={adjustedSecondary ?? undefined} />
              </>
            )}
            {!isOwnProfile && <FollowButton userId={user.id} />}
          </div>
        </div>

        {/* Name */}
        <h1 className="mt-3 font-serif text-2xl font-bold">{displayName}</h1>
        <p className="font-serif text-[var(--text-muted)]">@{user.username}</p>

        {/* School */}
        {user.school && (
          <p className="mt-1 font-serif text-sm font-semibold" style={{ color: adjustedSecondary ?? adjustedPrimary! }}>
            {user.school.name}
          </p>
        )}

        {/* Bio */}
        {user.bio && (
          <p className="mt-3 font-serif text-[var(--text-secondary)]">{user.bio}</p>
        )}

        {/* Stats row */}
        <div className="mt-4 flex items-center gap-6 font-serif text-sm">
          <div>
            <span className="font-bold text-ink">{user.xp?.toLocaleString() ?? 0}</span>{' '}
            <span className="text-[var(--text-muted)]">XP</span>
          </div>
          <div>
            <span className="font-bold text-ink">{user.follower_count ?? 0}</span>{' '}
            <span className="text-[var(--text-muted)]">Followers</span>
          </div>
          <div>
            <span className="font-bold text-ink">{user.following_count ?? 0}</span>{' '}
            <span className="text-[var(--text-muted)]">Following</span>
          </div>
          {user.dynasty_tier && user.dynasty_tier !== 'WALK_ON' && (
            <span className="ml-auto rounded-full bg-[var(--secondary)]/20 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
              {tierLabels[user.dynasty_tier] ?? user.dynasty_tier.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
