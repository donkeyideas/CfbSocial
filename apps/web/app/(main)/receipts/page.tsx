import { Suspense } from 'react';
import Link from 'next/link';

export const revalidate = 60;

export const metadata = {
  title: 'My Receipts | CFB Social',
  description: 'Posts you filed receipts on. Track your predictions and revisit them when the time comes.',
};

export default function ReceiptsPage() {
  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">My Receipts</h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--faded-ink)', marginTop: 4 }}>
          Posts you marked for revisit. Come back and see how they aged.
        </p>
      </div>

      <Suspense fallback={<ReceiptsSkeleton />}>
        <ReceiptsContent />
      </Suspense>
    </div>
  );
}

function ReceiptsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="content-card" style={{ padding: 24 }}>
          <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: '100%', height: 12, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: '80%', height: 12 }} />
        </div>
      ))}
    </div>
  );
}

async function ReceiptsContent() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>Sign in to view your receipts.</p>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'var(--faded-ink)', marginTop: 8 }}>
          File receipts on posts from the feed, then track them here.
        </p>
        <p style={{ marginTop: 12 }}>
          <Link href="/login" style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: 'var(--crimson)' }}>
            Log in
          </Link>
          {' or '}
          <Link href="/register" style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: 'var(--crimson)' }}>
            create an account
          </Link>
        </p>
      </div>
    );
  }

  const { data: receipts } = await supabase
    .from('aging_takes')
    .select(`
      id, revisit_date, is_surfaced, community_verdict, created_at,
      post:posts!aging_takes_post_id_fkey(
        id, content, post_type, status, touchdown_count, fumble_count, reply_count, created_at,
        author:profiles!posts_author_id_fkey(
          id, username, display_name, dynasty_tier, avatar_url, school_id
        ),
        school:schools!posts_school_id_fkey(
          id, name, abbreviation, primary_color, secondary_color, logo_url, slug
        )
      )
    `)
    .eq('user_id', user.id)
    .order('revisit_date', { ascending: true })
    .limit(50);

  const filed = receipts ?? [];

  if (filed.length === 0) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>No receipts filed yet.</p>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'var(--faded-ink)', marginTop: 8 }}>
          Use the REVISIT button on any post to file a receipt and track it here.
        </p>
      </div>
    );
  }

  const now = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'var(--faded-ink)', paddingLeft: 4, marginBottom: 4 }}>
        {filed.length} {filed.length === 1 ? 'receipt' : 'receipts'} filed
      </div>
      {filed.map((receipt) => {
        const post = receipt.post as unknown as {
          id: string; content: string; post_type: string; status: string;
          touchdown_count: number; fumble_count: number; reply_count: number;
          created_at: string;
          author: { id: string; username: string; display_name: string | null; dynasty_tier: string; avatar_url: string | null; school_id: string | null } | null;
          school: { id: string; name: string; abbreviation: string; primary_color: string; secondary_color: string; logo_url: string | null; slug: string } | null;
        } | null;

        if (!post) return null;

        const revisitDate = new Date(receipt.revisit_date);
        const isReady = revisitDate <= now;
        const daysLeft = Math.max(0, Math.ceil((revisitDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const filedDate = new Date(receipt.created_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const reviewDate = revisitDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const schoolColor = post.school?.primary_color ?? 'var(--crimson)';

        return (
          <Link
            key={receipt.id}
            href={`/post/${post.id}`}
            className="content-card"
            style={{
              display: 'block',
              padding: '14px 20px',
              textDecoration: 'none',
              color: 'inherit',
              borderLeft: `3px solid ${schoolColor}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {post.school && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                  backgroundColor: schoolColor,
                  padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--sans)',
                }}>
                  {post.school.abbreviation}
                </span>
              )}
              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', fontWeight: 600 }}>
                @{post.author?.username ?? 'unknown'}
              </span>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700,
                color: isReady ? 'var(--cream)' : schoolColor,
                backgroundColor: isReady ? schoolColor : 'transparent',
                border: isReady ? 'none' : `1px solid ${schoolColor}`,
                padding: '1px 6px', borderRadius: 3,
                fontFamily: 'var(--sans)', textTransform: 'uppercase',
              }}>
                {isReady ? 'Ready for Review' : `${daysLeft}d remaining`}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--faded-ink)', marginLeft: 'auto' }}>
                Filed {filedDate}
              </span>
            </div>

            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', lineHeight: 1.4, marginBottom: 8 }}>
              {post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content}
            </p>

            <div style={{ display: 'flex', gap: 14, fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--faded-ink)' }}>
              <span>TD {post.touchdown_count}</span>
              <span>FMB {post.fumble_count}</span>
              <span>{post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
                Review {reviewDate}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
