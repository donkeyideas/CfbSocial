'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface ReplyComposerProps {
  parentId: string;
  parentAuthorId?: string;
}

export function ReplyComposer({ parentId, parentAuthorId }: ReplyComposerProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting || !profile?.id) return;

    setSubmitting(true);

    const supabase = createClient();

    const { error } = await supabase.from('posts').insert({
      content: content.trim(),
      post_type: 'STANDARD',
      author_id: profile.id,
      school_id: profile.school_id ?? null,
      parent_id: parentId,
      root_id: parentId,
      status: 'PUBLISHED',
    });

    if (!error) {
      setContent('');
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
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a reply..."
        maxLength={500}
        className="composer-input"
        rows={2}
      />
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
