import { Suspense } from 'react';
import { SchoolsTableClient } from '@/components/admin/schools/schools-table-client';

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

  const schoolRows = schools.map((s) => ({
    id: s.id,
    name: s.name,
    mascot: s.mascot,
    abbreviation: s.abbreviation,
    conference: s.conference,
    primary_color: s.primary_color,
    secondary_color: s.secondary_color,
    is_fbs: s.is_fbs,
    userCount: userCounts[s.id] || 0,
    postCount: postCounts[s.id] || 0,
  }));

  return <SchoolsTableClient schools={schoolRows} />;
}
