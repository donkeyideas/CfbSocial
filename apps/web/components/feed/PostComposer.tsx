'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { PostType } from '@cfb-social/types';
import { LinkPreview, extractFirstUrl } from './LinkPreview';
import { GifPicker } from './GifPicker';
import { revalidateFeed } from '@/lib/actions/feed';

export function PostComposer() {
  const router = useRouter();
  const { isLoggedIn, profile } = useAuth();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('STANDARD' as PostType);
  const [submitting, setSubmitting] = useState(false);
  const [sidelineGame, setSidelineGame] = useState('');
  const [sidelineQuarter, setSidelineQuarter] = useState('');
  const [sidelineTime, setSidelineTime] = useState('');
  const [gifPickerOpen, setGifPickerOpen] = useState(false);

  if (isLoggedIn === false) {
    return (
      <div className="composer composer-login-cta">
        <p className="composer-login-text">
          Want to file a report from the press box?
        </p>
        <div className="composer-login-actions">
          <Link href="/login" className="composer-login-btn">
            Log In
          </Link>
          <Link href="/register" className="composer-login-link">
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  if (isLoggedIn === null) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting || !profile?.id) return;

    setSubmitting(true);

    const supabase = createClient();

    const insertData: Record<string, unknown> = {
      content: content.trim(),
      post_type: postType,
      author_id: profile.id,
      school_id: profile?.school_id ?? null,
      status: 'PUBLISHED',
    };

    if (postType === ('SIDELINE' as PostType)) {
      if (sidelineGame.trim()) insertData.sideline_game = sidelineGame.trim();
      if (sidelineQuarter.trim()) insertData.sideline_quarter = sidelineQuarter.trim();
      if (sidelineTime.trim()) insertData.sideline_time = sidelineTime.trim();
    }

    const { data: newPost, error } = await supabase
      .from('posts')
      .insert(insertData)
      .select('id')
      .single();

    if (!error && newPost) {
      setContent('');
      setPostType('STANDARD' as PostType);
      setSidelineGame('');
      setSidelineQuarter('');
      setSidelineTime('');
      await revalidateFeed();
      router.refresh();

      // Fire-and-forget AI moderation — don't block the user
      fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: newPost.id }),
      }).catch(() => {});
    }

    setSubmitting(false);
  }

  const typeButtons: { value: PostType; label: string }[] = [
    { value: 'RECEIPT' as PostType, label: 'Receipt' },
    { value: 'PREDICTION' as PostType, label: 'Poll' },
    { value: 'SIDELINE' as PostType, label: 'Photo' },
    { value: 'AGING_TAKE' as PostType, label: 'Challenge' },
  ];

  return (
    <form onSubmit={handleSubmit} className="composer">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="File your report from the press box..."
        maxLength={3000}
        className="composer-input"
        rows={3}
      />

      <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '0.65rem', color: content.length > 2800 ? 'var(--crimson)' : 'var(--text-muted)', marginTop: 4 }}>
        {content.length.toLocaleString()}/3,000
      </div>

      {extractFirstUrl(content) && <LinkPreview content={content} />}

      {postType === ('SIDELINE' as PostType) && (
        <div className="sideline-fields">
          <div className="sideline-fields-label">Sideline Report Details</div>
          <div className="sideline-fields-row">
            <input
              type="text"
              value={sidelineGame}
              onChange={(e) => setSidelineGame(e.target.value)}
              placeholder="e.g. Auburn vs LSU"
              maxLength={200}
              className="sideline-field"
            />
            <input
              type="text"
              value={sidelineQuarter}
              onChange={(e) => setSidelineQuarter(e.target.value)}
              placeholder="e.g. Q1"
              maxLength={10}
              className="sideline-field sideline-field-short"
            />
            <input
              type="text"
              value={sidelineTime}
              onChange={(e) => setSidelineTime(e.target.value)}
              placeholder="e.g. 4:32"
              maxLength={20}
              className="sideline-field sideline-field-short"
            />
          </div>
        </div>
      )}

      <div className="composer-footer">
        <div className="composer-tools">
          {typeButtons.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() =>
                setPostType(
                  postType === type.value
                    ? ('STANDARD' as PostType)
                    : type.value
                )
              }
              className="composer-tool"
              style={
                postType === type.value
                  ? { borderColor: 'var(--crimson)', color: 'var(--crimson)' }
                  : undefined
              }
            >
              {type.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setGifPickerOpen(true)}
            className="composer-tool"
          >
            GIF
          </button>
        </div>

        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="composer-submit"
          style={{ opacity: !content.trim() || submitting ? 0.5 : 1 }}
        >
          {submitting ? 'Filing...' : 'Publish'}
        </button>
      </div>

      <GifPicker
        open={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onSelect={(url) => {
          setContent((prev) => (prev.trim() ? `${prev.trim()}\n${url}` : url));
        }}
      />
    </form>
  );
}
