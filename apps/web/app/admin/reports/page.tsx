import { Suspense } from 'react';
import { ReportActions } from './ReportActions';

export const metadata = {
  title: 'Reports',
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports Queue</h1>

      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="admin-card p-4">
                <div className="skeleton h-20 w-full" />
              </div>
            ))}
          </div>
        }
      >
        <ReportsQueue />
      </Suspense>
    </div>
  );
}

async function ReportsQueue() {
  const { createAdminClient } = await import('@/lib/admin/supabase/admin');
  const supabase = createAdminClient();

  const { data: reports, error } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(id, username),
      post:posts!reports_post_id_fkey(id, content, post_type, author_id, status),
      reported_user:profiles!reports_reported_user_id_fkey(id, username, display_name)
    `)
    .in('status', ['PENDING', 'REVIEWING'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !reports || reports.length === 0) {
    return (
      <div className="admin-card p-8 text-center text-[var(--admin-text-muted)]">
        No pending reports.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const reporter = report.reporter as { id?: string; username?: string } | null;
        const post = report.post as { id?: string; content?: string; post_type?: string; status?: string } | null;
        const reportedUser = report.reported_user as { id?: string; username?: string } | null;

        return (
          <div key={report.id} className="admin-card overflow-hidden p-4">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      report.reason === 'HATE_SPEECH' || report.reason === 'HARASSMENT'
                        ? 'text-[var(--admin-error)]'
                        : 'text-[var(--admin-warning)]'
                    }`}
                  >
                    {report.reason.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      report.status === 'REVIEWING'
                        ? 'text-[var(--admin-info)]'
                        : 'text-[var(--admin-text-muted)]'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--admin-text-secondary)]">
                  Reported by @{reporter?.username ?? 'unknown'}
                  {reportedUser && <> against @{reportedUser.username}</>}
                </p>
                {post && (
                  <p className="mt-1 line-clamp-2 text-sm">
                    Post: &quot;{post.content}&quot;
                  </p>
                )}
                {report.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-[var(--admin-text-muted)]">
                    Note: {report.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  {new Date(report.created_at).toLocaleString()}
                </p>
              </div>
              <ReportActions
                reportId={report.id}
                postId={post?.id ?? null}
                reportedUserId={report.reported_user_id}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
