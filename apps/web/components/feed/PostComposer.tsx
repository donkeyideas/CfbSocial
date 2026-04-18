'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { PostType } from '@cfb-social/types';
import { LinkPreview, extractFirstUrl } from './LinkPreview';
import { GifPicker } from './GifPicker';
import { revalidateFeed } from '@/lib/actions/feed';

interface MentionProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Extracts the @mention query at the given cursor position.
 * Returns the partial text after @ or null if not in a mention.
 */
function getMentionQuery(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([a-zA-Z0-9_]{0,30})$/);
  if (!match) return null;
  const atIndex = before.length - match[0].length;
  if (atIndex > 0 && !/\s/.test(before[atIndex - 1]!)) return null;
  return match[1]!;
}

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

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionProfile[]>([]);
  const [mentionActive, setMentionActive] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search profiles when mentionQuery changes
  useEffect(() => {
    if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);

    if (mentionQuery === null || mentionQuery.length === 0) {
      setMentionResults([]);
      setMentionActive(false);
      return;
    }

    mentionDebounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const q = mentionQuery.toLowerCase();
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(6);

      if (data && data.length > 0) {
        setMentionResults(data as MentionProfile[]);
        setMentionActive(true);
        setActiveIndex(0);
      } else {
        setMentionResults([]);
        setMentionActive(false);
      }
    }, 250);

    return () => {
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
    };
  }, [mentionQuery]);

  const checkForMention = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const query = getMentionQuery(textarea.value, cursor);
    setMentionQuery(query);
  }, []);

  const insertMention = useCallback((username: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const before = content.slice(0, cursor);
    const match = before.match(/@([a-zA-Z0-9_]{0,30})$/);
    if (!match) return;

    const atStart = before.length - match[0].length;
    const after = content.slice(cursor);
    const newContent = content.slice(0, atStart) + `@${username} ` + after;
    setContent(newContent);
    setMentionQuery(null);
    setMentionResults([]);
    setMentionActive(false);

    // Restore focus and move cursor after the inserted mention
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newCursor = atStart + username.length + 2; // @username + space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
  }, [content]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Check for mention after React state update
    requestAnimationFrame(() => {
      checkForMention();
    });
  }, [checkForMention]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionActive || mentionResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % mentionResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + mentionResults.length) % mentionResults.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const selected = mentionResults[activeIndex];
      if (selected) insertMention(selected.username);
    } else if (e.key === 'Escape') {
      setMentionActive(false);
      setMentionResults([]);
    }
  }, [mentionActive, mentionResults, activeIndex, insertMention]);

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
      setMentionQuery(null);
      setMentionResults([]);
      setMentionActive(false);
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
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onSelect={checkForMention}
          placeholder="File your report from the press box..."
          maxLength={3000}
          className="composer-input"
          rows={3}
        />

        {/* Mention autocomplete dropdown */}
        {mentionActive && mentionResults.length > 0 && (
          <div className="mention-dropdown">
            {mentionResults.map((user, idx) => (
              <button
                key={user.id}
                type="button"
                className="mention-dropdown-item"
                data-active={idx === activeIndex ? 'true' : undefined}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent textarea blur
                  insertMention(user.username);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.username}
                    width={32}
                    height={32}
                    className="mention-dropdown-avatar"
                  />
                ) : (
                  <span className="mention-dropdown-avatar-fallback">
                    {(user.display_name || user.username)[0]?.toUpperCase()}
                  </span>
                )}
                <span className="mention-dropdown-info">
                  <span className="mention-dropdown-username">@{user.username}</span>
                  {user.display_name && (
                    <span className="mention-dropdown-name">{user.display_name}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

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
