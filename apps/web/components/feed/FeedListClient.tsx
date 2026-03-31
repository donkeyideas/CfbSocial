'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { PostCard } from './PostCard';
import type { FeedTab } from './FeedTabs';

interface FeedListClientProps {
  tab: FeedTab;
  cursor: string | null;
  userSchoolId?: string | null;
}

export function FeedListClient({ tab, cursor: initialCursor, userSchoolId }: FeedListClientProps) {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const [posts, setPosts] = useState<Array<Record<string, unknown>>>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursor) return;
    setLoading(true);

    const supabase = createClient();

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

    // Apply tab filters
    switch (tab) {
      case 'top':
        query = query.order('touchdown_count', { ascending: false }).lt('created_at', cursor);
        break;
      case 'receipts': {
        const { data: agingTakePosts } = await supabase
          .from('aging_takes')
          .select('post_id');
        const receiptPostIds = agingTakePosts?.map((a) => a.post_id) ?? [];
        if (receiptPostIds.length > 0) {
          query = query.or(`post_type.eq.RECEIPT,id.in.(${receiptPostIds.join(',')})`);
        } else {
          query = query.eq('post_type', 'RECEIPT');
        }
        query = query.lt('created_at', cursor).order('created_at', { ascending: false });
        break;
      }
      case 'following': {
        if (profileId) {
          const { data: follows } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', profileId);
          const ids = follows?.map((f) => f.following_id) ?? [];
          if (ids.length > 0) {
            query = query.in('author_id', ids);
          }
        }
        query = query.lt('created_at', cursor).order('created_at', { ascending: false });
        break;
      }
      case 'my-school':
        if (userSchoolId) {
          query = query.eq('school_id', userSchoolId);
        }
        query = query.lt('created_at', cursor).order('created_at', { ascending: false });
        break;
      default:
        query = query.lt('created_at', cursor).order('created_at', { ascending: false });
        break;
    }

    const { data, error } = await query.limit(20);

    // Also fetch reposts for merging
    let repostItems: Array<Record<string, unknown>> = [];
    {
      const { data: reposts } = await supabase
        .from('reposts')
        .select(`
          id,
          created_at,
          user_id,
          post_id,
          reposter:profiles!reposts_user_id_fkey(
            username,
            display_name
          ),
          post:posts!reposts_post_id_fkey(
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
          )
        `)
        .lt('created_at', cursor)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reposts) {
        repostItems = reposts
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
            };
          });
      }
    }

    if (!error && data) {
      const postItems = data.map((p) => ({
        ...p,
        _feedKey: `post-${p.id}`,
        _feedTime: p.created_at as string,
        _repostedBy: null as { username: string; display_name: string | null } | null,
      }));

      // Merge and sort
      const merged = [...postItems, ...repostItems]
        .sort((a, b) => new Date(b._feedTime as string).getTime() - new Date(a._feedTime as string).getTime());

      setPosts((prev) => [...prev, ...merged]);
      setHasMore(data.length === 20);
      if (merged.length > 0) {
        const last = merged[merged.length - 1];
        setCursor((last?._feedTime as string) ?? null);
      }
    }

    setLoading(false);
  }, [cursor, loading, hasMore, tab, userSchoolId, profileId]);

  return (
    <>
      {posts.map((post) => (
        <PostCard key={(post._feedKey ?? post.id) as string} post={post as never} />
      ))}
      {hasMore && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <button
            onClick={loadMore}
            disabled={loading}
            className="composer-submit"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </>
  );
}
