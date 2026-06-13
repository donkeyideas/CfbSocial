import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PostCard } from '@/components/feed/PostCard';
import { ReplyComposer } from '@/components/feed/ReplyComposer';
import { DiscussionPostJsonLd, ImageObjectJsonLd } from '@/components/seo/JsonLd';
import { PostDwellTracker } from './PostDwellTracker';

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
    .select(`
      content, post_type, media_urls,
      author:profiles!posts_author_id_fkey(username),
      school:schools!posts_school_id_fkey(name, abbreviation),
      game_moment:game_moments(title, opponent, our_score, opp_score, week)
    `)
    .eq('id', id)
    .single();

  if (!post) return { title: 'Post Not Found' };

  const author = post.author as unknown as { username: string } | null;

  // Moments get image-rich, video-game-keyworded metadata so they surface in
  // Google Images / Lens and answer engines for "[school] College Football 26" queries.
  if (post.post_type === 'MOMENT') {
    const school = post.school as unknown as { name: string; abbreviation: string } | null;
    const gmRaw = post.game_moment as unknown;
    const gm = (Array.isArray(gmRaw) ? gmRaw[0] : gmRaw) as
      | { title: string | null; opponent: string | null; our_score: number | null; opp_score: number | null; week: string | null }
      | null;
    const img = (post.media_urls as string[] | null)?.[0];
    const scoreText = gm?.our_score != null && gm?.opp_score != null ? ` ${gm.our_score}-${gm.opp_score}` : '';
    const vsText = gm?.opponent ? ` vs ${gm.opponent}` : '';
    const teamText = school?.name ? `${school.name} ` : '';
    const headline = gm?.title || post.content || 'College Football 26 dynasty moment';
    const title = `${headline} \u2014 ${teamText}College Football 26${vsText ? ` (${vsText.trim()}${scoreText})` : ''} | CFB Social`;
    const description = `${teamText}College Football 26 dynasty moment${vsText}${scoreText}${gm?.week ? ` \u00b7 ${gm.week}` : ''}. Shared by @${author?.username ?? 'a coach'} in the CFB Social Game Room.`;
    return {
      title,
      description,
      keywords: ['College Football 26', 'CFB 26', school?.name, `${school?.name} College Football 26`, 'CFB 26 screenshots', 'dynasty moment'].filter(Boolean) as string[],
      openGraph: {
        title, description, type: 'article',
        images: img ? [{ url: img, alt: `${teamText}College Football 26 dynasty moment${vsText}${scoreText}` }] : undefined,
      },
      twitter: { card: 'summary_large_image' as const, title, description, images: img ? [img] : undefined },
      alternates: { canonical: `https://www.cfbsocial.com/post/${id}` },
    };
  }

  const preview = post.content.slice(0, 140);
  const title = `@${author?.username ?? 'unknown'}: ${post.content.slice(0, 80)}`;
  const description = `${preview}${post.content.length > 140 ? '...' : ''} \u2014 A take on CFB Social`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary' as const, title, description },
    alternates: { canonical: `https://www.cfbsocial.com/post/${id}` },
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

      <PostDwellTracker postId={id} />
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
      ),
      game_moment:game_moments(title, opponent, our_score, opp_score, week)
    `)
    .eq('id', postId)
    .single();

  if (error || !post) notFound();

  const postAuthor = post.author as unknown as { username: string } | null;
  const postSchool = post.school as unknown as { name: string } | null;
  const momentRaw = post.game_moment as unknown;
  const moment = (Array.isArray(momentRaw) ? momentRaw[0] : momentRaw) as
    | { title: string | null; opponent: string | null; our_score: number | null; opp_score: number | null; week: string | null }
    | null;
  const momentImg = (post.media_urls as string[] | null)?.[0];
  const momentCaption = post.post_type === 'MOMENT'
    ? `${postSchool?.name ? `${postSchool.name} ` : ''}College Football 26 dynasty moment${moment?.opponent ? ` vs ${moment.opponent}` : ''}${moment?.our_score != null && moment?.opp_score != null ? ` ${moment.our_score}-${moment.opp_score}` : ''}${moment?.week ? ` · ${moment.week}` : ''}`
    : '';

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
        url={`https://www.cfbsocial.com/post/${postId}`}
        interactionCount={(post.touchdown_count ?? 0) + (post.fumble_count ?? 0)}
      />
      {post.post_type === 'MOMENT' && momentImg && (
        <ImageObjectJsonLd
          contentUrl={momentImg}
          caption={momentCaption}
          creator={postAuthor?.username ?? 'coach'}
          uploadDate={post.created_at}
          url={`https://www.cfbsocial.com/post/${postId}`}
        />
      )}
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
