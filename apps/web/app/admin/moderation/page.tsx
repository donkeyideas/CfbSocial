import { Suspense } from 'react';
import { ModerationActions } from './ModerationActions';

export const metadata = {
  title: 'Moderation',
};

export default function ModerationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Moderation Queue</h1>
      </div>

      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="admin-card p-4">
                <div className="skeleton h-16 w-full" />
              </div>
            ))}
          </div>
        }
      >
        <ModerationQueue />
      </Suspense>
    </div>
  );
}

async function ModerationQueue() {
  const { createAdminClient } = await import('@/lib/admin/supabase/admin');
  const supabase = createAdminClient();

  const { data: flaggedPosts, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(id, username, display_name),
      school:schools!posts_school_id_fkey(id, name, abbreviation),
      reports(id, reason, description, status, created_at,
        reporter:profiles!reports_reporter_id_fkey(username)
      )
    `)
    .eq('status', 'FLAGGED')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !flaggedPosts || flaggedPosts.length === 0) {
    return (
      <div className="admin-card p-8 text-center text-[var(--admin-text-muted)]">
        No flagged content in the queue.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {flaggedPosts.map((post) => (
        <div key={post.id} className="admin-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--admin-text-secondary)]">
                <span className="font-semibold text-[var(--admin-text)]">
                  @{(post.author as { username?: string } | null)?.username ?? 'unknown'}
                </span>
                {post.school && (
                  <span className="ml-2 text-xs text-[var(--admin-text-muted)]">
                    [{(post.school as { abbreviation?: string } | null)?.abbreviation}]
                  </span>
                )}
                <span className="ml-2 text-xs text-[var(--admin-text-muted)]">
                  {new Date(post.created_at).toLocaleString()}
                </span>
              </p>
              <p className="mt-1 text-sm">{post.content}</p>
              {post.moderation_reason && (
                <p className="mt-1 text-xs text-[var(--admin-warning)]">
                  AI Reason: {post.moderation_reason}
                </p>
              )}
              {post.moderation_score != null && (
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  Risk Score: {(post.moderation_score * 100).toFixed(0)}%
                </p>
              )}
              {Array.isArray(post.reports) && post.reports.length > 0 && (
                <div className="mt-2 space-y-1">
                  {(post.reports as Array<{ id: string; reason: string; description: string | null; reporter: { username: string } | null }>).map((r) => (
                    <p key={r.id} className="text-xs text-[var(--admin-warning)]">
                      Reported by @{r.reporter?.username ?? 'unknown'}: {r.reason.replace(/_/g, ' ')}
                      {r.description && <span className="text-[var(--admin-text-muted)]"> — {r.description}</span>}
                    </p>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs uppercase tracking-wider text-[var(--admin-warning)]">
                {post.post_type.replace(/_/g, ' ')}
              </p>
            </div>
            <ModerationActions postId={post.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
