'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { MarkForAgingButton } from '@/components/predictions/MarkForAgingButton';
import { ReportModal } from '@/components/moderation/ReportModal';
import { FactCheckPanel } from './FactCheckPanel';

interface PostActionsProps {
  postId: string;
  authorId?: string;
  replyCount?: number;
  bookmarkCount?: number;
  repostCount?: number;
  postContent?: string;
}

export function PostActions({ postId, authorId, replyCount = 0, bookmarkCount = 0, repostCount = 0 }: PostActionsProps) {
  const router = useRouter();
  const { isLoggedIn, profile } = useAuth();
  const profileId = profile?.id ?? null;
  const [showReport, setShowReport] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [showFactCheck, setShowFactCheck] = useState(false);
  const [challengeTopic, setChallengeTopic] = useState('');
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bmCount, setBmCount] = useState(bookmarkCount);
  const [reposted, setReposted] = useState(false);
  const [rpCount, setRpCount] = useState(repostCount);
  const [showEdit, setShowEdit] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isOwner = profileId && authorId && profileId === authorId;

  function requireAuth(): boolean {
    if (isLoggedIn === false) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return false;
    }
    return true;
  }

  // Load existing bookmark/repost state
  useEffect(() => {
    if (!profileId) return;
    const supabase = createClient();
    Promise.all([
      supabase.from('bookmarks').select('id').eq('post_id', postId).eq('user_id', profileId).maybeSingle(),
      supabase.from('reposts').select('id').eq('post_id', postId).eq('user_id', profileId).maybeSingle(),
    ]).then(([bmResult, rpResult]) => {
      if (bmResult.data) setBookmarked(true);
      if (rpResult.data) setReposted(true);
    });
  }, [postId, profileId]);

  async function handleBookmark() {
    if (!requireAuth() || !profileId) return;
    const supabase = createClient();
    if (bookmarked) {
      setBookmarked(false);
      setBmCount((c) => c - 1);
      await supabase.from('bookmarks').delete().eq('user_id', profileId).eq('post_id', postId);
    } else {
      setBookmarked(true);
      setBmCount((c) => c + 1);
      await supabase.from('bookmarks').insert({ user_id: profileId, post_id: postId });
    }
  }

  async function handleRepost() {
    if (!requireAuth() || !profileId) return;
    const supabase = createClient();
    if (reposted) {
      setReposted(false);
      setRpCount((c) => c - 1);
      const { error } = await supabase.from('reposts').delete().eq('user_id', profileId).eq('post_id', postId);
      if (error) {
        setReposted(true);
        setRpCount((c) => c + 1);
      } else {
        router.refresh();
      }
    } else {
      setReposted(true);
      setRpCount((c) => c + 1);
      const { error } = await supabase.from('reposts').insert({ user_id: profileId, post_id: postId });
      if (error) {
        setReposted(false);
        setRpCount((c) => c - 1);
      } else {
        // Notify post author of repost
        if (authorId && authorId !== profileId) {
          const { data: notifRow } = await supabase.from('notifications').insert({
            recipient_id: authorId,
            actor_id: profileId,
            type: 'REPOST',
            post_id: postId,
          }).select('id').single();
          if (notifRow) {
            fetch('/api/push/dispatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notificationId: notifRow.id }),
            }).catch(() => {});
          }
        }
        router.refresh();
      }
    }
  }

  function handleFactCheck() {
    if (!requireAuth()) return;
    setShowFactCheck(!showFactCheck);
  }

  async function handleChallengeSubmit() {
    if (!challengeTopic.trim() || challengeSubmitting || !profileId) return;
    if (!authorId || profileId === authorId) return;

    setChallengeSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase.from('challenges').insert({
      challenger_id: profileId,
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

  async function handleEdit() {
    if (!isOwner) return;
    if (!showEdit) {
      const supabase = createClient();
      const { data } = await supabase.from('posts').select('content').eq('id', postId).single();
      if (data) setEditContent(data.content);
      setShowEdit(true);
    } else {
      setShowEdit(false);
    }
  }

  async function handleEditSave() {
    if (!isOwner || !editContent.trim() || editSaving) return;
    setEditSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('posts').update({ content: editContent.trim() }).eq('id', postId);
    setEditSaving(false);
    if (!error) {
      setShowEdit(false);
      router.refresh();
    }
  }

  async function handleDeleteConfirm() {
    if (!isOwner) return;
    setDeleteLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('posts').update({ status: 'REMOVED' }).eq('id', postId);
    setDeleteLoading(false);
    if (!error) {
      setShowDeleteModal(false);
      setDeleted(true);
      router.refresh();
    }
  }

  if (deleted) {
    return <div className="post-actions" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Post deleted</div>;
  }

  return (
    <>
      <div className="post-actions">
        <button className="post-action" onClick={handleFactCheck} style={showFactCheck ? { color: 'var(--crimson)' } : undefined}>
          FACT CHECK
        </button>
        <button className="post-action" onClick={() => { if (requireAuth()) setShowChallenge(!showChallenge); }}>
          CHALLENGE
        </button>
        <MarkForAgingButton postId={postId} />
        <button
          className={`post-action${reposted ? ' post-action-active' : ''}`}
          onClick={handleRepost}
        >
          {reposted ? 'REPOSTED' : 'REPOST'}{rpCount > 0 ? ` (${rpCount})` : ''}
        </button>
        <button
          className={`post-action${bookmarked ? ' post-action-active' : ''}`}
          onClick={handleBookmark}
        >
          {bookmarked ? 'SAVED' : 'SAVE'}{bmCount > 0 ? ` (${bmCount})` : ''}
        </button>
        <Link href={`/post/${postId}`} className="post-action" style={{ textDecoration: 'none' }}>
          Reply{replyCount > 0 ? ` (${replyCount})` : ''}
        </Link>
        <button className="post-action" onClick={() => { if (requireAuth()) setShowReport(true); }}>
          FLAG
        </button>
        {isOwner && (
          <>
            <button className="post-action" onClick={handleEdit} style={showEdit ? { color: 'var(--crimson)' } : undefined}>
              EDIT
            </button>
            <button className="post-action post-action-delete" onClick={() => setShowDeleteModal(true)}>
              DELETE
            </button>
          </>
        )}
      </div>

      {showFactCheck && (
        <FactCheckPanel postId={postId} onClose={() => setShowFactCheck(false)} />
      )}

      {showEdit && (
        <div className="post-edit-inline">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="post-edit-textarea"
            rows={4}
            maxLength={3000}
          />
          <div className="post-edit-row">
            <span className="post-edit-count">{editContent.length}/3,000</span>
            <button onClick={() => setShowEdit(false)} className="post-edit-cancel">Cancel</button>
            <button onClick={handleEditSave} disabled={!editContent.trim() || editSaving} className="post-edit-save">
              {editSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

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

      {showDeleteModal && (
        <div className="delete-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">DELETE POST</div>
            <div className="delete-modal-body">
              <p className="delete-modal-message">Delete this post? This cannot be undone.</p>
              <div className="delete-modal-divider" />
              <div className="delete-modal-buttons">
                <button className="delete-modal-cancel" onClick={() => setShowDeleteModal(false)}>
                  CANCEL
                </button>
                <button className="delete-modal-confirm" onClick={handleDeleteConfirm} disabled={deleteLoading}>
                  {deleteLoading ? 'DELETING...' : 'DELETE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
