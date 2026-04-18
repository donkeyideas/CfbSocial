import { Suspense } from 'react';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { createClient as createServerSupabase } from '@supabase/supabase-js';
import { FeedTabs } from '@/components/feed/FeedTabs';
import type { FeedTab } from '@/components/feed/FeedTabs';
import { PostComposer } from '@/components/feed/PostComposer';
import { NewPostsBannerLazy } from '@/components/feed/NewPostsBannerLazy';
import { FeedListClient } from '@/components/feed/FeedListClient';
import { CollectionPageJsonLd } from '@/components/seo/JsonLd';
import { FEED_POST_SELECT, FEED_REPOST_SELECT } from '@/lib/queries/feed';

export const metadata = {
  title: 'College Football Fan Community',
  description: 'The #1 community for college football fans. Post takes, debate rivals, file predictions, and track the transfer portal across all 653 CFB schools.',
  openGraph: {
    title: 'College Football Fan Community | CFB Social',
    description: 'The #1 community for college football fans. Post takes, debate rivals, file predictions, and track the transfer portal across all 653 CFB schools.',
    type: 'website',
    images: [{ url: 'https://www.cfbsocial.com/logo.png', width: 256, height: 256, alt: 'CFB Social Logo' }],
  },
  twitter: {
    card: 'summary' as const,
    title: 'College Football Fan Community | CFB Social',
    description: 'The #1 community for college football fans. Post takes, debate rivals, file predictions, and track the transfer portal across all 653 CFB schools.',
    images: ['https://www.cfbsocial.com/logo.png'],
  },
  alternates: {
    canonical: 'https://www.cfbsocial.com/feed',
  },
};

function FeedSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0 48px' }}>
      <img
        src="/logo.png"
        alt="CFB Social"
        width={120}
        height={120}
        style={{ opacity: 0.5, marginBottom: 24 }}
      />
      <div className="feed-loading-bar" />
      <p style={{
        fontFamily: 'var(--mono)',
        fontSize: '0.8rem',
        color: 'var(--faded-ink)',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        marginTop: 16,
      }}>
        Loading the feed...
      </p>
    </div>
  );
}

interface FeedPageProps {
  searchParams: Promise<{ tab?: string }>;
}

/* ── Anon Supabase client (no cookies, safe for unstable_cache) ── */

