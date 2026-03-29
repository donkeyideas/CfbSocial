'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { MarkForAgingButton } from '@/components/predictions/MarkForAgingButton';
import { ReportModal } from '@/components/moderation/ReportModal';

interface PostActionsProps {
  postId: string;
  authorId?: string;
  replyCount?: number;
  bookmarkCount?: number;
  repostCount?: number;
}

export function PostActions({ postId, authorId, replyCount = 0, bookmarkCount = 0, repostCount = 0 }: PostActionsProps) {
  const router = useRouter();
  const { isLoggedIn, userId } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeTopic, setChallengeTopic] = useState('');
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bmCount, setBmCount] = useState(bookmarkCount);
  const [reposted, setReposted] = useState(false);
  const [rpCount, setRpCount] = useState(repostCount);

  function requireAuth(): boolean {
    if (isLoggedIn === false) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return false;
    }
    return true;
  }

  // Load existing bookmark/repost state
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase.from('bookmarks').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (data) setBookmarked(true); });
    supabase.from('reposts').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (data) setReposted(true); });
  }, [postId, userId]);

  async function handleBookmark() {
    if (!requireAuth() || !userId) return;
    const supabase = createClient();
    if (bookmarked) {
      setBookmarked(false);
      setBmCount((c) => c - 1);
      await supabase.from('bookmarks').delete().eq('user_id', userId).eq('post_id', postId);
    } else {
      setBookmarked(true);
      setBmCount((c) => c + 1);
      await supabase.from('bookmarks').insert({ user_id: userId, post_id: postId });
    }
  }

  async function handleRepost() {
    if (!requireAuth() || !userId) return;
    const supabase = createClient();
    if (reposted) {
      setReposted(false);
      setRpCount((c) => c - 1);
      await supabase.from('reposts').delete().eq('user_id', userId).eq('post_id', postId);
    } else {
      setReposted(true);
      setRpCount((c) => c + 1);
      await supabase.from('reposts').insert({ user_id: userId, post_id: postId });
    }
  }

  async function handleFactCheck() {
    router.push(`/post/${postId}`);
  }

  async function handleChallengeSubmit() {
    if (!challengeTopic.trim() || challengeSubmitting || !userId) return;
    if (!authorId || userId === authorId) return;

    setChallengeSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase.from('challenges').insert({
      challenger_id: userId,
      challenged_id: authorId,
      post_id: postId,
      topic: challengeTopic.trim(),
      status: 'PENDING',
    }).select().single();

    setChallengeSubmitting(false);

    if (!error && data) {
      setShowChallenge(false);
      setChallengeTopic('');
      router.push(`/rivalry/challenge/${data.id}`);
    }
  }

  return (
    <>
      <div className="post-actions">
        <button className="post-action" onClick={handleFactCheck}>
          FACT CHECK
        </button>
        <button className="post-action" onClick={() => { if (requireAuth()) setShowChallenge(!showChallenge); }}>
          CHALLENGE
        </button>
        <MarkForAgingButton postId={postId} />
        <button
          className="post-action"
          onClick={handleRepost}
          style={reposted ? { color: 'var(--crimson)' } : undefined}
        >
          REPOST{rpCount > 0 ? ` (${rpCount})` : ''}
        </button>
        <button
          className="post-action"
          onClick={handleBookmark}
          style={bookmarked ? { color: 'var(--crimson)' } : undefined}
        >
          {bookmarked ? 'SAVED' : 'SAVE'}{bmCount > 0 ? ` (${bmCount})` : ''}
        </button>
        <Link href={`/post/${postId}`} className="post-action" style={{ textDecoration: 'none' }}>
          Reply{replyCount > 0 ? ` (${replyCount})` : ''}
        </Link>
        <button className="post-action" onClick={() => { if (requireAuth()) setShowReport(true); }}>
          FLAG
        </button>
      </div>

      {showChallenge && (
        <div className="challenge-inline">
          <div className="challenge-inline-label">State your challenge topic:</div>
          <div className="challenge-inline-row">
            <input
              type="text"
              value={challengeTopic}
              onChange={(e) => setChallengeTopic(e.target.value)}
              placeholder="e.g. This take will age like milk"
              maxLength={200}
              className="challenge-inline-input"
            />
            <button
              onClick={handleChallengeSubmit}
              disabled={!challengeTopic.trim() || challengeSubmitting}
              className="challenge-inline-btn"
              style={{ opacity: !challengeTopic.trim() || challengeSubmitting ? 0.5 : 1 }}
            >
              {challengeSubmitting ? '...' : 'Issue'}
            </button>
          </div>
        </div>
      )}

      {showReport && (
        <ReportModal postId={postId} onClose={() => setShowReport(false)} />
      )}
    </>
  );
}
