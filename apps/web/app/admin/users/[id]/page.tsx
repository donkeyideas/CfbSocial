import { Suspense } from 'react';
import Link from 'next/link';
import { UserActions } from '@/components/admin/users/UserActions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'User Detail',
};

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
      >
        &larr; Back to Users
      </Link>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="admin-card p-6">
              <div className="skeleton h-32 w-full" />
            </div>
            <div className="admin-card p-6">
              <div className="skeleton h-48 w-full" />
            </div>
          </div>
        }
      >
        <UserDetail userId={id} />
      </Suspense>
    </div>
  );
}

async function UserDetail({ userId }: { userId: string }) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      email,
      role,
      status,
      dynasty_tier,
      xp,
      level,
      created_at,
      school:schools!profiles_school_id_fkey(id, name, abbreviation)
    `)
    .eq('id', userId)
    .single();

  if (error || !user) {
    return (
      <div className="admin-card p-8 text-center text-[var(--admin-text-muted)]">
        User not found.
      </div>
    );
  }

  const school = user.school as { id?: string; name?: string; abbreviation?: string } | null;
  const firstLetter = (user.display_name ?? user.username ?? '?').charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="admin-card p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold"
            style={{
              backgroundColor: 'var(--admin-accent)',
              color: 'white',
            }}
          >
            {firstLetter}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[var(--admin-text)]">
                {user.display_name ?? user.username}
              </h1>
              <span
                className={`text-xs font-semibold ${
                  user.role === 'ADMIN'
                    ? 'text-[var(--admin-accent-light)]'
                    : user.role === 'MODERATOR'
                      ? 'text-[var(--admin-warning)]'
                      : 'text-[var(--admin-text-secondary)]'
                }`}
              >
                {user.role}
              </span>
              <span
                className={`text-xs font-semibold ${
                  user.status === 'ACTIVE'
                    ? 'text-[var(--admin-success)]'
                    : user.status === 'SUSPENDED'
                      ? 'text-[var(--admin-warning)]'
                      : 'text-[var(--admin-error)]'
                }`}
              >
                {user.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">@{user.username}</p>
            {user.email && (
              <p className="mt-0.5 text-sm text-[var(--admin-text-secondary)]">{user.email}</p>
            )}

            {/* Stats Row */}
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-[var(--admin-text-muted)]">School: </span>
                <span className="text-[var(--admin-text)]">
                  {school?.name ?? school?.abbreviation ?? '-'}
                </span>
              </div>
              <div>
                <span className="text-[var(--admin-text-muted)]">Dynasty Tier: </span>
                <span className="uppercase text-[var(--admin-text)]">
                  {user.dynasty_tier?.replace('_', ' ') ?? '-'}
                </span>
              </div>
              <div>
                <span className="text-[var(--admin-text-muted)]">XP: </span>
                <span className="text-[var(--admin-text)]">{user.xp ?? 0}</span>
              </div>
              <div>
                <span className="text-[var(--admin-text-muted)]">Level: </span>
                <span className="text-[var(--admin-text)]">{user.level ?? 1}</span>
              </div>
              <div>
                <span className="text-[var(--admin-text-muted)]">Joined: </span>
                <span className="text-[var(--admin-text)]">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <UserActions
            userId={user.id}
            currentRole={user.role}
            currentStatus={user.status}
          />
        </div>
      </div>

      {/* Recent Posts & Moderation History */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense
          fallback={
            <div className="admin-card p-6">
              <div className="skeleton h-48 w-full" />
            </div>
          }
        >
          <RecentPosts userId={userId} />
        </Suspense>

        <Suspense
          fallback={
            <div className="admin-card p-6">
              <div className="skeleton h-48 w-full" />
            </div>
          }
        >
          <ModerationHistory userId={userId} />
        </Suspense>
      </div>
    </div>
  );
}

async function RecentPosts({ userId }: { userId: string }) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, post_type, status, created_at')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="admin-card overflow-hidden">
      <div className="border-b border-[var(--admin-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--admin-text)]">Recent Posts</h2>
      </div>
      {!posts || posts.length === 0 ? (
        <div className="p-6 text-center text-sm text-[var(--admin-text-muted)]">
          No posts yet.
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Content</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="max-w-[200px] truncate text-sm">{post.content}</td>
                <td className="text-xs uppercase text-[var(--admin-text-muted)]">
                  {post.post_type.replace(/_/g, ' ')}
                </td>
                <td>
                  <span
                    className={`text-xs font-semibold ${
                      post.status === 'PUBLISHED'
                        ? 'text-[var(--admin-success)]'
                        : post.status === 'FLAGGED'
                          ? 'text-[var(--admin-warning)]'
                          : post.status === 'REMOVED'
                            ? 'text-[var(--admin-error)]'
                            : 'text-[var(--admin-text-muted)]'
                    }`}
                  >
                    {post.status}
                  </span>
                </td>
                <td className="text-xs text-[var(--admin-text-muted)]">
                  {new Date(post.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

async function ModerationHistory({ userId }: { userId: string }) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: events } = await supabase
    .from('moderation_events')
    .select(`
      id,
      event_type,
      action_taken,
      created_at,
      moderator:profiles!moderation_events_moderator_id_fkey(id, username)
    `)
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="admin-card overflow-hidden">
      <div className="border-b border-[var(--admin-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--admin-text)]">Moderation History</h2>
      </div>
      {!events || events.length === 0 ? (
        <div className="p-6 text-center text-sm text-[var(--admin-text-muted)]">
          No moderation events.
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Action</th>
              <th>Moderator</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const moderator = event.moderator as { id?: string; username?: string } | null;
              return (
                <tr key={event.id}>
                  <td className="text-xs uppercase text-[var(--admin-text-secondary)]">
                    {event.event_type.replace(/_/g, ' ')}
                  </td>
                  <td>
                    <span
                      className={`text-xs font-semibold ${
                        event.action_taken === 'REMOVE' || event.action_taken === 'BAN'
                          ? 'text-[var(--admin-error)]'
                          : event.action_taken === 'FLAG' || event.action_taken === 'WARN'
                            ? 'text-[var(--admin-warning)]'
                            : event.action_taken === 'RESTORE'
                              ? 'text-[var(--admin-success)]'
                              : 'text-[var(--admin-text-muted)]'
                      }`}
                    >
                      {event.action_taken.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="text-xs text-[var(--admin-text-muted)]">
                    @{moderator?.username ?? 'system'}
                  </td>
                  <td className="text-xs text-[var(--admin-text-muted)]">
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