function getAnonSupabase() {
  return createServerSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/* ── Cached feed queries for public tabs (30s TTL) ─────────────── */

const getCachedLatestFeed = unstable_cache(
  async () => {
    const sb = getAnonSupabase();
    const [postsResult, repostsResult] = await Promise.all([
      sb
        .from('posts')
        .select(FEED_POST_SELECT)
        .in('status', ['PUBLISHED', 'FLAGGED'])
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(20),
      sb
        .from('reposts')
        .select(FEED_REPOST_SELECT)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    if (postsResult.error) {
      throw new Error(postsResult.error.message);
    }
    return { posts: postsResult.data, reposts: repostsResult.data };
  },
  ['feed-latest'],
  { revalidate: 30, tags: ['feed'] },
);

const getCachedTopFeed = unstable_cache(
  async () => {
    const sb = getAnonSupabase();
    const [postsResult, repostsResult] = await Promise.all([
      sb
        .from('posts')
        .select(FEED_POST_SELECT)
        .in('status', ['PUBLISHED', 'FLAGGED'])
        .is('parent_id', null)
        .order('touchdown_count', { ascending: false })
        .limit(20),
      sb
        .from('reposts')
        .select(FEED_REPOST_SELECT)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    if (postsResult.error) {
      throw new Error(postsResult.error.message);
    }
    return { posts: postsResult.data, reposts: repostsResult.data };
  },
  ['feed-top'],
  { revalidate: 30, tags: ['feed'] },
);

const getCachedReceiptsFeed = unstable_cache(
  async () => {
    const sb = getAnonSupabase();

    // First get aging take post IDs
    const { data: agingTakePosts } = await sb
      .from('aging_takes')
      .select('post_id')
      .order('created_at', { ascending: false })
      .limit(200);
    const receiptPostIds = agingTakePosts?.map((a) => a.post_id) ?? [];

    let query = sb
      .from('posts')
      .select(FEED_POST_SELECT)
      .in('status', ['PUBLISHED', 'FLAGGED'])
      .is('parent_id', null);

    if (receiptPostIds.length > 0) {
      query = query.or(`post_type.eq.RECEIPT,id.in.(${receiptPostIds.join(',')})`);
    } else {
      query = query.eq('post_type', 'RECEIPT');
    }

    const [postsResult, repostsResult] = await Promise.all([
      query.order('created_at', { ascending: false }).limit(20),
      sb
        .from('reposts')
        .select(FEED_REPOST_SELECT)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    if (postsResult.error) {
      throw new Error(postsResult.error.message);
    }
    return { posts: postsResult.data, reposts: repostsResult.data };
  },
  ['feed-receipts'],
  { revalidate: 30, tags: ['feed'] },
);

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const tab = (params.tab as FeedTab) || 'latest';

  return (
    <div>
      <CollectionPageJsonLd
        name="The Feed — College Football Fan Opinions & Takes"
        description="Read the latest college football fan opinions, hot takes, predictions, and rivalry debates from fans across 653 schools."
        url="https://www.cfbsocial.com/feed"
      />
      <div className="feed-header">
        <h1 className="feed-title">The Feed</h1>
        <Suspense>
          <FeedTabs />
        </Suspense>
      </div>

      <PostComposer />

      <NewPostsBannerLazy />

      <Suspense fallback={<FeedSkeleton />}>
        <FeedList tab={tab} />
      </Suspense>
    </div>
  );
}

async function FeedList({ tab }: { tab: FeedTab }) {
  // Public tabs use cached queries (no auth needed)
  if (tab === 'latest' || tab === 'top' || tab === 'receipts') {
    try {
      const cached =
        tab === 'latest' ? await getCachedLatestFeed()
        : tab === 'top' ? await getCachedTopFeed()
        : await getCachedReceiptsFeed();

      return renderFeedItems(cached.posts, cached.reposts, tab, null);
    } catch (err) {
      console.error('[FeedList] Cache query error:', err);
      return (
        <div className="content-card" style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: 'var(--faded-ink)' }}>Unable to load posts right now. Please try again later.</p>
        </div>
      );
    }
  }

  // Auth-dependent tabs: following, my-school
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userSchoolId: string | null = null;
  let followingIds: string[] = [];

  if (user) {
    const [profileRes, followsRes] = await Promise.all([
      tab === 'my-school'
        ? supabase.from('profiles').select('school_id').eq('id', user.id).single()
        : Promise.resolve({ data: null }),
      tab === 'following'
        ? supabase.from('follows').select('following_id').eq('follower_id', user.id)
        : Promise.resolve({ data: null }),
    ]);
    userSchoolId = profileRes.data?.school_id ?? null;
    followingIds = (followsRes.data as Array<{ following_id: string }> | null)?.map((f) => f.following_id) ?? [];
  }

  // Handle unauthenticated or missing data for auth tabs
  if (tab === 'following') {
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
    if (followingIds.length === 0) {
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
  }

  if (tab === 'my-school') {
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
    if (!userSchoolId) {
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
  }

  // Build query for auth-dependent tabs
  let query = supabase
    .from('posts')
    .select(FEED_POST_SELECT)
    .in('status', ['PUBLISHED', 'FLAGGED'])
    .is('parent_id', null);

  if (tab === 'following') {
    query = query.in('author_id', followingIds);
  } else if (tab === 'my-school' && userSchoolId) {
    query = query.eq('school_id', userSchoolId);
  }
  query = query.order('created_at', { ascending: false });

  let repostQuery = supabase
    .from('reposts')
    .select(FEED_REPOST_SELECT)
    .order('created_at', { ascending: false })
    .limit(10);

  if (tab === 'following' && followingIds.length > 0) {
    repostQuery = repostQuery.in('user_id', followingIds);
  }

  const [postsResult, repostsResult] = await Promise.all([
    query.limit(20),
    repostQuery,
  ]);

  if (postsResult.error) {
    console.error('[FeedList] Query error:', postsResult.error.message);
    return (
      <div className="content-card" style={{ textAlign: 'center', padding: 24 }}>
        <p style={{ color: 'var(--faded-ink)' }}>Unable to load posts right now. Please try again later.</p>
      </div>
    );
  }

  return renderFeedItems(postsResult.data, repostsResult.data, tab, userSchoolId);
}

async function renderFeedItems(
  posts: Record<string, unknown>[] | null,
  reposts: Record<string, unknown>[] | null,
  tab: FeedTab,
  userSchoolId: string | null,
) {
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

  let repostItems: Array<Record<string, unknown>> = [];
  if (reposts) {
    repostItems = (reposts as Array<Record<string, unknown>>)
      .filter((r) => {
        const post = (Array.isArray(r.post) ? r.post[0] : r.post) as Record<string, unknown> | null;
        return post && (post.status === 'PUBLISHED' || post.status === 'FLAGGED') && !post.parent_id;
      })
      .map((r) => {
        const post = (Array.isArray(r.post) ? r.post[0] : r.post) as Record<string, unknown>;
        const raw = Array.isArray(r.reposter) ? r.reposter[0] : r.reposter;
        const reposter = raw as { username: string; display_name: string | null } | null;
        return {
          ...post,
          _feedKey: `repost-${r.id}`,
          _feedTime: r.created_at as string,
          _repostedBy: reposter ?? null,
          _repostTime: r.created_at as string,
        };
      });
  }

  // Deduplicate: if a post already appears as a repost, skip it from the regular list
  const repostedPostIds = new Set(repostItems.map((r) => r.id as string));

  const postItems = posts
    .filter((p) => !repostedPostIds.has(p.id as string))
    .map((p) => ({
      ...p,
      _feedKey: `post-${p.id}`,
      _feedTime: p.created_at as string,
      _repostedBy: null as { username: string; display_name: string | null } | null,
      _repostTime: null as string | null,
    }));

  const merged = [...postItems, ...repostItems]
    .sort((a, b) => new Date(b._feedTime as string).getTime() - new Date(a._feedTime as string).getTime())
    .slice(0, 25);

  const { PostCard } = await import('@/components/feed/PostCard');

  const lastItem = merged[merged.length - 1];
  const nextCursor = lastItem?._feedTime ?? null;
  const hasMore = posts.length === 20;

  return (
    <>
      <div>
        {merged.map((item) => (
          <PostCard key={item._feedKey as string} post={item as never} />
        ))}
      </div>
      {hasMore && (
        <FeedListClient tab={tab} cursor={nextCursor} userSchoolId={userSchoolId} />
      )}
    </>
  );
}
