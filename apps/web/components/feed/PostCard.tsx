'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { PostType } from '@cfb-social/types';
import { BallotButtons } from './BallotButtons';
import { PostActions } from './PostActions';
import { AppealForm } from '@/components/moderation/AppealForm';
import { AgingTakeTimerWrapper } from './AgingTakeTimerWrapper';
import { LinkPreview, extractFirstUrl, stripFirstUrl } from './LinkPreview';
import { PostContent } from './PostContent';
import { PostImages } from './PostImages';
import { trackEvent } from '@/lib/analytics/track';
import { readableSchoolColor } from '@/lib/utils/color-contrast';

/** Read dark mode state directly from DOM — no hooks, no hot-reload issues */
function getIsDark(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

interface PostAuthor {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  school_id: string | null;
  dynasty_tier: string | null;
}

interface PostSchool {
  id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  slug?: string;
}

interface AgingTake {
  id: string;
  user_id: string;
  revisit_date: string;
  is_surfaced: boolean;
  community_verdict: string | null;
}

interface Post {
  id: string;
  content: string;
  post_type: PostType;
  status: string;
  author_id: string;
  school_id: string | null;
  created_at: string;
  touchdown_count?: number;
  fumble_count?: number;
  reply_count?: number;
  bookmark_count?: number;
  repost_count?: number;
  sideline_game?: string | null;
  sideline_quarter?: string | null;
  sideline_time?: string | null;
  sideline_verified?: boolean | null;
  media_urls?: string[] | null;
  author?: PostAuthor | null;
  school?: PostSchool | null;
  reactions?: Array<{ count: number }>;
  aging_takes?: AgingTake[];
  // Repost metadata (set when this post appears as a repost in the feed)
  _repostedBy?: { username: string; display_name: string | null } | null;
  _repostTime?: string | null;
}

export const PostCard = memo(function PostCard({ post }: { post: Post }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef(false);
  const isDark = getIsDark();
  const router = useRouter();

  useEffect(() => {
    const el = cardRef.current;
    if (!el || trackedRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting && !trackedRef.current) {
          trackedRef.current = true;
          trackEvent({ event_type: 'post_viewed', event_target: 'post', target_id: post.id });
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [post.id]);

  const schoolStyle = post.school?.primary_color
    ? { '--post-school-color': readableSchoolColor(post.school.primary_color, isDark) } as React.CSSProperties
    : undefined;

  const isFlagged = post.status === 'FLAGGED';

  const inner = isFlagged ? (
    <PenaltyPost post={post} isDark={isDark} />
  ) : (() => {
    switch (post.post_type) {
      case 'RECEIPT':
        return <ReceiptPost post={post} schoolStyle={schoolStyle} isDark={isDark} />;
      case 'PREDICTION':
        return <PredictionPost post={post} schoolStyle={schoolStyle} isDark={isDark} />;
      case 'AGING_TAKE':
        return <AgingTakePost post={post} schoolStyle={schoolStyle} isDark={isDark} />;
      case 'SIDELINE':
        return <PressBoxPost post={post} schoolStyle={schoolStyle} isDark={isDark} />;
      case 'CHALLENGE_RESULT':
        return <RivalryPost post={post} schoolStyle={schoolStyle} isDark={isDark} />;
      default:
        return <ClassicPost post={post} schoolStyle={schoolStyle} isDark={isDark} />;
    }
  })();

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (isFlagged) return;
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, textarea, [role="button"]')) return;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    router.push(`/post/${post.id}`);
  }, [post.id, isFlagged, router]);

  return (
    <div ref={cardRef} onClick={handleCardClick} className="post-card-clickable">
      {inner}
    </div>
  );
});

function RepostStamp({ repostedBy, repostTime }: { repostedBy: { username: string; display_name: string | null }; repostTime?: string | null }) {
  return (
    <Link href={`/profile/${repostedBy.username}`} className="repost-stamp">
      <span className="repost-stamp-label">REPOSTED</span>
      <span className="repost-stamp-user">@{repostedBy.username}</span>
      {repostTime && <span className="repost-stamp-time" suppressHydrationWarning>{getTimeAgo(new Date(repostTime))} ago</span>}
    </Link>
  );
}

/* =============================================
   Shared: User row
   ============================================= */

function PostUserRow({ post, isDark }: { post: Post; isDark: boolean }) {
  const authorName = post.author?.display_name ?? post.author?.username ?? 'Unknown';
  const authorUsername = post.author?.username ?? 'unknown';
  const timeAgo = getTimeAgo(new Date(post.created_at));
  const schoolColor = post.school?.primary_color
    ? readableSchoolColor(post.school.primary_color, isDark)
    : 'var(--crimson)';

  const tierLabels: Record<string, string> = {
    STARTER: 'Starter',
    ALL_CONFERENCE: 'All-Conf',
    ALL_AMERICAN: 'All-American',
    HEISMAN: 'Heisman',
    HALL_OF_FAME: 'Hall of Fame',
  };

  const tierLabel = post.author?.dynasty_tier
    ? tierLabels[post.author.dynasty_tier]
    : null;

  return (
    <div className="post-user-row">
      <Link
        href={`/profile/${authorUsername}`}
        className="post-avatar"
        style={{ backgroundColor: schoolColor }}
      >
        {post.author?.avatar_url ? (
          <Image src={post.author.avatar_url} alt={authorUsername} width={38} height={38} className="post-avatar-img" />
        ) : (
          authorName[0]?.toUpperCase()
        )}
      </Link>
      <div>
        <Link href={`/profile/${authorUsername}`} className="post-username">
          @{authorUsername}
        </Link>
        {post.school && (
          post.school.slug ? (
            <Link
              href={`/school/${post.school.slug}`}
              className="post-pennant"
              style={{ backgroundColor: schoolColor, textDecoration: 'none' }}
            >
              {post.school.abbreviation}
            </Link>
          ) : (
            <span
              className="post-pennant"
              style={{ backgroundColor: schoolColor }}
            >
              {post.school.abbreviation}
            </span>
          )
        )}
      </div>
      {tierLabel && <span className="post-badge">{tierLabel}</span>}
      <span className="post-time" suppressHydrationWarning>{timeAgo}</span>
    </div>
  );
}


/* =============================================
   Shared: Bottom section
   ============================================= */

function PostBottom({ post }: { post: Post }) {
  return (
    <>
      <BallotButtons
        postId={post.id}
        authorId={post.author_id}
        touchdownCount={post.touchdown_count ?? 0}
        fumbleCount={post.fumble_count ?? 0}
      />
      <PostActions
        postId={post.id}
        authorId={post.author_id}
        replyCount={post.reply_count ?? 0}
        bookmarkCount={post.bookmark_count ?? 0}
        repostCount={post.repost_count ?? 0}
        postContent={post.content}
      />
    </>
  );
}

/* =============================================
   POST 1 — Classic Take (STANDARD / PREDICTION / AGING_TAKE)
   ============================================= */

const ClassicPost = memo(function ClassicPost({ post, schoolStyle, isDark }: { post: Post; schoolStyle?: React.CSSProperties; isDark: boolean }) {
  // Receipt is PUBLIC — if anyone filed a receipt on this post, everyone sees it
  const receipt = post.aging_takes && post.aging_takes.length > 0 ? post.aging_takes[0]! : null;

  // If receipt filed, render same as ReceiptPost so they look identical
  if (receipt) {
    const receiptDate = new Date(receipt.revisit_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <article className="post-card post-receipt" style={schoolStyle}>
        {post._repostedBy && <RepostStamp repostedBy={post._repostedBy} repostTime={post._repostTime} />}
        <div className="receipt-seal">
          <span className="receipt-seal-text">Receipt<br />Filed</span>
        </div>
        <PostUserRow post={post} isDark={isDark} />
        <div className="post-body"><PostContent content={extractFirstUrl(post.content) ? stripFirstUrl(post.content) : post.content} /></div>
        <LinkPreview content={post.content} />
        {post.media_urls && post.media_urls.length > 0 && <PostImages urls={post.media_urls} />}
        <div className="receipt-stamp" suppressHydrationWarning>RECEIPT FILED &mdash; Review {receiptDate}</div>
        <PostBottom post={post} />
      </article>
    );
  }

  return (
    <article className="post-card post-classic" style={schoolStyle}>
      {post._repostedBy && <RepostStamp repostedBy={post._repostedBy} repostTime={post._repostTime} />}
      <PostUserRow post={post} isDark={isDark} />
      <div className="post-body"><PostContent content={extractFirstUrl(post.content) ? stripFirstUrl(post.content) : post.content} /></div>
      <LinkPreview content={post.content} />
      {post.media_urls && post.media_urls.length > 0 && <PostImages urls={post.media_urls} />}
      <PostBottom post={post} />
    </article>
  );
});

/* =============================================
   POST 2 — Receipt / Newspaper Clipping
   ============================================= */

const ReceiptPost = memo(function ReceiptPost({ post, schoolStyle, isDark }: { post: Post; schoolStyle?: React.CSSProperties; isDark: boolean }) {
  return (
    <article className="post-card post-receipt" style={schoolStyle}>
      {post._repostedBy && <RepostStamp repostedBy={post._repostedBy} repostTime={post._repostTime} />}
      <div className="receipt-seal">
        <span className="receipt-seal-text">Verified<br />Receipt</span>
      </div>
      <PostUserRow post={post} isDark={isDark} />
      <div className="post-body"><PostContent content={extractFirstUrl(post.content) ? stripFirstUrl(post.content) : post.content} /></div>
      <LinkPreview content={post.content} />
      {post.media_urls && post.media_urls.length > 0 && <PostImages urls={post.media_urls} />}
      <div className="receipt-stamp">RECEIPT CONFIRMED</div>
      <PostBottom post={post} />
    </article>
  );
});

/* =============================================
   POST 3 — Penalty Flag (FLAGGED status)
   ============================================= */

const PenaltyPost = memo(function PenaltyPost({ post, isDark }: { post: Post; isDark: boolean }) {
  return (
    <article className="post-card post-penalty">
      <div className="penalty-header">
        <span className="penalty-flag-icon">FLAG</span>
        <div>
          <span className="penalty-title">Penalty</span>
          <div className="penalty-subtitle">
            UNSPORTSMANLIKE CONDUCT
          </div>
        </div>
      </div>
      <PostUserRow post={post} isDark={isDark} />
      <div className="penalty-body">&ldquo;<PostContent content={post.content} />&rdquo;</div>
      <div className="penalty-ruling">
        WARNING: This play has been nullified. All football, all the time.
      </div>
      <AppealForm postId={post.id} />
    </article>
  );
});

/* =============================================
   POST 4 — Sideline Report / Press Box
   ============================================= */

const PressBoxPost = memo(function PressBoxPost({ post, schoolStyle, isDark }: { post: Post; schoolStyle?: React.CSSProperties; isDark: boolean }) {
  const timeStr = new Date(post.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const headerTime = post.sideline_quarter
    ? `${post.sideline_quarter} · ${post.sideline_time ? `${post.sideline_time} Remaining` : ''}`
    : timeStr;

  return (
    <article className="post-card post-pressbox" style={schoolStyle}>
      {post._repostedBy && <RepostStamp repostedBy={post._repostedBy} repostTime={post._repostTime} />}
      <div className="pressbox-header">
        <span className="pressbox-title">Sideline Report</span>
        <span className="pressbox-time" suppressHydrationWarning>{headerTime}</span>
      </div>
      {post.sideline_game && (
        <div className="pressbox-meta">
          {post.sideline_game.toUpperCase()}
          {post.school && ` — ${post.school.name}`}
        </div>
      )}
      <div className="pressbox-user-row">
        <PostUserRow post={post} isDark={isDark} />
        <span className="pressbox-verified">
          {post.sideline_verified ? 'VERIFIED — PRESS BOX CONFIRMED' : 'Source Report'}
        </span>
      </div>
      <div className="pressbox-body">
        <div className="pressbox-content"><PostContent content={post.content} /></div>
        <LinkPreview content={post.content} />
        {post.media_urls && post.media_urls.length > 0 && <PostImages urls={post.media_urls} />}
      </div>
      <div className="pressbox-footer">
        <PostBottom post={post} />
      </div>
    </article>
  );
});

/* =============================================
   POST 5 — Rivalry Ring / Fight Card
   ============================================= */

const RivalryPost = memo(function RivalryPost({ post, schoolStyle, isDark }: { post: Post; schoolStyle?: React.CSSProperties; isDark: boolean }) {

  return (
    <article className="post-card post-rivalry" style={schoolStyle}>
      {post._repostedBy && <RepostStamp repostedBy={post._repostedBy} repostTime={post._repostTime} />}
      <div className="rivalry-header">
        <div className="rivalry-label">Rivalry Ring</div>
        <div className="rivalry-title">Challenge Result</div>
      </div>
      <div className="rivalry-body">
        <PostUserRow post={post} isDark={isDark} />
        <div className="post-body"><PostContent content={extractFirstUrl(post.content) ? stripFirstUrl(post.content) : post.content} /></div>
        <LinkPreview content={post.content} />
        {post.media_urls && post.media_urls.length > 0 && <PostImages urls={post.media_urls} />}
        <PostBottom post={post} />
      </div>
    </article>
  );
});

/* =============================================
   POST 6 — Prediction / Poll
   ============================================= */

const PredictionPost = memo(function PredictionPost({ post, schoolStyle, isDark }: { post: Post; schoolStyle?: React.CSSProperties; isDark: boolean }) {

  return (
    <article className="post-card post-prediction" style={schoolStyle}>
      {post._repostedBy && <RepostStamp repostedBy={post._repostedBy} repostTime={post._repostTime} />}
      <div className="prediction-header">
        <span className="prediction-label">Community Poll</span>
        <span className="prediction-tag">PREDICTION</span>
      </div>
      <div className="prediction-body">
        <PostUserRow post={post} isDark={isDark} />
        <div className="prediction-question"><PostContent content={post.content} /></div>
        <LinkPreview content={post.content} />
        {post.media_urls && post.media_urls.length > 0 && <PostImages urls={post.media_urls} />}
      </div>
      <div className="prediction-footer">
        <PostBottom post={post} />
      </div>
    </article>
  );
});

/* =============================================
   POST 7 — Aging Take / Challenge
   ============================================= */

const AgingTakePost = memo(function AgingTakePost({ post, schoolStyle, isDark }: { post: Post; schoolStyle?: React.CSSProperties; isDark: boolean }) {
  const dateStr = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="post-card post-aging" style={schoolStyle}>
      {post._repostedBy && <RepostStamp repostedBy={post._repostedBy} repostTime={post._repostTime} />}
      <div className="aging-header">
        <span className="aging-label">Aging Take</span>
        <span className="aging-date" suppressHydrationWarning>Filed {dateStr}</span>
      </div>
      <div className="aging-body">
        <PostUserRow post={post} isDark={isDark} />
        <div className="aging-quote">&ldquo;<PostContent content={post.content} />&rdquo;</div>
        <LinkPreview content={post.content} />
        {post.media_urls && post.media_urls.length > 0 && <PostImages urls={post.media_urls} />}
        <AgingTakeTimerWrapper postId={post.id} />
      </div>
      <div className="aging-footer">
        <PostBottom post={post} />
      </div>
    </article>
  );
});

/* =============================================
   Utility
   ============================================= */

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}
