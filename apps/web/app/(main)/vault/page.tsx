import { Suspense } from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'The Vault',
};

export default function VaultPage() {
  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">The Vault</h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.82rem', color: 'var(--faded-ink)', marginTop: 4 }}>
          Your saved posts and bookmarks. Everything you wanted to come back to.
        </p>
      </div>

      <Suspense fallback={<VaultSkeleton />}>
        <VaultContent />
      </Suspense>
    </div>
  );
}

function VaultSkeleton() {
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

async function VaultContent() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>Sign in to view your vault.</p>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'var(--faded-ink)', marginTop: 8 }}>
          Your bookmarked posts will appear here.
        </p>
      </div>
    );
  }

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select(`
      id, created_at,
      post:posts!bookmarks_post_id_fkey(
        id, content, post_type, touchdown_count, fumble_count, reply_count, created_at,
        author:profiles!posts_author_id_fkey(username, display_name, dynasty_tier),
        school:schools!posts_school_id_fkey(name, abbreviation, primary_color, slug)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const saved = bookmarks ?? [];

  if (saved.length === 0) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>Your vault is empty.</p>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'var(--faded-ink)', marginTop: 8 }}>
          Bookmark posts from the feed to save them here for later.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontFamily: 'var(--sans)', fontSize: '0.75rem', color: 'var(--faded-ink)', paddingLeft: 4, marginBottom: 4 }}>
        {saved.length} saved {saved.length === 1 ? 'post' : 'posts'}
      </div>
      {saved.map((bm) => {
        const post = bm.post as unknown as {
          id: string; content: string; post_type: string;
          touchdown_count: number; fumble_count: number; reply_count: number;
          created_at: string;
          author: { username: string; display_name: string | null; dynasty_tier: string } | null;
          school: { name: string; abbreviation: string; primary_color: string; slug: string } | null;
        } | null;

        if (!post) return null;

        return (
          <Link
            key={bm.id}
            href={`/post/${post.id}`}
            className="content-card"
            style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {post.school && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                  backgroundColor: post.school.primary_color,
                  padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--sans)',
                }}>
                  {post.school.abbreviation}
                </span>
              )}
              <span style={{ fontFamily: 'var(--sans)', fontSize: '0.78rem', fontWeight: 600 }}>
                {post.author?.display_name ?? post.author?.username}
              </span>
              {post.post_type === 'PREDICTION' && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, color: 'var(--gold)',
                  border: '1px solid var(--gold)', padding: '0px 5px',
                  borderRadius: 3, fontFamily: 'var(--sans)', textTransform: 'uppercase',
                }}>
                  Prediction
                </span>
              )}
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--faded-ink)', marginLeft: 'auto' }}>
                {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', lineHeight: 1.4, marginBottom: 8 }}>
              {post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content}
            </p>

            <div style={{ display: 'flex', gap: 14, fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--faded-ink)' }}>
              <span>TD {post.touchdown_count}</span>
              <span>FMB {post.fumble_count}</span>
              <span>{post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--crimson)', fontSize: '0.65rem' }}>
                Saved {new Date(bm.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
