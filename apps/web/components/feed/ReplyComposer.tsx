'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface MentionProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

function getMentionQuery(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([a-zA-Z0-9_]{0,30})$/);
  if (!match) return null;
  const atIndex = before.length - match[0].length;
  if (atIndex > 0 && !/\s/.test(before[atIndex - 1]!)) return null;
  return match[1]!;
}

interface ReplyComposerProps {
  parentId: string;
  parentAuthorId?: string;
}

export function ReplyComposer({ parentId, parentAuthorId }: ReplyComposerProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newCursor = atStart + username.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
  }, [content]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting || !profile?.id) return;

    setSubmitting(true);

    const supabase = createClient();

    const { data: newReply, error } = await supabase.from('posts').insert({
      content: content.trim(),
      post_type: 'STANDARD',
      author_id: profile.id,
      school_id: profile.school_id ?? null,
      parent_id: parentId,
      root_id: parentId,
      status: 'PUBLISHED',
    }).select('id').single();

    if (!error) {
      // Award XP for creating a reply (fire-and-forget)
      if (newReply?.id) {
        supabase.rpc('award_xp', {
          p_user_id: profile.id,
          p_amount: 10,
          p_source: 'POST_CREATED',
          p_reference_id: newReply.id,
          p_description: 'Created a post',
        }).then(null, () => {});
      }
      setContent('');
      setMentionQuery(null);
      setMentionResults([]);
      setMentionActive(false);
      // Update reply_count on the parent post
      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', parentId)
        .eq('status', 'PUBLISHED');
      if (count !== null) {
        await supabase.from('posts').update({ reply_count: count }).eq('id', parentId);
      }
      // Notify the parent post author + dispatch push
      if (parentAuthorId && parentAuthorId !== profile.id) {
        const { data: notifRow } = await supabase.from('notifications').insert({
          recipient_id: parentAuthorId,
          actor_id: profile.id,
          type: 'REPLY',
          post_id: parentId,
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

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="composer" style={{ marginTop: 8 }}>
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onSelect={checkForMention}
          placeholder="Write a reply..."
          maxLength={500}
          className="composer-input"
          rows={2}
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
                  e.preventDefault();
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
      <div className="composer-footer">
        <div />
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="composer-submit"
          style={{ opacity: !content.trim() || submitting ? 0.5 : 1 }}
        >
          {submitting ? 'Replying...' : 'Reply'}
        </button>
      </div>
    </form>
  );
}
