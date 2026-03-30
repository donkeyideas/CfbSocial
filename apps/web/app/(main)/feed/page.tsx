import { Suspense } from 'react';
import Link from 'next/link';
import { FeedTabs } from '@/components/feed/FeedTabs';
import type { FeedTab } from '@/components/feed/FeedTabs';
import { PostComposer } from '@/components/feed/PostComposer';
import { NewPostsBanner } from '@/components/feed/NewPostsBanner';
import { FeedListClient } from '@/components/feed/FeedListClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'College Football Fan Opinions & Takes | The Feed',
  description: 'Read the latest college football fan opinions, hot takes, predictions, and rivalry debates from fans across 653 schools. The live CFB fan community feed — join the discussion.',
  openGraph: {
    title: 'College Football Fan Opinions & Takes | CFB Social',
    description: 'The live college football social feed. Fan opinions, takes, predictions, and rivalry debates.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'College Football Fan Opinions & Takes | CFB Social',
    description: 'The live college football social feed. Fan opinions, takes, predictions, and rivalry debates.',
  },
  alternates: {
    canonical: 'https://cfbsocial.com/feed',
  },
};

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="content-card" style={{ opacity: 0.5 }}>
          <div className="post-user-row">
            <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: 80, height: 10 }} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="skeleton" style={{ width: '100%', height: 14, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '75%', height: 14 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface FeedPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const tab = (params.tab as FeedTab) || 'latest';

  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">The Feed</h1>
        <Suspense>
          <FeedTabs />
        </Suspense>
      </div>

      <PostComposer />

      <NewPostsBanner />

      <Suspense fallback={<FeedSkeleton />}>
        <FeedList tab={tab} />
      </Suspense>
    </div>
  );
}

async function FeedList({ tab }: { tab: FeedTab }) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  // Get current user for school/following filters
  const { data: { user } } = await supabase.auth.getUser();
  let userSchoolId: string | null = null;
  let followingIds: string[] = [];

  if (user) {
    if (tab === 'my-school') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();
      userSchoolId = profile?.school_id ?? null;
    }

    if (tab === 'following') {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      followingIds = follows?.map((f) => f.following_id) ?? [];
    }
  }

  // Build query based on active tab
  let query = supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        school_id,
        dynasty_tier
      ),
      school:schools!posts_school_id_fkey(
        id,
        name,
        abbreviation,
        primary_color,
        secondary_color,
        logo_url,
        slug
      ),
      aging_takes(
        id,
        user_id,
        revisit_date,
        is_surfaced,
        community_verdict
      )
    `)
    .in('status', ['PUBLISHED', 'FLAGGED'])
    .is('parent_id', null);

  // Apply tab-specific filters
  switch (tab) {
    case 'top':
      query = query.order('touchdown_count', { ascending: false });
      break;
    case 'receipts': {
      // Show RECEIPT-type posts AND any post that has a receipt filed (aging_takes)
      const { data: agingTakePosts } = await supabase
        .from('aging_takes')
        .select('post_id');
      const receiptPostIds = agingTakePosts?.map((a) => a.post_id) ?? [];
      if (receiptPostIds.length > 0) {
        query = query.or(`post_type.eq.RECEIPT,id.in.(${receiptPostIds.join(',')})`);
      } else {
        query = query.eq('post_type', 'RECEIPT');
      }
      query = query.order('created_at', { ascending: false });
      break;
    }
    case 'following':
      if (!user) {
        return (
          <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
            <p className="post-body" style={{ fontSize: '1.1rem' }}>
              Sign in to see posts from people you follow.
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
      if (followingIds.length > 0) {
        query = query.in('author_id', followingIds);
      } else {
        return (
          <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
            <p className="post-body" style={{ fontSize: '1.1rem' }}>
              You&apos;re not following anyone yet.
            </p>
            <p style={{ color: 'var(--faded-ink)', fontSize: '0.85rem', marginTop: 8 }}>
              Follow other users to see their posts here.
            </p>
          </div>
        );
      }
      query = query.order('created_at', { ascending: false });
      break;
    case 'my-school':
      if (!user) {
        return (
          <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
            <p className="post-body" style={{ fontSize: '1.1rem' }}>
              Sign in to see your school&apos;s feed.
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
      if (userSchoolId) {
        query = query.eq('school_id', userSchoolId);
      } else {
        return (
          <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
            <p className="post-body" style={{ fontSize: '1.1rem' }}>
              No school selected.
            </p>
            <p style={{ color: 'var(--faded-ink)', fontSize: '0.85rem', marginTop: 8 }}>
              Pick your school in Settings to see your school&apos;s feed.
            </p>
          </div>
        );
      }
      query = query.order('created_at', { ascending: false });
      break;
    default: // 'latest'
      query = query.order('created_at', { ascending: false });
      break;
  }

  const { data: posts, error } = await query.limit(20);

  if (error) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ color: 'var(--faded-ink)' }}>Unable to load posts right now. Please try again later.</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: 32 }}>
        <p className="post-body" style={{ fontSize: '1.1rem' }}>
          It&apos;s quiet in here...
        </p>
        <p style={{ color: 'var(--faded-ink)', fontSize: '0.85rem', marginTop: 8 }}>
          Be the first to post and stake your claim.
        </p>
      </div>
    );
  }

  const { PostCard } = await import('@/components/feed/PostCard');

  // Get last post's created_at for cursor pagination
  const lastPost = posts[posts.length - 1];
  const nextCursor = lastPost?.created_at ?? null;
  const hasMore = posts.length === 20;

  return (
    <>
      <div>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {hasMore && (
        <FeedListClient tab={tab} cursor={nextCursor} userSchoolId={userSchoolId} />
      )}
    </>
  );
}
