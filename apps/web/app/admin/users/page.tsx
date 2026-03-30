import { Suspense } from 'react';
import { getAllUsers } from '@/lib/admin/actions/users';
import { createAdminClient } from '@/lib/admin/supabase/admin';
import { UsersClient } from '@/components/admin/users/users-client';
import { LoadingSkeleton } from '@/components/admin/shared/loading-skeleton';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Users',
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; sort?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      {/* Filter bar */}
      <div className="admin-card p-4">
        <form method="GET" action="/admin/users" className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search by username or email..."
            className="admin-input flex-1 min-w-[200px]"
          />

          <select
            name="role"
            defaultValue={params.role ?? ''}
            className="admin-select"
          >
            <option value="">All Roles</option>
            <option value="USER">USER</option>
            <option value="MODERATOR">MODERATOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>

          <select
            name="status"
            defaultValue={params.status ?? ''}
            className="admin-select"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="BANNED">BANNED</option>
          </select>

          <select
            name="sort"
            defaultValue={params.sort ?? 'newest'}
            className="admin-select"
          >
            <option value="newest">Newest</option>
            <option value="username">Username</option>
            <option value="xp">XP</option>
            <option value="level">Level</option>
            <option value="posts">Posts</option>
          </select>

          <button type="submit" className="btn-admin">
            Search
          </button>

          {(params.q || params.role || params.status || (params.sort && params.sort !== 'newest')) && (
            <a
              href="/admin/users"
              className="text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
            >
              Clear filters
            </a>
          )}
        </form>
      </div>

      <Suspense
        fallback={
          <div className="admin-card overflow-hidden">
            <LoadingSkeleton type="table" rows={10} />
          </div>
        }
      >
        <UsersTableLoader
          q={params.q}
          role={params.role}
          status={params.status}
          sort={params.sort}
        />
      </Suspense>
    </div>
  );
}

async function UsersTableLoader({
  q,
  role,
  status,
  sort,
}: {
  q?: string;
  role?: string;
  status?: string;
  sort?: string;
}) {
  const sortMap: Record<string, { field: string; order: 'asc' | 'desc' }> = {
    newest: { field: 'created_at', order: 'desc' },
    username: { field: 'username', order: 'asc' },
    xp: { field: 'xp', order: 'desc' },
    level: { field: 'level', order: 'desc' },
    posts: { field: 'post_count', order: 'desc' },
  };

  const sortConfig = sortMap[sort ?? 'newest'] ?? sortMap['newest'];

  const { users, total, error } = await getAllUsers({
    search: q,
    role: role || undefined,
    status: status || undefined,
    sort: sortConfig!.field,
    order: sortConfig!.order,
    limit: 100,
    offset: 0,
  });

  if (error) {
    return (
      <div className="admin-card p-8 text-center text-[var(--admin-error)]">
        Failed to load users. Please try again.
      </div>
    );
  }

  // Fetch auth provider info for each user
  const supabase = createAdminClient();
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const providerMap: Record<string, string> = {};
  if (authData?.users) {
    for (const au of authData.users) {
      const provider = au.app_metadata?.provider || 'email';
      providerMap[au.id] = provider;
    }
  }

  // Supabase returns joined relations as arrays; normalize school to single object
  const normalized = (users ?? []).map((u: Record<string, unknown>) => ({
    ...u,
    school: Array.isArray(u.school) ? (u.school[0] ?? null) : (u.school ?? null),
    auth_provider: providerMap[u.id as string] || 'email',
  }));

  return <UsersClient users={normalized as Parameters<typeof UsersClient>[0]['users']} total={total} />;
}
