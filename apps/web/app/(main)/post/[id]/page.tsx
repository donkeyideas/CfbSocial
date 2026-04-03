import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PostCard } from '@/components/feed/PostCard';
import { ReplyComposer } from '@/components/feed/ReplyComposer';
import { DiscussionPostJsonLd } from '@/components/seo/JsonLd';

export const revalidate = 30;

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PostPageProps) {
  const { id } = await params;
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('posts')
    .select('content, author:profiles!posts_author_id_fkey(username)')
    .eq('id', id)
    .single();

  if (!post) return { title: 'Post Not Found' };

  const author = post.author as unknown as { username: string } | null;
  const preview = post.content.slice(0, 140);
  const title = `@${author?.username ?? 'unknown'}: ${post.content.slice(0, 80)}`;
  const description = `${preview}${post.content.length > 140 ? '...' : ''} \u2014 A take on CFB Social`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary' as const,
      title,
      description,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/feed"
          style={{
            fontFamily: 'var(--sans)',
            fontSize: '0.8rem',
            color: 'var(--faded-ink)',
            textDecoration: 'none',
          }}
        >
          &larr; Back to Feed
        </Link>
      </div>

      <Suspense fallback={<PostSkeleton />}>
        <PostDetail postId={id} />
      </Suspense>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="content-card" style={{ opacity: 0.5 }}>
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
  );
}

async function PostDetail({ postId }: { postId: string }) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  // Fetch the post
  const { data: post, error } = await supabase
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
      )
    `)
    .eq('id', postId)
    .single();

  if (error || !post) notFound();

  const postAuthor = post.author as unknown as { username: string } | null;

  // Fetch replies
  const { data: replies } = await supabase
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
      )
    `)
    .eq('parent_id', postId)
    .eq('status', 'PUBLISHED')
    .order('created_at', { ascending: true })
    .limit(50);

  return (
    <div>
      <DiscussionPostJsonLd
        author={postAuthor?.username ?? 'unknown'}
        datePublished={post.created_at}
        text={post.content}
        url={`https://cfbsocial.com/post/${postId}`}
        interactionCount={(post.touchdown_count ?? 0) + (post.fumble_count ?? 0)}
      />
      {/* Main post */}
      <PostCard post={post} />

      {/* Reply composer */}
      <ReplyComposer parentId={postId} parentAuthorId={post.author_id} />

      {/* Replies */}
      {replies && replies.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.7rem',
              letterSpacing: '2px',
              color: 'var(--faded-ink)',
              textTransform: 'uppercase',
              marginBottom: 12,
              paddingBottom: 4,
              borderBottom: '1px solid rgba(59,47,30,0.1)',
            }}
          >
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </div>
          {replies.map((reply) => (
            <div key={reply.id} style={{ paddingLeft: 16, borderLeft: '2px solid var(--tan)' }}>
              <PostCard post={reply} />
            </div>
          ))}
        </div>
      )}

      {(!replies || replies.length === 0) && (
        <div
          className="content-card"
          style={{ textAlign: 'center', padding: 24, marginTop: 8 }}
        >
          <p style={{ color: 'var(--faded-ink)', fontSize: '0.85rem' }}>
            No replies yet. Be the first to respond.
          </p>
        </div>
      )}
    </div>
  );
}
