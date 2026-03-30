import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Schools',
};

export default function SchoolsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">School Analytics</h1>

      <Suspense
        fallback={
          <div className="admin-card overflow-hidden">
            <div className="skeleton h-96 w-full" />
          </div>
        }
      >
        <SchoolsTable />
      </Suspense>
    </div>
  );
}

async function SchoolsTable() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const [schoolsResult, profilesResult, postsResult] = await Promise.all([
    supabase
      .from('schools')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .limit(200),
    supabase.from('profiles').select('school_id'),
    supabase.from('posts').select('school_id'),
  ]);

  const { data: schools, error } = schoolsResult;

  if (error || !schools || schools.length === 0) {
    return (
      <div className="admin-card p-8 text-center text-[var(--admin-text-muted)]">
        No schools found.
      </div>
    );
  }

  // Count profiles per school
  const userCounts: Record<string, number> = {};
  if (profilesResult.data) {
    for (const profile of profilesResult.data) {
      if (profile.school_id) {
        userCounts[profile.school_id] = (userCounts[profile.school_id] || 0) + 1;
      }
    }
  }

  // Count posts per school
  const postCounts: Record<string, number> = {};
  if (postsResult.data) {
    for (const post of postsResult.data) {
      if (post.school_id) {
        postCounts[post.school_id] = (postCounts[post.school_id] || 0) + 1;
      }
    }
  }

  // Sort schools by user count descending
  const sortedSchools = [...schools].sort((a, b) => {
    const aCount = userCounts[a.id] || 0;
    const bCount = userCounts[b.id] || 0;
    return bCount - aCount;
  });

  return (
    <div className="admin-card overflow-hidden overflow-x-auto">
      <table className="admin-table">
        <thead>
          <tr>
            <th>School</th>
            <th>Conference</th>
            <th>Users</th>
            <th>Posts</th>
            <th>Colors</th>
            <th>FBS</th>
          </tr>
        </thead>
        <tbody>
          {sortedSchools.map((school) => (
            <tr key={school.id}>
              <td>
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full"
                    style={{ backgroundColor: school.primary_color }}
                  />
                  <div>
                    <p className="font-medium">{school.name}</p>
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      {school.mascot} &middot; {school.abbreviation}
                    </p>
                  </div>
                </div>
              </td>
              <td className="text-sm text-[var(--admin-text-secondary)]">
                {school.conference}
              </td>
              <td className="text-sm font-medium">
                {userCounts[school.id] || 0}
              </td>
              <td className="text-sm font-medium">
                {postCounts[school.id] || 0}
              </td>
              <td>
                <div className="flex gap-1">
                  <div
                    className="h-5 w-5 rounded"
                    style={{ backgroundColor: school.primary_color }}
                    title={school.primary_color}
                  />
                  <div
                    className="h-5 w-5 rounded"
                    style={{ backgroundColor: school.secondary_color }}
                    title={school.secondary_color}
                  />
                </div>
              </td>
              <td>
                <span
                  className={`text-xs font-semibold ${
                    school.is_fbs
                      ? 'text-[var(--admin-success)]'
                      : 'text-[var(--admin-text-muted)]'
                  }`}
                >
                  {school.is_fbs ? 'FBS' : 'FCS'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
